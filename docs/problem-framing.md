# Problem Framing — AI Learning Plan

## Problem

Peserta bootcamp kesulitan menjaga ritme belajar secara konsisten. Target belajar terasa abstrak dan sulit dipecah menjadi aksi nyata. Jadwal mingguan cepat berantakan begitu satu hari terlewat, sehingga progres tidak terpantau dan motivasi menurun. Rata-rata peserta hanya menyelesaikan sebagian kecil dari rencana mingguan karena tugas terlalu besar dan jadwal tidak fleksibel.

## Approach

Aplikasi web full-stack (React + Node.js + PostgreSQL) dengan AI sebagai learning coach. Pendekatan utama:

1. **AI Suggestion Engine** — LLM (Gemini sebagai primary, OpenRouter dan GLM sebagai fallback) memecah goal menjadi task-task kecil (25-90 menit) yang spesifik, dengan rationale yang transparan.
2. **Human-in-the-Loop** — AI hanya memberi saran; pengguna menyetujui atau menolak sebelum setiap perubahan dieksekusi. Tidak ada perubahan otomatis tanpa persetujuan.
3. **Jadwal Adaptif** — Task dijadwalkan berdasarkan preferensi waktu dan ketersediaan pengguna, bukan template generik.
4. **Progress Tracking** — Check-in harian, streak, snapshot mingguan, dan metrik student untuk memantau perkembangan.
5. **Privacy-first** — Prompt ke LLM hanya menyertakan user_id (bukan data pribadi), output divalidasi dengan Zod schema sebelum diproses.

## Impact

- Membantu peserta mempertahankan konsistensi belajar dengan task plan yang realistis
- Target: ≥50% saran AI diterima oleh pengguna
- Completion rate mingguan terukur dan meningkat secara bertahap
- Dokumentasi dan portfolio hasil capstone 
