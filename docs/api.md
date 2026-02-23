# REST API Reference

This guide covers the complete REST API for Claw Control. All endpoints return JSON.

> **Interactive Docs**: When running locally, visit [http://localhost:3001/docs](http://localhost:3001/docs) for Swagger UI.

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Tasks API](#tasks-api)
- [Agents API](#agents-api)
- [Messages API](#messages-api)
- [Board API](#board-api)
- [Real-time Stream (SSE)](#real-time-stream-sse)
- [Configuration API](#configuration-api)
- [Webhooks API](#webhooks-api)
- [Health Check](#health-check)

---

## Base URL

```
http://localhost:3001  # Local development
https://your-api.com   # Production
```

All API routes are prefixed with `/api/` (except health check).

---

## Authentication

When `API_KEY` environment variable is set, write operations require authentication.

### Request Headers

```bash
# Option 1: Bearer token
Authorization: Bearer your-api-key

# Option 2: Custom header
X-API-Key: your-api-key
```

### Auth Modes

| API_KEY | Behavior |
|---------|----------|
| Not set | All operations public |
| Set | Write ops require key, reads are public |

### Check Auth Status

```bash
curl http://localhost:3001/api/auth/status
```

```json
{
  "enabled": true,
  "mode": "protected",
  "message": "API key required for write operations..."
}
```

---

## Tasks API

### List All Tasks

Get all tasks with optional filtering.

```http
GET /api/tasks
GET /api/tasks?status=in_progress
GET /api/tasks?agent_id=1
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `backlog`, `todo`, `in_progress`, `review`, `completed` |
| `agent_id` | integer | Filter by assigned agent |

**Example:**

```bash
curl http://localhost:3001/api/tasks?status=todo
```

**Response:**

```json
[
  {
    "id": 1,
    "title": "Implement user authentication",
    "description": "Add JWT-based auth to the API",
    "status": "todo",
    "agent_id": 2,
    "tags": ["backend", "security"],
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T12:30:00Z"
  }
]
```

---

### Create a Task

```http
POST /api/tasks
```

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | ✅ | - | Task title |
| `description` | string | ❌ | `null` | Task description |
| `status` | string | ❌ | `"backlog"` | Initial status |
| `tags` | array | ❌ | `[]` | Task tags |
| `agent_id` | integer | ❌ | `null` | Assigned agent ID |

**Example:**

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build REST API",
    "description": "Create endpoints for task management",
    "status": "todo",
    "tags": ["backend", "api"],
    "agent_id": 2
  }'
```

**Response:** `201 Created`

```json
{
  "id": 42,
  "title": "Build REST API",
  "description": "Create endpoints for task management",
  "status": "todo",
  "agent_id": 2,
  "tags": ["backend", "api"],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### Update a Task

```http
PUT /api/tasks/:id
```

**Example:**

```bash
curl -X PUT http://localhost:3001/api/tasks/42 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "agent_id": 3
  }'
```

**Response:** `200 OK` with updated task object.

---

### Delete a Task

```http
DELETE /api/tasks/:id
```

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/tasks/42
```

**Response:**

```json
{
  "success": true,
  "deleted": { /* task object */ }
}
```

---

### Progress a Task

Move a task to the next status in the workflow.

```http
POST /api/tasks/:id/progress
```

**Workflow:** `backlog` → `todo` → `in_progress` → `review` → `completed`

**Example:**

```bash
curl -X POST http://localhost:3001/api/tasks/42/progress
```

**Response:**

```json
{
  "success": true,
  "previousStatus": "todo",
  "newStatus": "in_progress",
  "task": { /* updated task */ }
}
```

---

### Complete a Task

Jump directly to completed status.

```http
POST /api/tasks/:id/complete
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/tasks/42/complete
```

---

### Get Task Statistics

```http
GET /api/stats
```

**Response:**

```json
{
  "activeAgents": 2,
  "tasksInQueue": 5
}
```

---

## Agents API

### List All Agents

```http
GET /api/agents
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Coordinator",
      "description": "Team lead - delegates tasks",
      "role": "Lead",
      "avatar": "👑",
      "status": "idle",
      "created_at": "2024-01-15T08:00:00Z"
    }
  ]
}
```

---

### Get Single Agent

```http
GET /api/agents/:id
```

**Example:**

```bash
curl http://localhost:3001/api/agents/1
```

---

### Create an Agent

```http
POST /api/agents
```

**Request Body:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | - |
| `description` | string | ❌ | `null` |
| `role` | string | ❌ | `"Agent"` |
| `avatar` | string | ❌ | `"🤖"` |
| `status` | string | ❌ | `"idle"` |

**Example:**

```bash
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Agent",
    "description": "A new team member",
    "role": "Developer",
    "status": "idle"
  }'
```

---

### Update an Agent

```http
PUT /api/agents/:id
```

**Example:**

```bash
curl -X PUT http://localhost:3001/api/agents/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "working",
    "description": "Updated description"
  }'
```

---

### Quick Status Update

Shorthand for updating just the agent's status.

```http
PATCH /api/agents/:id/status
```

**Example:**

```bash
curl -X PATCH http://localhost:3001/api/agents/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "working"}'
```

---

### Delete an Agent

```http
DELETE /api/agents/:id
```

---

## Messages API

### List Messages

Get activity feed messages.

```http
GET /api/messages
GET /api/messages?agent_id=1&limit=20
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `agent_id` | integer | - | Filter by agent |
| `limit` | integer | `50` | Max messages to return |

**Response:**

```json
[
  {
    "id": 123,
    "agent_id": 1,
    "message": "Starting work on task #42",
    "agent_name": "Coordinator",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### Post a Message

```http
POST /api/messages
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ | Message content |
| `agent_id` | integer | ❌ | Agent posting the message |

**Example:**

```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": 1,
    "message": "🚀 Deployed v2.0 to production!"
  }'
```

---

## Board API

### Get Kanban Board

Get all tasks grouped by status columns.

```http
GET /api/board
```

**Response:**

```json
{
  "columns": [
    {
      "title": "Backlog",
      "status": "backlog",
      "cards": [
        {
          "id": 1,
          "text": "Task title",
          "description": "...",
          "status": "backlog",
          "agent_id": null
        }
      ]
    },
    {
      "title": "To Do",
      "status": "todo",
      "cards": []
    },
    {
      "title": "In Progress",
      "status": "in_progress",
      "cards": []
    },
    {
      "title": "In Review",
      "status": "review",
      "cards": []
    },
    {
      "title": "Completed",
      "status": "completed",
      "cards": []
    }
  ]
}
```

---

## Real-time Stream (SSE)

Connect to the Server-Sent Events stream for real-time updates.

```http
GET /api/stream
GET /api/stream?demo=true
```

**Query Parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `demo` | `true`/`false` | Enable demo mode (auto-progress tasks) |

### JavaScript Example

```javascript
const eventSource = new EventSource('http://localhost:3001/api/stream');

eventSource.onmessage = (event) => {
  console.log('Message:', event.data);
};

eventSource.addEventListener('init', (event) => {
  const { tasks, agents } = JSON.parse(event.data);
  console.log('Initial data:', { tasks, agents });
});

eventSource.addEventListener('task-updated', (event) => {
  const task = JSON.parse(event.data);
  console.log('Task updated:', task);
});

eventSource.addEventListener('agent-updated', (event) => {
  const agent = JSON.parse(event.data);
  console.log('Agent updated:', agent);
});

eventSource.addEventListener('message-created', (event) => {
  const message = JSON.parse(event.data);
  console.log('New message:', message);
});

// Handle errors
eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

### Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `init` | `{tasks, agents, demoMode}` | Initial data on connection |
| `task-created` | Task object | New task created |
| `task-updated` | Task object | Task modified |
| `task-deleted` | `{id}` | Task deleted |
| `agent-created` | Agent object | New agent created |
| `agent-updated` | Agent object | Agent modified |
| `agent-deleted` | `{id}` | Agent deleted |
| `message-created` | Message object | New activity message |
| `agents-reloaded` | `{agents}` | Config reloaded |
| `demo-started` | `{message}` | Demo mode activated |

---

## Configuration API

### Get Config Status

```http
GET /api/config/status
```

**Response:**

```json
{
  "configPath": "/app/config/agents.yaml",
  "configFound": true,
  "searchedPaths": [
    "./config/agents.yaml",
    "./agents.yaml",
    "../config/agents.yaml"
  ]
}
```

---

### Reload Agents from Config

```http
POST /api/config/reload
```

**Request Body:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `force` | boolean | `false` | Clear existing agents before reload |

**Example:**

```bash
# Add new agents (won't overwrite existing)
curl -X POST http://localhost:3001/api/config/reload

# Force reload - clear all agents first
curl -X POST http://localhost:3001/api/config/reload \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

**Response:**

```json
{
  "success": true,
  "message": "Config reloaded from /app/config/agents.yaml",
  "configPath": "/app/config/agents.yaml",
  "created": 5,
  "skipped": 0,
  "total": 5,
  "agents": [ /* ... */ ]
}
```

---

## Webhooks API

### Get Webhook Status

```http
GET /api/webhooks
```

**Response:**

```json
{
  "success": true,
  "webhooksEnabled": 2,
  "supportedEvents": [
    "task-created",
    "task-updated",
    "task-deleted",
    "agent-status-changed",
    "message-created"
  ],
  "webhooks": [
    {
      "url": "https://example.com/webhook",
      "events": ["task-created", "task-updated"],
      "hasSecret": true
    }
  ]
}
```

---

### Reload Webhooks

```http
POST /api/webhooks/reload
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook configuration reloaded",
  "webhooksEnabled": 2
}
```

### Orchestrator Webhook Intake

```http
POST /api/orchestrator/webhook/intake
X-Dedupe-Key: optional-dedupe-key
```

**Request Body (example):**

```json
{
  "eventType": "heartbeat.patrol",
  "payload": {
    "source": "scheduler"
  }
}
```

**Behavior:**
- Idempotency lock + dedupe handling
- Retry with exponential backoff
- Dead-letter logging on terminal failure
- Triggers full patrol scan (all tasks)

**Response (example):**

```json
{
  "success": true,
  "dedupeKey": "optional-dedupe-key",
  "duplicate": false,
  "result": {
    "trigger": "webhook:heartbeat.patrol",
    "scanned": 24,
    "backlog_prompted": 5,
    "todo_claimed_started": 3,
    "stale_remediated": 2,
    "deferred": 0
  }
}
```

### Run Patrol Manually

```http
POST /api/orchestrator/patrol/run
```

Runs the same 15-minute patrol logic immediately.

---

## Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "database": "connected",
  "type": "sqlite",
  "authEnabled": false
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here",
  "success": false
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (missing/invalid API key) |
| `404` | Resource not found |
| `500` | Server error |

---

## Rate Limiting

Currently, Claw Control does not implement rate limiting. For production deployments, consider adding a reverse proxy (nginx, Cloudflare) with rate limiting.

---

<p align="center">
  Want native AI integration? Check out the <a href="./mcp.md">MCP Guide</a>! 🦞
</p>
