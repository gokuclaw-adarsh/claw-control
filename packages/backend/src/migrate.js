/**
 * @fileoverview Database Migration Script.
 * 
 * Creates the required database schema for Claw Control. Supports both
 * PostgreSQL and SQLite databases. Run this script to initialize or
 * update the database schema.
 * 
 * Usage: node migrate.js
 * 
 * @module migrate
 */

const fs = require('fs');
const path = require('path');
const dbAdapter = require('./db-adapter');
const v3Migration = require('./migrations/v3_mentions_profiles');

/** PostgreSQL schema migration SQL */
const pgMigration = `
-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'idle',
  role TEXT DEFAULT 'Agent',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index on agent name
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name ON agents(name);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'backlog',
  tags TEXT[] DEFAULT '{}',
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create agent_messages table
CREATE TABLE IF NOT EXISTS agent_messages (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON agent_messages(created_at DESC);

-- Add role column to agents if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='role') THEN 
        ALTER TABLE agents ADD COLUMN role TEXT DEFAULT 'Agent'; 
    END IF; 
END $$;

-- Add tags column to tasks if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='tags') THEN 
        ALTER TABLE tasks ADD COLUMN tags TEXT[] DEFAULT '{}'; 
    END IF; 
END $$;
`;

/**
 * Runs the database migration.
 * Detects database type and applies appropriate schema.
 * @returns {Promise<void>}
 */
async function migrate() {
  const dbType = dbAdapter.getDbType();
  console.log(`Running database migration (${dbType})...`);
  
  try {
    if (dbAdapter.isSQLite()) {
      const schemaPath = path.join(__dirname, 'sqlite-schema.sql');
      const sqliteSchema = fs.readFileSync(schemaPath, 'utf8');
      
      const db = dbAdapter.getDb();
      try {
        db.exec(sqliteSchema);
        console.log('SQLite schema created successfully!');
      } catch (err) {
        console.log('Trying statement-by-statement execution...');
        const statements = sqliteSchema
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const stmt of statements) {
          try {
            db.exec(stmt + ';');
          } catch (stmtErr) {
            if (!stmtErr.message.includes('already exists')) {
              console.warn(`  Warning: ${stmtErr.message}`);
            }
          }
        }
      }
      console.log('SQLite migration completed successfully!');
    } else {
      await dbAdapter.query(pgMigration);
      console.log('PostgreSQL migration completed successfully!');
    }
    
    // Run incremental migrations
    await v3Migration.up();
    console.log('V3 migration (mentions & profiles) applied.');

    const { rows } = await dbAdapter.query('SELECT COUNT(*) as count FROM agents');
    const count = parseInt(rows[0].count);
    
    if (count === 0) {
      console.log('Creating default agent...');
      if (dbAdapter.isSQLite()) {
        await dbAdapter.query(
          "INSERT INTO agents (name, description, status) VALUES (?, ?, ?)",
          ['Main Agent', 'Primary mission control agent', 'idle']
        );
      } else {
        await dbAdapter.query(
          "INSERT INTO agents (name, description, status) VALUES ($1, $2, $3)",
          ['Main Agent', 'Primary mission control agent', 'idle']
        );
      }
      console.log('Default agent created.');
    }
    
    await dbAdapter.close();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
