# ADR-009: Schema Validation & Input Security

## Status
Accepted

## Konteks
Aplikasi tidak memiliki middleware validasi terpusat. Route handler menggunakan inline `schema.parse()` dengan try/catch manual. Client-side Zod schema sudah ada tapi ditandai `@deprecated` dan tidak terhubung ke form. Tidak ada security headers. Validasi output LLM bersifat binary (lolos/gagal 422) tanpa membedakan pelanggaran yang masih bisa ditampilkan ke user.

## Keputusan

### Validasi Route & Middleware

1. **Zod-only** (bukan Joi) — 13 model file + 10 route call sudah di Zod; biaya migrasi tidak sebanding
2. **`validate()` middleware** (`server/src/middleware/validate.js`) dengan pola `next(err)` — `errorHandler.js` tetap single source of truth untuk error formatting
3. **`z.discriminatedUnion('action', [...])`** untuk coach payload — 10 branch action di `coachRequestSchema`
4. **Enum centralization** — 9 domain enum di `server/src/constants/enums.js`; `priority` tetap inline (`z.enum` di model)
5. **Client `zodResolver`** — auth pages only (`LoginPage.jsx`, `RegisterPage.jsx`); goal schema tidak dihubungkan (alur AI non-deterministik)
6. **`helmet()`** — CSP dikonfigurasi untuk Tailwind (`styleSrc: ['self', 'unsafe-inline']`)
7. **`taskId` di decide** — `z.string()` bukan UUID (format AI coach: `rec_<ts>_task_<n>`)
8. **Per-task validation** pada `acceptRecommendation` — `z.array(createTaskSchema).parse()` sebelum DB insert

### Validasi Output LLM (User-in-the-Loop)

9. **Recoverable vs Unrecoverable** — `duration_estimate` di luar range = recoverable (200 + warnings); missing fields = unrecoverable (422)
10. **Recoverable response** — `200` + `violations` array (selaras dengan RFC 7807 extension members, GraphQL `{ data, errors }`, Guardrails AI `OnFailAction.NOOP`)
11. **Skip retry untuk recoverable** — pipeline return awal dengan violations; tidak membuang API call
12. **Skip `applyBusinessRules` saat violations** — `duration_estimate` tidak reliable untuk rule engine
13. **Decide overrides** — user mengirim koreksi via `ViolationAdjustModal`, backend re-validates. Override hanya berlaku saat `decision = 'accepted'`
14. **Post-decide truncation sweep** — `_sweepExcessTasks()` di `dispatch.service.js`, running total O(1) per pop. Berbeda dengan `applyBusinessRules` di staging yang O(m) per iterasi
15. **Client violation UI** — amber badge pada task card, `ViolationAdjustModal` (adjust/skip/cancel), trimmed tasks notification banner
16. **Optimistic update + rollback** — client clear violation saat decide, restore via `violationMap` saat API gagal

## Alasan
- Binary pass/fail tidak cukup untuk multi-element response — 1 pelanggaran duration_estimate membuang seluruh plan yang valid
- User-in-the-loop selaras dengan praktik industri (RFC 7807, GraphQL, Guardrails AI)
- Defense in depth: 5 layer aktif (middleware → validateWithWarnings → retry loop → business rules → DB constraints)

## Konsekuensi
- Semua route handler baru harus menggunakan `validate()` middleware
- Enum baru → `constants/enums.js`; action coach baru → branch di `coachRequestSchema`
- Perubahan constraint durasi → update 3 file: `task.model.js`, `system-final.md`, `RECOVERABLE_FIELD_PREFIXES` di `validateWithWarnings`
- Client harus menampilkan badge peringatan + `ViolationAdjustModal` pada task yang melanggar
- Client harus menampilkan notifikasi trimmed tasks post-decide
- `validateWithWarnings` harus di-update jika ada field recoverable baru
