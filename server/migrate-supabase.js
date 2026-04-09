require('dotenv').config();
process.env.DATABASE_URL = 'postgresql://postgres:Gaurav%40108sp@db.hmugypotczxktjhpmnai.supabase.co:5432/postgres';

const { sequelize } = require('./models');

async function migrate() {
    console.log('Connecting to Supabase...');
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        
        console.log('Syncing models to Supabase (force: true)...');
        await sequelize.sync({ force: true });
        console.log('Database synced successfully!');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
