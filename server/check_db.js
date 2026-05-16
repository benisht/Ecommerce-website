const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('d:/website_lookwalk/server/lookwalk.db');
db.all('SELECT * FROM settings', (err, rows) => {
  if (err) {
    console.error('DB Error:', err);
    process.exit(1);
  }
  console.log('SETTINGS_START');
  console.log(JSON.stringify(rows));
  console.log('SETTINGS_END');
  db.close();
});
