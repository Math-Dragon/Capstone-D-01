# AI Learning Plan

> Aplikasi web yang membantu peserta bootcamp merencanakan dan menjalani belajar secara konsisten, dengan bantuan AI sebagai learning coach.

## Quick Start

### Prasyarat
- Node.js 20+
- Docker Desktop — pastikan sudah dibuka dan running
- Gemini API Key (https://aistudio.google.com/apikey)

### Setup
```bash
git clone <repository-url>
cd ai-learning-plan
cp server/.env.example server/.env
# Edit server/.env — isi GEMINI_API_KEY dan ubah JWT_SECRET

docker compose up db -d
cd server && npm install && npm run migrate:up
npm run dev

# Di terminal lain
cd client && npm install && npm run dev
```

### Akses
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health: http://localhost:3000/health

### Troubleshooting
- "Cannot connect to Docker daemon" — Buka Docker Desktop, tunggu running.
- "role user does not exist" — PostgreSQL lokal konflik. Ubah port di docker-compose.yml dan .env ke 5433.
- "address already in use" — `kill $(lsof -ti :3000)` atau `docker compose down`.

## Dokumentasi
- [Problem Framing](docs/problem-framing.md)
- [Architecture Decision Records](docs/adr/)
