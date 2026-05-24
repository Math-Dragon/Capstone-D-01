# ADR v2-003: Task Lifecycle & Progress Snapshot

## Status
Diterapkan untuk MVP

## Konteks
Siklus hidup tugas: `todo → in_progress → done | skipped`. Setiap transisi status harus memicu pembaruan progress snapshot agar data yang digunakan AI tetap akurat.

Dua pendekatan recalculation:

1. **Per-event (real-time):** Setiap kali status tugas berubah, `recalculateProgress()` dipanggil langsung
2. **Batch (end-of-day):** Progress dihitung ulang secara periodik (cron job setiap tengah malam) untuk semua user

## Keputusan
**Per-event recalculation** untuk MVP.

## Alasan
1. **Jumlah pengguna kecil.** Dengan <100 pengguna aktif, overhead database per-event masih minimal
2. **Data AI harus real-time.** `progress_snapshots` digunakan sebagai konteks untuk LLM prompt — jika data basi, saran AI tidak relevan
3. **Implementasi sederhana.** `recalculateProgress()` dipanggil di task.service.js dari method `update()` dan `updateStatus()`. Tidak perlu infrastruktur cron/job scheduler
4. **Upsert pattern.** `ON CONFLICT (user_id, week) DO UPDATE` memastikan tidak ada duplikasi data per minggu

### Detail Implementasi
- **Dipanggil dari** `task.service.update()` (line 50-52) — saat status berubah ke/dari 'done'
- **Dipanggil dari** `task.service.updateStatus()` (line 105-107) — saat status berubah via endpoint `PATCH /:id/status`
- **Logic:** hitung `planned_hours` = SUM(duration_estimate) dan `completed_hours` = SUM(actual_duration atau duration_estimate untuk status 'done') per ISO week
- **Output:** upsert ke tabel `progress_snapshots` — update jika sudah ada record untuk user+week yang sama
- **Terpisah dari student_metrics:** `computeRollingMetrics()` menghitung `completion_rate_7d`, `completion_rate_3d`, dll via SQL langsung — tidak bergantung pada progress_snapshots

### Status Transitions
```
VALID_TRANSITIONS = {
  todo:        ['in_progress', 'done', 'skipped'],
  in_progress: ['done', 'skipped'],
  done:        [],
  skipped:     [],
}
```
- **Todo → Done:** `completed_at = NOW()`, `actual_duration` dicatat
- **Skipped:** `skip_reason` dicatat untuk audit trail

## Konsekuensi
- **Positif:** progress selalu akurat saat AI membutuhkan konteks
- **Positif:** tanpa infrastruktur tambahan (cron, job queue)
- **Negatif:** overhead database untuk setiap transisi — pada skala besar bisa jadi bottleneck
- **Negatif:** hanya menghitung ulang minggu dari task yang diupdate — minggu lain yang terdampak (misalnya task dipindah antar minggu) tidak otomatis dihitung ulang

### Rencana Revisit
- Migrasi ke batch recalculation (cron job via node-cron atau external scheduler) jika jumlah user >100
- Tambahkan recalculation untuk minggu asal dan minggu tujuan jika task dipindah antar minggu
- Implementasikan `progress/trend` endpoint data historis (sudah ada di routes/progress.js)
