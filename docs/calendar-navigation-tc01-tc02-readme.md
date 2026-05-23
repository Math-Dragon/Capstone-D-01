# README Test: Pengujian Kalender & Navigasi

Dokumen ini berisi hasil pengujian fitur kalender mingguan dan navigasi pekan pada project StepUp.

Generated: 2026-05-23T07:07:44.831Z

## Scope Pengujian

| TC | Fokus |
| --- | --- |
| TC-01 | Memastikan tugas muncul di slot waktu kalender mingguan yang tepat sesuai timestamp. |
| TC-02 | Memastikan tombol navigasi minggu Next/Previous dapat berpindah pekan dan memuat data yang benar. |

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
| Goal testing | Goal sementara dibuat khusus untuk pengujian kalender. |
| Data kalender | Script membuat task pada slot pagi, siang, malam, dan satu task pada minggu berikutnya. |
| Tampilan kalender | Kalender dibuka pada mode `Minggu`. |

## Summary

| Status | Count |
| --- | ---: |
| PASS | 2 |
| WARN | 0 |
| FAIL | 0 |

## Hasil Pengujian

| TC | Status | Evidence | Screenshot |
| --- | --- | --- | --- |
| TC-01 | PASS | Task pagi, siang, dan malam tampil di tampilan minggu sesuai `planned_date` dan `planned_slot`. | [lihat screenshot](assets/images/tc01-tc07-calendar-task-ai/01-tc01-weekly-slots.png) |
| TC-02 | PASS | Tombol minggu berikutnya menampilkan task TC-02, lalu tombol minggu sebelumnya kembali menampilkan task TC-01. | [next week](assets/images/tc01-tc07-calendar-task-ai/02-tc02-next-week.png)<br>[previous week](assets/images/tc01-tc07-calendar-task-ai/03-tc02-previous-week.png) |

## Screenshot Step by Step

### 1. TC-01 - Task tampil di slot waktu kalender mingguan

![TC-01 weekly slot timestamp](assets/images/tc01-tc07-calendar-task-ai/01-tc01-weekly-slots.png)

### 2. TC-02 - Navigasi ke minggu berikutnya

![TC-02 next week navigation](assets/images/tc01-tc07-calendar-task-ai/02-tc02-next-week.png)

### 3. TC-02 - Navigasi kembali ke minggu sebelumnya

![TC-02 previous week navigation](assets/images/tc01-tc07-calendar-task-ai/03-tc02-previous-week.png)

## After Test

| Area | Kondisi Setelah Test |
| --- | --- |
| Kalender mingguan | Task tampil sesuai tanggal lokal dan slot waktunya. |
| Navigasi minggu | Next/Previous bekerja dan memuat data pekan yang sesuai. |

## Catatan Tester

- Screenshot diambil sebagai satu tangkapan layar utuh per langkah.
- Bug tanggal sempat ditemukan pada script test karena `toISOString()` menggeser tanggal lokal; sudah diperbaiki dengan formatter tanggal lokal.
- Hasil akhir TC-01 dan TC-02 adalah PASS.
