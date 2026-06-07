# ADR v2-001: State Management Kalender Mingguan

## Status
Diterapkan untuk MVP

## Konteks
Kalender mingguan adalah fitur utama yang menampilkan tugas di slot waktu (Pagi/Siang/Malam) per hari. Saat ini:

- **CalendarPage.jsx** (1095 baris) mengelola semua state UI secara lokal dengan `useState` — 15+ variabel state untuk tasks, loading, filter, modal, dan navigasi minggu
- **Tidak ada shared state** untuk data tasks antar halaman. Setiap halaman (CalendarPage, DashboardPage, GoalDetailPage) melakukan fetch `/api/tasks` sendiri-sendiri
- **Invalidasi lintas halaman** menggunakan event bus `window.dispatchEvent` dengan listener `app:dataChanged` — pattern sederhana tanpa dependency eksternal
- **3 Context providers** terpisah untuk domain berbeda: AuthContext, GoalsContext, CoachContext — tidak ada satupun yang menyimpan task state
- **Redux Toolkit** digunakan hanya untuk auth, goals, dan observability — task state tidak masuk Redux

Pertanyaan dari instruksi: apakah perlu shared state (React Context/Zustand) atau cukup dengan local state?

## Keputusan
**Local state + event bus** untuk MVP. Tidak menggunakan shared state management untuk data tasks.

## Alasan
1. **Hanya 1 komponen yang merender tasks — CalendarPage.** Tidak ada halaman lain yang membutuhkan data tasks yang sama secara real-time. DashboardPage menampilkan ringkasan (progress snapshot), bukan daftar tasks
2. **CoachContext sudah menangani HITL flow** — saat user accept/reject, data langsung di-push via callback `onUpdateTasks`
3. **Event bus cukup** untuk invalidasi sederhana: setelah mutasi (complete, skip, reschedule), halaman lain yang butuh data terbaru akan refetch
4. **Redux untuk task state akan over-engineering** — menambah boilerplate (slice, thunks, selectors) tanpa manfaat signifikan di MVP
5. **Meminimalkan kompleksitas** — tim kecil (4 orang), learning curve Redux untuk task management tidak sebanding dengan benefitnya saat ini

## Konsekuensi
- **Positif:** kode sederhana, mudah di-debug, tidak ada stale state antar slice
- **Positif:** migrasi ke shared state nanti tetap dimungkinkan tanpa rewrite besar — cukup pindahkan `useState` ke Context/Zustand store
- **Negatif:** duplikasi fetch data — setiap halaman memanggil `/api/tasks` sendiri
- **Negatif:** event bus tidak memberikan type safety — event name rentan typo
- **Negatif:** CalendarPage cenderung besar (1095 baris) karena semua logic ada di satu komponen

### Rencana Revisit
Jika di iterasi berikutnya terdapat ≥3 komponen yang membutuhkan akses ke data tasks secara bersamaan (misalnya: sidebar mini-calendar, dashboard task widget, dan calendar page), akan diimplementasikan Zustand store untuk task state.
