# Portfolio Write-up — MVP Study Plan App

## Problem

Banyak pengguna kesulitan mengatur jadwal belajar karena:
- Tidak ada tampilan kalender yang jelas.
- Navigasi aplikasi membingungkan.
- Progress belajar sulit dipantau.

Akibatnya, jadwal belajar jadi berantakan dan motivasi menurun.

---

## Approach

### Product Scope

MVP difokuskan pada:
- Kalender harian/mingguan/bulanan untuk melihat rencana belajar.
- Navigasi sederhana agar user cepat menemukan fitur.
- Fitur dasar manajemen tugas (buat, edit, hapus).
- Tracking progress mingguan.

Pendekatan ini dipilih supaya aplikasi langsung terasa berguna tanpa fitur tambahan yang rumit.

---

### Technical Architecture

Frontend:
- React + Vite
- TailwindCSS

Backend:
- Node.js
- PostgreSQL
- JWT Authentication

---

### Technical Trade-offs

#### 1. Kalender Mingguan
**Alasan:**
- Memberikan gambaran jadwal yang jelas.
- Mudah dipahami pengguna.

**Trade-off:**
- Belum mendukung integrasi dengan kalender eksternal.

---

#### 2. Navigasi sederhana
**Alasan:**
- Memudahkan user berpindah antar fitur.
- Cocok untuk aplikasi tahap awal.

**Trade-off:**
- Belum ada sistem pencarian atau shortcut kompleks.

---

## Impact

- Jadwal belajar lebih terstruktur dengan kalender.
- Navigasi yang jelas membuat user lebih cepat beradaptasi.
- API response time rata-rata 200-600ms.
- Aplikasi tetap ringan dengan initial load di bawah 8 detik.

---

## Key Learnings

- Kalender dan navigasi adalah fitur inti yang paling membantu user.
- Kesederhanaan lebih dihargai daripada banyak fitur tambahan.
- Fokus pada UX dasar mempercepat validasi kebutuhan pengguna.
