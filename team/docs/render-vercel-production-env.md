# Render and Vercel Production Environment

Dokumen ini merangkum environment variable minimum yang harus diisi agar frontend Vercel dan backend Render bisa login lintas origin dan menjalankan AI provider secara eksplisit di production.

## Vercel

Set variable berikut pada project frontend:

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `VITE_API_URL` | Yes | `https://stepup-api.onrender.com/api` | Harus mengarah ke backend Render dengan suffix `/api` |

## Render

Set variable berikut pada service backend:

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `production` | Mengaktifkan cookie cross-site dan validasi production |
| `DATABASE_URL` | Yes | `postgres://...` | Koneksi database production |
| `REDIS_URL` | Recommended | `redis://...` | Dipakai cache dan rate limiting |
| `JWT_SECRET` | Yes | `<32+ char secret>` | Secret khusus production |
| `JWT_REFRESH_SECRET` | Yes | `<32+ char secret>` | Secret refresh token khusus production |
| `ALLOWED_ORIGINS` | Yes | `https://stepup-app.vercel.app` | Isi origin frontend production, comma-separated bila lebih dari satu |
| `LLM_PROVIDER` | Yes | `gemini` | Provider aktif yang dipakai backend |

## Provider-specific AI variables

Backend sekarang memvalidasi env berdasarkan `LLM_PROVIDER` yang dipilih. Isi pasangan berikut secara eksplisit:

| `LLM_PROVIDER` value | Additional required env | Notes |
| --- | --- | --- |
| `gemini` | `GEMINI_API_KEY` | Cocok untuk production hosted |
| `openrouter` | `OPENROUTER_API_KEY` | Gunakan bila provider utama OpenRouter |
| `glm` | `GLM_API_KEY` | Gunakan bila provider utama GLM |
| `ollama` | `OLLAMA_MODEL` | Untuk deployment yang memang punya Ollama runtime/network access |
| `mock` | none | Untuk CI/test saja, bukan production user traffic |

## Optional AI tuning env

Variable berikut tidak wajib untuk startup, tetapi boleh diisi bila dibutuhkan:

- `GEMINI_MODEL`
- `GEMINI_PAID_API_KEY`
- `GEMINI_PAID_MODEL`
- `GLM_MODEL`
- `GLM_BASE_URL`
- `OPENROUTER_MODEL`
- `OLLAMA_BASE_URL`

## Production verification

Setelah env terisi:

1. Buka endpoint health backend dan pastikan `data.ai.provider` sesuai `LLM_PROVIDER`.
2. Pastikan `data.ai.configured` bernilai `true`.
3. Pastikan login dari domain Vercel menghasilkan refresh cookie dengan `Secure` dan `SameSite=None`.
