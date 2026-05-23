# README Test: Pengujian Manajemen Tugas & Fitur AI

Dokumen ini berisi hasil pengujian manajemen task, rekomendasi AI, progress snapshot, overdue detection, dan flow reschedule.

Generated: 2026-05-23T07:07:44.831Z

## Scope Pengujian

| TC | Fokus |
| --- | --- |
| TC-03 | Membuat tugas baru secara manual dan memastikan data tersimpan di database. |
| TC-04 | Membuat tugas berdasarkan rekomendasi/saran dari AI. |
| TC-05 | Mengubah status tugas dari `todo` ke `done` dan memvalidasi perubahan progress snapshot. |
| TC-06 | Memastikan sistem mendeteksi tugas yang melewati tenggat waktu atau overdue. |
| TC-07 | Menguji fitur reschedule otomatis via AI untuk tugas overdue, lalu mencoba aksi Accept dan Reject pada saran tersebut. |

## Setup Guide

1. Jalankan database dan Redis.

```bash
docker compose up db redis -d
```

2. Jalankan backend.

```bash
cd server
npm install
npm run migrate:up
npm run dev
```

3. Jalankan frontend.

```bash
cd client
npm install
npm run dev
```

4. Jalankan automated test dan screenshot.

```bash
node scripts/run-calendar-task-ai-tc01-tc07.js
```

## Before Test

| Area | Kondisi Awal |
| --- | --- |
| User testing | Script membuat user sementara dengan prefix `tc01-tc07-ui-`. |
| Goal testing | Goal sementara dibuat untuk menampung task manual dan task AI. |
| Manual task | Belum ada task manual khusus TC-03. |
| AI recommendation | Belum ada recommendation sebelum TC-04 dijalankan. |
| Progress snapshot | Belum ada progress snapshot untuk task TC-05. |
| Overdue task | Belum ada task overdue khusus TC-06/TC-07. |

## Summary

| Status | Count |
| --- | ---: |
| PASS | 5 |
| WARN | 0 |
| FAIL | 0 |

## Hasil Pengujian

| TC | Status | Evidence | Screenshot |
| --- | --- | --- | --- |
| TC-03 | PASS | Task manual tersimpan dan bisa dibaca ulang via API dengan `source=manual`. | [lihat screenshot](assets/images/tc01-tc07-calendar-task-ai/04-tc03-manual-task.png) |
| TC-04 | PASS | Recommendation AI diterima dan 5 task AI tersimpan sebagai task baru. | [lihat screenshot](assets/images/tc01-tc07-calendar-task-ai/05-tc04-ai-task.png) |
| TC-05 | PASS | Task manual berubah menjadi `done`; progress weekly snapshot terisi dengan `completed_hours=0.7`. | [lihat screenshot](assets/images/tc01-tc07-calendar-task-ai/06-tc05-progress-snapshot.png) |
| TC-06 | PASS | Task dengan `planned_date` sebelum hari ini terdeteksi sebagai overdue dari data backend. | [lihat screenshot](assets/images/tc01-tc07-calendar-task-ai/07-tc06-overdue-data.png) |
| TC-07 | PASS | Overdue task berhasil di-reschedule, aksi Accept membuat 1 task, dan aksi Reject tidak menambah task. | [lihat screenshot](assets/images/tc01-tc07-calendar-task-ai/08-tc07-reschedule-accept-reject.png) |

## Screenshot Step by Step

### 1. TC-03 - Task manual tersimpan dan tampil di kalender

![TC-03 manual task visible](assets/images/tc01-tc07-calendar-task-ai/04-tc03-manual-task.png)

### 2. TC-04 - Task dari rekomendasi AI tersimpan

![TC-04 AI task visible](assets/images/tc01-tc07-calendar-task-ai/05-tc04-ai-task.png)

### 3. TC-05 - Progress snapshot setelah task selesai

![TC-05 progress page](assets/images/tc01-tc07-calendar-task-ai/06-tc05-progress-snapshot.png)

### 4. TC-06 - Bukti data overdue dibuat

![TC-06 overdue evidence](assets/images/tc01-tc07-calendar-task-ai/07-tc06-overdue-data.png)

### 5. TC-07 - Reschedule, Accept, dan Reject selesai diuji

![TC-07 reschedule accept reject evidence](assets/images/tc01-tc07-calendar-task-ai/08-tc07-reschedule-accept-reject.png)

## After Test

| Area | Kondisi Setelah Test |
| --- | --- |
| TC-03 | Task manual tersimpan di database dan tampil di kalender. |
| TC-04 | Rekomendasi AI dapat diterima dan berubah menjadi task tersimpan. |
| TC-05 | Status task berubah menjadi `done` dan progress snapshot ikut berubah. |
| TC-06 | Sistem dapat mendeteksi task overdue berdasarkan tanggal. |
| TC-07 | Flow reschedule otomatis, Accept proposal, dan Reject recommendation berjalan sesuai ekspektasi. |

## Catatan Tester

- Validasi utama dilakukan lewat API agar data benar-benar terbukti tersimpan di backend/database.
- Screenshot dipakai sebagai bukti visual dari state UI setelah masing-masing flow berjalan.
- Hasil akhir TC-03 sampai TC-07 adalah PASS.
