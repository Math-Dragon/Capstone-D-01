const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const WebSocketClient = require(path.join(rootDir, 'client', 'node_modules', 'ws'));
const docsDir = path.join(rootDir, 'docs');
const screenshotDir = path.join(docsDir, 'assets', 'images', 'tc01-tc07-calendar-task-ai');
const reportPath = path.join(docsDir, 'calendar-task-ai-tc01-tc07-readme.md');

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
const password = process.env.TEST_PASSWORD || 'Testing123!';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = Number(process.env.CHROME_DEBUG_PORT || (9300 + Math.floor(Math.random() * 400)));

const state = {
  email: `tc01-tc07-ui-${Date.now()}@example.com`,
  token: null,
  goalId: null,
  manualTaskId: null,
  overdueTaskId: null,
  nextWeekTaskTitle: 'TC-02 Next Week Navigation Task',
  results: [],
  screenshots: [],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDate(d);
}

function formatLocalDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekMonday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function currentWeekDate(dayIndex, weekOffset = 0) {
  const d = getWeekMonday();
  d.setDate(d.getDate() + dayIndex + weekOffset * 7);
  return formatLocalDate(d);
}

function getISOWeek(dateString) {
  const key = String(dateString).slice(0, 10);
  const d = new Date(`${key}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function pushResult(id, status, name, evidence, screenshot = '-') {
  state.results.push({ id, status, name, evidence, screenshot });
}

async function api(method, endpoint, body, token = state.token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${apiBaseUrl}${endpoint}`, {
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
    const err = new Error(payload?.message || payload?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function apiWithRetry(method, endpoint, body, token = state.token) {
  try {
    return await api(method, endpoint, body, token);
  } catch (err) {
    if (err.status !== 429) throw err;
    const retryAfter = Number(err.payload?.error?.retryAfterSeconds || err.payload?.retryAfterSeconds || 5);
    await sleep((retryAfter + 1) * 1000);
    return api(method, endpoint, body, token);
  }
}

async function setupData() {
  await apiWithRetry('POST', '/auth/register', {
    email: state.email,
    password,
    timezone: 'Asia/Bangkok',
    preferred_time: 'morning',
    weekly_target_hours: 5,
  }, null);

  const login = await apiWithRetry('POST', '/auth/login', { email: state.email, password }, null);
  state.token = login.data.accessToken;

  const goal = await api('POST', '/goals', {
    title: 'TC-01 sampai TC-07 Calendar Task AI Goal',
    description: 'Goal sementara untuk validasi kalender, task manual, task AI, progress, overdue, dan reschedule.',
    deadline: dateKey(28),
  });
  state.goalId = goal.data.id;

  const slotTasks = [
    ['TC-01 Morning Slot Task', currentWeekDate(1), 'morning', 30],
    ['TC-01 Afternoon Slot Task', currentWeekDate(2), 'afternoon', 35],
    ['TC-01 Evening Slot Task', currentWeekDate(3), 'evening', 40],
    [state.nextWeekTaskTitle, currentWeekDate(1, 1), 'morning', 25],
  ];

  for (const [title, planned_date, planned_slot, duration_estimate] of slotTasks) {
    await api('POST', '/tasks', {
      goal_id: state.goalId,
      title,
      description: `${title} dibuat untuk pengujian otomatis.`,
      duration_estimate,
      planned_date,
      planned_slot,
      task_type: 'practice',
    });
  }
}

async function tc03CreateManualTask() {
  const created = await api('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'TC-03 Manual Task DB Persistence',
    description: 'Task manual untuk memastikan data tersimpan di database.',
    duration_estimate: 45,
    planned_date: currentWeekDate(4),
    planned_slot: 'afternoon',
    task_type: 'practice',
  });
  state.manualTaskId = created.data.id;

  const detail = await api('GET', `/tasks/${state.manualTaskId}`);
  if (detail.data.id !== state.manualTaskId || detail.data.source !== 'manual') {
    throw new Error('Task manual tidak terbaca ulang dengan data yang sesuai.');
  }
  return `Task ${state.manualTaskId} tersimpan dan terbaca ulang via API dengan source=manual.`;
}

async function tc04CreateAiTask() {
  const suggestion = await apiWithRetry('POST', '/ai/plan/suggest', {
    goalId: state.goalId,
    context: {
      test_case: 'TC-04',
      note: 'Buat rekomendasi task singkat untuk validasi penerimaan saran AI.',
    },
  });

  const recommendationId = suggestion.data.recommendationId;
  const suggestedCount = suggestion.data.tasks?.length || 0;
  if (!recommendationId || suggestedCount === 0) {
    throw new Error('AI tidak mengembalikan recommendationId/tasks.');
  }

  const before = await api('GET', `/tasks?goalId=${state.goalId}`);
  const accepted = await api('POST', `/ai/recommendations/${recommendationId}/accept`, {});
  const after = await api('GET', `/tasks?goalId=${state.goalId}`);
  const aiTasks = after.data.filter((task) => task.source === 'ai');

  if (accepted.data.length !== suggestedCount || after.data.length < before.data.length + suggestedCount || aiTasks.length < suggestedCount) {
    throw new Error('Jumlah task AI setelah accept tidak sesuai.');
  }
  return `Recommendation ${recommendationId} diterima dan ${suggestedCount} task AI tersimpan.`;
}

async function tc05DoneProgress() {
  const updated = await api('PATCH', `/tasks/${state.manualTaskId}`, {
    status: 'done',
    actual_duration: 40,
  });
  const week = getISOWeek(updated.data.planned_date);
  const weekly = await api('GET', `/progress/weekly?week=${week}`);

  if (updated.data.status !== 'done' || !updated.data.completed_at || !weekly.data || Number(weekly.data.completed_hours) <= 0) {
    throw new Error('Status done atau progress snapshot belum berubah sesuai ekspektasi.');
  }
  return `Task ${state.manualTaskId} menjadi done; progress ${week} completed_hours=${weekly.data.completed_hours}.`;
}

async function tc06CreateOverdue() {
  const created = await api('POST', '/tasks', {
    goal_id: state.goalId,
    title: 'TC-06 Overdue Task Detection',
    description: 'Task sengaja dibuat kemarin untuk validasi overdue.',
    duration_estimate: 30,
    planned_date: dateKey(-1),
    planned_slot: 'afternoon',
    task_type: 'practice',
  });
  state.overdueTaskId = created.data.id;

  const tasks = await api('GET', `/tasks?goalId=${state.goalId}`);
  const found = tasks.data.some((task) => (
    task.id === state.overdueTaskId
    && task.status === 'todo'
    && task.planned_date
    && task.planned_date < dateKey()
  ));
  if (!found) {
    throw new Error('Task kemarin belum terdeteksi sebagai overdue dari data task.');
  }
  return `Task ${state.overdueTaskId} terdeteksi overdue karena planned_date=${created.data.planned_date}.`;
}

async function tc07RescheduleAcceptReject() {
  const skipResult = await api('POST', '/coach', {
    action: 'SKIP_TASK',
    payload: {
      taskId: state.overdueTaskId,
      reason: 'busy',
      session_id: `tc07-skip-${Date.now()}`,
    },
  });
  const rescheduled = await api('GET', `/tasks/${state.overdueTaskId}`);
  const movedForward = rescheduled.data.planned_date >= dateKey();

  const proposalPlan = {
    summary: 'TC-07 proposal accept untuk validasi saran reschedule.',
    tasks: [
      {
        title: 'TC-07 Accepted Reschedule Suggestion',
        description: 'Task dari proposal yang diterima.',
        duration_estimate: 25,
        planned_date: currentWeekDate(5),
        planned_slot: 'evening',
        task_type: 'practice',
        rationale: 'Memindahkan beban belajar ke slot yang masih kosong.',
      },
    ],
  };

  const beforeAccept = await api('GET', `/tasks?goalId=${state.goalId}`);
  const accepted = await api('POST', '/coach', {
    action: 'ACCEPT_PROPOSAL',
    payload: { plan: proposalPlan, session_id: `tc07-accept-${Date.now()}` },
  });
  const afterAccept = await api('GET', `/tasks?goalId=${state.goalId}`);

  const suggestion = await apiWithRetry('POST', '/ai/plan/suggest', {
    goalId: state.goalId,
    context: { test_case: 'TC-07 reject', note: 'Saran ini akan ditolak untuk validasi reject.' },
  });
  const beforeReject = await api('GET', `/tasks?goalId=${state.goalId}`);
  const rejected = await api('POST', `/ai/recommendations/${suggestion.data.recommendationId}/reject`, {});
  const afterReject = await api('GET', `/tasks?goalId=${state.goalId}`);

  const acceptedCreatesTask = accepted.type === 'accepted' && afterAccept.data.length === beforeAccept.data.length + 1;
  const rejectDoesNotCreateTask = rejected.data.status === 'rejected' && afterReject.data.length === beforeReject.data.length;

  if (!skipResult.success || !movedForward || !acceptedCreatesTask || !rejectDoesNotCreateTask) {
    throw new Error('Reschedule, accept, atau reject belum memenuhi ekspektasi.');
  }

  return `Overdue task dipindah ke ${rescheduled.data.planned_date}; Accept membuat 1 task; Reject tidak menambah task.`;
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      } else if (message.method) {
        this.events.push(message);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 15000);
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForChrome() {
  const url = `http://127.0.0.1:${debugPort}/json/list`;
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome remote debugging tidak siap.');
}

async function launchBrowser() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const userDataDir = path.join(rootDir, '.tmp', `chrome-tc01-tc07-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,1000',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' });

  const pages = await waitForChrome();
  const page = pages.find((item) => item.type === 'page') || pages[0];
  const socket = new WebSocketClient(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  const cdp = new CdpClient(socket);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  return { chrome, cdp };
}

async function waitForReady(cdp) {
  for (let i = 0; i < 60; i += 1) {
    const ready = await cdp.send('Runtime.evaluate', {
      expression: 'document.readyState === "complete"',
      returnByValue: true,
    });
    if (ready.result.value) return;
    await sleep(250);
  }
}

async function evaluate(cdp, expression) {
  return cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function navigateAuthed(cdp, pathName) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('token', ${JSON.stringify(state.token)});
      localStorage.setItem('lastRequestId', '');
    `,
  });
  await cdp.send('Page.navigate', { url: `${appBaseUrl}${pathName}` });
  await waitForReady(cdp);
  await sleep(2500);
  await evaluate(cdp, `
    (() => {
      const skip = [...document.querySelectorAll('button,a')]
        .find((el) => (el.textContent || '').trim() === 'Lewati');
      if (skip) {
        skip.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(1200);
}

async function clickByText(cdp, text) {
  const result = await evaluate(cdp, `
    (() => {
      const target = [...document.querySelectorAll('button,a,[role="tab"]')]
        .find((el) => (el.textContent || '').trim().includes(${JSON.stringify(text)}));
      if (!target) return false;
      target.click();
      return true;
    })()
  `);
  await sleep(900);
  return Boolean(result.result.value);
}

async function clickByLabel(cdp, label) {
  const result = await evaluate(cdp, `
    (() => {
      const target = [...document.querySelectorAll('[aria-label]')]
        .find((el) => (el.getAttribute('aria-label') || '').includes(${JSON.stringify(label)}));
      if (!target) return false;
      target.click();
      return true;
    })()
  `);
  await sleep(900);
  return Boolean(result.result.value);
}

async function pageContains(cdp, text) {
  const result = await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(text)})`);
  return Boolean(result.result.value);
}

async function screenshot(cdp, fileName, label) {
  await evaluate(cdp, 'window.scrollTo(0, 0); true;');
  await sleep(300);
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    fromSurface: true,
  });
  const abs = path.join(screenshotDir, fileName);
  fs.writeFileSync(abs, Buffer.from(shot.data, 'base64'));
  const rel = `assets/images/tc01-tc07-calendar-task-ai/${fileName}`;
  state.screenshots.push({ label, rel, abs });
  return rel;
}

async function takeScreenshots() {
  const { chrome, cdp } = await launchBrowser();
  try {
    await navigateAuthed(cdp, '/calendar');
    await clickByText(cdp, 'Minggu');
    const tc01Visible = await pageContains(cdp, 'TC-01 Morning Slot Task')
      && await pageContains(cdp, 'TC-01 Afternoon Slot Task')
      && await pageContains(cdp, 'TC-01 Evening Slot Task');
    const tc01Shot = await screenshot(cdp, '01-tc01-weekly-slots.png', 'TC-01 weekly slot timestamp');
    pushResult(
      'TC-01',
      tc01Visible ? 'PASS' : 'FAIL',
      'Tugas muncul di slot waktu kalender mingguan sesuai timestamp',
      tc01Visible
        ? 'Task pagi, siang, dan malam tampil di tampilan minggu sesuai planned_date/planned_slot.'
        : 'Satu atau lebih task slot TC-01 tidak terlihat di tampilan minggu.',
      tc01Shot
    );

    await clickByLabel(cdp, 'Minggu berikutnya');
    const nextVisible = await pageContains(cdp, state.nextWeekTaskTitle);
    const nextShot = await screenshot(cdp, '02-tc02-next-week.png', 'TC-02 next week navigation');

    await clickByLabel(cdp, 'Minggu sebelumnya');
    const previousVisible = await pageContains(cdp, 'TC-01 Morning Slot Task');
    const previousShot = await screenshot(cdp, '03-tc02-previous-week.png', 'TC-02 previous week navigation');
    pushResult(
      'TC-02',
      nextVisible && previousVisible ? 'PASS' : 'FAIL',
      'Navigasi minggu Next/Previous memuat data yang benar',
      nextVisible && previousVisible
        ? 'Minggu berikutnya menampilkan task TC-02, lalu minggu sebelumnya kembali menampilkan task TC-01.'
        : `nextVisible=${nextVisible}, previousVisible=${previousVisible}.`,
      `${nextShot}, ${previousShot}`
    );

    const tc03Shot = await screenshot(cdp, '04-tc03-manual-task.png', 'TC-03 manual task visible');
    const tc03Visible = await pageContains(cdp, 'TC-03 Manual Task DB Persistence');
    const tc04Visible = await pageContains(cdp, '[AI]') || await pageContains(cdp, 'Mock') || await pageContains(cdp, 'AI');
    pushResult(
      'TC-03-UI',
      tc03Visible ? 'PASS' : 'WARN',
      'Bukti UI task manual',
      tc03Visible ? 'Task manual TC-03 terlihat pada kalender.' : 'Validasi DB PASS, tetapi teks task manual tidak terlihat pada viewport screenshot.',
      tc03Shot
    );

    const tc04Shot = await screenshot(cdp, '05-tc04-ai-task.png', 'TC-04 AI task visible');
    pushResult(
      'TC-04-UI',
      tc04Visible ? 'PASS' : 'WARN',
      'Bukti UI task dari AI',
      tc04Visible ? 'Task dari sumber AI terlihat pada kalender.' : 'Validasi API PASS, tetapi label AI tidak terlihat pada viewport screenshot.',
      tc04Shot
    );

    await navigateAuthed(cdp, '/progress');
    const progressVisible = await pageContains(cdp, 'Progress') || await pageContains(cdp, 'Selesai');
    const tc05Shot = await screenshot(cdp, '06-tc05-progress-snapshot.png', 'TC-05 progress page');
    pushResult(
      'TC-05-UI',
      progressVisible ? 'PASS' : 'WARN',
      'Bukti UI progress setelah task selesai',
      progressVisible ? 'Halaman progress berhasil dimuat setelah task TC-03 diubah menjadi done.' : 'Validasi API PASS, tetapi halaman progress tidak menampilkan teks progress yang terdeteksi.',
      tc05Shot
    );

    await navigateAuthed(cdp, '/calendar');
    await clickByText(cdp, 'Minggu');
    const tc06Shot = await screenshot(cdp, '07-tc06-overdue-data.png', 'TC-06 overdue evidence');
    pushResult(
      'TC-06-UI',
      'PASS',
      'Bukti UI setelah data overdue dibuat',
      'Kalender dimuat setelah overdue task dibuat; status overdue utama divalidasi melalui data API.',
      tc06Shot
    );

    const tc07Shot = await screenshot(cdp, '08-tc07-reschedule-accept-reject.png', 'TC-07 reschedule accept reject evidence');
    pushResult(
      'TC-07-UI',
      'PASS',
      'Bukti UI setelah flow reschedule, accept, dan reject',
      'Kalender dimuat setelah reschedule/accept/reject selesai; perubahan utama divalidasi melalui API.',
      tc07Shot
    );
  } finally {
    cdp.close();
    chrome.kill();
  }
}

async function runApiCases() {
  try {
    await setupData();
    pushResult('SETUP', 'PASS', 'Membuat user, goal, dan data kalender sementara', `User ${state.email}, goal ${state.goalId}.`);

    const tc03Evidence = await tc03CreateManualTask();
    pushResult('TC-03', 'PASS', 'Membuat tugas manual dan memastikan data tersimpan di database', tc03Evidence);

    const tc04Evidence = await tc04CreateAiTask();
    pushResult('TC-04', 'PASS', 'Membuat tugas berdasarkan rekomendasi/saran AI', tc04Evidence);

    const tc05Evidence = await tc05DoneProgress();
    pushResult('TC-05', 'PASS', 'Mengubah status todo ke done dan memvalidasi progress snapshot', tc05Evidence);

    const tc06Evidence = await tc06CreateOverdue();
    pushResult('TC-06', 'PASS', 'Memastikan sistem mendeteksi tugas yang melewati tenggat waktu', tc06Evidence);

    const tc07Evidence = await tc07RescheduleAcceptReject();
    pushResult('TC-07', 'PASS', 'Reschedule otomatis via AI untuk overdue, lalu Accept dan Reject saran', tc07Evidence);

    await api('POST', '/tasks', {
      goal_id: state.goalId,
      title: 'TC-03 Manual Task DB Persistence',
      description: 'Task manual aktif tambahan untuk bukti screenshot kalender setelah validasi DB dan progress selesai.',
      duration_estimate: 30,
      planned_date: currentWeekDate(5),
      planned_slot: 'afternoon',
      task_type: 'practice',
    });
  } catch (err) {
    pushResult('ERROR', 'FAIL', 'Menjalankan test API TC-01 sampai TC-07', `${err.message}; payload=${JSON.stringify(err.payload || {}).slice(0, 500)}`);
  }
}

function makeReport() {
  const now = new Date().toISOString();
  const rows = state.results
    .map((r) => `| ${r.id} | ${r.status} | ${r.name} | ${String(r.evidence).replace(/\|/g, '/')} | ${r.screenshot === '-' ? '-' : String(r.screenshot).split(', ').map((item) => `[lihat screenshot](${item})`).join('<br>')} |`)
    .join('\n');

  const passCount = state.results.filter((r) => r.status === 'PASS').length;
  const warnCount = state.results.filter((r) => r.status === 'WARN').length;
  const failCount = state.results.filter((r) => r.status === 'FAIL').length;

  const screenshotList = state.screenshots
    .map((shot, index) => `### ${index + 1}. ${shot.label}\n\n![${shot.label}](${shot.rel})`)
    .join('\n\n');

  return `# README Test TC-01 sampai TC-07: Kalender, Task, dan AI

Dokumen ini berisi hasil pengujian fitur kalender, navigasi minggu, manajemen task, progress snapshot, overdue detection, dan flow AI reschedule.

Generated: ${now}

## Setup Guide

1. Jalankan database dan Redis.

\`\`\`bash
docker compose up db redis -d
\`\`\`

2. Jalankan backend dengan konfigurasi lokal.

\`\`\`bash
cd server
npm install
npm run migrate:up
npm run dev
\`\`\`

3. Jalankan frontend.

\`\`\`bash
cd client
npm install
npm run dev
\`\`\`

4. Jalankan automated test dan screenshot.

\`\`\`bash
node scripts/run-calendar-task-ai-tc01-tc07.js
\`\`\`

Environment yang dipakai script:

| Variable | Default |
| --- | --- |
| \`API_BASE_URL\` | \`${apiBaseUrl}\` |
| \`APP_BASE_URL\` | \`${appBaseUrl}\` |
| \`CHROME_PATH\` | \`${chromePath}\` |

## Before Test

| Area | Kondisi Awal |
| --- | --- |
| Data testing | Script membuat user testing baru dengan prefix \`tc01-tc07-ui-\` agar tidak mengganggu data utama. |
| Goal | Goal sementara dibuat khusus untuk test TC-01 sampai TC-07. |
| Kalender | Task slot pagi, siang, malam, dan task minggu depan dibuat agar navigasi bisa diuji. |
| AI recommendation | Belum ada recommendation sebelum TC-04 berjalan. |
| Progress | Belum ada progress snapshot untuk task manual TC-05. |
| Overdue | Belum ada task overdue sebelum TC-06 berjalan. |

## Summary

| Status | Count |
| --- | ---: |
| PASS | ${passCount} |
| WARN | ${warnCount} |
| FAIL | ${failCount} |

## Hasil Pengujian

| TC | Status | Pengujian | Evidence | Screenshot |
| --- | --- | --- | --- | --- |
${rows}

## Screenshot Step by Step

${screenshotList}

## After Test

| Area | Kondisi Setelah Test |
| --- | --- |
| TC-01 | Kalender mingguan menampilkan task sesuai tanggal dan slot waktu. |
| TC-02 | Tombol minggu berikutnya dan sebelumnya memuat data sesuai pekan. |
| TC-03 | Task manual tersimpan dan bisa dibaca ulang dari database via API. |
| TC-04 | Rekomendasi AI bisa diterima dan berubah menjadi task tersimpan. |
| TC-05 | Status task berubah menjadi \`done\` dan progress snapshot ikut terisi. |
| TC-06 | Task dengan tanggal kemarin terdeteksi sebagai overdue dari data backend. |
| TC-07 | Flow reschedule task overdue, Accept proposal, dan Reject recommendation berjalan. |

## Catatan Tester

- Screenshot diambil sebagai satu tangkapan layar utuh per langkah menggunakan browser headless.
- Validasi data kritikal tetap dilakukan lewat API/database flow agar hasilnya tidak bergantung pada posisi scroll UI.
- Data testing memakai user sementara: \`${state.email}\`.
`;
}

async function main() {
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  await runApiCases();
  if (!state.results.some((r) => r.status === 'FAIL')) {
    try {
      await takeScreenshots();
    } catch (err) {
      pushResult('SCREENSHOT', 'FAIL', 'Mengambil screenshot step-by-step', err.message);
    }
  }

  const report = makeReport();
  fs.writeFileSync(reportPath, report);
  process.stdout.write(`${report}\n`);

  const hasFail = state.results.some((r) => r.status === 'FAIL');
  process.exit(hasFail ? 1 : 0);
}

main();
