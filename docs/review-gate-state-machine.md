# Review Gate + Auto-Pick State-Machine Compatibility

This milestone aligns review/completion controls with heartbeat auto-pick patrol behavior.

## Workflow State Machine

`backlog -> todo -> in_progress -> review -> completed`

### Guardrails

1. **`in_progress -> review` requires deliverable**
   - `deliverable_type` and `deliverable_content` must be present.

2. **`review -> completed` requires review gate pass**
   - Actor must be `Goku` or `coordinator` (via request header identity).
   - Deliverable must exist.
   - All subtasks must be `done` when subtasks exist.

3. **Gate failure behavior (auto-bounce)**
   - Attempted `review -> completed` that fails checks is automatically moved to `todo`.
   - System adds explicit task comment with denial reasons.

## Backlog/Todo Patrol Compatibility (Auto-Pick)

The `GET /api/agents/:id/next-task` endpoint is the auto-pick patrol source:

- Returns only `status='todo'` tasks.
- Excludes `review` and `completed` by design.
- Before returning next `todo`, scans assigned `review` tasks for staleness.

## Stale Review Remediation

When a task remains in `review` beyond threshold (`REVIEW_STALE_HOURS`, default `24`):

- System posts one remediation comment per stale review item:
  - prefix: `[AUTO-REMEDIATE] Stale review item detected...`
  - action guidance: complete pending subtasks, refresh deliverable evidence, request Goku/coordinator finalization.
- Duplicate comments are prevented via prefix check.

## Why This Is Compatible

- Auto-pick remains focused on executable work (`todo`).
- Review queue is still monitored via remediation comments, not silently ignored.
- Failed review completion attempts are pushed back into `todo`, making them visible to patrol again.
