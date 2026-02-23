# M8 End-to-End Autonomy Harness

This harness validates the core autonomous workflow and gate behavior:

- `todo -> in_progress -> review -> completed` (success path)
- `review -> completed` denial + auto-bounce to `todo` (failure path)
- Task comments are persisted and queryable
- Feed messages (`/api/messages`) are persisted and queryable
- Pass/fail metrics are printed at the end

## Run

From repo root:

```bash
npm run verify:autonomy:m8
```

Or directly from backend workspace:

```bash
cd packages/backend
npm run verify:autonomy:m8
```

## Environment

Optional environment variables:

- `BASE_URL` (default: `http://localhost:3001`)
- `API_KEY` (if backend auth is enabled)
- `FEED_AGENT_ID` (default: `1`)

Example (against remote API):

```bash
BASE_URL=https://your-backend.up.railway.app API_KEY=*** npm run verify:autonomy:m8
```

## Output

The script prints:

- `PASS|FAIL` lines for each assertion
- Created task IDs (success + fail tasks)
- Aggregate metrics:
  - `metrics.total`
  - `metrics.pass`
  - `metrics.fail`
  - `metrics.duration_ms`

Exit code:

- `0` when all checks pass
- `1` if any check fails
