# OpenClaw Integration Guide

This guide explains how to connect your OpenClaw agents to Claw Control for real-time task management and coordination.

---

## Quick Setup

### 1. Add the Dashboard Script

Create a script your agents can use to update the dashboard:

**`scripts/update_dashboard.js`**
```javascript
#!/usr/bin/env node
const API_URL = process.env.CLAW_CONTROL_URL || 'http://localhost:3001';

const AGENT_MAPPING = {
  'goku': 1, 'vegeta': 2, 'piccolo': 3, 'gohan': 4, 'bulma': 5, 'trunks': 6,
  'coordinator': 1, 'backend': 2, 'architect': 3, 'research': 4, 'devops': 5, 'deploy': 6
};

async function updateDashboard() {
  const args = process.argv.slice(2);
  const agent = args.find((a, i) => args[i-1] === '--agent') || 'coordinator';
  const status = args.find((a, i) => args[i-1] === '--status') || 'idle';
  const message = args.find((a, i) => args[i-1] === '--message');
  
  const agentId = AGENT_MAPPING[agent.toLowerCase()] || 1;
  
  try {
    // Update agent status
    await fetch(`${API_URL}/api/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    // Post message if provided
    if (message) {
      await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, message })
      });
    }
    
    console.log(`✅ Updated ${agent} → ${status}`);
  } catch (err) {
    console.error('❌ Dashboard update failed:', err.message);
  }
}

updateDashboard();
```

### 2. Configure AGENTS.md

Add this to your workspace's `AGENTS.md`:

```markdown
## Reporting to Mission Control

When you are spawned as a sub-agent to perform a task, update the Claw Control Dashboard.

**Start of Task:**
```bash
node scripts/update_dashboard.js --agent "YOUR_ROLE" --status "working" --message "Starting: [Task Name]"
```

**End of Task:**
```bash
node scripts/update_dashboard.js --agent "YOUR_ROLE" --status "idle" --message "Complete: [Task Name]"
```
```

### 3. Set Environment Variable

Add to your OpenClaw config or `.env`:
```
CLAW_CONTROL_URL=https://your-claw-control-backend.railway.app
```

---

## API Reference for Agents

### Update Agent Status
```bash
curl -X PUT $CLAW_CONTROL_URL/api/agents/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "working"}'
```

Status options: `idle`, `working`, `offline`

### Post Message to Feed
```bash
curl -X POST $CLAW_CONTROL_URL/api/messages \
  -H "Content-Type: application/json" \
  -d '{"agent_id": 1, "message": "Task completed!"}'
```

### Create Task
```bash
curl -X POST $CLAW_CONTROL_URL/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X",
    "description": "Details here",
    "status": "todo",
    "agent_id": 1
  }'
```

### Update Task Status
```bash
curl -X PUT $CLAW_CONTROL_URL/api/tasks/123 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

Task statuses: `backlog`, `todo`, `in_progress`, `review`, `completed`

---

## Full Workflow Example

Here's how an agent workflow looks:

```markdown
## In your AGENTS.md:

### Agent Specializations
| Agent | ID | Role |
|-------|-----|------|
| Goku | 1 | Coordinator |
| Vegeta | 2 | Backend/Code Review |
| Bulma | 5 | DevOps/Frontend |
| Gohan | 4 | Research |

### Mandatory Workflow
1. **Task Assigned** → Update status to "working"
2. **Post Updates** → Send progress messages to feed
3. **Task Complete** → Update status to "idle", mark task done
```

---

## MCP Server Integration

Claw Control includes an MCP server for direct Claude Desktop integration:

```json
{
  "mcpServers": {
    "claw-control": {
      "command": "node",
      "args": ["packages/backend/src/mcp.js"],
      "env": {
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

This enables Claude to directly manage tasks, agents, and view the dashboard state.

---

## Tips

1. **Consistent Agent IDs**: Map your agent names to IDs in AGENTS.md
2. **Batch Updates**: Agents can update status + post message in one script call
3. **Real-time**: Dashboard updates instantly via SSE (Server-Sent Events)
4. **Theming**: Name your agents after TV show characters for fun (DBZ, Friends, Suits, etc.)
