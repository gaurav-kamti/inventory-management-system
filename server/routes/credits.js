const express = require('express');
const { CreditTransaction, Customer, Sale, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const transactions = await CreditTransaction.findAll({
      where: { customerId: req.params.customerId },
      include: [{ model: Sale }],
      order: [['createdAt', 'DESC']]
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payment', auth, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { customerId, saleId, amount, notes } = req.body;
    
    const customer = await Customer.findByPk(customerId);
    const sale = saleId ? await Sale.findByPk(saleId) : null;
    
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Create payment transaction
    await CreditTransaction.create({
      customerId,
      saleId: saleId || null,
      type: 'payment',
      amount,
      notes
    }, { transaction: t });
    
    // Update customer balance
    await customer.update({
      outstandingBalance: parseFloat(customer.outstandingBalance) - amount
    }, { transaction: t });
    
    // Update sale if specified
    if (sale) {
      const newAmountPaid = parseFloat(sale.amountPaid) + amount;
      const newAmountDue = parseFloat(sale.amountDue) - amount;
      await sale.update({
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newAmountDue <= 0 ? 'completed' : 'pending'
      }, { transaction: t });
    }
    
    await t.commit();
    res.json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
