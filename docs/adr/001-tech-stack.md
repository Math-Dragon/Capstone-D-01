# ADR-001: Tech Stack

## Status
Accepted

## Konteks
Tim perlu memilih teknologi yang tepat untuk membangun aplikasi AI Learning Plan — sebuah web app dengan integrasi AI (LLM), data relasional, autentikasi, dan monitoring.

## Keputusan
| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 | Komponen-based, build cepat, utility-first CSS |
| Backend | Node.js + Express 4 | Non-blocking I/O, middleware ecosystem matang |
| Database | PostgreSQL 16 | Relasional, ACID, JSONB untuk semi-structured data |
| Cache | Redis 7 | Rate limiting, session cache |
| State Management | Redux Toolkit (global) + Context API (coach) | createAsyncThunk untuk side effects, Context untuk high-frequency chat |
| AI/LLM | Gemini (primary) → GeminiPaid → GLM → OpenRouter (legacy) | Multi-provider fallback chain, free tier + paid backup |
| Validation | Zod (v3 server, v4 client) | Type-safe runtime validation |
| Auth | JWT access/refresh + Firebase Auth (Google) | Token rotation, social login via Firebase Admin |
| HTTP Client | Axios | Interceptors untuk auto-attach token + refresh |
| Form Handling | React Hook Form + Zod | Performant forms, validation terintegrasi |
| Routing | React Router v7 | Client-side routing |
| Charting | Recharts | Data visualisasi progress |
| Logging | Pino | Structured JSON logging, performa tinggi |
| Metrics | prom-client | Prometheus-compatible |
| Testing | Jest + Supertest (server), Vitest (client) | Unit + integration test |
| Logging | Pino | Structured JSON logging, performa tinggi |
| Metrics | prom-client | Prometheus-compatible, standar industri |
| Testing | Jest + Supertest (server), Vitest (client) | Unit + integration test, coverage reporting |
| Migration | node-pg-migrate | Version-controlled schema changes |

## Alasan
1. React + Vite: Build cepat, hot module replacement, sudah dipelajari di kelas Dicoding
2. Node.js: Event loop cocok untuk concurrent LLM calls, middleware ecosystem matang
3. PostgreSQL: Data terstruktur (goals, tasks, progress) lebih cocok dibanding NoSQL
4. Multi-provider: Resilience — jika satu provider down, fallback otomatis
5. Redux + Context: Redux untuk data global persisten, Context untuk chat session-based

## Konsekuensi
- Perlu Docker Desktop untuk development (PostgreSQL + Redis berjalan di container)
- Zod v3 (server) vs v4 (client) — schema tidak bisa langsung dibagi
- Multi-provider = maintain 3-4 API keys + masing-masing punya billing
- Dua test framework (Jest vs Vitest) — perlu konsistensi konfigurasi
- Firebase dependency untuk social login (Google only, GitHub planned)
- node-pg-migrate untuk semua schema changes
