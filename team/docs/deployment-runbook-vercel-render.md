# Deployment Runbook: Vercel Frontend + Render Backend

Dokumen ini adalah jalur deploy paling langsung untuk project `team/client` dan `team/server`.

## Arsitektur Target

- Frontend: Vercel
- Backend: Render Web Service
- Database: PostgreSQL production
- Redis: Redis production

## File Deploy yang Sudah Disiapkan

- `render.yaml`
- `team/client/vercel.json`
- `team/docs/render-vercel-production-env.md`

## 1. Deploy Backend ke Render

Gunakan repository:

- `https://github.com/Math-Dragon/Capstone-D-01`

Render Blueprint:

- file: `render.yaml`
- root service: `team/server`

### Environment wajib di Render

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`
- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY`

### Optional tetapi disarankan

- `GEMINI_MODEL=gemini-2.5-flash-lite`
- `METRICS_API_KEY`

### Verifikasi backend

1. Buka `/health`
2. Pastikan response `200`
3. Pastikan `data.ai.provider` sesuai
4. Pastikan `data.ai.configured=true`

## 2. Deploy Frontend ke Vercel

Import project dari repository yang sama, lalu set:

- Root Directory: `team/client`
- Framework Preset: `Vite`

### Environment wajib di Vercel

- `VITE_API_URL=https://<render-service>.onrender.com/api`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`

### Optional

- `VITE_APP_NAME=StepUp AI Learn`

## 3. Sinkronisasi Cross-Origin

Set `ALLOWED_ORIGINS` di Render menjadi origin frontend Vercel, misalnya:

```text
https://stepup-ai-learn.vercel.app
```

Jika ada preview domain yang juga ingin diizinkan, tambahkan dengan format comma-separated.

## 4. Verifikasi End-to-End

1. Buka frontend Vercel
2. Login
3. Pastikan request ke backend sukses
4. Cek planner / calendar / AI suggest
5. Cek export `.ics`
6. Cek `/metrics` bila `METRICS_API_KEY` diset

## 5. Catatan Penting

- Backend sekarang mewajibkan `REDIS_URL` di production agar deploy tidak jatuh ke asumsi localhost.
- Frontend production build harus memakai `VITE_API_URL`; bila tidak, client akan fallback ke localhost dan gagal.
- Jika deploy dari repo root di Vercel, pastikan Root Directory benar-benar `team/client`.
