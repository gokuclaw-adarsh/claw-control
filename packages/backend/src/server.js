/**
 * @fileoverview Claw Control API Server.
 * 
 * This module defines all REST API endpoints for the Claw Control dashboard,
 * including tasks, agents, messages, and real-time SSE streaming. It supports
 * both PostgreSQL and SQLite backends via the db-adapter.
 * 
 * @module server
 */

const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const dbAdapter = require('./db-adapter');
const { loadAgentsConfig, getConfigPath, CONFIG_PATHS } = require('./config-loader');
const { dispatchWebhook, reloadWebhooks, getWebhooks, SUPPORTED_EVENTS } = require('./webhook');

/**
 * Generates parameterized query placeholder based on database type.
 * @param {number} index - 1-based parameter index
 * @returns {string} Placeholder string ('?' for SQLite, '$n' for Postgres)
 */
const param = (index) => dbAdapter.isSQLite() ? '?' : `$${index}`;

/** @type {import('http').ServerResponse[]} Active SSE client connections */
let clients = [];

fastify.register(cors, { origin: '*' });

/**
 * Broadcasts an event to all connected SSE clients.
 * @param {string} event - Event name
 * @param {object} data - Data payload to send
 */
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

// ============ TASKS API ============

/**
 * GET /api/tasks - Retrieve all tasks with optional filters.
 * @param {object} request.query - Query parameters
 * @param {string} [request.query.status] - Filter by task status
 * @param {string} [request.query.agent_id] - Filter by assigned agent
 * @returns {Array<object>} Array of task objects
 */
fastify.get('/api/tasks', async (request, reply) => {
  const { status, agent_id } = request.query;
  let query = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`status = ${param(params.length)}`);
  }
  if (agent_id) {
    params.push(agent_id);
    conditions.push(`agent_id = ${param(params.length)}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const { rows } = await dbAdapter.query(query, params);
  return rows;
});

/**
 * GET /api/stats - Retrieve dashboard statistics.
 * @returns {object} Stats object with activeAgents and tasksInQueue counts
 */
fastify.get('/api/stats', async (request, reply) => {
  const { rows: agentStats } = await dbAdapter.query(
    "SELECT COUNT(*) as count FROM agents WHERE status = 'working'"
  );
  
  const { rows: taskStats } = await dbAdapter.query(
    "SELECT COUNT(*) as count FROM tasks WHERE status IN ('backlog', 'todo')"
  );

  return {
    activeAgents: parseInt(agentStats[0].count),
    tasksInQueue: parseInt(taskStats[0].count)
  };
});

/**
 * POST /api/tasks - Create a new task.
 * @param {object} request.body - Task data
 * @param {string} request.body.title - Task title (required)
 * @param {string} [request.body.description] - Task description
 * @param {string} [request.body.status='backlog'] - Initial status
 * @param {string[]} [request.body.tags=[]] - Task tags
 * @param {number} [request.body.agent_id] - Assigned agent ID
 * @returns {object} Created task object
 */
fastify.post('/api/tasks', async (request, reply) => {
  const { title, description, status = 'backlog', tags = [], agent_id } = request.body;
  
  if (!title) {
    return reply.status(400).send({ error: 'Title is required' });
  }

  const tagsValue = dbAdapter.isSQLite() ? JSON.stringify(tags) : tags;

  const { rows } = await dbAdapter.query(
    `INSERT INTO tasks (title, description, status, tags, agent_id) 
     VALUES (${param(1)}, ${param(2)}, ${param(3)}, ${param(4)}, ${param(5)}) 
     RETURNING *`,
    [title, description || null, status, tagsValue, agent_id || null]
  );

  const task = rows[0];
  broadcast('task-created', task);
  dispatchWebhook('task-created', task);
  return reply.status(201).send(task);
});

/**
 * PUT /api/tasks/:id - Update an existing task.
 * @param {object} request.params - URL parameters
 * @param {string} request.params.id - Task ID
 * @param {object} request.body - Fields to update
 * @returns {object} Updated task object
 */
fastify.put('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params;
  const { title, description, status, tags, agent_id } = request.body;

  const tagsValue = tags !== undefined && dbAdapter.isSQLite() ? JSON.stringify(tags) : tags;
  const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';

  const { rows } = await dbAdapter.query(
    `UPDATE tasks 
     SET title = COALESCE(${param(1)}, title),
         description = COALESCE(${param(2)}, description),
         status = COALESCE(${param(3)}, status),
         tags = COALESCE(${param(4)}, tags),
         agent_id = COALESCE(${param(5)}, agent_id),
         updated_at = ${nowFn}
     WHERE id = ${param(6)}
     RETURNING *`,
    [title, description, status, tagsValue, agent_id, id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  const task = rows[0];
  broadcast('task-updated', task);
  dispatchWebhook('task-updated', task);
  return task;
});

/**
 * DELETE /api/tasks/:id - Delete a task.
 * @param {object} request.params - URL parameters
 * @param {string} request.params.id - Task ID
 * @returns {object} Success response with deleted task
 */
fastify.delete('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params;

  const { rows } = await dbAdapter.query(
    `DELETE FROM tasks WHERE id = ${param(1)} RETURNING *`,
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  broadcast('task-deleted', { id: parseInt(id) });
  return { success: true, deleted: rows[0] };
});

/** @type {Record<string, string|null>} Status progression map for task workflow */
const STATUS_PROGRESSION = {
  'backlog': 'todo',
  'todo': 'in_progress',
  'in_progress': 'review',
  'review': 'completed',
  'completed': null
};

/**
 * POST /api/tasks/:id/progress - Advance task to next status in workflow.
 * @param {object} request.params - URL parameters
 * @param {string} request.params.id - Task ID
 * @returns {object} Progress result with previous and new status
 */
fastify.post('/api/tasks/:id/progress', async (request, reply) => {
  const { id } = request.params;
  const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';

  const { rows: current } = await dbAdapter.query(
    `SELECT * FROM tasks WHERE id = ${param(1)}`,
    [id]
  );

  if (current.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  const task = current[0];
  const nextStatus = STATUS_PROGRESSION[task.status];

  if (!nextStatus) {
    return reply.status(400).send({ 
      error: 'Task already completed',
      task 
    });
  }

  const { rows } = await dbAdapter.query(
    `UPDATE tasks 
     SET status = ${param(1)}, updated_at = ${nowFn}
     WHERE id = ${param(2)}
     RETURNING *`,
    [nextStatus, id]
  );

  const updatedTask = rows[0];
  broadcast('task-updated', updatedTask);
  dispatchWebhook('task-updated', updatedTask);
  
  return {
    success: true,
    previousStatus: task.status,
    newStatus: nextStatus,
    task: updatedTask
  };
});

/**
 * POST /api/tasks/:id/complete - Mark task as completed directly.
 * @param {object} request.params - URL parameters
 * @param {string} request.params.id - Task ID
 * @returns {object} Success response with completed task
 */
fastify.post('/api/tasks/:id/complete', async (request, reply) => {
  const { id } = request.params;
  const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';

  const { rows } = await dbAdapter.query(
    `UPDATE tasks 
     SET status = 'completed', updated_at = ${nowFn}
     WHERE id = ${param(1)}
     RETURNING *`,
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  const task = rows[0];
  broadcast('task-updated', task);
  dispatchWebhook('task-updated', task);
  
  return { success: true, task };
});

// ============ AGENTS API ============

/** @type {string[]} Valid agent status values */
const VALID_AGENT_STATUSES = ['idle', 'working', 'error', 'offline'];

/**
 * Validates agent input data.
 * @param {object} data - Agent data to validate
 * @param {boolean} [isUpdate=false] - Whether this is an update operation
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
function validateAgentInput(data, isUpdate = false) {
  const { name, status } = data;
  
  // Name validation (required for create, optional for update)
  if (!isUpdate && !name) {
    return { valid: false, error: 'Name is required' };
  }
  
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return { valid: false, error: 'Name must be a non-empty string' };
    }
    if (name.length > 100) {
      return { valid: false, error: 'Name must be 100 characters or less' };
    }
  }
  
  // Status validation
  if (status !== undefined && !VALID_AGENT_STATUSES.includes(status)) {
    return { valid: false, error: `Status must be one of: ${VALID_AGENT_STATUSES.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * @openapi
 * /api/agents:
 *   get:
 *     summary: List all agents
 *     tags: [Agents]
 *     responses:
 *       200:
 *         description: List of all agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 */
fastify.get('/api/agents', async (request, reply) => {
  const { rows } = await dbAdapter.query('SELECT * FROM agents ORDER BY created_at');
  return { success: true, data: rows };
});

/**
 * @openapi
 * /api/agents/{id}:
 *   get:
 *     summary: Get a single agent by ID
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       404:
 *         description: Agent not found
 */
fastify.get('/api/agents/:id', async (request, reply) => {
  const { id } = request.params;

  const { rows } = await dbAdapter.query(
    `SELECT * FROM agents WHERE id = ${param(1)}`,
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ success: false, error: 'Agent not found' });
  }

  return { success: true, data: rows[0] };
});

/**
 * @openapi
 * /api/agents:
 *   post:
 *     summary: Create a new agent
 *     tags: [Agents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Agent name (required, max 100 chars)
 *               description:
 *                 type: string
 *                 description: Agent description
 *               role:
 *                 type: string
 *                 default: Agent
 *                 description: Agent role
 *               status:
 *                 type: string
 *                 enum: [idle, working, error, offline]
 *                 default: idle
 *                 description: Agent status
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Invalid input
 */
fastify.post('/api/agents', async (request, reply) => {
  const { name, description, role = 'Agent', status = 'idle' } = request.body;

  const validation = validateAgentInput({ name, status });
  if (!validation.valid) {
    return reply.status(400).send({ success: false, error: validation.error });
  }

  const { rows } = await dbAdapter.query(
    `INSERT INTO agents (name, description, role, status) 
     VALUES (${param(1)}, ${param(2)}, ${param(3)}, ${param(4)}) 
     RETURNING *`,
    [name.trim(), description || null, role, status]
  );

  const agent = rows[0];
  broadcast('agent-created', agent);
  return reply.status(201).send({ success: true, data: agent });
});

/**
 * @openapi
 * /api/agents/{id}:
 *   put:
 *     summary: Update an existing agent
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [idle, working, error, offline]
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Agent not found
 */
fastify.put('/api/agents/:id', async (request, reply) => {
  const { id } = request.params;
  const { name, description, role, status } = request.body;

  const validation = validateAgentInput({ name, status }, true);
  if (!validation.valid) {
    return reply.status(400).send({ success: false, error: validation.error });
  }

  // Get old status before update to detect changes
  let oldStatus = null;
  if (status !== undefined) {
    const { rows: oldAgent } = await dbAdapter.query(
      `SELECT status FROM agents WHERE id = ${param(1)}`,
      [id]
    );
    if (oldAgent.length > 0) {
      oldStatus = oldAgent[0].status;
    }
  }

  const trimmedName = name !== undefined ? name.trim() : undefined;

  const { rows } = await dbAdapter.query(
    `UPDATE agents 
     SET name = COALESCE(${param(1)}, name),
         description = COALESCE(${param(2)}, description),
         role = COALESCE(${param(3)}, role),
         status = COALESCE(${param(4)}, status)
     WHERE id = ${param(5)}
     RETURNING *`,
    [trimmedName, description, role, status, id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ success: false, error: 'Agent not found' });
  }

  const agent = rows[0];
  broadcast('agent-updated', agent);
  
  // Fire webhook if status actually changed
  if (status !== undefined && oldStatus !== null && oldStatus !== agent.status) {
    dispatchWebhook('agent-status-changed', {
      agent,
      previousStatus: oldStatus,
      newStatus: agent.status
    });
  }
  
  return { success: true, data: agent };
});

/**
 * @openapi
 * /api/agents/{id}/status:
 *   patch:
 *     summary: Quick status update for an agent
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [idle, working, error, offline]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Agent not found
 */
fastify.patch('/api/agents/:id/status', async (request, reply) => {
  const { id } = request.params;
  const { status } = request.body;

  if (!status) {
    return reply.status(400).send({ success: false, error: 'Status is required' });
  }

  if (!VALID_AGENT_STATUSES.includes(status)) {
    return reply.status(400).send({ 
      success: false, 
      error: `Status must be one of: ${VALID_AGENT_STATUSES.join(', ')}` 
    });
  }

  // Get old status before update
  const { rows: oldAgent } = await dbAdapter.query(
    `SELECT status FROM agents WHERE id = ${param(1)}`,
    [id]
  );

  if (oldAgent.length === 0) {
    return reply.status(404).send({ success: false, error: 'Agent not found' });
  }

  const oldStatus = oldAgent[0].status;

  const { rows } = await dbAdapter.query(
    `UPDATE agents SET status = ${param(1)} WHERE id = ${param(2)} RETURNING *`,
    [status, id]
  );

  const agent = rows[0];
  broadcast('agent-updated', agent);
  
  // Fire webhook if status actually changed
  if (oldStatus !== agent.status) {
    dispatchWebhook('agent-status-changed', {
      agent,
      previousStatus: oldStatus,
      newStatus: agent.status
    });
  }
  
  return { success: true, data: agent };
});

/**
 * @openapi
 * /api/agents/{id}:
 *   delete:
 *     summary: Delete an agent
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 */
fastify.delete('/api/agents/:id', async (request, reply) => {
  const { id } = request.params;

  const { rows } = await dbAdapter.query(
    `DELETE FROM agents WHERE id = ${param(1)} RETURNING *`,
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ success: false, error: 'Agent not found' });
  }

  broadcast('agent-deleted', { id: parseInt(id) });
  return { success: true, data: { deleted: rows[0] } };
});

// ============ MESSAGES API ============

/**
 * GET /api/messages - Retrieve agent messages with optional filters.
 * @param {object} request.query - Query parameters
 * @param {string} [request.query.agent_id] - Filter by agent ID
 * @param {number} [request.query.limit=50] - Maximum messages to return
 * @returns {Array<object>} Array of message objects
 */
fastify.get('/api/messages', async (request, reply) => {
  const { agent_id, limit = 50 } = request.query;
  
  let query = 'SELECT m.*, a.name as agent_name FROM agent_messages m LEFT JOIN agents a ON m.agent_id = a.id';
  const params = [];

  if (agent_id) {
    params.push(agent_id);
    query += ` WHERE m.agent_id = ${param(params.length)}`;
  }
  
  params.push(parseInt(limit));
  query += ` ORDER BY m.created_at DESC LIMIT ${param(params.length)}`;

  const { rows } = await dbAdapter.query(query, params);
  return rows;
});

/**
 * POST /api/messages - Create a new message.
 * @param {object} request.body - Message data
 * @param {number} [request.body.agent_id] - Agent ID (optional)
 * @param {string} request.body.message - Message content (required)
 * @returns {object} Created message object
 */
fastify.post('/api/messages', async (request, reply) => {
  const { agent_id, message } = request.body;

  if (!message) {
    return reply.status(400).send({ error: 'Message is required' });
  }

  const { rows } = await dbAdapter.query(
    `INSERT INTO agent_messages (agent_id, message) 
     VALUES (${param(1)}, ${param(2)}) 
     RETURNING *`,
    [agent_id || null, message]
  );

  const msg = rows[0];
  broadcast('message-created', msg);
  dispatchWebhook('message-created', msg);
  return reply.status(201).send(msg);
});

// ============ BOARD API ============

/**
 * GET /api/board - Get tasks in Kanban board format.
 * @returns {object} Board data with columns grouped by status
 */
fastify.get('/api/board', async (request, reply) => {
  const { rows } = await dbAdapter.query('SELECT * FROM tasks ORDER BY created_at');
  
  const columns = [
    { title: 'Backlog', status: 'backlog', cards: [] },
    { title: 'To Do', status: 'todo', cards: [] },
    { title: 'In Progress', status: 'in_progress', cards: [] },
    { title: 'In Review', status: 'review', cards: [] },
    { title: 'Completed', status: 'completed', cards: [] }
  ];

  rows.forEach(task => {
    const column = columns.find(c => c.status === task.status);
    if (column) {
      column.cards.push({
        id: task.id,
        text: task.title,
        description: task.description,
        status: task.status,
        agent_id: task.agent_id
      });
    }
  });

  return { columns };
});

// ============ SSE STREAM ============

/**
 * Simulates work progress by advancing a random task (demo mode only).
 * @returns {Promise<object|null>} Updated task or null if no tasks to progress
 */
async function simulateWorkProgress() {
  try {
    const { rows: tasks } = await dbAdapter.query(
      `SELECT * FROM tasks WHERE status != 'completed' ORDER BY RANDOM() LIMIT 1`
    );

    if (tasks.length === 0) {
      fastify.log.info('Demo: No tasks to progress');
      return null;
    }

    const task = tasks[0];
    const nextStatus = STATUS_PROGRESSION[task.status];

    if (nextStatus) {
      const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
      const { rows } = await dbAdapter.query(
        `UPDATE tasks 
         SET status = ${param(1)}, updated_at = ${nowFn}
         WHERE id = ${param(2)}
         RETURNING *`,
        [nextStatus, task.id]
      );

      const updatedTask = rows[0];
      broadcast('task-updated', updatedTask);
      fastify.log.info(`Demo: Task "${task.title}" progressed: ${task.status} → ${nextStatus}`);
      return updatedTask;
    }
  } catch (err) {
    fastify.log.error(err, 'Demo simulation error');
  }
  return null;
}

/**
 * GET /api/stream - Server-Sent Events endpoint for real-time updates.
 * @param {object} request.query - Query parameters
 * @param {string} [request.query.demo='false'] - Enable demo mode auto-progression
 */
fastify.get('/api/stream', (req, res) => {
  const demoMode = req.query.demo === 'true';
  
  res.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  clients.push(res.raw);
  fastify.log.info(`Client connected${demoMode ? ' (DEMO MODE)' : ''}. Total: ${clients.length}`);

  // Send initial data
  Promise.all([
    dbAdapter.query('SELECT * FROM tasks ORDER BY created_at'),
    dbAdapter.query('SELECT * FROM agents ORDER BY created_at')
  ]).then(([tasksResult, agentsResult]) => {
    res.raw.write(`event: init\ndata: ${JSON.stringify({
      tasks: tasksResult.rows,
      agents: agentsResult.rows,
      demoMode
    })}\n\n`);
  });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.raw.write(`:heartbeat\n\n`);
  }, 30000);

  // Demo mode: simulate work by progressing random tasks
  let demoInterval = null;
  if (demoMode) {
    const runDemo = () => {
      simulateWorkProgress();
      const nextInterval = Math.floor(Math.random() * 5000) + 3000;
      demoInterval = setTimeout(runDemo, nextInterval);
    };
    demoInterval = setTimeout(runDemo, 2000);
    res.raw.write(`event: demo-started\ndata: ${JSON.stringify({ message: 'Demo mode active - tasks will auto-progress' })}\n\n`);
  }

  req.raw.on('close', () => {
    clearInterval(heartbeat);
    if (demoInterval) {
      clearTimeout(demoInterval);
      fastify.log.info('Demo mode stopped');
    }
    clients = clients.filter(c => c !== res.raw);
    fastify.log.info(`Client disconnected. Total: ${clients.length}`);
  });
});

// ============ HEALTH CHECK ============

/**
 * GET /health - Health check endpoint.
 * @returns {object} Health status with database connection info
 */
fastify.get('/health', async (request, reply) => {
  try {
    await dbAdapter.query('SELECT 1');
    return { status: 'healthy', database: 'connected', type: dbAdapter.getDbType() };
  } catch (err) {
    return reply.status(500).send({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// ============ CONFIG API ============

/**
 * POST /api/config/reload - Reload agents from YAML configuration.
 * @param {object} request.body - Request body
 * @param {boolean} [request.body.force=false] - Clear existing agents before reload
 * @returns {object} Reload result with created/skipped counts
 */
fastify.post('/api/config/reload', async (request, reply) => {
  const { force = false } = request.body || {};
  
  try {
    const agents = loadAgentsConfig();
    const configPath = getConfigPath();
    
    if (force) {
      await dbAdapter.query('DELETE FROM agents');
      fastify.log.info('Cleared existing agents (force mode)');
    }
    
    const { rows: existing } = await dbAdapter.query('SELECT name FROM agents');
    const existingNames = new Set(existing.map(a => a.name));
    
    let created = 0;
    let skipped = 0;
    
    for (const agent of agents) {
      if (existingNames.has(agent.name) && !force) {
        skipped++;
        continue;
      }
      
      if (dbAdapter.isSQLite()) {
        await dbAdapter.query(
          `INSERT OR REPLACE INTO agents (name, description, role, status) 
           VALUES (?, ?, ?, ?)`,
          [agent.name, agent.description, agent.role, agent.status]
        );
      } else {
        await dbAdapter.query(
          `INSERT INTO agents (name, description, role, status) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (name) DO UPDATE SET
             description = EXCLUDED.description,
             role = EXCLUDED.role`,
          [agent.name, agent.description, agent.role, agent.status]
        );
      }
      created++;
    }
    
    const { rows: updatedAgents } = await dbAdapter.query('SELECT * FROM agents ORDER BY created_at');
    broadcast('agents-reloaded', { agents: updatedAgents });
    
    return {
      success: true,
      message: `Config reloaded from ${configPath || 'defaults'}`,
      configPath,
      created,
      skipped,
      total: updatedAgents.length,
      agents: updatedAgents
    };
    
  } catch (err) {
    fastify.log.error(err, 'Config reload error');
    return reply.status(500).send({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * GET /api/config/status - Get configuration file status.
 * @returns {object} Config status with path and search locations
 */
fastify.get('/api/config/status', async (request, reply) => {
  const configPath = getConfigPath();
  
  return {
    configPath,
    configFound: !!configPath,
    searchedPaths: CONFIG_PATHS
  };
});

// ============ WEBHOOKS API ============

/**
 * GET /api/webhooks - Get webhook configuration status.
 * @returns {object} Webhook config with enabled webhooks and supported events
 */
fastify.get('/api/webhooks', async (request, reply) => {
  const webhooks = getWebhooks();
  
  return {
    success: true,
    webhooksEnabled: webhooks.length,
    supportedEvents: SUPPORTED_EVENTS,
    webhooks: webhooks.map(wh => ({
      url: wh.url,
      events: wh.events,
      hasSecret: !!wh.secret
    }))
  };
});

/**
 * POST /api/webhooks/reload - Reload webhook configuration from disk.
 * @returns {object} Reload result with updated webhook count
 */
fastify.post('/api/webhooks/reload', async (request, reply) => {
  const webhooks = reloadWebhooks();
  
  return {
    success: true,
    message: 'Webhook configuration reloaded',
    webhooksEnabled: webhooks.length
  };
});

// ============ AUTO-SEED ============

/**
 * Seeds agents from YAML config if database is empty.
 * @returns {Promise<void>}
 */
async function seedAgentsFromConfig() {
  try {
    const { rows } = await dbAdapter.query('SELECT COUNT(*) as count FROM agents');
    const count = parseInt(rows[0].count);
    
    if (count === 0) {
      fastify.log.info('No agents found in database. Seeding from config...');
      const agents = loadAgentsConfig();
      
      for (const agent of agents) {
        await dbAdapter.query(
          `INSERT INTO agents (name, description, role, status) 
           VALUES (${param(1)}, ${param(2)}, ${param(3)}, ${param(4)})`,
          [agent.name, agent.description, agent.role, agent.status]
        );
        fastify.log.info(`Created agent: ${agent.name} (${agent.role})`);
      }
      
      fastify.log.info(`Seeded ${agents.length} agents from config`);
    } else {
      fastify.log.info(`Found ${count} existing agents. Skipping seed.`);
    }
  } catch (err) {
    fastify.log.error(err, 'Agent seeding error');
  }
}

/**
 * Starts the Fastify server.
 * Verifies database connection, seeds agents if needed, and listens on configured port.
 * @returns {Promise<void>}
 */
const start = async () => {
  try {
    const PORT = process.env.PORT || 3001;
    
    await dbAdapter.query('SELECT 1');
    fastify.log.info(`Database connection verified (${dbAdapter.getDbType()})`);
    
    await seedAgentsFromConfig();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

module.exports = { start };
