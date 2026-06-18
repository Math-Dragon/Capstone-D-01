# Contributing

Terima kasih telah berkontribusi ke StepUp AI Learn. Dokumen ini menjelaskan cara setup development, code style, dan proses pull request.

## Setup Development

1. Fork dan clone repository
   ```bash
   git clone https://github.com/<username>/<repo>.git
   cd <repo>
   ```

2. Copy `.env.example` ke `.env` dan isi konfigurasi
   ```bash
   cp team/.env.example team/server/.env
   ```

3. Jalankan PostgreSQL dan Redis via Docker
   ```bash
   cd team
   docker compose up db redis -d
   ```

4. Setup backend
   ```bash
   cd team/server
   npm install
   npm run migrate:up
   npm run dev
   ```

5. Setup frontend
   ```bash
   cd team/client
   npm install
   npm run dev
   ```

URL development:
- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Code Style

- **ESLint** untuk linting:
  ```bash
  cd team/server && npm run lint
  cd team/client && npm run lint
  ```

- **Conventional Commits** untuk commit message:
  ```
  feat:     fitur baru
  fix:      perbaikan bug
  docs:     dokumentasi
  test:     penambahan atau perbaikan test
  refactor: perubahan kode tanpa mengubah behavior
  chore:    maintenance, dependency update
  ci:       perubahan CI pipeline
  ```

  Contoh:
  ```bash
  git commit -m "feat: add circuit breaker for LLM API"
  git commit -m "fix: progress calculation edge case when no tasks"
  git commit -m "docs: update README with architecture diagram"
  git commit -m "test: add edge case tests for status transition"
  ```

## Testing

Pastikan semua test pass sebelum membuka PR:

```bash
# Backend unit dan integration test
cd team/server
npm test -- --coverage --verbose

# Frontend test
cd team/client
npm test
```

## Pull Request

1. Buat branch dari `dev`
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/nama-fitur
   ```

2. Implementasi perubahan

3. Pastikan semua test pass
   ```bash
   cd team/server && npm test && npm run lint
   cd team/client && npm test && npm run lint
   ```

4. Commit dengan conventional commits

5. Push branch dan buka Pull Request ke `dev`

6. Deskripsikan perubahan di PR description:
   - Apa yang diubah
   - Mengapa diubah
   - Screenshot (jika ada perubahan UI)
   - Checklist verifikasi

## Issue dan Bug Report

Gunakan template issue yang tersedia di `.github/ISSUE_TEMPLATE/bug_report.md`.

Label severity:
- `critical` — memblokir alur utama
- `major` — fitur tidak berfungsi sebagaimana mestinya
- `minor` — masalah kosmetik atau edge case
- `enhancement` — permintaan peningkatan
- `wontfix` — tidak akan diperbaiki
