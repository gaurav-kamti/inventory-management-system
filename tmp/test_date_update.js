const { Sale } = require('./server/models');
const sequelize = require('./server/config/database');

async function test() {
  await sequelize.sync();
  let s = await Sale.findOne();
  if(!s){
      s = await Sale.create({ invoiceNumber: 'TEST1', subtotal: 10, total: 10, paymentMode: 'cash' });
  }
  const oldDate = s.createdAt;
  console.log('Old:', oldDate);

  const newDate = new Date('2024-01-01T10:00:00Z');
  // Attempt 1: Just update
  await s.update({ createdAt: newDate });
  
  // Refetch
  const s2 = await Sale.findByPk(s.id);
  console.log('New after normal update:', s2.createdAt);

  // Attempt 2: silent: true
  await s2.update({ createdAt: new Date('2024-02-02T10:00:00Z') }, { silent: true });
  const s3 = await Sale.findByPk(s.id);
  console.log('New after silent update:', s3.createdAt);
  
  // Attempt 3: SET clause with query
  await sequelize.query(`UPDATE Sales SET createdAt = '2024-03-03 10:00:00' WHERE id=${s.id}`);
  const s4 = await Sale.findByPk(s.id);
  console.log('New after direct query:', s4.createdAt);
}
test().then(() => process.exit(0));
