# Deployment Guide

Panduan ini mencakup deployment aplikasi AI Learning Plan ke berbagai platform.

## Build for Production

### Frontend

```bash
cd client
npm run build
```

Hasil build ada di `client/dist/`.

### Backend

```bash
cd server
npm ci --production
```

---

## Option 1: Docker Compose (VPS)

### Prerequisites

- Docker & Docker Compose terinstal di VPS
- Domain (opsional, untuk SSL)
- Nginx (sebagai reverse proxy)

### Setup

1. **Clone repo di server**

```bash
git clone <repository-url> ai-learning-plan
cd ai-learning-plan
```

2. **Setup environment variables**

```bash
cp server/.env.example server/.env
nano server/.env  # Isi semua konfigurasi
```

3. **Start semua services**

```bash
docker compose up -d
```

4. **Run database migrations**

```bash
docker compose exec server npm run migrate:up
```

5. **(Opsional) Seed data**

```bash
docker compose exec server npm run seed
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

### SSL dengan Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Option 2: Vercel (Frontend) + VPS (Backend)

### Frontend ke Vercel

1. **Push ke GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/ai-learning-plan.git
git push -u origin main
```

2. **Connect ke Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import repository
   - Framework Preset: `Vite`
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase auth domain |

4. **Proxy API di vercel.json**

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Backend ke VPS via Docker

1. **Build Docker image**

```bash
cd server
docker build -t ai-learning-plan-server .
docker tag ai-learning-plan-server your-registry/ai-learning-plan-server
docker push your-registry/ai-learning-plan-server
```

2. **Pull dan run di VPS**

```bash
docker pull your-registry/ai-learning-plan-server
docker run -d \
  --name ai-server \
  -p 3000:3000 \
  --env-file .env \
  your-registry/ai-learning-plan-server
```

---

## Option 3: Railway / Render

### Railway

1. **Create new project** → Deploy from GitHub repo
2. **Root Directory**: `server`
3. **Start Command**: `npm run start`
4. **Add PostgreSQL plugin** (Railway will provide DATABASE_URL)
5. **Add Redis plugin**
6. **Set environment variables**

### Render

1. **Create Web Service** → Connect GitHub repo
2. **Root Directory**: `server`
3. **Build Command**: `npm install && npm run migrate:up`
4. **Start Command**: `npm run start`
5. **Add Environment Variables**

---

## Environment Variables

### Production Checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Production PostgreSQL URL |
| `REDIS_URL` | Yes | Production Redis URL |
| `JWT_SECRET` | Yes | Strong random string |
| `JWT_ACCESS_EXPIRY` | No | Default: 15m |
| `JWT_REFRESH_EXPIRY` | No | Default: 7d |
| `GEMINI_API_KEY` | Yes | Production API key |
| `OPENROUTER_API_KEY` | No | Fallback LLM |
| `FIREBASE_PROJECT_ID` | Conditional | If using social auth |
| `FIREBASE_CLIENT_EMAIL` | Conditional | If using social auth |
| `FIREBASE_PRIVATE_KEY` | Conditional | If using social auth |
| `CORS_ORIGIN` | Yes | Frontend URL |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | No | Default: 3000 |

### Security Notes

- JWT_SECRET harus strong random string (min 32 characters)
- Jangan commit .env ke repository
- Gunakan environment variable secrets dari platform (Vercel, Railway)
- Firebase private key harus di-base64 encode jika ada special characters

---

## Post-Deployment Checklist

- [ ] Build frontend berhasil tanpa error
- [ ] Container backend berjalan
- [ ] Database migration sukses
- [ ] Halaman login/register berfungsi
- [ ] API health check mengembalikan 200
- [ ] AI Coach merespon (test prompt)
- [ ] Goal CRUD berfungsi
- [ ] CORS sudah benar
- [ ] SSL/HTTPS aktif
- [ ] Rate limiting aktif
- [ ] Monitoring siap (Prometheus metrics di /metrics)

## Troubleshooting

### Blank Page

1. Cek browser console untuk error
2. Verifikasi `VITE_FIREBASE_API_KEY` benar
3. Cek CORS origin

### 404 on Refresh (SPA)

Pastikan server/frontend platform sudah dikonfigurasi untuk fallback ke `index.html`:
- **Vercel**: Otomatis (rewrite rule)
- **Nginx**: `try_files $uri $uri/ /index.html;`
- **Docker client**: Sudah dikonfigurasi di client Dockerfile

### API Not Working

```bash
curl https://your-domain.com/health
curl https://your-domain.com/api/goals
```

### Database Connection Error

```bash
docker compose logs db
# Check jika DATABASE_URL sudah benar
# Pastikan IP database bisa diakses dari server
```

### AI Not Responding

```bash
# Cek Gemini API key
curl -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1/models
```
