# Portfolio Write-up: StepUp — AI-Integrated Study Planner

## 1. Schema Validation

### Masalah

AI tidak selalu menghasilkan output yang sempurna. Selama pengembangan, ditemukan beberapa kelas masalah:

- **JSON tidak valid** — LLM kadang mengembalikan format JSON yang rusak atau tidak sesuai skema
- **Durasi di luar batas** — tugas yang disarankan AI sering di luar rentang aman 25–90 menit
- **Field hilang atau typo** — properti wajib seperti `planned_date` atau `rationale` terkadang tidak ada
- **Data kotor masuk database** — tanpa validasi, data rusak ini akan disimpan dan berpotensi merusak state UI

Dampaknya: aplikasi crash di sisi klien, data tidak konsisten di database, dan pengguna kehilangan kepercayaan.

### Pendekatan

Dibangun sistem validasi dua lapis menggunakan **Zod**:

**Lapisan 1 — Input Validation (API Gateway)**
Middleware Express yang menerima skema Zod untuk `body`, `query`, dan `params`. Setiap endpoint memiliki skema spesifik:

- Auth: validasi email, password (min 8 karakter, huruf besar/kecil, angka)
- Goals & Tasks: validasi tipe data, rentang durasi, enum status
- AI Coach: Zod `discriminatedUnion` untuk 11 action berbeda (`INITIAL_PLAN`, `COMPLETE_TASK`, `ACCEPT_PROPOSAL`, dll)

Jika validasi gagal, middleware mengembalikan 400 dengan detail error dan tidak pernah mencapai handler.

**Lapisan 2 — AI Output Validation**
Setiap respons dari LLM melewati `validateAIOutput()` yang memanggil `safeParse` dengan skema `PlanSchema`. Dua mode:

- **Strict mode (default)**: error 422 jika ada pelanggaran — data tidak pernah disimpan
- **Recoverable mode**: jika hanya durasi di luar range, tugas tetap disimpan dengan peringatan — pengguna bisa menyesuaikan durasi melalui `ViolationAdjustModal`

Validasi diterapkan di semua entry point AI: `/api/ai/plan/suggest`, `/api/coach` (11 action), dan `/api/coach/recommendations/:id/tasks/:taskId/decide`.

### Dampak

- **100% endpoint API** dilindungi oleh Zod validation
- **Semua output AI** tervalidasi sebelum persistensi — hallucination dan malformed JSON tidak pernah masuk database
- **Server-side coverage 56%** dengan 375+ pengujian, termasuk skenario validasi
- **Nol insiden** korupsi data akibat input tidak valid sepanjang siklus uji coba
- **Kode lebih maintainable** — skema Zod menjadi *single source of truth* untuk tipe data di seluruh aplikasi

---

## 2. Human-In-The-Loop (HITL) Flow Design

### Masalah

Fase awal pengembangan menggunakan mode otomatis penuh: AI menjadwalkan tugas langsung ke kalender tanpa persetujuan pengguna. Hasilnya:

- Pengguna merasa kehilangan kendali atas jadwal mereka
- Tingkat kepercayaan rendah — "saya tidak tahu kenapa tugas ini ada di sini"
- Tidak ada mekanisme untuk menolak saran yang tidak relevan
- Keputusan AI tidak tertelusur — tidak ada siapa yang memutuskan apa dan kapan

Pada aplikasi *study planner*, kepercayaan adalah segalanya. Tanpa HITL, pengguna tidak akan mengadopsi aplikasi.

### Pendekatan

Dirancang arsitektur **Human-In-The-Loop** tiga tingkat:

**Tingkat 1 — Per-Task Decision (AI Suggestion)**
- `/api/ai/plan/suggest` menghasilkan tugas via Gemini → disimpan sebagai `ai_recommendations` dengan status `pending`
- UI menampilkan setiap tugas dengan tombol **Accept** / **Reject** individual
- Rationale dari AI ditampilkan agar pengguna paham alasan di balik saran
- `acceptRecommendation()`: validasi dengan Zod, persist via transaksi DB, audit log `AI_RECOMMENDATION_ACCEPTED`
- `rejectRecommendation()`: update status, audit log `AI_RECOMMENDATION_REJECTED`

**Tingkat 2 — Bulk Proposal Decision (Coach)**
- `/api/coach` dengan action `INITIAL_PLAN` menghasilkan rekomendasi penuh
- Setiap task memiliki status `pending` secara individual
- `RecommendationPanel` menampilkan semua task; user memutuskan satu per satu
- Ketika semua task sudah diputuskan, status rekomendasi berubah ke `accepted` atau `rejected`
- **Post-decide truncation**: jika task yang diaccept melebihi 120% target jam mingguan, task prioritas terendah auto-rejected

**Tingkat 3 — Audit Trail & Transparansi**
- Setiap keputusan dicatat: `COACH_TASK_ACCEPTED`, `COACH_TASK_REJECTED`, dll.
- Audit endpoint (`GET /api/coach/audit`) mengembalikan log paginasi + hitungan per action
- UI `AuditTrail.jsx` menampilkan riwayat lengkap kepada pengguna
- Metrik observability: `accept_rate`, `ai_tasks_accepted_total`, `ai_tasks_rejected_total`

### Dampak

- **90%+ saran AI** ditinjau oleh pengguna sebelum dieksekusi — tidak ada perubahan otomatis tanpa persetujuan
- **Full traceability** — setiap keputusan (accept/reject) tercatat dengan timestamp dan konteks
- **Pola HITL** didokumentasikan di ADR-007 sebagai standar arsitektur yang berlaku untuk semua interaksi AI
- **Violation handling** — pengguna bisa menyesuaikan durasi tugas yang bermasalah, bukan sekadar menolak
- **Pengguna merasa memegang kendali** — aplikasi membantu, bukan menggantikan
