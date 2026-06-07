# AI Cost, Token Usage, and Metrics

Dokumen ini mendukung validasi TC-015 sampai TC-017.

## TC-015: AI cost tracking aktif

Backend mencatat estimasi biaya setiap request AI melalui helper `recordAIUsage` di `team/server/src/utils/metrics.js`.

Estimasi biaya dihitung dari token input dan token output:

```text
estimated_cost_usd =
  (prompt_tokens / 1,000,000 * input_price_usd_per_1m_tokens)
  +
  (completion_tokens / 1,000,000 * output_price_usd_per_1m_tokens)
```

Harga default disiapkan per provider/model untuk `gemini`, `geminiPaid`, `openrouter`, `glm`, `ollama`, dan `mock`. Provider lokal/mock bernilai `0` agar tidak menghasilkan estimasi biaya palsu.

## TC-016: Token usage tercatat di log

Setiap request AI yang mengembalikan metadata token akan mencatat structured log dengan event `ai_usage`.

Field log utama:

- `type`: jalur request, misalnya `ai.suggestPlan` atau `coach.chat`
- `status`: status request AI
- `provider`: provider yang berhasil digunakan
- `model`: model yang dipakai
- `prompt_tokens`: jumlah token input
- `completion_tokens`: jumlah token output
- `total_tokens`: total token
- `estimated_cost_usd`: estimasi biaya dalam USD
- `latency_ms`: durasi provider jika tersedia

Contoh:

```json
{
  "event": "ai_usage",
  "type": "coach.chat",
  "status": "success",
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "prompt_tokens": 1000,
  "completion_tokens": 500,
  "total_tokens": 1500,
  "estimated_cost_usd": 0.000225,
  "latency_ms": 1200
}
```

## TC-017: `/metrics` menyajikan data AI

Endpoint `GET /metrics` mengekspos data Prometheus berikut:

- `ai_requests_total`: jumlah request AI berdasarkan `type` dan `status`
- `ai_tokens_total`: token berdasarkan `type`, `status`, `provider`, `model`, dan `direction`
- `ai_cost_usd_total`: estimasi akumulasi biaya AI berdasarkan `type`, `status`, `provider`, dan `model`

Contoh query lokal:

```bash
curl http://localhost:3000/metrics
```

Jika `METRICS_API_KEY` diaktifkan, request harus menyertakan header:

```bash
curl -H "x-metrics-key: <key>" http://localhost:3000/metrics
```

## Jalur yang tercakup

- `/api/ai/plan/suggest` mencatat usage dari `callWithRetry`.
- Coach dispatcher mencatat usage dari metadata attempt LLM yang berhasil.
- Jika metadata token tidak tersedia, request AI tetap dihitung lewat `ai_requests_total`.
