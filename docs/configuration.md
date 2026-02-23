# Configuration Guide

This guide covers all configuration options for Claw Control, including agent definitions, webhooks, and environment variables.

---

## Table of Contents

- [Agent Configuration (agents.yaml)](#agent-configuration-agentsyaml)
- [Webhook Configuration (webhooks.yaml)](#webhook-configuration-webhooksyaml)
- [Environment Variables](#environment-variables)
- [Example Configurations](#example-configurations)
- [Hot Reloading](#hot-reloading)

---

## Agent Configuration (agents.yaml)

Define your AI agents in `config/agents.yaml`. This file controls which agents appear on your dashboard.

### Location

The server looks for the config file in these locations (in order):

1. `./config/agents.yaml` (relative to working directory)
2. `./agents.yaml`
3. `../config/agents.yaml`
4. Environment variable `AGENTS_CONFIG_PATH`

### Basic Structure

```yaml
# config/agents.yaml
agents:
  - name: "Agent Name"        # Required: Display name
    description: "What it does" # Optional: Description
    role: "Role"              # Optional: Role/specialty (default: "Agent")
    avatar: "🤖"              # Optional: Emoji or image URL (default: "🤖")
    status: idle              # Optional: Initial status (default: "idle")
```

### Field Reference

| Field | Required | Type | Default | Description |
|-------|----------|------|---------|-------------|
| `name` | ✅ | string | - | Display name (must be unique) |
| `description` | ❌ | string | `null` | What this agent does |
| `role` | ❌ | string | `"Agent"` | Agent's role or specialty |
| `avatar` | ❌ | string | `"🤖"` | Emoji or image URL |
| `status` | ❌ | enum | `"idle"` | One of: `idle`, `working`, `error`, `offline` |

### Status Values

| Status | Description | UI Indicator |
|--------|-------------|--------------|
| `idle` | Agent is available | Green dot |
| `working` | Agent is busy with a task | Yellow/amber pulse |
| `error` | Agent encountered an error | Red dot |
| `offline` | Agent is not available | Gray dot |

### Avatar Options

```yaml
# Option 1: Emoji (simplest)
avatar: "🤖"

# Option 2: Remote image URL
avatar: "https://cdn.example.com/avatars/agent1.png"

# Option 3: Local image (place in frontend public folder)
avatar: "/avatars/custom-agent.png"
```

### Complete Example

```yaml
# config/agents.yaml
agents:
  # Coordinator agent
  - name: "Goku"
    description: "Main coordinator - delegates tasks and verifies completion"
    role: "Coordinator"
    avatar: "🥋"
    status: idle

  # Backend specialist
  - name: "Vegeta"
    description: "Backend specialist - APIs, databases, server-side logic"
    role: "Backend"
    avatar: "💪"
    status: idle

  # Frontend/DevOps specialist
  - name: "Bulma"
    description: "DevOps & Frontend - infrastructure, deployments, UI work"
    role: "DevOps"
    avatar: "🔧"
    status: idle

  # Research agent
  - name: "Gohan"
    description: "Research and documentation - analysis, specs, documentation"
    role: "Research"
    avatar: "📚"
    status: idle

  # Deployment agent
  - name: "Trunks"
    description: "Deployment specialist - releases, hotfixes, urgent deployments"
    role: "Deployment"
    avatar: "⚡"
    status: offline
```

---

## Webhook Configuration (webhooks.yaml)

Webhooks allow Claw Control to notify external services when events occur.

### Location

`config/webhooks.yaml` (same search paths as agents.yaml)

### Basic Structure

```yaml
# config/webhooks.yaml
webhooks:
  - url: "https://your-server.com/webhook"
    events: ["task-created", "task-updated"]
    secret: "optional-hmac-secret"
    enabled: true
```

### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `url` | ✅ | string | Webhook endpoint URL (must be HTTPS in production) |
| `events` | ✅ | array | Events to listen for (or `["*"]` for all) |
| `secret` | ❌ | string | HMAC secret for signature verification |
| `enabled` | ❌ | boolean | Enable/disable this webhook (default: `true`) |

### Supported Events

| Event | Triggered When |
|-------|---------------|
| `task-created` | A new task is created |
| `task-updated` | A task is updated (status, title, assignee, etc.) |
| `task-deleted` | A task is deleted |
| `agent-status-changed` | An agent's status changes |
| `message-created` | A new message is posted to the feed |

### Webhook Payload

All webhooks receive a JSON payload:

```json
{
  "event": "task-updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": 42,
    "title": "Task title",
    "status": "in_progress",
    "agent_id": 1
    // ... full object
  }
}
```

### Signature Verification

If you provide a `secret`, Claw Control adds an HMAC-SHA256 signature header:

```
X-Claw-Signature: sha256=abc123...
```

Verify it in your webhook handler:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Complete Webhook Example

```yaml
# config/webhooks.yaml
webhooks:
  # Notify Slack on task updates
  - url: "https://hooks.slack.com/services/xxx/yyy/zzz"
    events: ["task-created", "task-updated"]
    enabled: true

  # Custom webhook for all events
  - url: "https://api.myapp.com/claw-webhook"
    events: ["*"]
    secret: "my-super-secret-key"
    enabled: true

  # Disabled webhook (kept for reference)
  - url: "https://old-service.com/hook"
    events: ["task-completed"]
    enabled: false
```

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in `packages/backend/`:

```env
# Database Connection (REQUIRED)
# SQLite format:
DATABASE_URL=sqlite:./data/claw-control.db

# PostgreSQL format:
# DATABASE_URL=postgresql://user:password@localhost:5432/claw_control

# Server Configuration
PORT=3001                    # API server port (default: 3001)

# Authentication (Optional)
API_KEY=your-secret-key      # Enable API key auth for write operations

# Config Paths (Optional)
AGENTS_CONFIG_PATH=/custom/path/agents.yaml
WEBHOOKS_CONFIG_PATH=/custom/path/webhooks.yaml

# Orchestrator (Optional)
ORCHESTRATOR_ENABLED=true
ORCHESTRATOR_HEARTBEAT_ENABLED=true
ORCHESTRATOR_HEARTBEAT_MINUTES=15
ORCHESTRATOR_STALE_MINUTES=120
ORCHESTRATOR_BACKLOG_PROMPT_MINUTES=30
ORCHESTRATOR_MAX_RETRIES=3
ORCHESTRATOR_BACKOFF_BASE_MS=500
ORCHESTRATOR_BACKOFF_MAX_MS=10000
ORCHESTRATOR_LOCK_TTL_MS=600000
ORCHESTRATOR_DEAD_LETTER_PATH=./data/orchestrator-dead-letter.jsonl
```

### Orchestrator Patrol Policy (M2)

Default heartbeat behavior (every 15 minutes):

- Scan **all** tasks each run.
- `backlog`:
  - Post/start prompt workflow comments (ask for start signal).
  - Suppress stale/escalation tags by policy.
- `todo`:
  - Auto-claim and move to `in_progress` using queue-balancing (least-loaded available agent).
  - Emit claim+spawn instruction comment so execution can start immediately.
- `in_progress` / `review`:
  - Apply stale-task remediation when older than `ORCHESTRATOR_STALE_MINUTES`.

Webhook intake (`/api/orchestrator/webhook/intake`) includes idempotency lock, dedupe key support (`X-Dedupe-Key`), retry with exponential backoff, and dead-letter JSONL logging.

### Frontend Environment Variables

Create a `.env` file in `packages/frontend/`:

```env
# Backend API URL (REQUIRED)
VITE_API_URL=http://localhost:3001

# For production deployments:
# VITE_API_URL=https://api.yourdomain.com
```

### Database URL Formats

**SQLite** (recommended for development):
```env
# Relative path
DATABASE_URL=sqlite:./data/claw-control.db

# Absolute path
DATABASE_URL=sqlite:/var/lib/claw-control/database.db
```

**PostgreSQL** (recommended for production):
```env
# Standard format
DATABASE_URL=postgresql://user:password@localhost:5432/claw_control

# With SSL
DATABASE_URL=postgresql://user:password@host:5432/claw_control?sslmode=require

# Railway/Heroku style
DATABASE_URL=postgres://user:password@host:5432/claw_control
```

### Authentication

When `API_KEY` is set:

| Operation | Auth Required? |
|-----------|---------------|
| GET requests | ❌ No |
| POST requests | ✅ Yes |
| PUT requests | ✅ Yes |
| DELETE requests | ✅ Yes |
| SSE stream | ❌ No |
| Health check | ❌ No |

Include the key in requests:

```bash
# Using Authorization header
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title": "New task"}'

# Or using X-API-Key header
curl -X POST http://localhost:3001/api/tasks \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title": "New task"}'
```

---

## Example Configurations

We provide ready-to-use example configurations in `config/examples/`:

| File | Description |
|------|-------------|
| `agents.claude.yaml` | Claude/Anthropic themed agents |
| `agents.openai.yaml` | GPT/OpenAI themed agents |
| `agents.openclaw.yaml` | Dragon Ball Z themed (fun!) |
| `agents.generic.yaml` | Framework-agnostic naming |

### Using an Example

```bash
# Copy your preferred example
cp config/examples/agents.openclaw.yaml config/agents.yaml

# Reload the configuration
curl -X POST http://localhost:3001/api/config/reload
```

---

## Hot Reloading

You can update configurations without restarting the server.

### Reload Agents

```bash
# Add new agents (won't overwrite existing)
curl -X POST http://localhost:3001/api/config/reload

# Force reload - clear and recreate all agents
curl -X POST http://localhost:3001/api/config/reload \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Reload Webhooks

```bash
curl -X POST http://localhost:3001/api/webhooks/reload
```

### Check Configuration Status

```bash
# Agent config status
curl http://localhost:3001/api/config/status

# Webhook config status
curl http://localhost:3001/api/webhooks
```

---

## Configuration Best Practices

### For Development

```env
# packages/backend/.env
DATABASE_URL=sqlite:./data/claw-control.db
PORT=3001
# No API_KEY = open mode for easy testing
```

### For Production

```env
# packages/backend/.env
DATABASE_URL=postgresql://user:password@db-host:5432/claw_control
PORT=3001
API_KEY=generate-a-secure-random-key-here

# Generate a secure key:
# openssl rand -hex 32
```

### Security Checklist

- [ ] Set a strong `API_KEY` in production
- [ ] Use PostgreSQL instead of SQLite for multi-instance deployments
- [ ] Use HTTPS for all webhook URLs
- [ ] Add HMAC secrets to sensitive webhooks
- [ ] Don't commit `.env` files to version control

---

<p align="center">
  Configuration complete? Time to explore the <a href="./api.md">API Reference</a>! 🦞
</p>
