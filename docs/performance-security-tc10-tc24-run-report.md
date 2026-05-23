# TC-10 sampai TC-24 Run Report

Generated: 2026-05-20T14:08:47.000Z

## Summary

| Status | Count |
| --- | ---: |
| PASS | 15 |
| WARN | 0 |
| FAIL | 0 |

## Result Detail

| TC | Status | Test | Evidence |
| --- | --- | --- | --- |
| TC-10 | PASS | AI rate limit blocks request ke-21 | Jest rateLimiter.test.js passed |
| TC-11 | PASS | Auth rate limit blocks request ke-6 | Jest rateLimiter.test.js passed |
| TC-12 | PASS | HTTP 429 punya pesan retry yang jelas | Jest rateLimiter.test.js passed |
| TC-13 | PASS | Secret scan tracked files | No active tracked secret pattern found |
| TC-14 | PASS | Dokumentasi biaya AI per 100 request | Pricing model, source, and per-100 request examples documented |
| TC-15 | PASS | Rate limit reset setelah window selesai | Jest rateLimiter.test.js passed |
| TC-16 | PASS | AI rate limit dihitung per user | Jest rateLimiter.test.js passed |
| TC-17 | PASS | Auth rate limit dihitung per IP | Jest rateLimiter.test.js passed |
| TC-18 | PASS | Header RateLimit standar tersedia | Jest rateLimiter.test.js passed |
| TC-19 | PASS | Redis-backed rate limiting aktif untuk non-test | RedisStore configured, AI limiter after auth, CI Redis service present |
| TC-20 | PASS | Redis down behavior fail-closed | Redis store error is logged and re-thrown |
| TC-21 | PASS | Load test ringan paralel stabil | Jest rateLimiter.test.js passed |
| TC-22 | PASS | X-Forwarded-For tidak bypass auth limiter | Jest rateLimiter.test.js passed |
| TC-23 | PASS | Secret scanning di CI pipeline | CI has Secret scan step with common API key/private key patterns |
| TC-24 | PASS | Monitoring/logging HTTP 429 | requestLogger logs HTTP 429 warning with operational fields |

## Command

```bash
node scripts/run-tc10-tc24.js
```
