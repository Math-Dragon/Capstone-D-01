# Performance & Security Testing - Rate Limiting

Dokumen ini merangkum pengujian TC-10 sampai TC-24 untuk memastikan endpoint AI dan auth tidak mudah disalahgunakan, response error mudah dipahami, biaya AI bisa diperkirakan, dan pipeline punya guard keamanan dasar.

## Ringkasan Hasil

| Test Case | Tujuan | Hasil |
| --- | --- | --- |
| TC-10 | Request ke `/api/ai/*` sebanyak 21 kali dalam 1 menit harus memicu HTTP 429 | Pass |
| TC-11 | Request ke `/api/auth/*` sebanyak 6 kali dalam 1 menit harus memicu HTTP 429 | Pass |
| TC-12 | Response HTTP 429 harus memberi informasi error yang jelas | Pass |
| TC-13 | Memeriksa Git agar tidak ada environment variable atau API key yang bocor | Pass untuk worktree saat ini, ada catatan histori |
| TC-14 | Dokumentasi biaya request AI per 100 request | Selesai |
| TC-15 | Rate limit reset setelah window waktu selesai | Pass |
| TC-16 | Rate limit AI dihitung per user | Pass |
| TC-17 | Rate limit auth dihitung per IP | Pass |
| TC-18 | Response memiliki header rate limit standar | Pass |
| TC-19 | Rate limiting dengan Redis aktif | Pass |
| TC-20 | Behavior saat Redis down | Terdokumentasi sebagai fail-closed via store error |
| TC-21 | Load test ringan dengan request paralel | Pass |
| TC-22 | Test bypass sederhana memakai `X-Forwarded-For` | Pass |
| TC-23 | Secret scanning di CI pipeline | Selesai |
| TC-24 | Monitoring/logging untuk HTTP 429 | Selesai |

## Konfigurasi Rate Limiting

Backend memakai `express-rate-limit`.

| Area | Endpoint | Limit | Window | Key |
| --- | --- | --- | --- | --- |
| Auth | `/api/auth/*` | 5 request | 1 menit | IP address |
| AI | `/api/ai/*` | 20 request | 1 menit | User ID setelah authentication |

Di production/development, counter rate limit disimpan di Redis. Di mode test, counter memakai memory store agar unit test bisa berjalan stabil di CI. Nilai window dan limit bisa dioverride untuk test memakai environment variable:

```text
RATE_LIMIT_WINDOW_MS
AUTH_RATE_LIMIT_MAX
AI_RATE_LIMIT_MAX
```

Catatan perbaikan: middleware AI sekarang dipasang setelah authentication, sehingga rate limit AI benar-benar bisa memakai `req.user.id`, bukan hanya IP address.

## TC-10 - AI Rate Limit

Skenario:

1. Kirim request `POST /api/ai/plan/suggest` sebanyak 21 kali dalam waktu kurang dari 1 menit.
2. Request ke-1 sampai ke-20 masih diproses oleh middleware berikutnya.
3. Request ke-21 harus diblokir dengan HTTP 429.

Hasil:

```text
PASS TC-10: blocks /api/ai/* on the 21st request within 1 minute
```

## TC-11 - Auth Rate Limit

Skenario:

1. Kirim request `POST /api/auth/login` sebanyak 6 kali dalam waktu kurang dari 1 menit.
2. Request ke-1 sampai ke-5 masih diproses oleh middleware berikutnya.
3. Request ke-6 harus diblokir dengan HTTP 429.

Hasil:

```text
PASS TC-11: blocks /api/auth/* on the 6th request within 1 minute
```

## TC-12 - Pesan Error 429

Response HTTP 429 sekarang mengembalikan format yang jelas:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many auth attempts, please try again in X seconds",
    "retryAfterSeconds": 60
  }
}
```

Untuk AI, pesan memakai format:

```text
Too many AI requests, please try again in X seconds
```

Informasi `retryAfterSeconds` membantu frontend atau user mengetahui kapan request bisa dicoba lagi.

## TC-15 - Reset Rate Limit Setelah Window Selesai

Skenario:

1. Kirim request auth sampai terkena HTTP 429.
2. Tunggu sampai window rate limit selesai.
3. Kirim request baru.
4. Request baru tidak boleh terus terkena HTTP 429.

Hasil:

```text
PASS TC-15: allows requests again after the rate limit window resets
```

Catatan: unit test memakai window lebih pendek melalui `RATE_LIMIT_WINDOW_MS=1000` agar CI tidak perlu menunggu 60 detik. Behavior production tetap 1 menit.

## TC-16 - AI Rate Limit Per User

Skenario:

1. User A mengirim 20 request ke `/api/ai/plan/suggest`.
2. User B mengirim 1 request ke endpoint yang sama.
3. User B tidak boleh terkena limit milik User A.

Hasil:

```text
PASS TC-16: applies /api/ai/* limit per authenticated user
```

Perbaikan yang dilakukan:

- `/api/ai/*` sekarang melewati `authenticate` sebelum `aiLimiter`.
- `aiLimiter` memakai `req.user.id` sebagai key utama.

## TC-17 - Auth Rate Limit Per IP

Skenario:

1. Kirim 6 request ke `/api/auth/login` dari IP yang sama.
2. Request ke-6 harus terkena HTTP 429.

Hasil:

```text
PASS TC-17: applies /api/auth/* limit per IP address
```

## TC-18 - Header Rate Limit

Skenario:

1. Kirim request ke `/api/auth/login`.
2. Periksa response header rate limit.

Header yang dicek:

```text
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
```

Hasil:

```text
PASS TC-18: includes standard rate limit headers
```

## TC-19 - Redis Aktif

Target:

Memastikan behavior development/production tetap memakai Redis sebagai shared rate limit store.

Implementasi:

- CI pipeline sekarang menyalakan service Redis.
- Environment `REDIS_URL=redis://localhost:6379` sudah ditambahkan di CI.
- Development/production tetap memakai `RedisStore` karena memory store hanya dipakai saat `NODE_ENV=test`.

Hasil pengujian lokal dengan Docker aktif:

```text
Redis container: healthy
PostgreSQL container: healthy
Redis connected: true
/api/ai/* request ke-21: HTTP 429
/api/auth/* request ke-6: HTTP 429
Redis key rl:ai:* terbentuk: ya
Redis key rl:auth:* terbentuk: ya
Rate limit headers tersedia: ya
```

Response yang terverifikasi:

```text
Too many AI requests, please try again in 60 seconds
Too many auth attempts, please try again in 60 seconds
```

Command verifikasi manual:

```bash
docker ps
cd server
npm run dev
```

Lalu jalankan skenario TC-10 dan TC-11 ke backend lokal. Pada pengujian ini, smoke test dijalankan langsung lewat Node terhadap Express app dengan `NODE_ENV=development`, sehingga rate limiter memakai RedisStore, bukan memory store.

## TC-20 - Redis Down

Target:

Menentukan behavior saat Redis tidak tersedia.

Behavior saat ini:

```text
Fail-closed
```

Artinya, jika Redis store error di mode development/production, request tidak dibiarkan bebas melewati rate limit. Error akan masuk ke error handler/log server. Ini lebih aman dari sisi security karena sistem tidak membuka jalur unlimited request saat Redis bermasalah.

Rekomendasi lanjutan:

- Buat health alert khusus Redis.
- Tampilkan error operasional yang lebih eksplisit untuk admin, tanpa membocorkan detail internal ke user production.

## TC-21 - Load Test Ringan

Skenario:

1. Kirim 10 request AI secara paralel menggunakan user yang sama.
2. Semua request harus selesai tanpa crash.
3. Karena jumlah request masih di bawah limit 20, tidak boleh ada HTTP 429.

Hasil:

```text
PASS TC-21: stays stable during light parallel AI traffic
```

## TC-22 - Test Bypass X-Forwarded-For

Skenario:

1. Kirim 6 request auth dari koneksi yang sama.
2. Setiap request memakai nilai header `X-Forwarded-For` yang berbeda.
3. Sistem tetap harus memblokir request ke-6.

Hasil:

```text
PASS TC-22: does not allow simple X-Forwarded-For bypass for auth limit
```

Catatan:

Express app belum mengaktifkan `trust proxy`, sehingga header `X-Forwarded-For` tidak otomatis dipercaya. Ini membantu mencegah bypass sederhana di local/default deployment.

## TC-23 - Secret Scanning di CI

CI pipeline sekarang punya step `Secret scan` sebelum install dependency dan test.

Pola yang dicek:

- Gemini-style API key
- OpenAI-style key
- GitHub personal access token
- Private key marker

Jika pola secret terdeteksi, pipeline akan gagal sebelum proses build/test lanjut.

Hasil:

```text
TC-23 selesai - secret scanning ditambahkan ke .github/workflows/ci.yml
```

## TC-24 - Monitoring/Logging HTTP 429

Request logger sekarang memberi log warning khusus saat response status adalah HTTP 429.

Field yang dicatat:

```text
request_id
method
route
status_code
duration_ms
user_id
retry_after
```

Tujuannya agar tim bisa melihat pola abuse, brute force login, atau frontend yang terlalu sering memicu AI.

Hasil:

```text
TC-24 selesai - HTTP 429 sekarang dicatat sebagai warning log
```

## TC-13 - Secret Scan Git

Pemeriksaan dilakukan dengan dua pendekatan:

1. Memastikan file `.env` tidak masuk tracked files Git.
2. Scan pola secret umum seperti Gemini key, OpenAI-style key, GitHub token, dan private key marker.

Hasil worktree saat ini:

```text
Tidak ditemukan pola secret aktif pada file kerja saat ini.
```

Catatan histori:

```text
Riwayat Git masih mendeteksi commit lama yang pernah berisi contoh private key marker pada server/.env.example.
```

Mitigasi yang sudah dilakukan:

- `server/.env.example` sudah diganti agar memakai placeholder aman.
- Placeholder OpenRouter tidak lagi memakai format yang menyerupai secret asli.
- File `.env` tetap tidak boleh dicommit.

Rekomendasi:

- Jika pernah ada API key asli masuk ke commit history, key tersebut harus di-rotate dari dashboard provider.
- Tambahkan secret scanning di CI sebelum merge.

## TC-14 - Estimasi Biaya AI per 100 Request

Model utama project saat ini:

```text
gemini-2.5-flash-lite
```

Berdasarkan halaman resmi Google Gemini API Pricing, harga paid tier untuk Gemini 2.5 Flash-Lite Standard adalah:

| Token | Harga |
| --- | --- |
| Input text/image/video | USD 0.10 per 1 juta token |
| Output termasuk thinking tokens | USD 0.40 per 1 juta token |

Sumber: https://ai.google.dev/gemini-api/docs/pricing

Rumus estimasi:

```text
Biaya = (input_tokens / 1,000,000 * 0.10) + (output_tokens / 1,000,000 * 0.40)
```

Contoh estimasi per 100 request:

| Asumsi per request | Total 100 request | Estimasi biaya |
| --- | --- | --- |
| 1.000 input token + 500 output token | 100.000 input + 50.000 output | USD 0.03 |
| 2.000 input token + 1.000 output token | 200.000 input + 100.000 output | USD 0.06 |
| 3.000 input token + 1.500 output token | 300.000 input + 150.000 output | USD 0.09 |

Catatan:

- Jika masih memakai free tier dan kuota belum habis, biaya bisa tetap USD 0.
- Biaya aktual bergantung pada jumlah token prompt, context, response, dan thinking tokens.
- Untuk menjaga biaya tetap terkendali, AI trigger sebaiknya hanya terjadi saat user benar-benar meminta rekomendasi atau membuat rencana baru.

## Command Verifikasi

Rate limiting test:

```bash
SKIP_DB_CHECK=true npm test -- --runTestsByPath tests/unit/rateLimiter.test.js
```

Rate limiting + auth guard regression test:

```bash
SKIP_DB_CHECK=true npm test -- --runTestsByPath tests/unit/rateLimiter.test.js tests/unit/routes.test.js
```

Secret scan worktree:

```bash
rg -l "AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{30,}|-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----"
```

Secret scan history:

```bash
git log --all --format="%h %s" -G "AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{30,}|-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----"
```
