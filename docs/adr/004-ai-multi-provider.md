# ADR-004: Multi-Provider LLM Strategy

## Status
Accepted

## Konteks
Aplikasi menggunakan AI sebagai learning coach. LLM adalah komponen non-deterministic — API bisa down, response lambat, atau biaya membengkak. Perlu strategi yang robust untuk production.

## Keputusan
### Multi-Provider Fallback Chain (sequential)
```
gemini       (GEMINI_API_KEY)         — primary, free tier
  → geminiPaid (GEMINI_PAID_API_KEY)  — paid backup
    → glm       (GLM_API_KEY)          — Zhipu AI
      → openrouter (OPENROUTER_API_KEY) — legacy fallback
```
Provider lain: **ollama** (local, via `LLM_PROVIDER=ollama`, tanpa fallback).
**Mock** (via `LLM_PROVIDER=mock`) bukan bagian dari fallback — mode standalone untuk dev/testing.

### 429 Circuit Breaker
Jika provider return 429, di-skip selama 60 detik (cooldown flag per provider).

### Arsitektur Coach
```
Client → [Gate] → [Context Builder] → [LLM Pipeline] → [Response Formatter] → Client
```

| Komponen | File | Responsibility |
|-----------|------|---------------|
| Gate | `gate.service.js` | Check eligibility, adaptation triggers, static-only mode |
| Context Builder | `context-builder.service.js` | Collect goals, tasks, progress, history, metrics, profile |
| LLM Pipeline | `llm-pipeline.service.js` | Construct prompt, call LLM with fallback (callWithRetry), Zod validation |
| Response Formatter | `response-formatter.service.js` | persistPlan, stageRecommendation, acceptProposal, undoPlan |
| Static Response | `static-response.service.js` | Handle routine actions (task done, skip, check-in, feedback) tanpa LLM |
| Dispatch | `dispatch.service.js` | Orchestrator — resolves action → gate → context → pipeline → formatter |

### Prompt Files
```
server/src/prompts/
├── system.md         # v1
├── system-v2.md      # v2
├── system-v3.md      # v3
└── system-final.md   # current — loaded by llm-client.js
```

### Output Validation
Output LLM divalidasi dengan Zod (`PlanSchema`, `ChatResponseSchema`). Jika tidak valid:
1. Retry sekali dengan format hint di prompt
2. Jika gagal lagi → return error ke user (`MAX_BUSINESS_RETRIES = 1`)

### Session Type-Specific Templates
Setiap session type punya template prompt + temperature sendiri (`templates.js`).

## Alasan
1. **Resilience**: 4 provider sequential — jika satu down, fallback otomatis
2. **Cost**: Gemini free tier + geminiPaid untuk production, GLM/OpenRouter sebagai backup
3. **Circuit breaker**: Mencegah retry loop pada rate-limited provider
4. **Static response**: Routine actions skip LLM — hemat biaya + latency
5. **Output validation**: Zod mencegah data rusak dari LLM non-deterministic

## Konsekuensi
- Perlu maintain 4 API keys + billing masing-masing
- Provider berbeda bisa menghasilkan output berbeda — perlu disadari saat testing
- LLM calls lambat (2-5 detik) — loading states di UI
- ai_requests_total metric hanya aktif di coach module, tidak di ai.service.js
- 429 cooldown 60 detik — provider di-skip sementara, beban pindah ke provider berikutnya
- OpenRouter dianggap legacy — tidak aktif di .env.example (commented out)
