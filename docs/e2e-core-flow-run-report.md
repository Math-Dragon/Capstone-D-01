# E2E Core Flow Run Report

Tanggal: 2026-05-22T03:51:50.184Z
API Base URL: http://localhost:3000/api

Ringkasan: PASS 8, FAIL 0

| ID | Status | Skenario | Bukti |
| --- | --- | --- | --- |
| E2E-SETUP | PASS | Register dan login user testing | User e2e-core-1779421908721@example.com berhasil login dan menerima access token |
| E2E-01 | PASS | Validasi sesi login | Endpoint /auth/me mengembalikan user e2e-core-1779421908721@example.com |
| E2E-02 | PASS | Membuat dan membaca goal | Goal 6c1b482a-bf38-40d3-8b60-c8e7f8a6ea4f tersimpan dan muncul di daftar goal |
| E2E-03 | PASS | Membuat task manual | Task 80d78912-1e24-4362-a4aa-47a9287ed14c tersimpan dengan source=manual dan status=todo |
| E2E-04 | PASS | Menyelesaikan task dan validasi progress | Task done, completedTasks=1, completedMinutes=30 |
| E2E-05 | PASS | Accept proposal coach membuat task | Task "E2E Accepted Coach Plan Task" tersimpan dengan source=coach |
| E2E-06 | PASS | AI suggestion tersedia dan bisa ditolak | Recommendation 18c5a5b8-9e8d-4a68-97df-2ddc4499280e dibuat lalu reject status=rejected |
| E2E-CLEANUP | PASS | Cleanup data goal/task E2E | Deleted manual task 80d78912-1e24-4362-a4aa-47a9287ed14c, goal 6c1b482a-bf38-40d3-8b60-c8e7f8a6ea4f |
