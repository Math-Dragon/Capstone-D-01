# E2E Core Flow Summary

Dokumen ini merangkum pengujian end-to-end utama StepUp AI Learn dari sisi API. Fokusnya adalah memastikan flow dasar aplikasi tetap berjalan walaupun layanan AI sedang terkena limit kuota.

## Scope

| ID | Skenario | Tujuan |
| --- | --- | --- |
| E2E-SETUP | Register dan login user testing | Memastikan user baru bisa masuk ke sistem |
| E2E-01 | Validasi sesi login | Memastikan token bisa dipakai untuk membaca profil |
| E2E-02 | Membuat dan membaca goal | Memastikan goal tersimpan di database |
| E2E-03 | Membuat task manual | Memastikan user bisa membuat task tanpa AI |
| E2E-04 | Menyelesaikan task dan validasi progress | Memastikan progress stats ikut berubah saat task selesai |
| E2E-05 | Accept proposal coach membuat task | Memastikan rencana coach bisa disimpan sebagai task |
| E2E-06 | AI suggestion health | Memastikan AI sukses saat kuota tersedia atau memberi error terkendali saat kuota habis |
| E2E-CLEANUP | Cleanup data goal/task E2E | Memastikan data goal/task sementara dibersihkan setelah test |

## Cara Menjalankan

Pastikan backend sedang berjalan, database sudah dimigrasi, dan Redis aktif.

```powershell
node scripts/run-e2e-core-flow.js
```

Jika backend memakai port berbeda:

```powershell
$env:API_BASE_URL="http://localhost:3000/api"
node scripts/run-e2e-core-flow.js
```

## Expected Result

Semua skenario harus `PASS`. Untuk `E2E-06`, hasil tetap dianggap pass jika Gemini mengembalikan limit/quota error yang tertangani dengan response API yang jelas.

## Output

Script akan membuat laporan otomatis di:

```text
docs/e2e-core-flow-run-report.md
```
