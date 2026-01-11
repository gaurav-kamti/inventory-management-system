const axios = require("axios");

(async function () {
  try {
    const base = "http://localhost:5000/api";
    console.log("Logging in...");
    const login = await axios.post(`${base}/auth/login`, {
      username: "admin",
      password: "admin123",
    });
    const token = login.data.token;
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    console.log("Fetching suppliers...");
    const suppliers = (await axios.get(`${base}/suppliers`, headers)).data;
    console.log("Suppliers count:", suppliers.length);
    const supplier = suppliers[0];
    console.log("Using supplier:", supplier && supplier.name);
    const purchaseBody = {
      supplierId: supplier.id,
      invoiceNumber: "INV-TEST-PUR-001",
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

    console.log("Posting purchase:", JSON.stringify(purchaseBody, null, 2));
    const res = await axios.post(`${base}/purchases`, purchaseBody, headers);
    console.log("Purchase created:", res.data);
  } catch (e) {
    if (e.response) {
      console.error(
        "API error status:",
        e.response.status,
        "data:",
        e.response.data
      );
    } else {
      console.error("Network or other error:", e.message);
    }
  }
})();
