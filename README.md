# 🦞 Claw Control

> **Kanban for AI Agents** - Coordinate your AI team with style

[![GitHub stars](https://img.shields.io/github/stars/adarshmishra07/claw-control?style=flat-square&logo=github)](https://github.com/adarshmishra07/claw-control/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev/)
![Status](https://img.shields.io/badge/status-alpha-orange?style=flat-square)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/claw-control)

Claw Control is a beautiful, real-time mission control dashboard for managing AI agent workflows. Track tasks, monitor agent status, and coordinate your AI team through an intuitive Kanban interface with live updates.

---

## 📸 Screenshots

<p align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard Overview" width="800">
  <br>
  <em>Real-time Kanban board with agent status and live activity feed</em>
</p>

---

## ✨ Features

- **📋 Kanban Board** - Drag-and-drop task management with real-time sync
- **🤖 Agent Tracking** - Monitor agent status (idle/working/error)
- **💬 Activity Feed** - Real-time agent message stream
- **🔄 SSE Updates** - Live updates without polling
- **📱 Mobile Responsive** - Works on any device
- **🎨 Cyberpunk UI** - Sleek, dark theme with glowing accents
- **🔌 MCP Integration** - Native Model Context Protocol support
- **🗄️ Flexible Storage** - SQLite (dev) or PostgreSQL (prod)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│  Dashboard  │  AI Agents  │  MCP Tools  │   External Webhooks    │
│  (React)    │  (REST API) │  (stdio)    │   (GitHub, etc.)       │
└──────┬──────┴──────┬──────┴──────┬──────┴──────────┬──────────────┘
       │             │             │                 │
       └─────────────┴──────┬──────┴─────────────────┘
                            │
                    ┌───────▼────────┐
                    │   API Server   │
                    │   (Fastify)    │
                    ├────────────────┤
                    │ • REST API     │
                    │ • SSE Stream   │
                    │ • Auth Layer   │
                    │ • Webhooks     │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  DB Adapter    │
                    │  (Abstract)    │
                    ├────────────────┤
                    │ SQLite │ Postgres │
                    └────────────────┘

Data Flow:
─────────
1. Agents POST updates → API broadcasts via SSE
2. Dashboard receives SSE → Updates UI in real-time
3. Users drag tasks → PUT request → SSE broadcast
4. MCP tools → Direct DB access for AI integrations
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **Backend** | Node.js, Fastify 5, Server-Sent Events |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **AI Integration** | MCP Server, REST API |
| **Deployment** | Docker, Railway |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- **SQLite** (bundled, no setup!) OR **PostgreSQL 14+** (production)
- npm or yarn

### Option 1: SQLite - Zero Setup! (Recommended for Local Dev)

```bash
# Clone the repo
git clone https://github.com/adarshmishra07/claw-control.git
cd claw-control

# Setup backend with SQLite
cd packages/backend
npm install
echo "DATABASE_URL=sqlite:./data/claw-control.db" > .env
npm run migrate
npm start

# In another terminal, setup frontend
cd packages/frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

That's it! No PostgreSQL needed! 🎉

### Option 2: Docker with PostgreSQL (Production)

```bash
# Clone the repo
git clone https://github.com/adarshmishra07/claw-control.git
cd claw-control

# Copy environment file
cp .env.example .env

# Start with Docker Compose (uses PostgreSQL)
docker-compose up -d
```

Visit `http://localhost:5173` - you're ready to go! 🎉

### Option 3: Docker with SQLite

```bash
# Use the SQLite override
docker-compose -f docker-compose.yml -f docker-compose.sqlite.yml up -d --scale db=0
```

### Option 4: Railway (One-Click Cloud Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/claw-control)

Deploy to Railway with zero configuration. See the full [Railway Template Guide](docs/railway-template.md) for details.

### Option 5: Manual PostgreSQL Setup

```bash
# Clone the repo
git clone https://github.com/adarshmishra07/claw-control.git
cd claw-control

# Setup backend
cd packages/backend
npm install
cp .env.example .env  # Configure your PostgreSQL URL
npm run migrate
npm start

# In another terminal, setup frontend
cd packages/frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

---

## 📦 Project Structure

```
claw-control/
├── packages/
│   ├── frontend/          # React + Vite + TailwindCSS
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   │
│   └── backend/           # Fastify + SQLite/PostgreSQL
│       ├── src/
│       │   ├── server.js      # Main API server
│       │   ├── db-adapter.js  # Database abstraction (SQLite/Postgres)
│       │   ├── mcp-server.js  # MCP integration
│       │   └── migrate.js     # DB migrations
│       └── package.json
│
├── config/                    # Configuration files
│   └── agents.yaml            # Agent definitions
├── docker-compose.yml         # Full stack (PostgreSQL)
├── docker-compose.sqlite.yml  # SQLite override
├── .prettierrc                # Code formatting
├── CONTRIBUTING.md            # Contribution guide
├── .env.example               # Environment template
└── LICENSE
```

---

## 🔌 API Reference

Full API documentation is available at `/documentation` when running the server (Swagger UI).

### Quick Reference

#### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/tasks/:id/progress` | Move task to next status |

#### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create an agent |
| PUT | `/api/agents/:id` | Update agent (status, etc.) |

#### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | List recent messages |
| POST | `/api/messages` | Post agent message |

#### Real-time Stream

```
GET /api/stream - Server-Sent Events stream
```

Events: `task-created`, `task-updated`, `task-deleted`, `agent-updated`, `message-created`

---

## 🔐 Authentication

Claw Control supports optional API key authentication for production deployments.

### Modes

| Mode | API_KEY | Behavior |
|------|---------|----------|
| **Open** | Empty/unset | All operations public (default, for local dev) |
| **Protected** | Set | Write operations require valid API key |

### Protected Operations

When authentication is enabled:
- **Require auth:** POST, PUT, DELETE, PATCH operations
- **Public:** GET operations (read-only), SSE stream, health check

### Configuration

Set the `API_KEY` environment variable:

```env
# Generate a secure key
API_KEY=$(openssl rand -hex 32)
```

### Using the API Key

Include the key in your requests using either header:

```bash
# Option 1: Authorization Bearer token
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title": "New task"}'

# Option 2: X-API-Key header
curl -X POST http://localhost:3001/api/tasks \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title": "New task"}'
```

---

## ⚙️ Agent Configuration

Claw Control uses a YAML file to define your agents. Edit `config/agents.yaml` to customize your team:

```yaml
# config/agents.yaml
agents:
  - name: "Goku"
    description: "Main coordinator - delegates tasks"
    role: "Coordinator"
    avatar: "🥋"

  - name: "Vegeta"
    description: "Backend specialist - APIs, databases"
    role: "Backend"
    avatar: "💪"

  - name: "Bulma"
    description: "DevOps & Frontend - infrastructure, UI"
    role: "DevOps"
    avatar: "🔧"
```

### Example Configurations

We provide ready-to-use example configs for different AI frameworks in `config/examples/`:

| File | Description | Best For |
|------|-------------|----------|
| [`agents.claude.yaml`](config/examples/agents.claude.yaml) | Claude/Anthropic themed | Claude Code, Claude Desktop |
| [`agents.openai.yaml`](config/examples/agents.openai.yaml) | GPT/OpenAI themed | ChatGPT, GPT-4, Assistants API |
| [`agents.openclaw.yaml`](config/examples/agents.openclaw.yaml) | DBZ theme (our setup!) | OpenClaw users, fun teams |
| [`agents.generic.yaml`](config/examples/agents.generic.yaml) | Framework-agnostic | Any AI, neutral naming |

To use an example:

```bash
# Copy your preferred example
cp config/examples/agents.openclaw.yaml config/agents.yaml

# Reload the configuration
curl -X POST http://localhost:3001/api/config/reload
```

### Config Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name for the agent |
| `description` | ❌ | What this agent does |
| `role` | ❌ | Agent role/specialty (default: "Agent") |
| `avatar` | ❌ | Emoji or image URL (default: "🤖") |
| `status` | ❌ | Initial status: idle, working, offline (default: "idle") |

### Avatar Options

```yaml
# Emoji (simplest)
avatar: "🤖"

# Image URL (custom branding)
avatar: "https://cdn.example.com/avatars/agent.png"

# Local path (relative to frontend public folder)
avatar: "/avatars/agent.png"
```

### Hot Reload

Reload agents from config without restarting:

```bash
# Add new agents from config (won't overwrite existing)
curl -X POST http://localhost:3001/api/config/reload

# Force reload - clear all agents and recreate from config
curl -X POST http://localhost:3001/api/config/reload \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

---

## 🎛️ Environment Variables

### Backend

```env
# SQLite (easy local setup - no external database needed):
DATABASE_URL=sqlite:./data/claw-control.db

# Or PostgreSQL (production):
DATABASE_URL=postgresql://user:password@localhost:5432/claw_control

PORT=3001
API_KEY=your-secret-key  # Optional, enables auth
```

### Frontend

```env
VITE_API_URL=http://localhost:3001
```

---

## 🤝 Integration

### 🦞 OpenClaw / AI Agent Integration

Connect your AI agents (OpenClaw, Claude, GPT, etc.) to Claw Control:

**1. Copy the update script to your workspace:**
```bash
cp templates/scripts/update_dashboard.js scripts/
```

**2. Add to your `AGENTS.md`:**
```markdown
## Reporting to Claw Control

When spawned as a sub-agent, update the dashboard:

**Start of Task:**
\`\`\`bash
node scripts/update_dashboard.js --agent "Bulma" --status "working" --message "Starting: Deploy frontend"
\`\`\`

**End of Task:**
\`\`\`bash
node scripts/update_dashboard.js --agent "Bulma" --status "idle" --message "Complete: Frontend deployed"
\`\`\`
```

**3. Set environment variable:**
```bash
export CLAW_CONTROL_URL=https://your-backend.railway.app
```

📖 **Full guide:** [docs/openclaw-integration.md](docs/openclaw-integration.md)

---

### MCP (Model Context Protocol)

Claw Control includes an MCP server for native AI agent integration.

**Available Tools:**
- `list_tasks` - Get all tasks (with optional status filter)
- `create_task` - Create a new task
- `update_task` - Update task status/details
- `list_agents` - Get all agents
- `update_agent_status` - Change agent status
- `post_message` - Post to agent feed

**MCP Configuration:**

```json
{
  "mcpServers": {
    "claw-control": {
      "command": "node",
      "args": ["packages/backend/src/mcp-server.js"],
      "env": {
        "DATABASE_URL": "sqlite:./data/claw.db"
      }
    }
  }
}
```

### REST API Integration

```javascript
// Update agent status
await fetch('http://localhost:3001/api/agents/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'working' })
});

// Post a message
await fetch('http://localhost:3001/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    agent_id: 1, 
    message: 'Starting task: Deploy to production' 
  })
});
```

---

## 🎨 Customization

The UI uses TailwindCSS with custom cyber-themed colors. Edit `packages/frontend/tailwind.config.js`:

```javascript
colors: {
  'cyber-green': '#39ff14',
  'cyber-blue': '#00d4ff',
  'cyber-red': '#ff3366',
  // ... add your own
}
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Setting up your development environment
- Our coding standards and style guide
- The pull request process

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

Built with:
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Fastify](https://fastify.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [dnd-kit](https://dndkit.com/) for drag-and-drop
- [Lucide Icons](https://lucide.dev/)

---

<p align="center">
  Made with 🦞 by the <a href="https://github.com/adarshmishra07">OpenClaw</a> team
</p>
