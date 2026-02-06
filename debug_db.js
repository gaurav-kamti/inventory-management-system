const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(Sales)", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Sales Columns:");
        rows.forEach(r => console.log(`- ${r.name}`));
    }
    db.all("PRAGMA table_info(SaleItems)", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("SaleItems Columns:");
            rows.forEach(r => console.log(`- ${r.name}`));
        }
        db.close();
    });
});
