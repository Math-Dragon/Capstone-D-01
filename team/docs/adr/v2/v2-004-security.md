# ADR v2-004: Security Implementation untuk MVP

## Status
Diterapkan dengan catatan (gap teridentifikasi)

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

### 2. AI Prompt Sanitization — Defense in Depth (BELUM DITERAPKAN)
**Fungsi `sanitizeContext()` belum diimplementasikan.**

Saat ini, `context-builder.service.js` menyertakan objek `user` lengkap di dalam context:
```js
// context-builder.service.js — return value
{
  user,       // { id, email, password_hash, google_id, github_id, ... }
  profile,    // { timezone, availability, goal, subjects, ... }
  metrics,    // { streak_days, completion_rate_7d, ... }
  remainingTasksJson,
  chatHistory,
  ...
}
```

**Catatan penting:** Setelah verifikasi codebase, ditemukan bahwa **tidak ada template atau mock function yang mengakses `ctx.user`**. Ketujuh template di `templates.js` hanya menggunakan `ctx.profile`, `ctx.metrics`, `ctx.payload`, dan field pendukung lainnya — tidak ada yang mereferensi email, nama, atau field PII lainnya. Tiga mock function di `llm-mock.js` (`generateMockSuggestion`, `generateMockTaskAction`, `generateMockChat`) juga tidak mengakses `ctx.user`.

Dengan demikian, **prompt yang dikirim ke LLM saat ini tidak mengandung PII pengguna**.

**Mengapa tetap perlu `sanitizeContext()`?**
- `ctx.user` adalah **landmine** — field PII tersedia di objek context dan bisa bocor jika template baru tidak sengaja mereferensinya
- Prinsip *defense in depth*: data sensitif tidak boleh ada di objek yang dikirim ke fungsi eksternal, meskipun tidak dipakai
- Pencegahan lebih baik daripada deteksi — implementasi bersifat preventif, bukan korektif

**Rencana implementasi:** Tambahkan fungsi `sanitizeContext()` di `llm.js` yang menghapus field PII (`email`, `password_hash`, `google_id`, `github_id`) dari `ctx.user` sebelum context masuk ke template builder. Detail implementasi akan dibahas di task terpisah.

### 3. Rate Limiting — Diterapkan Sebagian

| Route | Limiter | Batas | Status |
|-------|---------|-------|--------|
| `/api/auth/*` | `authLimiter` | 5 req/min per IP | ✅ Aktif |
| `/api/ai/*` | `aiLimiter` | 20 req/min per user | ✅ Aktif |
| `/api/coach` (POST /) | `aiLimiter` | 20 req/min per user | ✅ Aktif |
| `/api/coach/*` (sub-routes) | — | — | ❌ Tidak ada |
| `/api/goals/*` | — | — | ❌ Tidak ada |
| `/api/tasks/*` | — | — | ❌ Tidak ada |
| `/api/progress/*` | — | — | ❌ Tidak ada |

Rate limiter menggunakan **Redis-backed store** dengan **fail-closed** behavior — jika Redis down, request gagal (tidak bypass limiter).

### 4. Helmet / CSP — Diterapkan
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
- **Positif:** Rate limiting aktif di endpoint termahal (AI) dan paling riskan (auth)
- **Positif:** CSP memblokir XSS dari inline scripts
- **Negatif:** `ctx.user` dengan field PII tersedia di object context — berisiko bocor jika template baru tidak sengaja mereferensinya (saat ini tidak ada template yang mengaksesnya)
- **Negatif:** `/api/goals`, `/api/tasks`, `/api/progress` tidak terproteksi rate limiter — rentan brute force
- **Negatif:** Coach sub-routes (history, audit, metrics) tidak terproteksi — rentan abuse

### Rencana Perbaikan

| Prioritas | Item | Rencana |
|-----------|------|---------|
| 🔴 Tinggi | PII sanitization (defense in depth) | Implementasi `sanitizeContext()` untuk hapus `email`, `password_hash`, `google_id`, `github_id` dari `ctx.user` sebelum template dipanggil |
| 🟡 Sedang | Rate limiter untuk /api/goals, /api/tasks, /api/progress | Tambahkan limiter umum (misal 60 req/min) |
| 🟢 Rendah | Circuit breaker untuk LLM API | Hentikan sementara panggilan AI jika gagal 3× dalam 5 menit |
| 🟢 Rendah | Cost tracking per user | Hitung estimasi biaya API berdasarkan token usage |
