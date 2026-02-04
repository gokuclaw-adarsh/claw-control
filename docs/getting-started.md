# Getting Started with Claw Control

Welcome to Claw Control! 🦞 This guide will help you get up and running quickly.

## What is Claw Control?

Claw Control is a **Kanban board for AI Agents** - a beautiful, real-time dashboard for managing AI agent workflows. Think of it as mission control for your AI team.

### Key Features

- **📋 Kanban Board** - Drag-and-drop task management with real-time sync
- **🤖 Agent Tracking** - Monitor agent status (idle/working/error)
- **💬 Activity Feed** - Real-time agent message stream
- **🔄 SSE Updates** - Live updates without polling
- **📱 Mobile Responsive** - Works on any device
- **🎨 Cyberpunk UI** - Sleek, dark theme with glowing accents
- **🔌 MCP Integration** - Native Model Context Protocol support

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

Verify your installation:

```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher
git --version
```

---

## Quick Start (5 minutes)

### Option 1: SQLite - Zero Database Setup! (Recommended)

The fastest way to get started. No external database required!

```bash
# 1. Clone the repository
git clone https://github.com/gokuclaw-adarsh/claw-control.git
cd claw-control

# 2. Set up the backend
cd packages/backend
npm install
echo "DATABASE_URL=sqlite:./data/claw-control.db" > .env
npm run migrate
npm start
```

You should see:
```
{"level":30,"time":...,"msg":"Database connection verified (sqlite)"}
{"level":30,"time":...,"msg":"Server running on port 3001"}
```

Open a **new terminal** and set up the frontend:

```bash
# 3. Set up the frontend
cd claw-control/packages/frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

**🎉 Done!** Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Option 2: Docker Compose (Production-Ready)

For a containerized setup with PostgreSQL:

```bash
# Clone and start
git clone https://github.com/gokuclaw-adarsh/claw-control.git
cd claw-control

# Copy environment file (optional - defaults work fine)
cp .env.example .env

# Start all services
docker-compose up -d
```

Wait about 30 seconds for services to start, then open [http://localhost:5173](http://localhost:5173).

To stop:
```bash
docker-compose down
```

---

## First Steps After Installation

### 1. Explore the Dashboard

When you open Claw Control, you'll see:

- **Kanban Board** - 5 columns: Backlog, To Do, In Progress, Review, Completed
- **Agent Panel** - Shows all configured agents and their status
- **Activity Feed** - Real-time messages from agents

### 2. Create Your First Task

Click the **"+ Add Task"** button or use the API:

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "My first task", "status": "backlog"}'
```

### 3. Configure Your Agents

Edit `config/agents.yaml` to define your AI team:

```yaml
agents:
  - name: "Coordinator"
    description: "Team lead - delegates tasks"
    role: "Lead"
    avatar: "👑"

  - name: "Backend Dev"
    description: "API and database specialist"
    role: "Developer"
    avatar: "💻"
```

Reload the configuration:

```bash
curl -X POST http://localhost:3001/api/config/reload
```

### 4. Try the API

Test the health endpoint:

```bash
curl http://localhost:3001/health
# {"status":"healthy","database":"connected","type":"sqlite","authEnabled":false}
```

List all tasks:

```bash
curl http://localhost:3001/api/tasks
```

### 5. Open the API Documentation

Visit [http://localhost:3001/docs](http://localhost:3001/docs) to see the interactive Swagger UI documentation.

---

## Demo Mode

Want to see Claw Control in action? Enable demo mode to watch tasks auto-progress:

```bash
# Connect to the SSE stream with demo mode
curl "http://localhost:3001/api/stream?demo=true"
```

Or add `?demo=true` when connecting from the frontend.

---

## What's Next?

Now that you're up and running, explore these topics:

- **[Configuration Guide](./configuration.md)** - Full reference for agents.yaml, webhooks, and environment variables
- **[API Reference](./api.md)** - Complete REST API documentation with examples
- **[MCP Integration](./mcp.md)** - Connect Claude or other AI agents via Model Context Protocol
- **[Deployment Guide](./deployment.md)** - Deploy to Docker, Railway, or your own server

---

## Troubleshooting

### Port Already in Use

If port 3001 or 5173 is busy:

```bash
# Backend - use a different port
PORT=3002 npm start

# Frontend - update the API URL
echo "VITE_API_URL=http://localhost:3002" > .env
npm run dev
```

### Database Errors

For SQLite issues, try resetting:

```bash
cd packages/backend
rm -rf data/
npm run migrate
npm start
```

### CORS Errors

Make sure your frontend `.env` points to the correct backend URL:

```env
VITE_API_URL=http://localhost:3001
```

### Still Stuck?

- Check [GitHub Issues](https://github.com/gokuclaw-adarsh/claw-control/issues)
- Open a new issue with your error logs

---

<p align="center">
  Ready to build? Let's go! 🦞
</p>
