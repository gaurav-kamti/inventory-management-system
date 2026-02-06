const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== Checking Database Schema ===\n');

const tables = ['Products', 'Customers', 'Sales'];

tables.forEach(table => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) {
            console.error(`Error checking ${table}:`, err);
        } else {
            console.log(`${table} columns:`);
            rows.forEach(r => console.log(`  - ${r.name} (${r.type})`));
            console.log('');
        }
        
        if (table === 'Sales') {
            db.close();
        }
    });
});
