const express = require("express");
const { Purchase, Product, Supplier, SupplierTransaction, sequelize } = require("../models");
const { auth } = require("../middleware/auth");
const router = express.Router();

const round2 = (v) =>
  Math.round((parseFloat(v || 0) + Number.EPSILON) * 100) / 100;

// Get all purchases
router.get("/", auth, async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      include: [{ model: Product }, { model: Supplier }],
      order: [["receivedDate", "DESC"]],
    });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new purchase (Bulk for a Bill)
router.post("/", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { supplierId, invoiceNumber, date, items } = req.body;

    const distinctItems = [];

    for (const item of items) {
      // 1. Find or Create Product
      // Logic mirrored from previous Inventory.jsx loop but now server-side
      let product = await Product.findOne(
        { where: { name: item.name } },
        { transaction: t }
      );

      if (product) {
        // Update existing
        await product.update(
          {
            stock: product.stock + parseInt(item.quantity),
            purchasePrice: round2(item.rate), // Update Ref Price
            sellingPrice: round2(product.sellingPrice || item.rate), // Update selling if 0
            hsn: item.hsn || product.hsn || '8301',
            gst: round2((parseFloat(item.cgst || 0) + parseFloat(item.sgst || 0))),
          },
          { transaction: t }
        );
      } else {
        // Create new
        product = await Product.create(
          {
            name: item.name,
            purchasePrice: round2(item.rate),
            sellingPrice: round2(item.rate), // Default selling price = cost
            stock: parseInt(item.quantity),
            supplierId: supplierId,
            hsn: item.hsn || '8301',
            gst: round2((parseFloat(item.cgst || 0) + parseFloat(item.sgst || 0))),
            // ignoring size/unit per new schema, name should contain it if unique
          },
          { transaction: t }
        );
      }

      // 2. Create Purchase Record
      // We store "Purchase" per item, but linked by invoiceNumber
      await Purchase.create(
        {
          productId: product.id,
          supplierId: supplierId,
          invoiceNumber: invoiceNumber,
          quantityReceived: parseInt(item.quantity),
          unitCost: round2(parseFloat(item.rate)),
          landingCost: round2(parseFloat(item.rate)), // Assuming same for now
          totalCost: round2(parseFloat(item.amount)),
          receivedDate: date,
          unitOfMeasure: "pcs",
        },
        { transaction: t }
      );

      distinctItems.push(product);
    }

    // Update Supplier Balance (Creditor Dues)
    const totalBillAmount = items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      const gstPercent = (parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0);
      const taxAmount = amount * (gstPercent / 100);
      return sum + amount + taxAmount;
    }, 0);

    if (supplierId && totalBillAmount > 0) {
      const supplier = await Supplier.findByPk(supplierId, { transaction: t });
      if (supplier) {
        await supplier.update({
          outstandingBalance: parseFloat(supplier.outstandingBalance || 0) + totalBillAmount
        }, { transaction: t });

        // Create Supplier Transaction (Bill)
        const mainBill = await SupplierTransaction.create({
          supplierId,
          type: 'bill',
          amount: totalBillAmount,
          amountPaid: 0,
          amountDue: totalBillAmount,
          status: 'pending',
          invoiceNumber: invoiceNumber,
          date: date,
          method: 'New Ref',
          notes: `Bill for Invoice: ${invoiceNumber}`
        }, { transaction: t });

        // If there were advance adjustments
        if (req.body.advanceAdjustments && req.body.advanceAdjustments.length > 0) {
            let totalAdj = 0;
            for (const adj of req.body.advanceAdjustments) {
                const advTrans = await SupplierTransaction.findByPk(adj.id, { transaction: t });
                if (advTrans) {
                    const adjAmt = round2(parseFloat(adj.amount));
                    await advTrans.update({
                        remainingAdvance: round2(parseFloat(advTrans.remainingAdvance) - adjAmt)
                    }, { transaction: t });
                    totalAdj += adjAmt;

                    // Link the payment
                    await SupplierTransaction.create({
                        supplierId,
                        type: 'payment',
                        amount: adjAmt,
                        date: date,
                        method: 'Agst Ref',
                        purchaseId: mainBill.id,
                        notes: `Adjusted against Advance id: ${adj.id}`
                    }, { transaction: t });
                }
            }
            
            // Update the bill balances after adjustments
            await mainBill.update({
                amountPaid: round2(totalAdj),
                amountDue: round2(totalBillAmount - totalAdj),
                status: (totalBillAmount - totalAdj) <= 0 ? 'completed' : 'partial'
            }, { transaction: t });

            // Reduce overall balance update by totalAdj
            await supplier.update({
                outstandingBalance: round2(parseFloat(supplier.outstandingBalance) - totalAdj)
            }, { transaction: t });
        }
      }
    }

    await t.commit();
    res
      .status(201)
      .json({ message: "Purchase recorded", items: distinctItems });
  } catch (error) {
    await t.rollback();
    console.error("Purchase route error:", error, error.errors);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
