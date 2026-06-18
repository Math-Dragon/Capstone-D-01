# Deployment Guide — VPS + Docker

Panduan deployment StepUp AI Learn ke production environment menggunakan VPS dan Docker.

## Prasyarat

- VPS dengan Docker dan Docker Compose terinstall
- Domain yang sudah diarahkan ke IP VPS
- Managed PostgreSQL (dari penyedia VPS atau penyedia database terpisah)
- Redis instance (bisa dari VPS sendiri atau managed)
- Git repository access

## 1. Environment Variables

Buat file `.env.production` di server VPS (jangan commit ke repository):

```env
NODE_ENV=production
PORT=3000

# Database production
DATABASE_URL=postgres://user:strong_password@production-db-host:5432/planner

# Redis production
REDIS_URL=redis://localhost:6379

# JWT — gunakan secret berbeda dari development
JWT_SECRET=<minimal_32_karakter_production>
JWT_REFRESH_SECRET=<minimal_32_karakter_production>

# AI Provider
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_API_KEY=<production_api_key>
GEMINI_PAID_API_KEY=<paid_fallback_key>  # opsional

# Allowed origins untuk production
ALLOWED_ORIGINS=https://your-domain.com

# Admin emails
ADMIN_EMAILS=admin@your-domain.com
```

**Penting**: Jangan hardcode secret di kode. Semua nilai sensitif harus lewat environment variables.

## 2. Build Docker Production Image

Di server VPS, setelah clone repository:

```bash
cd team/server

# Build production image
docker build \
  -f Dockerfile.production \
  -t stepup-server:latest \
  .

# Verifikasi image
docker images stepup-server:latest
```

## 3. Database Migration

Jalankan migration terhadap database production:

```bash
# Set DATABASE_URL ke production DB
export DATABASE_URL=postgres://user:strong_password@production-db-host:5432/planner

# Jalankan migration
npx -r dotenv/config node-pg-migrate -m src/migrations up
```

Atau dari dalam Docker:

```bash
docker run --rm \
  -e DATABASE_URL=postgres://user:strong_password@production-db-host:5432/planner \
  -v $(pwd)/src/migrations:/app/src/migrations \
  stepup-server:latest \
  node node_modules/node-pg-migrate/bin/node-pg-migrate.js -m src/migrations up
```

## 4. Deploy Container

```bash
# Jalankan container production
docker run -d \
  --name stepup-server \
  --env-file .env.production \
  -p 3000:3000 \
  --restart unless-stopped \
  stepup-server:latest

# Cek status
docker ps
docker logs stepup-server
```

Jika menggunakan Redis lokal di VPS:

```bash
# Jalankan Redis
docker run -d \
  --name stepup-redis \
  --restart unless-stopped \
  -p 6379:6379 \
  redis:7-alpine redis-server --requirepass <redis_password>
```

## 5. Post-Deployment Verification

Jalankan smoke test setelah deploy:

```bash
# Ganti <DOMAIN> dengan URL production

# 1. Health check
curl -s https://<DOMAIN>/health
# Expected: { "success": true, "data": { "status": "ok", "database": "connected" } }

# 2. Register test user
curl -s -X POST https://<DOMAIN>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"deploy-test@test.com","password":"test12345678"}'

# 3. Login
curl -s -X POST https://<DOMAIN>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"deploy-test@test.com","password":"test12345678"}'
# Simpan token dari response

# 4. Create goal
curl -s -X POST https://<DOMAIN>/api/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Test Goal"}'

# 5. AI suggest (ganti GOAL_ID)
curl -s -X POST https://<DOMAIN>/api/ai/plan/suggest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"goal_id":"<GOAL_ID>","week_start":"2026-06-15"}'

# 6. Data export
curl -s "https://<DOMAIN>/api/export/weekly?week_start=2026-06-15" \
  -H "Authorization: Bearer <TOKEN>"

# 7. Metrics
curl -s https://<DOMAIN>/metrics | head -10
```

## 6. Setup Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

SSL via Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Staging Environment

Untuk setup staging environment terpisah, gunakan VPS terpisah atau namespace terpisah di VPS yang sama:

### Opsi A: VPS Terpisah (Direkomendasikan)

Ulangi langkah 1-6 di VPS staging dengan environment variables berbeda:
- Domain staging: `staging.your-domain.com`
- Database terpisah: `planner_staging`
- API key terpisah atau shared

### Opsi B: Port Berbeda di VPS Sama

```bash
# Jalankan container staging di port berbeda
docker run -d \
  --name stepup-server-staging \
  --env-file .env.staging \
  -p 3001:3000 \
  --restart unless-stopped \
  stepup-server:latest
```

Nginx configuration untuk staging:

```nginx
server {
    listen 80;
    server_name staging.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        # ... (proxy headers sama seperti production)
    }
}
```

---

## Zero-Downtime Deployment Strategy

### Blue-Green Deployment (Direkomendasikan)

1. **Build image baru** tanpa menghentikan container yang sedang berjalan:
   ```bash
   docker build -f Dockerfile.production -t stepup-server:<VERSION> .
   ```

2. **Jalankan container baru** (green) di port alternatif:
   ```bash
   docker run -d \
     --name stepup-server-green \
     --env-file .env.production \
     -p 3001:3000 \
     stepup-server:<VERSION>
   ```

3. **Health check container baru**:
   ```bash
   curl -s http://localhost:3001/health
   ```

4. **Switch traffic** dengan update Nginx upstream:
   ```nginx
   upstream backend {
       server localhost:3001;  # arahkan ke green
       # server localhost:3000;  # blue (old)
   }
   ```
   ```bash
   sudo nginx -s reload
   ```

5. **Verifikasi** semua endpoint berfungsi di production.

6. **Hentikan container lama** (blue) setelah konfirmasi stabil:
   ```bash
   docker stop stepup-server
   docker rm stepup-server
   ```

7. **Rename green ke production**:
   ```bash
   docker stop stepup-server-green
   docker rename stepup-server-green stepup-server
   docker start stepup-server
   ```

### Rolling Update (via Docker Compose)

```bash
# Update image di docker-compose.yml
# docker-compose.prod.yml:
#   services:
#     server:
#       image: stepup-server:latest

docker compose -f docker-compose.prod.yml up -d --no-deps server
```

---

## Rollback Plan

Jika deployment gagal, ikuti langkah berikut:

### Skenario 1: Container Baru Gagal Start

```bash
# 1. Cek log error
docker logs stepup-server

# 2. Jika error, pastikan container lama masih berjalan di port alternatif
#    Switch Nginx kembali ke port 3000 (lihat blue-green step 4)

# 3. Hentikan container yang gagal
docker stop stepup-server
docker rm stepup-server

# 4. Restore nama container lama
docker rename stepup-server-blue stepup-server
sudo nginx -s reload
```

### Skenario 2: Health Check Fail

```bash
# 1. Cek health endpoint
curl -s http://localhost:3000/health

# 2. Jika return degraded/503, cek koneksi database
docker exec stepup-server node -e "
  const { isHealthy } = require('./src/db');
  isHealthy().then(console.log);
"

# 3. Jika db disconnected, periksa DATABASE_URL dan network
# 4. Jika db OK tapi aplikasi error, rollback:
docker stop stepup-server
docker run -d \
  --name stepup-server \
  --env-file .env.production \
  -p 3000:3000 \
  stepup-server:<PREVIOUS_STABLE_TAG>
```

### Skenario 3: Migration Gagal

```bash
# 1. Catat error migration
# 2. Rollback migration:
npx -r dotenv/config node-pg-migrate -m src/migrations down

# 3. Deploy versi sebelumnya yang kompatibel
docker run -d --name stepup-server -p 3000:3000 stepup-server:<PREVIOUS_TAG>
```

### Verifikasi Rollback

Setelah rollback, jalankan smoke test (section 5) untuk memastikan:

- Health check OK
- Auth flow berfungsi
- AI suggestion berfungsi (jika API key valid)
- Data tidak corrupt

---

## Monitoring Post-Deployment

```bash
# 1. Cek container health
docker ps --filter name=stepup

# 2. Monitor logs real-time
docker logs -f stepup-server

# 3. Cek resource usage
docker stats stepup-server

# 4. Verifikasi metrics endpoint
curl -s https://<DOMAIN>/metrics | grep ai_

# 5. Disk usage
docker system df
```
