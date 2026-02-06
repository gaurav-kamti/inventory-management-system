const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

function checkTable(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
        });
    });
}

async function run() {
    try {
        console.log('SQLite Schema Check:');
        const products = await checkTable('Products');
        console.log('Products:', products.join(', '));
        
        const customers = await checkTable('Customers');
        console.log('Customers:', customers.join(', '));
        
        const sales = await checkTable('Sales');
        console.log('Sales:', sales.join(', '));
        
        db.close();
    } catch (e) {
        console.error(e);
    }
}

run();
