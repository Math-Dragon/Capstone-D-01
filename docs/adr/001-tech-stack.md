# ADR-001: Tech Stack

## Status
Accepted

## Konteks
Tim perlu memilih teknologi yang tepat untuk membangun aplikasi AI Learning Plan — sebuah web app dengan integrasi AI (LLM), data relasional, autentikasi, dan monitoring. Pertimbangan: kemudahan development, ekosistem, biaya operasional, dan kesesuaian dengan kurikulum bootcamp.

## Keputusan
| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| Frontend | React 19 + Vite 6 | Komponen-based, ekosistem besar, familiar dari kelas Dicoding |
| Backend | Node.js + Express 4 | Non-blocking I/O cocok untuk panggilan LLM, middleware luas |
| Database | PostgreSQL 16 | Relasional, ACID, JSON support untuk semi-structured data |
| Cache | Redis 7 | Rate limiting, session cache, antrean ringan |
| AI/LLM | Gemini API (primary) + OpenRouter (fallback) | Free tier tersedia, API straightforward |
| Validation | Zod | Type-safe, bisa digunakan client + server |
| Logging | Pino | Structured JSON logging, performa tinggi |
| Metrics | prom-client | Prometheus-compatible, standar industri |
| Testing | Jest + Supertest (server), Vitest (client) | Unit + integration test, coverage reporting |
| Container | Docker + Docker Compose | Environment konsisten antar developer |
| CI/CD | GitHub Actions | Otomasi lint, test, dan deployment |

## Alasan
1. React + Vite: Build cepat, hot module replacement, sudah dipelajari di kelas Dicoding
2. Node.js: Event loop cocok untuk concurrent LLM calls, middleware ecosystem matang
3. PostgreSQL: Data terstruktur (goals, tasks, progress) lebih cocok dibanding NoSQL
4. Gemini: Free tier memadai untuk development, bisa diganti kapan saja
5. Zod: Schema yang sama bisa dipakai client dan server, mengurangi duplikasi

## Konsekuensi
- Perlu Docker Desktop untuk development (PostgreSQL + Redis berjalan di container)
- Biaya Gemini API jika melebihi free tier
- Migration tool (node-pg-migrate) diperlukan untuk schema changes
- Dua test framework berbeda (Jest vs Vitest) — tapi pola testing serupa
