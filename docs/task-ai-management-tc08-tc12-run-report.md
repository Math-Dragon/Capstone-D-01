# TC-08 sampai TC-12 Run Report

Generated: 2026-05-21T05:16:32.764Z

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
| SETUP | PASS | Membuat dua user, goal, dan task sementara | User A tc08-tc12-a-1779340591453@example.com, User B tc08-tc12-b-1779340592078@example.com, goal bdc41efc-6575-40a7-b185-375e8f2c040c |
| TC-08 | PASS | Validasi input task invalid | Duration terlalu kecil dan slot invalid sama-sama ditolak dengan VALIDATION_ERROR |
| TC-09 | PASS | Proteksi ownership task antar user | User B tidak bisa membaca/mengubah task ba1ab321-46ca-4843-9a93-e7665296f92e |
| TC-10 | PASS | Aksi coach COMPLETE_TASK tanpa perlu LLM | Task e963d99a-0f81-47d4-874e-516746e97063 done, metric total_completed=1, audit tercatat |
| TC-11 | PASS | Aksi coach SKIP_TASK melakukan reschedule statis | Task b3a82264-2679-42de-ac1e-4c63b329d632 skipped dan dipindah dari 2026-05-19 ke 2026-05-21 |
| TC-12 | PASS | AI suggestion tersedia atau fallback error jelas | Provider AI unavailable ditangani dengan AI_UNAVAILABLE dan tidak membuat task baru |

## Command

```bash
node scripts/run-task-ai-management-extra.js
```
