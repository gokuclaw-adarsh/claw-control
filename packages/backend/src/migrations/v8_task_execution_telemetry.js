/**
 * @fileoverview V8 Migration - Adds per-task execution telemetry fields.
 * @module migrations/v8_task_execution_telemetry
 */

const dbAdapter = require('../db-adapter');

const pgUp = `
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spawn_session_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spawn_run_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_step TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_heartbeat_decision TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
`;

async function ensureSQLiteColumn(db, name, sqlType) {
  const row = db.prepare(`PRAGMA table_info(tasks)`).all().find(col => col.name === name);
  if (!row) {
    db.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${sqlType}`);
  }
}

async function up() {
  console.log('Running V8 migration (task execution telemetry)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    await ensureSQLiteColumn(db, 'spawn_session_id', 'TEXT');
    await ensureSQLiteColumn(db, 'spawn_run_id', 'TEXT');
    await ensureSQLiteColumn(db, 'current_step', 'TEXT');
    await ensureSQLiteColumn(db, 'last_heartbeat_decision', 'TEXT');
    await ensureSQLiteColumn(db, 'failure_reason', 'TEXT');
    await ensureSQLiteColumn(db, 'retry_count', 'INTEGER NOT NULL DEFAULT 0');
    console.log('V8 SQLite migration completed.');
  } else {
    await dbAdapter.query(pgUp);
    console.log('V8 PostgreSQL migration completed.');
  }
}

module.exports = { up };
