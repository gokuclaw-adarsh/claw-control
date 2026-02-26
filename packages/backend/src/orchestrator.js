/**
 * @fileoverview Orchestrator webhook intake + heartbeat patrol service.
 *
 * Features:
 * - Webhook intake with idempotency lock + dedupe key
 * - Retry with exponential backoff + dead-letter logging
 * - 15-minute heartbeat patrol across ALL tasks
 * - Backlog workflow prompting + staleness suppression
 * - Todo auto-claim + start execution (claim+spawn policy signal)
 * - Per-task run-lock + idempotent sessions_spawn trigger (M3)
 * - In-progress -> review handoff after spawn trigger
 * - Stale-task remediation + simple queue balancing
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { enforceReviewCompletionGate } = require('./review-gate');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

function parseTags(rowTags, isSQLite) {
  if (!rowTags) return [];
  if (!isSQLite && Array.isArray(rowTags)) return rowTags;
  if (Array.isArray(rowTags)) return rowTags;
  try {
    return JSON.parse(rowTags);
  } catch {
    return [];
  }
}

function computeDedupeKey(body, headerKey) {
  if (headerKey && String(headerKey).trim()) return String(headerKey).trim();
  if (body && typeof body.dedupeKey === 'string' && body.dedupeKey.trim()) {
    return body.dedupeKey.trim();
  }
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(body || {}));
  return hash.digest('hex');
}

function createOrchestratorService({ dbAdapter, fastify, param, broadcast, dispatchWebhook, onPatrolCycle }) {
  const config = {
    enabled: parseBoolEnv('ORCHESTRATOR_ENABLED', true),
    heartbeatEnabled: parseBoolEnv('ORCHESTRATOR_HEARTBEAT_ENABLED', true),
    heartbeatMinutes: parseIntEnv('ORCHESTRATOR_HEARTBEAT_MINUTES', 15),
    staleMinutes: parseIntEnv('ORCHESTRATOR_STALE_MINUTES', 120),
    backlogPromptMinutes: parseIntEnv('ORCHESTRATOR_BACKLOG_PROMPT_MINUTES', 30),
    lockTtlMs: parseIntEnv('ORCHESTRATOR_LOCK_TTL_MS', 10 * 60 * 1000),
    maxRetries: parseIntEnv('ORCHESTRATOR_MAX_RETRIES', 3),
    backoffBaseMs: parseIntEnv('ORCHESTRATOR_BACKOFF_BASE_MS', 500),
    backoffMaxMs: parseIntEnv('ORCHESTRATOR_BACKOFF_MAX_MS', 10_000),
    deadLetterPath: process.env.ORCHESTRATOR_DEAD_LETTER_PATH || path.resolve(process.cwd(), 'data', 'orchestrator-dead-letter.jsonl'),
    spawnEnabled: parseBoolEnv('ORCHESTRATOR_SPAWN_ENABLED', true),
    spawnUrl: process.env.ORCHESTRATOR_SESSIONS_SPAWN_URL || '',
    spawnAuthToken: process.env.ORCHESTRATOR_SESSIONS_SPAWN_TOKEN || '',
    spawnTimeoutMs: parseIntEnv('ORCHESTRATOR_SPAWN_TIMEOUT_MS', 12_000),
    spawnFallbackLocal: parseBoolEnv('ORCHESTRATOR_SPAWN_FALLBACK_LOCAL', true),
    orchestratorAgentId: parseIntEnv('ORCHESTRATOR_AGENT_ID', 1)
  };

  const locks = new Map();
  const processed = new Map();
  const taskRunLocks = new Map();
  let heartbeatTimer = null;

  async function ensureRunTable() {
    const nowType = dbAdapter.isSQLite() ? 'TEXT' : 'TIMESTAMP';
    const nowDefault = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
    const idType = dbAdapter.isSQLite() ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY';
    await dbAdapter.query(`
      CREATE TABLE IF NOT EXISTS orchestrator_task_runs (
        id ${idType},
        task_id INTEGER NOT NULL,
        agent_id INTEGER,
        trigger TEXT,
        idempotency_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'claimed',
        spawn_payload TEXT,
        spawn_response TEXT,
        last_error TEXT,
        created_at ${nowType} DEFAULT ${nowDefault},
        updated_at ${nowType} DEFAULT ${nowDefault},
        completed_at ${nowType}
      )
    `);
    await dbAdapter.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_orch_task_runs_idem ON orchestrator_task_runs(idempotency_key)');
    await dbAdapter.query('CREATE INDEX IF NOT EXISTS idx_orch_task_runs_task_id ON orchestrator_task_runs(task_id)');
  }

  function cleanupMaps() {
    const now = Date.now();
    for (const [k, expiry] of locks.entries()) {
      if (expiry <= now) locks.delete(k);
    }
    for (const [k, expiry] of processed.entries()) {
      if (expiry <= now) processed.delete(k);
    }
    for (const [k, expiry] of taskRunLocks.entries()) {
      if (expiry <= now) taskRunLocks.delete(k);
    }
  }

  async function writeDeadLetter(payload) {
    const dir = path.dirname(config.deadLetterPath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.appendFile(config.deadLetterPath, `${JSON.stringify(payload)}\n`, 'utf8');
  }

  async function withRetry(work, meta) {
    let attempt = 0;
    let lastErr = null;

    while (attempt < config.maxRetries) {
      attempt += 1;
      try {
        return await work(attempt);
      } catch (err) {
        lastErr = err;
        if (attempt >= config.maxRetries) break;
        const exp = Math.min(config.backoffBaseMs * (2 ** (attempt - 1)), config.backoffMaxMs);
        const jitter = Math.floor(Math.random() * Math.max(25, Math.floor(exp * 0.2)));
        await sleep(exp + jitter);
      }
    }

    await writeDeadLetter({
      ts: new Date().toISOString(),
      category: 'orchestrator-intake',
      meta,
      error: lastErr ? String(lastErr.message || lastErr) : 'Unknown error'
    });

    throw lastErr || new Error('Orchestrator intake failed');
  }

  async function addTaskComment(taskId, content, agentId = config.orchestratorAgentId) {
    const { rows } = await dbAdapter.query(
      `INSERT INTO task_comments (task_id, agent_id, content) VALUES (${param(1)}, ${param(2)}, ${param(3)}) RETURNING *`,
      [taskId, agentId, content]
    );

    const comment = rows[0];
    if (comment) {
      broadcast('comment-created', { task_id: Number(taskId), comment });
    }
  }

  async function postFeed(agentId, message) {
    const { rows } = await dbAdapter.query(
      `INSERT INTO agent_messages (agent_id, message) VALUES (${param(1)}, ${param(2)}) RETURNING *`,
      [agentId, message]
    );
    const msg = rows[0];
    if (msg) {
      broadcast('message-created', msg);
      dispatchWebhook('message-created', msg);
    }
  }

  async function updateTaskTags(task, tags) {
    const normalized = Array.from(new Set(tags.filter(Boolean)));
    const tagsValue = dbAdapter.isSQLite() ? JSON.stringify(normalized) : normalized;
    const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
    await dbAdapter.query(
      `UPDATE tasks SET tags = ${param(1)}, updated_at = ${nowFn} WHERE id = ${param(2)}`,
      [tagsValue, task.id]
    );
  }

  async function chooseLeastLoadedAgent() {
    const { rows } = await dbAdapter.query(
      `SELECT a.id,
              a.name,
              a.status,
              COALESCE(SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END), 0) as active_count
       FROM agents a
       LEFT JOIN tasks t ON t.agent_id = a.id
       WHERE a.status IN ('idle', 'working')
       GROUP BY a.id, a.name, a.status
       ORDER BY active_count ASC,
                CASE WHEN a.status = 'idle' THEN 0 ELSE 1 END ASC,
                a.id ASC`
    );
    return rows[0] || null;
  }

  async function handleBacklogTask(task, nowMs, staleCutoffMs, promptCutoffMs) {
    const updatedMs = new Date(task.updated_at).getTime();
    const tags = parseTags(task.tags, dbAdapter.isSQLite());

    const cleanTags = tags.filter(t => !['stale', 'escalated', 'blocked-stale'].includes(String(t).toLowerCase()));
    if (cleanTags.length !== tags.length) {
      await updateTaskTags(task, cleanTags);
    }

    if (updatedMs <= staleCutoffMs || updatedMs <= promptCutoffMs) {
      await addTaskComment(
        task.id,
        '🤖 Orchestrator heartbeat: backlog patrol check-in. Please provide **start signal** (or approval prompt) to begin this workflow. Staleness escalation is suppressed for backlog tasks by policy.',
        config.orchestratorAgentId
      );
    }

    return { action: 'backlog_prompted' };
  }

  async function claimTodoTask(task, selectedAgent) {
    const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
    const { rows } = await dbAdapter.query(
      `UPDATE tasks
       SET status = 'in_progress',
           agent_id = ${param(1)},
           updated_at = ${nowFn}
       WHERE id = ${param(2)} AND status = 'todo'
       RETURNING *`,
      [selectedAgent.id, task.id]
    );
    return rows[0] || null;
  }

  async function createOrGetRun(task, selectedAgent, trigger) {
    await ensureRunTable();
    const idem = `task:${task.id}:agent:${selectedAgent.id}:updated:${new Date(task.updated_at).getTime()}`;
    const payload = JSON.stringify({ task_id: task.id, agent_id: selectedAgent.id, trigger });
    const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';

    try {
      await dbAdapter.query(
        `INSERT INTO orchestrator_task_runs (task_id, agent_id, trigger, idempotency_key, status, spawn_payload)
         VALUES (${param(1)}, ${param(2)}, ${param(3)}, ${param(4)}, 'claimed', ${param(5)})`,
        [task.id, selectedAgent.id, trigger, idem, payload]
      );
    } catch (err) {
      const msg = String(err?.message || err);
      if (!msg.toLowerCase().includes('unique')) throw err;
    }

    const { rows } = await dbAdapter.query(
      `SELECT * FROM orchestrator_task_runs WHERE idempotency_key = ${param(1)} ORDER BY id DESC LIMIT 1`,
      [idem]
    );

    const run = rows[0] || null;
    return { run, idempotencyKey: idem };
  }

  async function updateRun(runId, status, patch = {}) {
    const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
    const cols = ['status = ' + param(1), `updated_at = ${nowFn}`];
    const params = [status];

    if (Object.prototype.hasOwnProperty.call(patch, 'spawn_response')) {
      cols.push(`spawn_response = ${param(params.length + 1)}`);
      params.push(patch.spawn_response);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'last_error')) {
      cols.push(`last_error = ${param(params.length + 1)}`);
      params.push(patch.last_error);
    }
    if (patch.complete === true) {
      cols.push(`completed_at = ${nowFn}`);
    }

    params.push(runId);
    await dbAdapter.query(
      `UPDATE orchestrator_task_runs SET ${cols.join(', ')} WHERE id = ${param(params.length)}`,
      params
    );
  }

  async function triggerSessionsSpawn(task, selectedAgent, run, trigger) {
    const lockKey = `task:${task.id}`;
    const now = Date.now();
    if (taskRunLocks.has(lockKey)) {
      return { ok: false, duplicate: true, reason: 'task-run-locked' };
    }
    taskRunLocks.set(lockKey, now + config.lockTtlMs);

    try {
      if (!config.spawnEnabled) {
        await updateRun(run.id, 'spawn_skipped_disabled', { complete: true });
        return { ok: false, skipped: true, reason: 'spawn-disabled' };
      }

      await updateRun(run.id, 'spawning');

      const requestPayload = {
        eventType: 'sessions_spawn',
        trigger,
        run_id: run.id,
        task: {
          id: task.id,
          title: task.title,
          description: task.description || '',
          context: task.context || '',
          status: task.status
        },
        agent: {
          id: selectedAgent.id,
          name: selectedAgent.name
        }
      };

      if (!config.spawnUrl) {
        if (config.spawnFallbackLocal) {
          const fallbackResponse = {
            accepted: true,
            mode: 'local-fallback',
            reason: 'ORCHESTRATOR_SESSIONS_SPAWN_URL not configured; accepting spawn in local fallback mode'
          };
          await updateRun(run.id, 'spawned', {
            spawn_response: JSON.stringify(fallbackResponse),
            complete: true
          });
          return { ok: true, responseStatus: 202, mode: 'local-fallback' };
        }

        await updateRun(run.id, 'spawn_queued_no_endpoint', {
          spawn_response: JSON.stringify({ accepted: false, reason: 'ORCHESTRATOR_SESSIONS_SPAWN_URL not configured' })
        });
        return { ok: false, skipped: true, reason: 'spawn-endpoint-missing' };
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-Dedupe-Key': `run:${run.id}`
      };
      if (config.spawnAuthToken) {
        headers.Authorization = `Bearer ${config.spawnAuthToken}`;
      }

      const resp = await fetch(config.spawnUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(config.spawnTimeoutMs)
      });

      const text = await resp.text();
      const normalizedResponse = JSON.stringify({ status: resp.status, ok: resp.ok, body: text.slice(0, 2000) });

      if (!resp.ok) {
        await updateRun(run.id, 'spawn_failed', { spawn_response: normalizedResponse, last_error: `HTTP ${resp.status}` });
        return { ok: false, reason: 'spawn-failed', status: resp.status };
      }

      await updateRun(run.id, 'spawned', { spawn_response: normalizedResponse, complete: true });
      return { ok: true, responseStatus: resp.status };
    } catch (err) {
      await updateRun(run.id, 'spawn_failed', { last_error: String(err?.message || err) });
      return { ok: false, reason: 'spawn-exception', error: String(err?.message || err) };
    } finally {
      taskRunLocks.delete(lockKey);
    }
  }

  async function moveClaimedTaskToReview(taskId) {
    const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
    const { rows } = await dbAdapter.query(
      `UPDATE tasks
       SET status = 'review',
           updated_at = ${nowFn}
       WHERE id = ${param(1)} AND status = 'in_progress'
       RETURNING *`,
      [taskId]
    );
    return rows[0] || null;
  }

  async function handleTodoTask(task, trigger = 'patrol') {
    const selectedAgent = await chooseLeastLoadedAgent();
    if (!selectedAgent) {
      await addTaskComment(
        task.id,
        '⚠️ Orchestrator heartbeat: no available idle/working agent for auto-claim. Queue balancing deferred to next patrol cycle.',
        config.orchestratorAgentId
      );
      return { action: 'todo_deferred_no_agent' };
    }

    const claimedTask = await claimTodoTask(task, selectedAgent);
    if (!claimedTask) {
      return { action: 'todo_already_changed' };
    }

    await addTaskComment(
      task.id,
      `🚀 Orchestrator auto-claim: assigned to **${selectedAgent.name}** (agent #${selectedAgent.id}) and moved to **in_progress**. Triggering sessions_spawn with idempotent run lock.`,
      config.orchestratorAgentId
    );

    broadcast('task-updated', claimedTask);
    dispatchWebhook('task-updated', claimedTask);
    await postFeed(config.orchestratorAgentId, `🧭 Orchestrator claimed task #${task.id} for ${selectedAgent.name}; status set to in_progress.`);

    const { run } = await createOrGetRun(claimedTask, selectedAgent, trigger);
    if (!run) {
      return { action: 'todo_claimed_no_run' };
    }

    if (!['claimed', 'spawning'].includes(String(run.status))) {
      await addTaskComment(task.id, `ℹ️ Orchestrator: skipped duplicate spawn for existing run #${run.id} (status: ${run.status}).`, config.orchestratorAgentId);
      return { action: 'todo_claimed_spawn_duplicate', agent_id: selectedAgent.id, run_id: run.id };
    }

    const spawnResult = await triggerSessionsSpawn(claimedTask, selectedAgent, run, trigger);
    if (!spawnResult.ok) {
      await addTaskComment(
        task.id,
        `⚠️ Orchestrator spawn trigger did not complete (${spawnResult.reason || 'unknown'}). Task remains **in_progress** for retry.`,
        config.orchestratorAgentId
      );
      await postFeed(config.orchestratorAgentId, `⚠️ Spawn trigger failed/skipped for task #${task.id}; run #${run.id}; reason=${spawnResult.reason || 'unknown'}.`);
      return { action: 'todo_claimed_spawn_failed', agent_id: selectedAgent.id, run_id: run.id };
    }

    const reviewTask = await moveClaimedTaskToReview(task.id);
    if (reviewTask) {
      await addTaskComment(task.id, '✅ sessions_spawn accepted. Task advanced from **in_progress** to **review** (awaiting execution output/adversarial review).', config.orchestratorAgentId);
      broadcast('task-updated', reviewTask);
      dispatchWebhook('task-updated', reviewTask);
      await postFeed(config.orchestratorAgentId, `✅ Spawn accepted for task #${task.id}; moved to review.`);
    }

    return {
      action: 'todo_claimed_spawned_review',
      agent_id: selectedAgent.id,
      run_id: run.id
    };
  }

  async function handleGenericStaleTask(task) {
    const tags = parseTags(task.tags, dbAdapter.isSQLite());
    const updated = Array.from(new Set([...tags, 'stale']));
    if (updated.length !== tags.length) {
      await updateTaskTags(task, updated);
    }

    await addTaskComment(
      task.id,
      `⚠️ Orchestrator stale-task remediation: task has not been updated recently while in **${task.status}**. Added stale marker and flagged for coordinator escalation/queue rebalance.`,
      2
    );

    return { action: 'stale_remediated' };
  }


  async function safeTask223Comment(content) {
    try {
      await addTaskComment(223, content, config.orchestratorAgentId);
    } catch {
      // no-op when task #223 does not exist in this environment
    }
  }

  function formatStructuredFailureComment(task, gateResult) {
    const checks = Array.isArray(gateResult?.checks) ? gateResult.checks : [];
    const payload = {
      type: 'review_gate_failure',
      task_id: task.id,
      task_status_before: task.status,
      actor: 'goku',
      checks,
      reason: gateResult?.reason || 'Review completion gate failed',
      at: new Date().toISOString()
    };

    const bulletChecks = checks.length > 0
      ? checks.map((check, index) => `${index + 1}. ${check}`).join('\n')
      : '1. Unknown gate failure.';

    return `❌ [M6][REVIEW-FAIL] Autonomous review failed for task #${task.id}.\n\n` +
      `**Gate checks failed:**\n${bulletChecks}\n\n` +
      '```json\n' + JSON.stringify(payload, null, 2) + '\n```';
  }

  async function handleReviewTask(task, trigger = 'patrol') {
    const updatedAtMs = new Date(task.updated_at).getTime();
    const lockKey = `review:${task.id}:${updatedAtMs}`;
    const now = Date.now();

    if (taskRunLocks.has(lockKey)) {
      return { action: 'review_skipped_locked' };
    }
    taskRunLocks.set(lockKey, now + config.lockTtlMs);

    try {
      const gate = await enforceReviewCompletionGate({
        dbAdapter,
        param,
        task,
        actorName: 'goku',
        autoBounce: true,
        reasonPrefix: '[AUTO-GATE][ORCH-M6]'
      });

      if (gate.ok) {
        const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
        const { rows } = await dbAdapter.query(
          `UPDATE tasks
           SET status = 'completed', updated_at = ${nowFn}
           WHERE id = ${param(1)} AND status = 'review'
           RETURNING *`,
          [task.id]
        );

        const completedTask = rows[0] || null;
        if (!completedTask) return { action: 'review_noop_changed' };

        await addTaskComment(
          task.id,
          '✅ [M6] Autonomous Goku review worker completed this task after passing review completion gate checks.',
          config.orchestratorAgentId
        );
        broadcast('task-updated', completedTask);
        dispatchWebhook('task-updated', completedTask);
        await postFeed(config.orchestratorAgentId, `✅ [M6] Review task #${task.id} passed gate checks and was auto-completed by Goku/coordinator.`);
        return { action: 'review_completed' };
      }

      const structuredFailureComment = formatStructuredFailureComment(task, gate);
      await addTaskComment(task.id, structuredFailureComment, config.orchestratorAgentId);

      let reassignedAgent = null;
      if (parseBoolEnv('ORCHESTRATOR_REVIEW_REASSIGN', false)) {
        const selectedAgent = await chooseLeastLoadedAgent();
        if (selectedAgent && Number(selectedAgent.id) !== Number(task.agent_id)) {
          const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
          const { rows: reassignedRows } = await dbAdapter.query(
            `UPDATE tasks
             SET agent_id = ${param(1)}, updated_at = ${nowFn}
             WHERE id = ${param(2)} AND status = 'todo'
             RETURNING *`,
            [selectedAgent.id, task.id]
          );
          if (reassignedRows[0]) {
            reassignedAgent = selectedAgent;
            broadcast('task-updated', reassignedRows[0]);
            dispatchWebhook('task-updated', reassignedRows[0]);
          }
        }
      }

      if (gate.bouncedTask) {
        broadcast('task-updated', gate.bouncedTask);
        dispatchWebhook('task-updated', gate.bouncedTask);
      }

      const reassignedMsg = reassignedAgent
        ? ` Reassigned to ${reassignedAgent.name} (agent #${reassignedAgent.id}).`
        : '';
      await postFeed(
        config.orchestratorAgentId,
        `❌ [M6] Review task #${task.id} failed gate checks and was moved back to TODO.${reassignedMsg}`
      );

      return {
        action: 'review_failed_bounced',
        reassigned_agent_id: reassignedAgent ? reassignedAgent.id : null
      };
    } finally {
      taskRunLocks.delete(lockKey);
    }
  }

  async function runHeartbeatPatrol(trigger = 'timer') {
    if (!config.enabled || !config.heartbeatEnabled) {
      return { success: true, skipped: true, reason: 'disabled' };
    }

    await safeTask223Comment(`🟦 [M6] Patrol start (${trigger}) at ${new Date().toISOString()}.`);
    await postFeed(config.orchestratorAgentId, `🟦 [M6] Autonomous review patrol started (trigger=${trigger}).`);

    const { rows: tasks } = await dbAdapter.query(
      `SELECT id, title, description, context, status, tags, updated_at, agent_id, deliverable_type, deliverable_content FROM tasks ORDER BY id ASC`
    );

    const nowMs = Date.now();
    const staleCutoffMs = nowMs - (config.staleMinutes * 60 * 1000);
    const promptCutoffMs = nowMs - (config.backlogPromptMinutes * 60 * 1000);

    const summary = {
      trigger,
      scanned: tasks.length,
      backlog_prompted: 0,
      todo_claimed_spawned_review: 0,
      review_completed: 0,
      review_failed_bounced: 0,
      stale_remediated: 0,
      deferred: 0
    };

    for (const task of tasks) {
      if (task.status === 'backlog') {
        const result = await handleBacklogTask(task, nowMs, staleCutoffMs, promptCutoffMs);
        if (result.action === 'backlog_prompted') summary.backlog_prompted += 1;
        continue;
      }

      if (task.status === 'todo') {
        const result = await handleTodoTask(task, trigger);
        if (result.action === 'todo_claimed_spawned_review') summary.todo_claimed_spawned_review += 1;
        else summary.deferred += 1;
        continue;
      }

      if (task.status === 'review') {
        const result = await handleReviewTask(task, trigger);
        if (result.action === 'review_completed') summary.review_completed += 1;
        else if (result.action === 'review_failed_bounced') summary.review_failed_bounced += 1;
        continue;
      }

      const updatedMs = new Date(task.updated_at).getTime();
      if (updatedMs <= staleCutoffMs && ['in_progress'].includes(task.status)) {
        await handleGenericStaleTask(task);
        summary.stale_remediated += 1;
      }
    }

    await safeTask223Comment(`🟩 [M6] Patrol end (${trigger}). Summary: ${JSON.stringify(summary)}`);
    await postFeed(
      config.orchestratorAgentId,
      `🟩 [M6] Autonomous review patrol complete. scanned=${summary.scanned}, review_completed=${summary.review_completed}, review_failed_bounced=${summary.review_failed_bounced}.`
    );

    fastify.log.info({ summary }, '[orchestrator] Heartbeat patrol complete');

    // Report patrol cycle to observability layer
    if (typeof onPatrolCycle === 'function') {
      try {
        await onPatrolCycle({
          lastRunAt: new Date().toISOString(),
          tasksScannedCount: summary.scanned,
          backlogPendingCount: summary.backlog_prompted,
          todoAutoPickedCount: summary.todo_claimed_spawned_review,
          staleTaskAlerts: summary.stale_remediated,
          reviewCompleted: summary.review_completed,
          reviewBouncedCount: summary.review_failed_bounced,
          decisions: []
        });
      } catch (err) {
        fastify.log.error({ err }, '[orchestrator] onPatrolCycle callback failed');
      }
    }

    return { success: true, ...summary };
  }

  async function handleWebhookIntake({ headers = {}, body = {} }) {
    cleanupMaps();

    const dedupeKey = computeDedupeKey(body, headers['x-dedupe-key']);
    const now = Date.now();

    if (processed.has(dedupeKey)) {
      return {
        success: true,
        dedupeKey,
        duplicate: true,
        message: 'Event already processed'
      };
    }

    if (locks.has(dedupeKey)) {
      return {
        success: true,
        dedupeKey,
        duplicate: true,
        message: 'Event currently processing'
      };
    }

    locks.set(dedupeKey, now + config.lockTtlMs);

    try {
      const eventType = body.eventType || body.type || 'heartbeat.patrol';
      const result = await withRetry(async () => {
        if (eventType === 'heartbeat.patrol' || eventType === 'orchestrator.heartbeat') {
          return runHeartbeatPatrol(`webhook:${eventType}`);
        }

        // Default action for intake events in M3: run a full patrol scan.
        return runHeartbeatPatrol(`webhook:${eventType}`);
      }, { dedupeKey, eventType });

      processed.set(dedupeKey, Date.now() + config.lockTtlMs);
      return {
        success: true,
        dedupeKey,
        duplicate: false,
        result
      };
    } finally {
      locks.delete(dedupeKey);
    }
  }

  async function getTaskRuns(taskId) {
    await ensureRunTable();
    const { rows } = await dbAdapter.query(
      `SELECT * FROM orchestrator_task_runs WHERE task_id = ${param(1)} ORDER BY id DESC LIMIT 20`,
      [taskId]
    );
    return rows;
  }

  async function simulateE2EFlow({ taskTitle = '[E2E] orchestrator flow simulation' } = {}) {
    const nowFn = dbAdapter.isSQLite() ? "datetime('now')" : 'NOW()';
    const { rows: createdRows } = await dbAdapter.query(
      `INSERT INTO tasks (title, description, status, created_at, updated_at)
       VALUES (${param(1)}, ${param(2)}, 'todo', ${nowFn}, ${nowFn})
       RETURNING *`,
      [taskTitle, 'Synthetic task created by orchestrator e2e simulation endpoint']
    );

    const created = createdRows[0];
    const patrolResult = await runHeartbeatPatrol('manual:e2e');
    const { rows: refreshedRows } = await dbAdapter.query(
      `SELECT * FROM tasks WHERE id = ${param(1)} LIMIT 1`,
      [created.id]
    );
    const refreshed = refreshedRows[0] || created;
    const runs = await getTaskRuns(created.id);

    return {
      created_task_id: created.id,
      final_status: refreshed.status,
      patrol: patrolResult,
      runs,
      note: 'If ORCHESTRATOR_SESSIONS_SPAWN_URL is unset, run status will show spawn_queued_no_endpoint.'
    };
  }

  function startHeartbeat() {
    if (!config.enabled || !config.heartbeatEnabled) return;
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    const ms = Math.max(1, config.heartbeatMinutes) * 60 * 1000;
    heartbeatTimer = setInterval(() => {
      runHeartbeatPatrol('timer').catch(err => {
        fastify.log.error({ err }, '[orchestrator] Heartbeat patrol failed');
      });
    }, ms);

    if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();
    fastify.log.info(`[orchestrator] Heartbeat enabled every ${config.heartbeatMinutes}m`);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  return {
    config,
    startHeartbeat,
    stopHeartbeat,
    runHeartbeatPatrol,
    handleWebhookIntake,
    getTaskRuns,
    simulateE2EFlow
  };
}

module.exports = {
  createOrchestratorService
};