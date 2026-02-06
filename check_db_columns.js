const { sequelize, Product, Customer, Sale } = require('./server/models');

async function check() {
    try {
        console.log('Checking database columns...');
        const productFields = Object.keys(Product.rawAttributes);
        console.log('Product fields:', productFields);
        
        const customerFields = Object.keys(Customer.rawAttributes);
        console.log('Customer fields:', customerFields);
        
        const saleFields = Object.keys(Sale.rawAttributes);
        console.log('Sale fields:', saleFields);
        
        process.exit(0);
    } catch (e) {
        console.error('Error checking database:', e);
        process.exit(1);
    }
}

check();
