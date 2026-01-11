const express = require('express');
const { StockMovement, Product, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/adjust', auth, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { productId, type, quantity, reason, notes } = req.body;
    
    const product = await Product.findByPk(productId);
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const previousStock = product.stock;
    let newStock;
    
    if (type === 'in') {
      newStock = previousStock + quantity;
    } else if (type === 'out') {
      newStock = previousStock - quantity;
    } else if (type === 'adjustment') {
      newStock = quantity;
    }
    
    await StockMovement.create({
      productId,
      userId: req.user.id,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      notes
    }, { transaction: t });
    
    await product.update({ stock: newStock }, { transaction: t });
    
    await t.commit();
    res.json({ message: 'Stock updated successfully', newStock });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

router.get('/movements/:productId', auth, async (req, res) => {
  try {
    const movements = await StockMovement.findAll({
      where: { productId: req.params.productId },
      order: [['createdAt', 'DESC']]
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
