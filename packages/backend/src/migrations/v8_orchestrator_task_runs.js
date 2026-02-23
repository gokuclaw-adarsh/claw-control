/**
 * @fileoverview V8 Migration - Adds orchestrator_task_runs table for per-task run idempotency.
 * @module migrations/v8_orchestrator_task_runs
 */

const dbAdapter = require('../db-adapter');

const pgUp = `
CREATE TABLE IF NOT EXISTS orchestrator_task_runs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  trigger TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'claimed',
  spawn_payload TEXT,
  spawn_response TEXT,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orch_runs_task_id ON orchestrator_task_runs(task_id);
`;

async function up() {
  console.log('Running V8 migration (orchestrator_task_runs table)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS orchestrator_task_runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          agent_id INTEGER,
          trigger TEXT,
          idempotency_key TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'claimed',
          spawn_payload TEXT,
          spawn_response TEXT,
          last_error TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          completed_at TEXT
        )
      `);
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orch_runs_idem ON orchestrator_task_runs(idempotency_key)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_orch_runs_task_id ON orchestrator_task_runs(task_id)');
      console.log('V8 SQLite migration completed.');
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('V8 SQLite migration: table already exists, skipping.');
    }
  } else {
    await dbAdapter.query(pgUp);
    console.log('V8 PostgreSQL migration completed.');
  }
}

module.exports = { up };
