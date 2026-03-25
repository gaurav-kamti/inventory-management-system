const { Settings, Sale } = require('./server/models');
const { sequelize } = require('./server/models');

async function cleanUp() {
  console.log('Starting cleanup...');
  try {
    const transaction = await sequelize.transaction();
    console.log('Transaction started.');
    
    // 1. Clean up Settings prefix
    const setting = await Settings.findOne({ where: { key: 'invoice_config' } });
    if (setting && setting.value && setting.value.prefix) {
      console.log('Found setting:', setting.value);
      if (setting.value.prefix.endsWith('/')) {
        const newValue = { ...setting.value, prefix: setting.value.prefix.slice(0, -1) };
        await setting.update({ value: newValue }, { transaction });
        console.log('Cleaned up Settings prefix to:', newValue.prefix);
      } else {
        console.log('Prefix already clean.');
      }
    } else {
      console.log('No invoice_config setting found.');
    }

    // 2. Fix Sales with double slashes
    console.log('Fetching sales...');
    const sales = await Sale.findAll();
    console.log(`Found ${sales.length} sales.`);
    let fixCount = 0;
    for (const sale of sales) {
      if (sale.invoiceNumber.includes('//')) {
        const newInvoiceNumber = sale.invoiceNumber.replace(/\/\//g, '/');
        await sale.update({ invoiceNumber: newInvoiceNumber }, { transaction });
        fixCount++;
      }
    }
    console.log(`Cleaned up ${fixCount} sales with double slashes.`);

    await transaction.commit();
    console.log('Transaction committed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanUp();
