# ADR-006: JWT Authentication with Refresh Token Rotation

## Status
Accepted

## Konteks
Aplikasi membutuhkan autentikasi yang aman untuk peserta bootcamp. Dua kebutuhan: login email/password dan social login (Google). GitHub masih "coming soon".

## Keputusan
### Hybrid Authentication
1. **Email/Password**: JWT access + refresh tokens (self-managed)
2. **Social Login**: Firebase Auth (Google only) — server-side verification via Firebase Admin

### Token Strategy
```
Login → Access Token (15 menit) + Refresh Token (7 hari)
         ↓ expired
Refresh → New Access Token + New Refresh Token (rotation)
         ↓ jika refresh gagal
Re-login required
```

### Implementation Details
- Access token: JWT signed dengan JWT_SECRET, expiry 15 menit, disimpan di localStorage
- Refresh token: JWT signed dengan JWT_REFRESH_SECRET, expiry 7 hari, httpOnly cookie
- Refresh token SHA-256 hash disimpan di tabel refresh_tokens
- Token rotation: setiap refresh, token lama di-delete sebelum issue baru
- Axios interceptor: response 401 → refresh token → retry (dengan queue untuk concurrent 401s)
- httpOnly cookie: secure (prod), sameSite strict, maxAge 7 hari
- Register endpoint: return user data saja (tanpa token — perlu login manual)

### Firebase Social Auth
- Firebase Client SDK (signInWithPopup) untuk Google login di frontend
- Firebase Admin SDK (verifyIdToken) untuk verifikasi di backend
- Server menyimpan google_id di tabel users
- GitHub OAuth: Google provider only — button GitHub show "coming soon" alert
- DB schema: github_id column exists tetapi tidak pernah di-write

## Alasan
1. **Access + Refresh token**: Access token short-lived (15m) meminimalkan risiko jika bocor
2. **Token rotation**: Mencegah replay attack — old token langsung di-delete
3. **Firebase**: Tanpa implementasi OAuth manual untuk Google
4. **Axios interceptor with queue**: Mencegah multiple refresh calls untuk concurrent 401s
5. **httpOnly cookie**: Refresh token tidak bisa diakses JavaScript (aman dari XSS)

## Konsekuensi
- Firebase dependency untuk Google login (perlu Firebase project + API key)
- Access token di localStorage — rentan XSS, dimitigasi oleh short expiry (15m)
- Token rotation tidak atomic — jika new token gagal setelah old di-delete, user harus re-login
- Register tidak auto-login — user harus login manual setelah register
- GitHub OAuth belum diimplementasikan — column + repo method sudah ada tapi tidak digunakan
- Cookie maxAge dan JWT expiry hardcoded terpisah — risk of drift
