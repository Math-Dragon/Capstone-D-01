const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const reportPath = path.join(docsDir, 'e2e-core-flow-run-report.md');

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
const password = process.env.TEST_PASSWORD || 'Testing123!';

const state = {
  token: null,
  email: null,
  goalId: null,
  manualTaskId: null,
  acceptedTaskTitle: 'E2E Accepted Coach Plan Task',
};

function todayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  return { ok: res.ok, status: res.status, payload };
}

async function must(method, endpoint, body, token = state.token) {
  const res = await request(method, endpoint, body, token);
  if (!res.ok) {
    const err = new Error(res.payload?.error?.message || res.payload?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = res.payload;
    throw err;
  }
  return res.payload;
}

async function requestWithRateLimitRetry(method, endpoint, body, token = state.token) {
  const first = await request(method, endpoint, body, token);
  if (first.status !== 429) return first;

  const retryAfterSeconds = Number(first.payload?.error?.retryAfterSeconds || 5);
  await sleep((retryAfterSeconds + 1) * 1000);
  return request(method, endpoint, body, token);
}

async function mustWithRateLimitRetry(method, endpoint, body, token = state.token) {
  const res = await requestWithRateLimitRetry(method, endpoint, body, token);
  if (!res.ok) {
    const err = new Error(res.payload?.error?.message || res.payload?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = res.payload;
    throw err;
  }
  return res.payload;
}

function result(id, name, status, evidence) {
  return { id, name, status, evidence };
}

function pass(id, name, evidence) {
  return result(id, name, 'PASS', evidence);
}

function fail(id, name, evidence) {
  return result(id, name, 'FAIL', evidence);
}

async function setup() {
  state.email = `e2e-core-${Date.now()}@example.com`;
  const register = await requestWithRateLimitRetry('POST', '/auth/register', { email: state.email, password }, null);
  if (!register.ok) {
    throw new Error(`Register failed: ${register.status} ${JSON.stringify(register.payload)}`);
  }
  const login = await requestWithRateLimitRetry('POST', '/auth/login', { email: state.email, password }, null);
  if (!login.ok) {
    throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.payload)}`);
  }
  state.token = login.payload.data.accessToken;
  return pass('E2E-SETUP', 'Register dan login user testing', `User ${state.email} berhasil login dan menerima access token`);
}

async function verifyProfile() {
  const me = await mustWithRateLimitRetry('GET', '/auth/me');
  if (me.data.email === state.email) {
    return pass('E2E-01', 'Validasi sesi login', `Endpoint /auth/me mengembalikan user ${me.data.email}`);
  }
  return fail('E2E-01', 'Validasi sesi login', `Email sesi tidak sesuai: ${me.data.email}`);
}

async function createGoal() {
  const goal = await must('POST', '/goals', {
    title: 'E2E Core Flow Goal',
    description: 'Goal sementara untuk pengujian end-to-end.',
    deadline: todayString(14),
  });
  state.goalId = goal.data.id;
  const list = await must('GET', '/goals');
  const found = list.data.some((item) => item.id === state.goalId);
  if (found) {
    return pass('E2E-02', 'Membuat dan membaca goal', `Goal ${state.goalId} tersimpan dan muncul di daftar goal`);
  }
  return fail('E2E-02', 'Membuat dan membaca goal', 'Goal baru tidak ditemukan pada daftar goal');
}

async function createManualTask() {
  const task = await must('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'E2E Manual Task',
    description: 'Task manual untuk flow kalender dan progress.',
    duration_estimate: 30,
    planned_date: todayString(1),
    planned_slot: 'morning',
  });
  state.manualTaskId = task.data.id;
  const detail = await must('GET', `/tasks/${state.manualTaskId}`);
  if (detail.data.source === 'manual' && detail.data.status === 'todo') {
    return pass('E2E-03', 'Membuat task manual', `Task ${state.manualTaskId} tersimpan dengan source=manual dan status=todo`);
  }
  return fail('E2E-03', 'Membuat task manual', `Task detail tidak sesuai: ${JSON.stringify(detail.data)}`);
}

async function completeTaskAndProgress() {
  const completed = await must('POST', '/coach', {
    action: 'COMPLETE_TASK',
    payload: {
      taskId: state.manualTaskId,
      session_id: `e2e-complete-${Date.now()}`,
    },
  });
  const detail = await must('GET', `/tasks/${state.manualTaskId}`);
  const stats = await must('GET', '/progress/stats');
  const updated = detail.data.status === 'done' && detail.data.completed_at;
  const hasProgress = Number(stats.data.completedTasks) >= 1 && Number(stats.data.completedMinutes) > 0;

  if (completed.type === 'message' && updated && hasProgress) {
    return pass('E2E-04', 'Menyelesaikan task dan validasi progress', `Task done, completedTasks=${stats.data.completedTasks}, completedMinutes=${stats.data.completedMinutes}`);
  }
  return fail('E2E-04', 'Menyelesaikan task dan validasi progress', `completed=${completed.type}, updated=${updated}, stats=${JSON.stringify(stats.data)}`);
}

async function acceptCoachProposal() {
  const plan = {
    summary: 'Rencana E2E tersimpan tanpa memanggil LLM.',
    tasks: [
      {
        title: state.acceptedTaskTitle,
        description: 'Task dari proposal coach untuk validasi accept flow.',
        duration_estimate: 25,
        planned_date: todayString(2),
        planned_slot: 'afternoon',
        task_type: 'practice',
        rationale: 'Memastikan fitur accept proposal membuat task baru.',
      },
    ],
  };
  const accepted = await must('POST', '/coach', {
    action: 'ACCEPT_PROPOSAL',
    payload: { plan, session_id: `e2e-accept-${Date.now()}` },
  });
  const tasks = await must('GET', `/tasks?goalId=${state.goalId}`);
  const found = tasks.data.find((task) => task.title === state.acceptedTaskTitle);

  if (accepted.type === 'accepted' && found?.source === 'coach') {
    return pass('E2E-05', 'Accept proposal coach membuat task', `Task "${state.acceptedTaskTitle}" tersimpan dengan source=coach`);
  }
  return fail('E2E-05', 'Accept proposal coach membuat task', `accepted=${accepted.type}, found=${Boolean(found)}`);
}

async function aiSuggestionHealth() {
  const suggestion = await request('POST', '/ai/plan/suggest', {
    goalId: state.goalId,
    context: {
      test_case: 'E2E-06',
      note: 'Cek jalur rekomendasi AI. Kuota Gemini dapat membuat hasil menjadi unavailable.',
    },
  });

  if (suggestion.ok && suggestion.payload?.data?.recommendationId) {
    const recommendationId = suggestion.payload.data.recommendationId;
    const rejected = await must('POST', `/ai/recommendations/${recommendationId}/reject`, {});
    return pass('E2E-06', 'AI suggestion tersedia dan bisa ditolak', `Recommendation ${recommendationId} dibuat lalu reject status=${rejected.data.status}`);
  }

  const clearError = suggestion.status === 429 || suggestion.status === 503 || suggestion.payload?.error?.code;
  if (clearError) {
    return pass('E2E-06', 'AI suggestion memberi error terkendali saat tidak tersedia', `AI route status=${suggestion.status}, code=${suggestion.payload?.error?.code || 'n/a'}`);
  }

  return fail('E2E-06', 'AI suggestion memberi error terkendali saat tidak tersedia', `Status=${suggestion.status}, payload=${JSON.stringify(suggestion.payload)}`);
}

async function cleanup() {
  const evidence = [];
  if (state.manualTaskId) {
    await request('DELETE', `/tasks/${state.manualTaskId}`);
    evidence.push(`manual task ${state.manualTaskId}`);
  }
  if (state.goalId) {
    await request('DELETE', `/goals/${state.goalId}`);
    evidence.push(`goal ${state.goalId}`);
  }
  return pass('E2E-CLEANUP', 'Cleanup data goal/task E2E', evidence.length ? `Deleted ${evidence.join(', ')}` : 'Tidak ada data yang perlu dibersihkan');
}

function writeReport(results, error) {
  const passCount = results.filter((item) => item.status === 'PASS').length;
  const failCount = results.filter((item) => item.status === 'FAIL').length;
  const lines = [
    '# E2E Core Flow Run Report',
    '',
    `Tanggal: ${new Date().toISOString()}`,
    `API Base URL: ${baseUrl}`,
    '',
    `Ringkasan: PASS ${passCount}, FAIL ${failCount}`,
    '',
    '| ID | Status | Skenario | Bukti |',
    '| --- | --- | --- | --- |',
    ...results.map((item) => `| ${item.id} | ${item.status} | ${item.name} | ${String(item.evidence).replace(/\|/g, '\\|')} |`),
  ];

  if (error) {
    lines.push('', '## Error', '', '```', error.stack || error.message, '```');
  }

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
}

async function main() {
  const results = [];
  let error = null;

  try {
    results.push(await setup());
    results.push(await verifyProfile());
    results.push(await createGoal());
    results.push(await createManualTask());
    results.push(await completeTaskAndProgress());
    results.push(await acceptCoachProposal());
    results.push(await aiSuggestionHealth());
  } catch (err) {
    error = err;
    results.push(fail('E2E-RUNNER', 'Runner berhenti karena error', `${err.status || ''} ${err.message}`.trim()));
  } finally {
    try {
      if (state.token) results.push(await cleanup());
    } catch (cleanupErr) {
      results.push(fail('E2E-CLEANUP', 'Cleanup data goal/task E2E', cleanupErr.message));
    }
    writeReport(results, error);
  }

  const failed = results.filter((item) => item.status === 'FAIL');
  for (const item of results) {
    console.log(`${item.status} ${item.id} - ${item.name}: ${item.evidence}`);
  }
  console.log(`Report: ${reportPath}`);
  if (failed.length > 0) process.exit(1);
}

main();
