const express = require("express");
const {
  Sale,
  SaleItem,
  Product,
  Customer,
  CreditTransaction,
  Settings,
  sequelize,
} = require("../models");
const { auth } = require("../middleware/auth");
const router = express.Router();

const round2 = (v) =>
  Math.round((parseFloat(v || 0) + Number.EPSILON) * 100) / 100;

router.get("/", auth, async (req, res) => {
  try {
    const sales = await Sale.findAll({
      include: [
        { model: Customer },
        { model: SaleItem, include: [{ model: Product }] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      items,
      customerId,
      paymentMode,
      amountPaid,
      discount,
      roundOff,
      notes,
    } = req.body;

    // Calculate totals or use provided totals
    let subtotal = 0;
    for (const item of items) {
      // Resolve Product: ID -> Name -> Create
      let product;
      if (item.productId) {
        product = await Product.findByPk(item.productId, { transaction: t });
      }

      // If no ID or ID not found, try by name
      if (!product && item.name) {
        product = await Product.findOne(
          { where: { name: item.name } },
          { transaction: t },
        );
      }

      // If still not found, create it (Ad-hoc sale auto-creation)
      if (!product && item.name) {
        product = await Product.create(
          {
            name: item.name,
            stock: 0, // Starts at 0, will go negative
            sellingPrice: parseFloat(item.price || 0),
            purchasePrice: 0, // Unknown
            hsn: item.hsn || "8301",
          },
          { transaction: t },
        );
      }

      // Stock Check REMOVED/RELAXED to allow negative stock ("Sold before purchase" scenario)
      // if (!product || product.stock < item.quantity) { ... } // Deleted this check

      // Update productId in the item object for later usage (SaleItem creation)
      item.productId = product.id;

      // Use item.price if provided (manual entry), else use product's default selling price
      const itemPrice = parseFloat(item.price || product.sellingPrice);
      subtotal += item.quantity * itemPrice;
    }
    subtotal = round2(subtotal);

    // Prefer totals from frontend if provided to ensure UI consistency
    const reqTax = parseFloat(req.body.tax);
    const reqTotal = parseFloat(req.body.total);
    const reqSubtotal = parseFloat(req.body.subtotal);

    const tax = !isNaN(reqTax) ? round2(reqTax) : round2(subtotal * 0.1);
    const total = !isNaN(reqTotal)
      ? round2(reqTotal)
      : round2(subtotal + tax - round2(discount || 0));
    const finalSubtotal = !isNaN(reqSubtotal) ? round2(reqSubtotal) : subtotal;

    const paid = round2(
      parseFloat(amountPaid) || (paymentMode === "credit" ? 0 : total),
    );
    const due = round2(total - paid);

    // Generate invoice number from settings
    let invoiceNumber;
    const setting = await Settings.findOne({
      where: { key: "invoice_config" },
      transaction: t,
    });
    let config = setting
      ? setting.value
      : { prefix: "RM/", sequence: 1, fiscalYear: "25-26" };

    // Self-healing: Ensure uniqueness
    let isUnique = false;
    while (!isUnique) {
      invoiceNumber = `${config.prefix}${String(config.sequence).padStart(
        3,
        "0",
      )}/${config.fiscalYear}`;

      const existing = await Sale.findOne({
        where: { invoiceNumber },
        transaction: t,
      });

      if (!existing) {
        isUnique = true;
      } else {
        config.sequence += 1; // Increment and retry
      }
    }

    // Update sequence for next time
    config.sequence += 1;
    if (setting) {
      await setting.update({ value: config }, { transaction: t });
    } else {
      await Settings.create(
        { key: "invoice_config", value: config },
        { transaction: t },
      );
    }

    // Create sale
    const sale = await Sale.create(
      {
        invoiceNumber,
        customerId: customerId || null,
        userId: req.user.id,
        subtotal: finalSubtotal,
        tax,
        discount: round2(discount || 0),
        roundOff: round2(roundOff || 0),
        total,
        amountPaid: paid,
        amountDue: due,
        paymentMode,
        status: due > 0 ? "pending" : "completed",
        notes,
      },

      { transaction: t },
    );

    // Create sale items and update stock
    for (const item of items) {
      // Product is guaranteed to exist now (or created above)
      const product = await Product.findByPk(item.productId, {
        transaction: t,
      });
      const itemPrice = round2(item.price || product.sellingPrice);
      const itemTotal = round2(item.quantity * itemPrice);
      await SaleItem.create(
        {
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          price: itemPrice, // Use manual price or store price
          total: itemTotal,
          hsn: item.hsn || product.hsn || "8301",
          gst: round2(item.gst || product.gst || 18),
          discount: round2(item.discount || 0),
        },

        { transaction: t },
      );

      // Update product stock and Selling Price (Dynamic Pricing)
      await product.update(
        {
          stock: product.stock - item.quantity,
          sellingPrice: itemPrice, // Update master selling price to latest transaction
        },
        { transaction: t },
      );
    }

    // Handle credit
    if (due > 0 && customerId) {
      const customer = await Customer.findByPk(customerId);
      await customer.update(
        {
          outstandingBalance: round2(
            parseFloat(customer.outstandingBalance) + due,
          ),
        },
        { transaction: t },
      );

      // Create main credit transaction for the sale
      const mainCredit = await CreditTransaction.create(
        {
          customerId,
          saleId: sale.id,
          type: "credit",
          amount: total, // The full bill amount is a credit/liability initially
          method: "New Ref",
          notes: `Credit from sale ${invoiceNumber}`,
        },
        { transaction: t },
      );

      // If there were advance adjustments, create payment transactions linking them
      if (
        req.body.advanceAdjustments &&
        req.body.advanceAdjustments.length > 0
      ) {
        for (const adj of req.body.advanceAdjustments) {
          const advTrans = await CreditTransaction.findByPk(adj.id, {
            transaction: t,
          });
          if (advTrans) {
            const adjAmt = round2(parseFloat(adj.amount));
            await advTrans.update(
              {
                remainingAdvance: round2(
                  parseFloat(advTrans.remainingAdvance) - adjAmt,
                ),
              },
              { transaction: t },
            );

            // Link the payment to this sale
            await CreditTransaction.create(
              {
                customerId,
                saleId: sale.id,
                type: "payment",
                amount: adjAmt,
                method: "Agst Ref",
                notes: `Adjusted against Advance id: ${adj.id}`,
              },
              { transaction: t },
            );
          }
        }
      }
    }

    await t.commit();
    res.status(201).json(sale);
  } catch (error) {
    await t.rollback();
    console.error("Sale processing error:", error); // Log full error
    res.status(400).json({ error: error.message, details: error.errors });
  }
});

module.exports = router;
