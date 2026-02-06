const express = require('express');
const { Product } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    const where = {};
    
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    
    const products = await Product.findAll({
      where
    });
    
    let filtered = products;
    if (lowStock === 'true') {
      filtered = products.filter(p => p.stock <= 10);
    }
    
    res.json(filtered);
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, purchasePrice, sellingPrice, stock, hsn, gst, quantityUnit } = req.body;
    
    // Check if product exists by name
    let product = await Product.findOne({ where: { name } });

    if (product) {
        // Update existing product: Add stock, update prices and info to latest
        const newStock = product.stock + (parseInt(stock) || 0);
        await product.update({
            stock: newStock,
            purchasePrice: purchasePrice || product.purchasePrice,
            sellingPrice: sellingPrice || product.sellingPrice,
            hsn: hsn || product.hsn,
            gst: gst || product.gst,
            quantityUnit: quantityUnit || product.quantityUnit
        });
    } else {
        // Create new product
        product = await Product.create({
            name,
            purchasePrice,
            sellingPrice: sellingPrice || 0,
            stock: stock || 0,
            hsn: hsn || '8301',
            gst: gst || 18.00,
            quantityUnit: quantityUnit || 'Pcs'
        });
    }

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.update(req.body);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
