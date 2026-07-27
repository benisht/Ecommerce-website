const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ── GET ALL PRODUCTS (Public) ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { limit, offset, search, category, featured, sort } = req.query;

  try {
    let sql = 'SELECT * FROM products';
    const params = [];
    const conditions = [];

    if (category && category !== 'All' && category !== 'Discounts') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    } else if (category === 'Discounts') {
      conditions.push(`discount_percent > 0`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`);
    }

    if (featured === 'true') {
      conditions.push(`featured = TRUE`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    if (sort === 'price_asc') {
      sql += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY price DESC';
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    // Pagination
    if (limit) {
      params.push(parseInt(limit));
      sql += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(parseInt(offset));
      sql += ` OFFSET $${params.length}`;
    }

    const result = await db.query(sql, params);
    
    // Parse jsonb columns for safety (sometimes pg returns them as strings if driver isn't parsing them, but usually it returns objects)
    const products = result.rows.map(p => ({
      ...p,
      sizes: typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []),
      variants: typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []),
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
      in_stock: Boolean(p.in_stock)
    }));

    // Prevent browser caching so product updates reflect immediately
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(products);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET SINGLE PRODUCT (Public) ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = result.rows[0];
    product.sizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : (product.sizes || []);
    product.variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : (product.variants || []);
    product.images = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
    product.in_stock = Boolean(product.in_stock);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(product);
  } catch (err) {
    console.error('Fetch product by ID error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── ADD PRODUCT (Admin Only) ────────────────────────────────────────────────
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { name, price, category, image, images, description, in_stock, sizes, variants, discount_percent, featured } = req.body;
  
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO products (name, price, category, image, images, description, in_stock, sizes, variants, discount_percent, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        name,
        price,
        category,
        image,
        JSON.stringify(images || []),
        description,
        in_stock ? 1 : 0,
        JSON.stringify(sizes || []),
        JSON.stringify(variants || []),
        discount_percent || 0,
        Boolean(featured)
      ]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE PRODUCT (Admin Only) ─────────────────────────────────────────────
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, category, image, images, description, in_stock, sizes, variants, discount_percent, featured } = req.body;

  try {
    await db.query(
      `UPDATE products SET name = $1, price = $2, category = $3, image = $4, images = $5,
       description = $6, in_stock = $7, sizes = $8, variants = $9, discount_percent = $10, featured = $11
       WHERE id = $12`,
      [
        name,
        price,
        category,
        image,
        JSON.stringify(images || []),
        description,
        in_stock ? 1 : 0,
        JSON.stringify(sizes || []),
        JSON.stringify(variants || []),
        discount_percent || 0,
        Boolean(featured),
        id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE PRODUCT (Admin Only) ─────────────────────────────────────────────
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
