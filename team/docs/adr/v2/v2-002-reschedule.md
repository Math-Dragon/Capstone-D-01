# ADR v2-002: Strategi Reschedule Tugas

## Status
Diterapkan untuk MVP

## Konteks
Ketika tugas terlewat (overdue), atau pengguna ingin memindahkan tugas ke hari/slot lain, aplikasi harus menyediakan mekanisme reschedule. Dua pendekatan yang dipertimbangkan:

**Opsi A — Reschedule via LLM:** Kirim konteks (overdue tasks, existing schedule, availability) ke LLM untuk menghasilkan jadwal baru. Lebih akurat karena AI mempertimbangkan prioritas goal dan kapasitas, tapi menambah biaya token dan latency.

**Opsi B — Reschedule via Client + Service Layer:** Pengguna memilih tanggal/slot baru secara manual, sistem memvalidasi kapasitas dan konflik di server. Lebih cepat, lebih murah, tapi keputusan sepenuhnya di tangan pengguna.

Instruksi awal menyarankan pembuatan endpoint `/api/ai/plan/reschedule` dengan LLM call. Namun setelah evaluasi, pendekatan berbeda dipilih.

## Keputusan
**Opsi B — Reschedule tanpa LLM call.** Menggunakan `PATCH /tasks/:id` yang sudah ada, diperkaya dengan validasi kapasitas dan conflict detection di service layer.

### Alasan Reschedule Tidak Memerlukan LLM

1. **Operasi sederhana.** Reschedule tugas individual hanya mengubah `planned_date` dan/atau `planned_slot` — operasi CRUD dasar yang tidak membutuhkan kecerdasan AI
2. **Latency dan biaya.** LLM call menambah 2-5 detik latency dan biaya token per reschedule. Untuk MVP, pengguna diperkirakan melakukan reschedule 5-10× per minggu — biaya tidak sebanding dengan nilai yang diberikan
3. **HITL principle.** Keputusan akhir tetap di tangan pengguna. LLM hanya akan menambah friction tanpa menambah kontrol yang signifikan — user tetap harus review dan approve hasilnya
4. **Conflict detection cukup dengan query DB.** Kapasitas harian bisa dihitung dari jumlah tugas existing di tanggal target vs `weekly_target_hours`. Tidak perlu AI untuk menjumlah durasi
5. **AI reschedule baru bernilai untuk skenario kompleks:** memindahkan 3-4 tugas sekaligus karena perubahan jadwal pengguna. Skenario ini jarang terjadi di MVP dan bisa ditambahkan nanti

### Status Implementasi Saat Ini
- `PATCH /tasks/:id` aktif — user bisa mengubah `planned_date` dan `planned_slot` langsung
- `static-response.service.respondSkip()` — find next available date via `_getNextAvailableDate()` tanpa cek kapasitas
- **Conflict detection belum ada** — tidak ada validasi apakah slot target sudah penuh
- **Tidak ada batas maksimum tugas per slot** — user bisa menumpuk 10 tugas di hari yang sama

## Konsekuensi
- **Positif:** latency minimal (±50ms), tanpa biaya token tambahan
- **Positif:** pengguna punya kendali penuh atas jadwal (HITL)
- **Positif:** sederhana untuk diimplementasikan dan di-test
- **Negatif:** tidak ada prioritisasi otomatis — tugas yang direschedule tidak otomatis diprioritaskan berdasarkan deadline goal
- **Negatif:** reschedule multi-task rumit bagi pengguna — harus satu per satu

### Yang Perlu Ditambahkan
1. **Capacity validation** di service layer — cek total durasi tasks di tanggal target vs kapasitas harian (weekly_target_hours / 7)
2. **Conflict warning** di response API — server mengembalikan warning jika slot mendekati penuh
3. **UI indicator** untuk hari yang padat — visual warning sebelum user memilih tanggal

### Rencana Revisit
Multi-task AI reschedule akan diimplementasikan jika:
- Pengguna mengeluhkan kesulitan menjadwalkan ulang banyak tugas sekaligus
- Metrik menunjukkan >30% tasks membutuhkan reschedule per minggu
