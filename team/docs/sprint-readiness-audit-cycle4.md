# Sprint Readiness Audit (Cycle 4+)

Dokumen ini merangkum status kesiapan project terhadap checklist operasional, quality gate, dan bukti sprint yang diminta setelah Cycle 4.

Status menggunakan tiga label:

- `Done`: sudah ada implementasi atau bukti yang cukup di repo
- `Partial`: sebagian sudah ada, tetapi masih butuh bukti tambahan atau validasi production
- `Missing`: belum ada bukti atau aktivitas yang diminta belum dilakukan

## Ringkasan

| Kriteria | Status | Bukti |
| --- | --- | --- |
| Health check `/health` mengembalikan OK di production | Partial | Route dan test ada di `team/server/src/routes/health.js` dan `team/server/tests/unit/health-route.test.js`, tetapi bukti runtime production belum dicatat |
| Tidak ada query database > 500ms | Partial | Slow-query logging >500ms sekarang ada di `team/server/src/db.js` dan `team/server/tests/unit/db.test.js`, tetapi belum ada laporan observasi production |
| Commit history mengikuti Conventional Commits | Done | Riwayat commit terbaru konsisten memakai prefix `feat:`, `fix:`, `docs:`, `test:` |
| Semua known bugs severity critical dan major terperbaiki | Partial | Bug yang ditemukan saat audit lokal sudah diperbaiki, tetapi belum ada register bug formal di repo untuk klaim “semua” |
| Tidak ada test gagal di CI pipeline | Partial | Workflow CI ada di `.github/workflows/ci.yml`, dan suite lokal hijau, tetapi hasil run GitHub Actions terbaru belum dicatat di repo |
| Edge case `no goals` tertangani | Done | Empty result goals ter-cover di `team/server/tests/unit/goal.service.test.js` dan UI empty/filter state ter-cover di `team/client/tests/features/goals/components/GoalsPage.test.jsx` |
| Edge case invalid transitions tertangani | Done | Ter-cover di `team/server/tests/unit/task.service.test.js` dan `team/server/tests/unit/task-routes.test.js` |
| Edge case cross-user access tertangani | Done | Akses service/repo memakai `findByIdAndUser` dan `findByIdAndUserId`; test ownership ada di service tests |
| Data export endpoint berfungsi dan valid | Done | `.ics` export ada di `team/server/src/routes/calendar.js` dan test di `team/server/tests/unit/calendar-route.test.js` |
| Event system terintegrasi | Done | Webhook registration, delivery, dan publish ada di `team/server/src/routes/webhooks.js` dan `team/server/src/services/webhook.service.js` |
| `task.completed` event tercatat di log | Done | Event log eksplisit ada di `team/server/src/services/webhook.service.js`, test di `team/server/tests/unit/webhook.service.test.js` |
| Dog-fooding 1 minggu penuh | Missing | Belum bisa dibuktikan lewat codebase |
| 1 orang di luar tim mencoba 30 menit | Missing | Belum ada catatan sesi pengguna eksternal |
| Minimal 5 GitHub issues closed selama sprint | Missing | Belum ada bukti issue list/export yang disimpan di repo |

## Detail Bukti Teknis

### 1. Health Check

- Endpoint: `GET /health`
- File: `team/server/src/routes/health.js`
- Test:
  - `team/server/tests/unit/health-route.test.js`
  - `team/server/tests/smoke.test.js`

Response health sekarang sudah memuat:

- `status`
- `timestamp`
- `database`
- `ai.status`
- `ai.provider`
- `ai.configured`

Catatan: untuk status `Done` penuh, masih dibutuhkan satu capture nyata dari environment production.

### 2. Database Query > 500ms

Saat ini query database yang lambat akan mengeluarkan log:

- `event: db_slow_query`
- `duration_ms`
- `query_preview`

Lokasi:

- `team/server/src/db.js`
- `team/server/tests/unit/db.test.js`

Ini berarti sistem sudah siap mendeteksi query lambat, tetapi belum otomatis membuktikan bahwa production bebas query lambat.

### 3. Event System dan Logging

Fitur yang sudah aktif:

- webhook subscription persistence
- signed outbound delivery
- publish fan-out per event
- publish pada `task.completed`
- publish pada `ai.recommendation.accepted`

Lokasi:

- `team/server/src/models/webhook-subscription.model.js`
- `team/server/src/repositories/webhook-subscription.repo.js`
- `team/server/src/routes/webhooks.js`
- `team/server/src/services/webhook.service.js`
- `team/server/src/services/task.service.js`
- `team/server/src/services/ai.service.js`

Log event publish sekarang memuat:

- `event`
- `event_source`
- `user_id`
- `subscription_count`

### 4. Edge Cases

#### Invalid transitions

- Ditolak di service dan route layer
- Bukti:
  - `team/server/tests/unit/task.service.test.js`
  - `team/server/tests/unit/task-routes.test.js`

#### Cross-user access

- Repo/service memakai ownership filter:
  - `findByIdAndUser`
  - `findByIdAndUserId`
- Bukti:
  - `team/server/src/services/task.service.js`
  - `team/server/src/services/goal.service.js`
  - `team/server/tests/unit/task.service.test.js`
  - `team/server/tests/unit/goal.service.test.js`

#### No goals

- Empty result service-level sudah aman
- Empty state, loading state, error state, dan filter-empty state goals juga sudah diuji di client
- Bukti:
  - `team/server/tests/unit/goal.service.test.js`
  - `team/client/tests/features/goals/components/GoalsPage.test.jsx`

### 5. Data Export

Saat ini endpoint export kalender:

- `GET /api/calendar/export.ics`

Sudah:

- authenticated
- mengembalikan `text/calendar`
- mengirim attachment `stepup-calendar.ics`
- punya test route dan service

Lokasi:

- `team/server/src/routes/calendar.js`
- `team/server/src/services/calendar-export.service.js`
- `team/server/tests/unit/calendar-route.test.js`
- `team/server/tests/unit/calendar-export.service.test.js`
- `team/client/src/pages/CalendarPage.jsx`
- `team/client/tests/pages/CalendarExport.test.jsx`

## Quality Gate Lokal yang Sudah Lulus

### Server

Focused suites yang terakhir lulus:

- `tests/unit/db.test.js`
- `tests/unit/webhook.service.test.js`
- `tests/unit/task.service.test.js`
- `tests/unit/ai-accept-idempotency.test.js`
- `tests/unit/calendar-route.test.js`
- `tests/unit/health-route.test.js`

Hasil:

- `6` suites passed
- `37` tests passed

Focused suites lain yang sebelumnya juga lulus:

- `tests/unit/repositories.test.js`
- `tests/unit/webhook-routes.test.js`
- `tests/unit/calendar-export.service.test.js`

Hasil:

- `7` suites passed
- `101` tests passed

### Client

Focused suites yang lulus:

- `tests/pages/CalendarPage.test.jsx`
- `tests/pages/CalendarExport.test.jsx`
- `tests/features/goals/components/GoalCard.test.jsx`
- `tests/features/goals/components/GoalsPage.test.jsx`

Hasil:

- `4` files passed
- `33` tests passed

## Hal yang Masih Perlu Dilengkapi di Luar Code

1. Capture production `GET /health`
2. Bukti tidak ada slow query production, minimal dari log sample
3. Screenshot atau link GitHub Actions run hijau
4. Log dog-fooding selama 1 minggu
5. Catatan sesi 30 menit dari pengguna luar tim
6. Daftar minimal 5 GitHub issues yang closed selama sprint

## Rekomendasi Penutupan

Urutan tercepat untuk membuat checklist ini “siap submit”:

1. Simpan satu bukti production health
2. Simpan satu potongan log yang menunjukkan tidak ada `db_slow_query` pada alur utama
3. Simpan screenshot GitHub Actions hijau
4. Isi template field evidence di `team/docs/field-validation-evidence-template.md`
