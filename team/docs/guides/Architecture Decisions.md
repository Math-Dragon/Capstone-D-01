# Architecture Decisions

Dokumen ini menjelaskan alasan di balik keputusan arsitektur yang diambil dalam proyek AI Learning Plan.

## Daftar Isi

1. [Project Structure](#project-structure)
2. [State Management](#state-management)
3. [API Layer](#api-layer)
4. [AI Integration](#ai-integration)
5. [Database](#database)
6. [Authentication](#authentication)
7. [Code Patterns](#code-patterns)

---

## Project Structure

### Monorepo dengan Client-Server Separation

```
ai-learning-plan/
├── client/         # React frontend
├── server/         # Express backend
└── docker-compose.yml
```

**Kenapa monorepo?**
- Satu repository untuk seluruh codebase
- Mudah di-clone dan di-setup
- Docker Compose mengelola semua service
- CI pipeline tunggal

**Kenapa client-server terpisah?**
- Deploy independen (Vercel + VPS)
- Backend tidak serve static files
- Jelas batasan tanggung jawab

### Feature-Based Structure (Client)

```
src/features/
├── auth/
├── coach/
└── goals/
```

**Kenapa feature-based?**

| Feature-Based | Type-Based |
|---------------|------------|
| Related code lives together | Semua komponen dalam satu folder |
| Mudah menemukan file terkait | Sulit navigasi saat aplikasi besar |
| Memudahkan code splitting | Semua termuat bersamaan |
| Scalable | Menjadi messy |

### Layered Architecture (Server)

```
routes → services → repositories → models
```

**Kenapa layered?**
- Separation of concerns
- Mudah di-test (masing-masing layer bisa di-mock)
- Service logic reusable
- Repository memisahkan query dari business logic

---

## State Management

### Redux Toolkit vs Context API

| Aspect | Redux Toolkit | Context API |
|--------|--------------|-------------|
| Performance | Optimized, memoized | Baik untuk low-frequency |
| DevTools | Time-travel debugging | Terbatas |
| Boilerplate | Minimal (RTK) | Minimal |
| Middleware | Built-in (thunk) | Manual |
| Scalability | Excellent | Small-medium |

**Kenapa Redux Toolkit?**
- Middleware untuk async actions (login, fetch data) sangat penting
- createAsyncThunk menyederhanakan loading/error states
- Immer untuk immutable updates
- DevTools memudahkan debugging
- ObservabilitySlice untuk analytics events

**Apa yang disimpan di Redux?**

| Slice | State |
|-------|-------|
| auth | user, token, loading, error |
| goals | goals list, current goal, tasks, progress |
| observability | events, metrics |

**Apa yang TIDAK disimpan di Redux?**
- UI state lokal (modal open/close, form input)
- Coach chat messages (disimpan di Context + API)
- Filter/sort preferences

---

## API Layer

### Axios dengan Interceptors

```javascript
// services/api.js
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — refresh token + error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshed = await refreshToken();
      if (refreshed) return api.request(error.config);
      // If refresh fails, redirect to login
      logout();
    }
    return Promise.reject(error);
  }
);
```

**Kenapa pendekatan ini?**
- **Centralized** — Semua API call melalui satu instance
- **Token management** — Auto-attach + auto-refresh
- **Error handling** — Global interceptor
- **Refresh token rotation** — Security best practice

---

## AI Integration

### Multi-Provider LLM Strategy

```
Gemini (Primary)
  └── fallback → OpenRouter / NVIDIA Nemotron
        └── fallback → Mock (development)
```

**Kenapa multi-provider?**
- **Resilience** — Jika satu provider down, fallback jalan
- **Cost optimization** — Gemini gratis, OpenRouter berbayar
- **Development** — Mock mode tanpa API key
- **Testing** — Mock memudahkan test reproducibility

### Coach Architecture

```
Client → [Gateway] → [Context Builder] → [LLM Pipeline] → [Response Formatter] → Client
```

| Component | Responsibility |
|-----------|---------------|
| Gate | Memeriksa eligibility, cooldown, effort budget |
| Context Builder | Mengumpulkan goals, tasks, progress, history |
| LLM Pipeline | Construct prompt, call LLM, parse response |
| Response Formatter | Format markdown, extract tasks, generate suggestions |

---

## Database

### PostgreSQL dengan Migration

**Kenapa PostgreSQL?**
- Relasional yang mature
- Fitur JSON untuk data semi-structured
- ACID compliance
- Lebih cocok untuk data terstruktur goals/tasks dibandingkan MongoDB

**Kenapa node-pg-migrate?**
- Version-controlled schema changes
- Up/down migration untuk rollback
- Integrasi dengan Node.js ecosystem

### Schema Highlights

| Table | Purpose |
|-------|---------|
| users | Auth + profile |
| goals | Learning goals with deadlines |
| tasks | Study tasks with types, slots, status |
| coach_state | Check-in, streak, session tracking |
| plan_snapshots | Versioned plan untuk rollback |
| audit_logs | LLM interaction audit trail |

---

## Authentication

### JWT + Firebase Auth Hybrid

**Dua mode autentikasi:**
1. **Email/Password** — JWT access + refresh tokens
2. **Social Login** — Firebase Auth (Google, GitHub)

**Kenapa hybrid?**
- Email/password untuk user tanpa akun Google
- Firebase untuk social login (tanpa implementasi OAuth manual)
- JWT sendiri untuk kontrol penuh atas token lifecycle

### Refresh Token Rotation

```
Login → Access Token (15m) + Refresh Token (7d)
         ↓ expired
Refresh → New Access Token + New Refresh Token (rotation)
          ↓ if refresh fails
Re-login required
```

**Kenapa rotation?**
- Mencegah replay attack
- Jika refresh token dicuri, token lama langsung invalid
- Best practice OAuth 2.0

---

## Code Patterns

### Redux Slice Pattern

```javascript
const slice = createSlice({
  name: 'goals',
  initialState: { items: [], loading: false, error: null },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
```

**Kenapa pattern ini?**
- Standard Redux Toolkit (createSlice + createAsyncThunk)
- Loading/error state otomatis terkelola
- Immer untuk immutable updates

### Custom Hook Pattern

```javascript
// hooks/useTaskActions.js
export function useTaskActions(goalId) {
  const dispatch = useDispatch();

  const updateTaskStatus = useCallback(async (taskId, status) => {
    await dispatch(updateTask({ goalId, taskId, status })).unwrap();
    dispatch(addObservabilityEvent({
      type: 'task_status_change',
      taskId,
      newStatus: status,
    }));
  }, [dispatch, goalId]);

  return { updateTaskStatus };
}
```

**Kenapa pattern ini?**
- Reusable logic
- Separation of concerns
- Mudah di-test
- Components tetap clean

---

## Summary

| Decision | Rationale |
|----------|-----------|
| Monorepo | Satu repo, mudah setup |
| Feature-based structure | Scalability, code splitting |
| Redux Toolkit | Async middleware, DevTools, Immer |
| Axios interceptors | Centralized auth/token/error handling |
| Multi-provider LLM | Resilience, cost, development |
| PostgreSQL | Relational, ACID, JSON support |
| JWT + Firebase Hybrid | Flexibility + security |
| Refresh token rotation | Security best practice |
| Layered backend | Testability, separation of concerns |
