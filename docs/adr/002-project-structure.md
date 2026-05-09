# ADR-002: Project Structure

## Status
Accepted

## Konteks
Aplikasi terdiri dari frontend (React) dan backend (Express) dalam satu repository. Perlu struktur yang jelas untuk memisahkan concerns, memudahkan navigasi, dan scalable untuk perkembangan fitur.

## Keputusan
### Monorepo dengan Docker Compose
```
ai-learning-plan/
├── client/                    # React + Vite frontend
├── server/                    # Express.js backend
├── docker-compose.yml         # PostgreSQL 16 + Redis 7 + server + client
├── docs/                      # Documentation (ADRs, guides)
└── .github/workflows/         # CI pipeline
```

### Feature-Based Structure (Client)
```
client/src/features/
├── auth/            # Authentication (components, context, hooks, services, schemas)
├── coach/           # AI Coach (components, context, hooks, services)
└── goals/           # Goal management (components, context, hooks, services, schemas)
```
Catatan: auth dan goals menggunakan **Context + Redux** (bukan Redux slices langsung).
State global via Redux, async orchestration via Context API (AuthContext, GoalsContext).

### Directori Pendukung Client
```
client/src/
├── components/       # Shared UI components (Modal, Toast, ProposalOverlay, dll)
├── pages/            # Route-level page components
├── layouts/          # Layout templates (MainLayout)
├── store/            # Redux store + slices
├── hooks/            # Shared custom hooks
├── config/           # Firebase config
├── services/         # Axios instance + interceptors
└── utils/            # Utility functions
```

### Layered Architecture (Server)
```
routes → services → repositories → models
```

### Cross-Cutting Layer Server
```
server/src/
├── routes/           # API route handlers
├── services/         # Business logic + coach/ submodule (6 files)
├── repositories/     # Data access layer
├── models/           # Zod schemas + DB model mapping
├── middleware/        # Auth, rate limiting, error handler, logging, metrics auth
├── config/           # Centralized config + Firebase admin
├── utils/            # Logger, metrics, retry, converter
├── migrations/       # 13 sequential DB migrations
├── db.js             # DB connection pool
├── app.js            # Express app wiring
└── index.js          # Server entry point
```

### Prompt Separation
```
server/src/prompts/
├── system.md         # v1
├── system-v2.md      # v2
├── system-v3.md      # v3
└── system-final.md   # current (loaded by llm-client.js)
```

## Alasan
1. **Monorepo**: Satu repo untuk seluruh codebase, mudah di-clone, CI pipeline tunggal
2. **Client-server terpisah**: Deploy independen, batasan tanggung jawab jelas
3. **Feature-based**: Related code lives together, mudah navigasi, scalable
4. **Layered backend**: Separation of concerns, mudah di-test (masing-masing layer bisa di-mock)
5. **Prompt terpisah**: System prompt bisa diiterasi tanpa mengubah kode backend

## Konsekuensi
- Perlu npm install di dua folder (client/ dan server/)
- Vite dev server perlu proxy ke backend (/api → localhost:3000)
- Context + Redux hybrid — perlu konsistensi tim
- Layered architecture menambah boilerplate tapi memudahkan testing
- Coach sub-service (6 files) menambah kompleksitas organisasi
