/**
 * @fileoverview V5 Migration - Adds context, attachments, and deliverable fields to tasks table.
 * 
 * This migration adds:
 * - context: TEXT field for storing task context/notes
 * - attachments: JSONB array field for storing attachment URLs
 * - deliverable_type: TEXT field (document/spec/code/review)
 * - deliverable_content: TEXT field for deliverable content
 * 
 * @module migrations/v5_task_context
 */

const dbAdapter = require('../db-adapter');

/** PostgreSQL migration SQL */
const pgUp = `
-- Add context, attachments, and deliverable columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS context TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverable_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverable_content TEXT;
`;

/**
 * Runs the V5 migration for both PostgreSQL and SQLite.
 * @returns {Promise<void>}
 */
async function up() {
  console.log('Running V5 migration (context, attachments & deliverable fields)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    
    const columns = [
      { sql: 'ALTER TABLE tasks ADD COLUMN context TEXT', name: 'context' },
      { sql: "ALTER TABLE tasks ADD COLUMN attachments TEXT DEFAULT '[]'", name: 'attachments' },
      { sql: 'ALTER TABLE tasks ADD COLUMN deliverable_type TEXT', name: 'deliverable_type' },
      { sql: 'ALTER TABLE tasks ADD COLUMN deliverable_content TEXT', name: 'deliverable_content' },
    ];
    
    for (const col of columns) {
      try {
        db.exec(col.sql);
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
          throw err;
        }
      }
    }
    console.log('V5 SQLite migration completed.');
  } else {
    await dbAdapter.query(pgUp);
    console.log('V5 PostgreSQL migration completed.');
  }
}

module.exports = { up };
