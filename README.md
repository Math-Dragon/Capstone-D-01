# README Test Gemini - Panduan User Baru & Bukti Testing

Dokumen ini adalah guide terbaru untuk user baru menggunakan StepUp. Testing dilakukan secara lokal memakai akun:

```text
Email    : testing123@gmail.com
Password : Testing123
```

Testing ini memakai AI provider **Gemini**, bukan mock. Bukti dari backend:

Semua screenshot pada guide ini sudah diambil ulang sebagai **satu viewport utuh 1365x768** dengan `fullPage: false`, sehingga tidak ada long screenshot, potongan bertumpuk, atau halaman yang terlihat tersambung tidak rapi.

```text
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash-lite
LLM_MAX_OUTPUT_TOKENS=2200
```

Pada alur Coach, hasil rekomendasi juga sudah dicek tidak mengandung teks `[MOCK]`.

## 1. Setup Project Lokal

### Prasyarat

- Node.js 20+
- npm
- Docker Desktop
- PostgreSQL dan Redis lewat Docker Compose

### Jalankan Database dan Redis

```bash
docker compose up db redis -d
```

### Jalankan Backend

```bash
cd server
npm install
npm run migrate:up
npm run dev
```

Konfigurasi backend yang dipakai untuk testing Gemini:

```env
DATABASE_URL=postgres://user:pass@localhost:5432/planner
REDIS_URL=redis://localhost:6379
JWT_SECRET=local_dev_jwt_secret_minimum_32_chars
JWT_REFRESH_SECRET=local_dev_refresh_secret_minimum_32_chars
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash-lite
LLM_MAX_OUTPUT_TOKENS=2200
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173
```

> Jangan commit `GEMINI_API_KEY` ke repo publik. Simpan sebagai environment secret saat deployment.

### Jalankan Frontend

```bash
cd client
npm install
npm run dev
```

URL lokal:

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://localhost:3000/health`

## 2. Login

Buka halaman login, masukkan akun testing, lalu klik `Masuk`.

![Halaman login](docs/assets/images/01-login-page.png)

![Login akun testing](docs/assets/images/02-login-filled-testing-account.png)

## 3. Check-In Harian

Setelah login, user dapat mengisi mood harian. Fitur ini membantu Coach memahami kondisi user sebelum menampilkan dashboard.

![Check-in harian](docs/assets/images/03-check-in-gateway.png)

Setelah check-in, Dashboard terbuka.

![Dashboard setelah check-in](docs/assets/images/04-dashboard-after-check-in.png)

## 4. Dashboard

Dashboard menampilkan:

- goal aktif
- persentase progress
- jumlah task selesai
- task in progress
- focus points
- urgent task
- momentum mingguan
- prioritas task
- task yang akan dikerjakan berikutnya

![Dashboard dengan rencana Gemini](docs/assets/images/09-dashboard-with-gemini-plan.png)

## 5. AI Learning Coach dengan Gemini

Buka menu `Coach`. Di halaman ini user bisa membuat rencana belajar baru atau bertanya melalui chat.

![Coach Gemini](docs/assets/images/05-coach-home-gemini.png)

Klik `Buat Rencana Belajar`, lalu isi:

- Judul Tujuan
- Deskripsi
- Deadline
- Jam belajar per minggu
- Waktu preferensi
- Hari belajar

Data testing yang digunakan:

```text
Judul      : Belajar React dengan Gemini Guide
Deskripsi  : Mempelajari React hooks, routing, state management, dan testing aplikasi dengan bantuan AI Gemini.
Deadline   : 30 Juni 2026
Jam/minggu : 5
Preferensi : Pagi
Hari       : Weekdays
```

![Form rencana belajar Gemini](docs/assets/images/06-coach-plan-form-filled-gemini.png)

Setelah submit, Gemini membuat rekomendasi task. Hasil yang muncul pada screenshot ini adalah output Gemini real, bukan mock.

![Rekomendasi Gemini](docs/assets/images/07-gemini-recommendation-result.png)

Terima task yang sesuai. Pada testing ini, 5 task diterima dan masuk ke jadwal.

![Task Gemini diterima](docs/assets/images/08-gemini-tasks-accepted.png)

## 6. Targetku

Menu `Targetku` menampilkan semua goal belajar. User bisa:

- melihat daftar goal
- mencari goal
- membuka detail goal
- menambah goal baru melalui Coach
- edit goal
- hapus goal

![Daftar target Gemini](docs/assets/images/10-goals-list-gemini.png)

## 7. Detail Goal dan Task

Klik goal untuk membuka detail. Halaman detail menampilkan:

- judul dan deskripsi goal
- status goal
- progress goal
- total task
- total estimasi waktu
- daftar task per tanggal
- pembagian task per sesi pagi/siang/malam
- action task: `Done`, `Modify`, dan `Skip`
- panel `Pengaturan Cepat`

![Detail goal Gemini](docs/assets/images/11-goal-detail-gemini-tasks.png)

Task dari Gemini pada testing ini mencakup:

- `acquire`: belajar konsep awal
- `practice`: latihan implementasi
- `reflect`: refleksi mingguan

## 8. Kalender

Menu `Kalender` membantu user melihat jadwal belajar.

### Today View

Mode `Today` fokus pada task hari ini, streak, task selesai, task terjadwal, dan sisa task.

![Kalender Today Gemini](docs/assets/images/12-calendar-today-gemini.png)

### Week View

Mode `Week` menampilkan distribusi rencana belajar satu minggu, total durasi, dan task mendatang.

![Kalender Week Gemini](docs/assets/images/13-calendar-week-gemini.png)

## 9. Progress

Menu `Progress` menampilkan analisis belajar:

- jumlah task selesai
- total task
- waktu terpakai
- total estimasi waktu
- tingkat penyelesaian
- rata-rata kesulitan
- distribusi tipe task
- catatan adaptasi bila ada

![Progress Gemini](docs/assets/images/14-progress-gemini.png)

## 10. Chat Coach

Selain membuat rencana, user bisa bertanya langsung ke Coach.

Contoh pertanyaan:

```text
Apa langkah terbaik saya setelah menerima rencana dari Gemini?
```

![Pertanyaan ke Coach Gemini](docs/assets/images/15-coach-chat-question-gemini.png)

Coach memberikan jawaban singkat dan actionable.

![Jawaban Coach Gemini](docs/assets/images/16-coach-chat-response-gemini.png)

## 11. Observability

Panel observability tersedia pada halaman Coach untuk membantu debugging alur AI, audit, dan metrik rekomendasi.

![Observability Coach](docs/assets/images/17-coach-observability-gemini.png)

## 12. Fitur yang Diverifikasi

| Fitur | Status | Bukti |
| --- | --- | --- |
| Login email/password | Berjalan | Screenshot 01-02 |
| Check-in harian | Berjalan | Screenshot 03 |
| Dashboard | Berjalan | Screenshot 04 dan 09 |
| Coach dengan Gemini | Berjalan | Screenshot 05-08 |
| Rekomendasi tanpa `[MOCK]` | Berjalan | Screenshot 07 |
| Accept task rekomendasi | Berjalan | Screenshot 08 |
| Targetku | Berjalan | Screenshot 10 |
| Detail goal dan task action | Berjalan | Screenshot 11 |
| Kalender Today | Berjalan | Screenshot 12 |
| Kalender Week | Berjalan | Screenshot 13 |
| Progress analytics | Berjalan | Screenshot 14 |
| Chat Coach | Berjalan | Screenshot 15-16 |
| Observability | Tersedia | Screenshot 17 |

## 13. Alur Rekomendasi untuk User Baru

1. Login memakai akun testing.
2. Isi check-in mood harian.
3. Buka `Coach`.
4. Klik `Buat Rencana Belajar`.
5. Isi tujuan belajar, deadline, jam belajar, preferensi waktu, dan hari belajar.
6. Review rekomendasi task dari Gemini.
7. Terima task yang relevan.
8. Buka `Targetku` untuk melihat goal.
9. Buka detail goal untuk membaca task.
10. Buka `Kalender` untuk melihat jadwal.
11. Tandai task sebagai `Done` setelah selesai.
12. Pantau perkembangan di `Progress`.
13. Gunakan chat Coach jika perlu arahan atau penyesuaian.

## 14. Catatan Tester

- Provider AI aktif: Gemini.
- Model aktif: `gemini-2.5-flash-lite`.
- Rekomendasi terbaru tidak memakai `[MOCK]`.
- Backend health: pass.
- Database: connected.
- Frontend: accessible di `127.0.0.1:5173`.
- Akun testing berhasil dipakai untuk alur end-to-end.
