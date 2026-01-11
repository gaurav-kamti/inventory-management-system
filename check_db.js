const sequelize = require('./server/config/database');
sequelize.authenticate()
    .then(() => {
        console.log('Connection stable');
        process.exit(0);
    })
    .catch(e => {
        console.error('Connection error:', e);
        process.exit(1);
    });
