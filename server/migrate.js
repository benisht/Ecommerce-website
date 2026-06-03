const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const sqliteDbPath = path.resolve(__dirname, 'lookwalk.db');
const schemaPath = path.resolve(__dirname, 'server_schema.sql');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('CRITICAL: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL successfully.');

    // 1. Initialize PostgreSQL schema
    console.log('Initializing schema from server_schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pgClient.query(schemaSql);
    console.log('Schema initialized successfully.');

    // 2. Open SQLite database
    console.log(`Opening SQLite database at: ${sqliteDbPath}`);
    const sqliteDb = new sqlite3.Database(sqliteDbPath);

    // Helper function to query SQLite
    const querySQLite = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    // 3. Migrate Products
    console.log('Migrating products...');
    const sqliteProducts = await querySQLite('SELECT * FROM products');
    console.log(`Found ${sqliteProducts.length} products in SQLite.`);
    
    for (const p of sqliteProducts) {
      let parsedSizes = [];
      let parsedVariants = [];
      try {
        parsedSizes = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []);
      } catch (e) {
        parsedSizes = p.sizes ? p.sizes.split(',').map(s => s.trim()) : [];
      }
      try {
        parsedVariants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []);
      } catch (e) {
        parsedVariants = [];
      }

      await pgClient.query(
        `INSERT INTO products (id, name, price, category, image, images, description, in_stock, sizes, variants, discount_percent, featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, price = EXCLUDED.price, category = EXCLUDED.category,
           image = EXCLUDED.image, images = EXCLUDED.images, description = EXCLUDED.description,
           in_stock = EXCLUDED.in_stock, sizes = EXCLUDED.sizes, variants = EXCLUDED.variants,
           discount_percent = EXCLUDED.discount_percent, featured = EXCLUDED.featured`,
        [
          p.id,
          p.name,
          p.price,
          p.category,
          p.image,
          JSON.stringify([]), // Default empty images array
          p.description,
          p.in_stock,
          JSON.stringify(parsedSizes),
          JSON.stringify(parsedVariants),
          p.discount_percent || 0,
          false
        ]
      );
    }
    console.log('Products migration finished.');

    // 4. Migrate settings
    console.log('Migrating settings...');
    let sqliteSettings = [];
    try {
      sqliteSettings = await querySQLite('SELECT * FROM settings');
      console.log(`Found ${sqliteSettings.length} settings in SQLite.`);
    } catch (e) {
      console.log('No settings table found or empty in SQLite.');
    }

    for (const s of sqliteSettings) {
      let parsedValue = s.value;
      try {
        parsedValue = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
      } catch (e) {}

      await pgClient.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [s.key, JSON.stringify(parsedValue)]
      );
    }
    console.log('Settings migration finished.');

    // 5. Migrate contacts
    console.log('Migrating contacts...');
    let sqliteContacts = [];
    try {
      sqliteContacts = await querySQLite('SELECT * FROM contacts');
      console.log(`Found ${sqliteContacts.length} contacts in SQLite.`);
    } catch (e) {
      console.log('No contacts table found or empty in SQLite.');
    }

    for (const c of sqliteContacts) {
      await pgClient.query(
        `INSERT INTO contacts (id, name, email, phone, message, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.email, c.phone, c.message, c.status || 'unread', c.created_at]
      );
    }
    console.log('Contacts migration finished.');

    // 6. Migrate orders
    console.log('Migrating orders...');
    let sqliteOrders = [];
    try {
      sqliteOrders = await querySQLite('SELECT * FROM orders');
      console.log(`Found ${sqliteOrders.length} orders in SQLite.`);
    } catch (e) {
      console.log('No orders table found or empty in SQLite.');
    }

    for (const o of sqliteOrders) {
      let parsedCustomer = {};
      let parsedAddress = {};
      let parsedPayment = {};
      let parsedItems = [];

      try { parsedCustomer = typeof o.customer === 'string' ? JSON.parse(o.customer) : (o.customer || {}); } catch(e) {}
      try { parsedAddress = typeof o.delivery_address === 'string' ? JSON.parse(o.delivery_address) : (o.delivery_address || {}); } catch(e) {}
      try { parsedPayment = typeof o.payment_info === 'string' ? JSON.parse(o.payment_info) : (o.payment_info || {}); } catch(e) {}
      try { parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch(e) {}

      await pgClient.query(
        `INSERT INTO orders (id, customer, delivery_address, payment_info, items, total, payment_status, delivery_status, shipping_zone, tracking_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          o.id,
          JSON.stringify(parsedCustomer),
          JSON.stringify(parsedAddress),
          JSON.stringify(parsedPayment),
          JSON.stringify(parsedItems),
          o.total,
          o.payment_status || 'pending',
          o.delivery_status || 'pending',
          o.shipping_zone || 'local',
          o.tracking_id,
          o.created_at
        ]
      );
    }
    console.log('Orders migration finished.');

    // 7. Seed default Admin User if users table is empty
    console.log('Checking users table...');
    const userCountRes = await pgClient.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountRes.rows[0].count);

    if (userCount === 0) {
      console.log('Seeding default administrator account...');
      const adminUsername = 'admin';
      const adminPasswordRaw = 'admin123';
      const hashedPassword = await bcrypt.hash(adminPasswordRaw, 10);
      
      await pgClient.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        [adminUsername, hashedPassword, 'admin']
      );
      console.log(`Default admin created. Username: "${adminUsername}", Password: "${adminPasswordRaw}"`);
    } else {
      console.log(`Users table is not empty (${userCount} users found). Skipping admin seed.`);
    }

    // 8. Populate default categories if empty
    console.log('Populating categories...');
    const categoriesCountRes = await pgClient.query('SELECT COUNT(*) as count FROM categories');
    const categoriesCount = parseInt(categoriesCountRes.rows[0].count);

    if (categoriesCount === 0) {
      const defaultCats = ['Hoodies', 'Watches', 'Glasses', 'Shirts'];
      for (const catName of defaultCats) {
        await pgClient.query(
          'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [catName]
        );
      }
      console.log('Default categories populated successfully.');
    }

    // Close databases
    sqliteDb.close();
    console.log('Migration finished successfully.');

  } catch (err) {
    console.error('Migration failed with error:', err);
  } finally {
    await pgClient.end();
    console.log('PostgreSQL connection closed.');
  }
}

migrate();
