# ADR-006: JWT Authentication with Refresh Token Rotation

## Status
Accepted

## Konteks
Aplikasi membutuhkan autentikasi yang aman untuk peserta bootcamp. Dua kebutuhan: login email/password dan social login (Google/GitHub). Perlu menyeimbangkan security dengan user experience.

## Keputusan
### Hybrid Authentication
1. **Email/Password**: JWT access + refresh tokens (self-managed)
2. **Social Login**: Firebase Auth (Google, GitHub) — server-side verification via Firebase Admin

### Token Strategy
```
Login → Access Token (15 menit) + Refresh Token (7 hari)
         ↓ expired
Refresh → New Access Token + New Refresh Token (rotation)
          ↓ jika refresh gagal
Re-login required
```

### Implementation Details
- Access token: JWT signed dengan JWT_SECRET, expiry 15 menit
- Refresh token: JWT signed dengan JWT_REFRESH_SECRET, expiry 7 hari
- Refresh token hash disimpan di tabel refresh_tokens
- Token rotation: setiap refresh, token lama di-invalidate
- Axios interceptor otomatis menangani refresh di client
- httpOnly cookie untuk refresh token (server-side)

### Firebase Social Auth
- Firebase Client SDK untuk login flow di frontend
- Firebase Admin SDK untuk verifikasi token di backend
- Server menyimpan google_id / github_id di tabel users

## Alasan
1. **Access + Refresh token**: Access token short-lived (15m) meminimalkan risiko jika bocor
2. **Token rotation**: Mencegah replay attack — refresh token lama langsung invalid setelah dipakai
3. **Firebase**: Tanpa implementasi OAuth manual (Google, GitHub siap pakai)
4. **Firebase Admin**: Verifikasi dari server-side aman
5. **Axios interceptor**: Transparent refresh — user tidak perlu login ulang

## Konsekuensi
- Firebase dependency untuk social login (perlu API key)
- Token rotation meningkatkan kompleksitas server-side
- Refresh token di httpOnly cookie tidak bisa diakses JavaScript (lebih aman)
- Perlu endpoint POST /auth/refresh dan POST /auth/logout
- Jika refresh token expired, user harus login ulang
