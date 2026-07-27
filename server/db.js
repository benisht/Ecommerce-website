const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('CRITICAL ERROR: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

// ── PostgreSQL Connection Pool ────────────────────────────────────────────────
// Uses the Supabase session-mode pooler (IPv4, port 6543) to avoid ENETUNREACH
// errors on Render's free tier which has no IPv6 routing.
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase / Render SSL
  },
  max: 10,                       // Max connections in pool
  idleTimeoutMillis: 30000,      // Close idle connections after 30s
  connectionTimeoutMillis: 10000 // Timeout connection attempt after 10s
});

// Log pool errors without crashing the server
pgPool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// ── Schema Auto-Initialization ────────────────────────────────────────────────
const initDb = async () => {
  const fs = require('fs');
  const path = require('path');
  try {
    await pgPool.query('SELECT 1');
    console.log('Database Status: Connected to Supabase PostgreSQL');

    // Run schema — all tables use IF NOT EXISTS, safe to run on every launch
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'server_schema.sql'), 'utf8');
    await pgPool.query(schemaSql);
    console.log('PostgreSQL schema verified and ready.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    // Don't exit — let individual request handlers surface errors
  }
};

initDb();

// ── Exported DB Interface ─────────────────────────────────────────────────────
module.exports = {
  // Expose pool for transaction-heavy routes (orders.js uses db.pool.connect())
  pool: pgPool,

  // Query wrapper with RETURNING id support for INSERTs
  query: async (text, params = []) => {
    let sql = text;
    const upperSql = sql.trim().toUpperCase();
    const isInsert = upperSql.startsWith('INSERT');

    // Automatically append RETURNING id for INSERT statements (except settings)
    if (
      isInsert &&
      !upperSql.includes('RETURNING') &&
      !/\bINTO\s+SETTINGS\b/i.test(sql)
    ) {
      sql += ' RETURNING id';
    }

    try {
      const res = await pgPool.query(sql, params);
      if (isInsert && res.rows && res.rows[0]) {
        res.lastID = res.rows[0].id;
      }
      return res;
    } catch (err) {
      console.error('PostgreSQL Query Error:', err.message, '\nSQL:', sql);
      throw err;
    }
  }
};
