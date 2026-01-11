const express = require('express');
const { Sale, Product, Customer, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

router.get('/stats', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySales = await Sale.sum('total', {
      where: { createdAt: { [Op.gte]: today } }
    }) || 0;
    
    const totalProducts = await Product.count();
    const lowStockProducts = await Product.count({
      where: sequelize.where(
        sequelize.col('stock'),
        Op.lte,
        sequelize.col('lowStockThreshold')
      )
    });
    
    const totalCustomers = await Customer.count();
    const totalOutstanding = await Customer.sum('outstandingBalance') || 0;
    
    res.json({
      todaySales,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      totalOutstanding
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
