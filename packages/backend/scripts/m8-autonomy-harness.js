#!/usr/bin/env node
/* eslint-disable no-console */

const baseUrl = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const apiKey = process.env.API_KEY || '';
const feedAgentId = Number(process.env.FEED_AGENT_ID || '1');

const runTag = `m8-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;

/** @type {{name:string, ok:boolean, detail?:string}[]} */
const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
}

function authHeaders(extra = {}) {
  const headers = {
    'content-type': 'application/json',
    ...extra
  };
  if (apiKey) headers['x-api-key'] = apiKey;
  return headers;
}

async function api(method, path, body, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: authHeaders(headers),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { res, data };
}

async function createTask(title) {
  const { res, data } = await api('POST', '/api/tasks', {
    title,
    description: `Autonomy harness task ${runTag}`,
    status: 'todo'
  });
  if (!res.ok) throw new Error(`Create task failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function moveTask(id, payload, actorName) {
  const { res, data } = await api('PUT', `/api/tasks/${id}`, payload, actorName ? { 'x-actor-name': actorName } : {});
  return { ok: res.ok, statusCode: res.status, data };
}

async function addComment(id, content, agentId = 1) {
  const { res, data } = await api('POST', `/api/tasks/${id}/comments`, { content, agent_id: agentId });
  return { ok: res.ok, data };
}

async function getComments(id) {
  const { res, data } = await api('GET', `/api/tasks/${id}/comments`);
  if (!res.ok) throw new Error(`Get comments failed (${res.status})`);
  return Array.isArray(data) ? data : [];
}

async function getTask(id) {
  const { res, data } = await api('GET', `/api/tasks/${id}`);
  if (!res.ok) throw new Error(`Get task ${id} failed (${res.status})`);
  return data;
}

async function postFeed(message) {
  const { res, data } = await api('POST', '/api/messages', {
    agent_id: feedAgentId,
    message
  });
  return { ok: res.ok, data };
}

async function getFeed(limit = 100) {
  const { res, data } = await api('GET', `/api/messages?limit=${limit}`);
  if (!res.ok) throw new Error(`Get feed failed (${res.status})`);
  return Array.isArray(data) ? data : [];
}

async function run() {
  const startedAt = Date.now();
  console.log(`\n[M8] Autonomy harness start`);
  console.log(`- baseUrl: ${baseUrl}`);
  console.log(`- runTag:  ${runTag}\n`);

  // SUCCESS PATH: todo -> in_progress -> review -> completed
  const successTask = await createTask(`[M8][success] ${runTag}`);
  record('create success-path task in todo', successTask.status === 'todo', `taskId=${successTask.id}`);

  await addComment(successTask.id, `[M8] success path initialized (${runTag})`);

  const s1 = await moveTask(successTask.id, { status: 'in_progress' });
  record('success path moved to in_progress', s1.ok && s1.data?.status === 'in_progress', `status=${s1.data?.status}`);

  const s2 = await moveTask(successTask.id, {
    status: 'review',
    deliverable_type: 'document',
    deliverable_content: `M8 success deliverable (${runTag})`
  });
  record('success path moved to review with deliverable', s2.ok && s2.data?.status === 'review', `status=${s2.data?.status}`);

  const s3 = await moveTask(successTask.id, { status: 'completed' }, 'Goku');
  record('success path moved to completed by coordinator actor', s3.ok && s3.data?.status === 'completed', `status=${s3.data?.status}`);

  const successFinal = await getTask(successTask.id);
  record('success path final status is completed', successFinal.status === 'completed', `status=${successFinal.status}`);

  // FAILURE PATH: review -> completed denied -> bounced to todo
  const failTask = await createTask(`[M8][fail] ${runTag}`);
  record('create fail-path task in todo', failTask.status === 'todo', `taskId=${failTask.id}`);

  const f1 = await moveTask(failTask.id, { status: 'in_progress' });
  record('fail path moved to in_progress', f1.ok && f1.data?.status === 'in_progress', `status=${f1.data?.status}`);

  const f2 = await moveTask(failTask.id, {
    status: 'review',
    deliverable_type: 'document',
    deliverable_content: `M8 fail-path deliverable (${runTag})`
  });
  record('fail path moved to review', f2.ok && f2.data?.status === 'review', `status=${f2.data?.status}`);

  const f3 = await moveTask(failTask.id, { status: 'completed' }, 'Bulma');
  const bouncedStatus = f3.data?.task?.status;
  record('fail path completion denied with 400', !f3.ok && f3.statusCode === 400, `code=${f3.statusCode}`);
  record('fail path bounced to todo', bouncedStatus === 'todo', `bouncedStatus=${bouncedStatus || 'n/a'}`);

  const failComments = await getComments(failTask.id);
  const hasAutoGateComment = failComments.some(c => String(c.content || '').includes('[AUTO-GATE]'));
  record('fail path writes AUTO-GATE remediation comment', hasAutoGateComment, `comments=${failComments.length}`);

  // COMMENTS + FEED confirmation
  const commentContent = `[M8] comment verification ${runTag}`;
  await addComment(successTask.id, commentContent);
  const successComments = await getComments(successTask.id);
  const hasComment = successComments.some(c => String(c.content || '').includes(commentContent));
  record('task comments endpoint reflects latest comment', hasComment, `comments=${successComments.length}`);

  const feedMessage = `[M8] harness feed update ${runTag} :: successTask=${successTask.id} failTask=${failTask.id}`;
  const feedPost = await postFeed(feedMessage);
  record('feed message posted', feedPost.ok, `messageId=${feedPost.data?.id || 'n/a'}`);

  const feed = await getFeed(100);
  const hasFeedEntry = feed.some(m => String(m.message || '').includes(runTag));
  record('feed list contains posted update', hasFeedEntry, `feedItemsChecked=${feed.length}`);

  const passed = checks.filter(c => c.ok).length;
  const failed = checks.length - passed;
  const elapsedMs = Date.now() - startedAt;

  console.log('=== M8 HARNESS RESULTS ===');
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'} | ${c.name}${c.detail ? ` | ${c.detail}` : ''}`);
  }
  console.log('--------------------------');
  console.log(`tasks.created.success=${successTask.id}`);
  console.log(`tasks.created.fail=${failTask.id}`);
  console.log(`metrics.total=${checks.length}`);
  console.log(`metrics.pass=${passed}`);
  console.log(`metrics.fail=${failed}`);
  console.log(`metrics.duration_ms=${elapsedMs}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('M8 harness fatal error:', err?.stack || err?.message || String(err));
  process.exit(1);
});
