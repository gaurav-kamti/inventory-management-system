const { Sale, Purchase } = require('./server/models');

async function checkDates() {
  const sales = await Sale.findAll({ limit: 5, order: [['id', 'DESC']] });
  console.log('--- SALES ---');
  sales.forEach(s => {
    console.log(`ID: ${s.id}, createdAt: ${s.createdAt}, Date: ${s.date}, buyerOrderDate: ${s.buyerOrderDate}`);
  });

  const purchases = await Purchase.findAll({ limit: 5, order: [['id', 'DESC']] });
  console.log('\n--- PURCHASES ---');
  purchases.forEach(p => {
    console.log(`ID: ${p.id}, receivedDate: ${p.receivedDate}, buyerOrderDate: ${p.buyerOrderDate}`);
  });
}

checkDates().catch(console.error);
