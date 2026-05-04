# ADR-004: Multi-Provider LLM Strategy

## Status
Accepted

## Konteks
Aplikasi menggunakan AI sebagai learning coach. LLM adalah komponen non-deterministic — API bisa down, response lambat, atau biaya membengkak. Perlu strategi yang robust untuk production.

## Keputusan
### Multi-Provider Fallback Chain
```
Gemini (Primary)
  └── fallback → OpenRouter / NVIDIA Nemotron (Secondary)
        └── fallback → Mock (Development/Testing)
```

### Arsitektur Coach
```
Client → [Gate] → [Context Builder] → [LLM Pipeline] → [Response Formatter] → Client
```

| Komponen | Responsibility |
|-----------|---------------|
| Gate | Check eligibility, cooldown, effort budget |
| Context Builder | Collect goals, tasks, progress, history |
| LLM Pipeline | Construct prompt, call LLM, retry logic, parse response |
| Response Formatter | Format markdown, extract tasks, generate suggestions |

### Prompt Versioning
```
server/src/prompts/
├── system.md        # v1
├── system-v2.md     # v2
└── system-v3.md     # v3 (current — every plan is a proposal)
```

### Output Validation
Semua output LLM divalidasi dengan Zod schema sebelum diproses. Jika tidak valid, sistem retry sekali. Jika gagal lagi, return error ke user.

## Alasan
1. **Resilience**: Jika Gemini down, fallback ke OpenRouter otomatis
2. **Cost**: Mock mode untuk development (tanpa API key), Gemini gratis tier untuk testing
3. **Testing**: Mock memudahkan reproducibility tanpa network dependency
4. **Prompt versioning**: Perubahan prompt bisa di-A/B test dan rollback
5. **Output validation**: Mencegah data rusak dari LLM non-deterministic

## Konsekuensi
- Perlu maintain multiple API keys
- Mock dan real LLM bisa menghasilkan output berbeda — perlu disadari saat testing
- LLM calls lambat (2-5 detik) — perlu loading states yang baik di UI
- Biaya API perlu dimonitor lewat ai_requests_total metric
- Retry logic menambah kompleksitas (tapi meningkatkan reliability)
