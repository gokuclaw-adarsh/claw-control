/**
 * @fileoverview Orchestrator webhook intake + heartbeat patrol service.
 *
 * Features:
 * - Webhook intake with idempotency lock + dedupe key
 * - Retry with exponential backoff + dead-letter logging
 * - 15-minute heartbeat patrol across ALL tasks
 * - Backlog workflow prompting + staleness suppression
 * - Todo auto-claim + start execution (claim+spawn policy signal)
 * - Stale-task remediation + simple queue balancing
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function createOrchestratorService({ dbAdapter, fastify, param, broadcast, dispatchWebhook }) {
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
    deadLetterPath: process.env.ORCHESTRATOR_DEAD_LETTER_PATH || path.resolve(process.cwd(), 'data', 'orchestrator-dead-letter.jsonl')
  };

  const locks = new Map();
  const processed = new Map();
  let heartbeatTimer = null;

  function cleanupMaps() {
    const now = Date.now();
    for (const [k, expiry] of locks.entries()) {
      if (expiry <= now) locks.delete(k);
    }
    for (const [k, expiry] of processed.entries()) {
      if (expiry <= now) processed.delete(k);
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

  async function addTaskComment(taskId, content, agentId = 2) {
    await dbAdapter.query(
      `INSERT INTO task_comments (task_id, agent_id, content) VALUES (${param(1)}, ${param(2)}, ${param(3)})`,
      [taskId, agentId, content]
    );
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
        2
      );
    }

    return { action: 'backlog_prompted' };
  }

  async function handleTodoTask(task) {
    const selectedAgent = await chooseLeastLoadedAgent();
    if (!selectedAgent) {
      await addTaskComment(
        task.id,
        '⚠️ Orchestrator heartbeat: no available idle/working agent for auto-claim. Queue balancing deferred to next patrol cycle.',
        2
      );
      return { action: 'todo_deferred_no_agent' };
    }

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

    if (!rows.length) {
      return { action: 'todo_already_changed' };
    }

    const claimedTask = rows[0];
    await addTaskComment(
      task.id,
      `🚀 Orchestrator heartbeat auto-claim: assigned to **${selectedAgent.name}** (agent #${selectedAgent.id}) and moved to **in_progress**. Claim+spawn policy: execution should be spawned immediately by coordinator rules.`,
      2
    );

    broadcast('task-updated', claimedTask);
    dispatchWebhook('task-updated', claimedTask);

    return { action: 'todo_claimed_started', agent_id: selectedAgent.id };
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

  async function runHeartbeatPatrol(trigger = 'timer') {
    if (!config.enabled || !config.heartbeatEnabled) {
      return { success: true, skipped: true, reason: 'disabled' };
    }

    const { rows: tasks } = await dbAdapter.query(
      `SELECT id, title, status, tags, updated_at, agent_id FROM tasks ORDER BY id ASC`
    );

    const nowMs = Date.now();
    const staleCutoffMs = nowMs - (config.staleMinutes * 60 * 1000);
    const promptCutoffMs = nowMs - (config.backlogPromptMinutes * 60 * 1000);

    const summary = {
      trigger,
      scanned: tasks.length,
      backlog_prompted: 0,
      todo_claimed_started: 0,
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
        const result = await handleTodoTask(task);
        if (result.action === 'todo_claimed_started') summary.todo_claimed_started += 1;
        else summary.deferred += 1;
        continue;
      }

      const updatedMs = new Date(task.updated_at).getTime();
      if (updatedMs <= staleCutoffMs && ['in_progress', 'review'].includes(task.status)) {
        await handleGenericStaleTask(task);
        summary.stale_remediated += 1;
      }
    }

    fastify.log.info({ summary }, '[orchestrator] Heartbeat patrol complete');
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

        // Default action for intake events in M2: run a full patrol scan.
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
    handleWebhookIntake
  };
}

module.exports = {
  createOrchestratorService
};