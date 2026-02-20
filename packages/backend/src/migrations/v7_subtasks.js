/**
 * @fileoverview V7 Migration - Adds subtasks table.
 * @module migrations/v7_subtasks
 */

const dbAdapter = require('../db-adapter');

const pgUp = `
CREATE TABLE IF NOT EXISTS subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
`;

async function up() {
  console.log('Running V7 migration (subtasks table)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS subtasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'todo',
          agent_id INTEGER,
          position INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)`);
      console.log('V7 SQLite migration completed.');
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('V7 SQLite migration: table already exists, skipping.');
    }
  } else {
    await dbAdapter.query(pgUp);
    console.log('V7 PostgreSQL migration completed.');
  }
}

module.exports = { up };
