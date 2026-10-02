# ADR v3-002: Penyimpanan dan Siklus Hidup Proposal Adaptif

## Status

**Accepted — diimplementasikan.** Keputusan penyimpanan dan siklus hidup sudah direalisasikan di kode; status disinkronkan pada 28 September 2026. Keputusan tidak berubah.

- Tanggal draft: 24 September 2026
- Tanggal sinkronisasi status: 28 September 2026
- Implementasi: `server/src/migrations/1700000000020_add-adaptive-proposals.js` (kolom aditif pada `ai_recommendations` + `plan_snapshots`), `server/src/services/adaptive-proposal.service.js`, `server/src/repositories/adaptive-proposal.repo.js`, `server/src/routes/adaptive.js` (4 endpoint), wired di `dispatch.service.js:315` dan `progress.service.js`. Verifikasi: `server/tests/unit/adaptive-proposal.test.js` — 10/10 test lulus (Jest).
- Cakupan: staging proposal adaptif pada backend v2, siklus hidup proposal, dan penerimaan yang aman terhadap perubahan rencana
- Keputusan induk: [ADR v3-001](./v3-001-adaptive-check-in-architecture.md) mewajibkan persetujuan pengguna sebelum adaptasi mengubah rencana

## Konteks

Coach saat ini mengirim output `crisis`, `milestone`, dan `adjustment` langsung ke `replacePlan()` (`team/server/src/services/coach/dispatch.service.js:303-307`). Method tersebut menghapus tugas aktif pada goal lalu menyimpan rencana pengganti dalam satu transaksi (`team/server/src/services/coach/response-formatter.service.js:167-211`). Perilaku ini melanggar batas HITL pada ADR v3-001.

Ada dua pilihan penyimpanan: memperluas `ai_recommendations` atau membuat tabel `adaptive_proposals`. Repository saat ini sudah memiliki:

- `ai_recommendations` dengan ownership user/goal, input/output JSON, status, serta timestamp (`team/server/src/migrations/1700000000000_initial-schema.js:54-66`);
- relasi audit untuk rekomendasi (`team/server/src/migrations/1700000000000_initial-schema.js:83-89`);
- pola penerimaan yang memakai row lock, transaksi, idempotensi pada status `accepted`, dan publikasi setelah commit (`team/server/src/services/ai.service.js:164-234`);
- penolakan transaksional yang belum memakai row lock dan validasi status terminal (`team/server/src/services/ai.service.js:237-255`); serta
- `plan_snapshots` yang menyimpan snapshot tugas, tetapi belum memiliki batas goal, hash kanonis, dan jenis snapshot eksplisit (`team/server/src/migrations/1700000000010_add_plan_snapshots.js:1-13`).

Proposal adaptif membutuhkan satu model publik yang sudah disanitasi, maksimal satu proposal `pending` per pengguna, masa berlaku, mekanisme penggantian proposal, penerimaan atomik, respons aman terhadap akses lintas pemilik, dan deteksi rencana yang berubah setelah proposal dibuat.

## Keputusan

### 1. Perluas `ai_recommendations`

`ai_recommendations` tetap menjadi storage utama untuk rekomendasi rencana awal dan proposal rencana adaptif. Baris adaptif menggunakan tipe khusus seperti `adaptive_plan` serta `adaptation_type` berupa `crisis`, `milestone`, atau `adjustment`.

Tambahkan kolom khusus proposal. Data siklus hidup tidak disimpan di dalam `output`.

| Kolom | Kegunaan |
| --- | --- |
| `adaptation_type` | Menandai asal adaptasi tanpa membebani status siklus hidup. |
| `evidence_summary jsonb` | Menyimpan maksimal tiga sinyal faktual yang sudah dinormalisasi. |
| `plan_diff jsonb` | Menyimpan perubahan `added`, `modified`, `removed`, dan `rescheduled` yang sudah divalidasi. |
| `base_plan_snapshot_id` | Foreign key ke kondisi rencana immutable yang digunakan saat membuat `plan_diff`. |
| `result_plan_snapshot_id` | Mencatat versi rencana setelah penerimaan berhasil. |
| `expires_at` | Menentukan batas waktu proposal `pending` dapat ditindaklanjuti. |
| `resolved_at` | Mencatat waktu transisi ke status terminal. |
| `resolution_idempotency_key` dan `resolution_result` | Menyimpan hasil terminal agar retry mengembalikan hasil pertama. |

`input_context` dan `output` tetap menjadi catatan internal proses generasi. API v2 tidak boleh mengekspose model database secara langsung.

### 2. Gunakan siklus hidup terminal yang ketat

Transisi yang diperbolehkan:

```text
pending -> accepted | rejected | expired | superseded
```

Status `accepted`, `rejected`, `expired`, dan `superseded` bersifat terminal. Enum aplikasi yang saat ini hanya berisi `pending`, `accepted`, dan `rejected` harus diperluas (`team/server/src/constants/enums.js:20`).

Partial unique index memastikan hanya ada satu proposal adaptif `pending` per pengguna. Saat membuat proposal, transaksi mengambil row lock pada serialization row user/goal, mengubah proposal adaptif `pending` sebelumnya menjadi `superseded`, lalu menyimpan proposal baru. Index database menjadi pelindung terakhir terhadap race condition. Rekomendasi rencana awal tidak termasuk dalam partial unique index tersebut.

Masa berlaku ditentukan oleh `expires_at`. Pencarian proposal `pending` mengecualikan baris yang kedaluwarsa atau `superseded`. Detail proposal kedaluwarsa milik pengguna mengembalikan HTTP 410 dengan kode error `PROPOSAL_EXPIRED`. ID yang tidak ada dan ID milik pengguna lain sama-sama mengembalikan HTTP 404 dengan kode error `NOT_FOUND`.

### 3. Gunakan `plan_snapshots.id` sebagai versi rencana publik

`base_plan_version` adalah UUID snapshot yang opaque bagi client. Tambahkan `goal_id`, `snapshot_kind`, dan `plan_hash` ke `plan_snapshots`. Snapshot dasar proposal dan hasil penerimaan bersifat immutable. Flow undo lama tidak boleh menghapus kedua jenis snapshot tersebut; saat ini flow tersebut menghapus snapshot terbaru (`team/server/src/services/coach/response-formatter.service.js:128-164`).

Hash kanonis hanya mencakup kolom rencana tersimpan yang digunakan oleh `plan_diff`, dengan urutan task yang deterministik. Timestamp dan metadata yang tidak terkait dikecualikan. UUID mengidentifikasi snapshot dasar, sedangkan hash mendeteksi perubahan, penambahan, atau penghapusan tugas setelah proposal dibuat.

Setiap code path yang mengubah rencana harus mengambil stable serialization lock untuk user/goal yang sama. Tanpa lock bersama, penyimpanan task baru dapat berlangsung bersamaan dengan stale check walaupun baris tugas lama sudah dikunci.

### 4. Penerimaan bersifat atomik dan aman terhadap perubahan rencana

Transaksi penerimaan harus:

1. Mengambil proposal milik pengguna dengan `FOR UPDATE`, lalu menangani status terminal dan retry yang idempoten.
2. Memastikan `base_plan_version` pada request sama dengan `base_plan_snapshot_id`.
3. Mengambil stable serialization lock untuk goal/plan, lalu mengambil snapshot dasar.
4. Menghitung ulang hash kanonis rencana aktif. Jika berbeda, lakukan rollback dan kembalikan HTTP 409 dengan kode error `PROPOSAL_STALE`.
5. Memvalidasi dan menerapkan seluruh `plan_diff` yang tersimpan.
6. Membuat snapshot hasil, mengubah status proposal menjadi `accepted`, menyimpan hasil untuk retry, menambah anggaran adaptasi mingguan satu kali, dan menulis data audit struktural.
7. Menyelesaikan commit sebelum invalidasi cache, webhook, atau publikasi eksternal lain.

Tidak ada perubahan task, goal, status, anggaran, atau audit yang bertahan jika penerimaan gagal atau proposal sudah stale. Penerimaan per perubahan atau per task berada di luar cakupan MVP.

Penolakan juga mengambil row lock pada proposal serta menulis status terminal, hasil idempotensi, dan audit struktural dalam satu transaksi. Penolakan tidak mengubah rencana. Race antara accept dan reject hanya dapat menghasilkan satu status terminal.

### 5. Tempatkan adapter tersanitasi di depan penyimpanan

Endpoint berikut bekerja melalui service dan mapper proposal adaptif:

```text
GET  /api/adaptive/proposals/pending
GET  /api/adaptive/proposals/:id
POST /api/adaptive/proposals/:id/accept
POST /api/adaptive/proposals/:id/reject
```

Endpoint lama `/api/ai/recommendations/*` tetap kompatibel selama migrasi.

Mapper hanya mengizinkan `id`, `status`, `summary`, evidence yang sudah disanitasi, perubahan rencana, aksi yang tersedia, timestamp, dan versi dasar. Evidence service menghasilkan sinyal berbentuk `{ code, summary, window, count }` (`team/server/src/services/progress-evidence.service.js:25-65`) dan mapper membatasinya maksimal tiga item.

Mapper tidak mengekspose `input_context`, `output` mentah, reasoning LLM, percakapan, catatan mentah, atau metadata audit internal.

### Kontrak frontend untuk resolusi proposal

Dashboard, Progress, dan Coach menggunakan satu resource proposal berdasarkan ID dari server. Pada pembukaan aplikasi dan setelah mutasi rencana, frontend memuat ulang `GET /api/adaptive/proposals/pending`; detail dibaca melalui `GET /api/adaptive/proposals/:id`. Cache lokal boleh membantu tampilan, tetapi `localStorage` tidak menjadi sumber status `pending` atau sumber plan yang dikirim kembali untuk diterapkan.

Overlay detail menampilkan `summary`, evidence tersanitasi, `plan_diff`, `expires_at`, dan aksi yang diizinkan mapper. Menutup overlay tidak mengubah status. Tombol tolak memanggil endpoint reject dan meminta konfirmasi bila diperlukan oleh UX; tombol terima mengirim `base_plan_version` dan kunci idempotensi yang stabil untuk retry aksi yang sama. Kedua tombol hanya aktif ketika status terbaru `pending`. Frontend tidak boleh menyusun ulang `plan_diff` atau mengirim seluruh plan sebagai payload penerimaan.

Kontrak request yang harus disepakati saat endpoint dibuat: `POST .../:id/accept` menerima `{ base_plan_version, idempotency_key }`; `POST .../:id/reject` menerima `{ idempotency_key }`. `idempotency_key` dibuat sekali untuk satu keputusan pengguna dan dipakai ulang saat retry, bukan dibuat ulang setiap klik. Nilai `base_plan_version` berasal dari detail proposal server, bukan dari hash atau ID task yang dihitung client.

| Respons | Perilaku frontend |
| --- | --- |
| Sukses terima/tolak, termasuk replay idempoten | Tutup detail setelah hasil terkonfirmasi, kosongkan proposal `pending`, lalu muat ulang tugas dan ringkasan Progress. |
| `409 PROPOSAL_STALE` | Jangan tampilkan sukses; muat ulang proposal dan rencana, jelaskan bahwa rencana berubah, lalu minta keputusan baru bila backend menyediakan proposal baru. |
| `410 PROPOSAL_EXPIRED` | Hapus aksi terima/tolak dari tampilan, jelaskan bahwa masa berlaku habis, lalu muat ulang daftar `pending`. |
| `404 NOT_FOUND` | Tutup detail yang tidak lagi tersedia dan muat ulang daftar `pending` tanpa membocorkan kepemilikan ID. |
| Gagal jaringan | Pertahankan detail dan ID aksi untuk retry; jangan menganggap proposal telah ditolak atau diterima. |

Implementasi lama di `team/client/src/hooks/useTaskActions.js` menyimpan `pendingProposal` dalam `localStorage`, menerima dengan mengirim seluruh plan ke aksi Coach `ACCEPT_PROPOSAL`, dan menolak dengan menghapus state lokal. `team/client/src/components/ProposalOverlay.jsx` juga memanggil `onReject` saat overlay ditutup. Alur ini perlu dimigrasikan ketika API proposal tersedia; proposal adaptif yang persisten tidak dapat mengandalkan penolakan lokal atau aksi saat menutup dialog. Rincian permukaan Dashboard, Progress, dan Coach ada di [ADR v3-001](./v3-001-adaptive-check-in-architecture.md#implementasi-frontend-adaptive-learning-progress).

### 6. Terapkan guardrail sebelum proposal dibuat

Penyimpanan proposal berada setelah routing yang ditetapkan ADR v3-001. Implementasi memperluas trigger evaluator yang ada, bukan membuat policy paralel. Evaluator saat ini sudah memuat prioritas trigger dan cooldown 24 jam per trigger (`team/server/src/services/adaptation-trigger.service.js:1-39`).

Sebelum memanggil LLM atau menyimpan proposal, evaluator juga harus memeriksa ambang evidence, cooldown LLM 48 sampai 72 jam, actionability, jalur static/rule-first, dan anggaran adaptasi mingguan. Anggaran hanya menghitung proposal yang diterima dan berhasil di-commit.

## Konsekuensi

### Positif

- Satu aggregate rekomendasi menangani kepemilikan, relasi audit, siklus hidup, dan resolusi transaksional.
- Pola penerimaan yang sudah ada dapat diperkuat tanpa diduplikasi.
- Partial unique index melindungi aturan satu proposal `pending` dari race condition.
- UUID snapshot menjaga kontrak publik tetap opaque, sedangkan hash kanonis mendeteksi perubahan rencana setelah proposal dibuat.
- Adapter mencegah JSON internal lama bocor ke Dashboard, Progress, atau Coach.

### Negatif dan trade-off

- `ai_recommendations` menjadi aggregate yang lebih luas dan memerlukan kolom nullable khusus proposal serta validasi berbasis tipe.
- Metrik yang mengasumsikan setiap `output.tasks[]` memiliki status perlu mengecualikan atau memahami baris adaptif (`team/server/src/repositories/ai-recommendation.repo.js:50-105`).
- `plan_snapshots` harus membedakan versi proposal immutable dari snapshot undo yang dapat dihapus.
- Semua jalur penulisan rencana harus menggunakan stable serialization lock yang sama. Penerapan parsial tetap menyisakan race condition pada pemeriksaan perubahan.
- Perilaku reject lama harus diperketat agar mengikuti row lock dan aturan status terminal yang sama dengan accept.

### Alternatif yang ditolak: tabel `adaptive_proposals`

Tabel baru memberi nullability yang lebih bersih, tetapi menduplikasi query kepemilikan, transisi status, relasi audit, idempotensi, dan resolusi transaksional yang sudah berpusat pada `ai_recommendations`.

Pemisahan tabel dapat dipertimbangkan kembali jika proposal adaptif kelak membutuhkan retensi, kontrol akses, atau karakteristik volume yang tidak dapat ditangani oleh index dan policy berbasis tipe.

## Keputusan terkait

| Dokumen | Hubungan |
| --- | --- |
| [ADR v3-001: Arsitektur Adaptive Check-In](./v3-001-adaptive-check-in-architecture.md) | Mengatur routing static/rule-first, evidence, cooldown, anggaran, observability, dan HITL wajib. |
| [ADR-007: AI Coach with Human-in-the-Loop](../007-ai-coach-hitl.md) | Mendokumentasikan perilaku Coach lama serta celah auto-persist yang digantikan oleh keputusan v3. |
