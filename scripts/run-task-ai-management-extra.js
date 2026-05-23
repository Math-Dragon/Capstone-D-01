const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const reportPath = path.join(docsDir, 'task-ai-management-tc08-tc12-run-report.md');

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
const password = process.env.TEST_PASSWORD || 'Testing123!';

const state = {
  userA: { token: null, email: null },
  userB: { token: null, email: null },
  goalId: null,
  protectedTaskId: null,
  coachTaskId: null,
  skipTaskId: null,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function apiDateString(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return new Date(value).toISOString().slice(0, 10);
}

async function request(method, endpoint, body, token = state.userA.token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    payload,
  };
}

async function requestWithRateLimitRetry(method, endpoint, body, token = state.userA.token) {
  const first = await request(method, endpoint, body, token);
  if (first.status !== 429) return first;

  const retryAfterSeconds = Number(first.payload?.error?.retryAfterSeconds || 5);
  await sleep((retryAfterSeconds + 1) * 1000);
  return request(method, endpoint, body, token);
}

async function must(method, endpoint, body, token) {
  const res = await request(method, endpoint, body, token);
  if (!res.ok) {
    const err = new Error(res.payload?.error?.message || res.payload?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = res.payload;
    throw err;
  }
  return res.payload;
}

function pass(id, name, evidence) {
  return { id, name, status: 'PASS', evidence };
}

function warn(id, name, evidence) {
  return { id, name, status: 'WARN', evidence };
}

function fail(id, name, evidence) {
  return { id, name, status: 'FAIL', evidence };
}

async function registerAndLogin(label) {
  const email = `tc08-tc12-${label}-${Date.now()}@example.com`;
  const register = await requestWithRateLimitRetry('POST', '/auth/register', { email, password }, null);
  if (!register.ok) {
    throw new Error(`Register ${label} failed: ${register.status} ${JSON.stringify(register.payload)}`);
  }
  const login = await requestWithRateLimitRetry('POST', '/auth/login', { email, password }, null);
  if (!login.ok) {
    throw new Error(`Login ${label} failed: ${login.status} ${JSON.stringify(login.payload)}`);
  }
  return { email, token: login.payload.data.accessToken };
}

async function setup(results) {
  state.userA = await registerAndLogin('a');
  state.userB = await registerAndLogin('b');

  const goal = await must('POST', '/goals', {
    title: 'TC-08 sampai TC-12 Goal',
    description: 'Goal sementara untuk pengujian ekstra manajemen tugas dan AI.',
    deadline: todayString(21),
  });
  state.goalId = goal.data.id;

  const protectedTask = await must('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'TC-09 Protected Task',
    duration_estimate: 30,
    planned_date: todayString(1),
    planned_slot: 'morning',
  });
  state.protectedTaskId = protectedTask.data.id;

  const coachTask = await must('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'TC-10 Coach Complete Task',
    duration_estimate: 30,
    planned_date: todayString(1),
    planned_slot: 'afternoon',
  });
  state.coachTaskId = coachTask.data.id;

  const skipTask = await must('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'TC-11 Coach Skip Task',
    duration_estimate: 30,
    planned_date: todayString(-1),
    planned_slot: 'evening',
  });
  state.skipTaskId = skipTask.data.id;

  results.push(pass('SETUP', 'Membuat dua user, goal, dan task sementara', `User A ${state.userA.email}, User B ${state.userB.email}, goal ${state.goalId}`));
}

async function tc08() {
  const invalidDuration = await request('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'Invalid Duration',
    duration_estimate: 5,
    planned_date: todayString(1),
    planned_slot: 'morning',
  });

  const invalidSlot = await request('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'Invalid Slot',
    duration_estimate: 30,
    planned_date: todayString(1),
    planned_slot: 'midnight',
  });

  const durationClear = invalidDuration.status === 400 && invalidDuration.payload?.error?.code === 'VALIDATION_ERROR';
  const slotClear = invalidSlot.status === 400 && invalidSlot.payload?.error?.code === 'VALIDATION_ERROR';

  if (durationClear && slotClear) {
    return pass('TC-08', 'Validasi input task invalid', 'Duration terlalu kecil dan slot invalid sama-sama ditolak dengan VALIDATION_ERROR');
  }
  return fail('TC-08', 'Validasi input task invalid', `duration=${invalidDuration.status}, slot=${invalidSlot.status}`);
}

async function tc09() {
  const getByOtherUser = await request('GET', `/tasks/${state.protectedTaskId}`, null, state.userB.token);
  const patchByOtherUser = await request('PATCH', `/tasks/${state.protectedTaskId}`, { title: 'Hijacked' }, state.userB.token);
  const ownerDetail = await must('GET', `/tasks/${state.protectedTaskId}`, null, state.userA.token);

  const inaccessible = getByOtherUser.status === 404 && patchByOtherUser.status === 404;
  const unchanged = ownerDetail.data.title === 'TC-09 Protected Task';

  if (inaccessible && unchanged) {
    return pass('TC-09', 'Proteksi ownership task antar user', `User B tidak bisa membaca/mengubah task ${state.protectedTaskId}`);
  }
  return fail('TC-09', 'Proteksi ownership task antar user', `GET by B=${getByOtherUser.status}, PATCH by B=${patchByOtherUser.status}, title=${ownerDetail.data.title}`);
}

async function tc10() {
  const result = await must('POST', '/coach', {
    action: 'COMPLETE_TASK',
    payload: {
      taskId: state.coachTaskId,
      session_id: `tc10-${Date.now()}`,
    },
  });
  const detail = await must('GET', `/tasks/${state.coachTaskId}`);
  const metrics = await must('GET', '/coach/metrics');
  const audit = await must('GET', '/coach/audit?limit=20&action=COACH_TASK_COMPLETED');

  const updated = detail.data.status === 'done' && detail.data.completed_at;
  const metricUpdated = Number(metrics.data.student.total_completed) >= 1;
  const auditRecorded = audit.data.logs.some((log) => log.action === 'COACH_TASK_COMPLETED');
  const staticResponse = result.type === 'message' && result.data?.message;

  if (updated && metricUpdated && auditRecorded && staticResponse) {
    return pass('TC-10', 'Aksi coach COMPLETE_TASK tanpa perlu LLM', `Task ${state.coachTaskId} done, metric total_completed=${metrics.data.student.total_completed}, audit tercatat`);
  }
  return fail('TC-10', 'Aksi coach COMPLETE_TASK tanpa perlu LLM', `updated=${!!updated}, metric=${metricUpdated}, audit=${auditRecorded}, type=${result.type}`);
}

async function tc11() {
  const before = await must('GET', `/tasks/${state.skipTaskId}`);
  const result = await must('POST', '/coach', {
    action: 'SKIP_TASK',
    payload: {
      taskId: state.skipTaskId,
      reason: 'busy',
      session_id: `tc11-${Date.now()}`,
    },
  });
  const detail = await must('GET', `/tasks/${state.skipTaskId}`);
  const metrics = await must('GET', '/coach/metrics');
  const audit = await must('GET', '/coach/audit?limit=20&action=COACH_TASK_SKIPPED');

  const skipped = detail.data.status === 'skipped' && detail.data.skip_reason === 'busy';
  const beforeDate = apiDateString(before.data.planned_date);
  const afterDate = apiDateString(detail.data.planned_date);
  const movedForward = afterDate && afterDate !== beforeDate && afterDate >= todayString();
  const metricUpdated = Number(metrics.data.student.total_skipped) >= 1;
  const auditRecorded = audit.data.logs.some((log) => log.action === 'COACH_TASK_SKIPPED');
  const staticResponse = result.type === 'message' && result.data?.message;

  if (skipped && movedForward && metricUpdated && auditRecorded && staticResponse) {
    return pass('TC-11', 'Aksi coach SKIP_TASK melakukan reschedule statis', `Task ${state.skipTaskId} skipped dan dipindah dari ${beforeDate} ke ${afterDate}`);
  }
  return fail('TC-11', 'Aksi coach SKIP_TASK melakukan reschedule statis', `skipped=${skipped}, moved=${movedForward}, before=${beforeDate}, after=${afterDate}, today=${todayString()}, metric=${metricUpdated}, audit=${auditRecorded}, type=${result.type}`);
}

async function tc12() {
  const before = await must('GET', `/tasks?goalId=${state.goalId}`);
  const ai = await request('POST', '/ai/plan/suggest', {
    goalId: state.goalId,
    context: {
      test_case: 'TC-12',
      note: 'Validasi fallback/error handling saat provider AI gagal.',
    },
  });
  const after = await must('GET', `/tasks?goalId=${state.goalId}`);

  if (ai.ok && ai.payload?.data?.recommendationId) {
    return pass('TC-12', 'AI suggestion tersedia atau fallback error jelas', `AI tersedia dan mengembalikan recommendation ${ai.payload.data.recommendationId}`);
  }

  const clearUnavailable = ai.status === 503 && ai.payload?.error?.code === 'AI_UNAVAILABLE' && ai.payload?.error?.message;
  const noTaskMutation = after.data.length === before.data.length;

  if (clearUnavailable && noTaskMutation) {
    return pass('TC-12', 'AI suggestion tersedia atau fallback error jelas', 'Provider AI unavailable ditangani dengan AI_UNAVAILABLE dan tidak membuat task baru');
  }
  return fail('TC-12', 'AI suggestion tersedia atau fallback error jelas', `status=${ai.status}, code=${ai.payload?.error?.code}, before=${before.data.length}, after=${after.data.length}`);
}

async function runCase(id, fn) {
  try {
    return await fn();
  } catch (err) {
    const message = err.payload?.error?.message || err.payload?.message || err.message;
    const details = err.payload ? ` payload=${JSON.stringify(err.payload).slice(0, 300)}` : '';
    return fail(id, `Menjalankan ${id}`, `${message} (status=${err.status || 'n/a'}).${details}`);
  }
}

function makeReport(results) {
  const now = new Date().toISOString();
  const rows = results.map((r) => `| ${r.id} | ${r.status} | ${r.name} | ${String(r.evidence).replace(/\|/g, '/')} |`).join('\n');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  return `# TC-08 sampai TC-12 Run Report

Generated: ${now}

API Base URL: \`${baseUrl}\`

## Summary

| Status | Count |
| --- | ---: |
| PASS | ${passed} |
| WARN | ${warned} |
| FAIL | ${failed} |

## Before Test

| Area | Kondisi Awal |
| --- | --- |
| Data testing | Script membuat dua user baru, satu goal, dan beberapa task sementara. |
| Validasi task | Belum ada request invalid yang diuji pada sesi ini. |
| Ownership | Belum ada pembuktian bahwa user lain tidak bisa membaca/mengubah task. |
| Coach static action | Belum ada validasi COMPLETE_TASK dan SKIP_TASK tanpa ketergantungan LLM. |
| AI fallback | Belum ada pembuktian bahwa kegagalan provider AI tidak mengubah data task. |

## After Test

| TC | Status | Test | Evidence |
| --- | --- | --- | --- |
${rows}

## Command

\`\`\`bash
node scripts/run-task-ai-management-extra.js
\`\`\`
`;
}

async function main() {
  const results = [];

  try {
    await setup(results);
  } catch (err) {
    results.push(fail('SETUP', 'Membuat dua user, goal, dan task sementara', err.message));
  }

  if (state.userA.token && state.userB.token && state.goalId) {
    results.push(await runCase('TC-08', tc08));
    results.push(await runCase('TC-09', tc09));
    results.push(await runCase('TC-10', tc10));
    results.push(await runCase('TC-11', tc11));
    results.push(await runCase('TC-12', tc12));
  } else {
    results.push(warn('TC-08..TC-12', 'Semua test dilewati', 'Setup gagal, test utama tidak dijalankan'));
  }

  fs.mkdirSync(docsDir, { recursive: true });
  const report = makeReport(results);
  fs.writeFileSync(reportPath, report);
  process.stdout.write(`${report}\n`);

  const hasFail = results.some((result) => result.status === 'FAIL');
  process.exit(hasFail ? 1 : 0);
}

main();
