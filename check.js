const sqlite3 = require('sqlite3').verbose();
const db1 = new sqlite3.Database('./database.sqlite', sqlite3.OPEN_READONLY);
db1.all('SELECT count(*) as c from Sales', (err, rows) => {
    console.log('Root DB Sales:', rows ? rows[0].c : err.message);
    db1.all('SELECT count(*) as c from Purchases', (err, rows) => {
        console.log('Root DB Purchases:', rows ? rows[0].c : err.message);
        db1.all('SELECT count(*) as c from Vouchers', (err, rows) => {
            console.log('Root DB Vouchers:', rows ? rows[0].c : err.message);
            const db2 = new sqlite3.Database('./server/database.sqlite', sqlite3.OPEN_READONLY);
            db2.all('SELECT count(*) as c from Sales', (err, rows) => {
                console.log('Server DB Sales:', rows ? rows[0].c : err.message);
                process.exit(0);
            });
        });
    });
});
