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
      salesChannel,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingMethod,
      trackingNumber,
      notes,
    } = req.body;

    // Calculate totals or use provided totals
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product || product.stock < item.quantity) {
        await t.rollback();
        return res
          .status(400)
          .json({
            error: `Insufficient stock for ${product?.name || "product"}`,
          });
      }
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
    const total = !isNaN(reqTotal) ? round2(reqTotal) : round2(subtotal + tax - round2(discount || 0));
    const finalSubtotal = !isNaN(reqSubtotal) ? round2(reqSubtotal) : subtotal;

    const paid = round2(
      parseFloat(amountPaid) || (paymentMode === "credit" ? 0 : total)
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

    invoiceNumber = `${config.prefix}${String(config.sequence).padStart(
      3,
      "0"
    )}/${config.fiscalYear}`;

    // Update sequence
    config.sequence += 1;
    if (setting) {
      await setting.update({ value: config }, { transaction: t });
    } else {
      await Settings.create(
        { key: "invoice_config", value: config },
        { transaction: t }
      );
    }

    // Create sale
    const sale = await Sale.create(
      {
        invoiceNumber,
        customerId: customerId || null,
        userId: req.user.id,
        salesChannel: salesChannel || "in-store",
        subtotal: finalSubtotal,
        tax,
        discount: round2(discount || 0),
        total,
        amountPaid: paid,
        amountDue: due,
        paymentMode,
        status: due > 0 ? "pending" : "completed",
        customerEmail,
        customerPhone,
        shippingAddress,
        shippingMethod,
        trackingNumber,
        notes,
      },
      { transaction: t }
    );

    // Create sale items and update stock
    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      const itemPrice = round2(item.price || product.sellingPrice);
      const itemTotal = round2(item.quantity * itemPrice);
      await SaleItem.create(
        {
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          price: itemPrice, // Use manual price or store price
          total: itemTotal,
          batchNumber: item.batchNumber,
          serialNumber: item.serialNumber,
        },
        { transaction: t }
      );

      // Update product stock and Selling Price (Dynamic Pricing)
      await product.update(
        {
          stock: product.stock - item.quantity,
          sellingPrice: itemPrice, // Update master selling price to latest transaction
        },
        { transaction: t }
      );
    }

    // Handle credit
    if (due > 0 && customerId) {
      const customer = await Customer.findByPk(customerId);
      await customer.update(
        {
          outstandingBalance: round2(
            parseFloat(customer.outstandingBalance) + due
          ),
        },
        { transaction: t }
      );

      await CreditTransaction.create(
        {
          customerId,
          saleId: sale.id,
          type: "credit",
          amount: due,
          notes: `Credit from sale ${invoiceNumber}`,
        },
        { transaction: t }
      );
    }

    await t.commit();
    res.status(201).json(sale);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
