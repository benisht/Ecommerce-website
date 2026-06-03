const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('CRITICAL ERROR: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log("Database Status: Using Centralized PostgreSQL");

// Auto-initialize PostgreSQL tables on launch
const initPostgres = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'server_schema.sql'), 'utf8');
    await pgPool.query(schemaSql);
    console.log("PostgreSQL Centralized Database initialized and ready.");
  } catch (err) {
    console.error("PostgreSQL Initialization Error:", err);
  }
};

initPostgres();

module.exports = {
  pool: pgPool,
  query: async (text, params = []) => {
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
  },
};
