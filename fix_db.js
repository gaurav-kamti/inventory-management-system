const sqlite3 = require('sqlite3').verbose();
const db1 = new sqlite3.Database('./database.sqlite');
const db2 = new sqlite3.Database('./server/database.sqlite');

const salesCols = ['cgst', 'sgst', 'gstPercent', 'discountPercent', 'discountAmount', 'taxableAmount'];
const purchCols = ['subtotal', 'taxableAmount', 'gstPercent', 'discountPercent', 'discountAmount', 'cgst', 'sgst', 'total', 'roundOff'];

function patchDb(db, name) {
    db.serialize(() => {
        salesCols.forEach(col => {
            db.run(`ALTER TABLE Sales ADD COLUMN ${col} REAL DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error(`[${name}] Sales.${col} error:`, err.message);
                } else if (!err) {
                    console.log(`[${name}] Added Sales.${col}`);
                }
            });
        });
        purchCols.forEach(col => {
            db.run(`ALTER TABLE Purchases ADD COLUMN ${col} REAL DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error(`[${name}] Purchases.${col} error:`, err.message);
                } else if (!err) {
                    console.log(`[${name}] Added Purchases.${col}`);
                }
            });
        });
        
        // Also fix the default value for gstPercent if needed
        db.run(`UPDATE Sales SET gstPercent = 18 WHERE gstPercent = 0`, (err) => {});
        db.run(`UPDATE Purchases SET gstPercent = 18 WHERE gstPercent = 0`, (err) => {});
    });
    db.close();
}

patchDb(db1, 'Root DB');
patchDb(db2, 'Server DB');
