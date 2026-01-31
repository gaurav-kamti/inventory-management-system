const express = require("express");
const {
  Supplier,
  SupplierTransaction,
  Customer,
  CreditTransaction,
  Sale,
  Purchase,
  sequelize,
} = require("../models");
const { auth } = require("../middleware/auth");
const { Op } = require("sequelize");
const router = express.Router();

// Helper for rounding
const round2 = (v) =>
  Math.round((parseFloat(v || 0) + Number.EPSILON) * 100) / 100;

// GET /api/vouchers/history
router.get("/history", auth, async (req, res) => {
  try {
    const customerPayments = await CreditTransaction.findAll({
      where: { type: 'payment' },
      include: [{ model: Customer, attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });

    const supplierPayments = await SupplierTransaction.findAll({
      where: { type: 'payment' },
      include: [{ model: Supplier, attributes: ['name'] }],
      order: [['date', 'DESC']]
    });

    // Normalize and combine
    const vouchers = [
      ...customerPayments.map(p => ({
        id: `R-${p.id}`,
        date: p.createdAt,
        type: 'RECEIPT', // Money In
        partyName: p.Customer?.name || 'Unknown',
        amount: p.amount,
        mode: p.notes, // Using notes as mode/description for now
        rawDate: new Date(p.createdAt)
      })),
      ...supplierPayments.map(p => ({
        id: `P-${p.id}`,
        date: p.date,
        type: 'PAYMENT', // Money Out
        partyName: p.Supplier?.name || 'Unknown',
        amount: p.amount,
        mode: p.notes,
        rawDate: new Date(p.date)
      }))
    ].sort((a, b) => b.rawDate - a.rawDate);

    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vouchers/unpaid-sales/:customerId
router.get("/unpaid-sales/:customerId", auth, async (req, res) => {
  try {
    const sales = await Sale.findAll({
      where: {
        customerId: req.params.customerId,
        amountDue: { [Op.gt]: 0 }
      },
      attributes: ['id', 'invoiceNumber', 'total', 'amountDue', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vouchers/unpaid-purchases/:supplierId
router.get("/unpaid-purchases/:supplierId", auth, async (req, res) => {
  try {
    const purchases = await SupplierTransaction.findAll({
      where: {
        supplierId: req.params.supplierId,
        type: 'bill',
        amountDue: { [Op.gt]: 0 }
      },
      attributes: ['id', 'amount', 'amountDue', 'date', 'notes', 'invoiceNumber'],
      order: [['date', 'ASC']]
    });
    // Extract invoice number from notes if possible, or just return the record
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vouchers/unused-advances/customer/:id
router.get("/unused-advances/customer/:id", auth, async (req, res) => {
  try {
    const advances = await CreditTransaction.findAll({
      where: {
        customerId: req.params.id,
        isAdvance: true,
        remainingAdvance: { [Op.gt]: 0 }
      },
      order: [['createdAt', 'ASC']]
    });
    res.json(advances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vouchers/unused-advances/supplier/:id
router.get("/unused-advances/supplier/:id", auth, async (req, res) => {
  try {
    const advances = await SupplierTransaction.findAll({
      where: {
        supplierId: req.params.id,
        isAdvance: true,
        remainingAdvance: { [Op.gt]: 0 }
      },
      order: [['date', 'ASC']]
    });
    res.json(advances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vouchers/payment - Pay a Supplier
router.post("/payment", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { supplierId, amount, date, mode, notes, method, referenceId } = req.body;
    let paymentAmount = round2(parseFloat(amount || 0));

    if (!supplierId || paymentAmount <= 0) {
      return res.status(400).json({ error: "Invalid supplier or amount" });
    }

    const supplier = await Supplier.findByPk(supplierId, { transaction: t });
    if (!supplier) {
      await t.rollback();
      return res.status(404).json({ error: "Supplier not found" });
    }

    // 1. Handle Settlement Logic
    if (method === 'Agst Ref' && referenceId) {
      const bill = await SupplierTransaction.findByPk(referenceId, { transaction: t });
      if (bill) {
        const payToBill = Math.min(paymentAmount, parseFloat(bill.amountDue));
        const newPaid = round2(parseFloat(bill.amountPaid) + payToBill);
        const newDue = round2(parseFloat(bill.amountDue) - payToBill);
        await bill.update({
          amountPaid: newPaid,
          amountDue: newDue,
          status: newDue <= 0 ? 'completed' : 'partial'
        }, { transaction: t });
      }
    } else if (method === 'On Account') {
      const unpaidBills = await SupplierTransaction.findAll({
        where: { supplierId, type: 'bill', amountDue: { [Op.gt]: 0 } },
        order: [['date', 'ASC']],
        transaction: t
      });

      let remaining = paymentAmount;
      for (const bill of unpaidBills) {
        if (remaining <= 0) break;
        const payToBill = Math.min(remaining, parseFloat(bill.amountDue));
        const newPaid = round2(parseFloat(bill.amountPaid) + payToBill);
        const newDue = round2(parseFloat(bill.amountDue) - payToBill);
        await bill.update({
          amountPaid: newPaid,
          amountDue: newDue,
          status: newDue <= 0 ? 'completed' : 'partial'
        }, { transaction: t });
        remaining = round2(remaining - payToBill);
      }
    }

    // 2. Update Supplier Overall Balance
    const newBalance = round2(parseFloat(supplier.outstandingBalance || 0) - paymentAmount);
    await supplier.update({ outstandingBalance: newBalance }, { transaction: t });

    // 3. Create Transaction Record
    await SupplierTransaction.create(
      {
        supplierId,
        type: "payment",
        amount: paymentAmount,
        date: date || new Date(),
        paymentMode: mode || 'cash',
        notes: notes,
        method: method || 'On Account',
        purchaseId: method === 'Agst Ref' ? referenceId : null,
        isAdvance: method === 'Advance',
        remainingAdvance: method === 'Advance' ? paymentAmount : 0
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Payment recorded successfully", newBalance });
  } catch (error) {
    if (t) await t.rollback();
    console.error("Payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vouchers/receipt - Receive from Customer
router.post("/receipt", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { customerId, amount, date, mode, notes, method, referenceId } = req.body;
    let receiptAmount = round2(parseFloat(amount || 0));

    if (!customerId || receiptAmount <= 0) {
      return res.status(400).json({ error: "Invalid customer or amount" });
    }

    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ error: "Customer not found" });
    }

    // 1. Handle Settlement Logic
    if (method === 'Agst Ref' && referenceId) {
      const sale = await Sale.findByPk(referenceId, { transaction: t });
      if (sale) {
        const payToSale = Math.min(receiptAmount, parseFloat(sale.amountDue));
        const newPaid = round2(parseFloat(sale.amountPaid) + payToSale);
        const newDue = round2(parseFloat(sale.amountDue) - payToSale);
        await sale.update({
          amountPaid: newPaid,
          amountDue: newDue,
          status: newDue <= 0 ? 'completed' : 'partial'
        }, { transaction: t });
      }
    } else if (method === 'On Account') {
      const unpaidSales = await Sale.findAll({
        where: { customerId, amountDue: { [Op.gt]: 0 } },
        order: [['createdAt', 'ASC']],
        transaction: t
      });

      let remaining = receiptAmount;
      for (const sale of unpaidSales) {
        if (remaining <= 0) break;
        const payToSale = Math.min(remaining, parseFloat(sale.amountDue));
        const newPaid = round2(parseFloat(sale.amountPaid) + payToSale);
        const newDue = round2(parseFloat(sale.amountDue) - payToSale);
        await sale.update({
          amountPaid: newPaid,
          amountDue: newDue,
          status: newDue <= 0 ? 'completed' : 'partial'
        }, { transaction: t });
        remaining = round2(remaining - payToSale);
      }
    }

    // 2. Update Customer Overall Balance
    const newBalance = round2(parseFloat(customer.outstandingBalance || 0) - receiptAmount);
    await customer.update({ outstandingBalance: newBalance }, { transaction: t });

    // 3. Create Transaction Record
    await CreditTransaction.create(
      {
        customerId,
        type: "payment",
        amount: receiptAmount,
        notes: notes || `Receipt via ${mode}`,
        method: method || 'On Account',
        saleId: method === 'Agst Ref' ? referenceId : null,
        isAdvance: method === 'Advance',
        remainingAdvance: method === 'Advance' ? receiptAmount : 0
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Receipt recorded successfully", newBalance });
  } catch (error) {
    if (t) await t.rollback();
    console.error("Receipt error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
