# 🏆 Sporthink — Retail HR & Training Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.0-4285F4?style=flat-square&logo=google)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

**Spor perakende zinciri için yapay zeka destekli, çok rollü eğitim, performans ve İK yönetim platformu**

[Özellikler](#-özellikler) · [Kurulum](#-kurulum) · [Demo Hesaplar](#-demo-hesaplar) · [Teknoloji](#-teknoloji-yığını) · [Mimari](#-mimari)

</div>

---

## 📋 Proje Hakkında

**Sporthink Training Platform**, Türkiye'de 21 mağazaya yayılmış spor perakende zincirinin tüm personel eğitim, performans takibi, KPI yönetimi ve operasyonel İK ihtiyaçlarını tek çatı altında toplayan **kurumsal seviyede** bir web platformudur.

Proje, gerçek perakende KPI verisi (`PERAKENDE KPI GÜNCEL.xlsx`) ve gerçek personel listesi (`Personel Detay.xlsx`) üzerine kurgulanmış olup, **17 KPI tanımı**, **21 mağaza**, **3 bölge** ve **299 kullanıcı** ile çalışan tam bir üretim ortamı simüle eder.

### 🎯 Çözdüğü Problem

Spor perakende zincirleri tipik olarak şu problemlerle boğuşur:
- 🔥 Yüksek personel devir hızı → tekrarlayan eğitim ihtiyacı
- 📉 KPI düşüşlerinin geç fark edilmesi
- 📚 Eğitim ile performans arasındaki kopukluk
- 🏢 Mağazalar arası bilgi paylaşımının zayıflığı
- 📱 Mobil çalışan için yetersiz dijital deneyim

Sporthink platformu bu sorunları **veri-odaklı, AI destekli ve oyunlaştırılmış** bir sistemle çözer.

---

## ✨ Özellikler

### 🤖 Yapay Zeka

| Özellik | Açıklama |
|---|---|
| **AI Müşteri Roleplay** | Gemini 2.0 ile gerçek diyalog kuran AI müşteri — empati, ürün bilgisi, çapraz satış ve kapanış becerilerini 0-100 puanlar |
| **Anomali Tespiti** | KPI'larda ani düşüş/yükselişleri otomatik yakalar, severity (HIGH/MEDIUM/LOW) ile sınıflandırır |
| **Akıllı Eğitim Önerisi** | Anomali olan KPI'ya göre çalışana uygun eğitimi otomatik atar (örn. UPT düşüşü → Çapraz Satış eğitimi) |
| **AI Asistan** | Role-aware chatbot — eğitim sorularını içerik bağlamında cevaplar |

### 📚 Eğitim & Sınav

- 10 eğitim, 10 sınav, **1280+ atama**, 200+ deneme
- Çok bölümlü eğitim içeriği (text/file/video/image)
- Çoktan seçmeli + Doğru/Yanlış + Senaryo soruları
- Otomatik tekrar atama (başarısız sınav → 1 hafta sonra yeni atama)
- Sertifika sistemi

### 📊 KPI & Performans

- **17 KPI tanımı** (Aylık Ciro, UPT, MDO, ATV, ASP, Fatura Adedi, Tekli Fatura Oranı, vb.)
- Gerçek Excel'den (`PERAKENDE KPI GÜNCEL.xlsx`) yüklenmiş veri
- Mağaza-seviyesi + personel-seviyesi KPI takibi
- Trend grafikleri (Chart.js)
- Mağaza karşılaştırma

### 🎮 Oyunlaştırma

- **Global XP Sistemi** (Çaylak → Acemi → Uzman → Profesyonel → Usta → Efsane)
- **14 Rozet** (Bronz/Gümüş/Altın/Platin tier)
- Multi-scope liderlik tablosu (Mağazam / Bölgem / Türkiye)
- 🥇🥈🥉 Podyum görselleştirme

### 🏟️ Mağaza Ligi

- Sezon bazlı yarışma (Q1, Q2, Q3, Q4)
- Skor formülü: Eğitim **%30** + KPI **%40** + Müşteri Memnuniyeti **%20** + Sınav **%10**
- Top 3 mağaza için podyum + madalya
- Drill-down skor detayı

### 💼 İK Operasyonel

- **Vardiya Planlama** — haftalık takvim, 4 vardiya tipi (Sabah/Akşam/Tam/Gece)
- **İzin Yönetimi** — 6 izin tipi, otomatik bakiye, hafta sonu hesaplama, onay/red workflow
- **Çalışan Profili** — gelişim dosyası, 3 kategori geri bildirim (Pozitif/Yapıcı/Odaklanmış)
- **Yönetici Notları** — performans değerlendirme notları

### 🎭 Satış Simülasyonu

- 5 kategori: Müşteri Karşılama, Ürün Önerme, İtiraz, Ek Satış, İade & Şikayet
- Klasik mod (çoktan seçmeli) + AI mod (Gemini chat)
- 4 beceri puanlama: Empati, Ürün Bilgisi, Çapraz Satış, Kapanış
- Tüm beceri tipleri için ayrı rozet

### 📱 PWA & Mobil

- **Yüklenebilir Web Uygulaması** (Manifest + Service Worker)
- **Push Bildirimleri** (Web Push API + VAPID)
- Offline destekli (network-first + stale-while-revalidate)
- Mobile-responsive tüm sayfalar

### 💬 Topluluk & İletişim

- **Nabız Anketi** — anonim çalışan memnuniyeti + çok seçmeli poll
- **Topluluk Gönderileri** — TIPS, QUESTION, ANNOUNCEMENT, SUCCESS_STORY
- **Geri Bildirim Yönetimi** — 10 tip, 4 öncelik, 5 durum
- **Bildirim Merkezi** — gradient header, animasyonlu boş durum

### 🔐 Güvenlik & Yönetim

- 5-rollü RBAC (Super Admin / Bölge Müdürü / Mağaza Müdürü / Müdür Yardımcısı / Çalışan)
- NextAuth.js JWT session
- BCrypt şifre hashing
- Audit log (her kritik aksiyon kaydı)
- Role-based UI ve API koruması

---

## 🛠️ Teknoloji Yığını

### Frontend
- **[Next.js 16.1](https://nextjs.org/)** — App Router, Server Components, Turbopack
- **[React 19](https://react.dev/)** — Server + Client Components hybrid
- **[TypeScript 5](https://www.typescriptlang.org/)** — Tam tip güvenliği
- **[Chart.js 4](https://www.chartjs.org/)** — KPI grafikleri
- **CSS** — Glass-morphism, Cinematic animations (custom)

### Backend
- **[Prisma 5](https://www.prisma.io/)** — ORM, type-safe DB
- **[SQLite](https://www.sqlite.org/)** (dev) → **PostgreSQL** (production hazır)
- **[NextAuth.js](https://next-auth.js.org/)** — Authentication
- **[bcryptjs](https://www.npmjs.com/package/bcryptjs)** — Şifre hashing

### AI & Entegrasyon
- **[Google Gemini 2.0](https://ai.google.dev/)** — `gemini-2.0-flash` (chat, evaluation, vision)
- **[web-push](https://www.npmjs.com/package/web-push)** — VAPID push notifications

### Data
- **[xlsx (SheetJS)](https://sheetjs.com/)** — Excel import/export
- **[jsPDF](https://github.com/parallax/jsPDF)** — PDF rapor
- **[html2canvas](https://html2canvas.hertzen.com/)** — Screenshot
- **[json2csv](https://www.npmjs.com/package/json2csv)** — CSV export

### Dev Tools
- **[ESLint](https://eslint.org/)** + **[TypeScript ESLint](https://typescript-eslint.io/)**
- **[Prisma Studio](https://www.prisma.io/studio)** — DB GUI

---

## 🚀 Kurulum

### Önkoşullar

- **Node.js** 18.17+ ([İndir](https://nodejs.org/))
- **npm** veya **yarn**
- **Google Gemini API Key** ([Ücretsiz al](https://aistudio.google.com/apikey))

### Adım Adım

```bash
# 1. Repo'yu klonla
git clone https://github.com/KeremOren/Sporthink.git
cd Sporthink

# 2. Bağımlılıkları yükle
npm install

# 3. Environment dosyasını oluştur
cp .env.example .env
# .env'yi editle ve değerleri doldur (Gemini API key, VAPID keys, NextAuth secret)

# 4. Veritabanını oluştur
npx prisma db push

# 5. Demo verileri yükle (21 mağaza, 299 kullanıcı, 14 rozet, vs.)
node prisma/seed.js

# 6. Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcı aç → **http://localhost:3000**

### VAPID Keys Üretimi (Push Notification için)

```bash
npx web-push generate-vapid-keys
```

Üretilen anahtarları `.env`'ye yapıştır:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@yourdomain.com"
```

---

## 👥 Demo Hesaplar

Seed çalıştırıldıktan sonra hazır gelen test hesapları:

| Rol | Email | Şifre |
|---|---|---|
| 👑 **Super Admin** | `admin@sporthink.com` | `admin123` |
| 🌍 **Bölge Müdürü (İzmir)** | `bolge.izmir@sporthink.com` | `rm123` |
| 🌍 **Bölge Müdürü (Ege)** | `bolge.ege@sporthink.com` | `rm123` |
| 🌍 **Bölge Müdürü (Akdeniz)** | `bolge.akdeniz@sporthink.com` | `rm123` |
| 🏪 **Mağaza Müdürü** | `ece.ekinci.647@sporthink.com` | `sm123` |
| 🤝 **Müdür Yardımcısı** | `ceren.ekinci.867@sporthink.com` | `am123` |
| 👤 **Çalışan** | `sinem.ozkan.1111@sporthink.com` | `emp123` |

---

## 🏗️ Mimari

```
sporthink/
├── prisma/
│   ├── schema.prisma          # Veritabanı şeması (40+ model)
│   ├── seed.js                # Demo data yükleyici (Excel'den okuyor)
│   └── dev.db                 # SQLite (gitignore'da)
│
├── public/
│   ├── icons/                 # PWA ikonları (8 boyut)
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (cache + push)
│   └── trainings/             # Eğitim PDF'leri
│
├── src/
│   ├── app/
│   │   ├── api/               # API routes (60+ endpoint)
│   │   │   ├── ai/            # Gemini AI endpoints
│   │   │   ├── gamification/  # XP/Badge/Leaderboard
│   │   │   ├── insights/      # AI anomaly + recommendation
│   │   │   ├── league/        # Mağaza ligi
│   │   │   ├── leaves/        # İzin yönetimi
│   │   │   ├── shifts/        # Vardiya yönetimi
│   │   │   ├── push/          # Web Push API
│   │   │   └── ...
│   │   │
│   │   ├── dashboard/         # Ana panel
│   │   ├── trainings/         # Eğitim sayfaları
│   │   ├── quizzes/           # Sınav
│   │   ├── kpi/               # KPI yönetimi
│   │   ├── simulations/       # Satış simülasyonu
│   │   ├── achievements/      # XP & Rozet galerisi
│   │   ├── league/            # Mağaza ligi
│   │   ├── shifts/            # Vardiya planlama
│   │   ├── leaves/            # İzin yönetimi
│   │   ├── insights/          # AI içgörüler
│   │   ├── ai-assistant/      # AI chatbot
│   │   ├── community/         # Topluluk
│   │   ├── pulse/             # Nabız anketi
│   │   └── ...
│   │
│   ├── components/
│   │   ├── layout/Sidebar.tsx
│   │   ├── pwa/               # PWA installer + push toggle
│   │   ├── quiz/QuizModal.tsx
│   │   ├── training/TrainingViewer.tsx
│   │   └── ui/                # Toast, Skeleton, NotificationBell, etc.
│   │
│   └── lib/
│       ├── auth.ts            # NextAuth config
│       ├── prisma.ts          # Prisma client singleton
│       ├── rbac.ts            # Rol tabanlı erişim + nav items
│       └── gamification.ts    # XP/Badge logic
│
├── PERAKENDE KPI GÜNCEL.xlsx  # Gerçek KPI verisi
└── Personel Detay/            # Gerçek personel verisi
```

---

## 📊 Veritabanı Modelleri

40+ model, 12 ana kategori:

| Kategori | Modeller |
|---|---|
| 🏢 **Organization** | `Region`, `Store`, `User` |
| 📚 **Training** | `Training`, `TrainingContent`, `TrainingAssignment` |
| 🎯 **Quiz** | `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAnswer` |
| 📊 **KPI** | `KpiDefinition`, `KpiEntry` |
| 💬 **Feedback** | `Feedback`, `FeedbackComment`, `FeedbackLog` |
| 🗳️ **Survey** | `PulseSurvey`, `PulseSurveyResponse` |
| 💬 **Community** | `CommunityPost`, `CommunityComment` |
| 🎭 **Simulation** | `SimScenario`, `SimAttempt` |
| 📅 **HR** | `Shift`, `ShiftSwap`, `LeaveRequest`, `LeaveBalance` |
| 🏆 **Gamification** | `XpTransaction`, `Badge`, `UserBadge` |
| 🏟️ **League** | `Season`, `LeagueScore` |
| 🔔 **System** | `AuditLog`, `ManagerNote`, `PushSubscription` |

---

## 📈 İstatistikler (Seed Sonrası)

| Veri | Adet |
|---|---|
| Bölge | 3 |
| Mağaza | 21 |
| Kullanıcı | 299 (1 admin + 3 RM + 14 SM + 11 AM + 270 çalışan) |
| Eğitim | 10 |
| Eğitim Ataması | 1.280 |
| Sınav Denemesi | 199 |
| KPI Tanımı | 17 |
| KPI Girişi | 1.458 mağaza + 1.016 personel |
| Rozet | 14 |
| XP İşlemi | 765 |
| Vardiya | 764 (3 haftalık) |
| İzin Talebi | 35 |
| Mağaza Ligi Skoru | 21 |

---

## 🗺️ Yol Haritası

### ✅ Tamamlanan (Faz 1)
- [x] Core platform (auth, RBAC, training, quiz, KPI)
- [x] AI Asistan + AI Roleplay + Anomali Tespiti
- [x] PWA + Push Notifications
- [x] Vardiya + İzin Yönetimi
- [x] Global XP + Rozet Sistemi
- [x] Mağaza Ligi

### 🚧 Devam Eden (Faz 2)
- [ ] PostgreSQL'e geçiş (production)
- [ ] KVKK uyumluluk modülü
- [ ] 2FA + güçlü şifre politikası
- [ ] Email digest (haftalık)

### 🔮 Planlanan (Faz 3)
- [ ] Logo İK / Mikro entegrasyonu
- [ ] WhatsApp Business API entegrasyonu
- [ ] e-İmza ile izin/onay süreçleri
- [ ] Vitrin foto AI skorlama (Gemini Vision)
- [ ] Müşteri NPS (QR kod ile)
- [ ] Excel/PDF export tüm sayfalarda
- [ ] Yıllık performans değerlendirme (360°)

---

## 🔒 Güvenlik

- ⚠️ `.env` dosyası **asla** git'e commit edilmez
- ⚠️ Demo şifreler **sadece geliştirme** içindir
- ⚠️ Production'da:
  - Güçlü `NEXTAUTH_SECRET` üret
  - HTTPS zorunlu
  - Database bağlantısı encrypt edilmeli
  - VAPID private key gizli kalmalı

---

## 📷 Ekran Görüntüleri

> _Ekran görüntüleri yakında eklenecek._

Yapay zeka destekli **insights** sayfası, oyunlaştırılmış **achievements** ekranı, drag-friendly **shift planning** ve canlı **mağaza ligi** podyumu — tüm UI'lar **glass-morphism** ve **cinematic animations** ile zenginleştirilmiştir.

---

## 📜 Lisans

Bu proje **bitirme projesi** kapsamında geliştirilmiş olup **Dokuz Eylül Üniversitesi YBS** bölümüne aittir. Ticari kullanım Sporthink ile yapılacak anlaşmaya bağlıdır.

---

## 👨‍💻 Geliştirici

**Kerem Ören**
- 🎓 Dokuz Eylül Üniversitesi — Yönetim Bilişim Sistemleri
- 📧 kerem.oren@outlook.com
- 🔗 [GitHub](https://github.com/KeremOren)

---

## 🙏 Teşekkürler

- **Sporthink** — gerçek perakende verisi paylaşımı için
- **Google Gemini API** — AI özellikleri için
- **Next.js & Prisma ekipleri** — harika developer experience
- **Açık kaynak topluluğu** — Chart.js, NextAuth, xlsx, vb.

---

<div align="center">

**⭐ Faydalı bulduysanız star vermeyi unutmayın!**

Made with ❤️ in İzmir, Türkiye

</div>
