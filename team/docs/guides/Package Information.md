# Package Information

Dokumen ini mencantumkan semua paket dan versinya yang digunakan dalam proyek AI Learning Plan.

## Dependencies

### Frontend (client/)

#### Core Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| react | ^19.0.0 | UI library |
| react-dom | ^19.0.0 | React DOM rendering |
| react-router-dom | ^7.1.1 | Client-side routing |
| @reduxjs/toolkit | ^2.11.2 | State management |
| react-redux | ^9.2.0 | React Redux bindings |
| react-hook-form | ^7.73.1 | Form handling |
| zod | ^4.3.6 | Schema validation |
| axios | ^1.15.2 | HTTP client |
| firebase | ^11.3.1 | Firebase Auth (social login) |
| recharts | ^3.8.1 | Charting library |

#### Development Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| vite | ^6.0.5 | Build tool |
| @vitejs/plugin-react | ^4.3.4 | Vite React plugin |
| tailwindcss | ^4.2.4 | Utility-first CSS |
| eslint | ^9.17.0 | Code linting |
| globals | ^15.14.0 | Global variables |

### Backend (server/)

#### Core Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| express | ^4.21.2 | HTTP server framework |
| pg | ^8.13.1 | PostgreSQL client |
| node-pg-migrate | ^7.9.1 | Database migrations |
| jsonwebtoken | ^9.0.2 | JWT access + refresh tokens |
| bcryptjs | ^2.4.3 | Password hashing |
| firebase-admin | ^13.1.0 | Firebase Auth verification |
| @google/generative-ai | ^0.24.0 | Gemini AI (primary LLM) |
| pino | ^9.6.0 | Structured logging |
| pino-pretty | ^13.0.0 | Pretty-print logs |
| zod | ^3.24.2 | Schema validation |
| redis | ^4.7.0 | Redis client |
| express-rate-limit | ^7.5.0 | Rate limiting |
| rate-limit-redis | ^4.3.1 | Redis-backed rate limiter |
| prom-client | ^15.1.3 | Prometheus metrics |
| slugify | ^1.6.6 | URL-safe text |
| ioredis | ^5.4.2 | Redis client (alternate) |

#### Development Dependencies

| Package | Version | Description |
|---------|---------|-------------|
| jest | ^29.7.0 | Testing framework |
| @jest/globals | ^29.7.0 | Jest globals |
| supertest | ^7.0.0 | HTTP integration tests |
| nodemon | ^3.1.9 | Auto-restart dev server |
| eslint | ^9.17.0 | Code linting |
| globals | ^15.14.0 | Global variables |

## Environment Variables

### Server (.env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_ACCESS_EXPIRY` | Access token expiry (default: 15m) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry (default: 7d) |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `OPENROUTER_API_KEY` | OpenRouter fallback API key |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (development/production) |
| `CORS_ORIGIN` | Allowed CORS origin |

### Client (.env)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |

## Tech Stack Summary

| Category | Technology |
|----------|------------|
| Frontend Framework | React 19 |
| Build Tool | Vite 6 |
| State Management | Redux Toolkit |
| Styling | Tailwind CSS 4 |
| Forms | React Hook Form |
| Validation | Zod |
| Backend Framework | Express 4 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| ORM/Migrations | node-pg-migrate |
| AI Provider | Google Gemini AI |
| AI Fallback | OpenRouter (NVIDIA Nemotron) |
| Auth | JWT + Firebase Auth |
| Logging | Pino |
| Metrics | prom-client |
| Testing (FE) | Vitest + RTL |
| Testing (BE) | Jest + Supertest |
| Container | Docker Compose |
| CI/CD | GitHub Actions |
