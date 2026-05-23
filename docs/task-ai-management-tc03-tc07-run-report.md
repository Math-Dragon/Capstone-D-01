# TC-03 sampai TC-07 Run Report

Generated: 2026-05-22T03:51:50.219Z

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
| Data testing | Script membuat user dan goal sementara agar tidak mengganggu data utama. |
| Manual task | Belum ada task manual untuk TC-03. |
| AI recommendation | Belum ada recommendation khusus untuk TC-04/TC-07. |
| Progress snapshot | Belum divalidasi untuk task manual TC-05. |
| Overdue task | Belum ada task overdue khusus TC-06/TC-07. |

## After Test

| TC | Status | Test | Evidence |
| --- | --- | --- | --- |
| SETUP | PASS | Membuat user dan goal sementara | User tc03-tc07-1779421908776@example.com dan goal 90fc9730-a5f6-4950-b8b6-d1a9c9d6a898 dibuat |
| TC-03 | PASS | Membuat tugas manual dan memastikan data tersimpan | Task 48e91eb7-d4fa-4c45-91f8-4d0f5606cf84 bisa dibaca ulang via API dengan source=manual |
| TC-04 | PASS | Membuat tugas dari rekomendasi AI | Recommendation 3de7a23a-3b10-4bbf-9167-7db381770951 diterima dan 5 task AI tersimpan |
| TC-05 | PASS | Mengubah status todo ke done dan validasi progress snapshot | Task 48e91eb7-d4fa-4c45-91f8-4d0f5606cf84 done; progress 2026-W21 completed_hours=0.7 |
| TC-06 | PASS | Mendeteksi tugas yang melewati tenggat waktu | Task b44c7e7f-6bb1-44b4-bef0-664d724dc631 terdeteksi overdue karena planned_date=2026-05-20T17:00:00.000Z |
| TC-07 | PASS | Reschedule otomatis dan aksi Accept/Reject saran | Overdue task dipindah ke 2026-05-24T17:00:00.000Z; Accept membuat 1 task; Reject tidak menambah task |

## Catatan

- TC-07 memvalidasi reschedule otomatis melalui aksi coach `SKIP_TASK` pada task overdue.
- Aksi Accept divalidasi melalui `ACCEPT_PROPOSAL` yang menyimpan plan baru.
- Aksi Reject divalidasi melalui reject recommendation AI, karena penolakan proposal overlay di frontend bersifat lokal dan tidak membuat perubahan data backend.

## Command

```bash
node scripts/run-tc03-tc07.js
```
