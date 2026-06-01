const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

let pgPool = null;
let usePostgres = false;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  usePostgres = true;
  console.log("Database Status: Using PostgreSQL (Production Mode)");
} else {
  console.log("Database Status: Using local SQLite (Development Mode)");
}

const sqliteDbPath = path.resolve(__dirname, 'lookwalk.db');
let sqliteDb = null;

if (!usePostgres) {
  sqliteDb = new sqlite3.Database(sqliteDbPath);
  
  // Create tables if they don't exist in SQLite
  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS products (
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
    sqliteDb.run(`ALTER TABLE products ADD COLUMN discount_percent INTEGER DEFAULT 0`, (err) => {
      if (err) { /* column probably exists */ }
    });

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS orders (
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
    sqliteDb.run(`ALTER TABLE orders ADD COLUMN shipping_zone TEXT DEFAULT 'local'`, (err) => {
      if (err) { /* column probably exists */ }
    });

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDb.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
  });
} else {
  // Auto-initialize PostgreSQL tables on launch
  const initPostgres = async () => {
    try {
      await pgPool.query(`CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image TEXT,
        description TEXT,
        in_stock INTEGER DEFAULT 1,
        sizes TEXT DEFAULT '[]',
        variants TEXT DEFAULT '[]',
        discount_percent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      await pgPool.query(`CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer TEXT,
        delivery_address TEXT,
        payment_info TEXT,
        items TEXT,
        total REAL,
        payment_status TEXT DEFAULT 'pending',
        delivery_status TEXT DEFAULT 'pending',
        shipping_zone TEXT DEFAULT 'local',
        tracking_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await pgPool.query(`CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await pgPool.query(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);
      
      console.log("PostgreSQL schema initialization check passed.");
    } catch (err) {
      console.error("PostgreSQL Initialization Error:", err);
    }
  };
  initPostgres();
}

module.exports = {
  query: async (text, params = []) => {
    if (usePostgres) {
      let sql = text;
      const upperSql = sql.trim().toUpperCase();
      const isInsert = upperSql.startsWith('INSERT');
      
      // PostgreSQL insert queries must return ID to match lastID property of SQLite
      if (isInsert && !upperSql.includes('RETURNING')) {
        sql += ' RETURNING id';
      }
      
      try {
        const res = await pgPool.query(sql, params);
        // Map postgres' returned rows first element ID to lastID for compatibility
        if (isInsert && res.rows && res.rows[0]) {
          res.lastID = res.rows[0].id;
        }
        return res;
      } catch (err) {
        console.error("Postgres Query Execution Error:", err, "\nSQL:", sql);
        throw err;
      }
    } else {
      // Basic conversion from $1, $2 (PG syntax) to SQLite ? ? syntax
      const sql = text.replace(/\$\d+/g, '?');
      return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows });
          });
        } else {
          sqliteDb.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ rows: [{ id: this.lastID }], lastID: this.lastID });
          });
        }
      });
    }
  },
};
