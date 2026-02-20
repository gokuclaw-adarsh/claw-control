/**
 * @fileoverview V6 Migration - Adds human approval gate columns to tasks.
 * 
 * Adds columns:
 * - requires_approval (BOOLEAN default false)
 * - approved_at (TIMESTAMP nullable)
 * - approved_by (TEXT nullable)
 * 
 * @module migrations/v6_approval_gates
 */

const dbAdapter = require('../db-adapter');

async function up() {
  console.log('Running V6 migration (approval gates)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    const cols = ['requires_approval', 'approved_at', 'approved_by'];
    
    // Check which columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const existing = new Set(tableInfo.map(c => c.name));

    if (!existing.has('requires_approval')) {
      db.exec("ALTER TABLE tasks ADD COLUMN requires_approval INTEGER DEFAULT 0");
    }
    if (!existing.has('approved_at')) {
      db.exec("ALTER TABLE tasks ADD COLUMN approved_at TEXT");
    }
    if (!existing.has('approved_by')) {
      db.exec("ALTER TABLE tasks ADD COLUMN approved_by TEXT");
    }
    console.log('V6 SQLite migration completed.');
  } else {
    await dbAdapter.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by TEXT;
    `);
    console.log('V6 PostgreSQL migration completed.');
  }
}

module.exports = { up };
