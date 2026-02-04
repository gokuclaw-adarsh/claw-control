# MCP Server Guide

Claw Control includes a built-in **Model Context Protocol (MCP)** server, allowing AI agents like Claude to interact with your mission control directly.

---

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Quick Setup](#quick-setup)
- [Available Tools](#available-tools)
- [Configuration Examples](#configuration-examples)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

---

## What is MCP?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard for connecting AI assistants to external data sources and tools. It enables AI agents to:

- Read and write data from your systems
- Execute actions on your behalf
- Access real-time information

Claw Control's MCP server exposes task and agent management as MCP tools, so your AI can:

- ✅ Create and update tasks
- ✅ Change agent status
- ✅ Post messages to the activity feed
- ✅ Query current state

---

## Quick Setup

### Prerequisites

1. Claw Control backend running (see [Getting Started](./getting-started.md))
2. An MCP-compatible client:
   - [Claude Desktop](https://claude.ai/desktop)
   - [Claude Code](https://claude.ai/code)
   - Any MCP-compatible AI assistant

### Step 1: Locate the MCP Server

The MCP server is at:
```
packages/backend/src/mcp-server.js
```

### Step 2: Configure Your MCP Client

Add Claw Control to your MCP configuration file.

#### For Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "claw-control": {
      "command": "node",
      "args": ["/path/to/claw-control/packages/backend/src/mcp-server.js"],
      "env": {
        "DATABASE_URL": "sqlite:/path/to/claw-control/packages/backend/data/claw-control.db"
      }
    }
  }
}
```

#### For Claude Desktop (Windows)

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "claw-control": {
      "command": "node",
      "args": ["C:\\path\\to\\claw-control\\packages\\backend\\src\\mcp-server.js"],
      "env": {
        "DATABASE_URL": "sqlite:C:\\path\\to\\claw-control\\packages\\backend\\data\\claw-control.db"
      }
    }
  }
}
```

### Step 3: Restart Your MCP Client

Restart Claude Desktop or your MCP client to load the new configuration.

### Step 4: Verify Connection

Ask Claude:
> "Can you list the available MCP tools?"

You should see Claw Control tools like `list_tasks`, `create_task`, etc.

---

## Available Tools

The MCP server exposes these tools:

### `list_tasks`

List all tasks from Mission Control.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `status` | string | ❌ | Filter by status: `backlog`, `todo`, `in_progress`, `review`, `completed` |

**Example prompt:**
> "Show me all tasks that are currently in progress"

---

### `create_task`

Create a new task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | string | ✅ | Task title |
| `description` | string | ❌ | Task description |
| `status` | string | ❌ | Initial status (default: `backlog`) |
| `tags` | array | ❌ | Task tags |
| `agent_id` | number | ❌ | Assigned agent ID |

**Example prompt:**
> "Create a new task called 'Implement dark mode' and assign it to agent 2"

---

### `update_task`

Update an existing task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | number | ✅ | Task ID to update |
| `title` | string | ❌ | New title |
| `description` | string | ❌ | New description |
| `status` | string | ❌ | New status |
| `tags` | array | ❌ | New tags |
| `agent_id` | number | ❌ | New assigned agent |

**Example prompt:**
> "Move task #42 to 'in_progress' status"

---

### `list_agents`

List all agents in Mission Control.

**Parameters:** None

**Example prompt:**
> "Show me all the agents and their current status"

---

### `update_agent_status`

Change an agent's status.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | number | ✅ | Agent ID |
| `status` | string | ✅ | New status: `idle`, `working`, `offline`, `error` |

**Example prompt:**
> "Set agent 1's status to 'working'"

---

### `post_message`

Post a message to the activity feed.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `agent_id` | number | ✅ | Agent ID posting the message |
| `message` | string | ✅ | Message content |

**Example prompt:**
> "As agent 1, post a message saying 'Starting deployment...'"

---

## Configuration Examples

### SQLite (Development)

```json
{
  "mcpServers": {
    "claw-control": {
      "command": "node",
      "args": ["packages/backend/src/mcp-server.js"],
      "env": {
        "DATABASE_URL": "sqlite:./data/claw-control.db"
      }
    }
  }
}
```

### PostgreSQL (Production)

```json
{
  "mcpServers": {
    "claw-control": {
      "command": "node",
      "args": ["/opt/claw-control/packages/backend/src/mcp-server.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/claw_control"
      }
    }
  }
}
```

### Using npx (No Local Install)

If you've published to npm (future):

```json
{
  "mcpServers": {
    "claw-control": {
      "command": "npx",
      "args": ["@claw-control/mcp-server"],
      "env": {
        "DATABASE_URL": "sqlite:./claw.db"
      }
    }
  }
}
```

---

## Usage Examples

Here are practical examples of how to use Claw Control with Claude:

### Workflow: Starting a Task

```
You: "I'm starting work on the authentication feature. 
      Create a task, assign it to me (agent 1), and set my status to working."

Claude: I'll help you set that up:
        1. Created task "Authentication feature" (ID: 15) with status "in_progress"
        2. Assigned to agent 1
        3. Updated agent 1 status to "working"
        4. Posted message: "🔐 Starting work on authentication feature"
```

### Workflow: Daily Standup

```
You: "Give me a standup summary - what tasks are in progress and who's working on them?"

Claude: Here's your standup summary:
        
        **In Progress (3 tasks):**
        - #12 "API redesign" - Agent 2 (Backend)
        - #15 "Auth feature" - Agent 1 (Coordinator)
        - #18 "UI polish" - Agent 3 (Frontend)
        
        **Agents Working:** 3 of 5
        **Tasks in Queue:** 7 (backlog + todo)
```

### Workflow: Completing Work

```
You: "I finished the auth task. Mark it complete and set me back to idle."

Claude: Done! I've:
        1. Moved task #15 to "completed"
        2. Set your status (agent 1) to "idle"
        3. Posted: "✅ Completed authentication feature"
```

---

## Troubleshooting

### "MCP server not found"

1. Check the path in your MCP config is correct
2. Verify Node.js is installed: `node --version`
3. Check the mcp-server.js file exists

### "Database connection failed"

1. Verify your `DATABASE_URL` is correct
2. For SQLite: ensure the directory exists and is writable
3. For PostgreSQL: ensure the server is running

```bash
# Test SQLite
ls -la packages/backend/data/

# Test PostgreSQL
psql $DATABASE_URL -c "SELECT 1"
```

### "Tool not available"

1. Restart your MCP client after config changes
2. Check for JSON syntax errors in config file
3. Look at MCP client logs for errors

### Debug Mode

Run the MCP server directly to see errors:

```bash
cd packages/backend
DATABASE_URL=sqlite:./data/claw-control.db node src/mcp-server.js
```

If it starts successfully, you'll see:
```
Claw Control MCP server running on stdio
```

### Logs

MCP servers communicate via stdio. Check your client's logs:

- **Claude Desktop (macOS):** `~/Library/Logs/Claude/`
- **Claude Desktop (Windows):** `%APPDATA%\Claude\logs\`

---

## Security Considerations

### Database Access

The MCP server has direct database access. This means:

- ✅ No network API key needed
- ⚠️ Anyone with MCP access can read/write all data
- 🔒 Only configure MCP for trusted AI assistants

### Production Recommendations

1. Use a dedicated database user with limited permissions
2. Consider read-only MCP tools for untrusted contexts
3. Monitor MCP activity via the activity feed

---

## Advanced: Custom MCP Tools

Want to add your own tools? Edit `packages/backend/src/mcp-server.js`:

```javascript
// Add to TOOLS array
{
  name: 'my_custom_tool',
  description: 'Does something custom',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'First parameter' }
    },
    required: ['param1']
  }
}

// Add handler
const toolHandlers = {
  // ... existing handlers
  
  async my_custom_tool({ param1 }) {
    // Your logic here
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ result: 'success' })
      }]
    };
  }
};
```

---

<p align="center">
  Ready to deploy? Check out the <a href="./deployment.md">Deployment Guide</a>! 🦞
</p>
