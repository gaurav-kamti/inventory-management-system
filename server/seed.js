require("dotenv").config();
const { sequelize, User, Product, Customer, Supplier } = require("./models");

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log("Database synced");

    // Create admin user
    await User.create({
      username: "admin",
      password: "admin123",
      role: "admin",
    });
    console.log("Admin user created");

    // Create products
    await Product.create({
      name: "Samsung Galaxy Phone",
      purchasePrice: 500,
      sellingPrice: 699,
      stock: 25,
      hsn: "8301",
    });

    await Product.create({
      name: "Nike Running Shoes",
      purchasePrice: 60,
      sellingPrice: 99,
      stock: 50,
      hsn: "8302",
    });

    await Product.create({
      name: "Coca-Cola 2L",
      purchasePrice: 1.5,
      sellingPrice: 2.99,
      stock: 100,
      hsn: "2202",
    });

    await Product.create({
      name: "Wireless Headphones",
      purchasePrice: 30,
      sellingPrice: 59,
      stock: 3,
      hsn: "8518",
    });

    console.log("Products created");

    // Create customers
    const john = await Customer.create({
      name: "John Doe",
      phone: "555-0101",
      email: "john@example.com",
      address: "123 Main St",
      outstandingBalance: 0,
    });

    await Customer.create({
      name: "Jane Smith",
      phone: "555-0102",
      email: "jane@example.com",
      address: "456 Oak Ave",
      outstandingBalance: 0,
    });
    console.log("Customers created");

    // Create suppliers
    await Supplier.create({
      name: "Tech Distributors Inc.",
      contactPerson: "Mike Johnson",
      phone: "555-1001",
      email: "mike@techdist.com",
      address: "789 Industrial Blvd",
    });

    await Supplier.create({
      name: "Global Imports Ltd.",
      contactPerson: "Sarah Lee",
      phone: "555-1002",
      email: "sarah@globalimports.com",
      address: "321 Trade Center",
    });

    const LocalWholesale = await Supplier.create({
      name: "Local Wholesale Co.",
      contactPerson: "Tom Brown",
      phone: "555-1003",
      email: "tom@localwholesale.com",
      address: "654 Commerce St",
    });
    console.log("Suppliers created");

    // --- NEW: Create Sales and Purchases for Analytics demo ---
    const { Sale, SaleItem, Purchase } = require("./models");

    // 1. Create Sample Sale for John Doe
    const sale1 = await Sale.create({
      invoiceNumber: "INV-001",
      customerId: john.id,
      userId: 1, // Admin
      subtotal: 758.0,
      tax: 75.8,
      total: 833.8,
      amountPaid: 833.8,
      amountDue: 0,
      paymentMode: "cash",
      status: "completed",
    });

    await SaleItem.create({
      saleId: sale1.id,
      productId: 1, // Samsung Phone
      quantity: 1,
      price: 699,
      total: 699,
      hsn: "8301",
    });

    // 2. Create Sample Purchase from Tech Distributors
    await Purchase.create({
      productId: 1,
      supplierId: 1,
      invoiceNumber: "PUR-101",
      quantityReceived: 10,
      unitCost: 500,
      landingCost: 500,
      totalCost: 5000,
      receivedDate: new Date(),
      unitOfMeasure: "pcs",
      amountPaid: 5000,
      amountDue: 0,
    });

    console.log("Sample Sales and Purchases created");

    console.log("\n✅ Database seeded successfully!");

    console.log("\nLogin credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
