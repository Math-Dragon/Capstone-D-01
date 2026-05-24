# Portfolio Write-up — MVP Study Plan App

## Problem

Banyak orang kesulitan menyusun jadwal belajarnya sendiri karena jadwal pribadi yang mungkin kurang jelas, akibatnya:

- Orang gagal belajar.
- Progress belajar minim.
- Jadwal belajar pribadi tidak tertata rapi.

Pada tahap MVP, fokus utama adalah membuat aplikasi study plan yang:
- cepat digunakan,
- jadwal tertata jelas,
- dan mudah untuk tracking progress mingguan.

---

## Approach

### Product Scope

Alih-alih membangun fitur lengkap seperti calendar sync atau AI assistant, MVP menyediakan:

- Create/Edit/Delete task
- Status tracking (`Todo`, `In Progress`, `Done`)
- Deadline reminder sederhana
- Dashboard progress

Pendekatan ini dipilih untuk mempercepat validasi kebutuhan user.

---

### Technical Architecture

Frontend menggunakan:

- React + Vite
- TailwindCSS

Backend menggunakan:

- Node.js
- PostgreSQL
- JWT Authentication


### Technical Trade-offs

#### 1. Menggunakan Zustand dibanding Redux

**Alasan:**
- Setup lebih ringan
- Boilerplate minimal
- Cocok untuk MVP kecil

**Trade-off:**
- Kurang optimal jika aplikasi berkembang sangat besar dan membutuhkan middleware kompleks.

---

#### 2. JWT Stateless Auth

**Alasan:**
- Implementasi cepat
- Mudah diintegrasikan dengan frontend SPA

**Trade-off:**
- Revocation token lebih kompleks dibanding session-based auth.

---

## Impact

Secara teknis:

- Initial page load berhasil dijaga di bawah 1.5 detik
- API average response time sekitar 120ms

---

## Key Learnings

- Scope kecil membantu iterasi lebih cepat.
- User lebih menghargai simplicity dibanding banyak fitur.
- Arsitektur sederhana cukup efektif pada tahap validasi awal.