# TC-014 Report — Finalisasi Testing Code Set

## Ringkasan

TC-014 merupakan validasi lintas-scope bahwa semua fitur utama aplikasi telah diuji dan stabil. Setelah Scope 1 (UI/UX/A11y) dan Scope 4 (Monitoring) selesai, finalisasi mencakup penambahan **Cypress Lighthouse audit** dan **coverage threshold enforcement** di CI.

---

## A. Cypress Lighthouse — 3 Test Files

**Struktur:** 3 spec files mencakup 9 halaman:

| File | Halaman | Threshold |
|------|---------|-----------|
| `client/cypress/e2e/lighthouse/public-pages.cy.js` | `/` (Home), `/login`, `/register` | Performance: 50, Accessibility: 90, Best Practices: 80, SEO: 80 |
| `client/cypress/e2e/lighthouse/protected-pages.cy.js` | Dashboard, Goals, Calendar, Progress, Coach | Sama seperti di atas |
| `client/cypress/e2e/lighthouse/admin-pages.cy.js` | `/admin` | Performance: 40, sisanya sama |

**Catatan:** Threshold Dashboard di protected-pages sempat diturunkan dari 50 ke 35 di fase sebelumnya (score aktual 37, pre-existing issue). Kemudian dikembalikan ke 50 di versi final setelah optimasi. Admin page menggunakan threshold 40 karena halaman admin berat dengan chart Recharts dan tabel interaktif.

**Konfigurasi Lighthouse:**
- Plugin: `@cypress-audit/lighthouse` (^1.4.2)
- Chrome di-launch dengan `prepareAudit()` untuk konfigurasi Lighthouse
- Tidak ada file `lighthouserc` terpisah — semua via Cypress plugin

**Alur Seed Data Lighthouse:**
```
Cypress `task:seedUsers` -> lighthouse-test-user.js
  -> Buat users: lighthouse@test.local + admin123@example.com
  -> Generate JWT tokens langsung (bypass rate limiter)
  -> Simpan ke server/seeds/data/lighthouse-tokens.json

Cypress `cy.loginAsLighthouseUser()` / `cy.loginAsAdmin()`
  -> Baca token dari lighthouse-tokens.json
  -> Inject ke localStorage

Cypress `task:cleanupUsers` -> hapus users + token file
```

---

## B. E2E Core Flow — 9 Skenario API

Script: `scripts/run-e2e-core-flow.js` (343 baris)

| ID | Skenario | Status |
|----|----------|--------|
| E2E-SETUP | Register & login user testing | PASS |
| E2E-01 | Validasi sesi login (GET /auth/me) | PASS |
| E2E-02 | Membuat & membaca goal | PASS |
| E2E-03 | Membuat task manual | PASS |
| E2E-04 | Menyelesaikan task + validasi progress | PASS |
| E2E-05 | Accept proposal coach -> task terbuat | PASS |
| E2E-06 | AI suggestion health (graceful error saat kuota habis) | PASS |
| E2E-07 | AI suggest -> accept -> calendar (validasi planned_date/slot) | PASS |
| E2E-CLEANUP | Cleanup data goal/task E2E | PASS |

**Hasil akhir:** PASS 9, FAIL 0 (2026-05-27).

---

## C. Coverage Threshold Enforcement

**Client (`client/vite.config.js`):**
```js
coverage: {
  thresholds: { lines: 50 },
},
```

**CI (`.github/workflows/ci.yml`):**
- Server: `npm test -- --coverage` + Node script parsing `coverage-final.json`, fail jika < 50%
- Client: `npm run test:coverage` + Node script parsing `coverage-final.json`, fail jika < 50%

**Coverage Aktual (setelah finalisasi):**
| Metric | Server | Client |
|--------|--------|--------|
| % Stmts | **70.95** | **70.19** |
| % Branch | **55.57** | **77.64** |
| % Funcs | **72.40** | **57.57** |
| % Lines | **72.35** | **70.19** |

Semua melampaui threshold minimum (>= 50%).

---

## D. Script Testing Lainnya

| Script | Coverage |
|--------|----------|
| `scripts/run-tc03-tc07.js` | Task management + AI recommendations (319 baris) |
| `scripts/run-task-ai-management-extra.js` | TC-08 s.d. TC-12 (347 baris) |
| `scripts/run-calendar-task-ai-tc01-tc07.js` | UI test via headless Chrome/CDP (728 baris, paling kompleks) |
| `scripts/run-tc10-tc24.js` | Rate limiting, security, secret scan (237 baris) |
| `scripts/run-task-ai-schema-validation.js` | Zod schema validation (520 baris) |
| `scripts/cleanup-test-data.js` | Hapus data test by prefix email (67 baris) |

---

## E. Status Akhir TC-014

✅ **SELESAI** — Semua fitur utama telah diuji melalui:
1. **Cypress Lighthouse** - 9 halaman diaudit (a11y >= 90, BP >= 80, SEO >= 80)
2. **E2E API core flow** - 9 skenario, semua PASS
3. **Unit tests** - Server 416 tests (30 suites), Client 254 tests (39 files)
4. **Coverage threshold** - Terenforce di CI, semua metrics >= 50%
5. **Script testing** - 6 script untuk validasi TC spesifik

---

## Catatan Tambahan

> **Bundle size audit dan reduction belum dilakukan.** Lighthouse performance score masih menggunakan threshold 40-50 yang relatif rendah (terutama dashboard dan admin page). Optimasi bundle (code splitting, tree shaking, lazy loading komponen berat seperti Recharts) belum dieksekusi dan dapat dijadikan item pekerjaan terpisah di masa depan.
