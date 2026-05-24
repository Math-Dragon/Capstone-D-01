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

### Output Validation (4 Layer)

**Layer 1 — API-Level JSON Mode**
Gemini: `responseMimeType: 'application/json'` di `generationConfig`. OpenAI-compatible: `response_format: { type: 'json_object' }`. Keduanya di-set di `converter.js`. Ini memastikan output berformat JSON, tapi **tidak** memvalidasi struktur schema — hanya memaksa format.

**Layer 2 — `validateWithWarnings` (User-in-the-Loop)**
`server/src/services/llm.js` mengekspor `validateWithWarnings(raw)`. Output di-klasifikasi menjadi:
- **Recoverable** (`duration_estimate` di luar 25–90, kode Zod `too_big`/`too_small`): return `200` + data + `violations` array.
- **Unrecoverable** (missing `tasks`, invalid enum, malformed date): throw `AI_OUTPUT_INVALID` (422) → lanjut ke Layer 3.

Pipeline (`llm-pipeline.service.js`) menggunakan `validateWithWarnings` untuk non-chat output. Jika recoverable violations ditemukan, pipeline return awal — skip retry, skip `applyBusinessRules`, kirim violations ke client.

**Layer 3 — Retry dengan Pesan Error Spesifik**
Untuk unrecoverable violation yang masuk retry:
- Zod schema violation (pesan mengandung `schema violation at`) → pesan error spesifik (field + constraint) dikirim ke LLM
- JSON parse error → hint generik format error
- Maksimal 1 retry (`MAX_BUSINESS_RETRIES = 1`)

**Layer 4 — Zod Safety Net (`validateAIOutput`, `validateChatOutput`)**
Fallback validation untuk chat output dan unrecoverable path.

### Client-Side Violation UI

Ketika server mengirim `violations` array, client menampilkan:
- **Badge amber** pada task card yang melanggar (border amber, durasi di-highlight merah)
- **ViolationAdjustModal**: modal dengan 3 opsi — sesuaikan ke batas (mengirim `overrides`), lewati tugas (reject), atau batal
- Violation di-clear saat user memutuskan (optimistic update); di-restore saat API call gagal (rollback via `violationMap`)

### Post-Decide Truncation Sweep

Setelah semua task di-decide, `dispatch.service.js` menjalankan `_sweepExcessTasks()`:
- Task berprioritas rendah di-trim jika total durasi melebihi `weeklyTargetHours × 1.2`
- Algoritma: sort by priority, satu O(n) `reduce` initial, lalu O(1) per pop (running total)
- Trimmed task → status `rejected_by_truncation`, ID dikembalikan ke client

> **Penting:** `applyBusinessRules()` di `llm-pipeline.service.js` juga melakukan truncation saat staging, tapi menggunakan `reduce()` di dalam while-loop (O(m) per iterasi). Keduanya adalah mekanisme terpisah — staging vs post-decide.

### Decide Overrides
`decideSchema` menerima field opsional `overrides` (misal: `{ duration_estimate: 90 }`). Override hanya berlaku saat `decision = 'accepted'`. Backend re-validates via Zod `min(25).max(90)`.

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
- JSON mode di-set di `converter.js` — hanya format enforcement, bukan schema enforcement
- Retry hint spesifik (schema violation vs format error) tetap ada sebagai safety net
- Recoverable violation menampilkan data ke user (status 200), bukan hard 422
- `applyBusinessRules` di-skip saat violations ada (duration_estimate tidak reliable)
- `_sweepExcessTasks()` otomatis setelah semua task di-decide, terpisah dari `applyBusinessRules` truncation saat staging
- Client harus menampilkan badge peringatan + modal koreksi/skip pada task yang melanggar
- Client harus menampilkan notifikasi trimmed tasks setelah semua task di-decide
