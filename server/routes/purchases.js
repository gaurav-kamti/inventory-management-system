const express = require("express");
const { Purchase, Product, Supplier, sequelize } = require("../models");
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
