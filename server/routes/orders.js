const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});
// ── CREATE RAZORPAY ORDER (Public) ──────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const { customer, delivery_address, items, total, shippingZone } = req.body;

  if (!customer || !delivery_address || !items || !total) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }

  // Check Razorpay keys are configured
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(401).json({ error: 'Razorpay authentication failed: Keys are not configured.' });
  }

  // Calculate amount in paise (minimum 100 paise = 1 INR)
  const amountInPaise = Math.round(Number(total) * 100);
  if (amountInPaise < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1).' });
  }

  const pgClient = db.pool;
  let client;

  try {
    client = await pgClient.connect();
    await client.query('BEGIN');

    // 1. Insert order with pending status
    const orderRes = await client.query(
      `INSERT INTO orders (customer, delivery_address, payment_info, items, total, shipping_zone, payment_status, delivery_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        JSON.stringify(customer),
        JSON.stringify(delivery_address),
        JSON.stringify({}),
        JSON.stringify(items),
        total,
        shippingZone || 'local',
        'pending',
        'pending'
      ]
    );
    const newOrderId = orderRes.rows[0].id;

    // 2. Lock and verify stock for each item
    for (const item of items) {
      if (!item.productId) continue;

      const productRes = await client.query('SELECT name, variants FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (productRes.rows.length === 0) {
        throw new Error(`Product ${item.name} not found.`);
      }

      const p = productRes.rows[0];
      let variants = [];
      try {
        variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []);
      } catch (e) {
        variants = [];
      }

      const variantIndex = variants.findIndex(v => v.color === item.color);
      if (variantIndex > -1) {
        const v = variants[variantIndex];
        
        if (typeof v.stock === 'object' && v.stock !== null && item.size) {
          const availableStock = v.stock[item.size] || 0;
          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for ${p.name} (${item.color} - ${item.size}). Available: ${availableStock}`);
          }
          v.stock[item.size] = availableStock - item.quantity;
        } else {
          const availableStock = Number(v.stock) || 0;
          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for ${p.name} (${item.color}). Available: ${availableStock}`);
          }
          v.stock = availableStock - item.quantity;
        }

        await client.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
      } else {
        console.warn(`Variant color ${item.color} not found for product ${p.name}`);
      }
    }

    // 3. Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: String(newOrderId),
    };

    const razorpayOrder = await razorpay.orders.create(options);

    await client.query('COMMIT');
    res.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      local_order_id: newOrderId
    });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Create Razorpay Order Failed:', err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Failed to create order.' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ── VERIFY RAZORPAY PAYMENT (Public) ────────────────────────────────────────
router.post('/verify-payment', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, local_order_id } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !local_order_id) {
    return res.status(400).json({ error: 'Missing required verification fields.' });
  }

  try {
    // Generate signature using HMAC-SHA256
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Transaction verification failed. Signature mismatch.' });
    }

    // Update local order to paid status
    const paymentInfo = {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    };

    await db.query(
      `UPDATE orders SET payment_status = $1, payment_info = $2 WHERE id = $3`,
      ['received', JSON.stringify(paymentInfo), local_order_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Verify Payment Failed:', err);
    res.status(500).json({ error: err.message || 'Failed to verify payment.' });
  }
});

// ── GET ALL ORDERS (Admin Only) ─────────────────────────────────────────────
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  const { limit, offset } = req.query;

  try {
    let sql = 'SELECT * FROM orders ORDER BY created_at DESC';
    const params = [];

    if (limit) {
      params.push(parseInt(limit));
      sql += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(parseInt(offset));
      sql += ` OFFSET $${params.length}`;
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
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PLACE ORDER (Public) ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { customer, delivery_address, payment_info, items, total, shippingZone } = req.body;

  if (!customer || !delivery_address || !items || !total) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }

  // Start Transaction
  const pgClient = db.pool;
  let client;
  
  try {
    client = await pgClient.connect();
    await client.query('BEGIN');

    // 1. Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (customer, delivery_address, payment_info, items, total, shipping_zone, payment_status, delivery_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        JSON.stringify(customer),
        JSON.stringify(delivery_address),
        JSON.stringify(payment_info),
        JSON.stringify(items),
        total,
        shippingZone || 'local',
        'pending',
        'pending'
      ]
    );
    const newOrderId = orderRes.rows[0].id;

    // 2. Lock and verify stock for each item
    for (const item of items) {
      if (!item.productId) continue;

      const productRes = await client.query('SELECT name, variants FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (productRes.rows.length === 0) {
        throw new Error(`Product ${item.name} not found.`);
      }

      const p = productRes.rows[0];
      let variants = [];
      try {
        variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []);
      } catch (e) {
        variants = [];
      }

      const variantIndex = variants.findIndex(v => v.color === item.color);
      if (variantIndex > -1) {
        const v = variants[variantIndex];
        
        if (typeof v.stock === 'object' && v.stock !== null && item.size) {
          const availableStock = v.stock[item.size] || 0;
          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for ${p.name} (${item.color} - ${item.size}). Available: ${availableStock}`);
          }
          v.stock[item.size] = availableStock - item.quantity;
        } else {
          // Fallback simple stock count
          const availableStock = Number(v.stock) || 0;
          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for ${p.name} (${item.color}). Available: ${availableStock}`);
          }
          v.stock = availableStock - item.quantity;
        }

        // Update database row
        await client.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
      } else {
        // If variant doesn't exist, we don't block ordering unless required, but let's warn
        console.warn(`Variant color ${item.color} not found for product ${p.name}`);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, id: newOrderId });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Order Placement Transaction Failed:', err);
    res.status(400).json({ error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ── UPDATE ORDER (Admin Only) ──────────────────────────────────────────────
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;

  const allowedFields = ['payment_status', 'delivery_status', 'tracking_id'];
  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field update.' });
  }

  // Validate status values
  if (field === 'delivery_status') {
    const validStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(value)) {
      return res.status(400).json({ error: `Invalid delivery status. Must be one of: ${validStatuses.join(', ')}` });
    }
  }

  try {
    await db.query(`UPDATE orders SET ${field} = $1 WHERE id = $2`, [value, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE ORDER (Admin Only) ──────────────────────────────────────────────
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM orders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
