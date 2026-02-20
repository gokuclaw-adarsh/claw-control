/**
 * @fileoverview V6 Migration - Adds last_heartbeat column to agents table.
 * @module migrations/v6_agent_heartbeat
 */

const dbAdapter = require('../db-adapter');

const pgUp = `ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP;`;

async function up() {
  console.log('Running V6 migration (agent heartbeat)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();
    try {
      db.prepare('SELECT last_heartbeat FROM agents LIMIT 1').get();
    } catch {
      db.prepare('ALTER TABLE agents ADD COLUMN last_heartbeat TEXT').run();
    }
  } else {
    await dbAdapter.query(pgUp);
  }

  console.log('V6 migration complete.');
}

module.exports = { up };
