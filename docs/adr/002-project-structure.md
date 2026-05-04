# ADR-002: Project Structure

## Status
Accepted

## Konteks
Aplikasi terdiri dari frontend (React) dan backend (Express) dalam satu repository. Perlu struktur yang jelas untuk memisahkan concerns, memudahkan navigasi, dan scalable untuk perkembangan fitur.

## Keputusan
### Monorepo dengan Client-Server Separation
```
ai-learning-plan/
├── client/          # React + Vite frontend
├── server/          # Express.js backend
└── docker-compose.yml
```

### Feature-Based Structure (Client)
```
client/src/features/
├── auth/            # Authentication (components, hooks, slices, services)
├── coach/           # AI Coach (components, context, hooks, services)
└── goals/           # Goal management (components, hooks, slices, services)
```

### Layered Architecture (Server)
```
routes → services → repositories → models
```

### Prompt Separation
```
server/src/prompts/
├── system.md
├── system-v2.md
└── system-v3.md
```

## Alasan
1. **Monorepo**: Satu repo untuk seluruh codebase, mudah di-clone, CI pipeline tunggal
2. **Client-server terpisah**: Deploy independen (Github Action/Vercel/dll + VPS), batasan tanggung jawab jelas
3. **Feature-based**: Related code lives together, mudah menemukan file, scalable
4. **Layered backend**: Separation of concerns, mudah di-test (masing-masing layer bisa di-mock)
5. **Prompt terpisah**: System prompt bisa diiterasi tanpa mengubah kode backend

## Konsekuensi
- Perlu npm install di dua folder (client/ dan server/)
- Vite dev server perlu proxy ke backend (/api → localhost:3000)
- Feature duplication bisa terjadi jika tidak konsisten
- Layered architecture menambah boilerplate tapi memudahkan testing
