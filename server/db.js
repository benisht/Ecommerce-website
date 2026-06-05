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
    // Ensure RETURNING id for inserts
    if (isInsert && !upperSql.includes('RETURNING') && !/\bINTO\s+SETTINGS\b/i.test(sql)) {
      sql += ' RETURNING id';
    }
    try {
      const res = await pgPool.query(sql, params);
      if (isInsert && res.rows && res.rows[0]) {
        res.lastID = res.rows[0].id;
      }
      return res;
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND')) {
        console.warn('Database not reachable, returning empty result for query:', sql);
        return { rows: [], rowCount: 0 };
      }
      console.error('Postgres Query Execution Error:', err, '\nSQL:', sql);
      throw err;
    }
  },
};
