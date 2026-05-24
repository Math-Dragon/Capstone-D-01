# ADR-007: AI Coach with Human-in-the-Loop

## Status
Accepted — **BUG: task_action auto-persist (lihat Konsekuensi)**

## Konteks
AI coach berinteraksi dengan user melalui berbagai aksi: generate plan, check-in, task actions (complete/skip/feedback), adjustment request, dan chat. Perlu desain yang memastikan AI tidak mengambil keputusan tanpa persetujuan user (Human-in-the-Loop).

## Keputusan
### Session Types & Behavior
| Session Type | Output | Plan Persistence | Use Case |
|-------------|--------|-----------------|----------|
| chat | { message, plan? } | Auto | Percakapan bebas |
| task_action | { message, plan? } | **AUTO-PERSIST** (BUG — seharusnya proposal) | Complete/skip/feedback task |
| initial_plan | { tasks, summary } | Via recommendation HITL | Generate rencana awal |
| check_in | { message, plan: null } | Static only (no LLM) | Check-in harian |
| adjustment | { tasks, summary } | Auto | Request penyesuaian |
| crisis | { tasks, summary } | Auto | Beban berlebih |
| milestone | { tasks, summary } | Auto (via adaptation trigger AT-4) | Fase baru |

### Coach Actions (11 actions — 1 hidden dari ADR)
INITIAL_PLAN, CHECK_IN, COMPLETE_TASK, SKIP_TASK, MODIFY_TASK, SUBMIT_FEEDBACK, REQUEST_ADJUSTMENT, CHAT_MESSAGE, CRISIS_SIGNAL, ACCEPT_PROPOSAL, **UNDO_PLAN**

### HITL Flow untuk initial_plan (satu-satunya HITL sebenarnya)
```
User submits plan form → dispatch('INITIAL_PLAN')
  → LLM → { tasks, summary }
  → NOT persisted → recommendation staging
  → Client: per-task Accept/Reject
    → Accept → POST /coach/recommendations/:recId/tasks/:taskId/decide
    → Reject → dismiss
```

### Static Responses (tanpa LLM)
- SKIP_TASK: selalu static (via static-response.service.js)
- CHECK_IN: selalu static (via static-response.service.js)
- COMPLETE_TASK: static kecuali adaptation trigger fire
- SUBMIT_FEEDBACK: static kecuali adaptation trigger fire

### UI Surfaces
- **CheckInGateway**: App-level overlay mood check-in (5 mood, sekali/hari)
- **ProposalOverlay**: Modal di GoalDetailPage/CalendarPage untuk saran AI
- **AdjustmentPanel**: Quick actions di Calendar/GoalDetail (4 preset + custom)
- **CoachPage**: Chat, plan form, recommendation panel, observability

### Adaptation Triggers
AT-1: streak_days == 3 (adjustment-friendly)
AT-2: streak_days == 0 (recovery mode)
AT-3: completion_rate_7d < 0.5 (struggling)
AT-4: completion_rate_7d > 0.9 && streak >= 5 (milestone)
AT-5: consecutive_skips >= 3 (crisis)
AT-6: completion_rate_7d == 0 && consecutive_skips >= 2 (crisis)

## Alasan
1. **Human-in-the-Loop**: Sesuai prinsip desain — user selalu punya kendali (kecuali bug task_action)
2. **Static responses**: Routine actions (skip, check-in) skip LLM — hemat biaya + latensi
3. **Adaptation trigger**: LLM hanya dipanggil jika diperlukan (mendeteksi perubahan signifikan)
4. **initial_plan HITL**: Per-task accept/reject — user kontrol penuh atas task individual
5. **Dedicated templates**: Setiap session type punya prompt + temperature sendiri

## Konsekuensi
- **BUG**: task_action auto-persist di dispatch.service.js — melanggar HITL guarantee. ACCEPT_PROPOSAL persistPlan kedua → duplicate tasks
- Proposal di-persist ke localStorage (30 menit TTL) — survive page refresh
- ACCEPT_PROPOSAL kena aiLimiter yang sama (bisa dipisah ke endpoint sendiri)
- gate.service.js punya dead code: SKIP_TASK dan CHECK_IN cases tidak pernah reached (dispatch short-circuit)
- UNDO_PLAN tersedia untuk rollback via POST /coach/undo
