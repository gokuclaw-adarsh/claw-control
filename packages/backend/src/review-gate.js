/**
 * Shared review completion gate logic.
 */

function getActorName(request) {
  if (!request || !request.headers) return null;
  const headerCandidates = [
    request.headers['x-actor-name'],
    request.headers['x-agent-name'],
    request.headers['x-user-name'],
    request.headers['x-requested-by']
  ];

  const actor = headerCandidates.find(v => typeof v === 'string' && v.trim().length > 0);
  return actor ? actor.trim() : null;
}

function isCoordinatorActor(actorName) {
  if (!actorName) return false;
  const normalized = actorName.trim().toLowerCase();
  return normalized === 'goku' || normalized === 'coordinator';
}

async function bounceTaskToTodo({ dbAdapter, param, taskId, reason }) {
  const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';

  const { rows } = await dbAdapter.query(
    `UPDATE tasks
     SET status = 'todo', updated_at = ${nowFn}
     WHERE id = ${param(1)}
     RETURNING *`,
    [taskId]
  );

  const task = rows[0] || null;

  await dbAdapter.query(
    `INSERT INTO task_comments (task_id, agent_id, content)
     VALUES (${param(1)}, ${param(2)}, ${param(3)})`,
    [taskId, null, reason]
  );

  return task;
}

async function enforceReviewCompletionGate({
  dbAdapter,
  param,
  task,
  actorName,
  pendingDeliverableType,
  pendingDeliverableContent,
  autoBounce = true,
  reasonPrefix = '[AUTO-GATE]'
}) {
  const checks = [];

  if (!isCoordinatorActor(actorName)) {
    checks.push(`Only Goku/coordinator can move review -> completed (actor: ${actorName || 'unknown'}).`);
  }

  const effectiveDeliverableType = pendingDeliverableType ?? task.deliverable_type;
  const effectiveDeliverableContent = pendingDeliverableContent ?? task.deliverable_content;

  if (!effectiveDeliverableType || !effectiveDeliverableContent) {
    checks.push('Deliverable is missing (deliverable_type and deliverable_content are required).');
  }

  const { rows: subtaskStats } = await dbAdapter.query(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
     FROM subtasks
     WHERE task_id = ${param(1)}`,
    [task.id]
  );

  const totalSubtasks = parseInt(subtaskStats[0]?.total || 0, 10);
  const doneSubtasks = parseInt(subtaskStats[0]?.done || 0, 10);

  if (totalSubtasks > 0 && doneSubtasks < totalSubtasks) {
    checks.push(`Subtasks incomplete (${doneSubtasks}/${totalSubtasks} done).`);
  }

  if (checks.length === 0) {
    return { ok: true, checks: [] };
  }

  const reason = `${reasonPrefix} Review -> completed denied. Task moved back to TODO. Reasons: ${checks.join(' ')}`;

  if (!autoBounce) {
    return { ok: false, checks, reason, bouncedTask: null };
  }

  const bouncedTask = await bounceTaskToTodo({ dbAdapter, param, taskId: task.id, reason });
  return { ok: false, checks, reason, bouncedTask };
}

module.exports = {
  getActorName,
  isCoordinatorActor,
  bounceTaskToTodo,
  enforceReviewCompletionGate
};
