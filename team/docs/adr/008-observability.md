# ADR-008: Observability (Logging, Metrics, Audit)

## Status
Accepted

## Konteks
Aplikasi perlu visibilitas penuh: siapa yang mengakses, endpoint mana, berapa lama, apakah berhasil. Interaksi LLM harus tercatat untuk audit, monitoring biaya, dan debugging.

## Keputusan
### Tiga Pilar Observability

#### 1. Structured Logging (Pino)
- Format JSON untuk setiap request via requestLogger middleware
- 6 field wajib: request_id (UUID), method, route, status_code, duration_ms, user_id
- request_id sebagai correlation ID, di-generate via crypto.randomUUID()
- Level: debug (dev), info (production) — via logger.js

#### 2. Metrics (prom-client)
| Metric | Type | Labels | Buckets |
|--------|------|--------|---------|
| http_requests_total | Counter | method, route, status_code | — |
| http_request_duration_seconds | Histogram | method, route | [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] |
| ai_requests_total | Counter | type, status | — |
- Ekspos via GET /metrics (diamankan dengan metricsAuth middleware — x-metrics-key header)
- Default metrics via collectDefaultMetrics()

#### 3. Audit Trail
| Tabel | Fungsi | Actions |
|-------|--------|---------|
| audit_logs | Semua keputusan AI/coach | COACH_LLM_CALL, COACH_LLM_ERROR, COACH_TASK_COMPLETED, COACH_TASK_SKIPPED, COACH_FEEDBACK_SUBMITTED, COACH_CHAT_MESSAGE, COACH_PROPOSAL_ACCEPTED, COACH_PLAN_UNDONE, COACH_TASK_ACCEPTED, COACH_TASK_REJECTED, AI_RECOMMENDATION_ACCEPTED, AI_RECOMMENDATION_REJECTED |
| ai_recommendations | Input context + output LLM + status | pending/accepted/rejected |

Catatan: login, create goal, dan action non-AI **tidak** di-audit.

### Privacy-First Logging
- Prompt ke LLM hanya berisi data struktural (goal titles, task statuses, metrics) — tanpa email/nama
- Logs tidak menyimpan isi prompt atau response AI
- PII tidak pernah masuk ke audit_logs
- metadata di audit_logs bersifat structural (task_count, session_type, message_preview truncated 120 chars)
- **PERINGATAN**: context-builder.service.js load full user row (SELECT *) — email + password_hash di memory meski tidak dikirim ke LLM

### request_id Propagation
- request_id di-inject ke response JSON body via responseEnricher middleware (meta.request_id)
- Tidak hanya error — semua response bawa request_id

### Endpoint Health Check
```
GET /health → { success: true, data: { status: "ok", timestamp: "...", database: "healthy" } }
```
- Termasuk database health check (SELECT 1)
- Status "degraded" + 503 jika DB down

## Alasan
1. **Pino**: Performa tinggi, format JSON standar
2. **request_id**: Kunci untuk melacak request dari awal sampai akhir — di semua response
3. **prom-client**: Standar industri, integrasi Prometheus + Grafana
4. **Audit trail**: Debugging, compliance, tracking biaya AI
5. **Privacy-first**: Struktural data only — tapi perlu perbaikan di context-builder

## Konsekuensi
- pino-pretty tidak terinstall — dev perlu pipe manual
- Metrics endpoint diamankan dengan metricsAuth (x-metrics-key header)
- ai_requests_total hanya aktif di coach module — ai.service.js (suggestPlan) tidak ter-track
- Storage audit_logs bisa membesar — perlu cleanup policy
- context-builder load PII user row — perlu di-scope ke kolom spesifik
- Histogram nama http_request_duration_seconds (bukan _ms seperti ADR sebelumnya)
