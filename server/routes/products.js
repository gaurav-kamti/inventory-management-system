const express = require('express');
const { Product, Category, Brand } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { search, categoryId, brandId, lowStock } = req.query;
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    
    const products = await Product.findAll({
      where,
      include: [{ model: Category }, { model: Brand }]
    });
    
    let filtered = products;
    if (lowStock === 'true') {
      filtered = products.filter(p => p.stock <= p.lowStockThreshold);
    }
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Brand }]
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, categoryId, brandId, purchasePrice, sellingPrice, stock, lowStockThreshold } = req.body;
    
    // Check if product exists by name
    let product = await Product.findOne({ where: { name } });

    if (product) {
        // Update existing product: Add stock, update prices to latest
        const newStock = product.stock + (parseInt(stock) || 0);
        await product.update({
            stock: newStock,
            purchasePrice: purchasePrice || product.purchasePrice,
            // Only update sellingPrice if explicitly provided, otherwise keep existing
            sellingPrice: sellingPrice || product.sellingPrice,
            categoryId: categoryId || product.categoryId,
            brandId: brandId || product.brandId
        });
    } else {
        // Create new product
        product = await Product.create({
            name,
            categoryId,
            brandId,
            purchasePrice,
            sellingPrice: sellingPrice || 0, // Default if not provided
            stock: stock || 0,
            lowStockThreshold
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
