const { sequelize } = require('./server/models');

async function syncDb() {
    try {
        console.log('Attempting forced sync with alter: true...');
        await sequelize.sync({ alter: true });
        console.log('Forced sync successful!');
        process.exit(0);
    } catch (e) {
        console.error('Forced sync failed:', e);
        process.exit(1);
    }
}

syncDb();
