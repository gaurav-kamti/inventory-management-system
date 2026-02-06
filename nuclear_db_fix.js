const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const schemaChanges = [
    // Customers
    { table: 'Customers', column: 'state', type: 'TEXT DEFAULT "West Bengal"' },
    { table: 'Customers', column: 'stateCode', type: 'TEXT DEFAULT "19"' },
    
    // Products
    { table: 'Products', column: 'hsn', type: 'TEXT DEFAULT "8301"' },
    { table: 'Products', column: 'gst', type: 'DECIMAL(5, 2) DEFAULT 18.00' },
    { table: 'Products', column: 'quantityUnit', type: 'TEXT DEFAULT "Pcs"' },
    
    // Sales
    { table: 'Sales', column: 'deliveryNote', type: 'TEXT' },
    { table: 'Sales', column: 'paymentTerms', type: 'TEXT' },
    { table: 'Sales', column: 'supplierRef', type: 'TEXT' },
    { table: 'Sales', column: 'buyerOrderNo', type: 'TEXT' },
    { table: 'Sales', column: 'buyerOrderDate', type: 'TEXT' },
    { table: 'Sales', column: 'despatchedThrough', type: 'TEXT' },
    { table: 'Sales', column: 'termsOfDelivery', type: 'TEXT' },
    { table: 'Sales', column: 'cgst', type: 'DECIMAL(10, 2) DEFAULT 0' },
    { table: 'Sales', column: 'sgst', type: 'DECIMAL(10, 2) DEFAULT 0' },
    { table: 'Sales', column: 'igst', type: 'DECIMAL(10, 2) DEFAULT 0' },
    { table: 'Sales', column: 'roundOff', type: 'DECIMAL(10, 2) DEFAULT 0' },
    
    // SaleItems
    { table: 'SaleItems', column: 'hsn', type: 'TEXT DEFAULT "8301"' },
    { table: 'SaleItems', column: 'gst', type: 'DECIMAL(5, 2) DEFAULT 18.00' },
    { table: 'SaleItems', column: 'discount', type: 'DECIMAL(5, 2) DEFAULT 0' }
];

function getColumns(table) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
        });
    });
}

async function runFix() {
    console.log('--- Database Repair Tool ---');
    console.log(`Targeting: ${dbPath}`);

    for (const change of schemaChanges) {
        try {
            const columns = await getColumns(change.table);
            if (!columns.includes(change.column)) {
                console.log(`Adding column [${change.column}] to [${change.table}]...`);
                await new Promise((resolve, reject) => {
                    db.run(`ALTER TABLE ${change.table} ADD COLUMN ${change.column} ${change.type}`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log('Success!');
            } else {
                console.log(`Column [${change.column}] already exists in [${change.table}]. Skipping.`);
            }
        } catch (e) {
            console.error(`Error processing ${change.table}.${change.column}:`, e.message);
        }
    }

    console.log('--- Repair Complete ---');
    db.close();
}

runFix();
