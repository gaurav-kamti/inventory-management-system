const express = require("express");
const { Supplier, Purchase, SupplierTransaction } = require("../models");
const { auth } = require("../middleware/auth");
const router = express.Router();

router.get("/:id/history", auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    // Fetch all purchases (Credits - Payable increases)
    const purchases = await Purchase.findAll({
      where: { supplierId: supplier.id },
      order: [["receivedDate", "ASC"]],
    });

    // Fetch all payments (Debits - Payable decreases)
    const payments = await SupplierTransaction.findAll({
      where: { supplierId: supplier.id },
      order: [["date", "ASC"]],
    });

    // Normalize and Combine
    // Logic: Purchase increases Balance (Credit to us, but typically represented as positive Due)
    // Payment decreases Balance

    const ledger = [
      ...purchases.map((p) => ({
        id: `P-${p.id}`,
        date: p.receivedDate,
        type: "PURCHASE",
        description: `Invoice #${p.invoiceNumber}`,
        debit: 0, // Payment we SHOULD make
        credit: parseFloat(p.totalCost), // Liability increases
        rawDate: new Date(p.receivedDate),
      })),
      ...payments.map((p) => ({
        id: `T-${p.id}`,
        date: p.date,
        type: "PAYMENT",
        description: p.notes || `Payment (${p.method})`,
        debit: parseFloat(p.amount), // Liability decreases
        credit: 0,
        rawDate: new Date(p.date),
      })),
    ].sort((a, b) => a.rawDate - b.rawDate);

    // Calculate Running Balance
    // Balance = Credits (Purchases) - Debits (Payments)
    let balance = 0;
    const history = ledger.map((entry) => {
      balance += entry.credit - entry.debit;
      return { ...entry, balance: parseFloat(balance.toFixed(2)) };
    });

    res.json({ supplier, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      order: [["name", "ASC"]],
    });
    res.json(suppliers);
  } catch (error) {
    console.error('Error in GET /api/suppliers:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    await supplier.update(req.body);
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    await supplier.destroy();
    res.json({ message: "Supplier deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id, {
      include: [{ model: Purchase }, { model: SupplierTransaction }],
    });
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
