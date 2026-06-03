const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── SECURITY MIDDLEWARE ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading base64 images and external cross-origin images
}));

// CORS Configuration
const corsOptions = {
  origin: '*', // Allows all origins, but can be restricted in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  message: { error: 'Too many requests from this IP. Please try again later.' }
});
app.use('/api/', generalLimiter);

// Parse JSON and form-urlencoded requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected (PostgreSQL)' });
  } catch (err) {
    console.error('Health Check Error:', err);
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

// ── DYNAMIC SITEMAP GENERATION ──────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  res.header('Content-Type', 'application/xml');
  try {
    const productsRes = await db.query('SELECT id FROM products');
    // Change this base URL in production if needed
    const baseUrl = process.env.FRONTEND_URL || 'https://lookwalk.vercel.app';
    const urls = [
      `${baseUrl}/`,
      `${baseUrl}/products`,
      `${baseUrl}/about`,
      `${baseUrl}/contact`,
      `${baseUrl}/track-order`
    ];
    
    productsRes.rows.forEach(p => {
      urls.push(`${baseUrl}/products/${p.id}`);
    });
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url}</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '  </url>\n';
    });
    xml += '</urlset>';
    res.send(xml);
  } catch (err) {
    console.error('Sitemap Error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// ── MOUNT ROUTES ───────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const contactRoutes = require('./routes/contacts');
const settingRoutes = require('./routes/settings');
const categoryRoutes = require('./routes/categories');

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // limit each IP to 20 attempts
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/categories', categoryRoutes);

// ── GLOBAL ERROR HANDLER ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please contact support.' 
      : err.message
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
