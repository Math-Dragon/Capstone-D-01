# TC-03 sampai TC-07 Run Report

Generated: 2026-05-24T09:26:21.888Z

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
| SETUP | PASS | Membuat user dan goal sementara | User tc03-tc07-1779614775395@example.com dan goal 05501c27-238b-41d2-af3b-a746f98bf062 dibuat |
| TC-03 | PASS | Membuat tugas manual dan memastikan data tersimpan | Task dcdc9cc9-e84a-4b9b-bcf8-9c1c616499f7 bisa dibaca ulang via API dengan source=manual |
| TC-04 | PASS | Membuat tugas dari rekomendasi AI | Recommendation fba6a40a-421b-494a-acee-792cb1fba2c4 diterima dan 2 task AI tersimpan |
| TC-05 | PASS | Mengubah status todo ke done dan validasi progress snapshot | Task dcdc9cc9-e84a-4b9b-bcf8-9c1c616499f7 done; progress 2026-W22 completed_hours=0.7 |
| TC-06 | PASS | Mendeteksi tugas yang melewati tenggat waktu | Task ac8ee15b-aa5f-4143-be56-988210a8d70d terdeteksi overdue karena planned_date=2026-05-22T17:00:00.000Z |
| TC-07 | PASS | Reschedule otomatis dan aksi Accept/Reject saran | Overdue task dipindah ke 2026-05-24T17:00:00.000Z; Accept membuat 1 task; Reject tidak menambah task |

## Catatan

- TC-07 memvalidasi reschedule otomatis melalui aksi coach `SKIP_TASK` pada task overdue.
- Aksi Accept divalidasi melalui `ACCEPT_PROPOSAL` yang menyimpan plan baru.
- Aksi Reject divalidasi melalui reject recommendation AI, karena penolakan proposal overlay di frontend bersifat lokal dan tidak membuat perubahan data backend.

## Command

```bash
node scripts/run-tc03-tc07.js
```
