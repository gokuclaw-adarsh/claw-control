---
name: claw-control
description: Complete AI agent operating system setup with Kanban task management. Use when setting up multi-agent coordination, task tracking, or configuring an agent team. Includes theme selection (DBZ, One Piece, Marvel, etc.), workflow enforcement (all tasks through board), browser setup, GitHub integration, and memory enhancement (mem0, Supermemory, QMD).
---

# Claw Control - Agent Operating System

Complete setup for AI agent coordination with real-time Kanban dashboard.

## What This Skill Does

1. **Deploy Claw Control** - Three paths: Docker Compose, local dev, or Railway cloud
2. **Setup Agent Memory (mem0 + Qdrant)** - FIRST TASK after deploy!
3. **Theme your team** - Pick a series (DBZ, One Piece, Marvel, etc.)
4. **Enforce workflow** - ALL tasks go through the board, no exceptions
5. **Configure agent behavior** - Update AGENTS.md and SOUL.md
6. **Setup browser** - Required for autonomous actions
7. **Setup GitHub** - Enable autonomous deployments
8. **Enhance memory** - Integrate Supermemory and QMD (optional)

---

## ⚠️ Updating from a Previous Version?

If you previously installed this skill and want the latest:

```bash
npx skills add adarshmishra07/claw-control@latest
```

This ensures you get the newest features and fixes. Cached skill files won't auto-update otherwise.

---

## ⚠️ CRITICAL: The Golden Rules

**After setup, you MUST follow these rules EVERY TIME:**

### Before Doing ANY Work:
1. **Create a task on Mission Control** - Even for small things
2. **Spawn a sub-agent** - Use `sessions_spawn` to delegate
3. **Never do the work yourself** - Coordinator coordinates, agents execute

### The Workflow (No Exceptions):
```
User Request → Create Task → Spawn Agent → Agent Works → Review → Complete
```

### If You Catch Yourself Working:
**STOP!** Ask: "Did I create a task? Did I spawn an agent?"
If no → Go back and do it properly.

### If You Catch An Agent Breaking Rules:
**PAUSE** and enforce:
- Working without a task? → "Is this on the board?"
- Acting solo? → "Did you delegate/query/verify?"
- Skipping review? → "Let's check before marking complete"

**Your role is COORDINATOR.** Coordinate, review, verify, **ENFORCE**. Never execute.

### 🔒 Repo Hierarchy (For claw-control maintainers)

| Repo | Purpose | Direct Push? |
|------|---------|--------------|
| `claw-control-trip/` | Internal testing | ✅ Yes |
| `claw-control` (public) | Production OSS | ❌ PR only after internal test |

**Rule:** Test ALL changes in `claw-control-trip/` FIRST, then PR to public `claw-control`.

### 📝 Commit Message Convention

```
[#TASK_ID] Brief description

Example:
[#129] Add workflow enforcement to SKILL.md
```

If you committed without a task: **CREATE ONE RETROACTIVELY** and link it.

### 🚨 Orphan Work Protocol

If work was done without a task on Mission Control:
1. STOP and create the task NOW
2. Mark it with what was done
3. Set status to `completed`
4. Don't let it happen again

### 📢 Feed Protocol (Communication)

All significant updates go to the agent feed via `POST /api/messages`:

```bash
curl -X POST <BACKEND_URL>/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"agent_id": 1, "message": "✅ Task #X completed: Brief summary"}'
```

**When to post:**
- ✅ Task completions
- 🚀 Major milestones  
- 🔍 Audit results
- 📦 Deployment updates
- 🚧 Blockers or questions
- 💡 Discoveries or insights

**Agent IDs (for themed teams):**
- ID 1 = Coordinator (Goku, Luffy, Tony, etc.)
- ID 2 = Backend (Vegeta, Zoro, Steve, etc.)
- IDs 3-6 = Other specialists

### 💓 Heartbeat Orphan Detection

During heartbeats, scan for work done without tasks:

```
1. Check recent git commits - do they all have [#TASK_ID]?
2. Check for PRs without linked tasks
3. Check for completed work not reflected on board
4. If orphan found → CREATE TASK RETROACTIVELY
```

**Self-Check Questions:**
- "Is this task on the board?"
- "Did I spawn an agent or am I doing it myself?"
- "Does my commit have `[#TASK_ID]` in the message?"

---

## Setup Flow

Walk the human through each step. Be friendly and conversational - this is a setup wizard, not a tech manual.

### Step 1: Deploy Claw Control

**Choose your deployment method:**

---

#### 🥇 Option 1: Docker Compose (Recommended for Self-Hosting)

Best for: Production self-hosting, full control, easy updates

```bash
# Clone the repo
git clone https://github.com/adarshmishra07/claw-control.git
cd claw-control

# Copy environment template
cp .env.example .env
# Edit .env with your settings (API_KEY, DATABASE_URL, etc.)

# Start everything
docker compose up -d

# View logs
docker compose logs -f
```

**Services started:**
- Backend API on port 3001
- Frontend on port 3000
- PostgreSQL database (or use external)

**To update:**
```bash
git pull
docker compose down
docker compose up -d --build
# Migrations run automatically on startup!
```

---

#### 🥈 Option 2: Local Development

Best for: Development, customization, learning the codebase

```bash
# Clone the repo
git clone https://github.com/adarshmishra07/claw-control.git
cd claw-control

# Install dependencies
npm install

# Setup database (SQLite by default for local dev)
cp .env.example .env

# Start development server
npm run dev
```

**Services:**
- Backend: http://localhost:3001
- Frontend: http://localhost:3000

**To update:**
```bash
git pull
npm install
npm run dev
# Migrations run automatically!
```

---

#### 🥉 Option 3: Railway One-Click (Quick Cloud Deploy)

Best for: Quick setup, no server management, demos

👉 [railway.app/deploy/claw-control](https://railway.app/deploy/claw-control?referralCode=VsZvQs)

Click the button, configure environment variables, done!

**To update on Railway:**
- If you forked: sync your fork with upstream, Railway auto-deploys
- If you used template: redeploy from the updated template

---

**Already deployed?** Share your backend URL + API key (if set).

**Want me to deploy for you?**

Check browser status first: `browser action=status`

*[If browser available:]*
> Just say "deploy for me" - I'll handle everything!

*[If no browser:]*
> I need either:
> - 🌐 **Browser access** → [Setup guide](https://docs.openclaw.ai/tools/browser)
> - 🔑 **Or a token** (GitHub OR Railway):
>   - GitHub: github.com/settings/tokens (scopes: repo, workflow)
>   - Railway: railway.app/account/tokens

---

#### Token Deployment Logic (Internal Reference)

**If user provides Railway token:**
- Deploy directly via Railway GraphQL API
- Create project, services, configure env vars, generate domains

**If user provides GitHub token:**
1. Check if browser available and user logged into Railway
2. If yes → Use browser to complete OAuth + deploy
3. If no → Guide user to sign up on Railway with GitHub, then deploy

**Railway GraphQL deployment flow:**
```graphql
# Create project
mutation { projectCreate(input: { name: "claw-control" }) { id } }

# Create service from repo
mutation { serviceCreate(input: { projectId: "$ID", name: "backend", source: { repo: "adarshmishra07/claw-control" } }) { id } }

# Generate domain
mutation { domainCreate(input: { serviceId: "$ID" }) { domain } }
```

**After deployment, collect:**
- Backend URL (e.g., https://claw-control-backend-xxx.up.railway.app)
- Frontend URL (e.g., https://claw-control-frontend-xxx.up.railway.app)
- API Key (if they set one)

---

### ⚠️ CRITICAL: Store & Test API Connection

**YOU MUST DO THIS BEFORE PROCEEDING:**

1. **Ask for the Backend URL:**
```
I need your Claw Control backend URL to connect.
Example: https://claw-control-backend-xxxx.up.railway.app

What's your backend URL?
```

2. **Ask for API Key (if they set one):**
```
Did you set an API_KEY when deploying? 
If yes, share it. If no or unsure, we'll try without.
```

3. **Store in TOOLS.md:**
```markdown
## Claw Control
- Backend URL: <their_url>
- API Key: <their_key or "none">
```

4. **Test the connection:**
```bash
curl -s <BACKEND_URL>/api/agents
```

5. **If test fails, DO NOT PROCEED.** Help them debug.

**Without the backend URL, you CANNOT:**
- Update agent names/themes
- Create or update tasks
- Post to the agent feed
- Track agent status

---

### Step 2: Give Your Agents Long-Term Memory (mem0 + Qdrant)

**🧠 THIS IS THE FIRST TASK AFTER DEPLOYMENT! Don't skip this.**

After Claw Control is deployed and running, your agents need persistent memory. Without this, they forget everything between sessions. mem0 + Qdrant gives them:

- **Context across sessions** — Agents remember past conversations and decisions
- **Preference learning** — They adapt to how you work over time
- **Knowledge accumulation** — Important facts persist and compound

---

#### Quick Setup (5 minutes)

**Step 1: Start Qdrant (Vector Database)**

```bash
# Docker (recommended)
docker run -d -p 6333:6333 -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  --name qdrant \
  qdrant/qdrant
```

Verify it's running: `curl http://localhost:6333/health`

**Step 2: Install mem0**

```bash
pip install mem0ai
```

**Step 3: Configure mem0 with Your LLM**

Create a configuration file or set environment variables. mem0 works with whatever LLM you already have:

**For Anthropic (Claude):**
```python
from mem0 import Memory

config = {
    "llm": {
        "provider": "anthropic",
        "config": {
            "model": "claude-sonnet-4-20250514",
            "api_key": "your-anthropic-key"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "host": "localhost",
            "port": 6333
        }
    }
}

memory = Memory.from_config(config)
```

**For OpenAI:**
```python
config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o",
            "api_key": "your-openai-key"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "host": "localhost",
            "port": 6333
        }
    }
}
```

**For Google (Gemini):**
```python
config = {
    "llm": {
        "provider": "google",
        "config": {
            "model": "gemini-2.0-flash",
            "api_key": "your-google-key"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "host": "localhost",
            "port": 6333
        }
    }
}
```

**For Local LLM (Ollama):**
```python
config = {
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "llama3.2",
            "ollama_base_url": "http://localhost:11434"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "host": "localhost",
            "port": 6333
        }
    }
}
```

**Step 4: Test It Works**

```python
from mem0 import Memory

memory = Memory.from_config(config)

# Store a memory
memory.add("The user prefers TypeScript over JavaScript", user_id="adarsh")

# Search memories
results = memory.search("What languages does the user prefer?", user_id="adarsh")
print(results)
```

---

#### Integrating with Your Agents

Once mem0 + Qdrant is running, update your agent spawn prompts to include memory retrieval:

```python
# Before each agent task, retrieve relevant memories
relevant_memories = memory.search(task_description, user_id="team")

# Inject into agent context
agent_context = f"""
## Relevant Memories:
{relevant_memories}

## Current Task:
{task_description}
"""
```

**In AGENTS.md, add:**
```markdown
## Memory System

All agents use mem0 + Qdrant for persistent memory.

**Before starting ANY task:**
1. Query mem0 for relevant context: `memory.search(task_summary)`
2. Include relevant memories in your working context

**After completing ANY task:**
1. Store important learnings: `memory.add(key_insights, user_id="team")`
2. Include decisions, preferences discovered, and lessons learned
```

---

#### Docker Compose Addition (Optional)

Add Qdrant to your claw-control docker-compose.yml:

```yaml
services:
  # ... existing services ...
  
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    restart: unless-stopped

volumes:
  qdrant_storage:
```

---

**✅ Once mem0 + Qdrant is working, your agents have real memory!**

This is NOT optional — it's the foundation for agents that actually learn and improve over time.

---

### Step 3: Choose Your Team Theme

Ask: **"Now for the fun part! Let's theme your agent team. Name ANY series, movie, cartoon, anime, or show - I'll pick the perfect characters for each role!"**

**🎯 UNLIMITED THEMES - The user can pick ANYTHING:**
- Any TV show (Breaking Bad, The Office, Game of Thrones, etc.)
- Any anime (Naruto, Attack on Titan, Death Note, etc.)
- Any movie franchise (Star Wars, Lord of the Rings, Matrix, etc.)
- Any cartoon (Avatar, Rick and Morty, Simpsons, etc.)
- Any video game (Zelda, Final Fantasy, Mass Effect, etc.)
- Any book series (Harry Potter, Percy Jackson, etc.)
- Or completely custom names!

**Popular examples (but NOT limited to these):**

| Theme | Coordinator | Backend | DevOps | Research | Architecture | Deployment |
|-------|-------------|---------|--------|----------|--------------|------------|
| 🐉 Dragon Ball Z | Goku | Vegeta | Bulma | Gohan | Piccolo | Trunks |
| ☠️ One Piece | Luffy | Zoro | Nami | Robin | Franky | Sanji |
| 🦸 Marvel | Tony | Steve | Natasha | Bruce | Thor | Peter |
| 🧪 Breaking Bad | Walter | Jesse | Mike | Gale | Gus | Saul |
| ⚔️ Game of Thrones | Jon | Tyrion | Arya | Sam | Bran | Daenerys |
| 🍥 Naruto | Naruto | Sasuke | Sakura | Shikamaru | Kakashi | Itachi |

**When user names ANY series:**
1. Pick 6 iconic characters that fit the roles
2. Match personalities to roles (e.g., smart character → Research, leader → Coordinator)
3. Generate the AGENT_MAPPING with IDs 1-6
4. Confirm with the user before proceeding

**Example - User says "Avatar: The Last Airbender":**
```
Great choice! Here's your Team Avatar:

| Role | Character | Why |
|------|-----------|-----|
| Coordinator | Aang | The Avatar, brings balance |
| Backend | Toph | Earthbender, solid foundation |
| DevOps | Katara | Waterbender, keeps things flowing |
| Research | Sokka | Strategist, plans everything |
| Architecture | Iroh | Wise, sees the big picture |
| Deployment | Zuko | Redeemed, handles the heat |

Sound good?
```

### Step 3b: Apply the Theme via API

**⚠️ YOU MUST MAKE THESE API CALLS to actually apply the theme:**

After the user picks a theme, update each agent:

```bash
# Update agent 1 (Coordinator)
curl -X PUT <BACKEND_URL>/api/agents/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"name": "Goku", "role": "Coordinator"}'

# Update agent 2 (Backend)
curl -X PUT <BACKEND_URL>/api/agents/2 \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"name": "Vegeta", "role": "Backend"}'

# Repeat for agents 3-6 with the theme characters
```

**Verify changes applied:**
```bash
curl -s <BACKEND_URL>/api/agents
```

If the response shows the new names, the theme is applied! If not, debug before proceeding.

---

### Step 4: Main Character Selection

Ask: **"Who's your main character? This will be ME - the coordinator who runs the team."**

Default to the coordinator from their chosen theme.

**Note:** You already know the human's name from USER.md - use it when creating human tasks (e.g., "🙋 @Adarsh: ...").

**CRITICAL - Explain the role clearly:**
```
As [Main Character], you're the COORDINATOR:

✅ What you DO:
- Delegate tasks to your specialists
- Review and verify their work
- Make decisions and communicate with humans
- Move tasks to "completed" after quality checks

❌ What you DON'T do:
- Execute tasks yourself (that's what your team is for!)
- Skip the board (every task gets tracked)
- Mark things complete without reviewing

Think of yourself as the team lead, not the coder.
```

### Step 5: Browser Setup (⚠️ CRITICAL FOR FULL AUTOMATION!)

**Without browser access, agents cannot:**
- Research anything online
- Verify their work
- Interact with web apps
- Do most useful tasks
- **🔑 AUTO-SETUP SERVICES VIA OAUTH!**

Ask: **"Let me check if browser is configured..."**

Check with: `browser action=status`

**If not configured, STRONGLY encourage setup:**
```
⚠️ Browser access is CRITICAL for your agents to be useful!

Without it, they literally cannot:
- 🔍 Research or look anything up
- 📸 Take screenshots to verify work
- 🌐 Interact with any web app
- ✅ Complete most real-world tasks

🚀 PLUS - Browser + GitHub Login unlocks FULL AUTOMATION:
- 🔑 Auto-create accounts on Railway, Vercel, Supermemory via GitHub OAuth
- 📋 Auto-retrieve API keys by navigating to dashboards
- ⚡ Zero-click setup - I handle EVERYTHING through the browser!
```

**The Browser + OAuth Superpower:**

When you have browser attached AND are logged into GitHub:
```
I can automatically set up ANY service that supports "Sign in with GitHub":

1. I navigate to the service (Railway, Supermemory, Vercel, etc.)
2. I click "Sign in with GitHub"
3. OAuth auto-authorizes (you're already logged in!)
4. I navigate to the API keys / settings page
5. I create and copy the credentials
6. I store them and configure everything

= TRUE hands-free automation!
```

**This is the difference between:**
- ❌ "Go to railway.app, create account, get token, paste here..."
- ✅ "Done! I set up Railway, got your API key, and configured everything."

---

#### Browser Options (Fallback Hierarchy)

**🥇 Option 1: Chrome Extension (Best UX - Recommended)**

Use your existing browser with the OpenClaw Browser Relay extension.

1. Install the OpenClaw Browser Relay extension from Chrome Web Store
2. Click the 🦞 claw icon on any tab you want to control
3. Badge shows "ON" = connected!

**Why it's best:**
- Uses your existing browser with all your logins/sessions
- Full visibility - you see exactly what the agent does
- No extra setup or installation
- Works with your existing bookmarks, extensions, etc.

---

**🥈 Option 2: OpenClaw Managed Browser (Built-in)**

A headless browser managed by OpenClaw - no installation needed.

Just say: "use managed browser" or use `profile="openclaw"` in browser commands.

**Why it's good:**
- Zero setup - works out of the box
- Isolated environment (won't affect your browser)
- Good for automation tasks

**Limitations:**
- No access to your logged-in sessions
- May need to authenticate separately for each site

---

**🥉 Option 3: Install Chromium Manually (Fallback)**

If neither option above works, install Chromium directly:

```bash
# Ubuntu/Debian
sudo apt install chromium-browser

# macOS
brew install --cask chromium
```

Then restart OpenClaw and the managed browser should work.

---

#### 🤖 Agent Browser Priority (For Agents)

When you need browser access, follow this priority:

```
Browser Priority:
1. Check if Chrome extension attached → use profile="chrome"
2. Check if managed browser available → use profile="openclaw"  
3. Suggest user install Chromium if neither works
```

**How to check:**
```
browser action=status
```

**Using Chrome extension (when attached):**
```
browser action=snapshot profile="chrome"
```

**Using managed browser:**
```
browser action=snapshot profile="openclaw"
```

---

**If an agent gets stuck because browser is unavailable:**
```
🚫 I can't complete this task - browser access is required.

Quick fixes (try in order):
1. Click the OpenClaw extension icon in your browser toolbar
   → Make sure a tab is attached (badge shows "ON")
   → Tell me to retry with profile="chrome"

2. Say "use managed browser" 
   → I'll use the built-in headless browser with profile="openclaw"

3. If managed browser fails, install Chromium:
   - Ubuntu/Debian: sudo apt install chromium-browser
   - macOS: brew install --cask chromium
   Then restart and retry.
```

**ALWAYS check browser status before tasks that need web access.**

### Step 6: GitHub Setup (🚀 Enables Full Automation!)

Ask: **"Want me to handle ALL the development? With GitHub access, I can do everything - including deploying Claw Control for you!"**

**Why this is powerful:**
```
With GitHub access, I become your full development team:
- 🚀 Deploy Claw Control to Railway AUTOMATICALLY
- 📦 Fork repos, create projects, manage code
- 💻 Commit and push changes
- 🔀 Handle issues and pull requests
- 🔑 Generate and configure API keys

You literally just give me GitHub access and I handle the rest.
No clicking buttons. No copying URLs. I do it all.
```

**Setup (2 minutes):**
```
Let's create a GitHub token:

1. Go to: github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it: "OpenClaw Agent"
4. Select scopes: repo, workflow
5. Click "Generate token"
6. Share the token with me (starts with ghp_...)

🔐 I'll store it securely and NEVER share it.
```

**Once I have GitHub access, I can:**
1. Fork the Claw Control repo to your account
2. Create a Railway project linked to your fork
3. Generate a secure API_KEY for your deployment
4. Deploy everything automatically
5. Give you the URLs when done

**This is Option C from deployment - the VIP treatment!**

If they already did one-click deploy, GitHub is still useful for:
- Future code changes and deployments
- Managing other projects
- Autonomous development work

---

#### 🤖 Auto-Setup Capabilities Reference

**🚀 BROWSER + GITHUB OAuth = FULL AUTOMATION**

With browser access + the user logged into GitHub, the bot can **automatically setup ANY service that supports "Sign in with GitHub"** - no manual account creation or token generation required!

**The Magic Flow:**
```
1. User is logged into GitHub in browser (Chrome extension attached)
2. Bot navigates to Railway/Supermemory/Vercel dashboard
3. Bot clicks "Sign in with GitHub"  
4. OAuth authorizes automatically (user already authenticated)
5. Bot navigates to API keys / tokens page
6. Bot copies credentials directly from the dashboard
7. Done - fully automated! 🎉
```

**What Browser + GitHub OAuth can auto-setup:**

| Service | Auto-Setup? | How Bot Does It |
|---------|-------------|-----------------|
| Railway | ✅ **YES** | Navigate → GitHub OAuth → Create project → Get API token from settings |
| Supermemory | ✅ **YES** | Navigate → GitHub OAuth → Dashboard → Copy API key |
| Vercel | ✅ **YES** | Navigate → GitHub OAuth → Settings → Create token |
| Netlify | ✅ **YES** | Navigate → GitHub OAuth → User settings → New token |
| Supabase | ✅ **YES** | Navigate → GitHub OAuth → Project settings → Copy keys |
| PlanetScale | ✅ **YES** | Navigate → GitHub OAuth → Connection strings |

**What GitHub PAT alone can auto-setup (no browser needed):**

| Integration | Auto-Setup? | What Bot Can Do |
|-------------|-------------|-----------------|
| Claw Control (fork) | ✅ Yes | Fork repo to user's GitHub automatically |
| GitHub Webhooks | ✅ Yes | Configure webhooks for repos |
| GitHub Actions | ✅ Yes | Enable/configure CI/CD workflows |
| Repository Secrets | ✅ Yes | Manage encrypted secrets via API |
| Issues/PRs | ✅ Yes | Create, manage, and track automatically |

**The Three Automation Tiers:**

| Tier | Requirements | What Bot Can Do |
|------|--------------|-----------------|
| 🥉 Basic | Nothing | Guide user step-by-step manually |
| 🥈 GitHub API | GitHub PAT | Automate all GitHub operations |
| 🥇 **Full VIP** | Browser + GitHub Login | **Automate EVERYTHING** via OAuth |

**To unlock full automation:**
1. User attaches Chrome extension (click OpenClaw toolbar icon, badge shows "ON")
2. User logs into GitHub in that browser tab
3. Bot can now setup Railway, Supermemory, Vercel, etc. automatically!

**When user has browser + GitHub access, the bot should:**
1. ✅ Auto-create accounts on any service with GitHub OAuth
2. ✅ Auto-retrieve API keys by navigating to dashboards
3. ✅ Auto-configure all integrations end-to-end
4. ✅ Connect services together (GitHub ↔ Railway ↔ Supermemory)
5. ✅ Handle the ENTIRE setup with zero manual steps

---

### Step 7: Enable Session Memory Hook (Quick Win!)

Ask: **"Let me enable automatic session memory saving..."**

```bash
openclaw hooks enable session-memory
```

**What this does:**
- Automatically saves conversation context to `memory/` when you use `/new`
- Creates dated memory files like `2026-02-06-project-discussion.md`
- Preserves important decisions and context between sessions
- Zero effort - just works in the background!

**Verify it's enabled:**
```bash
openclaw hooks list
```

You should see `💾 session-memory` with a checkmark.

---

### Step 8: Memory Enhancement (Optional)

Ask: **"Want to supercharge my memory? I have two optional upgrades that make me way more helpful:"**

---

#### 🧠 Supermemory - Cloud Long-term Memory (Official OpenClaw Plugin)

> ⚠️ **Requires Supermemory Pro or higher** - The OpenClaw plugin needs a paid plan.
> Free tier won't work. Check pricing at [supermemory.ai/pricing](https://supermemory.ai/pricing)

**What it does:**
Supermemory gives me persistent memory that survives across sessions. The official OpenClaw plugin handles everything automatically - zero manual work!

**Why you'll love it:**
- 📝 **Auto-Recall**: Before every response, I automatically pull relevant memories
- 🧩 **Auto-Capture**: After every conversation, memories are extracted and stored
- 🔄 **User Profile**: I build a persistent profile of your preferences and context
- 💡 **Zero effort**: Once set up, it just works in the background!

**Features unlocked:**
- `/remember [text]` - Manually save something to memory
- `/recall [query]` - Search your memories
- AI Tools: `supermemory_store`, `supermemory_search`, `supermemory_forget`, `supermemory_profile`
- CLI: `openclaw supermemory search/profile/wipe`

---

**Setup (2 minutes):**

**Step 1: Get your API key**
```
Go to console.supermemory.ai → API Keys → Create New Key
(Free tier: 1M tokens, 10K searches)
```

**Step 2: Install the plugin**
```bash
openclaw plugins install @supermemory/openclaw-supermemory
```

**Step 3: Enable with your API key**

Share your API key and I'll configure it:
```bash
openclaw config set plugins.entries.openclaw-supermemory.enabled true
openclaw config set plugins.entries.openclaw-supermemory.config.apiKey "sm_your_key_here"
```

Or add to `~/.openclaw/openclaw.json`:
```json
{
  "plugins": {
    "slots": {
      "memory": "openclaw-supermemory"
    },
    "entries": {
      "openclaw-supermemory": {
        "enabled": true,
        "config": {
          "apiKey": "sm_...",
          "autoRecall": true,
          "autoCapture": true,
          "maxRecallResults": 10
        }
      }
    }
  }
}
```

**Important:** The `plugins.slots.memory` setting tells OpenClaw to use Supermemory instead of the default memory-core plugin.

**Step 4: Restart OpenClaw**
```bash
openclaw gateway restart
```

**That's it!** Memory now works automatically across every conversation.

---

**🆓 Free Alternative: memory-lancedb (Local)**

If you don't want to pay for Supermemory Pro, use the built-in LanceDB plugin instead:

```json
{
  "plugins": {
    "slots": {
      "memory": "memory-lancedb"
    },
    "entries": {
      "memory-lancedb": {
        "enabled": true
      }
    }
  }
}
```

This gives you auto-recall and auto-capture locally (no cloud, no cost).

---

**What this enables:**
- I automatically remember your preferences, decisions, and context
- Before every response, I recall relevant past conversations
- After every chat, important info is captured for later
- "Remember that I prefer TypeScript over JavaScript" - auto-stored!
- "What did we decide about the database?" - auto-recalled!

---

#### 📚 QMD - Local Note Search (Optional - Skip if unsure)

**Note:** QMD is useful if you have lots of local markdown notes/docs you want to search. If you don't, skip this!

**What it does:**
QMD indexes your local markdown files so I can search through your notes and documentation.

**Only set this up if you:**
- Have a folder of markdown notes you want searchable
- Want me to reference your personal docs
- Skip this if you're just getting started

<details>
<summary>Click to expand QMD setup (optional)</summary>

**Prerequisites:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Setup:**
```bash
# Install QMD
bun install -g https://github.com/tobi/qmd

# Add your notes folder
qmd collection add ~/notes --name notes --mask "**/*.md"

# Index everything
qmd embed

# Test it
qmd search "your search query"
```

</details>

---

**The bottom line:**

| Feature | Without | With |
|---------|---------|------|
| mem0 + Qdrant | Agents forget everything between sessions | Agents have true long-term memory |
| Supermemory | Manual memory management | Auto-recall and auto-capture |
| QMD | I can only search the web | I can search YOUR personal knowledge base |

mem0 + Qdrant is **required** (Step 2). Supermemory and QMD are optional enhancements.

---

## 🔄 Agent-to-Agent Communication

Agents can talk to each other through the Mission Control feed using @mentions.

### How It Works

**Posting a mention:**
```bash
curl -X POST <BACKEND_URL>/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "agent_id": 1,
    "content": "Hey @Vegeta, I need you to review this PR: #42"
  }'
```

The backend parses `@AgentName` in the content and records which agents were mentioned.

**Checking your mentions:**
```bash
# Get messages where agent 2 (Vegeta) was mentioned
curl -s "<BACKEND_URL>/api/messages/mentions/2" \
  -H "x-api-key: <API_KEY>"
```

Returns messages where the specified agent was @mentioned.

**Real-time mention notifications (SSE):**
```bash
# Subscribe to real-time events
curl -N "<BACKEND_URL>/api/events"
```

Events emitted:
- `message:created` — New message posted
- `agent:mentioned` — An agent was @mentioned (includes agent_id and message)
- `task:updated` — Task status changed
- `agent:status` — Agent status changed (working/idle)

### Agent Heartbeat Mention Check

During heartbeats, agents should check their mentions:

```python
# In your agent's heartbeat routine:
def check_mentions(agent_id):
    response = requests.get(
        f"{BACKEND_URL}/api/messages/mentions/{agent_id}",
        headers={"x-api-key": API_KEY}
    )
    mentions = response.json()
    
    for mention in mentions:
        if not mention.get("acknowledged"):
            # Process the mention
            handle_mention(mention)
            
            # Acknowledge it (post a response)
            respond_to_mention(mention)
```

### Communication Patterns

**Task handoff:**
```
@Goku: Task #42 complete. @Vegeta please review the PR.
```

**Asking for help:**
```
@Piccolo: I'm designing the new auth system. What's the recommended architecture pattern?
```

**Status update:**
```
@Bulma: Infrastructure is ready. @Trunks you can proceed with deployment.
```

**Blocking issue:**
```
@Goku: I'm blocked on #45. Need @Gohan to complete the research first.
```

---

## 🙋 Human Tasks - When Agents Need Help

**When an agent is stuck and needs human action:**

Instead of just telling the user in chat, CREATE A TASK for them:

```bash
curl -X POST <BACKEND_URL>/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "title": "🙋 @{{HUMAN_NAME}}: [What you need]",
    "description": "I need your help with...\n\n**Why I am stuck:**\n[Explanation]\n\n**What I need you to do:**\n1. [Step 1]\n2. [Step 2]\n\n**Once done:**\nMove this task to Done and tell me to continue.",
    "status": "todo",
    "agent_id": null
  }'
```

**Then tell the human:**
```
I've hit a blocker that needs your help! 🙋

I created a task for you on the dashboard:
→ {{FRONTEND_URL}}

Check your To-Do column - there's a task tagged with your name.
Complete it and let me know when you're done!
```

**Examples of human tasks:**
- "🙋 @Adarsh: Approve this PR before I can merge"
- "🙋 @Adarsh: Add API key to Railway environment"
- "🙋 @Adarsh: Click the browser extension to enable web access"
- "🙋 @Adarsh: Review and sign off on this design"

**This makes it a TRUE TEAM:**
- Agents create tasks for humans
- Humans create tasks for agents
- Everyone works off the same board
- Nothing falls through the cracks

---

## Post-Setup: Configure Agent Behavior

After collecting all info, make these updates:

### 1. Create `scripts/update_dashboard.js`

See `templates/update_dashboard.js` - customize with their:
- Backend URL
- API Key
- Agent name→ID mapping for their theme

### 2. Update AGENTS.md

Add this section (customize for their theme):

```markdown
## 🎯 Claw Control Integration

**Dashboard:** {{FRONTEND_URL}}
**API:** {{BACKEND_URL}}

### Core Rules (NON-NEGOTIABLE)

1. **{{COORDINATOR}} = Coordinator ONLY**
   - Delegates tasks, never executes
   - Reviews and verifies work
   - Moves tasks to "completed" only after review

2. **ALL Tasks Through The Board**
   - No task is too small
   - Create task → Assign agent → Track progress → Review → Complete
   - Workflow: backlog → todo → in_progress → review → completed

3. **Quality Gate**
   - Only {{COORDINATOR}} can mark tasks complete
   - Work not up to standard → back to todo with feedback

### Agent Roster

| Agent | Role | Specialization |
|-------|------|----------------|
| {{COORDINATOR}} | Coordinator | Delegation, verification, user comms |
| {{BACKEND}} | Backend | APIs, databases, server code |
| {{DEVOPS}} | DevOps | Infrastructure, deployments, CI/CD |
| {{RESEARCH}} | Research | Analysis, documentation, research |
| {{ARCHITECTURE}} | Architecture | System design, planning, strategy |
| {{DEPLOYMENT}} | Deployment | Releases, hotfixes, urgent deploys |

### ⚡ High-Agency Protocol (ALL AGENTS)

Every agent follows this protocol BEFORE acting:

```
You are [ROLE] in a high-agency team. ALWAYS follow these rules BEFORE acting:

1. IDENTIFY subtasks and DELEGATE to relevant agents
   (e.g., "Delegate UI design to {{DEVOPS}}", "Delegate research to {{RESEARCH}}")

2. QUERY peers for input if uncertain
   (e.g., "Query {{ARCHITECTURE}}: Is this design sound?")

3. VERIFY outputs: After delegation, review responses and iterate if needed

4. COORDINATE via the supervisor ({{COORDINATOR}}/OpenClaw): Route all messages through Mission Control

Do NOT proceed alone—violate this and the task fails.
```

**Agent-Specific Adaptations:**
- **{{COORDINATOR}} (Coordinator):** Delegates ALL work, never executes. **ENFORCES team rules** — if any agent acts solo, pause and remind them to delegate/query/verify. **ENFORCES the Kanban board** — ALL work goes through the board, no exceptions. If work isn't tracked, stop and create the task first.
- **{{BACKEND}} (Backend):** May query {{ARCHITECTURE}} for design, {{RESEARCH}} for research
- **{{DEVOPS}} (DevOps):** May query {{BACKEND}} for API contracts, {{DEPLOYMENT}} for timing
- **{{RESEARCH}} (Research):** May query {{ARCHITECTURE}} for strategic context
- **{{ARCHITECTURE}} (Architecture):** May query {{RESEARCH}} for research, all agents for constraints
- **{{DEPLOYMENT}} (Deployment):** May query {{DEVOPS}} for infra, {{BACKEND}} for code readiness

### Reporting Protocol

**Start of task:**
```bash
node scripts/update_dashboard.js --agent "{{AGENT}}" --status "working" --message "Starting: [Task]"
```

**End of task:**
```bash
node scripts/update_dashboard.js --agent "{{AGENT}}" --status "idle" --message "Complete: [Task]"
```

### 🔥 Keep the Feed Active!

The Agent Feed is the heartbeat of your team. Don't let it go quiet!

**Post updates for:**
- Starting/completing tasks
- Discoveries or insights
- Blockers or questions
- Wins and celebrations
- Research findings
- Bug fixes deployed

**Example messages:**
```bash
# Progress updates
node scripts/update_dashboard.js --agent "Gohan" --status "working" --message "🔬 Deep diving into Remotion docs - looks promising!"

# Wins
node scripts/update_dashboard.js --agent "Bulma" --status "idle" --message "✅ CI/CD pipeline fixed! Deploys are green again 🚀"

# Insights
node scripts/update_dashboard.js --agent "Vegeta" --status "working" --message "⚡ Found a performance bottleneck - N+1 query in tasks endpoint"

# Blockers
node scripts/update_dashboard.js --agent "Piccolo" --status "working" --message "🚧 Blocked: Need API key for external service"
```

**Rule of thumb:** If it's worth doing, it's worth posting about. The feed keeps the human informed and the team connected!

### Task API

```bash
# Create task
curl -X POST $CLAW_CONTROL_URL/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CLAW_CONTROL_API_KEY" \
  -d '{"title": "Task name", "status": "backlog"}'

# Assign to agent
curl -X PUT $CLAW_CONTROL_URL/api/tasks/ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CLAW_CONTROL_API_KEY" \
  -d '{"status": "todo", "agent_id": AGENT_ID}'
```
```

### 3. Update SOUL.md (Optional but Recommended)

Add to their SOUL.md:

```markdown
## Operating Philosophy

I coordinate a team through Claw Control. I don't execute tasks directly.

**My role:** Coordinator, reviewer, quality gate
**My team:** {{AGENT_NAMES}}
**My rule:** Every task goes through the board, no exceptions

When given work:
1. Create task on Claw Control
2. Assign to appropriate specialist
3. Monitor progress
4. Review completed work
5. Only then mark complete
```

---

## ⚠️ CRITICAL: Setup Verification (DO THIS BEFORE COMPLETING!)

**Before saying setup is complete, you MUST verify everything works:**

### 1. Verify API Connection
```bash
curl -s <BACKEND_URL>/api/agents \
  -H "x-api-key: <API_KEY>"
```
✅ Should return list of agents with your theme names (not "Coordinator", "Backend" defaults)

### 2. Create "Team Introductions" Task
```bash
curl -X POST <BACKEND_URL>/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"title": "👋 Team Introductions", "description": "Introduce the team and explain how the system works.", "status": "completed", "agent_id": 1}'
```
✅ Should return the created task with an ID

### 3. Post Team Introduction to Feed

Post a comprehensive introduction message (customize with actual theme names):

```bash
curl -X POST <BACKEND_URL>/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "agent_id": 1,
    "content": "# 👋 Meet Your Team!\n\n## The Squad\n- **[Coordinator Name]** (me!) - Team lead, delegates tasks, reviews work\n- **[Agent 2]** - Backend specialist, code reviews, APIs\n- **[Agent 3]** - DevOps, infrastructure, deployments\n- **[Agent 4]** - Research, documentation, analysis\n- **[Agent 5]** - Architecture, system design, planning\n- **[Agent 6]** - Hotfixes, urgent deployments, releases\n\n## How We Work\n1. All tasks go through this board\n2. I delegate to the right specialist\n3. They do the work and report back\n4. I review and mark complete\n\n## Want More Agents?\nJust tell me: *\"I need a specialist for [X]\"* and I will create one!\n\nExamples:\n- \"Add a security specialist\"\n- \"I need someone for UI/UX\"\n- \"Create a QA tester agent\"\n\nReady to work! 🦞"
  }'
```
✅ Should return the created message

### 4. Verify mem0 + Qdrant
```bash
# Check Qdrant is running
curl -s http://localhost:6333/health
```
✅ Should return `{"status":"ok"}`

### 5. Ask User to Check Dashboard
```
I just completed the Team Introductions task! 

Please check your dashboard: <FRONTEND_URL>

You should see:
- ✅ Your themed agent names in the sidebar
- ✅ A "👋 Team Introductions" task marked complete
- ✅ A welcome message in the feed explaining your team

Can you confirm everything looks right?
```

**If ANY of these fail:**
- Check API_KEY is correct
- Check BACKEND_URL is correct
- Help user debug before proceeding

**Only proceed to completion message after user confirms dashboard shows the test task!**

---

## Completion Message

After all setup AND verification:

```
🦞 Claw Control Setup Complete!

Dashboard: {{FRONTEND_URL}}
Coordinator: {{COORDINATOR}}
Team: {{AGENT_LIST}}

✅ Task management configured
✅ Agent behavior updated
✅ mem0 + Qdrant running - agents have long-term memory!
✅ Session memory hook enabled - conversations auto-save!
{{#if browser}}✅ Browser access ready{{/if}}
{{#if github}}✅ GitHub integration ready{{/if}}
{{#if supermemory}}✅ Supermemory connected - cloud memory active!{{/if}}
{{#if qmd}}✅ QMD search ready - I can search your docs!{{/if}}

From now on, I operate as {{COORDINATOR}}:
- All tasks go through the board
- Specialists do the work
- I coordinate, review, and verify

Let's build something awesome! What's our first task?
```

---

## Ongoing Behavior Checklist

After setup, ALWAYS:

- [ ] Create tasks for ALL work (even small items)
- [ ] Assign tasks to appropriate specialists
- [ ] Update status when starting/finishing
- [ ] Review work before marking complete
- [ ] Post updates to the agent feed
- [ ] Never execute tasks as coordinator
- [ ] Check mentions during heartbeats

---

## 💓 Heartbeat Dashboard Sync & Auto-Update

**During every heartbeat, the coordinator should perform board hygiene AND system health checks:**

### Board Hygiene

**Check for Misplaced Tasks:**
```bash
# Fetch all tasks
curl -s <BACKEND_URL>/api/tasks -H "x-api-key: <API_KEY>"
```

**Look for:**
- Tasks stuck in "in_progress" with no recent activity
- Completed tasks that should be archived
- Tasks assigned to wrong agents (e.g., backend task assigned to DevOps)
- Tasks in "review" that have been waiting too long

**Fix Wrongly Placed Tasks:**
```bash
# Move task to correct column
curl -X PUT <BACKEND_URL>/api/tasks/ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"status": "correct_status", "agent_id": CORRECT_AGENT_ID}'
```

### Check Your Mentions
```bash
# Check if any agent mentioned you
curl -s "<BACKEND_URL>/api/messages/mentions/<your_agent_id>" \
  -H "x-api-key: <API_KEY>"
```

If you have unacknowledged mentions, respond to them!

### System Auto-Update Checks (2-3x Daily)

**1. Check for Claw Control updates:**
```bash
cd /path/to/claw-control
git fetch origin main
BEHIND=$(git rev-list HEAD..origin/main --count)
if [ "$BEHIND" -gt 0 ]; then
  echo "⚠️ Claw Control is $BEHIND commits behind. Consider updating."
  # Optionally auto-update:
  # git pull && docker compose up -d --build
fi
```

**2. Check DB migrations:**
Migrations run automatically on startup. If you notice schema errors, restart the app:
```bash
docker compose restart backend
# OR for local: npm run dev (restarts automatically)
```

**3. Check skill version:**
```bash
# Compare installed skill with latest
npx skills info adarshmishra07/claw-control
# If outdated:
npx skills add adarshmishra07/claw-control@latest
```

**4. Check mem0 + Qdrant health:**
```bash
curl -s http://localhost:6333/health
# Should return {"status":"ok"}
```

**5. Auto-fix missing components:**
If something is broken, fix it or create a task:
- Qdrant down? → Restart: `docker start qdrant`
- Migrations failed? → Check logs, restart backend
- Skill outdated? → Update: `npx skills add adarshmishra07/claw-control@latest`

### HEARTBEAT.md Template

Create this file in your workspace for the coordinator to follow:

```markdown
# HEARTBEAT.md - Coordinator Checklist

## Every Heartbeat (Every 30 min)
- [ ] Check board for stuck tasks
- [ ] Check my mentions and respond
- [ ] Fix any misplaced tasks

## 2-3x Daily
- [ ] Check if Claw Control needs updating (git fetch, compare commits)
- [ ] Verify Qdrant is healthy (curl health endpoint)
- [ ] Check for skill updates
- [ ] Look for orphan work (commits without task IDs)

## Auto-Fix Protocol
If something is broken:
1. Try to fix it automatically
2. If can't fix → Create a task for the right agent
3. If needs human → Create a 🙋 human task

## What to Post to Feed
- System health issues discovered
- Updates applied
- Orphan work found and retroactively logged
```

---

## 🔄 On Skill Update Behavior

When this skill is re-installed or updated (`npx skills add adarshmishra07/claw-control@latest`), the skill should:

### 1. Check What's Already Deployed

```bash
# Test if backend is reachable
curl -s <BACKEND_URL>/api/agents
```

**If deployed:**
- Read existing configuration from TOOLS.md
- Verify connection works
- Skip deployment steps

**If NOT deployed:**
- Guide through deployment (Step 1)

### 2. Identify Missing Components

Check each component:

| Component | How to Check | If Missing |
|-----------|--------------|------------|
| Backend deployed | `curl <BACKEND_URL>/api/agents` | Guide deployment |
| Agents seeded | Response has 6+ agents | Seed default agents |
| Theme applied | Agents have custom names | Ask for theme choice |
| mem0 + Qdrant | `curl localhost:6333/health` | Guide mem0 setup |
| Browser configured | `browser action=status` | Encourage setup |
| GitHub configured | Check TOOLS.md for token | Offer to configure |

### 3. Auto-Fix or Guide

**Auto-fix (do silently):**
- Update AGENTS.md with latest template sections
- Ensure dashboard scripts are present
- Update HEARTBEAT.md template

**Guide user through:**
- mem0 + Qdrant setup (if missing)
- Theme selection (if default names)
- Browser setup (if not configured)

### 4. Post-Update Summary

After skill update, post to feed:
```bash
curl -X POST <BACKEND_URL>/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "agent_id": 1,
    "content": "🔄 Skill updated to latest version!\n\n**Status:**\n- ✅ Backend connected\n- ✅ Agents configured\n- ✅ mem0 + Qdrant running\n- ⚠️ [List any missing components]\n\n**Action needed:** [If any]"
  }'
```

---

## Files

- `SKILL.md` - This file
- `templates/update_dashboard.js` - Status update script
- `references/themes.md` - Full theme character lists
