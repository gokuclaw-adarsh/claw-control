/**
 * @fileoverview V4 Migration - Adds task_comments table.
 * 
 * This migration creates the task_comments table for storing comments
 * on tasks with agent attribution.
 * 
 * Creates table:
 * - task_comments: id, task_id, agent_id, content, created_at
 * 
 * @module migrations/v4_task_comments
 */

const dbAdapter = require('../db-adapter');

/** PostgreSQL migration SQL */
const pgUp = `
-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for faster task comment lookups
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
`;

/**
 * Runs the V4 migration for both PostgreSQL and SQLite.
 * @returns {Promise<void>}
 */
async function up() {
  console.log('Running V4 migration (task_comments table)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    
    try {
      // Create task_comments table
      db.exec(`
        CREATE TABLE IF NOT EXISTS task_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          agent_id INTEGER,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      
      // Add index
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_task_comments_task_id 
        ON task_comments(task_id)
      `);
      
      console.log('V4 SQLite migration completed.');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
      console.log('V4 SQLite migration: table already exists, skipping.');
    }
  } else {
    await dbAdapter.query(pgUp);
    console.log('V4 PostgreSQL migration completed.');
  }
}

module.exports = { up };
