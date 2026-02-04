# Contributing to Claw Control

First off, thanks for taking the time to contribute! 🦞

This document provides guidelines for contributing to Claw Control. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How Can I Contribute?](#how-can-i-contribute)
- [Pull Request Process](#pull-request-process)
- [Style Guides](#style-guides)
- [Project Structure](#project-structure)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive environment. Be respectful, be kind, and help us build something great together.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/claw-control.git
   cd claw-control
   ```

3. **Set up the backend (SQLite - easiest)**
   ```bash
   cd packages/backend
   npm install
   echo "DATABASE_URL=sqlite:./data/claw-control.db" > .env
   npm run migrate
   npm start
   ```

4. **Set up the frontend (in a new terminal)**
   ```bash
   cd packages/frontend
   npm install
   echo "VITE_API_URL=http://localhost:3001" > .env
   npm run dev
   ```

5. **Verify it works** - Visit `http://localhost:5173`

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:
- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment** (OS, Node version, browser)

### Suggesting Features

Feature requests are welcome! Please:
- **Check existing issues** first
- **Describe the problem** you're trying to solve
- **Propose a solution** if you have one
- **Consider the scope** - does this fit the project's goals?

### Your First Code Contribution

Not sure where to start? Look for issues labeled:
- `good first issue` - Simple issues for newcomers
- `help wanted` - Issues we'd love help with

### Pull Requests

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our [style guides](#style-guides)

3. **Test your changes** thoroughly

4. **Commit your changes**:
   ```bash
   git commit -m "feat: add awesome new feature"
   # or
   git commit -m "fix: resolve issue with task updates"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub

## Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using keywords like "Fixes #123"
3. **Ensure CI passes** (linting, tests if applicable)
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash commits** if requested before merge

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Code style (formatting, semicolons, etc) |
| `refactor:` | Code change that neither fixes nor adds |
| `perf:` | Performance improvement |
| `test:` | Adding or fixing tests |
| `chore:` | Build process or auxiliary tools |

Examples:
- `feat: add dark mode toggle`
- `fix: resolve SSE connection drops`
- `docs: update API documentation`

## Style Guides

### Git Commit Messages

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues and PRs liberally after the first line

### TypeScript/JavaScript

**Frontend (TypeScript + React):**
- Run `npm run lint` before committing
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use named exports over default exports

```typescript
// ✅ Good
export function TaskCard({ task }: TaskCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  return <div>...</div>;
}

// ❌ Avoid
export default class TaskCard extends Component { ... }
```

**Backend (JavaScript):**
- Use ES modules (`import`/`export`)
- Prefer `async/await` over callbacks
- Add JSDoc comments for public functions

```javascript
// ✅ Good
/**
 * Creates a new task in the database
 * @param {Object} task - Task data
 * @returns {Promise<Object>} Created task
 */
export async function createTask(task) {
  // ...
}
```

### CSS/Styling

- Use TailwindCSS utility classes
- Follow the existing color scheme (`cyber-green`, `cyber-blue`, etc.)
- Keep components responsive (mobile-first)

```jsx
// ✅ Good - uses Tailwind utilities
<div className="bg-cyber-dark p-4 rounded-lg border border-cyber-green/20">

// ❌ Avoid - inline styles
<div style={{ backgroundColor: '#1a1a2e', padding: '16px' }}>
```

## Project Structure

```
claw-control/
├── packages/
│   ├── frontend/          # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom hooks
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   │
│   └── backend/           # Fastify + SQLite/PostgreSQL
│       ├── src/
│       │   ├── server.js    # Main API server
│       │   └── db-adapter.js # DB abstraction layer
│       └── package.json
│
├── config/                # Configuration files
│   └── agents.yaml        # Agent definitions
│
├── .prettierrc           # Code formatting
├── CONTRIBUTING.md       # This file!
└── README.md
```

### Key Files

| File | Purpose |
|------|---------|
| `packages/backend/src/server.js` | Main API routes and SSE |
| `packages/backend/src/db-adapter.js` | Database abstraction |
| `packages/frontend/src/App.tsx` | Root React component |
| `packages/frontend/src/components/` | UI components |

## Questions?

Feel free to:
- Open a [GitHub Discussion](https://github.com/gokuclaw-adarsh/claw-control/discussions)
- Check existing issues for similar questions
- Ask in your PR if something is unclear

---

Thank you for contributing! 🎉
