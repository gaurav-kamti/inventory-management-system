const express = require("express");
const { Customer, Sale, CreditTransaction } = require("../models");
const { auth } = require("../middleware/auth");
const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [["name", "ASC"]],
    });

    // Calculate aging for each customer with outstanding balance
    const customersWithAging = await Promise.all(
      customers.map(async (customer) => {
        const custJSON = customer.toJSON();

        if (parseFloat(customer.outstandingBalance) > 0) {
          // Find the oldest invoice contributing to this balance (FIFO)
          // We look backwards from newest to oldest.
          // The moment cumulative sales cover the balance, that sale is the "oldest" unpaid one.

          const sales = await Sale.findAll({
            where: { customerId: customer.id },
            order: [["createdAt", "DESC"]],
            attributes: ["id", "total", "createdAt"],
          });

          let balanceToExplain = parseFloat(customer.outstandingBalance);
          // Default to customer creation date if no sales explain the balance (e.g. opening balance)
          let oldestUnpaidDate = customer.createdAt
            ? new Date(customer.createdAt)
            : new Date();

          for (const sale of sales) {
            const saleAmount = parseFloat(sale.total);
            if (balanceToExplain <= saleAmount) {
              // This sale fully covers the remainder of the balance
              oldestUnpaidDate = new Date(sale.createdAt);
              balanceToExplain = 0;
              break;
            } else {
              // This sale is fully unpaid, moving to older sales to find the rest
              balanceToExplain -= saleAmount;
              oldestUnpaidDate = new Date(sale.createdAt); // Update to this sale's date
            }
          }

          // Calculate difference in calendar days
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const pastDate = new Date(oldestUnpaidDate);
          pastDate.setHours(0, 0, 0, 0);

          const diffTime = Math.abs(today - pastDate);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          custJSON.daysOverdue = diffDays;
          custJSON.oldestUnpaidDate = oldestUnpaidDate;
        } else {
          custJSON.daysOverdue = 0;
          custJSON.oldestUnpaidDate = null;
        }

        return custJSON;
      }),
    );

    res.json(customersWithAging);
  } catch (error) {
    console.error('Error in GET /api/customers:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

router.get("/:id/history", auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    // Fetch all sales (Debits)
    const sales = await Sale.findAll({
      where: { customerId: customer.id },
      order: [["createdAt", "ASC"]],
    });

    // Fetch all payments (Credits)
    const payments = await CreditTransaction.findAll({
      where: { customerId: customer.id },
      order: [["createdAt", "ASC"]],
    });

    // Normalize and Combine
    const ledger = [
      ...sales.map((s) => ({
        id: `S-${s.id}`,
        date: s.createdAt,
        type: "SALE",
        description: `Invoice #${s.invoiceNumber}`,
        debit: parseFloat(s.total),
        credit: 0,
        rawDate: new Date(s.createdAt),
      })),
      ...payments.map((p) => ({
        id: `P-${p.id}`,
        date: p.createdAt,
        type: "RECEIPT",
        description: p.notes || `Payment (${p.method})`,
        debit: 0,
        credit: parseFloat(p.amount),
        rawDate: new Date(p.createdAt),
      })),
    ].sort((a, b) => a.rawDate - b.rawDate);

    // Calculate Running Balance
    let balance = 0;
    const history = ledger.map((entry) => {
      balance += entry.debit - entry.credit;
      return { ...entry, balance: parseFloat(balance.toFixed(2)) };
    });

    res.json({ customer, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: Sale }, { model: CreditTransaction }],
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    await customer.update(req.body);
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    await customer.destroy();
    res.json({ message: "Customer deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
