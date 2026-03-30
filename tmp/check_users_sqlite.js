const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all("SELECT * FROM Users", [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`Found ${rows.length} users:`);
    rows.forEach(r => {
      console.log(`ID: ${r.id}, Username: ${r.username}, Password: ${r.password.substring(0, 10)}...`);
    });
  }
  db.close();
});
