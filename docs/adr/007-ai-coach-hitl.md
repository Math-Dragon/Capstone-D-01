# ADR-007: AI Coach with Human-in-the-Loop

## Status
Accepted

## Konteks
AI coach berinteraksi dengan user melalui berbagai aksi: generate plan, check-in, task actions (complete/skip/feedback), adjustment request, dan chat. Perlu desain yang memastikan AI tidak mengambil keputusan tanpa persetujuan user (Human-in-the-Loop).

## Keputusan
### Session Types & Behavior
| Session Type | Output | Plan Persistence | Use Case |
|-------------|--------|-----------------|----------|
| chat | { message, plan? } | Auto (_persistPlan) | Percakapan bebas |
| task_action | { message, plan? } | **Proposal** (via ACCEPT_PROPOSAL) | Complete/skip/feedback task |
| initial_plan | { tasks, summary } | Via recommendation HITL | Generate rencana awal |
| check_in | { tasks, summary } | Auto | Check-in harian |
| adjustment | { tasks, summary } | Auto | Request penyesuaian |
| crisis | { tasks, summary } | Auto | Beban berlebih |
| milestone | { tasks, summary } | Auto | Fase baru |

### HITL Flow for task_action
```
Task Action (complete/skip/feedback)
  ↓
Client → POST /api/coach → Server dispatch()
  ↓
Server: task_action session → LLM → { message, plan: [...] | null }
  ↓ (NO auto-persist)
Response: { type: 'task_action', data: { message, plan } }
  ↓
Client: if plan?.tasks?.length > 0 → show HITL Proposal Modal
  ├── Accept → POST ACCEPT_PROPOSAL → Server _persistPlan → refresh task list
  └── Reject → dismiss modal (task status tetap updated)
```

### Coach Actions (10 total)
INITIAL_PLAN, CHECK_IN, COMPLETE_TASK, SKIP_TASK, MODIFY_TASK, SUBMIT_FEEDBACK, REQUEST_ADJUSTMENT, CHAT_MESSAGE, CRISIS_SIGNAL, ACCEPT_PROPOSAL

### UI Surfaces
- **CheckInGateway**: App-level overlay setelah login, sebelum akses dashboard
- **ProposalOverlay**: In-situ modal di GoalDetailPage/CalendarPage
- **AdjustmentPanel**: Quick actions di Calendar/GoalDetail
- **CoachPage**: Chat, recommendation, observability

## Alasan
1. **Human-in-the-Loop**: Sesuai prinsip desain — user selalu punya kendali
2. **task_action sebagai proposal**: Plan dari task actions tidak auto-persist, harus di-accept dulu
3. **Explainability**: Setiap saran disertai rationale
4. **Dedicated session type**: task_action punya prompt pendek, fokus aksi, tanpa chat history
5. **Adaptation trigger**: COMPLETE_TASK hanya panggil LLM jika trigger fire — sisanya static

## Konsekuensi
- Proposal hilang jika user navigate/refresh (client-held state) — belum ada beforeunload guard
- ACCEPT_PROPOSAL kena aiLimiter yang sama (bisa dipisah ke endpoint sendiri)
- Task actions perlu loading state selama menunggu LLM (2-5 detik)
- Chat history untuk task_complete di-filter di client-side
- COMPLETE_TASK dengan trigger fires tetap return fallback message jika LLM gagal
