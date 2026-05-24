# Rangkuman Testing TC-10 sampai TC-24

Dokumen ini merangkum keadaan **before & after** pengujian performa dan keamanan, khususnya rate limiting, secret scanning, estimasi biaya AI, Redis store, dan observability HTTP 429.

## Tujuan Pengujian

Pengujian TC-10 sampai TC-24 memastikan backend tidak mudah disalahgunakan melalui request berulang, pesan error mudah dipahami, secret tidak bocor ke Git, biaya AI bisa diperkirakan, dan kejadian rate limit bisa dimonitor.

## Before Test

| Area | Keadaan sebelum pengujian |
| --- | --- |
| AI rate limiting | Perlu dipastikan request ke `/api/ai/*` benar-benar dibatasi dan dihitung per user. |
| Auth rate limiting | Perlu dipastikan login/register tidak bisa ditembak terus-menerus dari IP yang sama. |
| Response 429 | Perlu dipastikan response tidak hanya gagal, tapi memberi pesan yang jelas dan retry time. |
| Redis rate limit store | Perlu dipastikan environment non-test memakai Redis, bukan memory store lokal. |
| Redis down behavior | Perlu keputusan aman saat Redis gagal, apakah fail-open atau fail-closed. |
| Secret exposure | Perlu scan agar API key, token, private key, dan `.env` tidak bocor ke Git. |
| AI cost | Perlu estimasi biaya per 100 request agar penggunaan AI bisa dikontrol. |
| Monitoring | Perlu log khusus untuk HTTP 429 agar pola abuse bisa terlihat. |
| CI guard | Perlu secret scan di pipeline agar secret tidak masuk saat pull request/merge. |

## After Test

| Area | Keadaan setelah pengujian |
| --- | --- |
| AI rate limiting | `/api/ai/*` memblokir request ke-21 dalam 1 menit. |
| Auth rate limiting | `/api/auth/*` memblokir request ke-6 dalam 1 menit. |
| Response 429 | Response memakai `RATE_LIMITED`, pesan jelas, dan `retryAfterSeconds`. |
| AI limiter key | AI limiter berjalan setelah authentication dan memakai `req.user.id`. |
| Auth limiter key | Auth limiter memakai IP address. |
| Header rate limit | Response menyertakan `RateLimit-Limit`, `RateLimit-Remaining`, dan `RateLimit-Reset`. |
| Redis store | Non-test environment memakai `RedisStore` dengan prefix `rl:auth:*` dan `rl:ai:*`. |
| Redis down behavior | Behavior terdokumentasi fail-closed: Redis error dicatat dan dilempar, bukan membuka unlimited request. |
| Load ringan | 10 request AI paralel masih stabil dan tidak terkena 429. |
| Bypass sederhana | Perubahan `X-Forwarded-For` tidak melewati auth limiter pada default local deployment. |
| Secret scanning | CI punya step `Secret scan`; tracked files aktif juga bisa dicek lewat script. |
| AI cost | Biaya Gemini 2.5 Flash-Lite per 100 request sudah didokumentasikan. |
| Monitoring 429 | `requestLogger` mencatat HTTP 429 dengan `request_id`, route, user, durasi, dan retry info. |

## Daftar Test Case

| TC | Fokus | Status yang diharapkan |
| --- | --- | --- |
| TC-10 | `/api/ai/*` request ke-21 memicu HTTP 429 | Pass |
| TC-11 | `/api/auth/*` request ke-6 memicu HTTP 429 | Pass |
| TC-12 | Pesan HTTP 429 jelas dan punya retry info | Pass |
| TC-13 | Secret scan tracked files dan histori Git | Pass/Warn jika histori lama perlu review |
| TC-14 | Dokumentasi biaya AI per 100 request | Pass |
| TC-15 | Rate limit reset setelah window selesai | Pass |
| TC-16 | AI rate limit per authenticated user | Pass |
| TC-17 | Auth rate limit per IP | Pass |
| TC-18 | Header rate limit standar tersedia | Pass |
| TC-19 | Redis-backed rate limiting aktif untuk non-test | Pass |
| TC-20 | Redis down behavior fail-closed | Pass |
| TC-21 | Load test ringan paralel stabil | Pass |
| TC-22 | `X-Forwarded-For` tidak bypass auth limiter | Pass |
| TC-23 | Secret scanning tersedia di CI | Pass |
| TC-24 | HTTP 429 tercatat di log monitoring | Pass |

## Script Runner

Script untuk menjalankan semua check TC-10 sampai TC-24:

```bash
node scripts/run-tc10-tc24.js
```

Script ini menjalankan:

- Jest unit test `server/tests/unit/rateLimiter.test.js` untuk TC-10, TC-11, TC-12, TC-15, TC-16, TC-17, TC-18, TC-21, dan TC-22.
- Static check tracked files untuk TC-13.
- Static check dokumentasi biaya AI untuk TC-14. Detail estimasi tersedia di `docs/tc14-ai-cost-per-100-requests.md`.
- Static check RedisStore, fail-closed Redis, CI secret scan, dan logging HTTP 429 untuk TC-19, TC-20, TC-23, dan TC-24.

Setelah dijalankan, script menulis report terbaru ke:

```text
docs/performance-security-tc10-tc24-run-report.md
```

## Rangkuman Akhir

Secara keseluruhan, hasil pengujian menunjukkan rate limiting sudah berjalan sesuai kebutuhan dasar keamanan:

- Endpoint AI aman dari request berlebihan per user.
- Endpoint auth aman dari percobaan login berlebihan per IP.
- Error 429 sudah informatif.
- Redis dipakai sebagai shared rate limit store di non-test environment.
- CI punya guard secret scanning.
- Biaya AI sudah bisa dihitung secara kasar.
- Event 429 sudah bisa dimonitor lewat log.

Catatan yang tetap perlu diperhatikan: jika histori Git pernah memuat secret asli, key tersebut tetap harus di-rotate dari dashboard provider walaupun file aktif saat ini sudah bersih.
