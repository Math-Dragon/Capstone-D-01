# TC-001 sampai TC-017 Submission Status

Dokumen ini merangkum status implementasi dan bukti utama untuk TC-001 sampai TC-017 yang sudah dikerjakan dalam repository.

## Ringkasan Status

| TC | Judul | Status | Bukti utama |
| --- | --- | --- | --- |
| TC-001 | Empty, error, loading state | Done | `team/docs/tc001-tc006-accessibility-validation.md`, `team/client/tests/features/goals/components/GoalsPage.test.jsx` |
| TC-002 | Error message informatif + aksi recovery | Done | `team/docs/tc001-tc006-accessibility-validation.md` |
| TC-003 | Keyboard navigation kalender | Done | `team/client/tests/pages/CalendarPage.test.jsx` |
| TC-004 | Keyboard navigation daftar tugas | Done | `team/client/tests/components/TaskCard.test.jsx`, `team/client/tests/pages/CalendarPage.test.jsx` |
| TC-005 | ARIA labels komponen interaktif | Done | `team/docs/tc001-tc006-accessibility-validation.md`, test auth/calendar/task |
| TC-006 | Color contrast WCAG AA | Partial | Token warna sudah diperkuat, tetapi audit browser penuh tetap perlu bukti final |
| TC-007 | Rationale AI ditampilkan | Done | `team/client/src/components/RationaleDisplay.jsx`, `team/client/tests/components/RationaleDisplay.test.jsx` |
| TC-008 | Acceptance rate AI terdokumentasi | Done | `team/docs/ai-acceptance-rate.md` |
| TC-009 | Unit test validasi output AI | Done | `team/server/tests/unit/ai.service.test.js`, `team/client/tests/features/goals/schemas.test.js` |
| TC-010 | Integration flow AI suggest -> accept -> calendar | Done | `team/server/tests/unit/ai-accept-idempotency.test.js`, `team/client/tests/pages/CalendarExport.test.jsx` |
| TC-011 | Bukan bagian sesi ini | Out of scope | Tidak dirangkum lebih lanjut di dokumen ini |
| TC-012 | Bukan bagian sesi ini | Out of scope | Tidak dirangkum lebih lanjut di dokumen ini |
| TC-013 | Bukan bagian sesi ini | Out of scope | Tidak dirangkum lebih lanjut di dokumen ini |
| TC-014 | Dokumentasi biaya AI per 100 request | Done | `team/docs/tc14-ai-cost-per-100-requests.md` |
| TC-015 | AI cost tracking aktif | Done | `team/docs/ai-cost-token-metrics.md`, `team/server/src/utils/metrics.js` |
| TC-016 | Token usage tercatat di log | Done | `team/docs/ai-cost-token-metrics.md`, `team/server/tests/unit/ai-observability.test.js` |
| TC-017 | `/metrics` menyajikan data AI | Done | `team/docs/ai-cost-token-metrics.md`, `team/server/src/routes/metrics.js` |

## Detail Per Kelompok

### TC-001 sampai TC-006: Accessibility dan UX Safety Net

Fokus kelompok ini adalah memastikan aplikasi tetap jelas dipakai saat data kosong, loading, atau error, sekaligus tetap bisa digunakan dengan keyboard dan screen reader.

Bukti utama:

- `team/docs/tc001-tc006-accessibility-validation.md`
- `team/client/tests/pages/CalendarPage.test.jsx`
- `team/client/tests/components/TaskCard.test.jsx`
- `team/client/tests/pages/DashboardPage.test.jsx`
- `team/client/tests/pages/ProgressPage.test.jsx`
- `team/client/tests/pages/GoalDetailPage.test.jsx`
- `team/client/tests/features/goals/components/GoalCard.test.jsx`
- `team/client/tests/features/goals/components/GoalsPage.test.jsx`
- `team/client/tests/features/auth/components/LoginPage.test.jsx`
- `team/client/tests/features/auth/components/RegisterPage.test.jsx`
- `team/client/tests/features/coach/CoachPage.test.jsx`

Catatan:

- `GoalsPage` sekarang punya bukti test untuk loading state, error state, empty state, dan filter-empty state.
- `GoalCard` sekarang memakai label aksi yang lebih jelas dan accessible.
- TC-006 paling aman diposisikan `Partial` bila assessor meminta bukti audit browser formal seperti Lighthouse atau axe screenshot final.

### TC-007 sampai TC-010: AI Feature dan Validation

Fokus kelompok ini adalah memastikan output AI bisa dijelaskan, diterima pengguna, diuji, dan masuk ke alur task/calendar.

Bukti utama:

- `team/client/src/components/RationaleDisplay.jsx`
- `team/client/tests/components/RationaleDisplay.test.jsx`
- `team/docs/ai-acceptance-rate.md`
- `team/server/tests/unit/ai.service.test.js`
- `team/server/tests/unit/ai-accept-idempotency.test.js`
- `team/server/src/services/ai.service.js`
- `team/server/src/services/task.service.js`
- `team/client/src/pages/CalendarPage.jsx`

Catatan:

- Jalur accept AI dibuat lebih aman terhadap duplikasi dan side effect berulang.
- Publish event untuk recommendation acceptance dan task completion sudah terhubung ke event layer.

### TC-014 sampai TC-017: Cost, Logging, Metrics

Fokus kelompok ini adalah observability AI: biaya, token, dan metrik operasional.

Bukti utama:

- `team/docs/tc14-ai-cost-per-100-requests.md`
- `team/docs/ai-cost-token-metrics.md`
- `team/server/src/utils/metrics.js`
- `team/server/src/routes/metrics.js`
- `team/server/src/db.js`
- `team/server/tests/unit/ai-observability.test.js`
- `team/server/tests/unit/db.test.js`

Catatan:

- Logging token usage dan estimated cost sudah terdokumentasi.
- Slow query detection >500ms juga sudah aktif untuk membantu observability umum backend.

## Focused Test Evidence

### Client

Batch focused test terakhir yang lulus:

- `tests/features/goals/components/GoalCard.test.jsx`
- `tests/features/goals/components/GoalsPage.test.jsx`
- `tests/pages/HomePage.test.jsx`

Hasil:

- `3` file lulus
- `21` test lulus

### Server

Batch focused test terakhir yang lulus:

- `tests/unit/goal.service.test.js`
- `tests/unit/task.service.test.js`
- `tests/unit/health-route.test.js`
- `tests/unit/db.test.js`

Hasil:

- `4` suite lulus
- `40` test lulus

## Evidence Tambahan yang Masih Perlu Disiapkan

Item berikut bukan blocker implementasi kode, tetapi masih perlu bila submission meminta bukti operasional penuh:

1. Screenshot atau export hasil audit contrast/accessibility final untuk TC-006
2. Capture production `GET /health`
3. Screenshot atau link run CI hijau
4. Sampel log production yang menunjukkan observasi AI usage dan tidak ada slow query kritikal

## Dokumen Pendamping

- `team/docs/sprint-readiness-audit-cycle4.md`
- `team/docs/field-validation-evidence-template.md`
- `team/docs/deployment-readiness-checklist.md`
- `team/docs/ai-cost-token-metrics.md`
- `team/docs/tc001-tc006-accessibility-validation.md`
