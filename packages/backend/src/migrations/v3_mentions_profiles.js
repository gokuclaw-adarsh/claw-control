/**
 * @fileoverview V3 Migration - Adds @mention support and agent profile fields.
 *
 * This migration adds:
 * - mentioned_agent_ids column to agent_messages (for @mention tracking)
 * - Profile fields to agents: bio, principles, critical_actions,
 *   communication_style, dos, donts, bmad_source
 *
 * Supports both PostgreSQL and SQLite via the db-adapter.
 *
 * @module migrations/v3_mentions_profiles
 */

const dbAdapter = require('../db-adapter');

/** PostgreSQL migration SQL */
const pgUp = `
-- Add mentioned_agent_ids to agent_messages (integer array)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agent_messages' AND column_name = 'mentioned_agent_ids'
    ) THEN
        ALTER TABLE agent_messages ADD COLUMN mentioned_agent_ids INTEGER[] DEFAULT '{}';
    END IF;
END $$;

-- Add profile fields to agents
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='bio') THEN
        ALTER TABLE agents ADD COLUMN bio TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='principles') THEN
        ALTER TABLE agents ADD COLUMN principles TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='critical_actions') THEN
        ALTER TABLE agents ADD COLUMN critical_actions TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='communication_style') THEN
        ALTER TABLE agents ADD COLUMN communication_style TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='dos') THEN
        ALTER TABLE agents ADD COLUMN dos TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='donts') THEN
        ALTER TABLE agents ADD COLUMN donts TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='bmad_source') THEN
        ALTER TABLE agents ADD COLUMN bmad_source TEXT;
    END IF;
END $$;

-- Index for mention lookups
CREATE INDEX IF NOT EXISTS idx_messages_mentions ON agent_messages USING GIN (mentioned_agent_ids);
`;

/**
 * Runs the V3 migration for both PostgreSQL and SQLite.
 * @returns {Promise<void>}
 */
async function up() {
  console.log('Running V3 migration (mentions & agent profiles)...');

  if (dbAdapter.isSQLite()) {
    const db = dbAdapter.getDb();

    // Helper: add column if it doesn't exist
    const addCol = (table, col, type, dflt) => {
      try {
        const suffix = dflt !== undefined ? ` DEFAULT ${dflt}` : '';
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}${suffix}`);
      } catch (err) {
        if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
          throw err;
        }
      }
    };

    // agent_messages: mentioned_agent_ids stored as JSON text
    addCol('agent_messages', 'mentioned_agent_ids', 'TEXT', "'[]'");

    // agents: profile fields
    addCol('agents', 'bio', 'TEXT');
    addCol('agents', 'principles', 'TEXT');
    addCol('agents', 'critical_actions', 'TEXT');
    addCol('agents', 'communication_style', 'TEXT');
    addCol('agents', 'dos', 'TEXT');
    addCol('agents', 'donts', 'TEXT');
    addCol('agents', 'bmad_source', 'TEXT');

    console.log('V3 SQLite migration completed.');
  } else {
    await dbAdapter.query(pgUp);
    console.log('V3 PostgreSQL migration completed.');
  }
}

module.exports = { up };
