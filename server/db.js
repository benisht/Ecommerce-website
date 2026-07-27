const { Pool } = require('pg');
require('dotenv').config();

let useSqlite = false;
let sqliteDb = null;
let sqliteInitPromise = null;

let pgPool = null;
if (process.env.DATABASE_URL) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  console.warn("DATABASE_URL environment variable is missing. Will use SQLite fallback.");
  useSqlite = true;
}

function isPgQuotaOrConnectionError(err) {
  if (!err) return false;
  const msg = err.message || '';
  const code = err.code || '';
  return (
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'XX000' ||
    msg.includes('quota') ||
    msg.includes('exceeded') ||
    msg.includes('compute time') ||
    msg.includes('Database not reachable') ||
    msg.includes('connection') ||
    msg.includes('DATABASE_URL is missing')
  );
}

const ensureSqlite = () => {
  if (!sqliteDb) {
    const path = require('path');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'lookwalk.db');
    sqliteDb = new sqlite3.Database(dbPath);
  }
};

const executeSqliteQuery = (db, sqlText, params = []) => {
  return new Promise((resolve, reject) => {
    let sql = sqlText;
    // Translate SQL
    // 1. Convert $1, $2... to ?
    sql = sql.replace(/\$(\d+)/g, '?');
    // 2. Strip FOR UPDATE
    sql = sql.replace(/\bFOR UPDATE\b/gi, '');
    // 3. Strip RETURNING clause
    sql = sql.replace(/\bRETURNING\s+\w+(\s*,\s*\w+)*\b/gi, '');
    sql = sql.replace(/\bRETURNING\s+\*\b/gi, '');
    // 4. Translate NOW() - INTERVAL 'X units' to SQLite equivalent
    sql = sql.replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s+(\w+)'/gi, "datetime('now', '-$1 $2')");

    const upperSql = sql.trim().toUpperCase();
    const isSelect = upperSql.startsWith('SELECT');
    const isInsert = upperSql.startsWith('INSERT');

    if (isSelect) {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], rowCount: (rows || []).length });
      });
    } else if (isInsert) {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({
          rows: [{ id: this.lastID }],
          rowCount: this.changes,
          lastID: this.lastID
        });
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({
          rows: [],
          rowCount: this.changes
        });
      });
    }
  });
};

const ensureSqliteInitialized = async () => {
  if (!sqliteDb) {
    ensureSqlite();
  }
  if (!sqliteInitPromise) {
    sqliteInitPromise = (async () => {
      // Initialize SQLite tables
      const fs = require('fs');
      const path = require('path');
      const schemaSqlPath = path.resolve(__dirname, 'server_schema.sql');
      let schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');

      // Convert schema to SQLite syntax
      schemaSql = schemaSql.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
      schemaSql = schemaSql.replace(/JSONB/gi, 'TEXT');

      await new Promise((resolve, reject) => {
        sqliteDb.exec(schemaSql, (err) => {
          if (err) {
            console.error('SQLite Schema Init Error:', err);
            reject(err);
          } else {
            console.log('SQLite Schema Initialized.');
            resolve();
          }
        });
      });

      // Seed default admin and categories in SQLite if empty
      try {
        const userCountRes = await executeSqliteQuery(sqliteDb, 'SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(userCountRes.rows[0].count);
        if (userCount === 0) {
          const bcrypt = require('bcrypt');
          const adminPasswordRaw = 'admin123';
          const hashedPassword = await bcrypt.hash(adminPasswordRaw, 10);
          await executeSqliteQuery(
            sqliteDb,
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'admin']
          );
          console.log('SQLite Default Admin Seeded.');
        }
      } catch (err) {
        console.error('Error seeding SQLite admin:', err);
      }

      try {
        const catCountRes = await executeSqliteQuery(sqliteDb, 'SELECT COUNT(*) as count FROM categories');
        const catCount = parseInt(catCountRes.rows[0].count);
        if (catCount === 0) {
          const defaultCats = ['Hoodies', 'Watches', 'Glasses', 'Shirts'];
          for (const catName of defaultCats) {
            await executeSqliteQuery(
              sqliteDb,
              'INSERT INTO categories (name) VALUES (?)',
              [catName]
            );
          }
          console.log('SQLite Default Categories Seeded.');
        }
      } catch (err) {
        console.error('Error seeding SQLite categories:', err);
      }
    })();
  }
  await sqliteInitPromise;
};

// Auto-initialize PostgreSQL tables on launch or fallback to SQLite
const initDb = async () => {
  try {
    if (!pgPool) {
      throw new Error("DATABASE_URL is missing.");
    }
    await pgPool.query('SELECT 1');
    console.log("Database Status: Connected to Centralized PostgreSQL");
    const fs = require('fs');
    const path = require('path');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'server_schema.sql'), 'utf8');
    await pgPool.query(schemaSql);
    console.log("PostgreSQL Centralized Database initialized and ready.");
  } catch (err) {
    if (isPgQuotaOrConnectionError(err)) {
      console.warn("PostgreSQL is not available or quota exceeded. Switching to SQLite fallback.");
      useSqlite = true;
      await ensureSqliteInitialized();
    } else {
      console.error("Database initialization error:", err);
    }
  }
};

initDb();

class SqliteClient {
  constructor(db) {
    this.db = db;
  }
  async query(text, params = []) {
    return executeSqliteQuery(this.db, text, params);
  }
  release() {
    // No-op for SQLite
  }
}

const poolWrapper = {
  connect: async () => {
    if (useSqlite || !pgPool) {
      useSqlite = true;
      await ensureSqliteInitialized();
      return new SqliteClient(sqliteDb);
    }
    try {
      const client = await pgPool.connect();
      const originalQuery = client.query;
      client.query = async function(text, params = []) {
        try {
          return await originalQuery.call(client, text, params);
        } catch (err) {
          if (isPgQuotaOrConnectionError(err)) {
            console.warn("PostgreSQL query failed. Switching to SQLite fallback.");
            useSqlite = true;
            await ensureSqliteInitialized();
            return executeSqliteQuery(sqliteDb, text, params);
          }
          throw err;
        }
      };
      return client;
    } catch (err) {
      if (isPgQuotaOrConnectionError(err)) {
        console.warn("PostgreSQL connection failed. Switching to SQLite fallback.");
        useSqlite = true;
        await ensureSqliteInitialized();
        return new SqliteClient(sqliteDb);
      }
      throw err;
    }
  },
  query: async (text, params = []) => {
    return module.exports.query(text, params);
  }
};

module.exports = {
  pool: poolWrapper,
  query: async (text, params = []) => {
    let sql = text;
    const upperSql = sql.trim().toUpperCase();
    const isInsert = upperSql.startsWith('INSERT');

    if (useSqlite || !pgPool) {
      useSqlite = true;
      await ensureSqliteInitialized();
      return executeSqliteQuery(sqliteDb, sql, params);
    }

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
      if (isPgQuotaOrConnectionError(err)) {
        console.warn("PostgreSQL query failed. Switching to SQLite fallback.");
        useSqlite = true;
        await ensureSqliteInitialized();
        return executeSqliteQuery(sqliteDb, text, params);
      }
      if (err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND')) {
        console.warn('Database not reachable, returning empty result for query:', sql);
        return { rows: [], rowCount: 0 };
      }
      console.error('Postgres Query Execution Error:', err, '\nSQL:', sql);
      throw err;
    }
  },
};
