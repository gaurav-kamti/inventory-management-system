require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const customerRoutes = require("./routes/customers");
const saleRoutes = require("./routes/sales");
const supplierRoutes = require("./routes/suppliers");
const purchaseRoutes = require("./routes/purchases");

const path = require("path");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/suppliers", supplierRoutes);

app.use("/api/settings", require("./routes/settings"));
app.use("/api/purchases", purchaseRoutes);
app.use("/api/vouchers", require("./routes/vouchers"));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../client/dist")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

// Initialize database and start server
console.log("Starting database sync...");
// Using force: false to avoid SQLite alter table crashes.
// If schema updates are needed, we should run a separate migration script.
sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database synced successfully");
    
    // Inline Migration to fix Schema and Names
    const runMigrations = async () => {
      // 1. Column renames/adds for standardization
      const tables = ['Customers', 'Suppliers'];
      const newCols = ['gstin TEXT', 'pincode TEXT'];
      for (let table of tables) {
        for (let colDef of newCols) {
          try { await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${colDef}`); } catch (e) {}
        }
        // Transfer data
        try { await sequelize.query(`UPDATE ${table} SET gstin = gstNumber WHERE gstin IS NULL AND gstNumber IS NOT NULL`); } catch (e) {}
        try { await sequelize.query(`UPDATE ${table} SET pincode = pinCode WHERE pincode IS NULL AND pinCode IS NOT NULL`); } catch (e) {}
      }

      // 2. Original missions (Fixing missing GST columns)
      const salesCols = ['cgst', 'sgst', 'gstPercent', 'discountPercent', 'discountAmount', 'taxableAmount'];
      const purchCols = ['subtotal', 'taxableAmount', 'gstPercent', 'discountPercent', 'discountAmount', 'cgst', 'sgst', 'total', 'roundOff'];
      for (let col of salesCols) {
        try { await sequelize.query(`ALTER TABLE Sales ADD COLUMN ${col} REAL DEFAULT 0`); } catch (e) {}
      }
      for (let col of purchCols) {
        try { await sequelize.query(`ALTER TABLE Purchases ADD COLUMN ${col} REAL DEFAULT 0`); } catch (e) {}
      }
      try { await sequelize.query(`UPDATE Sales SET gstPercent = 18 WHERE gstPercent = 0`); } catch (e) {}
      try { await sequelize.query(`UPDATE Purchases SET gstPercent = 18 WHERE gstPercent = 0`); } catch (e) {}
    };

    runMigrations().then(async () => {
      // Auto-Seed Admin if missing
      const { User } = require("./models");
      try {
        const admin = await User.findOne({ where: { username: "admin" } });
        if (!admin) {
          console.log("Admin user not found. Auto-creating...");
          await User.create({
            username: "admin",
            password: "admin123",
            role: "admin",
          });
          console.log("Admin user created.");
        } else {
            console.log("Admin user exists.");
        }
      } catch (err) {
        console.error("Error auto-seeding admin:", err);
      }

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    });
  })
  .catch((err) => {
    console.error("Database sync error:", err);
  });
