const { Sale, SaleItem, sequelize } = require('./server/models');

async function fix() {
    try {
        console.log('Syncing database...');
        await sequelize.sync({ alter: true });
        console.log('Database synced with alter: true');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing database:', err);
        process.exit(1);
    }
}

fix();
