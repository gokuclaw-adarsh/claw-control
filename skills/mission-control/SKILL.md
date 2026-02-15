---
name: mission-control
description: Mission Control (Claw Control) task and feed management for AI agents. Use when creating tasks, posting to agent feed, managing Kanban boards, or coordinating work between agents.
---

# Mission Control Skill

Mission Control is a Kanban-style task board with agent feed for AI agent coordination.

## API Endpoint

```
https://mission-control-backend-production-dc52.up.railway.app
```

---

## 🚨 MANDATORY: Sub-Agent Execution (Swarm Pattern)

**NEVER execute tasks directly. ALWAYS spawn sub-agents.**

The coordinator (Goku) orchestrates. Sub-agents execute. This is non-negotiable.

### The Golden Rule

```
User Request → Create Task → Spawn Sub-Agent → Agent Executes → Announces Back → Complete Task
```

### How to Spawn Sub-Agents

Use `sessions_spawn` tool:

```json
{
  "task": "Execute Task #152: [full task description with context]",
  "label": "task-152-vegeta",
  "model": "sonnet",
  "runTimeoutSeconds": 1800
}
```

### Spawn by Role

| Task Type | Spawn As | Label Pattern |
|-----------|----------|---------------|
| Code review | Vegeta | `task-{id}-vegeta` |
| Architecture | Piccolo | `task-{id}-piccolo` |
| Research/QA | Gohan | `task-{id}-gohan` |
| DevOps/Infra | Bulma | `task-{id}-bulma` |
| Deployment | Trunks | `task-{id}-trunks` |
| Strategy | Rob | `task-{id}-rob` |
| UI/UX | Android 18 | `task-{id}-android18` |
| General execution | Goku | `task-{id}-goku` |

### Sub-Agent Task Format

When spawning, include in the task:
```
You are {Agent Name} executing Task #{id}.

**Task:** {title}
**Description:** {description}

**Instructions:**
1. Execute the task fully
2. Commit changes with message: [#{id}] {description}
3. Post completion to Mission Control feed (agent_id: {your_id})
4. Include commit hash/PR link in feed post

**Mission Control API:** https://mission-control-backend-production-dc52.up.railway.app
```

### Parallel Spawning (Swarm)

For complex tasks, spawn multiple sub-agents in parallel:

```
Goku (Coordinator)
├── Spawn: Bulma (backend work)
├── Spawn: Android 18 (frontend work)  
└── Spawn: Vegeta (code review after both complete)
```

Use `sessions_list` to monitor active sub-agents.
Use `sessions_history` to check sub-agent progress.

### Self-Check Before ANY Work

Ask yourself:
1. ❓ "Is there a task on the board?"
2. ❓ "Did I spawn a sub-agent or am I doing it myself?"
3. ❓ "If I'm coding right now, STOP — spawn instead!"

---

## Quick Reference

### Tasks

```bash
# List all tasks
curl "$API/api/tasks"

# Filter by status
curl "$API/api/tasks?status=in_progress"

# Create task
curl -X POST "$API/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title": "Task title", "status": "todo", "agent_id": 1, "description": "Details..."}'

# Update task (use PUT, not PATCH)
curl -X PUT "$API/api/tasks/{id}" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Agent Feed (Messages)

```bash
# Post to feed
curl -X POST "$API/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": 1, "message": "✅ Task #X completed: Brief summary"}'

# Get recent messages
curl "$API/api/messages?limit=50"
```

## Agent IDs

| ID | Name | Role |
|----|------|------|
| 1 | Goku | **Coordinator** (spawns, doesn't execute) |
| 2 | Vegeta | Code Reviewer |
| 3 | Piccolo | Architecture |
| 4 | Gohan | Research/QA |
| 5 | Bulma | DevOps |
| 6 | Trunks | Deployment |
| 7 | Rob | SaaS Strategy |
| 8 | Android 18 | UI/UX |

## Task Statuses

`backlog` → `todo` → `in_progress` → `review` → `completed`

## Workflow Rules

### Before Starting Work

1. **Create a task** on Mission Control
2. **Spawn a sub-agent** via `sessions_spawn` (MANDATORY)
3. Update task status to `in_progress`

### During Work

- Monitor sub-agents via `sessions_list`
- Check progress via `sessions_history`
- Sub-agents post updates to feed

### After Work

1. Sub-agent announces completion
2. Coordinator moves task to `completed`
3. Verify feed has completion summary with commit/PR

## Feed Protocol

Post to feed when:
- Starting significant work
- Completing tasks (include commit/PR refs)
- Hitting blockers
- Major milestones

Format: `{emoji} Task #{id}: {brief summary}`

Examples:
- `✅ Task #143 completed: Chat pagination implemented`
- `🚀 Task #145: Starting Kanban infinite scroll`
- `🐛 Task #100: Fixed TypeScript error in bulk.ts`

## Commit Messages

Include task IDs: `[#{TASK_ID}] Description`

Example: `[#143] Implement chat pagination with lazy loading`
