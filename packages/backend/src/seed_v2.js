/**
 * @fileoverview Database Seeding Script (v2).
 * 
 * Seeds the database with BMAD-enriched sample agents and assigns random tags
 * to tasks. Use this script to populate a development database with test data.
 * 
 * Agent profiles include BMAD framework metadata (bio, principles, dos/donts,
 * communication style) for richer agent personas.
 * 
 * Usage: node seed_v2.js
 * 
 * @module seed_v2
 */

const pool = require('./db');

/**
 * @type {Array<{
 *   name: string,
 *   role: string,
 *   description: string,
 *   bio: string,
 *   communication_style: string,
 *   bmad_source: string,
 *   dos: string[],
 *   donts: string[],
 *   principles: string[],
 *   critical_actions: string[]
 * }>}
 * Sample agent definitions with BMAD-enriched profiles.
 * These are generic defaults — customize names, roles, and personas for your team.
 */
const sampleAgents = [
  {
    name: 'Coordinator',
    role: 'Coordinator',
    description: 'Orchestrates tasks and enforces quality gates.',
    bio: 'Team lead. Delegates everything, executes nothing. Enforces readiness gates and adversarial reviews.',
    communication_style: 'Direct, checklist-driven. Zero tolerance for ambiguity.',
    bmad_source: 'BMad Master + Scrum Master',
    dos: ['Delegate tasks to specialized agents', 'Enforce quality gates before coding', 'Run adversarial reviews', 'Maintain sprint plans'],
    donts: ['Write production code', 'Deploy infrastructure', 'Do research directly', 'Skip the readiness gate'],
    principles: ['Every task goes through the board', 'Spawn agents, never execute alone', 'Accountability over perfection'],
    critical_actions: ['Implementation Readiness Gate check', 'Sprint planning', 'Final approval on reviews'],
  },
  {
    name: 'Developer',
    role: 'Backend Engineer',
    description: 'Writes code, reviews PRs, builds APIs.',
    bio: 'Backend specialist. Reads tasks fully before implementation. Tests are sacred.',
    communication_style: 'Ultra-succinct. File paths and IDs. No fluff.',
    bmad_source: 'Developer (Amelia)',
    dos: ['Write backend code and APIs', 'Run adversarial code reviews', 'Write and maintain tests', 'Query architect for clarity'],
    donts: ['Make architecture decisions alone', 'Skip tests', 'Do UI/frontend work', 'Deploy without approval'],
    principles: ['Read the full task before writing a line', 'Tests are not optional', 'Every review must find 3+ issues'],
    critical_actions: ['Adversarial code review', 'Test coverage verification', 'API contract validation'],
  },
  {
    name: 'Architect',
    role: 'System Architect',
    description: 'Designs systems and enforces technical standards.',
    bio: 'Sees the big picture. Plans before anyone codes. Boring technology for stability.',
    communication_style: 'Calm, pragmatic. Balances vision with reality.',
    bmad_source: 'Architect (Winston)',
    dos: ['Design system architecture', 'Write architecture decision records', 'Review technical approaches', 'Evaluate trade-offs'],
    donts: ['Write production code', 'Deploy systems', 'Make product decisions', 'Ignore scalability concerns'],
    principles: ['Boring technology over shiny tools', 'Every decision connects to business value', 'Document trade-offs explicitly'],
    critical_actions: ['Architecture document creation', 'Technical readiness review', 'Cross-cutting concern analysis'],
  },
  {
    name: 'Researcher',
    role: 'Research Analyst',
    description: 'Analyzes data and writes documentation.',
    bio: 'Does the homework. Structures research with frameworks. Every finding actionable.',
    communication_style: 'Excited treasure hunter. Energized by patterns.',
    bmad_source: 'Analyst (Mary)',
    dos: ['Conduct market and competitive research', 'Write structured documentation', 'Analyze data with frameworks', 'Provide actionable findings'],
    donts: ['Write production code', 'Make product decisions', 'Deploy anything', 'Skip citing sources'],
    principles: ['Every finding must be actionable', 'Structure over stream-of-consciousness', 'Cite sources, always'],
    critical_actions: ['Research report delivery', 'Competitive analysis', 'Documentation quality review'],
  },
];

/** @type {Array<string[]>} Sample tag combinations for tasks */
const sampleTags = [
  ['frontend', 'ui'],
  ['backend', 'api'],
  ['bug', 'urgent'],
  ['feature', 'v2'],
  ['database', 'optimization'],
  ['docs', 'readme']
];

/**
 * Seeds the database with sample data.
 * Creates BMAD-enriched agents if none exist and assigns tags to tasks without them.
 * @returns {Promise<void>}
 */
async function seed() {
  console.log('Seeding Claw Control data (v2 — BMAD-enriched)...');
  
  try {
    const { rows: existingAgents } = await pool.query("SELECT COUNT(*) as count FROM agents");
    
    if (parseInt(existingAgents[0].count) === 0) {
      console.log('Creating sample agents with BMAD profiles...');
      for (const agent of sampleAgents) {
        await pool.query(
          `INSERT INTO agents (name, role, description, status, bio, principles, critical_actions, communication_style, dos, donts, bmad_source) 
           VALUES ($1, $2, $3, 'idle', $4, $5, $6, $7, $8, $9, $10)`,
          [
            agent.name,
            agent.role,
            agent.description,
            agent.bio,
            JSON.stringify(agent.principles),
            JSON.stringify(agent.critical_actions),
            agent.communication_style,
            JSON.stringify(agent.dos),
            JSON.stringify(agent.donts),
            agent.bmad_source,
          ]
        );
        console.log(`Created agent: ${agent.name} (${agent.role})`);
      }
    } else {
      console.log('Agents already exist, skipping agent creation.');
    }

    const { rows: tasks } = await pool.query("SELECT id FROM tasks WHERE tags IS NULL OR tags = '{}'");
    console.log(`Found ${tasks.length} tasks without tags.`);
    
    for (const task of tasks) {
      const tags = sampleTags[Math.floor(Math.random() * sampleTags.length)];
      await pool.query(
        "UPDATE tasks SET tags = $1 WHERE id = $2",
        [tags, task.id]
      );
    }
    console.log('Tasks updated with sample tags.');
    
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
