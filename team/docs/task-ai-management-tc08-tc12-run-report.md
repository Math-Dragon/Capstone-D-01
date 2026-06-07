# TC-08 sampai TC-12 Run Report

Generated: 2026-05-24T09:30:10.105Z

API Base URL: `http://localhost:3000/api`

## Summary

| Status | Count |
| --- | ---: |
| PASS | 6 |
| WARN | 0 |
| FAIL | 0 |

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
| SETUP | PASS | Membuat dua user, goal, dan task sementara | User A tc08-tc12-a-1779615006332@example.com, User B tc08-tc12-b-1779615006917@example.com, goal 509519d4-b62f-497e-9098-823dadf028b1 |
| TC-08 | PASS | Validasi input task invalid | Duration terlalu kecil dan slot invalid sama-sama ditolak dengan VALIDATION_ERROR |
| TC-09 | PASS | Proteksi ownership task antar user | User B tidak bisa membaca/mengubah task 4293b126-8aed-42eb-8f53-4056db2719f7 |
| TC-10 | PASS | Aksi coach COMPLETE_TASK tanpa perlu LLM | Task 57a376f2-5fd9-4b9b-9c58-fce4ae249d14 done, metric total_completed=1, audit tercatat |
| TC-11 | PASS | Aksi coach SKIP_TASK melakukan reschedule statis | Task 033c729b-912d-460b-bc36-415bcaac2312 skipped dan dipindah dari 2026-05-22 ke 2026-05-24 |
| TC-12 | PASS | AI suggestion tersedia atau fallback error jelas | AI tersedia dan mengembalikan recommendation f7d9f56d-fcbd-406e-adbc-0a42e8b64771 |

## Command

```bash
node scripts/run-task-ai-management-extra.js
```
