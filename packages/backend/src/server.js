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
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');
const dbAdapter = require('./db-adapter');
const { loadAgentsConfig, getConfigPath, CONFIG_PATHS } = require('./config-loader');
const { dispatchWebhook, reloadWebhooks, getWebhooks, SUPPORTED_EVENTS } = require('./webhook');
const { withAuth, isAuthEnabled } = require('./auth');
const v3Migration = require('./migrations/v3_mentions_profiles');
const v4Migration = require('./migrations/v4_task_comments');
const v5Migration = require('./migrations/v5_task_context');
const v6HeartbeatMigration = require('./migrations/v6_agent_heartbeat');
const v6ApprovalMigration = require('./migrations/v6_approval_gates');
const v6AssigneesMigration = require('./migrations/v6_task_assignees');
const packageJson = require('../package.json');

/**
 * Generates parameterized query placeholder based on database type.
 * @param {number} index - 1-based parameter index
 * @returns {string} Placeholder string ('?' for SQLite, '$n' for Postgres)
 */
const param = (index) => dbAdapter.isSQLite() ? '?' : `$${index}`;

/** @type {import('http').ServerResponse[]} Active SSE client connections */
let clients = [];

fastify.register(cors, { origin: '*' });

// OpenAPI/Swagger Documentation
fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Claw Control API',
      description: 'Kanban for AI Agents',
      version: packageJson.version
    },
    servers: [
      { url: '/', description: 'Current server' }
    ],
    tags: [
      { name: 'Tasks', description: 'Task management endpoints' },
      { name: 'Agents', description: 'Agent management endpoints' },
      { name: 'Messages', description: 'Agent message endpoints' },
      { name: 'Config', description: 'Configuration management endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Webhooks', description: 'Webhook management endpoints' },
      { name: 'Board', description: 'Kanban board endpoints' },
      { name: 'Stream', description: 'Real-time SSE streaming' },
      { name: 'Health', description: 'Health check endpoints' }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'API key for write operations'
        }
      }
    }
  }
});

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  }
});

// Register shared schemas for $ref usage in route schemas
fastify.addSchema({
  $id: 'Task',
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Unique task identifier' },
    title: { type: 'string', description: 'Task title' },
    description: { type: 'string', nullable: true, description: 'Task description' },
    context: { type: 'string', nullable: true, description: 'Task context/notes' },
    attachments: { type: 'array', items: { type: 'string' }, description: 'Task attachment URLs' },
    status: { 
      type: 'string', 
      enum: ['backlog', 'todo', 'in_progress', 'review', 'completed'],
      description: 'Task status' 
    },
    agent_id: { type: 'integer', nullable: true, description: 'Assigned agent ID' },
    tags: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'Task tags' 
    },
    requires_approval: { type: 'boolean', description: 'Whether task requires human approval before starting' },
    approved_at: { type: 'string', format: 'date-time', nullable: true, description: 'When task was approved' },
    approved_by: { type: 'string', nullable: true, description: 'Who approved the task' },
    created_at: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
    updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
  }
});

fastify.addSchema({
  $id: 'Agent',
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Unique agent identifier' },
    name: { type: 'string', description: 'Agent name' },
    description: { type: 'string', nullable: true, description: 'Agent description' },
    role: { type: 'string', description: 'Agent role' },
    avatar: { type: 'string', nullable: true, description: 'Agent avatar URL' },
    status: { 
      type: 'string', 
      enum: ['idle', 'working', 'error', 'offline'],
      description: 'Agent status' 
    },
    created_at: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
    bio: { type: 'string', nullable: true, description: 'Agent biography' },
    principles: { type: 'string', nullable: true, description: 'Core operating principles (JSON array)' },
    critical_actions: { type: 'string', nullable: true, description: 'Critical actions this agent takes (JSON array)' },
    dos: { type: 'string', nullable: true, description: 'What this agent does (JSON array)' },
    donts: { type: 'string', nullable: true, description: 'What this agent does NOT do (JSON array)' },
    communication_style: { type: 'string', nullable: true, description: 'How this agent communicates' },
    bmad_source: { type: 'string', nullable: true, description: 'BMAD methodology source role' }
  }
});

fastify.addSchema({
  $id: 'Message',
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Unique message identifier' },
    agent_id: { type: 'integer', nullable: true, description: 'Agent ID who sent the message' },
    message: { type: 'string', description: 'Message content' },
    agent_name: { type: 'string', nullable: true, description: 'Agent name (joined)' },
    created_at: { type: 'string', format: 'date-time', description: 'Message timestamp' }
  }
});

fastify.addSchema({
  $id: 'Comment',
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Unique comment identifier' },
    task_id: { type: 'integer', description: 'Task ID this comment belongs to' },
    agent_id: { type: 'integer', nullable: true, description: 'Agent ID who created the comment' },
    agent_name: { type: 'string', nullable: true, description: 'Agent name (joined)' },
    content: { type: 'string', description: 'Comment content' },
    created_at: { type: 'string', format: 'date-time', description: 'Comment timestamp' }
  }
});

fastify.addSchema({
  $id: 'Error',
  type: 'object',
  properties: {
    error: { type: 'string', description: 'Error message' },
    success: { type: 'boolean', description: 'Success flag (false for errors)' }
  }
});

/**
 * Broadcasts an event to all connected SSE clients.
 * @param {string} event - Event name
 * @param {object} data - Data payload to send
 */
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

// Register all API routes as a plugin for Swagger to detect them
fastify.register(async function routes(fastify) {

// ============ TASKS API ============

/**
 * GET /api/tasks - Retrieve all tasks with optional filters.
 * @param {object} request.query - Query parameters
 * @param {string} [request.query.status] - Filter by task status
 * @param {string} [request.query.agent_id] - Filter by assigned agent
 * @returns {Array<object>} Array of task objects
 */
fastify.get('/api/tasks', {
  schema: {
    description: 'Retrieve all tasks with optional filters and pagination',
    tags: ['Tasks'],
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'completed'] },
        agent_id: { type: 'integer' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum number of tasks to return' },
        offset: { type: 'integer', minimum: 0, description: 'Number of tasks to skip' }
      }
    },
    response: {
      200: {
        type: 'array',
        items: { $ref: 'Task#' }
      }
    }
  }
}, async (request, reply) => {
  const { status, agent_id, limit, offset } = request.query;
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

  // Add pagination if limit is specified
  if (limit) {
    params.push(limit);
    query += ` LIMIT ${param(params.length)}`;
    if (offset) {
      params.push(offset);
      query += ` OFFSET ${param(params.length)}`;
    }
  }

  const { rows } = await dbAdapter.query(query, params);
  return rows;
});

/**
 * GET /api/stats - Retrieve dashboard statistics.
 * @returns {object} Stats object with activeAgents and tasksInQueue counts
 */
fastify.get('/api/stats', {
  schema: {
    description: 'Retrieve dashboard statistics',
    tags: ['Tasks'],
    response: {
      200: {
        type: 'object',
        properties: {
          activeAgents: { type: 'integer', description: 'Number of agents currently working' },
          tasksInQueue: { type: 'integer', description: 'Tasks in backlog or todo status' }
        }
      }
    }
  }
}, async (request, reply) => {
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
fastify.post('/api/tasks', {
  ...withAuth,
  schema: {
    description: 'Create a new task',
    tags: ['Tasks'],
    security: [{ apiKey: [] }],
    body: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        description: { type: 'string', description: 'Task description' },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'completed'], default: 'backlog' },
        tags: { type: 'array', items: { type: 'string' }, default: [] },
        agent_id: { type: 'integer', description: 'Assigned agent ID' }
      }
    },
    response: {
      201: { $ref: 'Task#' },
      400: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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
fastify.put('/api/tasks/:id', {
  ...withAuth,
  schema: {
    description: 'Update an existing task',
    tags: ['Tasks'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Task ID' }
      }
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        context: { type: 'string' },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'completed'] },
        tags: { type: 'array', items: { type: 'string' } },
        agent_id: { type: 'integer' },
        deliverable_type: { type: 'string', enum: ['document', 'spec', 'code', 'review', 'design', 'other'], description: 'Type of deliverable' },
        deliverable_content: { type: 'string', description: 'Deliverable content (URL, text, etc.)' }
      }
    },
    response: {
      200: { $ref: 'Task#' },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;
  const { title, description, context, status, tags, agent_id, deliverable_type, deliverable_content } = request.body;

  // Validation: task cannot move to "review" without a deliverable
  if (status === 'review') {
    // Check if deliverable is being set in this request OR already exists on the task
    const hasDeliverableInRequest = deliverable_type && deliverable_content;
    if (!hasDeliverableInRequest) {
      // Check existing task for deliverable
      const { rows: existing } = await dbAdapter.query(
        `SELECT deliverable_type, deliverable_content FROM tasks WHERE id = ${param(1)}`,
        [id]
      );
      if (existing.length > 0) {
        const task = existing[0];
        if (!task.deliverable_type || !task.deliverable_content) {
          return reply.status(400).send({ error: 'Task cannot move to review without a deliverable. Please add a deliverable_type and deliverable_content.' });
        }
      }
    }
  }

  const tagsValue = tags !== undefined && dbAdapter.isSQLite() ? JSON.stringify(tags) : tags;
  const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';

  const { rows } = await dbAdapter.query(
    `UPDATE tasks 
     SET title = COALESCE(${param(1)}, title),
         description = COALESCE(${param(2)}, description),
         context = COALESCE(${param(3)}, context),
         status = COALESCE(${param(4)}, status),
         tags = COALESCE(${param(5)}, tags),
         agent_id = COALESCE(${param(6)}, agent_id),
         deliverable_type = COALESCE(${param(7)}, deliverable_type),
         deliverable_content = COALESCE(${param(8)}, deliverable_content),
         updated_at = ${nowFn}
     WHERE id = ${param(9)}
     RETURNING *`,
    [title, description, context, status, tagsValue, agent_id, deliverable_type, deliverable_content, id]
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
fastify.delete('/api/tasks/:id', {
  ...withAuth,
  schema: {
    description: 'Delete a task',
    tags: ['Tasks'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Task ID' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          deleted: { $ref: 'Task#' }
        }
      },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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

/**
 * GET /api/tasks/:id - Retrieve a single task by ID with comments count.
 * @param {object} request.params - URL parameters
 * @param {string} request.params.id - Task ID
 * @returns {object} Task object with comments_count
 */
fastify.get('/api/tasks/:id', {
  schema: {
    description: 'Retrieve a single task by ID with comments count',
    tags: ['Tasks'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Task ID' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          context: { type: 'string', nullable: true },
          attachments: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
          agent_id: { type: 'integer', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          comments_count: { type: 'integer', description: 'Number of comments on this task' }
        }
      },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;

  const { rows } = await dbAdapter.query(
    `SELECT t.*, 
            (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comments_count
     FROM tasks t 
     WHERE t.id = ${param(1)}`,
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  return rows[0];
});

/**
 * GET /api/tasks/:id/comments - Retrieve comments for a task.
 * @param {object} request.params - URL parameters
 * @param {string} request.params.id - Task ID
 * @returns {Array<object>} Array of comment objects
 */
fastify.get('/api/tasks/:id/comments', {
  schema: {
    description: 'Retrieve comments for a task',
    tags: ['Tasks'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Task ID' }
      }
    },
    response: {
      200: {
        type: 'array',
        items: { $ref: 'Comment#' }
      }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;

  const { rows } = await dbAdapter.query(
    `SELECT tc.*, a.name as agent_name 
     FROM task_comments tc 
     LEFT JOIN agents a ON tc.agent_id = a.id 
     WHERE tc.task_id = ${param(1)} 
     ORDER BY tc.created_at DESC`,
    [id]
  );

  return rows;
});

/**
 * POST /api/tasks/:id/comments - Create a new comment on a task.
 * @param {object} request.params - URL parameters
 * @param {string} request.params.id - Task ID
 * @param {object} request.body - Comment data
 * @param {string} request.body.content - Comment content (required)
 * @param {number} [request.body.agent_id] - Agent ID (optional, auto-detected if not provided)
 * @returns {object} Created comment object
 */
fastify.post('/api/tasks/:id/comments', {
  ...withAuth,
  schema: {
    description: 'Create a new comment on a task',
    tags: ['Tasks'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Task ID' }
      }
    },
    body: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', description: 'Comment content (required)' },
        agent_id: { type: 'integer', description: 'Agent ID (optional, auto-detected)' }
      }
    },
    response: {
      201: { $ref: 'Comment#' },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;
  const { content, agent_id } = request.body;

  if (!content || !content.trim()) {
    return reply.status(400).send({ error: 'Comment content is required' });
  }

  // Verify task exists
  const { rows: taskRows } = await dbAdapter.query(
    `SELECT id FROM tasks WHERE id = ${param(1)}`,
    [id]
  );

  if (taskRows.length === 0) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  // Determine agent_id - use provided one or default to 1 (system agent)
  const finalAgentId = agent_id || 1;

  const { rows } = await dbAdapter.query(
    `INSERT INTO task_comments (task_id, agent_id, content) 
     VALUES (${param(1)}, ${param(2)}, ${param(3)}) 
     RETURNING *`,
    [id, finalAgentId, content.trim()]
  );

  // Get agent name for response
  const { rows: agentRows } = await dbAdapter.query(
    `SELECT name FROM agents WHERE id = ${param(1)}`,
    [finalAgentId]
  );

  const comment = rows[0];
  if (agentRows.length > 0) {
    comment.agent_name = agentRows[0].name;
  }

  broadcast('comment-created', { task_id: parseInt(id), comment });
  return reply.status(201).send(comment);
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
fastify.post('/api/tasks/:id/progress', {
  ...withAuth,
  schema: {
    description: 'Advance task to next status in workflow',
    tags: ['Tasks'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Task ID' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          previousStatus: { type: 'string' },
          newStatus: { type: 'string' },
          task: { $ref: 'Task#' }
        }
      },
      400: { $ref: 'Error#' },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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
fastify.post('/api/tasks/:id/complete', {
  ...withAuth,
  schema: {
    description: 'Mark task as completed directly',
    tags: ['Tasks'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Task ID' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          task: { $ref: 'Task#' }
        }
      },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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
 * GET /api/agents - List all agents
 */
fastify.get('/api/agents', {
  schema: {
    description: 'List all agents',
    tags: ['Agents'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: 'Agent#' } }
        }
      }
    }
  }
}, async (request, reply) => {
  const { rows } = await dbAdapter.query('SELECT * FROM agents ORDER BY created_at');
  
  // Compute liveness based on last_heartbeat (30min threshold)
  const now = Date.now();
  const THIRTY_MIN = 30 * 60 * 1000;
  const data = rows.map(agent => {
    let liveness = 'offline';
    if (agent.last_heartbeat) {
      const hbTime = new Date(agent.last_heartbeat).getTime();
      const elapsed = now - hbTime;
      if (elapsed < THIRTY_MIN) {
        liveness = 'online';
      } else if (elapsed < THIRTY_MIN * 2) {
        liveness = 'stale';
      }
    }
    return { ...agent, liveness };
  });
  
  return { success: true, data };
});

/**
 * GET /api/agents/:id - Get a single agent by ID
 */
fastify.get('/api/agents/:id', {
  schema: {
    description: 'Get a single agent by ID',
    tags: ['Agents'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Agent ID' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: 'Agent#' }
        }
      },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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
 * POST /api/agents - Create a new agent
 */
fastify.post('/api/agents', {
  ...withAuth,
  schema: {
    description: 'Create a new agent',
    tags: ['Agents'],
    security: [{ apiKey: [] }],
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', maxLength: 100, description: 'Agent name (required, max 100 chars)' },
        description: { type: 'string', description: 'Agent description' },
        role: { type: 'string', default: 'Agent', description: 'Agent role' },
        status: { type: 'string', enum: ['idle', 'working', 'error', 'offline'], default: 'idle', description: 'Agent status' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: 'Agent#' }
        }
      },
      400: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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
 * PUT /api/agents/:id - Update an existing agent
 */
fastify.put('/api/agents/:id', {
  ...withAuth,
  schema: {
    description: 'Update an existing agent, including profile and BMAD fields',
    tags: ['Agents'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Agent ID' }
      }
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 100 },
        description: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string', enum: ['idle', 'working', 'error', 'offline'] },
        bio: { type: 'string', description: 'Agent biography' },
        principles: { type: 'string', description: 'JSON array of guiding principles' },
        critical_actions: { type: 'string', description: 'JSON array of critical actions' },
        communication_style: { type: 'string', description: 'Communication style description' },
        dos: { type: 'string', description: 'JSON array of what agent does' },
        donts: { type: 'string', description: 'JSON array of what agent does not do' },
        bmad_source: { type: 'string', description: 'BMAD framework source reference' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: 'Agent#' }
        }
      },
      400: { $ref: 'Error#' },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;
  const { name, description, role, status, bio, principles, critical_actions, communication_style, dos, donts, bmad_source } = request.body;

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
         status = COALESCE(${param(4)}, status),
         bio = COALESCE(${param(5)}, bio),
         principles = COALESCE(${param(6)}, principles),
         critical_actions = COALESCE(${param(7)}, critical_actions),
         communication_style = COALESCE(${param(8)}, communication_style),
         dos = COALESCE(${param(9)}, dos),
         donts = COALESCE(${param(10)}, donts),
         bmad_source = COALESCE(${param(11)}, bmad_source)
     WHERE id = ${param(12)}
     RETURNING *`,
    [trimmedName, description, role, status, bio, principles, critical_actions, communication_style, dos, donts, bmad_source, id]
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
 * PATCH /api/agents/:id/status - Quick status update for an agent
 */
fastify.patch('/api/agents/:id/status', {
  ...withAuth,
  schema: {
    description: 'Quick status update for an agent',
    tags: ['Agents'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Agent ID' }
      }
    },
    body: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['idle', 'working', 'error', 'offline'] }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: 'Agent#' }
        }
      },
      400: { $ref: 'Error#' },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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
 * DELETE /api/agents/:id - Delete an agent
 */
fastify.delete('/api/agents/:id', {
  ...withAuth,
  schema: {
    description: 'Delete an agent',
    tags: ['Agents'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Agent ID' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              deleted: { $ref: 'Agent#' }
            }
          }
        }
      },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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

// ============ AGENT HEARTBEAT & NEXT-TASK ============

/**
 * PUT /api/agents/:id/heartbeat - Update agent's last_heartbeat timestamp.
 */
fastify.put('/api/agents/:id/heartbeat', {
  ...withAuth,
  schema: {
    description: 'Update agent heartbeat timestamp',
    tags: ['Agents'],
    security: [{ apiKey: [] }],
    params: {
      type: 'object',
      properties: { id: { type: 'integer' } }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          last_heartbeat: { type: 'string', format: 'date-time' }
        }
      },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;
  const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';

  const { rows } = await dbAdapter.query(
    `UPDATE agents SET last_heartbeat = ${nowFn} WHERE id = ${param(1)} RETURNING id, last_heartbeat`,
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ success: false, error: 'Agent not found' });
  }

  broadcast('agent-updated', rows[0]);
  return { success: true, last_heartbeat: rows[0].last_heartbeat };
});

/**
 * GET /api/agents/:id/next-task - Get highest-priority todo task for an agent.
 */
fastify.get('/api/agents/:id/next-task', {
  schema: {
    description: 'Get the highest-priority todo task assigned to this agent',
    tags: ['Agents'],
    params: {
      type: 'object',
      properties: { id: { type: 'integer' } }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          task: { $ref: 'Task#' }
        }
      },
      404: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;

  const { rows } = await dbAdapter.query(
    `SELECT * FROM tasks 
     WHERE agent_id = ${param(1)} AND status = 'todo' 
     ORDER BY created_at ASC 
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return { success: true, task: null };
  }

  return { success: true, task: rows[0] };
});

// ============ MESSAGES API ============

/**
 * GET /api/messages - Retrieve agent messages with optional filters.
 * @param {object} request.query - Query parameters
 * @param {string} [request.query.agent_id] - Filter by agent ID
 * @param {number} [request.query.limit=50] - Maximum messages to return
 * @returns {Array<object>} Array of message objects
 */
fastify.get('/api/messages', {
  schema: {
    description: 'Retrieve agent messages with optional filters and pagination',
    tags: ['Messages'],
    querystring: {
      type: 'object',
      properties: {
        agent_id: { type: 'integer', description: 'Filter by agent ID' },
        limit: { type: 'integer', default: 50, description: 'Maximum messages to return' },
        offset: { type: 'integer', minimum: 0, description: 'Number of messages to skip' }
      }
    },
    response: {
      200: {
        type: 'array',
        items: { $ref: 'Message#' }
      }
    }
  }
}, async (request, reply) => {
  const { agent_id, limit = 50, offset } = request.query;
  
  let query = 'SELECT m.*, a.name as agent_name FROM agent_messages m LEFT JOIN agents a ON m.agent_id = a.id';
  const params = [];

  if (agent_id) {
    params.push(agent_id);
    query += ` WHERE m.agent_id = ${param(params.length)}`;
  }
  
  query += ' ORDER BY m.created_at DESC';
  
  params.push(parseInt(limit));
  query += ` LIMIT ${param(params.length)}`;
  
  if (offset) {
    params.push(parseInt(offset));
    query += ` OFFSET ${param(params.length)}`;
  }

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
fastify.post('/api/messages', {
  ...withAuth,
  schema: {
    description: 'Create a new message. Parses @mentions from content and resolves agent IDs.',
    tags: ['Messages'],
    security: [{ apiKey: [] }],
    body: {
      type: 'object',
      required: ['message'],
      properties: {
        agent_id: { type: 'integer', description: 'Agent ID (optional)' },
        message: { type: 'string', description: 'Message content (required)' }
      }
    },
    response: {
      201: { $ref: 'Message#' },
      400: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
  const { agent_id, message } = request.body;

  if (!message) {
    return reply.status(400).send({ error: 'Message is required' });
  }

  // Parse @mentions from message content
  const mentionMatches = message.match(/@(\w+)/g);
  let mentionedAgentIds = [];

  if (mentionMatches) {
    const mentionNames = mentionMatches.map(m => m.slice(1).toLowerCase());
    const { rows: agents } = await dbAdapter.query('SELECT id, name FROM agents');
    const nameToId = new Map(agents.map(a => [a.name.toLowerCase(), a.id]));
    mentionedAgentIds = [...new Set(
      mentionNames.map(n => nameToId.get(n)).filter(Boolean)
    )];
  }

  const mentionsValue = dbAdapter.isSQLite()
    ? JSON.stringify(mentionedAgentIds)
    : mentionedAgentIds;

  const { rows } = await dbAdapter.query(
    `INSERT INTO agent_messages (agent_id, message, mentioned_agent_ids) 
     VALUES (${param(1)}, ${param(2)}, ${param(3)}) 
     RETURNING *`,
    [agent_id || null, message, mentionsValue]
  );

  const msg = rows[0];

  // Look up agent_name for SSE broadcast
  let agentName = null;
  if (msg.agent_id) {
    const { rows: agentRows } = await dbAdapter.query(
      `SELECT name FROM agents WHERE id = ${param(1)}`,
      [msg.agent_id]
    );
    if (agentRows.length > 0) agentName = agentRows[0].name;
  }
  const broadcastMsg = { ...msg, agent_name: agentName, mentioned_agent_ids: mentionedAgentIds };
  broadcast('message-created', broadcastMsg);
  dispatchWebhook('message-created', broadcastMsg);

  // Broadcast agent-mentioned event for each mentioned agent
  if (mentionedAgentIds.length > 0) {
    broadcast('agent-mentioned', {
      message_id: msg.id,
      mentioned_agent_ids: mentionedAgentIds,
      agent_id: msg.agent_id,
      agent_name: agentName,
      message: msg.message,
      created_at: msg.created_at
    });
  }

  return reply.status(201).send({ ...msg, mentioned_agent_ids: mentionedAgentIds, agent_name: agentName });
});

// ============ MENTIONS API ============

/**
 * GET /api/messages/mentions/:agentId - Retrieve messages that @mention a specific agent.
 * @param {object} request.params - URL parameters
 * @param {number} request.params.agentId - Agent ID to find mentions for
 * @param {object} request.query - Query parameters
 * @param {string} [request.query.since] - ISO timestamp filter (messages after this time)
 * @param {number} [request.query.limit=50] - Maximum messages to return
 * @returns {Array<object>} Array of message objects mentioning this agent
 */
fastify.get('/api/messages/mentions/:agentId', {
  schema: {
    description: 'Retrieve messages that @mention a specific agent',
    tags: ['Messages'],
    params: {
      type: 'object',
      properties: {
        agentId: { type: 'integer', description: 'Agent ID to find mentions for' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        since: { type: 'string', format: 'date-time', description: 'Return messages after this ISO timestamp' },
        limit: { type: 'integer', default: 50, minimum: 1, maximum: 200, description: 'Maximum messages to return' }
      }
    },
    response: {
      200: {
        type: 'array',
        items: { $ref: 'Message#' }
      }
    }
  }
}, async (request, reply) => {
  const { agentId } = request.params;
  const { since, limit = 50 } = request.query;
  const params = [];

  let query;
  if (dbAdapter.isSQLite()) {
    // SQLite: mentioned_agent_ids is a JSON array stored as TEXT
    params.push(agentId);
    query = `SELECT m.*, a.name as agent_name FROM agent_messages m
             LEFT JOIN agents a ON m.agent_id = a.id
             WHERE EXISTS (
               SELECT 1 FROM json_each(m.mentioned_agent_ids) j WHERE j.value = ${param(params.length)}
             )`;
  } else {
    // PostgreSQL: mentioned_agent_ids is INTEGER[]
    params.push(agentId);
    query = `SELECT m.*, a.name as agent_name FROM agent_messages m
             LEFT JOIN agents a ON m.agent_id = a.id
             WHERE ${param(params.length)} = ANY(m.mentioned_agent_ids)`;
  }

  if (since) {
    params.push(since);
    query += ` AND m.created_at > ${param(params.length)}`;
  }

  query += ' ORDER BY m.created_at DESC';
  params.push(parseInt(limit));
  query += ` LIMIT ${param(params.length)}`;

  const { rows } = await dbAdapter.query(query, params);
  return rows;
});

// ============ BOARD API ============

/**
 * GET /api/board - Get tasks in Kanban board format.
 * @returns {object} Board data with columns grouped by status
 */
fastify.get('/api/board', {
  schema: {
    description: 'Get tasks in Kanban board format grouped by status columns',
    tags: ['Board'],
    response: {
      200: {
        type: 'object',
        properties: {
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                status: { type: 'string' },
                cards: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      text: { type: 'string' },
                      description: { type: 'string' },
                      status: { type: 'string' },
                      agent_id: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
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
fastify.get('/api/stream', {
  schema: {
    description: 'Server-Sent Events endpoint for real-time updates. Connect to receive live task and agent updates.',
    tags: ['Stream'],
    querystring: {
      type: 'object',
      properties: {
        demo: { type: 'string', enum: ['true', 'false'], default: 'false', description: 'Enable demo mode auto-progression' }
      }
    }
  }
}, (req, res) => {
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
fastify.get('/health', {
  schema: {
    description: 'Health check endpoint returning server and database status',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'unhealthy'] },
          database: { type: 'string', enum: ['connected', 'disconnected'] },
          type: { type: 'string', description: 'Database type (postgres/sqlite)' },
          authEnabled: { type: 'boolean' }
        }
      },
      500: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          database: { type: 'string' },
          error: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    await dbAdapter.query('SELECT 1');
    return { 
      status: 'healthy', 
      database: 'connected', 
      type: dbAdapter.getDbType(),
      authEnabled: isAuthEnabled()
    };
  } catch (err) {
    return reply.status(500).send({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// ============ AUTH STATUS ============

/**
 * GET /api/auth/status - Check authentication configuration.
 * @returns {object} Auth status with mode information
 */
fastify.get('/api/auth/status', {
  schema: {
    description: 'Check authentication configuration status',
    tags: ['Auth'],
    response: {
      200: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          mode: { type: 'string', enum: ['protected', 'open'] },
          message: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    enabled: isAuthEnabled(),
    mode: isAuthEnabled() ? 'protected' : 'open',
    message: isAuthEnabled() 
      ? 'API key required for write operations (POST/PUT/DELETE). GET operations remain public.'
      : 'Authentication disabled. All operations are public.'
  };
});

// ============ CONFIG API ============

/**
 * POST /api/config/reload - Reload agents from YAML configuration.
 * @param {object} request.body - Request body
 * @param {boolean} [request.body.force=false] - Clear existing agents before reload
 * @returns {object} Reload result with created/skipped counts
 */
fastify.post('/api/config/reload', {
  ...withAuth,
  schema: {
    description: 'Reload agents from YAML configuration file',
    tags: ['Config'],
    security: [{ apiKey: [] }],
    body: {
      type: 'object',
      properties: {
        force: { type: 'boolean', default: false, description: 'Clear existing agents before reload' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          configPath: { type: 'string' },
          created: { type: 'integer' },
          skipped: { type: 'integer' },
          total: { type: 'integer' },
          agents: { type: 'array', items: { $ref: 'Agent#' } }
        }
      },
      500: { $ref: 'Error#' }
    }
  }
}, async (request, reply) => {
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
fastify.get('/api/config/status', {
  schema: {
    description: 'Get configuration file status and search locations',
    tags: ['Config'],
    response: {
      200: {
        type: 'object',
        properties: {
          configPath: { type: 'string', nullable: true },
          configFound: { type: 'boolean' },
          searchedPaths: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
}, async (request, reply) => {
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
fastify.get('/api/webhooks', {
  schema: {
    description: 'Get webhook configuration status and supported events',
    tags: ['Webhooks'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          webhooksEnabled: { type: 'integer' },
          supportedEvents: { type: 'array', items: { type: 'string' } },
          webhooks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                events: { type: 'array', items: { type: 'string' } },
                hasSecret: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
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
fastify.post('/api/webhooks/reload', {
  ...withAuth,
  schema: {
    description: 'Reload webhook configuration from disk',
    tags: ['Webhooks'],
    security: [{ apiKey: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          webhooksEnabled: { type: 'integer' }
        }
      }
    }
  }
}, async (request, reply) => {
  const webhooks = reloadWebhooks();
  
  return {
    success: true,
    message: 'Webhook configuration reloaded',
    webhooksEnabled: webhooks.length
  };
});

}); // End of routes plugin

// ============ AUTO-SEED ============

/** PostgreSQL schema migration SQL */
const pgMigration = `
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'idle',
  role TEXT DEFAULT 'Agent',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
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
CREATE TABLE IF NOT EXISTS agent_messages (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON agent_messages(created_at DESC);
`;

/** SQLite schema migration SQL */
const sqliteMigration = `
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'idle',
  role TEXT DEFAULT 'Agent',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog',
  tags TEXT DEFAULT '[]',
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON agent_messages(created_at DESC);
`;

/**
 * Runs database migrations to ensure schema exists.
 * @returns {Promise<void>}
 */
async function runMigrations() {
  try {
    fastify.log.info(`Running database migrations (${dbAdapter.getDbType()})...`);
    
    if (dbAdapter.isSQLite()) {
      const db = dbAdapter.getDb();
      const statements = sqliteMigration
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const stmt of statements) {
        try {
          db.exec(stmt + ';');
        } catch (err) {
          if (!err.message.includes('already exists')) {
            fastify.log.warn(`Migration warning: ${err.message}`);
          }
        }
      }
    } else {
      await dbAdapter.query(pgMigration);
    }
    
    fastify.log.info('Database migrations completed successfully');
  } catch (err) {
    fastify.log.error(err, 'Migration failed');
    throw err;
  }
}

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
    
    // Log auth status
    if (isAuthEnabled()) {
      fastify.log.info('API key authentication ENABLED - write operations require valid API key');
    } else {
      fastify.log.info('API key authentication DISABLED - all operations are public (open mode)');
    }
    
    // Run migrations first, then seed
    await runMigrations();
    await v3Migration.up();
    fastify.log.info('V3 migration (mentions & profiles) applied');
    await v4Migration.up();
    fastify.log.info('V4 migration (task_comments) applied');
    await v5Migration.up();
    fastify.log.info('V5 migration (task context & attachments) applied');
    await v6HeartbeatMigration.up();
    fastify.log.info('V6 migration (agent heartbeat) applied');
    await v6ApprovalMigration.up();
    fastify.log.info('V6 migration (approval gates) applied');
    await v6AssigneesMigration.up();
    fastify.log.info('V6 migration (task_assignees) applied');
    await seedAgentsFromConfig();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

module.exports = { start };
