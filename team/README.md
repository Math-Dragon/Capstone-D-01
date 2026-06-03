# StepUp AI Learn

StepUp AI Learn adalah aplikasi web full-stack untuk membantu user membuat rencana belajar yang lebih terarah. User dapat membuat goal, menerima rekomendasi task dari AI, mengatur jadwal di kalender, menyelesaikan task, dan memantau progress belajar.

![Dashboard StepUp AI Learn](docs/assets/images/hero-screenshot.png)

## Tujuan Project

Project ini dibuat untuk membantu user yang punya target belajar, tetapi kesulitan memecah target tersebut menjadi jadwal harian yang realistis. AI berperan sebagai learning coach yang memberi saran, sementara user tetap memegang kontrol untuk menerima, menolak, atau mengubah rencana.

## Fitur Utama

| Fitur | Deskripsi |
| --- | --- |
| Authentication | Register, login, logout, protected route. |
| Daily Check-In | User mengisi mood/kondisi harian sebelum masuk dashboard. |
| Dashboard | Ringkasan goal, progress, task hari ini, urgent task, dan momentum mingguan. |
| AI Learning Coach | Membuat rekomendasi rencana belajar dan menjawab pertanyaan user. |
| Human-in-the-Loop | Saran AI tidak langsung dipakai; user dapat accept/reject. |
| Goal Management | Melihat daftar goal dan detail goal. |
| Task Management | Membuat task manual, update task, complete, skip, dan modify. |
| Calendar & Planner | View harian, mingguan, bulanan, navigasi periode, filter, dan saran perubahan plan. |
| Progress Analytics | Snapshot progress, completion rate, durasi belajar, dan distribusi task. |
| Observability | Audit trail, metrik coach, dan informasi debugging AI. |
| Rate Limiting | Pembatasan request auth dan AI menggunakan Redis store di non-test environment. |

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Frontend | React 19, Vite, Redux Toolkit, React Router, Recharts |
| Backend | Node.js, Express, Zod, JWT |
| Database | PostgreSQL |
| Cache / Rate Limit | Redis |
| AI Provider | Gemini primary, optional paid/fallback provider |
| Testing | Jest, Vitest, Supertest, Testing Library |
| Infrastructure | Docker Compose, GitHub Actions |

## Struktur Project

```text
team/client/      Frontend React
team/server/      Backend Express, service, repository, migrations
team/docs/        Dokumentasi, ADR, testing report, screenshot
team/scripts/     Script otomatis untuk testing dan reporting
```

## Setup Lokal

### Prasyarat

- Node.js 20+
- npm
- Docker Desktop
- Git

### 1. Jalankan PostgreSQL dan Redis

```bash
docker compose up db redis -d
```

Jika port lokal bentrok, gunakan container test terpisah:

```bash
docker run --name capstone-stepup-db -e POSTGRES_DB=planner -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -p 15432:5432 -d postgres:16
docker run --name capstone-stepup-redis -p 16379:6379 -d redis:7-alpine
```

### 2. Setup Backend

```bash
cd team/server
npm install
npm run migrate:up
npm run dev
```

Contoh konfigurasi `team/server/.env`:

```env
DATABASE_URL=postgres://user:pass@localhost:5432/planner
REDIS_URL=redis://localhost:6379
JWT_SECRET=local_dev_jwt_secret_minimum_32_chars
JWT_REFRESH_SECRET=local_dev_refresh_secret_minimum_32_chars
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash-lite
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173
```

Untuk DB/Redis test port:

```env
DATABASE_URL=postgres://user:pass@localhost:15432/planner
REDIS_URL=redis://localhost:16379
```

Jangan commit `GEMINI_API_KEY`, `GEMINI_PAID_API_KEY`, atau secret lain ke repository.

### 3. Setup Frontend

```bash
cd team/client
npm install
npm run dev
```

URL lokal:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Panduan Singkat User Baru

1. Login atau register akun.
2. Isi daily check-in.
3. Buka menu `Coach`.
4. Buat rencana belajar baru.
5. Review rekomendasi AI.
6. Accept task yang sesuai.
7. Buka `Targetku` untuk melihat goal.
8. Buka `Kalender` untuk melihat jadwal harian, mingguan, atau bulanan.
9. Tandai task sebagai `Done`, atau gunakan `Skip/Modify` jika perlu.
10. Pantau hasil di menu `Progress`.

## Screenshot Fitur

| Fitur | Screenshot |
| --- | --- |
| Login | ![Login](docs/assets/images/02-login-filled-testing-account.png) |
| Coach | ![Coach](docs/assets/images/05-coach-home-gemini.png) |
| Rekomendasi AI | ![Rekomendasi AI](docs/assets/images/07-gemini-recommendation-result.png) |
| Dashboard | ![Dashboard](docs/assets/images/09-dashboard-with-gemini-plan.png) |
| Targetku | ![Targetku](docs/assets/images/10-goals-list-gemini.png) |
| Detail Goal | ![Detail Goal](docs/assets/images/11-goal-detail-gemini-tasks.png) |
| Kalender | ![Kalender](docs/assets/images/13-calendar-week-gemini.png) |
| Progress | ![Progress](docs/assets/images/14-progress-gemini.png) |
| Observability | ![Observability](docs/assets/images/17-coach-observability-gemini.png) |

## AI Status

Gemini sudah berhasil divalidasi menggunakan model:

```text
gemini-2.5-flash-lite
```

Perbaikan yang sudah dilakukan:

- parser AI menerima output string JSON dan object JSON,
- parser dapat unwrap output `{ plan: { tasks, summary } }`,
- prompt `/api/ai/plan/suggest` dibuat lebih eksplisit,
- error schema menyimpan preview output untuk debugging.

Catatan penting:

- API key free tier dapat terkena limit `20 requests/day`.
- Jika quota habis, endpoint AI bisa mengembalikan `AI_UNAVAILABLE / HTTP 503`.
- Untuk demo production-like, gunakan paid fallback key atau tunggu quota reset.

Detail: [docs/ai-gemini-readiness.md](docs/ai-gemini-readiness.md)

## Testing

### Backend Unit Test

```bash
cd team/server
SKIP_DB_CHECK=true npm test -- --runTestsByPath tests/unit/repos-extra.test.js tests/unit/llm.test.js tests/unit/ai.service.test.js tests/unit/coach-static-response.test.js
```

Status terakhir:

```text
54 passed
```

### Frontend Calendar Test

```bash
cd team/client
npm test -- CalendarPage.test.jsx --run
```

Status terakhir:

```text
8 passed
```

### Script Testing Otomatis

| Scope | Command | Report |
| --- | --- | --- |
| Task & AI TC-03 sampai TC-07 | `node scripts/run-tc03-tc07.js` | `docs/task-ai-management-tc03-tc07-run-report.md` |
| Task & AI TC-08 sampai TC-12 | `node scripts/run-task-ai-management-extra.js` | `docs/task-ai-management-tc08-tc12-run-report.md` |
| Performance & Security TC-10 sampai TC-24 | `node scripts/run-tc10-tc24.js` | `docs/performance-security-tc10-tc24-run-report.md` |
| E2E Core Flow | `node scripts/run-e2e-core-flow.js` | `docs/e2e-core-flow-run-report.md` |
| Cleanup Data Testing | `node scripts/cleanup-test-data.js` | `docs/test-data-cleanup-run-report.md` |

Ringkasan:

- TC-03, TC-05, TC-06: PASS
- TC-04, TC-07: BLOCKED jika quota Gemini free tier habis
- TC-08 sampai TC-12: PASS
- TC-10 sampai TC-24: PASS
- E2E Core Flow: PASS

## Dokumentasi Penting

- [Problem Framing](docs/problem-framing.md)
- [AI Gemini Readiness](docs/ai-gemini-readiness.md)
- [AI Acceptance Rate](docs/ai-acceptance-rate.md)
- [AI Cost, Token Usage, and Metrics](docs/ai-cost-token-metrics.md)
- [Work Scope 2 - AI Feature & Validation](docs/work-scope-2-ai-feature-validation.md)
- [Task & AI TC-03 sampai TC-07](docs/task-ai-management-tc03-tc07-summary.md)
- [Task & AI TC-08 sampai TC-12](docs/task-ai-management-tc08-tc12-summary.md)
- [Performance & Security TC-10 sampai TC-24](docs/performance-security-tc10-tc24-summary.md)
- [E2E Core Flow](docs/e2e-core-flow-summary.md)
- [Test Data Cleanup](docs/test-data-cleanup.md)
- [Test Data Cleanup Run Report](docs/test-data-cleanup-run-report.md)
- [Deployment Readiness Checklist](docs/deployment-readiness-checklist.md)
- [Architecture Decision Records](docs/adr)

## CI Pipeline

CI menjalankan lint/test dan secret scan. Jika pipeline gagal, cek:

- dependency install,
- env test,
- Redis/PostgreSQL service,
- secret scan,
- lint warning/error,
- test yang membutuhkan network atau quota AI.

## Known Issues

| Issue | Status | Catatan |
| --- | --- | --- |
| Gemini free tier quota | Known limitation | Gunakan paid fallback key untuk demo stabil. |
| TC-04/TC-07 saat quota habis | Blocked | Bukan bug utama aplikasi, tetapi limit provider. |
| Docker port conflict | Known local setup issue | Gunakan port test `15432` dan `16379`. |

## Rekomendasi Lanjutan

1. Tambahkan `GEMINI_PAID_API_KEY` sebagai fallback.
2. Set max billing agar penggunaan AI tetap terkendali.
3. Jalankan E2E core flow sebelum demo atau release.
4. Bersihkan data test dengan script cleanup setelah validasi selesai.
5. Jalankan full lint/test sebelum commit atau push.
