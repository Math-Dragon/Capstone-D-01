# E2E Core Flow Run Report

Tanggal: 2026-05-27T03:31:35.972Z
API Base URL: http://localhost:3000/api

Ringkasan: PASS 9, FAIL 0

| ID | Status | Skenario | Bukti |
| --- | --- | --- | --- |
| E2E-SETUP | PASS | Register dan login user testing | User e2e-core-1779852667152@example.com berhasil login dan menerima access token |
| E2E-01 | PASS | Validasi sesi login | Endpoint /auth/me mengembalikan user e2e-core-1779852667152@example.com |
| E2E-02 | PASS | Membuat dan membaca goal | Goal 83bce527-850e-464a-9959-6a55888883ec tersimpan dan muncul di daftar goal |
| E2E-03 | PASS | Membuat task manual | Task 83fa1da8-1331-4e6d-a4d3-5e92d1bfa395 tersimpan dengan source=manual dan status=todo |
| E2E-04 | PASS | Menyelesaikan task dan validasi progress | Task done, completedTasks=1, completedMinutes=30 |
| E2E-05 | PASS | Accept proposal coach membuat task | Task "E2E Accepted Coach Plan Task" tersimpan dengan source=coach |
| E2E-06 | PASS | AI suggestion tersedia dan bisa ditolak | Recommendation 3aeba853-9202-4ad7-92c8-3f41632278cf dibuat lalu reject status=rejected |
| E2E-07 | PASS | AI suggest -> accept -> calendar | Recommendation f2c46085-d6a1-4956-8500-51dccb108692 accepted; task "Study advanced patterns in General Study" muncul di calendar date=2026-05-28, slot=morning |
| E2E-CLEANUP | PASS | Cleanup data goal/task E2E | Deleted manual task 83fa1da8-1331-4e6d-a4d3-5e92d1bfa395, goal 83bce527-850e-464a-9959-6a55888883ec |
