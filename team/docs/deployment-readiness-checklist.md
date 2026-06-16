# Deployment Readiness Checklist

Checklist ini merangkum hal yang perlu dicek sebelum StepUp AI Learn dipakai di environment production atau demo publik.

## Environment

| Item | Status | Catatan |
| --- | --- | --- |
| Node.js 20+ | Siap | Dipakai oleh client dan server |
| PostgreSQL | Siap | Jalankan migrasi sebelum server production aktif |
| Redis | Siap | Dipakai untuk rate limiting dan cache |
| `JWT_SECRET` dan `JWT_REFRESH_SECRET` | Wajib production secret | Jangan pakai secret lokal |
| `ALLOWED_ORIGINS` | Wajib disesuaikan | Isi domain frontend production |
| `VITE_API_URL` | Wajib di Vercel | Harus menunjuk ke `https://<render-domain>/api` |
| Referensi env production | Wajib tersedia | Lihat `team/docs/render-vercel-production-env.md` |

## AI Provider

| Item | Status | Catatan |
| --- | --- | --- |
| `LLM_PROVIDER=gemini` | Siap | Sudah divalidasi dengan Gemini |
| `LLM_PROVIDER` production | Wajib eksplisit | Health check sekarang melaporkan provider aktif dan status configured |
| `GEMINI_MODEL=gemini-2.5-flash-lite` | Siap | Model valid dan ringan |
| Provider-specific key | Wajib sesuai provider | `gemini -> GEMINI_API_KEY`, `openrouter -> OPENROUTER_API_KEY`, `glm -> GLM_API_KEY`, `ollama -> OLLAMA_MODEL` |
| Free tier Gemini | Terbatas | Kuota bisa habis saat testing intensif |
| Paid key/fallback | Disarankan | Pakai paid plan dengan billing cap untuk demo/production |
| Mock provider | Tetap diperlukan | Aman untuk CI agar test tidak tergantung kuota AI |

## Quality Gate

| Area | Check |
| --- | --- |
| Lint | `npm run lint` di server dan client |
| Unit test | `npm test` di server dan client |
| E2E core flow | `node scripts/run-e2e-core-flow.js` |
| Rate limiting/security | `node scripts/run-tc10-tc24.js` |
| Task & AI management | `node scripts/run-tc03-tc07.js` dan `node scripts/run-task-ai-management-extra.js` |
| Secret scan | Pastikan tidak ada API key/env secret di git history |

## Known Risk

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Kuota Gemini free tier habis | AI recommendation gagal sementara | Gunakan paid key dengan billing cap atau fallback provider |
| DB/Redis tidak aktif | Backend gagal startup atau fitur rate limit tidak akurat | Jalankan Docker dan migration sebelum test |
| Port lokal bentrok | Backend atau DB tidak bisa bind port default | Gunakan port alternatif seperti `15432` dan `16379` untuk lokal |

## Rekomendasi Sebelum Release

1. Gunakan secret production yang berbeda dari lokal.
2. Isi `VITE_API_URL` di Vercel dan `ALLOWED_ORIGINS` di Render sebagai pasangan origin yang benar.
3. Pastikan `/health` menampilkan `data.ai.provider` yang benar dan `data.ai.configured=true`.
4. Aktifkan Gemini paid plan dengan batas billing bila Gemini jadi provider production.
5. Simpan CI tetap memakai `LLM_PROVIDER=mock`.
6. Jalankan semua script test sebelum deployment.
7. Dokumentasikan status quota AI saat demo agar ekspektasi user jelas.
