# ADR v2-004: Security Implementation untuk MVP

## Status
Diterapkan — PII sanitization dan rate limiting selesai

## Konteks
Dengan bertambahnya endpoint baru (kalender, reschedule, progress tracking) dan interaksi AI via Coach, attack surface aplikasi bertambah. Tiga area kritis:

1. **Input validation** — semua endpoint baru harus divalidasi
2. **AI prompt sanitization** — pastikan tidak ada PII yang bocor ke LLM
3. **Rate limiting** — aktif dan fungsional untuk endpoint kritis

## Keputusan

### 1. Input Validation — Diterapkan
**Zod validation middleware** di semua endpoint. Detail lengkap di ADR-009.

- Middleware `validate()` menerima skema Zod untuk `body`, `query`, `params`
- Error ZodError dikembalikan sebagai 400 dengan detail array
- 18 endpoint diproteksi dengan skema spesifik — dari auth, goals, tasks, progress hingga 12 action di coach

### 2. AI Prompt Sanitization — Defense in Depth ✅ DITERAPKAN
**Fungsi `sanitizeContext()` telah diimplementasikan di `server/src/services/llm.js`.**

Fungsi ini menghapus field PII secara rekursif: `email`, `password_hash`, `google_id`, `github_id`, `name`, `phone`.

Diterapkan di `llm-pipeline.service.js` pada `_buildUserMessage()` — context disanitasi sebelum masuk ke template builder, sehingga template hanya menerima data non-PII.

**Detail teknis:**
- Fungsi bekerja secara rekursif pada nested object dan array
- Hanya field dalam `PII_FIELDS` yang dihapus — struktur data tetap utuh
- Nilai primitif non-objek dikembalikan apa adanya
- 6 test unit mencakup: removal top-level, nested, array, preservasi non-PII, null/empty, dan primitive passthrough

### 3. Rate Limiting — Diterapkan

| Route | Limiter | Batas | Status |
|-------|---------|-------|--------|
| `/api/auth/*` | `authLimiter` | 5 req/min per IP | ✅ Aktif |
| `/api/ai/*` | `aiLimiter` | 20 req/min per user | ✅ Aktif |
| `/api/coach` (POST /) | `aiLimiter` | 20 req/min per user | ✅ Aktif |
| `/api/coach/*` (sub-routes) | `generalLimiter` | 60 req/min per user | ✅ Aktif |
| `/api/goals/*` | `generalLimiter` | 60 req/min per user | ✅ Aktif |
| `/api/tasks/*` | `generalLimiter` | 60 req/min per user | ✅ Aktif |
| `/api/progress/*` | `generalLimiter` | 60 req/min per user | ✅ Aktif |

Rate limiter menggunakan **Redis-backed store** dengan **fail-closed** behavior — jika Redis down, request gagal (tidak bypass limiter).

### 4. Circuit Breaker LLM — Diterapkan
Circuit breaker untuk LLM API sudah ada di `server/src/services/llm-client.js`:

- **Mekanisme:** Setiap provider (`gemini`, `geminiPaid`, `glm`, `openrouter`) memiliki cooldown flag
- **Trigger:** Jika provider mengembalikan HTTP 429 (rate limited oleh pihak ketiga), circuit breaker aktif selama 60 detik
- **Behavior saat aktif:** Provider dilewati, request otomatis fallback ke provider berikutnya dalam daftar
- **Logging:** Setiap aktivasi tercatat sebagai `'Circuit breaker active — skipping'`
- **Fallback chain:** `gemini` → `geminiPaid` → `glm` → `openrouter`

### 5. Helmet / CSP — Diterapkan
```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https:", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));
```
- `script-src: 'self'` — memblokir inline scripts (keamanan baik)
- `style-src: 'unsafe-inline'` — diperlukan untuk Tailwind CSS
- `connect-src` tidak di-set — mewarisi `default-src: 'self'` sehingga hanya allow same-origin XHR/fetch

## Konsekuensi
- **Positif:** 100% endpoint divalidasi dengan Zod
- **Positif:** Rate limiting aktif di semua endpoint API — 3 tier: auth (5/min), AI (20/min), general (60/min)
- **Positif:** PII sanitization sebagai defense in depth — field sensitif dihapus sebelum context masuk template
- **Positif:** CSP memblokir XSS dari inline scripts

### Rencana Perbaikan

| Prioritas | Item | Rencana |
|-----------|------|---------|
| 🟢 Selesai | PII sanitization (defense in depth) | ✅ `sanitizeContext()` di llm.js, diterapkan di `_buildUserMessage()`, 6 test unit |
| 🟢 Selesai | Rate limiter untuk /api/goals, /api/tasks, /api/progress | ✅ `generalLimiter` 60 req/min |
| 🟢 Selesai | Rate limiter untuk coach sub-routes | ✅ `generalLimiter` 60 req/min |
| 🟢 Selesai | Circuit breaker LLM API | ✅ Sudah ada di `llm-client.js` — cooldown 60s per-provider, auto fallback |
| 🟢 Rendah | Cost tracking per user | Hitung estimasi biaya API berdasarkan token usage |
