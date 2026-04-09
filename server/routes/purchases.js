const express = require("express");
const {
  Purchase,
  Product,
  Supplier,
  SupplierTransaction,
  sequelize,
} = require("../models");
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
    console.error("Error fetching purchases:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Create new purchase (Bulk for a Bill)
router.post("/", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      supplierId,
      invoiceNumber,
      date,
      items,
      total,
      roundOff,
      subtotal,
      taxableAmount,
      gstPercent,
      discountPercent,
      discountAmount,
      cgst,
      sgst
    } = req.body;

    const distinctItems = [];

    for (const item of items) {
      // 1. Find or Create Product
      // Logic mirrored from previous Inventory.jsx loop but now server-side
      let product = await Product.findOne(
        { where: { name: item.name } },
        { transaction: t },
      );

      if (product) {
        // Update existing
        await product.update(
          {
            stock: product.stock + parseInt(item.quantity),
            purchasePrice: round2(item.rate), // Update Ref Price
            sellingPrice: round2(product.sellingPrice || item.rate), // Update selling if 0
            hsn: item.hsn || product.hsn || "8301",
            gst: round2(parseFloat(item.gst || 18)),
          },
          { transaction: t },
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
            hsn: item.hsn || "8301",
            gst: round2(parseFloat(item.gst || 18)),
            // ignoring size/unit per new schema, name should contain it if unique
          },
          { transaction: t },
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
          subtotal: subtotal || 0,
          taxableAmount: taxableAmount || subtotal || 0,
          gstPercent: gstPercent || 18,
          discountPercent: discountPercent || 0,
          discountAmount: discountAmount || 0,
          cgst: cgst || 0,
          sgst: sgst || 0,
          tax: (parseFloat(cgst || 0) + parseFloat(sgst || 0)),
          total: total || 0,
          roundOff: roundOff || 0,
          name: item.name || product.name || '',
          size: item.size || '',
          sizeUnit: item.sizeUnit || 'mm',
          quantityUnit: item.quantityUnit || 'Pcs'
        },
        { transaction: t },
      );

      distinctItems.push(product);
    }

    // Update Supplier Balance (Creditor Dues)
    let totalBillAmount = 0;

    if (total !== undefined && total !== null) {
      // Use provided rounded total from frontend
      totalBillAmount = parseFloat(total);
    } else {
      // Fallback calculation (no rounding logic by default here unless added)
      totalBillAmount = items.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || 0;
        const gstPercent = parseFloat(item.gst) || 18;
        const taxAmount = amount * (gstPercent / 100);
        return sum + amount + taxAmount;
      }, 0);
    }

    if (supplierId && totalBillAmount > 0) {
      const supplier = await Supplier.findByPk(supplierId, { transaction: t });
      if (supplier) {
        await supplier.update(
          {
            outstandingBalance:
              parseFloat(supplier.outstandingBalance || 0) + totalBillAmount,
          },
          { transaction: t },
        );

        // Create Supplier Transaction (Bill)
        const mainBill = await SupplierTransaction.create(
          {
            supplierId,
            type: "bill",
            amount: totalBillAmount,
            amountPaid: 0,
            amountDue: totalBillAmount,
            status: "pending",
            invoiceNumber: invoiceNumber,
            date: date,
            method: "New Ref",
            notes: `Bill for Invoice: ${invoiceNumber}`,
          },
          { transaction: t },
        );

        // If there were advance adjustments
        if (
          req.body.advanceAdjustments &&
          req.body.advanceAdjustments.length > 0
        ) {
          let totalAdj = 0;
          for (const adj of req.body.advanceAdjustments) {
            const advTrans = await SupplierTransaction.findByPk(adj.id, {
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
              totalAdj += adjAmt;

              // Link the payment
              await SupplierTransaction.create(
                {
                  supplierId,
                  type: "payment",
                  amount: adjAmt,
                  date: date,
                  method: "Agst Ref",
                  purchaseId: mainBill.id,
                  notes: `Adjusted against Advance id: ${adj.id}`,
                },
                { transaction: t },
              );
            }
          }

          // Update the bill balances after adjustments
          await mainBill.update(
            {
              amountPaid: round2(totalAdj),
              amountDue: round2(totalBillAmount - totalAdj),
              status: totalBillAmount - totalAdj <= 0 ? "completed" : "partial",
            },
            { transaction: t },
          );

          // Reduce overall balance update by totalAdj
          await supplier.update(
            {
              outstandingBalance: round2(
                parseFloat(supplier.outstandingBalance) - totalAdj,
              ),
            },
            { transaction: t },
          );
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

// Delete a purchase
router.delete("/:invoiceNumber", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { invoiceNumber } = req.params;
    const purchases = await Purchase.findAll({ where: { invoiceNumber }, transaction: t });
    if (!purchases || purchases.length === 0) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    let supplierId = purchases[0].supplierId;

    // Revert stock
    for (const p of purchases) {
      const product = await Product.findByPk(p.productId, { transaction: t });
      if (product) {
        await product.update({ stock: product.stock - p.quantityReceived }, { transaction: t });
      }
      await p.destroy({ transaction: t });
    }

    // Handle SupplierTransaction and Balance
    const supplierTx = await SupplierTransaction.findOne({ where: { invoiceNumber, type: 'bill' }, transaction: t });
    if (supplierTx && supplierId) {
      const supplier = await Supplier.findByPk(supplierId, { transaction: t });
      if (supplier && supplierTx.amountDue > 0) {
        await supplier.update({ outstandingBalance: round2(parseFloat(supplier.outstandingBalance || 0) - parseFloat(supplierTx.amountDue)) }, { transaction: t });
      }
      // Revert advances linkage if needed, but doing simple delete for now
      await supplierTx.destroy({ transaction: t });
    }

    await t.commit();
    res.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting purchase:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a purchase
router.put('/:invoiceNumber', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const oldInvoiceNumber = req.params.invoiceNumber;
    const purchases = await Purchase.findAll({ where: { invoiceNumber: oldInvoiceNumber }, transaction: t });
    if (!purchases || purchases.length === 0) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    let supplierId = purchases[0].supplierId;

    // 1. REVERT STOCK & DELETE OLD PURCAHASES
    for (const p of purchases) {
      const product = await Product.findByPk(p.productId, { transaction: t });
      if (product) {
        await product.update({ stock: product.stock - p.quantityReceived }, { transaction: t });
      }
      await p.destroy({ transaction: t });
    }

    // 2. REVERT SUPPLIER BALANCES
    const supplierTx = await SupplierTransaction.findOne({ where: { invoiceNumber: oldInvoiceNumber, type: 'bill' }, transaction: t });
    if (supplierTx && supplierId) {
      const supplier = await Supplier.findByPk(supplierId, { transaction: t });
      if (supplier && supplierTx.amountDue > 0) {
        await supplier.update({ outstandingBalance: round2(parseFloat(supplier.outstandingBalance || 0) - parseFloat(supplierTx.amountDue)) }, { transaction: t });
      }

      // Revert payments/advances that were linked to this billing mapping
      const paymentAdjustments = await SupplierTransaction.findAll({ where: { purchaseId: supplierTx.id, type: 'payment', method: 'Agst Ref' }, transaction: t });
      for (const payment of paymentAdjustments) {
        const match = payment.notes && payment.notes.match(/Advance id: ([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
            const advTrans = await SupplierTransaction.findByPk(match[1], { transaction: t });
            if (advTrans) {
                await advTrans.update({ remainingAdvance: round2(parseFloat(advTrans.remainingAdvance) + parseFloat(payment.amount)) }, { transaction: t });
            }
        }
      }
      // Destroy payments & bills 
      await SupplierTransaction.destroy({ where: { purchaseId: supplierTx.id }, transaction: t }); // destroy child payments
      await supplierTx.destroy({ transaction: t }); // destroy main bill
    }

    // 3. APPLY NEW DATA
    const {
      supplierId: newSupplierId, invoiceNumber, date, items, total, roundOff, subtotal,
      taxableAmount, gstPercent, discountPercent, discountAmount, cgst, sgst
    } = req.body;
    
    // update supplierId handling if it changed somehow, but default to NEW
    const nextSupplierId = newSupplierId || supplierId;

    const distinctItems = [];

    for (const item of items) {
      let product = await Product.findOne({ where: { name: item.name }, transaction: t });
      if (product) {
        await product.update(
          {
            stock: product.stock + parseInt(item.quantity),
            purchasePrice: round2(item.rate),
            sellingPrice: round2(product.sellingPrice || item.rate),
            hsn: item.hsn || product.hsn || "8301",
            gst: round2(parseFloat(item.gst || 18)),
          },
          { transaction: t }
        );
      } else {
        product = await Product.create(
          {
            name: item.name, purchasePrice: round2(item.rate), sellingPrice: round2(item.rate),
            stock: parseInt(item.quantity), supplierId: nextSupplierId, hsn: item.hsn || "8301",
            gst: round2(parseFloat(item.gst || 18))
          },
          { transaction: t }
        );
      }

      await Purchase.create({
          productId: product.id, supplierId: nextSupplierId, invoiceNumber: invoiceNumber,
          quantityReceived: parseInt(item.quantity), unitCost: round2(parseFloat(item.rate)),
          landingCost: round2(parseFloat(item.rate)), totalCost: round2(parseFloat(item.amount)),
          receivedDate: date, unitOfMeasure: "pcs", subtotal: subtotal || 0,
          taxableAmount: taxableAmount || subtotal || 0, gstPercent: gstPercent || 18,
          discountPercent: discountPercent || 0, discountAmount: discountAmount || 0,
          cgst: cgst || 0, sgst: sgst || 0, tax: (parseFloat(cgst || 0) + parseFloat(sgst || 0)),
          total: total || 0, roundOff: roundOff || 0,
          name: item.name || product.name || '', size: item.size || '',
          sizeUnit: item.sizeUnit || 'mm', quantityUnit: item.quantityUnit || 'Pcs'
      }, { transaction: t });
      distinctItems.push(product);
    }

    let totalBillAmount = 0;
    if (total !== undefined && total !== null) {
      totalBillAmount = parseFloat(total);
    } else {
      totalBillAmount = items.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || 0;
        const gstP = parseFloat(item.gst) || 18;
        return sum + amount + (amount * (gstP / 100));
      }, 0);
    }

    if (nextSupplierId && totalBillAmount > 0) {
      const supplier = await Supplier.findByPk(nextSupplierId, { transaction: t });
      if (supplier) {
        await supplier.update(
          { outstandingBalance: parseFloat(supplier.outstandingBalance || 0) + totalBillAmount },
          { transaction: t }
        );

        const mainBill = await SupplierTransaction.create(
          {
            supplierId: nextSupplierId, type: "bill", amount: totalBillAmount,
            amountPaid: 0, amountDue: totalBillAmount, status: "pending",
            invoiceNumber: invoiceNumber, date: date, method: "New Ref",
            notes: `Bill for Invoice: ${invoiceNumber}`,
          },
          { transaction: t }
        );

        if (req.body.advanceAdjustments && req.body.advanceAdjustments.length > 0) {
          let totalAdj = 0;
          for (const adj of req.body.advanceAdjustments) {
            const advTrans = await SupplierTransaction.findByPk(adj.id, { transaction: t });
            if (advTrans) {
              const adjAmt = round2(parseFloat(adj.amount));
              await advTrans.update({ remainingAdvance: round2(parseFloat(advTrans.remainingAdvance) - adjAmt) }, { transaction: t });
              totalAdj += adjAmt;
              await SupplierTransaction.create({
                  supplierId: nextSupplierId, type: "payment", amount: adjAmt, date: date,
                  method: "Agst Ref", purchaseId: mainBill.id, notes: `Adjusted against Advance id: ${adj.id}`,
              }, { transaction: t });
            }
          }
          await mainBill.update({
              amountPaid: round2(totalAdj),
              amountDue: round2(totalBillAmount - totalAdj),
              status: totalBillAmount - totalAdj <= 0 ? "completed" : "partial",
          }, { transaction: t });
          await supplier.update({
              outstandingBalance: round2(parseFloat(supplier.outstandingBalance) - totalAdj),
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    res.json({ message: "Purchase updated successfully", items: distinctItems });
  } catch (error) {
    await t.rollback();
    console.error("Purchase update error:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
