# Work Scope 03 — Monitoring & Observability Report

Dokumen ini mencakup implementasi observability panel di laman `/coach`, laman `/admin`, serta konfigurasi environment untuk mode admin.

---

## 1. Observability Panel — Laman `/coach`

Panel observability pada halaman coach menyediakan visibilitas penuh terhadap pipeline AI, metrik siswa, dan riwayat aksi coach.

### 1.1 Akses Panel

| Metode | Kombinasi |
|--------|-----------|
| **Keyboard shortcut** | `Ctrl + Shift + O` |
| **Toggle button** | Tombol vertikal tipis (5px) di sisi kiri layar |

Panel akan muncul sebagai side drawer (lebar 80rem) di sisi kiri halaman coach.

### 1.2 Komponen Panel

Panel observability terdiri dari beberapa bagian:

#### Header
- Judul "Observabilitas" dengan indikator loading
- Trace ID (8 karakter terakhir dari request ID)
- Tombol close

#### KPI Cards (4 kartu grid 2 kolom)
- **Accept Rate** — Persentase penerimaan rekomendasi tugas
- **Tugas Disarankan** — Total tugas yang disarankan oleh AI
- **Ditolak** — Total tugas yang ditolak
- **Tertunda** — Total tugas yang masih pending

#### Action Distribution Bar Chart
- Horizontal bar chart menggunakan Recharts
- Menampilkan distribusi tipe aksi: Diterima, Ditolak, Selesai, Dilewati, Feedback, Chat, Lainnya
- Warna sesuai tipe aksi

#### Accordion Detail (3 panel)

| Panel | Komponen | Data | Sumber |
|-------|----------|------|--------|
| **Jejak Pipeline** | `PipelineTrace.jsx` | LLM pipeline trace (attempts, durasi, token, error) | Redux `observability.pipelineTrace` (dari response dispatch) |
| **Log Audit** | `AuditTrail.jsx` | Riwayat aksi coach (searchable, filterable) | `GET /coach/audit` |
| **Metrik Lengkap** | `ObservabilityMetrics.jsx` | Metrik siswa + rekomendasi AI | `GET /coach/metrics` |

### 1.3 Pipeline Trace

Menampilkan trace dari setiap eksekusi LLM pipeline:

```
Attempt #1 [OK] gemini-2.5-flash 1234ms  P:100 C:50 ∑:150
Attempt #2 [VALIDATION] openrouter 567ms
```

| Field | Deskripsi |
|-------|-----------|
| `attempt` | Nomor percobaan |
| `status` | `success` (hijau), `validation_failed` (kuning), `transient_error` (merah) |
| `source` | Provider LLM (gemini, openrouter, glm, mock) |
| `model` | Model LLM yang digunakan |
| `duration_ms` | Durasi per attempt |
| `usage.prompt_tokens` | Prompt tokens |
| `usage.completion_tokens` | Completion tokens |
| `usage.total_tokens` | Total tokens |
| `raw_output_preview` | Preview output (1 baris pertama) |
| `error` | Detail error (expandable) |

### 1.4 Audit Trail

Log pencarian dengan filter aksi:

- Search box (cari berdasarkan label aksi atau metadata `message_preview`/`task_title`/`reason`)
- Dropdown filter aksi
- Setiap entry menampilkan: badge aksi (berwarna), preview teks, timestamp
- Tipe aksi yang didukung:

| Aksi | Label | Warna |
|------|-------|-------|
| `COACH_TASK_ACCEPTED` | Accepted | Hijau |
| `COACH_TASK_REJECTED` | Rejected | Merah |
| `COACH_TASK_COMPLETED` | Completed | Emerald |
| `COACH_TASK_SKIPPED` | Skipped | Amber |
| `COACH_FEEDBACK_SUBMITTED` | Feedback | Ungu |
| `COACH_CHAT_MESSAGE` | Chat | Biru |
| `COACH_LLM_CALL` | LLM Call | Rose |
| `COACH_LLM_ERROR` | LLM Error | Merah |
| `COACH_PROPOSAL_ACCEPTED` | Proposal | Hijau |
| `COACH_PLAN_UNDONE` | Plan Undone | Abu-abu |

### 1.5 Metrik Lengkap

Dua sub-bagian:

**Student Metrics:**
- streak_days, total_completed, total_skipped
- completion_rate_7d, completion_rate_3d (dengan progress bar)
- avg_difficulty_7d, consecutive_skips
- last_mood

**AI Recommendation Metrics:**
- ai_tasks_suggested_total, ai_tasks_accepted_total
- ai_tasks_rejected_total, ai_tasks_pending_total
- accept_rate (dengan progress bar)

### 1.6 Sumber Data (Server API)

| Endpoint | Method | Parameter | Response |
|----------|--------|-----------|----------|
| `/coach/audit` | GET | `limit`, `offset`, `action` | `{ logs[], actionCounts, limit, offset }` |
| `/coach/metrics` | GET | — | `{ student, recommendations }` |
| `/recommendations/metrics` | GET | — | Recommendation metrics saja |

### 1.7 Alur Data Observability

```
CoachPage
  └── dispatch(action, payload)
        → POST /coach/ (dispatch.service.js)
        → llmPipeline.callLLM() → llmMeta
        → _llmUsageMeta() → extract tokens
        → recordAIUsage() → Prometheus counters
        → audit.create() → audit_logs table
        → response.meta.llmMeta → Redux setPipelineTrace

  └── CoachObservabilityDrawer (toggle)
        → GET /coach/audit → AuditTrail
        → GET /coach/metrics → ObservabilityMetrics
```

---

## 2. Laman Admin `/admin`

Halaman admin menyediakan dashboard monitoring penggunaan AI, metrik biaya, dan performa provider LLM. Route guard: `AdminRoute.jsx`.

### 2.1 Route Guard

| Kondisi | Status | Response |
|---------|--------|----------|
| `ADMIN_EMAILS` kosong | 403 | "Akses admin belum dikonfigurasi" |
| Tidak login | 401 | Redirect ke `/login` |
| Email tidak terdaftar | 403 | "Akses ditolak" |
| Admin valid | 200 | Dashboard admin |

### 2.2 Komponen Dashboard

#### KPI Cards (4 kartu grid 2/4 kolom)

| Kartu | Data | Format | Sumber |
|-------|------|--------|--------|
| **Total AI Calls** | Total request LLM | Number | `summary.totalCalls` |
| **Total Tokens** | prompt + completion tokens | Number + sub | `summary.totalTokens` |
| **Estimated Cost** | Estimasi biaya USD | Currency ($) | `summary.estimatedCostUsd` |
| **Accept Rate** | Persentase diterima | Persentase | `summary.acceptRate` |

Setiap kartu menampilkan trend badge (perubahan dari kemarin) dengan panah naik/turun/warna.

#### Request & Accept Rate Trend Chart (`RequestTrendChart.jsx`)

Dual-chart layout dengan period switcher:

| Fitur | Detail |
|-------|--------|
| **Period switcher** | Tab: `7 Hari` | `30 Hari` | `90 Hari` |
| **Chart Kiri** | Request Trend — line chart (Requests + Errors) |
| **Chart Kanan** | Accept Rate Trend — dual line (Plan Accept + Task Accept) |
| **Y-axis** | Requests: linear. Accept Rate: 0–100% |

Period dikirim ke server sebagai query param `period`. Server melakukan:
- `period=7` — `DATE(created_at)`, range 7 hari
- `period=30` — `DATE(created_at)`, range 30 hari
- `period=90` — `DATE_TRUNC('week', created_at)`, range 90 hari

#### Provider Health Section (`ProviderHealthSection.jsx`)

- Tabel sortable: provider, model, calls, tokens, est. cost
- Pie chart distribusi penggunaan per provider
- Search filter

#### Aktivitas Terkini (Activity Log Table)

Tabel log audit dengan fitur:

| Fitur | Detail |
|-------|--------|
| **Kolom** | Timestamp, Action, User, Provider, Model, Input, Output, Total, Latency, Status |
| **Sort** | Klik header kolom untuk sort asc/desc |
| **Filter** | Search, action, provider, model, status, date range |
| **Pagination** | Page size select (10/25/50/100), page navigation |
| **Keyboard nav** | Arrow up/down untuk navigasi baris |
| **Shortcut** | `Ctrl+Shift+R` untuk refresh data |
| **Empty state** | "Belum ada aktivitas tercatat" dengan filter hint |

Kolom Provider, Model, Input, Output, Total, Latency membaca data dari dua path metadata:

| Kolom | Path 1 (flat) | Path 2 (nested llm) |
|-------|---------------|---------------------|
| Provider | `metadata->>'provider'` | `metadata->'llm'->>'provider'` |
| Model | `metadata->>'model'` | `metadata->'llm'->>'model'` |
| Input | `metadata->>'input_tokens'` → `metadata->>'prompt_tokens'` | `metadata->'llm'->>'prompt_tokens'` |
| Output | `metadata->>'output_tokens'` → `metadata->>'completion_tokens'` | `metadata->'llm'->>'completion_tokens'` |
| Total | `metadata->>'total_tokens'` | `metadata->'llm'->>'total_tokens'` |
| Latency | `metadata->>'latency_ms'` | `metadata->'llm'->>'latency_ms'` |

### 2.3 Struktur Response API

```
GET /api/admin/metrics?period=30&activity_limit=10&activity_offset=0
```

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCalls": 150,
      "totalTokens": { "prompt": 50000, "completion": 30000, "total": 80000 },
      "estimatedCostUsd": 0.45,
      "acceptRate": 0.75
    },
    "trends": {
      "totalCalls": 12,
      "totalTokens": -5,
      "estimatedCostUsd": 8,
      "acceptRate": 3
    },
    "byProvider": [
      { "provider": "gemini", "model": "gemini-2.5-flash", "calls": 100, "tokens": 50000, "estimatedCostUsd": 0.30 }
    ],
    "byDay": [
      { "date": "2026-06-01", "requests": 10, "errors": 0 }
    ],
    "byDayAccept": [
      { "date": "2026-06-01", "recRate": 0.75, "taskRate": 0.80 }
    ],
    "recentActivity": [
      {
        "id": "uuid",
        "timestamp": "2026-06-03T10:00:00Z",
        "action": "COACH_LLM_CALL",
        "user_id": "uuid",
        "metadata": {},
        "provider": "gemini",
        "model": "gemini-2.5-flash",
        "input_tokens": 120,
        "output_tokens": 80,
        "total_tokens": 200,
        "latency_ms": 1500
      }
    ],
    "total": 42
  }
}
```

### 2.4 Diagram Alur Data Admin

```
Client                                Server
──────                                ──────
AdminPage                             admin.service.js
  │                                     │
  ├── api.get('/admin/metrics',         │
  │     { period, filters })            │
  │                                     ├── getAIUsageSnapshot() (in-memory)
  │                                     ├── repos.aiRec.computeAllMetrics()
  │                                     ├── SQL byDay (audit_logs)
  │                                     ├── SQL byDayAccept (ai_recommendations + audit_logs)
  │                                     ├── SQL recentActivity (audit_logs)
  │                                     ├── SQL trends (24h vs 48h)
  │                                     └── return { summary, trends, ... }
  │
  ├── KpiCards ← summary + trends
  ├── RequestTrendChart ← byDay + byDayAccept
  ├── ProviderHealthSection ← byProvider
  └── ActivityLogTable ← recentActivity + total
```

### 2.5 Passing Context (Handoff)

Progress implementasi admin dan refinement dicatat di:

```
team/.idea/{date}/handoff/.context-handoff.md
```

---

## 3. Setup Environment Admin Mode

### 3.1 Konfigurasi Admin Emails

Admin access dikontrol via environment variable `ADMIN_EMAILS` (dibaca di `server/src/config/index.js:64`).

**File:** `server/.env`
```bash
ADMIN_EMAILS=admin@example.com,superadmin@example.com
```

**Cara kerja** (`server/src/middleware/requireAdmin.js`):

```
ADMIN_EMAILS → split(',') → trim → filter(Boolean) → array
                                 ↓
                    req.user.email includes?
                    ├── Ya → next()
                    └── Tidak → 403 Forbidden
```

Email didapat dari Firebase Authentication saat login. Server menyertakan `isAdmin: true/false` di response login/register/`/api/auth/me`.

### 3.2 State Flow

```
Server side (login/auth/me endpoint):
  config.adminEmails.includes(req.user.email)
    → user.isAdmin = true/false

Client side:
  AuthContext → user.isAdmin
    → AdminRoute.jsx: redirect jika !isAdmin
    → Header.jsx: tampilkan "Admin" link jika isAdmin
```

### 3.3 Environment Variables Reference

| Variable | Required | Default | Deskripsi |
|----------|----------|---------|-----------|
| `ADMIN_EMAILS` | No | `""` | Comma-separated email list untuk akses admin |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret untuk JWT access token |
| `JWT_REFRESH_SECRET` | Yes | — | Secret untuk JWT refresh token |
| `NODE_ENV` | No | `development` | Environment mode |
| `LLM_PROVIDER` | Yes | `gemini` | Provider LLM (mock/gemini/ollama) |
| `GEMINI_API_KEY` | Conditional | — | Diperlukan jika `LLM_PROVIDER=gemini` |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis untuk caching & rate limiting |
| `ALLOWED_ORIGINS` | No | — | CORS allowed origins |

### 3.4 Quick Start Admin

```bash
# 1. Konfigurasi .env
echo 'ADMIN_EMAILS=your@email.com' >> server/.env

# 2. Jalankan server
cd server && npm run dev

# 3. Login dengan Firebase (email harus match ADMIN_EMAILS)
# 4. Navigasi ke http://localhost:5173/admin
```

---

## 4. Referensi File

### Server

| File | Fungsi |
|------|--------|
| `server/src/routes/admin.js` | Route GET /api/admin/metrics |
| `server/src/services/admin.service.js` | Query & aggregation metrics |
| `server/src/middleware/requireAdmin.js` | Admin email guard |
| `server/src/config/index.js` | Baca ADMIN_EMAILS dari env |
| `server/src/utils/metrics.js` | Prometheus counters + in-memory snapshot |
| `server/src/services/coach/dispatch.service.js` | Audit trail + token tracking |
| `server/src/repositories/audit-log.repo.js` | CRUD audit_logs |

### Client

| File | Fungsi |
|------|--------|
| `client/src/pages/AdminPage.jsx` | Halaman admin utama |
| `client/src/components/RequestTrendChart.jsx` | Dual-chart dengan period switcher |
| `client/src/components/ProviderHealthSection.jsx` | Provider health table + pie chart |
| `client/src/components/ActivityLogFilters.jsx` | Filter activity log |
| `client/src/components/AdminRoute.jsx` | Route guard admin |
| `client/src/features/coach/components/CoachObservabilityDrawer.jsx` | Panel observability coach |
| `client/src/features/coach/components/PipelineTrace.jsx` | LLM pipeline trace viewer |
| `client/src/features/coach/components/AuditTrail.jsx` | Audit trail coach viewer |
| `client/src/features/coach/components/ObservabilityMetrics.jsx` | Metrik detail siswa + AI |
| `client/src/store/slices/observabilitySlice.js` | Redux slice observability |
| `client/src/utils/constants.js` | Label & warna aksi admin |

### Database

| Table | Kolom Kunci | Fungsi |
|-------|-------------|--------|
| `audit_logs` | `id, user_id, action, metadata(jsonb), involves_llm, created_at` | Semua log aktivitas dan LLM calls |
| `ai_recommendations` | `id, user_id, status(accepted/rejected/pending)` | Tracking rekomendasi tugas |
| `student_metrics` | `user_id, streak_days, completion_rate_7d, ...` | Metrik progress siswa |

### Migration

| File | Perubahan |
|------|-----------|
| `1700000000000_initial-schema.js` | Create audit_logs (id, user_id, action, metadata jsonb, created_at) |
| `1700000000007_add_session_id.js` | Add session_id ke audit_logs |
| `1700000000008_fix_session_id_type.js` | Cast session_id ke varchar(50) |
| `1700000000012_add_audit_llm_flag.js` | Add involves_llm boolean |
