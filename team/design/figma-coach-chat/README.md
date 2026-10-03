# Coach Chat Rework — plugin Figma (lokal)

Plugin Figma yang **meng-generate mockup** untuk perombakan chat coach (ADR v3-003):
permukaan trust, dock diagnostik desktop, dan mobile. Semua layer dibuat dari nol oleh
`code.js` — tidak ada aset eksternal dan **tidak ada akses jaringan**.

## Cara menjalankan

1. Buka **Figma Desktop** (bukan browser) dan buka/miliki satu file desain.
2. Menu **Plugins → Development → Import plugin from manifest…**
3. Pilih file `manifest.json` di folder ini.
4. Jalankan plugin **Coach Chat Rework** dari menu Plugins → Development.
5. Plugin membuat halaman `Coach Chat — Rework`, lalu `notify` + menutup diri sendiri.

Run ulang **idempoten**: halaman lama bernama sama dihapus lebih dulu, jadi tidak ada
duplikasi. Layer yang Anda sunting manual di halaman itu akan hilang saat run berikutnya.

## Peta halaman & frame

| # | Frame | Isi |
|---|---|---|
| 01 | Chat desktop — rail 20px dihapus | Layar chat 1280×900; pemicu observabilitas jadi tombol `[⌗ Diagnostik]` |
| 02 | Trust — resolved | Expander terbuka: Jalur / Topik / Sumber (personal = teks, domain = `↗ tautan`) |
| 03 | Trust — ambiguous | Chip "Perlu klarifikasi" + 2 kandidat topik + putar-ulang pertanyaan |
| 04 | Trust — out of scope | Chip "Di luar cakupan pengetahuan"; tanpa pengambilan pengetahuan |
| 05 | Trust — sumber belum siap | Chip "Sumber belum siap"; degradasi, tanpa klaim domain |
| 06 | Trust — proposal (HITL) | Chip proposal; tanpa tombol setujui/tolak di bubble |
| 07 | Trust — tanpa meta | Chip disembunyikan; empty-state jujur |
| 08 | Dock terbuka — Turn ini | Chat + dock 384px: Kontrak, Sumber & Retrieval, Waktu & Biaya, HITL |
| 09 | Dock — tab Pipeline | Jejak percobaan/LLM terstruktur (tanpa potongan keluaran model) |
| 10 | Dock — tab Audit | Daftar aksi struktural; ringkasan berbasis kode, bukan isi percakapan |
| 11 | Dock — tab Metrik | Accept Rate + Tugas Disarankan/Ditolak/Tertunda + distribusi; tanpa tren palsu |
| 12 | Dock — pesan tanpa meta | Empty-state trace untuk turn di luar sesi |
| 13 | Mobile — chat 360px | Header + tombol `[⌗]` ≥44×44, thread, bubble chip+expander, composer |
| 14 | Mobile — bottom sheet | Scrim transparan + sheet modal (`role=dialog`, `aria-modal`, focus trap) |

Posisi di kanvas: baris 1 (y=0) = frame 01–07, baris 2 (y=1000) = 08–12,
baris 3 (y mengikuti baris terbawah + 64) = 13–14.

## Cara mengubah token

Semua berkas di satu file: `code.js`.

| Yang diubah | Lokasi di `code.js` |
|---|---|
| Warna (primary/accent/warm, merah-hijau-amber) | blok `var T = { … }` — seksi **2. Token** |
| Radius (`rounded-lg/xl/2xl/full`) | `var R = { … }` di seksi yang sama |
| Ukuran teks (`24/16/14/12/11/10`) | `var FS = { … }` |
| Bayangan kartu | `var SOFT = [ … ]` |
| Font & fallback | `FALLBACK` + `loadFonts()` — seksi **1. Font** |
| Layout umum (padding, gap, isi baris) | `autoFrame()` / `add()` / `card()` — seksi **3. Helper dasar** |
| Isi layar 01 | `buildScreen()` — seksi **4** |
| Isi frame trust 02–07 | `buildTrustFrames()` — seksi **6** |
| Isi dock 08–12 | `buildDockFrames()` + `turnContent()` dsb. — seksi **7** |
| Isi mobile 13–14 | `buildMobileFrames()` — seksi **8** |
| Penempatan frame di kanvas | `main()` — seksi **5. Main** |

Sumber token: `team/client/src/index.css` (blok `@theme` Tailwind v4) dan pemakaian
kelas di `team/client/src/features/coach/components/`. Proyek ini **tidak punya**
`tailwind.config.js`. Desain mengikuti bahasa UI `team/` — plugin tidak menyalin kode.

## Batasan (jujur)

- **Runtime Figma belum pernah dijalankan dari lingkungan pengembangan ini.** Yang sudah
  diverifikasi hanya: `node --check`, parse JSON `manifest.json`, dan smoke test dengan
  stub Plugin API (enum layout, range warna, urutan `fontName`→`characters`, idempotensi,
  keberadaan teks, larangan konten). Posisi/ukuran otomatis dan beberapa API Figma
  (`layoutSizingHorizontal`, pembacaan `height` untuk menyamakan tinggi kolom, glif
  `⌗ ▾ ▸ ↗ • ✕`) asumsi yang belum teruji di Figma asli.
- Plugin hanya **membuat layer baru**; ia tidak membaca, mengubah, atau mengirim data.
  `manifest.json` memuat `networkAccess.allowedDomains: ["none"]`.
- Konten mengikuti batas **ADR-008**: tidak ada `raw_output_preview`, `message_preview`,
  isi percakapan di jejak, atau payload mentah; status selalu ditulis sebagai teks.
- Bahasa UI Indonesia; tanpa jargon PoC (`A0/A1/R1/R2`).
