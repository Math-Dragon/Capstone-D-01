# Getting Started

## Prerequisites

Sebelum memulai, pastikan Anda telah menginstal berikut ini:

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 20.x | LTS recommended |
| npm | >= 9.x | Bundled with Node.js |
| Docker Desktop | Latest | Untuk PostgreSQL & Redis |
| Git | Latest | Version control |

Verifikasi instalasi:

```bash
node --version    # Should show v20.x or higher
npm --version     # Should show 9.x or higher
docker --version  # Should show latest version
```

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url> ai-learning-plan
cd ai-learning-plan
```

### 2. Environment Setup

```bash
cp server/.env.example server/.env
```

Edit `server/.env` — isi `GEMINI_API_KEY` dan ubah `JWT_SECRET`:

```env
DATABASE_URL=postgres://user:pass@localhost:5432/ai_learning_plan
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_random_secret
```

### 3. Start Database & Redis

```bash
docker compose up db -d
```

### 4. Setup Backend

```bash
cd server && npm install && npm run migrate:up
npm run dev
```

### 5. Setup Frontend

Di terminal lain:

```bash
cd client && npm install && npm run dev
```

### 6. (Opsional) Isi Data Demo

```bash
cd server && npm run seed
```

Akun demo:

| Email | Password |
|-------|----------|
| demo@example.com | password123 |

### Akses Aplikasi

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Health Check | http://localhost:3000/health |

## Struktur Proyek

```
ai-learning-plan/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── features/           # Feature-based modules
│   │   │   ├── auth/           # Authentication
│   │   │   ├── coach/          # AI Learning Coach
│   │   │   └── goals/          # Goal management
│   │   ├── components/         # Shared UI components
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API services (Axios)
│   │   ├── store/              # Redux Toolkit store
│   │   └── hooks/              # Custom hooks
│   └── vite.config.js
├── server/                      # Express.js backend
│   ├── src/
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── repositories/       # Data access layer
│   │   ├── models/             # DB schema mapping
│   │   ├── middleware/         # Auth, logging, rate limiter
│   │   ├── prompts/            # LLM system prompts
│   │   └── migrations/         # DB migrations
│   └── tests/
├── docker-compose.yml           # PostgreSQL + Redis + Server + Client
└── docs/                        # Documentation
```

## Alur Fitur Utama

### Authentication Flow

1. User mendaftar/login melalui form
2. Form memvalidasi input dengan Zod
3. React Hook Form mengirim data ke Redux async action
4. Backend memverifikasi kredensial, mengembalikan JWT
5. Token disimpan, user state diperbarui
6. ProtectedRoute memeriksa auth state sebelum menampilkan halaman

### AI Coach Flow

1. User membuka halaman AI Coach
2. Gateway mengecek eligibility (check-in, waktu)
3. Context dibangun dari goals, tasks, progress
4. Prompt dikirim ke LLM (Gemini / OpenRouter / Mock)
5. Response diformat dan ditampilkan
6. Task suggestions bisa diterima/ditolak user

### Goal & Task Flow

1. User membuat learning goal dengan deadline
2. AI Coach menghasilkan task plan
3. Task digenerate dengan tipe: acquire, practice, recall, dll.
4. Task dijadwalkan di slot pagi/siang/sore
5. User melakukan check-in harian, progress dicatat

## Troubleshooting

### Docker tidak bisa connect

```bash
# Pastikan Docker Desktop sudah running
docker ps
```

### Port already in use

```bash
kill $(lsof -ti :3000)  # Backend
kill $(lsof -ti :5173)  # Frontend
```

### Role user does not exist

PostgreSQL lokal konflik. Ubah port di `docker-compose.yml` dan `.env` ke `5433`.

### Database migration error

```bash
cd server && npm run migrate:down && npm run migrate:up
```

## Langkah Selanjutnya

1. Baca [Architecture Decisions](./Architecture%20Decisions.md) untuk memahami keputusan arsitektur
2. Pelajari [Extension Guide](./Extension%20Guide.md) untuk menambah fitur baru
3. Review [Best Practices & Pitfalls](./Best%20Practices%20%26%20Pitfalls.md) untuk menghindari jebakan umum
