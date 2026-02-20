/**
 * @fileoverview V6 Migration - Creates task_assignees table for multi-agent assignment.
 * @module migrations/v6_task_assignees
 */

const dbAdapter = require('../db-adapter');

const pgUp = `
CREATE TABLE IF NOT EXISTS task_assignees (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contributor',
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_agent ON task_assignees(agent_id);
`;

async function up() {
  console.log('Running V6 migration (task_assignees)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS task_assignees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'contributor',
          assigned_at TEXT DEFAULT (datetime('now')),
          UNIQUE(task_id, agent_id)
        );
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_task_assignees_agent ON task_assignees(agent_id);`);
      console.log('V6 SQLite migration completed.');
    } catch (err) {
      if (!err.message.includes('already exists')) throw err;
      console.log('V6 SQLite migration: table already exists, skipping.');
    }
  } else {
    await dbAdapter.query(pgUp);
    console.log('V6 PostgreSQL migration completed.');
  }
}

module.exports = { up };
