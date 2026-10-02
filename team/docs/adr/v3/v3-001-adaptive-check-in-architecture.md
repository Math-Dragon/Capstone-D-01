# ADR v3-001: Arsitektur Adaptive Check-In

## Status

Draft. Keputusan arsitektur utama sudah konsisten. Detail observability dan UI HITL melengkapi implementasi tanpa mengubah keputusan utama.

- Tanggal draft awal: 13 Juli 2026
- Cakupan: arsitektur Adaptive Check-In dan evolusi menuju Adaptive Learning Coach

## Konteks

StepUp adalah learning assistant berbasis LLM yang saat ini berfungsi sebagai AI planner sederhana. Arah produk berikutnya adalah Adaptive Learning Coach pada v2 dan Reflective Learning Companion pada v3.

`CHECK_IN` merupakan interaksi harian berfrekuensi tinggi. Posisinya menentukan apakah check-in hanya menjadi pulse ringan atau ikut menjadi sinyal adaptif. Codebase masih menyimpan sisa desain adaptif berupa gate branch dan template LLM yang tidak aktif, sehingga batas arsitekturnya perlu dikunci.

Keputusan ini merangkum hasil riset adaptive learning, audit telemetry, desain event store, desain check-out, dan desain LLM gating. Dokumen ini menjadi acuan untuk routing, guardrail, observability, serta persetujuan pengguna sebelum perubahan rencana.

## Keputusan

### 1. `CHECK_IN` static-by-design untuk v1

Check-in pada versi saat ini menggunakan respons statis. Dispatcher mengarahkan `CHECK_IN` langsung ke static response tanpa melalui gate LLM.

Alasannya:

- Interaksi berlangsung setiap hari dan berfrekuensi tinggi.
- Mood sesaat terlalu lemah untuk menjadi dasar perubahan rencana.
- Respons statis lebih murah, cepat, deterministik, dan aman.
- Check-in berbasis LLM membutuhkan mood history, check-out, segmentasi, dan cooldown yang belum matang.

### 2. Arah produk adalah Adaptive Learning Coach

Check-in dan check-out menjadi event telemetry yang masuk ke personalization engine dengan guardrail ketat.

```text
CHECK_IN / CHECK_OUT / TASK_EVENT
  -> signal store
  -> evidence summary
  -> severity classification
  -> guardrail decision
  -> static / rule-based / LLM path
  -> HITL approval jika adaptasi rencana
```

### 3. `check_in_events` menjadi event store historis

Tabel domain `check_in_events` menyimpan fakta historis. `student_metrics` tetap menjadi snapshot atau cache turunan terbaru.

```text
check_in_events = historical facts (event source)
student_metrics = latest summary / derived metrics (cache)
```

Jenis event untuk MVP adalah `submitted`, `skipped`, dan `checkout_submitted`.

### 4. Check-out disimpan di `check_in_events`

Check-out atau session reflection disimpan sebagai `checkout_submitted` pada tabel yang sama. MVP tidak menggunakan tabel `reflection_sessions` terpisah.

Pemicu check-out pada MVP adalah tugas selesai, feedback dikirim, tugas dilewati berulang kali, atau pengguna membuka refleksi secara manual. Sistem membatasi prompt check-out maksimal satu kali per pengguna per hari untuk mengurangi fatigue.

### 5. Sistem menggunakan empat tingkat severity

| Tingkat | Respons |
| --- | --- |
| Green | Observability atau milestone berbasis aturan. |
| Yellow | Nudge atau tips berbasis aturan. |
| Orange | Penyesuaian berbasis aturan atau insight LLM dengan HITL. |
| Red | Rekomendasi LLM dengan HITL wajib. |

### 6. LLM memerlukan ambang evidence

LLM baru dapat dipertimbangkan setelah ada sedikitnya dua sinyal yang konsisten dalam rentang tiga sampai tujuh hari. Evidence harus memenuhi dimensi jumlah, konsistensi, kebaruan, dan actionability. Satu mood atau satu check-out tidak boleh langsung memicu perencanaan ulang.

### 7. Guardrail berlaku sebelum pemanggilan LLM

| Guardrail | Keputusan |
| --- | --- |
| Cooldown per pemicu | 24 jam. |
| Cooldown khusus LLM | 48 sampai 72 jam. |
| Anggaran adaptasi | Maksimal tiga perencanaan ulang yang diterima per pengguna per minggu. |
| Pemeriksaan actionability | Jangan panggil LLM jika tidak ada tugas yang dapat disesuaikan. |
| Static-first fallback | Gunakan aturan untuk kasus sederhana. |
| HITL | Semua adaptasi rencana memerlukan persetujuan pengguna. |

Anggaran adaptasi dihitung saat perubahan diterima dan berhasil disimpan, bukan saat proposal dibuat.

### 8. Jalur berbasis aturan didahulukan

Kasus Yellow ditangani dengan aturan. Kasus Orange mencoba aturan terlebih dahulu dan menggunakan LLM hanya jika tidak ada aturan yang cocok. Kasus Red dapat langsung mempertimbangkan LLM setelah seluruh guardrail terpenuhi.

### 9. Semua adaptasi rencana menggunakan HITL

Output LLM menjadi proposal berstatus `pending`. Rencana hanya berubah setelah pengguna menerima proposal secara eksplisit. Jalur `adjustment`, `crisis`, dan `milestone` tidak boleh mengganti rencana secara otomatis.

### 10. Observability dirancang sejak awal

Setiap keputusan routing mencatat data struktural yang diperlukan untuk audit: tingkat severity, kode dan jumlah evidence, alasan LLM dilewati, aturan yang digunakan, hasil guardrail, jalur yang dipilih, serta penggunaan anggaran adaptasi.

Log tidak boleh menyimpan raw reflection note, percakapan, prompt lengkap, reasoning LLM, atau output LLM mentah.

### 11. Batas information architecture

| Area | Keputusan | Implikasi |
| --- | --- | --- |
| Dashboard | Analytical overview dan decision hub. | Hanya menampilkan ringkasan, sinyal perhatian, teaser proposal, dan aksi menuju detail. |
| Progress | Analytical deep-dive serta control surface. | Menjadi tempat tren, evidence log, riwayat check-in/check-out, koreksi, penghapusan, dan pintasan privasi. |
| Tab Progress MVP | Menggunakan `Tren` dan `Riwayat`. | Evidence Log berada di tab `Tren`; istilah `Ringkasan` tidak dipakai agar tidak tumpang tindih dengan Dashboard. |
| Settings/Privacy | Overlay dari avatar/header dan pintasan dari riwayat Progress. | Tidak menambah item bottom navigation; route `/settings` yang sudah ada tetap dapat diakses selama migrasi. |
| Proposal adaptif | Shared flow antara Dashboard, Progress, dan Coach. | Semua entry point membuka proposal `pending` yang sama. |

Dashboard hanya memberi orientasi singkat. Evidence dan alasan lengkap tetap berada di Progress atau overlay proposal. Evidence yang tampil kepada pengguna harus berupa ringkasan sinyal yang sudah disanitasi.

`check_in_events` tetap menjadi source of truth untuk riwayat domain. `audit_logs` tetap menjadi control-plane observability dan bukan domain history store.

## Implementasi frontend: Adaptive Learning Progress

Bagian ini adalah kontrak implementasi yang direncanakan, bukan pernyataan bahwa UI adaptif sudah tersedia. Audit kode per 26 September 2026 menunjukkan kondisi berikut:

| Area | Kondisi saat ini | Pekerjaan frontend |
| --- | --- | --- |
| Dashboard | Mengambil `/tasks` dan `/goals`; belum mengambil overview atau proposal adaptif. | Tampilkan ringkasan periode, sinyal perhatian yang sudah disanitasi, dan satu teaser proposal `pending` yang membuka detail bersama. |
| Progress | `ProgressPage.jsx` mengambil `/tasks` dan `/progress/stats`; belum punya tab, riwayat, atau evidence log. | Tambahkan tab `Tren` dan `Riwayat` pada route `/progress` yang sudah ada. |
| Check-in | `CheckInGateway.jsx` memakai `lastCheckIn` di `localStorage` dan mengirim `CHECK_IN` ke Coach. | Sinkronkan status harian dengan server, kirim event domain dengan ID idempoten, dan tampilkan hasil simpan atau gagal secara jelas. |
| Proposal | `ProposalOverlay.jsx` dan `useTaskActions.js` memakai plan dari aksi tugas serta `pendingProposal` di `localStorage`. | Gunakan proposal tersimpan dari server dan alur HITL bersama sesuai ADR v3-002. |
| Privasi | Aplikasi sudah memiliki route `/settings` untuk akun dan keamanan. | Sediakan akses privasi riwayat dari header dan Progress; putuskan navigasi/overlay dengan mempertahankan akses route lama selama migrasi. |

### Permukaan dan alur data

1. **Dashboard:** ambil `GET /api/progress/overview?period=7d` untuk ringkasan. Tampilkan periode dan zona waktu dari respons agar angka tidak dibaca sebagai progres sepanjang masa. Jika ada proposal `pending`, ambil identitas dan statusnya dari endpoint proposal ADR v3-002, lalu buka detail dengan ID yang sama. `pending_proposal` pada overview saat ini masih `null`, sehingga teaser tidak boleh dianggap aktif sebelum backend mengisinya atau frontend mengambil endpoint proposal terpisah.
2. **Progress / Tren:** gunakan `GET /api/progress/overview?period=7d|30d|all` untuk angka, aktivitas, distribusi, dan strategi Coach. Evidence Log hanya menampilkan sinyal faktual yang telah disanitasi. Respons overview saat ini hanya menyediakan `evidence.available` dan `evidence.signal_count`; daftar sinyal, jendela waktu, dan penjelasan belum tersedia pada endpoint itu. UI evidence lengkap menunggu kontrak baca tersanitasi dari backend dan tidak boleh merekonstruksi evidence dari catatan mentah atau `audit_logs`.
3. **Progress / Riwayat:** gunakan `GET /api/progress/history?filter=...&limit=...&cursor=...` untuk daftar berpaginasi dan `GET /api/progress/history/:id` untuk detail. Filter mengikuti kontrak server: `all`, `check_in`, `check_out`, `skipped`, `corrected`. Detail boleh memperlihatkan catatan milik pengguna; daftar dan teaser Dashboard tetap ringkas. Aksi koreksi mengirim field yang berubah bersama `version` ke `PATCH /api/progress/history/:id`; konflik 409 meminta pengguna memuat ulang detail. Aksi hapus meminta konfirmasi lalu memanggil `DELETE /api/progress/history/:id`. Setelah mutasi berhasil, muat ulang riwayat dan overview.
4. **Check-in dan check-out:** `POST /api/progress/events` menerima `client_event_id` UUID agar retry tidak menggandakan event. `submitted` memerlukan mood; `skipped` tidak boleh menyertakan mood atau note; `checkout_submitted` memerlukan minimal satu refleksi. Frontend perlu menyelaraskan submit event domain dengan respons Coach statis supaya satu aksi pengguna tidak menghasilkan dua catatan. Penutupan gateway setelah gagal simpan dan penanda harian di `localStorage` saat ini perlu diganti dengan status server sebelum riwayat digunakan sebagai sumber kebenaran. Endpoint status harian belum tersedia; backend perlu menyediakan status check-in hari ini atau kontrak lain yang efisien agar gateway tidak menebaknya dari halaman pertama riwayat. Pemetaan mood UI juga harus mengikuti enum server: UI saat ini mengirim `down`, sedangkan event API menerima `struggling` atau `overwhelmed`.
5. **Proposal adaptif:** Dashboard, Progress, dan Coach membuka satu detail proposal berdasarkan ID server. Detail menampilkan ringkasan, maksimal tiga evidence tersanitasi, dan perubahan `added`, `modified`, `removed`, serta `rescheduled`. Tutup overlay hanya menutup tampilan; penolakan harus memakai aksi `reject` eksplisit. Penerimaan harus mengirim versi dasar dan kunci idempotensi sesuai ADR v3-002. Setelah sukses, muat ulang tugas, overview, dan proposal `pending`.

Setiap permukaan memiliki keadaan loading, kosong, gagal, dan sukses yang berbeda. Riwayat kosong tidak boleh menyiratkan tidak ada progres tugas. Kegagalan jaringan tidak boleh ditafsirkan sebagai tidak ada proposal. Aksi koreksi, hapus, terima, dan tolak dinonaktifkan selama request berlangsung; status hasil diumumkan secara aksesibel. Tab, dialog, filter, dan konfirmasi harus dapat dioperasikan dengan keyboard serta tetap terbaca pada layar kecil.

### Batas implementasi dan verifikasi

- API progress untuk overview, event, history, detail, koreksi, dan hapus sudah ada. Frontend belum menggunakannya, kecuali endpoint lama `/progress/stats`. Kontrak status check-in harian dan daftar Evidence Log tersanitasi masih perlu disediakan.
- API proposal pada ADR v3-002 masih rancangan. Jangan mengganti proposal lokal dengan panggilan endpoint baru sebelum mapper, status, stale check, dan idempotensi tersedia di backend.
- Selesaikan verifikasi alur: check-in submit/skip dan retry; Tren untuk `7d`, `30d`, `all`; paginasi/filter Riwayat; koreksi konflik 409; penghapusan; proposal diterima/ditolak/kedaluwarsa/stale; sinkronisasi lintas Dashboard, Progress, Coach setelah reload; serta empty, loading, error, keyboard, dan mobile.

## Konsekuensi

### Positif

- Batas antara pengguna, aplikasi, dan LLM menjadi jelas.
- Mood atau check-in tunggal tidak langsung memicu LLM.
- Jalur berbasis aturan menekan biaya dan latensi untuk kasus umum.
- Cooldown, ambang evidence, dan anggaran adaptasi mencegah over-triggering serta plan churn.
- HITL menjaga kendali pengguna atas perubahan rencana.
- Dashboard, Progress, dan Coach menggunakan proposal yang sama tanpa menduplikasi state.

### Negatif dan trade-off

- AI belum menafsirkan mood per sesi secara mendalam pada v1.
- Mood hanya menjadi sinyal ringan, bukan reasoning context mandiri.
- Classifier, evidence evaluator, guardrail, dan lifecycle proposal menambah kompleksitas implementasi.
- UI perlu menjelaskan evidence, perubahan rencana, serta aksi terima atau tolak dengan jelas.
- Observability harus berguna untuk audit tanpa membocorkan data refleksi atau output model mentah.

## Area terdampak

| Area | Dampak |
| --- | --- |
| Coach orchestration | Dispatcher memahami severity dan tidak melakukan auto-mutation untuk adaptasi. |
| Gate service | Menjalankan ambang evidence, cooldown, actionability, routing, dan anggaran adaptasi. |
| Static response | `respondCheckIn()` tetap menjadi perilaku default v1. |
| LLM template | Template check-in perlu ditinjau sebelum jalur adaptif diaktifkan. |
| `check_in_events` | Menjadi riwayat check-in dan check-out. |
| `student_metrics` | Tetap menjadi cache turunan untuk metrik terbaru. |
| Audit | Menyimpan keputusan routing dan status proposal dalam bentuk struktural. |
| UI | Menyediakan consent, history, koreksi, penghapusan, dan alur HITL. |

## Keputusan terkait

| Dokumen | Hubungan |
| --- | --- |
| [ADR-007: AI Coach with Human-in-the-Loop](../007-ai-coach-hitl.md) | Mendokumentasikan perilaku Coach lama dan celah auto-persist yang perlu ditutup. |
| [ADR v3-002: Penyimpanan dan Siklus Hidup Proposal Adaptif](./v3-002-adaptive-proposal-storage-lifecycle.md) | Menentukan persistence, lifecycle, stale check, dan transaksi penerimaan proposal. |
