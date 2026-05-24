# Rangkuman Testing Tambahan TC-08 sampai TC-12

Dokumen ini melengkapi sesi TC-03 sampai TC-07. Fokusnya bukan hanya membuat task dan menjalankan AI, tetapi memastikan fitur Manajemen Tugas & AI tetap aman, jelas, dan stabil saat menerima input buruk, akses dari user lain, aksi coach, serta kegagalan provider AI.

## Saran Sesi Pengujian Tambahan

| TC | Fokus Pengujian | Alasan Penting |
| --- | --- | --- |
| TC-08 | Validasi input task invalid | Mencegah task dengan durasi, slot, atau format data yang tidak sesuai masuk ke database. |
| TC-09 | Proteksi ownership task antar user | Memastikan user tidak bisa membaca atau mengubah task milik user lain. |
| TC-10 | Aksi `COMPLETE_TASK` dari Coach | Memastikan task bisa diselesaikan lewat Coach tanpa selalu memanggil LLM. |
| TC-11 | Aksi `SKIP_TASK` dan reschedule statis | Memastikan task yang dilewati bisa ditandai skipped, punya alasan, dan dipindah jadwalnya. |
| TC-12 | Fallback/error handling AI | Memastikan saat AI provider gagal, sistem memberi pesan jelas dan tidak membuat data task setengah jadi. |

## Before Test

| Area | Keadaan Sebelum |
| --- | --- |
| Data testing | Belum ada dua user pembanding untuk menguji ownership. |
| Validasi task | Belum ada bukti otomatis bahwa input invalid ditolak dengan pesan validasi. |
| Coach action | Belum ada bukti bahwa aksi task sederhana dapat berjalan tanpa ketergantungan LLM. |
| AI fallback | Belum ada bukti bahwa kegagalan AI tidak menambah/mengubah task. |

## After Test

Hasil run otomatis tersimpan di:

```text
docs/task-ai-management-tc08-tc12-run-report.md
```

Command:

```bash
node scripts/run-task-ai-management-extra.js
```

Status run terakhir:

| TC | Status Terakhir | Ringkasan |
| --- | --- | --- |
| TC-08 | PASS | Input task invalid ditolak dengan `VALIDATION_ERROR`. |
| TC-09 | PASS | User lain tidak bisa membaca atau mengubah task milik user utama. |
| TC-10 | PASS | `COMPLETE_TASK` mengubah status task, mengupdate metric, dan mencatat audit. |
| TC-11 | PASS | `SKIP_TASK` mengubah status, mencatat alasan, mengupdate metric/audit, dan memindahkan jadwal. |
| TC-12 | PASS | AI unavailable ditangani dengan `AI_UNAVAILABLE` dan tidak membuat task baru. |

## Perbaikan dari Temuan Test

Saat menjalankan TC-11, ditemukan bug kecil pada helper tanggal reschedule: tanggal dibuat dengan `toISOString().slice(0, 10)`, sehingga pada timezone lokal tanggal bisa mundur satu hari. Helper sudah diperbaiki agar memakai format tanggal kalender lokal (`YYYY-MM-DD`) sebelum disimpan.

Tambahan unit test juga dibuat untuk memastikan reschedule tidak mengalami UTC date rollback.

## Catatan Profesional

Pengujian tambahan ini saya sarankan karena project AI learning planner tidak cukup hanya diuji dari sisi “AI bisa membuat task”. Untuk siap dipakai user, sistem juga perlu aman saat:

- user mengirim input yang salah,
- user lain mencoba akses data yang bukan miliknya,
- aksi task harian dilakukan tanpa memanggil AI,
- provider AI sedang error atau quota habis.

Dengan TC-08 sampai TC-12, coverage Manajemen Tugas & AI menjadi lebih kuat karena mencakup happy path, edge case, keamanan ownership, dan fallback behavior.
