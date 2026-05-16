const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected (SQLite)' });
  } catch (err) {
    console.error('Health Check Error:', err);
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

// Simple Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ─── PRODUCTS ───────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  const { limit, offset } = req.query;
  try {
    let sql = 'SELECT id, name, price, category, image, in_stock, created_at, sizes, variants FROM products ORDER BY created_at DESC';
    const params = [];
    if (limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }
    const result = await db.query(sql, params);
    const products = result.rows.map(p => ({
      ...p,
      sizes: typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []),
      variants: typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []),
      in_stock: Boolean(p.in_stock)
    }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = result.rows[0];
    product.sizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : (product.sizes || []);
    product.variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : (product.variants || []);
    product.in_stock = Boolean(product.in_stock);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, price, category, image, description, in_stock, sizes, variants, discount_percent } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO products (name, price, category, image, description, in_stock, sizes, variants, discount_percent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [name, price, category, image, description, in_stock ? 1 : 0, JSON.stringify(sizes), JSON.stringify(variants), discount_percent || 0]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, image, description, in_stock, sizes, variants, discount_percent } = req.body;
  try {
    await db.query(
      'UPDATE products SET name = $1, price = $2, category = $3, image = $4, description = $5, in_stock = $6, sizes = $7, variants = $8, discount_percent = $9 WHERE id = $10',
      [name, price, category, image, description, in_stock ? 1 : 0, JSON.stringify(sizes), JSON.stringify(variants), discount_percent || 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ORDERS ────────────────────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
  const { limit, offset } = req.query;
  try {
    let sql = 'SELECT * FROM orders ORDER BY created_at DESC';
    const params = [];
    if (limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }
    if (offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }
    const result = await db.query(sql, params);
    const orders = result.rows.map(o => ({
      ...o,
      customer: typeof o.customer === 'string' ? JSON.parse(o.customer) : (o.customer || {}),
      delivery_address: typeof o.delivery_address === 'string' ? JSON.parse(o.delivery_address) : (o.delivery_address || {}),
      payment_info: typeof o.payment_info === 'string' ? JSON.parse(o.payment_info) : (o.payment_info || {}),
      items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
    }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customer, delivery_address, payment_info, items, total, shippingZone } = req.body;
  try {
    // 1. Save the order
    const result = await db.query(
      'INSERT INTO orders (customer, delivery_address, payment_info, items, total, shipping_zone) VALUES ($1, $2, $3, $4, $5, $6)',
      [JSON.stringify(customer), JSON.stringify(delivery_address), JSON.stringify(payment_info), JSON.stringify(items), total, shippingZone || 'local']
    );

    // 2. Reduce stock for each item
    for (const item of items) {
      if (!item.productId) continue;
      
      const productRes = await db.query('SELECT variants FROM products WHERE id = $1', [item.productId]);
      if (productRes.rows.length > 0) {
        let variants = [];
        try {
          variants = typeof productRes.rows[0].variants === 'string' 
            ? JSON.parse(productRes.rows[0].variants) 
            : (productRes.rows[0].variants || []);
        } catch (e) { console.error('Error parsing variants for product', item.productId); }

        const variantIndex = variants.findIndex(v => v.color === item.color);
        if (variantIndex > -1) {
          const v = variants[variantIndex];
          // Support for nested stock matrix { "S": 5, "M": 10 }
          if (typeof v.stock === 'object' && v.stock !== null && item.size) {
            v.stock[item.size] = Math.max(0, (v.stock[item.size] || 0) - (item.quantity || 1));
          } else {
            // Fallback for old simple stock number
            v.stock = Math.max(0, (Number(v.stock) || 0) - (item.quantity || 1));
          }
          
          await db.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
          console.log(`Stock reduced for Product ${item.productId}, Color ${item.color}, Size ${item.size}`);
        }
      }
    }

    res.json({ id: result.lastID });
  } catch (err) {
    console.error('Order/Stock Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;
  const allowedFields = ['payment_status', 'delivery_status', 'tracking_id'];
  if (!allowedFields.includes(field)) return res.status(400).json({ error: 'Invalid field' });
  try {
    await db.query(`UPDATE orders SET ${field} = $1 WHERE id = $2`, [value, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM orders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONTACTS ──────────────────────────────────────────────────────────────
app.get('/api/contacts', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  const { name, email, phone, message } = req.body;
  try {
    await db.query(
      'INSERT INTO contacts (name, email, phone, message) VALUES ($1, $2, $3, $4)',
      [name, email, phone, message]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE contacts SET status = 'read' WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SETTINGS (REELS, ETC.) ────────────────────────────────────────────────
app.get('/api/settings/:key', async (req, res) => {
  try {
    const result = await db.query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
    if (result.rows.length > 0) {
      res.json({ value: JSON.parse(result.rows[0].value) });
    } else {
      res.json({ value: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  const { value } = req.body;
  try {
    await db.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $3',
      [req.params.key, JSON.stringify(value), JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
