const axios = require("axios");

async function test() {
  try {
    const base = "http://localhost:5000/api";
    // Login as admin
    console.log("Attempting to login...");
    const login = await axios.post(`${base}/auth/login`, {
      username: "admin",
      password: "admin123",
    });
    const token = login.data.token;
    console.log("Login success, token length:", token?.length);
    const headers = { headers: { Authorization: `Bearer ${token}` } };

    // Get products
    console.log("Fetching products...");
    const products = (await axios.get(`${base}/products`, headers)).data;
    const product = products[0];
    console.log(
      "Using product:",
      product.name,
      "id:",
      product.id,
      "sellingPrice:",
      product.sellingPrice
    );

    // Create sale with quantity that produces float values
    const qty = 3;
    const saleBody = {
      items: [
        {
          productId: product.id,
          quantity: qty,
          batchNumber: "",
          serialNumber: "",
        },
      ],
      paymentMode: "full",
      discount: 0,
      amountPaid: parseFloat(product.sellingPrice) * qty,
      salesChannel: "in-store",
    };

    const saleRes = await axios.post(`${base}/sales`, saleBody, headers);
    console.log(
      "Sale created:",
      saleRes.data.invoiceNumber,
      "id:",
      saleRes.data.id,
      "total:",
      saleRes.data.total
    );

    // Fetch stored sales and print totals (first record)
    const sales = (await axios.get(`${base}/sales`, headers)).data;
    const s = sales[0];
    console.log(
      "Stored sale [0] totals -> subtotal:",
      s.subtotal,
      "tax:",
      s.tax,
      "total:",
      s.total,
      "amountPaid:",
      s.amountPaid,
      "amountDue:",
      s.amountDue
    );

    // Create purchase to test rounding
    console.log("Fetching suppliers...");
    const suppliers = (await axios.get(`${base}/suppliers`, headers)).data;
    const supplier = suppliers[0];
    console.log("Using supplier:", supplier.name);
    const purchaseBody = {
      supplierId: supplier.id,
      invoiceNumber: "INV-TEST-001",
      date: new Date().toISOString(),
      items: [
        {
          name: "Test Item Rounding",
          quantity: "10",
          rate: "2.345",
          amount: "23.45",
        },
      ],
    };

    console.log("Creating purchase...");
    const purchaseRes = await axios.post(
      `${base}/purchases`,
      purchaseBody,
      headers
    );
    console.log("Purchase response:", purchaseRes.data.message);

    const purchases = (await axios.get(`${base}/purchases`, headers)).data;
    console.log(
      "Stored purchase [0] totalCost:",
      purchases[0].totalCost,
      "unitCost:",
      purchases[0].unitCost
    );
  } catch (e) {
    if (e.response) {
      console.error("API error:", e.response.status, e.response.data);
    } else {
      console.error("Network error:", e.message);
    }
  }
}

test();
