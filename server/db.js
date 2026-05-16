const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'lookwalk.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    description TEXT,
    in_stock INTEGER DEFAULT 1,
    sizes TEXT DEFAULT '[]',
    variants TEXT DEFAULT '[]',
    discount_percent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Ensure existing database has the column
  db.run(`ALTER TABLE products ADD COLUMN discount_percent INTEGER DEFAULT 0`, (err) => {
    if (err) { /* column probably exists */ }
  });

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    delivery_address TEXT,
    payment_info TEXT,
    items TEXT,
    total REAL,
    payment_status TEXT DEFAULT 'pending',
    delivery_status TEXT DEFAULT 'pending',
    shipping_zone TEXT DEFAULT 'local',
    tracking_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Ensure existing database has the column
  db.run(`ALTER TABLE orders ADD COLUMN shipping_zone TEXT DEFAULT 'local'`, (err) => {
    if (err) { /* column probably exists */ }
  });

  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
});

module.exports = {
  query: (text, params = []) => {
    // Basic conversion from $1, $2 to SQLite ? ?
    const sql = text.replace(/\$\d+/g, '?');
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [{ id: this.lastID }], lastID: this.lastID });
        });
      }
    });
  },
};
