# AI Gemini Readiness Check

Tanggal: 2026-05-21

## Ringkasan

Jalur Gemini sudah berhasil divalidasi dari sisi model, API key, dan koneksi network saat backend dijalankan dengan akses network penuh.

Model yang dipakai:

```text
gemini-2.5-flash-lite
```

Model ini valid dan tersedia di dokumentasi resmi Google AI.

## Before

Sebelumnya endpoint AI sering gagal dengan:

```text
AI_UNAVAILABLE / HTTP 503
```

Penyebab awal yang ditemukan:

- backend/test kadang berjalan tanpa akses network ke Gemini,
- dependency lokal belum siap: Redis mati dan DB lokal tidak cocok credential,
- output Gemini kadang berbentuk object/wrapper, sementara parser hanya siap string JSON top-level.

## Perbaikan yang Dilakukan

| Area | Perbaikan |
| --- | --- |
| Koneksi Gemini | Backend dijalankan dengan akses network dan berhasil `gemini connection validated`. |
| Test environment | DB test dibuat di port `15432`, Redis test di port `16379`. |
| Parser AI | `validateAIOutput` sekarang bisa menerima object langsung dari provider. |
| Wrapper output | Parser bisa unwrap output berbentuk `{ plan: { tasks, summary } }`. |
| Prompt `/api/ai/plan/suggest` | Prompt dikunci agar meminta `SESSION_TYPE: initial_plan` dan output top-level `{ tasks, summary }`. |
| Diagnostik | Error schema sekarang menyimpan preview output yang ditolak di metadata. |

## After

Gemini berhasil aktif, tetapi API key saat ini terkena limit free tier:

```text
429 Too Many Requests
Quota exceeded for metric: generate_content_free_tier_requests
limit: 20
model: gemini-2.5-flash-lite
```

Akibatnya, TC yang membutuhkan request AI eksternal tetap bisa gagal dengan:

```text
AI_UNAVAILABLE / HTTP 503
```

Ini bukan lagi masalah model/prompt utama, tetapi limit quota harian API key.

## Status Test

| Test | Status | Catatan |
| --- | --- | --- |
| Unit `llm.test.js` | PASS | Parser object/wrapper sudah aman. |
| Unit `ai.service.test.js` | PASS | Prompt AI suggestion sudah eksplisit. |
| TC-03 | PASS | Task manual tersimpan. |
| TC-04 | BLOCKED | Butuh request AI, terblokir quota Gemini. |
| TC-05 | PASS | Progress snapshot berubah setelah task done. |
| TC-06 | PASS | Overdue task terdeteksi. |
| TC-07 | BLOCKED | Bagian AI reject/suggestion terblokir quota Gemini. |

## Rekomendasi Step Berikutnya

1. Tambahkan `GEMINI_PAID_API_KEY` untuk fallback paid provider.
2. Set limit billing dari Google Cloud/AI Studio agar biaya tetap terkendali.
3. Untuk CI/testing otomatis, tetap gunakan mock/fake provider yang deterministik agar pipeline tidak habis quota.
4. Untuk demo production-like, jalankan backend dengan Gemini paid atau tunggu quota free tier reset.
