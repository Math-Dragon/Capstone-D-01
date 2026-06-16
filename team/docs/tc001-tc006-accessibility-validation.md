# TC-001 - TC-006 Accessibility Validation

## Scope

Dokumen ini merangkum validasi aksesibilitas dan state handling untuk halaman utama aplikasi StepUp:

- Home
- Login
- Register
- Dashboard
- Goals
- Goal Detail
- Calendar
- Progress
- Coach

## Acceptance Mapping

| TC | Requirement | Implementasi |
| --- | --- | --- |
| TC-001 | Semua halaman memiliki empty state, error state, dan loading state. | Loading/error/empty state diperkuat pada Dashboard, Goals, Goal Detail, Calendar, Progress, dan Coach. Auth pages memiliki loading submit dan error alert. Home bersifat static landing page sehingga tidak membutuhkan data loading/error. |
| TC-002 | Pesan error informatif dan memberikan aksi seperti retry atau help text. | Error Dashboard, Goals, Goal Detail, Calendar, Progress, Coach, Login, dan Register memiliki pesan recovery. Goal Detail, Calendar, Dashboard, Progress, Goals, dan Coach menyediakan retry/back action sesuai konteks. |
| TC-003 | Keyboard navigation berfungsi di kalender. | Week/month calendar grid mendukung Arrow Left, Arrow Right, Home, End, Enter, dan Space. Fokus berpindah antar tanggal dan Enter/Space membuka tanggal terpilih. |
| TC-004 | Keyboard navigation berfungsi di daftar tugas. | Task title menggunakan button aksesibel. Enter/Space membuka detail task. Task wrapper di Calendar dapat difokuskan dan dibuka via keyboard. |
| TC-005 | ARIA labels terpasang di semua komponen interaktif. | Password visibility controls, calendar date buttons, task action buttons, coach send button, retry buttons, tablist, loading/error/empty regions, dan auth form fields memiliki accessible name/role yang eksplisit. |
| TC-006 | Color contrast memenuhi WCAG 2.1 Level AA dengan rasio minimal >= 4.5:1. | Token teks `primary`, `accent`, dan `warm` yang sering dipakai pada background terang digelapkan. Error text memakai red-600/red-700. Catatan: verifikasi otomatis contrast penuh sebaiknya dilakukan dengan axe/Playwright di browser. |

## Test Evidence

Automated tests yang mencakup perubahan ini:

- `team/client/tests/pages/CalendarPage.test.jsx`
- `team/client/tests/components/TaskCard.test.jsx`
- `team/client/tests/pages/DashboardPage.test.jsx`
- `team/client/tests/pages/ProgressPage.test.jsx`
- `team/client/tests/features/goals/components/GoalCard.test.jsx`
- `team/client/tests/pages/GoalDetailPage.test.jsx`
- `team/client/tests/features/auth/components/LoginPage.test.jsx`
- `team/client/tests/features/auth/components/RegisterPage.test.jsx`
- `team/client/tests/features/coach/CoachPage.test.jsx`

## Manual Review Checklist

- Login/Register error muncul sebagai `role="alert"` dan field dapat ditemukan dari label.
- Calendar week/month dapat dinavigasi dengan keyboard.
- Task detail dapat dibuka dari keyboard.
- Empty state memberi langkah berikutnya, bukan hanya teks kosong.
- Retry/help text tersedia pada error data-fetching.
- Warna teks kecil pada background terang tetap terbaca.

