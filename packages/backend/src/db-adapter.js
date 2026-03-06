/**
 * @fileoverview Database Adapter - Unified interface for PostgreSQL and SQLite.
 * 
 * Auto-detects database type from DATABASE_URL environment variable:
 * - sqlite:./path/to/file.db → SQLite (better-sqlite3)
 * - postgresql://... → PostgreSQL (pg)
 * 
 * Provides a unified query interface that returns { rows: [...] } for compatibility.
 * 
 * @module db-adapter
 */

const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/claw_control';
const IS_SQLITE = DATABASE_URL.startsWith('sqlite:');

let db;
let dbType;

if (IS_SQLITE) {
  const Database = require('better-sqlite3');
  const dbPath = DATABASE_URL.replace('sqlite:', '');
  const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
  
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  db = new Database(absolutePath);
  db.pragma('journal_mode = WAL');
  dbType = 'sqlite';
  console.log(`Connected to SQLite database: ${absolutePath}`);
} else {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway') 
      ? { rejectUnauthorized: false } 
      : false
  });
  
  db.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });
  
  db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
  
  dbType = 'postgres';
}

/**
 * Converts PostgreSQL-style parameterized query ($1, $2) to SQLite style (?, ?).
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {object} Converted query and params
 */
function convertParams(query, params) {
  if (!IS_SQLITE) return { query, params };
  
  const convertedQuery = query.replace(/\$(\d+)/g, () => '?');
  return { query: convertedQuery, params };
}

/**
 * Converts PostgreSQL-specific SQL syntax to SQLite equivalents.
 * @param {string} query - SQL query string
 * @returns {string} Converted query
 */
function convertQuery(query) {
  if (!IS_SQLITE) return query;
  
  let converted = query;
  
  converted = converted.replace(/NOW\(\)/gi, "datetime('now')");
  converted = converted.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  converted = converted.replace(/TEXT\[\]/g, 'TEXT');
  converted = converted.replace(/DEFAULT '\{\}'/g, "DEFAULT '[]'");
  converted = converted.replace(/VARCHAR\(\d+\)/gi, 'TEXT');
  converted = converted.replace(/TIMESTAMP/gi, 'TEXT');
  
  return converted;
}

/**
 * Deserializes row data from SQLite (converts JSON strings to arrays for tags field).
 * @param {object} row - Database row object
 * @returns {object} Deserialized row
 */
function deserializeRow(row) {
  if (!row) return row;
  
  const deserialized = { ...row };
  
  if (typeof deserialized.tags === 'string') {
    try {
      deserialized.tags = JSON.parse(deserialized.tags);
    } catch {
      deserialized.tags = [];
    }
  }
  
  return deserialized;
}

/**
 * Executes a SQL query with unified interface.
 * Returns { rows: [...] } for compatibility with pg Pool.
 * @param {string} sql - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @returns {Promise<{rows: Array, changes?: number, lastInsertRowid?: number}>}
 */
async function query(sql, params = []) {
  const { query: convertedQuery, params: convertedParams } = convertParams(sql, params);
  const finalQuery = convertQuery(convertedQuery);
  
  if (IS_SQLITE) {
    try {
      const isSelect = finalQuery.trim().toUpperCase().startsWith('SELECT');
      const isReturning = finalQuery.toUpperCase().includes('RETURNING');
      
      if (isSelect) {
        const stmt = db.prepare(finalQuery);
        const rows = stmt.all(...convertedParams);
        return { rows: rows.map(row => deserializeRow(row)) };
      } else if (isReturning) {
        const stmt = db.prepare(finalQuery);
        const result = stmt.get(...convertedParams);
        return { rows: result ? [deserializeRow(result)] : [] };
      } else {
        const stmt = db.prepare(finalQuery);
        const info = stmt.run(...convertedParams);
        return { rows: [], changes: info.changes, lastInsertRowid: info.lastInsertRowid };
      }
    } catch (err) {
      console.error('SQLite query error:', err.message);
      console.error('Query:', finalQuery);
      console.error('Params:', convertedParams);
      throw err;
    }
  } else {
    const result = await db.query(sql, params);
    return result;
  }
}

/**
 * Runs migration SQL statements.
 * Handles splitting and converting PostgreSQL migrations for SQLite.
 * @param {string} sql - Migration SQL
 * @returns {Promise<void>}
 */
async function runMigration(sql) {
  if (IS_SQLITE) {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter(s => !s.startsWith('DO $$'));
    
    for (const stmt of statements) {
      const converted = convertQuery(stmt);
      if (converted.includes('information_schema') || converted.includes('ALTER TABLE')) {
        console.log('  Skipping PostgreSQL-specific statement');
        continue;
      }
      try {
        db.exec(converted);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error('Migration statement error:', err.message);
          console.error('Statement:', converted);
        }
      }
    }
  } else {
    await db.query(sql);
  }
}

/**
 * Closes the database connection.
 * @returns {Promise<void>}
 */
async function close() {
  if (IS_SQLITE) {
    db.close();
  } else {
    await db.end();
  }
}

/**
 * Returns the underlying database instance for advanced usage.
 * @returns {object} Database instance (better-sqlite3 Database or pg Pool)
 */
function getDb() {
  return db;
}

/**
 * Returns the current database type.
 * @returns {string} 'sqlite' or 'postgres'
 */
function getDbType() {
  return dbType;
}

/**
 * Checks if using SQLite database.
 * @returns {boolean} True if SQLite, false if PostgreSQL
 */
function isSQLite() {
  return IS_SQLITE;
}

/**
 * Begins a database transaction.
 * For SQLite: calls db.exec('BEGIN') — safe alongside prepared statements.
 * Runs a callback within a database transaction.
 * For PostgreSQL: acquires a dedicated client to ensure all queries use the same connection.
 * For SQLite: uses BEGIN/COMMIT/ROLLBACK on the single connection.
 * @param {function(queryFn): Promise<T>} callback - Receives a query function bound to the transaction
 * @returns {Promise<T>}
 */
async function withTransaction(callback) {
  if (IS_SQLITE) {
    db.exec('BEGIN');
    try {
      const result = await callback(query);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } else {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const txQuery = async (text, params) => {
        const result = await client.query(text, params);
        return { rows: result.rows };
      };
      const result = await callback(txQuery);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  query,
  runMigration,
  close,
  getDb,
  getDbType,
  isSQLite,
  withTransaction,
  pool: { query }
};
