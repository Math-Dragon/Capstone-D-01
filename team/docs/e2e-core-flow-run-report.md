# E2E Core Flow Run Report

Tanggal: 2026-05-24T09:23:13.188Z
API Base URL: http://localhost:3000/api

Ringkasan: PASS 8, FAIL 0

| ID | Status | Skenario | Bukti |
| --- | --- | --- | --- |
| E2E-SETUP | PASS | Register dan login user testing | User e2e-core-1779614573824@example.com berhasil login dan menerima access token |
| E2E-01 | PASS | Validasi sesi login | Endpoint /auth/me mengembalikan user e2e-core-1779614573824@example.com |
| E2E-02 | PASS | Membuat dan membaca goal | Goal a34fdbc2-1af7-49e6-8577-f85ba0300028 tersimpan dan muncul di daftar goal |
| E2E-03 | PASS | Membuat task manual | Task 2ea70e1a-524d-4075-bee6-ca2e6cd6a3b6 tersimpan dengan source=manual dan status=todo |
| E2E-04 | PASS | Menyelesaikan task dan validasi progress | Task done, completedTasks=1, completedMinutes=30 |
| E2E-05 | PASS | Accept proposal coach membuat task | Task "E2E Accepted Coach Plan Task" tersimpan dengan source=coach |
| E2E-06 | PASS | AI suggestion memberi error terkendali saat tidak tersedia | AI route status=422, code=AI_OUTPUT_INVALID |
| E2E-CLEANUP | PASS | Cleanup data goal/task E2E | Deleted manual task 2ea70e1a-524d-4075-bee6-ca2e6cd6a3b6, goal a34fdbc2-1af7-49e6-8577-f85ba0300028 |
