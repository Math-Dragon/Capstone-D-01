# ADR-003: State Management

## Status
Accepted

## Konteks
Aplikasi memiliki state global yang perlu dikelola: autentikasi user, goals/tasks, coach chat, dan observability.

## Keputusan
Menggunakan **Redux Toolkit** untuk state global + **Context API** sebagai facade untuk async orchestration + **Context API** untuk coach chat.

### Slice Architecture
| Slice | State | Async Actions |
|-------|-------|---------------|
| auth | user, isAuthenticated, loading, error | **none** (purely sync — token di localStorage) |
| goals | items, loading, error | fetchGoals, createGoal, updateGoal, deleteGoal |
| observability | auditLogs, studentMetrics, recommendationMetrics, pipelineTrace, loading, error | fetchAuditTrail, fetchStudentMetrics, fetchObservabilityData |

### Context Providers (3 layers)
| Context | File | Responsibility |
|---------|------|----------------|
| AuthProvider | `features/auth/context/AuthContext.jsx` | Login, register, Google OAuth, token refresh, logout — dispatches ke Redux auth slice |
| GoalsProvider | `features/goals/context/GoalsContext.jsx` | CRUD orchestration — dispatches ke Redux goals slice |
| CoachProvider | `features/coach/context/CoachContext.jsx` | Chat messages, status, recommendation, plan generation, HITL flow — state lokal, tidak di Redux |
| ToastProvider | `components/ui/Toast.jsx` | Notifikasi global (success/error/warning/info) |

### Provider Hierarchy
```
Redux Provider
  → AuthProvider (orchestrates Redux auth)
    → GoalsProvider (orchestrates Redux goals)
      → ToastProvider
        → CoachProvider (standalone context)
```

### Local UI State
Modal open/close, form input, filter menggunakan `useState` + `react-hook-form` (bukan `useReducer`).

### Coach State (Context API)
- messages, status, recommendation, mode, pipelineTrace
- Tidak di Redux karena high-frequency updates + session-based lifetime
- Bridge: pipelineTrace di-dispatch ke Redux observability untuk dev tools

## Alasan
1. **Redux**: createAsyncThunk untuk loading/error states, DevTools, Immer
2. **Context facade**: Memisahkan async orchestration dari Redux — AuthContext dan GoalsContext handle side effects, Redux hanya menyimpan state
3. **Coach via Context**: Session-based, high-frequency updates, lifetime terbatas
4. **react-hook-form**: Performant form state management, validasi via Zod resolver
5. **Toast Context**: Event-driven notifikasi, tidak perlu Redux

## Konsekuensi
- 4 Context providers — perlu diingat urutan wrapping
- Coach messages tidak bisa time-travel debug via Redux DevTools
- AuthContext + GoalsContext sebagai facade — abstraksi tambahan, testing perlu mock dua layer
- Token di localStorage (XSS risk) — mitigated oleh short-lived access token (15m)
- register endpoint server tidak return token — client-side bug (login manual setelah register)
