# ADR-008: Observability (Logging, Metrics, Audit)

## Status
Accepted

## Konteks
Aplikasi perlu visibilitas penuh: siapa yang mengakses, endpoint mana, berapa lama, apakah berhasil. Selain itu, interaksi dengan LLM harus tercatat untuk audit, monitoring biaya, dan debugging.

## Keputusan
### Tiga Pilar Observability

#### 1. Structured Logging (Pino)
- Format JSON untuk setiap request
- Field wajib: request_id, method, route, status_code, duration_ms, user_id
- request_id sebagai correlation ID (UUID)
- Level: debug (dev), info (production)

#### 2. Metrics (prom-client)
- http_requests_total: Counter per (method, route, status)
- http_request_duration_ms: Histogram (buckets: 50, 100, 200, 500, 1000, 2000, 5000ms)
- ai_requests_total: Counter per (type, status) — untuk tracking biaya LLM
- Ekspos via GET /metrics (Prometheus-compatible)

#### 3. Audit Trail
| Tabel | Fungsi |
|-------|--------|
| audit_logs | Semua keputusan signifikan: login, create goal, AI accept/reject |
| ai_recommendations | Input context + output LLM lengkap + status (pending/accepted/rejected) |

### Privacy-First Logging
- Prompt ke LLM hanya menyertakan user_id (bukan email/nama)
- Logs tidak menyimpan isi prompt atau response AI
- PII tidak pernah masuk ke audit_logs
- metadata di audit_logs bersifat structural, tidak berisi data sensitif

### Endpoint Health Check
```
GET /health → { status: "ok", timestamp: "..." }
```

## Alasan
1. **Pino**: Performa tinggi (2x lebih cepat dari Winston), format JSON standar
2. **request_id**: Kunci untuk melacak request dari awal sampai akhir
3. **prom-client**: Standar industri untuk metrics, integrasi Prometheus + Grafana
4. **Audit trail**: Diperlukan untuk debugging, compliance, dan tracking biaya AI
5. **Privacy-first**: Mencegah data pribadi bocor ke logs atau ke LLM provider

## Konsekuensi
- Pino log di console dalam format JSON (perlu pino-pretty untuk development)
- Metrics endpoint perlu diamankan (metricsAuth middleware)
- Storage untuk audit_logs bisa membesar — perlu cleanup policy
- request_id harus diteruskan ke error response untuk debugging
- Perlu keseimbangan antara log detail dan performa
