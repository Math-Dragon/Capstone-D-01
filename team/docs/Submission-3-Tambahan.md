# Submission 3 — Tambahan: Verifikasi Added Card vs Codebase

Dokumen ini memverifikasi setiap item dari `added-card.txt` terhadap realita codebase, termasuk implementasi laman admin. Sebagian konten merujuk ke `TC014-report.md`.

---

## A. UX Polishing

### A1. Toast Notifications

| Item | Status | Detail |
|------|--------|--------|
| Toast untuk aksi berhasil (tugas selesai, saran diterima) | ✅ **Selesai** | `client/src/components/ui/Toast.jsx` — `ToastProvider` + `useToast()`. Dipakai di `useTaskActions.js` untuk: complete (`success`), skip (`warning`), update (`info`), feedback (`success`), save plan (`success`). Semua aksi punya pair error masing-masing. |
| Feedback positif memperkuat perilaku | ✅ **Selesai** | Toast muncul dengan type `success` (hijau) untuk aksi positif, `error` (merah) untuk gagal, `warning` (kuning) untuk skip. Duration default 3000ms. |

### A2. Animasi Transisi Status Tugas

| Item | Status | Detail |
|------|--------|--------|
| Animasi saat tugas berpindah status (todo → done) | ✅ **Selesai** | `client/src/components/TaskCard.jsx` — `transition-all duration-200` dengan `hover:-translate-y-px`. Staggered entry via `animationDelay: index * 80ms`. CSS keyframes di `index.css`: `fadeIn`, `slideUp`, `scaleIn`. Progress bar di Dashboard: `transition-all duration-700`. |

### A3. Responsive Design Mobile

| Item | Status | Detail |
|------|--------|--------|
| Responsive design berfungsi di mobile | ✅ **Selesai** | `grid-cols-2 lg:grid-cols-4`, `flex-col sm:flex-row`. Mobile menu hamburger di `Header.jsx` dengan `animate-fade-in`. Breakpoint Tailwind di semua halaman. Tabel admin pakai `overflow-x-auto`. |

---

## B. Explainability Feature

### B1. Rationale sebagai Array of Factors

| Item | Status | Detail |
|------|--------|--------|
| System prompt mengembalikan rationale sebagai array | ✅ **Selesai** | `server/src/prompts/system-final.md` baris 57: `"rationale": ["Factor 1", "Factor 2", "Factor 3"]`. Baris 86: "Each rationale must be an array of factors." |
| Schema menerima format array | ✅ **Selesai** | `server/src/models/task.model.js` baris 77: `z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)])`. |
| Tampilan di RationaleDisplay | ✅ **Berfungsi** | `client/src/components/RationaleDisplay.jsx` — menerima string, lalu `.split(/[,;]\s*/)` jadi list. Data dari API sudah dalam bentuk string (via serialisasi JSON array → string). Redundan tapi berfungsi. |

### B2. Confidence Indicator

| Item | Status | Detail |
|------|--------|--------|
| Confidence indicator (rendah/sedang/tinggi) | ✅ **Selesai** | `server/src/models/task.model.js` baris 78: `confidence: z.enum(['high', 'medium', 'low']).optional()`. System prompt `system-final.md` baris 58. Dispatch service `dispatch.service.js` baris 407, 420: `confidence: task.confidence \|\| null`. |

### B3. Log Acceptance Rate per Jenis Rationale

| Item | Status | Detail |
|------|--------|--------|
| Log acceptance rate per jenis rationale | ❌ **Belum ada** | Acceptance rate hanya dihitung secara global di `admin.service.js` (total accepted / total decided). Tidak ada skema atau mekanisme yang memetakan rationale type ke accept/reject decision. |

---

## C. Testing

Untuk detail coverage dan Lighthouse, lihat `TC014-report.md`.

### C1. Status Transition Tests

| Item | Status | Detail |
|------|--------|--------|
| Todo → done berhasil | ✅ **Selesai** | Unit test di `task.service.test.js` baris 259. Integration test di `aiFlow.test.js` baris 99. |
| Done → todo ditolak | ✅ **Selesai** | Unit test di `task.service.test.js` baris 316. Integration test di `aiFlow.test.js` baris 111. `VALID_TRANSITIONS` di `task.model.js`: `done: []` (blocked). |

### C2. Coverage Threshold

| Item | Status | Detail |
|------|--------|--------|
| Setup coverage threshold di jest.config | ✅ **Selesai** | Server: `coverageThreshold: { global: { lines: 50 } }` di `package.json`. Client: `thresholds: { lines: 50 }` di `vite.config.js`. CI enforce via custom Node script. Coverage aktual: Server 72.35%, Client 70.19%. |

---

## D. Accessibility

### D1. Skip-to-Content Link

| Item | Status | Detail |
|------|--------|--------|
| Skip-to-content link untuk keyboard users | ❌ **Belum ada** | Tidak ditemukan implementasi skip link di seluruh codebase client. Gap aksesibilitas yang perlu ditambahkan. |

### D2. aria-live pada Dynamic Areas

| Item | Status | Detail |
|------|--------|--------|
| `aria-live="polite"` pada progress bar | ✅ **Selesai** | DashboardPage, ProgressPage, GoalDetailPage. |
| `aria-live="polite"` pada toast | ✅ **Selesai** | `Toast.jsx` baris 41. |
| `aria-live` pada loading/error | ✅ **Selesai** | Semua halaman: loading `role="status" aria-live="polite"`, error `role="alert" aria-live="assertive"`. |
| `aria-live` pada AdaptationBanner | ✅ **Selesai** | `AdaptationBanner.jsx` baris 31. |

### D3. Lighthouse ≥ 90

| Item | Status | Detail |
|------|--------|--------|
| Skor Accessibility ≥ 90 | ✅ **Selesai** | Threshold `accessibility: 90` untuk 9 halaman via Cypress Lighthouse. Lihat `TC014-report.md`. |

---

## E. Implementasi Laman Admin

### E1. Route & Guard

| Komponen | Detail |
|----------|--------|
| Route | `App.jsx` baris 49: lazy-loaded `AdminPage` di path `/admin`, dibungkus `AdminRoute` + `CheckInGateway`. |
| Guard client | `AdminRoute.jsx`: cek `user.isAdmin` dari AuthContext. |
| Guard server | `requireAdmin.js`: cek email user terhadap env `ADMIN_EMAILS`. |

### E2. Komponen Dashboard

| Komponen | File | Fungsi |
|----------|------|--------|
| KPI Cards (4) | `AdminPage.jsx` baris 218 | Total AI Calls, Total Tokens, Estimated Cost (USD), Accept Rate + trend badge (delta vs 24h) |
| RequestTrendChart | `RequestTrendChart.jsx` | Dual chart + period switcher 7/30/90 |
| ProviderHealthSection | `ProviderHealthSection.jsx` | Tabel sortable + pie chart + search |
| Activity Log Table | `AdminPage.jsx` baris 268 | Sort by column, filter (search/action/provider/model/status/date), pagination (10/25/50/100), keyboard nav (↑↓), shortcut Ctrl+Shift+R |
| ActivityLogFilters | `ActivityLogFilters.jsx` | Filter controls + reset button |

### E3. Fitur Interaktif

| Fitur | Implementasi |
|-------|-------------|
| Sort column | Klik header → asc → desc → none. Numerik (tokens, latency) dan string. |
| Keyboard nav | ↑↓ navigasi baris tabel. Ctrl+Shift+R refresh. |
| Row selection | Click/focus → highlight `ring-2`. |
| Period filter | Tab 7/30/90 → re-fetch. |
| Responsive | `grid-cols-2 lg:grid-cols-4` untuk KPI. `flex-col sm:flex-row` header. `overflow-x-auto` tabel. |

### E4. Server API

**Endpoint:** `GET /api/admin/metrics`

**Parameters:** `period`, `activity_limit`, `activity_offset`, `search`, `action`, `provider`, `model`, `status`, `dateFrom`, `dateTo`

**Response:**
```json
{
  "summary": { "totalCalls", "totalTokens": { "prompt", "completion", "total" }, "estimatedCostUsd", "acceptRate" },
  "trends": { "totalCalls", "totalTokens", "estimatedCostUsd", "acceptRate" },
  "byDay": [{ "date", "requests", "errors" }],
  "byDayAccept": [{ "date", "recRate", "taskRate" }],
  "byProvider": [{ "provider", "model", "calls", "tokens", "estimatedCostUsd" }],
  "recentActivity": [{ "id", "timestamp", "action", "user_id", "provider", "model", "input_tokens", "output_tokens", "total_tokens", "latency_ms" }],
  "total": "<number>"
}
```

---

## F. Catatan Penting — Reschedule

Item **reschedule endpoint** di added-card merujuk pada arsitektur yang berbeda dengan implementasi yang ada.

- **Architecture saat ini:** Reschedule ditangani secara implisit melalui mekanisme skip/re-plan di coach flow. Saat pengguna melewati tugas (`skip`), sistem mencatat `rescheduled_date` di metadata audit log (`static-response.service.js` baris 129). Tidak ada endpoint REST khusus untuk reschedule.
- **Keputusan desain:** Alih-alih membuat endpoint CRUD terpisah untuk reschedule, sistem mengandalkan AI coach untuk menangani penjadwalan ulang secara kontekstual melalui sesi adjustment/chat. Ini selaras dengan arsitektur HITL (Human-in-the-Loop) di mana semua perubahan jadwal melalui rekomendasi AI yang harus di-*accept* pengguna.
- **Konsekuensi:** Test untuk reschedule endpoint tidak relevan dengan arsitektur saat ini dan tidak perlu ditambahkan.

---

## G. Ringkasan Status

| Kategori | Item | Status |
|----------|------|--------|
| UX | Toast notifications | ✅ |
| UX | Transition animations | ✅ |
| UX | Responsive design | ✅ |
| Explainability | Rationale array | ✅ |
| Explainability | Confidence indicator | ✅ |
| Explainability | Acceptance rate per rationale type | ❌ Belum |
| Testing | Status transition tests | ✅ |
| Testing | Coverage threshold | ✅ |
| A11y | Skip-to-content link | ❌ Belum |
| A11y | aria-live dynamic areas | ✅ |
| A11y | Lighthouse a11y ≥ 90 | ✅ |
| Admin | Laman admin | ✅ |

### Gap Aktual (2 item):
1. **Log acceptance rate per rationale type** — perlu desain skema dan mekanisme logging baru
2. **Skip-to-content link** — perlu tambahkan elemen di layout untuk keyboard users

---

*Diverifikasi pada 05/06/26. Referensi silang: `docs/TC014-report.md` untuk detail Lighthouse, coverage, dan E2E.*
