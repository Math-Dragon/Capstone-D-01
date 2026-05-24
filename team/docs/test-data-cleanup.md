# Test Data Cleanup

Cleanup data testing dibuat agar data sementara dari pengujian tidak menumpuk di database lokal.

## Data Yang Dicakup

Script hanya mencari user dengan prefix email berikut:

| Prefix | Sumber |
| --- | --- |
| `tc03-tc07-` | Pengujian Manajemen Tugas & AI |
| `tc08-tc12-` | Pengujian ekstra Manajemen Tugas & AI |
| `e2e-core-` | Pengujian E2E core flow |
| `goals-test-` | Backend integration test goals |
| `tasks-test-` | Backend integration test tasks |

## Dry Run

Dry run adalah mode default. Mode ini hanya menampilkan data yang akan dihapus.

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:15432/planner"
node scripts/cleanup-test-data.js
```

## Eksekusi Cleanup

Gunakan ini hanya jika sudah yakin ingin menghapus data testing lokal yang matching dengan prefix di atas.

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:15432/planner"
$env:CLEANUP_CONFIRM="delete-test-data"
node scripts/cleanup-test-data.js
```

## Catatan

Script tidak menghapus data user asli karena filter berbasis prefix email testing. Untuk menjaga keamanan, mode default selalu dry-run.
