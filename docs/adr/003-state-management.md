# ADR-003: State Management

## Status
Accepted

## Konteks
Aplikasi memiliki state global yang perlu dikelola: autentikasi user (token, user data), goals dan tasks (CRUD, loading, error), serta observability events. Perlu dipilih antara Context API dan Redux Toolkit.

## Keputusan
Menggunakan **Redux Toolkit** untuk state global, dengan `createAsyncThunk` untuk side effects.

### Slice Architecture
| Slice | State | Async Actions |
|-------|-------|---------------|
| auth | user, token, loading, error | login, register, refreshToken, logout |
| goals | items, currentGoal, tasks, loading, error | fetchGoals, createGoal, updateGoal, deleteGoal |
| observability | events, metrics | addEvent, trackPageView |

### Local UI State
State UI lokal (modal open/close, form input, filter) tetap menggunakan `useState` / `useReducer` di komponen, bukan Redux.

### Coach State
State coach (messages, session) dikelola dengan **Context API** karena:
- Frekuensi update tinggi (setiap pesan chat)
- Lifetime terbatas (per session)
- Tidak perlu time-travel debugging
- Data disimpan di server, context hanya untuk UI state

## Alasan
1. **createAsyncThunk**: Menyederhanakan loading/error states, built-in middleware
2. **Immer**: Immutable updates jadi sederhana (state.items.push)
3. **DevTools**: Time-travel debugging memudahkan development
4. **Middleware**: Built-in thunk untuk async actions
5. **Coach via Context**: Karena coach state bersifat session-based dan high-frequency, Context lebih ringan

## Konsekuensi
- Coach messages tidak bisa di-time-travel debug via Redux DevTools
- Perlu dispatch observability events secara manual di slice actions
- Dual state management (Redux + Context) — perlu konsistensi tim
- State normalization diperlukan untuk menghindari nested data
