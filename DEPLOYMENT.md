# 🚀 Sporthink Deployment Rehberi

Bu rehber Sporthink platformunu **canlı yayına** almak için adım adım anlatımdır.

İki ana yol var:
- **🟢 Yol A:** Vercel + Supabase (önerilen — en kolay, ücretsiz başlangıç)
- **🔵 Yol B:** Railway (her şey tek yerde — $5/ay)
- **🟠 Yol C:** Docker (kendi VPS — DigitalOcean, AWS, Hetzner)

---

## 🟢 Yol A: Vercel + Supabase (ÖNERİLEN)

**Maliyet:** Ücretsiz tier başlangıç (Vercel Hobby + Supabase Free)
**Kapasite:** ~1000 günlük aktif kullanıcı
**Süre:** 30 dakika

### 1. Supabase'de Veritabanı Oluştur

1. https://supabase.com → **Start your project** → GitHub ile giriş
2. **New project**:
   - Name: `sporthink`
   - Database Password: güçlü bir şifre belirle ve **kaydet** (önemli!)
   - Region: **Frankfurt (eu-central-1)** (Türkiye'ye en yakın)
   - Pricing Plan: **Free**
3. Proje hazır olunca **2-3 dakika bekle**
4. Sol menüden **Settings → Database → Connection string → URI** sekmesi
5. Şu formattaki URL'i kopyala:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. `[YOUR-PASSWORD]` kısmını adım 2'de belirlediğin şifre ile değiştir
7. Sonuna `?sslmode=require` ekle:
   ```
   postgresql://postgres:abc123@db.xxxxx.supabase.co:5432/postgres?sslmode=require
   ```

### 2. Schema'yı PostgreSQL'e Ayarla

`prisma/schema.prisma` dosyasında:
```prisma
datasource db {
  provider = "postgresql"  // ← "sqlite" yerine
  url      = env("DATABASE_URL")
}
```

### 3. Schema'yı Supabase'e Push Et

Lokal terminalde:
```bash
# .env'de DATABASE_URL'i Supabase URL'i yap
# Sonra şemayı oluştur:
npx prisma db push

# Demo verileri yükle:
node prisma/seed.js
```

### 4. Vercel'de Deploy

1. https://vercel.com → **Add New → Project**
2. GitHub'daki `KeremOren/Sporthink` repo'sunu seç → **Import**
3. **Framework Preset:** Next.js (otomatik algılanır)
4. **Environment Variables** — şunları ekle (tek tek):

| Variable | Değer |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:...?sslmode=require` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` ile üret |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (deploy sonrası gerçek URL) |
| `GEMINI_API_KEY` | Google AI Studio key'in |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env`'deki ile aynı veya yenisini üret |
| `VAPID_PRIVATE_KEY` | `.env`'deki ile aynı |
| `VAPID_SUBJECT` | `mailto:admin@sporthink.com` |

5. **Deploy** butonuna bas → 2-3 dakika bekle
6. Build başarılı olunca yeşil checkmark görürsün
7. URL'i not et: `https://sporthink-xxx.vercel.app`

### 5. NEXTAUTH_URL'i Güncelle

İlk deploy sonrası gerçek URL'in var. Vercel dashboard:
- **Settings → Environment Variables → NEXTAUTH_URL** değerini güncelle
- **Deployments → Redeploy**

### 6. Test Et

- `https://your-app.vercel.app` aç
- `admin@sporthink.com / admin123` ile giriş
- ✅ Dashboard yüklenmeli
- ✅ AI Asistan çalışmalı
- ✅ Push bildirim "Bildirimleri Aç" butonu çalışmalı

### 7. Custom Domain (Opsiyonel)

Domain aldıysan:
1. Vercel → **Settings → Domains → Add**
2. Domain'i yaz (örn. `sporthink.com.tr`)
3. Domain sağlayıcının DNS panelinde Vercel'in verdiği nameserver/CNAME'i ekle
4. 5-30 dk DNS yayılması
5. `NEXTAUTH_URL`'i de güncelle

---

## 🔵 Yol B: Railway (Her Şey Tek Yerde)

**Maliyet:** ~$5/ay (DB + app)
**Avantaj:** PostgreSQL + Next.js + cron, hepsi tek yerde

### Adımlar

1. https://railway.app → GitHub ile giriş
2. **New Project → Deploy from GitHub repo → KeremOren/Sporthink**
3. Railway otomatik build başlatır
4. **+ New → Database → Add PostgreSQL** (aynı projeye)
5. PostgreSQL servisi seç → **Connect → DATABASE_URL** kopyala
6. App servisine git → **Variables** → tüm env'leri ekle (DEPLOYMENT.md → Yol A → Adım 4)
7. **Settings → Generate Domain** → public URL al
8. `NEXTAUTH_URL`'i güncelle, redeploy

### Database Setup

Railway'in PostgreSQL'i hazır. Lokal'den schema push:
```bash
# .env'de DATABASE_URL'i Railway URL ile değiştir, sonra:
npx prisma db push
node prisma/seed.js
```

---

## 🟠 Yol C: Docker (Self-Hosted VPS)

**Maliyet:** ~$6-12/ay VPS (DigitalOcean, Hetzner, Vultr)
**Avantaj:** Tam kontrol, kurumsal güvenlik

### Adımlar

1. VPS oluştur (Ubuntu 22.04 önerilir)
2. SSH ile bağlan:
   ```bash
   ssh root@your-vps-ip
   ```
3. Docker yükle:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. PostgreSQL'i container olarak çalıştır:
   ```bash
   docker run -d --name postgres-sporthink \
     -e POSTGRES_PASSWORD=secure_password_here \
     -e POSTGRES_DB=sporthink \
     -p 5432:5432 \
     -v postgres_data:/var/lib/postgresql/data \
     postgres:16-alpine
   ```
5. Repo'yu klonla:
   ```bash
   git clone https://github.com/KeremOren/Sporthink.git
   cd Sporthink
   ```
6. `.env` oluştur (`.env.production.example`'dan kopyala)
7. Schema'yı PostgreSQL'e ayarla (Yol A → Adım 2 gibi)
8. Build & run:
   ```bash
   docker build -t sporthink .
   docker run -d --name sporthink-app \
     --env-file .env \
     -p 3000:3000 \
     --link postgres-sporthink:postgres \
     sporthink
   ```
9. Schema push + seed:
   ```bash
   docker exec sporthink-app npx prisma db push
   docker exec sporthink-app node prisma/seed.js
   ```
10. Reverse proxy (nginx + certbot) ile HTTPS:
    ```bash
    apt install -y nginx certbot python3-certbot-nginx
    # nginx config: proxy_pass http://localhost:3000;
    certbot --nginx -d sporthink.com.tr
    ```

---

## 🔧 Production Sonrası Yapılacaklar

### 1. NextAuth Secret Üret

**Güçlü secret zorunlu:**
```bash
openssl rand -base64 32
```

Çıktıyı `NEXTAUTH_SECRET` env'ine yaz.

### 2. Production VAPID Keys

Lokal `.env`'deki VAPID keyleri kullanabilirsin ya da yenisini üret:
```bash
npx web-push generate-vapid-keys
```

### 3. Yedekleme (Backup)

**Supabase:** Otomatik günlük backup (free tier'da 7 gün)

**Self-hosted PostgreSQL:**
```bash
# Cron job ekle (her gün gece 2'de):
0 2 * * * docker exec postgres-sporthink pg_dump -U postgres sporthink > /backups/sporthink-$(date +\%Y\%m\%d).sql
```

### 4. Monitoring (Önerilir)

**Ücretsiz uptime monitoring:**
- [UptimeRobot](https://uptimerobot.com) — `https://your-app.com/api/health` URL'ini ekle
- Down olunca email/SMS bildirim

**Error tracking:**
- [Sentry](https://sentry.io) — Next.js entegrasyonu var, ücretsiz tier yeterli

### 5. KVKK Hazırlığı

Canlı yayına geçmeden önce zorunlu:
- Çerez onay banner'ı
- Kullanım koşulları + gizlilik politikası sayfaları
- Veri sahibi başvuru formu
- Veri saklama politikası dökümanı

---

## 🔍 Sağlık Kontrolü

Deploy sonrası şu kontrolleri yap:

```bash
# Health endpoint
curl https://your-app.com/api/health
# Beklenen: { "status": "healthy", "checks": { "database": { "ok": true }, ... } }

# Login
# Tarayıcıdan https://your-app.com/login
# admin@sporthink.com / admin123

# AI test
# Dashboard → AI İçgörüler → anomali görmelisin
```

---

## ❌ Sık Karşılaşılan Hatalar

### "Database connection error"
- `DATABASE_URL` doğru mu? `?sslmode=require` ekledin mi?
- Supabase'de network access açık mı (default open)?

### "NEXTAUTH_URL is undefined"
- Vercel env variables'da var mı?
- Deploy sonrası yeniden deploy yaptın mı?

### Push bildirim çalışmıyor
- HTTPS şart (localhost dışında)
- VAPID keys her iki tarafta da set mi?
- Service worker register olmuş mu? (DevTools → Application → Service Workers)

### Gemini API rate limit
- Free tier'da dakikada 60 istek
- Production için Google Cloud'da billing aç

---

## 📊 Performance Beklentileri

| Metrik | Vercel Hobby | Vercel Pro | Self-hosted (4GB RAM) |
|---|---|---|---|
| Aylık aktif kullanıcı | ~500 | ~5.000 | ~10.000 |
| Sayfa yükleme | <1sn | <500ms | <800ms |
| Aylık maliyet | $0 | $20 | $12-25 |

---

## 🆘 Yardım

- Vercel Discord: https://vercel.community
- Supabase Discord: https://discord.supabase.com
- Prisma Discord: https://pris.ly/discord
- Bu repo: https://github.com/KeremOren/Sporthink/issues

---

**İyi yayınlar! 🚀**
