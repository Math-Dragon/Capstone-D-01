# Rangkuman Testing TC-03 sampai TC-07

Dokumen ini merangkum pengujian Manajemen Tugas & Fitur AI untuk memastikan alur task utama, progress, overdue, dan saran AI dapat divalidasi dengan bukti yang jelas.

## Scope

| TC | Fokus Pengujian | Status Terakhir |
| --- | --- | --- |
| TC-03 | Membuat tugas manual dan memastikan data tersimpan | PASS |
| TC-04 | Membuat tugas dari rekomendasi/saran AI | BLOCKED |
| TC-05 | Mengubah status `todo` ke `done` dan memvalidasi progress snapshot | PASS |
| TC-06 | Mendeteksi tugas yang sudah melewati tanggal rencana | PASS |
| TC-07 | Reschedule otomatis untuk overdue, lalu Accept/Reject saran | BLOCKED |

## Before Test

| Area | Keadaan Sebelum |
| --- | --- |
| Data testing | Belum ada user, goal, task, atau recommendation khusus untuk TC-03 sampai TC-07. |
| Task manual | Belum ada task manual yang dipakai untuk membuktikan penyimpanan database. |
| AI recommendation | Belum ada rekomendasi AI baru untuk dijadikan task. |
| Progress snapshot | Belum ada snapshot progres yang divalidasi setelah status task berubah. |
| Overdue | Belum ada task dengan `planned_date` kemarin untuk simulasi overdue. |

## After Test

| Area | Keadaan Setelah |
| --- | --- |
| Task manual | Task berhasil dibuat, dibaca ulang, dan punya `source=manual`. |
| Progress snapshot | Setelah task diubah menjadi `done`, endpoint progress mingguan mengembalikan `completed_hours > 0`. |
| Overdue | Task dengan tanggal kemarin berhasil terdeteksi sebagai overdue dari data task. |
| AI recommendation | Jalur Gemini sudah valid, tetapi request terbaru terblokir quota free tier harian. |
| Reschedule AI / reject suggestion | Bagian yang butuh request AI belum bisa hijau sampai quota reset atau fallback paid key tersedia. |

## Hasil Run Terakhir

Report otomatis tersimpan di:

```text
docs/task-ai-management-tc03-tc07-run-report.md
```

Command untuk menjalankan ulang:

```bash
node scripts/run-tc03-tc07.js
```

## Analisis Singkat

Bagian task non-AI sudah berjalan baik. Pembuatan task manual, update status, progress snapshot, dan deteksi overdue sudah berhasil.

Masalah utama terbaru ada pada quota provider AI. Endpoint `/api/ai/plan/suggest` dapat mengembalikan:

```text
AI_UNAVAILABLE: AI service is temporarily unavailable. Please try again in a moment.
```

Root cause terbaru dari log backend adalah quota Gemini free tier:

```text
429 Too Many Requests
Quota exceeded: generate_content_free_tier_requests
limit: 20
model: gemini-2.5-flash-lite
```

Jadi TC-04 dan TC-07 belum bisa dinyatakan hijau sampai quota reset atau fallback paid key tersedia.

## Saran Perbaikan

1. Tambahkan `GEMINI_PAID_API_KEY` sebagai fallback paid provider.
2. Set max billing di Google Cloud/AI Studio agar biaya tetap aman.
3. Untuk testing otomatis CI, gunakan mode test yang deterministik seperti `LLM_PROVIDER=mock` agar pipeline tidak bergantung pada quota provider eksternal.
4. Untuk testing manual production-like, jalankan ulang script ini setelah quota reset atau setelah fallback paid key tersedia.
