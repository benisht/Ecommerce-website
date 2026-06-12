const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpay;
const getRazorpayInstance = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys are not configured on the server.');
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// ── CREATE RAZORPAY ORDER (Public) ──────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const { customer, delivery_address, items, total, shippingZone } = req.body;

  if (!customer || !delivery_address || !items || !total) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }

  // Check Razorpay keys are configured
  try {
    getRazorpayInstance();
  } catch (keyErr) {
    return res.status(401).json({ error: keyErr.message });
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

    const razorpayOrder = await getRazorpayInstance().orders.create(options);

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
      `UPDATE orders SET payment_status = $1, payment_info = $2, delivery_status = $3 WHERE id = $4`,
      ['received', JSON.stringify(paymentInfo), 'confirmed', local_order_id]
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
    let sql = "SELECT * FROM orders WHERE payment_status = 'received' ORDER BY created_at DESC";
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

  const pgClient = db.pool;
  let client;

  try {
    client = await pgClient.connect();
    await client.query('BEGIN');

    // If updating delivery status, handle stock logic
    if (field === 'delivery_status') {
      const orderRes = await client.query('SELECT items, delivery_status FROM orders WHERE id = $1 FOR UPDATE', [id]);
      if (orderRes.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const order = orderRes.rows[0];
      const oldStatus = order.delivery_status;
      const newStatus = value;

      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

      if (oldStatus !== 'cancelled' && newStatus === 'cancelled') {
        // RESTORE STOCK
        for (const item of items) {
          if (!item.productId) continue;

          const productRes = await client.query('SELECT name, variants FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
          if (productRes.rows.length > 0) {
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
                v.stock[item.size] = availableStock + item.quantity;
              } else {
                const availableStock = Number(v.stock) || 0;
                v.stock = availableStock + item.quantity;
              }

              await client.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
            }
          }
        }
      } else if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
        // RE-DEDUCT STOCK (verify first)
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
                throw new Error(`Insufficient stock to revert cancellation for ${p.name} (${item.color} - ${item.size}). Available: ${availableStock}`);
              }
              v.stock[item.size] = availableStock - item.quantity;
            } else {
              const availableStock = Number(v.stock) || 0;
              if (availableStock < item.quantity) {
                throw new Error(`Insufficient stock to revert cancellation for ${p.name} (${item.color}). Available: ${availableStock}`);
              }
              v.stock = availableStock - item.quantity;
            }

            await client.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
          }
        }
      }
    }

    await client.query(`UPDATE orders SET ${field} = $1 WHERE id = $2`, [value, id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Update order error:', err);
    res.status(400).json({ error: err.message || 'Failed to update order.' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ── DELETE ORDER (Admin Only) ──────────────────────────────────────────────
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const pgClient = db.pool;
  let client;

  try {
    client = await pgClient.connect();
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT items, delivery_status FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length > 0) {
      const order = orderRes.rows[0];
      // Restore stock if deleting an active (non-cancelled) order
      if (order.delivery_status !== 'cancelled') {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        for (const item of items) {
          if (!item.productId) continue;

          const productRes = await client.query('SELECT name, variants FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
          if (productRes.rows.length > 0) {
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
                v.stock[item.size] = availableStock + item.quantity;
              } else {
                const availableStock = Number(v.stock) || 0;
                v.stock = availableStock + item.quantity;
              }

              await client.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
            }
          }
        }
      }
    }

    await client.query('DELETE FROM orders WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Delete order error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ── GET SINGLE ORDER FOR TRACKING (Public) ──────────────────────────────────
router.get('/track/:id', async (req, res) => {
  const { id } = req.params;
  
  // Clean order ID: remove any leading #
  const cleanId = id.replace('#', '').trim();
  if (isNaN(cleanId)) {
    return res.status(400).json({ error: 'Invalid Order ID format.' });
  }

  try {
    const result = await db.query(
      `SELECT id, customer, delivery_address, items, total, payment_status, delivery_status, tracking_id, created_at 
       FROM orders 
       WHERE id = $1`,
      [parseInt(cleanId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = result.rows[0];

    // Security: Only show paid/verified orders
    if (order.payment_status !== 'received') {
      return res.status(404).json({ error: 'Order not found or payment not verified.' });
    }

    // Format JSON fields
    const formattedOrder = {
      ...order,
      customer: typeof order.customer === 'string' ? JSON.parse(order.customer) : (order.customer || {}),
      delivery_address: typeof order.delivery_address === 'string' ? JSON.parse(order.delivery_address) : (order.delivery_address || {}),
      items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
    };

    res.json(formattedOrder);
  } catch (err) {
    console.error('Track order error:', err);
    res.status(500).json({ error: 'Failed to fetch order tracking status.' });
  }
});

// ── CANCEL PENDING ORDER (Public) ───────────────────────────────────────────
router.post('/cancel-pending', async (req, res) => {
  const { local_order_id } = req.body;

  if (!local_order_id) {
    return res.status(400).json({ error: 'Missing local order ID.' });
  }

  const pgClient = db.pool;
  let client;

  try {
    client = await pgClient.connect();
    await client.query('BEGIN');

    // 1. Fetch order details and verify payment_status
    const orderRes = await client.query('SELECT items, payment_status FROM orders WHERE id = $1 FOR UPDATE', [local_order_id]);
    if (orderRes.rows.length === 0) {
      throw new Error('Order not found.');
    }

    const order = orderRes.rows[0];

    // Only cancel/rollback if the order is still pending
    if (order.payment_status === 'pending') {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

      // 2. Restore stock for each item
      for (const item of items) {
        if (!item.productId) continue;

        const productRes = await client.query('SELECT name, variants FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
        if (productRes.rows.length > 0) {
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
              v.stock[item.size] = availableStock + item.quantity;
            } else {
              const availableStock = Number(v.stock) || 0;
              v.stock = availableStock + item.quantity;
            }

            await client.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
          }
        }
      }

      // 3. Delete the order
      await client.query('DELETE FROM orders WHERE id = $1', [local_order_id]);
      await client.query('COMMIT');
      res.json({ success: true, message: 'Pending order cancelled and stock restored.' });
    } else {
      await client.query('COMMIT');
      res.json({ success: false, message: 'Order is not pending. Cannot cancel.' });
    }

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Cancel Pending Order Failed:', err);
    res.status(500).json({ error: err.message || 'Failed to cancel pending order.' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ── AUTOMATIC CLEANUP OF OLD PENDING ORDERS ─────────────────────────────────
const cleanupOldPendingOrders = async () => {
  const pgClient = db.pool;
  let client;
  try {
    client = await pgClient.connect();
    
    // Find pending orders older than 15 minutes
    const oldOrdersRes = await client.query(
      `SELECT id, items FROM orders 
       WHERE payment_status = 'pending' 
       AND created_at < NOW() - INTERVAL '15 minutes'`
    );

    if (oldOrdersRes.rows.length === 0) {
      return;
    }

    console.log(`[Pending Order Cleanup] Found ${oldOrdersRes.rows.length} expired pending orders.`);

    for (const order of oldOrdersRes.rows) {
      await client.query('BEGIN');
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        
        // Restore stock
        for (const item of items) {
          if (!item.productId) continue;
          
          const productRes = await client.query('SELECT name, variants FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
          if (productRes.rows.length > 0) {
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
                v.stock[item.size] = availableStock + item.quantity;
              } else {
                const availableStock = Number(v.stock) || 0;
                v.stock = availableStock + item.quantity;
              }

              await client.query('UPDATE products SET variants = $1 WHERE id = $2', [JSON.stringify(variants), item.productId]);
            }
          }
        }

        // Delete the order
        await client.query('DELETE FROM orders WHERE id = $1', [order.id]);
        await client.query('COMMIT');
        console.log(`[Pending Order Cleanup] Order #${order.id} cancelled & stock restored.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Pending Order Cleanup] Failed to cleanup order #${order.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[Pending Order Cleanup] Error during query execution:', err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Start cleanup interval (every 5 minutes)
setInterval(cleanupOldPendingOrders, 5 * 60 * 1000);

// Run initial cleanup after 5 seconds to clear any stale data
setTimeout(cleanupOldPendingOrders, 5000);

module.exports = router;
