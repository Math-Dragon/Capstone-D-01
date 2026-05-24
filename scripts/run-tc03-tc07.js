const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const reportPath = path.join(docsDir, 'task-ai-management-tc03-tc07-run-report.md');

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
const password = process.env.TEST_PASSWORD || 'Testing123!';

const state = {
  token: null,
  goalId: null,
  manualTaskId: null,
  overdueTaskId: null,
  createdAiTaskIds: [],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function getISOWeek(dateString) {
  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function request(method, endpoint, body, token = state.token) {
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
  if (!res.ok) {
    const err = new Error(payload?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function requestWithRateLimitRetry(method, endpoint, body, token = state.token) {
  try {
    return await request(method, endpoint, body, token);
  } catch (err) {
    if (err.status !== 429) throw err;
    const retryAfterSeconds = Number(err.payload?.error?.retryAfterSeconds || 5);
    await sleep((retryAfterSeconds + 1) * 1000);
    return request(method, endpoint, body, token);
  }
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

async function setupUserAndGoal(results) {
  const email = `tc03-tc07-${Date.now()}@example.com`;
  await requestWithRateLimitRetry('POST', '/auth/register', { email, password }, null);
  const login = await requestWithRateLimitRetry('POST', '/auth/login', { email, password }, null);
  state.token = login.data.accessToken;

  const goal = await request('POST', '/goals', {
    title: 'TC-03 sampai TC-07 Learning Goal',
    description: 'Goal sementara untuk pengujian manajemen tugas dan AI.',
    deadline: todayString(21),
  });
  state.goalId = goal.data.id;
  results.push(pass('SETUP', 'Membuat user dan goal sementara', `User ${email} dan goal ${state.goalId} dibuat`));
}

async function tc03() {
  const created = await request('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'TC-03 Manual Task',
    description: 'Task manual untuk validasi penyimpanan data.',
    duration_estimate: 45,
    planned_date: todayString(1),
    planned_slot: 'morning',
  });
  state.manualTaskId = created.data.id;

  const detail = await request('GET', `/tasks/${state.manualTaskId}`);
  if (detail.data.id === state.manualTaskId && detail.data.source === 'manual' && detail.data.status === 'todo') {
    return pass('TC-03', 'Membuat tugas manual dan memastikan data tersimpan', `Task ${state.manualTaskId} bisa dibaca ulang via API dengan source=manual`);
  }
  return fail('TC-03', 'Membuat tugas manual dan memastikan data tersimpan', 'Task detail tidak sesuai setelah dibuat');
}

async function tc04() {
  const suggestion = await request('POST', '/ai/plan/suggest', {
    goalId: state.goalId,
    context: {
      test_case: 'TC-04',
      note: 'Buat rekomendasi singkat untuk testing otomatis.',
    },
  });
  const recommendationId = suggestion.data.recommendationId;
  const suggestedCount = suggestion.data.tasks?.length || 0;
  if (!recommendationId || suggestedCount === 0) {
    return fail('TC-04', 'Membuat tugas dari rekomendasi AI', 'AI tidak mengembalikan recommendationId/tasks');
  }

  const before = await request('GET', `/tasks?goalId=${state.goalId}`);
  const accepted = await request('POST', `/ai/recommendations/${recommendationId}/accept`, {});
  const after = await request('GET', `/tasks?goalId=${state.goalId}`);
  const aiTasks = after.data.filter((task) => task.source === 'ai');
  state.createdAiTaskIds = aiTasks.map((task) => task.id);

  if (accepted.data.length === suggestedCount && after.data.length >= before.data.length + suggestedCount && aiTasks.length >= suggestedCount) {
    return pass('TC-04', 'Membuat tugas dari rekomendasi AI', `Recommendation ${recommendationId} diterima dan ${suggestedCount} task AI tersimpan`);
  }
  return fail('TC-04', 'Membuat tugas dari rekomendasi AI', 'Jumlah task AI setelah accept tidak sesuai');
}

async function tc05() {
  const updated = await request('PATCH', `/tasks/${state.manualTaskId}`, {
    status: 'done',
    actual_duration: 40,
  });
  const week = getISOWeek(updated.data.planned_date);
  const weekly = await request('GET', `/progress/weekly?week=${week}`);

  if (updated.data.status === 'done' && updated.data.completed_at && weekly.data && Number(weekly.data.completed_hours) > 0) {
    return pass('TC-05', 'Mengubah status todo ke done dan validasi progress snapshot', `Task ${state.manualTaskId} done; progress ${week} completed_hours=${weekly.data.completed_hours}`);
  }
  return fail('TC-05', 'Mengubah status todo ke done dan validasi progress snapshot', 'Status/progress snapshot belum berubah sesuai ekspektasi');
}

async function tc06() {
  const created = await request('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'TC-06 Overdue Task',
    description: 'Task sengaja dibuat kemarin untuk validasi overdue.',
    duration_estimate: 30,
    planned_date: todayString(-1),
    planned_slot: 'afternoon',
  });
  state.overdueTaskId = created.data.id;

  const tasks = await request('GET', `/tasks?goalId=${state.goalId}`);
  const overdue = tasks.data.filter((task) => task.status === 'todo' && task.planned_date && task.planned_date < todayString());
  const found = overdue.some((task) => task.id === state.overdueTaskId);

  if (found) {
    return pass('TC-06', 'Mendeteksi tugas yang melewati tenggat waktu', `Task ${state.overdueTaskId} terdeteksi overdue karena planned_date=${created.data.planned_date}`);
  }
  return fail('TC-06', 'Mendeteksi tugas yang melewati tenggat waktu', 'Task kemarin tidak muncul sebagai overdue pada hasil data task');
}

async function tc07() {
  const skipResult = await request('POST', '/coach', {
    action: 'SKIP_TASK',
    payload: {
      taskId: state.overdueTaskId,
      reason: 'busy',
      session_id: `tc07-${Date.now()}`,
    },
  });
  const rescheduled = await request('GET', `/tasks/${state.overdueTaskId}`);
  const movedForward = rescheduled.data.planned_date >= todayString();

  const proposalPlan = {
    summary: 'TC-07 proposal accept untuk reschedule otomatis.',
    tasks: [
      {
        title: 'TC-07 Accepted Reschedule Suggestion',
        description: 'Task dari proposal yang diterima.',
        duration_estimate: 25,
        planned_date: todayString(2),
        planned_slot: 'evening',
        task_type: 'practice',
        rationale: 'Memindahkan beban belajar ke slot kosong.',
      },
    ],
  };
  const beforeAccept = await request('GET', `/tasks?goalId=${state.goalId}`);
  const accepted = await request('POST', '/coach', {
    action: 'ACCEPT_PROPOSAL',
    payload: { plan: proposalPlan, session_id: `tc07-accept-${Date.now()}` },
  });
  const afterAccept = await request('GET', `/tasks?goalId=${state.goalId}`);

  const suggestion = await request('POST', '/ai/plan/suggest', {
    goalId: state.goalId,
    context: { test_case: 'TC-07 reject', note: 'Rekomendasi ini akan ditolak untuk validasi reject.' },
  });
  const beforeReject = await request('GET', `/tasks?goalId=${state.goalId}`);
  const rejected = await request('POST', `/ai/recommendations/${suggestion.data.recommendationId}/reject`, {});
  const afterReject = await request('GET', `/tasks?goalId=${state.goalId}`);

  const acceptedCreatesTask = accepted.type === 'accepted' && afterAccept.data.length === beforeAccept.data.length + 1;
  const rejectDoesNotCreateTask = rejected.data.status === 'rejected' && afterReject.data.length === beforeReject.data.length;

  if (skipResult.success && movedForward && acceptedCreatesTask && rejectDoesNotCreateTask) {
    return pass('TC-07', 'Reschedule otomatis dan aksi Accept/Reject saran', `Overdue task dipindah ke ${rescheduled.data.planned_date}; Accept membuat 1 task; Reject tidak menambah task`);
  }
  return fail('TC-07', 'Reschedule otomatis dan aksi Accept/Reject saran', 'Reschedule/accept/reject tidak memenuhi ekspektasi');
}

async function runCase(id, fn) {
  try {
    return await fn();
  } catch (err) {
    const message = err.payload?.message || err.payload?.error?.message || err.payload?.error || err.message;
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

  return `# TC-03 sampai TC-07 Run Report

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
| Data testing | Script membuat user dan goal sementara agar tidak mengganggu data utama. |
| Manual task | Belum ada task manual untuk TC-03. |
| AI recommendation | Belum ada recommendation khusus untuk TC-04/TC-07. |
| Progress snapshot | Belum divalidasi untuk task manual TC-05. |
| Overdue task | Belum ada task overdue khusus TC-06/TC-07. |

## After Test

| TC | Status | Test | Evidence |
| --- | --- | --- | --- |
${rows}

## Catatan

- TC-07 memvalidasi reschedule otomatis melalui aksi coach \`SKIP_TASK\` pada task overdue.
- Aksi Accept divalidasi melalui \`ACCEPT_PROPOSAL\` yang menyimpan plan baru.
- Aksi Reject divalidasi melalui reject recommendation AI, karena penolakan proposal overlay di frontend bersifat lokal dan tidak membuat perubahan data backend.

## Command

\`\`\`bash
node scripts/run-tc03-tc07.js
\`\`\`
`;
}

async function main() {
  const results = [];

  try {
    await setupUserAndGoal(results);
  } catch (err) {
    results.push(fail('SETUP', 'Membuat user dan goal sementara', err.payload?.message || err.message));
  }

  if (state.token && state.goalId) {
    results.push(await runCase('TC-03', tc03));
    results.push(await runCase('TC-04', tc04));
    results.push(await runCase('TC-05', tc05));
    results.push(await runCase('TC-06', tc06));
    results.push(await runCase('TC-07', tc07));
  } else {
    results.push(warn('TC-03..TC-07', 'Semua test dilewati', 'Setup gagal, test utama tidak dijalankan'));
  }

  fs.mkdirSync(docsDir, { recursive: true });
  const report = makeReport(results);
  fs.writeFileSync(reportPath, report);
  process.stdout.write(`${report}\n`);

  const hasFail = results.some((result) => result.status === 'FAIL');
  process.exit(hasFail ? 1 : 0);
}

main();
