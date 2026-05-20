const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database with REAL data...');

    // Clean existing data (order matters for FK constraints)
    // Gamification + HR (new)
    if (prisma.leagueScore) await prisma.leagueScore.deleteMany();
    if (prisma.season) await prisma.season.deleteMany();
    if (prisma.userBadge) await prisma.userBadge.deleteMany();
    if (prisma.badge) await prisma.badge.deleteMany();
    if (prisma.xpTransaction) await prisma.xpTransaction.deleteMany();
    if (prisma.leaveRequest) await prisma.leaveRequest.deleteMany();
    if (prisma.leaveBalance) await prisma.leaveBalance.deleteMany();
    if (prisma.shiftSwap) await prisma.shiftSwap.deleteMany();
    if (prisma.shift) await prisma.shift.deleteMany();
    if (prisma.pushSubscription) await prisma.pushSubscription.deleteMany();
    // Existing
    await prisma.communityComment.deleteMany();
    await prisma.communityPost.deleteMany();
    await prisma.pulseSurveyResponse.deleteMany();
    await prisma.pulseSurvey.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.managerNote.deleteMany();
    await prisma.feedbackLog.deleteMany();
    await prisma.feedbackComment.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.kpiEntry.deleteMany();
    await prisma.kpiDefinition.deleteMany();
    await prisma.quizAnswer.deleteMany();
    await prisma.quizAttempt.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.trainingAssignment.deleteMany();
    await prisma.trainingContent.deleteMany();
    await prisma.training.deleteMany();
    if (prisma.simAttempt) await prisma.simAttempt.deleteMany();
    if (prisma.simScenario) await prisma.simScenario.deleteMany();
    await prisma.user.deleteMany();
    await prisma.store.deleteMany();
    await prisma.region.deleteMany();

    const hash = (pw) => bcrypt.hashSync(pw, 10);
    const daysAgo = (d) => new Date(Date.now() - d * 86400000);
    const monthsAgo = (m) => { const d = new Date(); d.setMonth(d.getMonth() - m); return d; };
    const periodStr = (m) => { const d = monthsAgo(m); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

    // =====================================================================
    // READ EXCEL — Personel Detay.xlsx
    // =====================================================================
    const xlsPath = path.join(__dirname, '..', 'Personel Detay', 'Personel Detay.xlsx');
    const wb = XLSX.readFile(xlsPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    // Skip header row (index 1), data starts at index 2
    const personnel = [];
    for (let i = 2; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || !r[2]) continue; // skip empty rows
        personnel.push({
            sicilNo: String(r[1] || ''),
            fullName: String(r[2] || '').trim(),
            title: String(r[3] || '').trim(),
            hireDate: String(r[4] || ''),
            leaveDate: r[5] ? String(r[5]) : null,
            workType: String(r[6] || '').trim(), // FT or PT
            storeName: String(r[7] || '').trim(),
        });
    }
    console.log(`  📄 Excel okundu: ${personnel.length} personel kaydı`);

    // =====================================================================
    // REGIONS (3)
    // =====================================================================
    const regionIzmir = await prisma.region.create({ data: { id: uuidv4(), name: 'İzmir Bölgesi', code: 'IZM' } });
    const regionEge = await prisma.region.create({ data: { id: uuidv4(), name: 'Ege Bölgesi', code: 'EGE' } });
    const regionAkdeniz = await prisma.region.create({ data: { id: uuidv4(), name: 'Akdeniz Bölgesi', code: 'AKD' } });
    console.log('  ✓ 3 bölge oluşturuldu');

    // =====================================================================
    // STORES (17) — from Excel unique store names
    // =====================================================================
    const storeRegionMap = {
        // İzmir Bölgesi (11)
        'Optimum Sporthink Mağaza': regionIzmir.id,
        'Optimum Hummel Mağaza': regionIzmir.id,
        'Park Bornova Sporthink Mağaza': regionIzmir.id,
        'Buca Sporthink Mağaza': regionIzmir.id,
        'Şirinyer Sporthink Mağaza': regionIzmir.id,
        'Selway Sporthink Mağaza': regionIzmir.id,
        'Westpark Sporthink Mağaza': regionIzmir.id,
        'Westpark Hummel Mağaza': regionIzmir.id,
        'Seferihisar Renna Sporthink Mağaza': regionIzmir.id,
        'Menemen Novada Sporthink Mağaza': regionIzmir.id,
        'Çiğli Kipa Çadır Mağaza': regionIzmir.id,
        // Ege Bölgesi (9)
        'Akhisar Novada Sporthink Mağaza': regionEge.id,
        'Salihli Luna Sporthink Mağaza': regionEge.id,
        'Söke Novada Sporthink Mağaza': regionEge.id,
        'Söke Novada Çadır Mağaza': regionEge.id,
        'Denizli Teraspark Mağaza': regionEge.id,
        'Edremit Novada Mağaza': regionEge.id,
        'Bozüyük Sporthink Mağaza': regionEge.id,
        'Kuşadası Mağaza': regionEge.id,
        'Muğla Festiva Sporthink Mağaza': regionEge.id,
        // Akdeniz Bölgesi (1)
        'Mall Of Antalya Sporthink Mağaza': regionAkdeniz.id,
    };

    const storeCodeMap = {
        'Optimum Sporthink Mağaza': 'IZM-OPT-S',
        'Optimum Hummel Mağaza': 'IZM-OPT-H',
        'Park Bornova Sporthink Mağaza': 'IZM-BOR',
        'Buca Sporthink Mağaza': 'IZM-BUC',
        'Şirinyer Sporthink Mağaza': 'IZM-SIR',
        'Selway Sporthink Mağaza': 'IZM-SEL',
        'Westpark Sporthink Mağaza': 'IZM-WP-S',
        'Westpark Hummel Mağaza': 'IZM-WP-H',
        'Seferihisar Renna Sporthink Mağaza': 'IZM-SEF',
        'Menemen Novada Sporthink Mağaza': 'IZM-MEN',
        'Akhisar Novada Sporthink Mağaza': 'EGE-AKH',
        'Salihli Luna Sporthink Mağaza': 'EGE-SAL',
        'Söke Novada Sporthink Mağaza': 'EGE-SOK-S',
        'Söke Novada Çadır Mağaza': 'EGE-SOK-C',
        'Denizli Teraspark Mağaza': 'EGE-DEN',
        'Edremit Novada Mağaza': 'EGE-EDR',
        'Bozüyük Sporthink Mağaza': 'EGE-BOZ',
        'Kuşadası Mağaza': 'EGE-KUS',
        'Muğla Festiva Sporthink Mağaza': 'EGE-MUG',
        'Çiğli Kipa Çadır Mağaza': 'IZM-CIG-C',
        'Mall Of Antalya Sporthink Mağaza': 'AKD-ANT',
    };

    const storeAddressMap = {
        'Optimum Sporthink Mağaza': 'Optimum AVM, Balçova, İzmir',
        'Optimum Hummel Mağaza': 'Optimum AVM, Balçova, İzmir',
        'Park Bornova Sporthink Mağaza': 'Park Bornova AVM, Bornova, İzmir',
        'Buca Sporthink Mağaza': 'Buca, İzmir',
        'Şirinyer Sporthink Mağaza': 'Şirinyer, Buca, İzmir',
        'Selway Sporthink Mağaza': 'Selway AVM, İzmir',
        'Westpark Sporthink Mağaza': 'Westpark AVM, İzmir',
        'Westpark Hummel Mağaza': 'Westpark AVM, İzmir',
        'Seferihisar Renna Sporthink Mağaza': 'Renna AVM, Seferihisar, İzmir',
        'Menemen Novada Sporthink Mağaza': 'Novada AVM, Menemen, İzmir',
        'Akhisar Novada Sporthink Mağaza': 'Novada AVM, Akhisar, Manisa',
        'Salihli Luna Sporthink Mağaza': 'Luna AVM, Salihli, Manisa',
        'Söke Novada Sporthink Mağaza': 'Novada AVM, Söke, Aydın',
        'Söke Novada Çadır Mağaza': 'Novada AVM Çadır, Söke, Aydın',
        'Denizli Teraspark Mağaza': 'Teraspark AVM, Denizli',
        'Edremit Novada Mağaza': 'Novada AVM, Edremit, Balıkesir',
        'Bozüyük Sporthink Mağaza': 'Bozüyük, Bilecik',
        'Kuşadası Mağaza': 'Kuşadası, Aydın',
        'Muğla Festiva Sporthink Mağaza': 'Festiva AVM, Muğla',
        'Çiğli Kipa Çadır Mağaza': 'Çiğli Kipa AVM Çadır, İzmir',
        'Mall Of Antalya Sporthink Mağaza': 'Mall of Antalya AVM, Antalya',
    };

    const storeDbMap = {};
    for (const [name, regionId] of Object.entries(storeRegionMap)) {
        const store = await prisma.store.create({
            data: {
                id: uuidv4(),
                name,
                code: storeCodeMap[name] || name.substring(0, 8).toUpperCase(),
                regionId,
                address: storeAddressMap[name] || '',
            },
        });
        storeDbMap[name] = store;
    }
    console.log(`  ✓ ${Object.keys(storeDbMap).length} mağaza oluşturuldu`);

    // =====================================================================
    // SUPER ADMIN
    // =====================================================================
    const admin = await prisma.user.create({
        data: { id: uuidv4(), email: 'admin@sporthink.com', password: hash('admin123'), firstName: 'Admin', lastName: 'Sporthink', role: 'SUPER_ADMIN', hireDate: new Date('2018-01-01') },
    });

    // =====================================================================
    // REGIONAL MANAGERS (3) — created as system users
    // =====================================================================
    const rmIzmir = await prisma.user.create({
        data: { id: uuidv4(), email: 'bolge.izmir@sporthink.com', password: hash('rm123'), firstName: 'İzmir', lastName: 'Bölge Müdürü', role: 'REGIONAL_MANAGER', regionId: regionIzmir.id, hireDate: new Date('2019-01-01') },
    });
    const rmEge = await prisma.user.create({
        data: { id: uuidv4(), email: 'bolge.ege@sporthink.com', password: hash('rm123'), firstName: 'Ege', lastName: 'Bölge Müdürü', role: 'REGIONAL_MANAGER', regionId: regionEge.id, hireDate: new Date('2019-01-01') },
    });
    const rmAkdeniz = await prisma.user.create({
        data: { id: uuidv4(), email: 'bolge.akdeniz@sporthink.com', password: hash('rm123'), firstName: 'Akdeniz', lastName: 'Bölge Müdürü', role: 'REGIONAL_MANAGER', regionId: regionAkdeniz.id, hireDate: new Date('2019-06-01') },
    });

    // =====================================================================
    // USERS FROM EXCEL — real personnel
    // =====================================================================
    function titleToRole(title) {
        if (title === 'Mağaza Müdürü') return 'STORE_MANAGER';
        if (title === 'Mağaza Müdür Yardımcısı') return 'ASSISTANT_MANAGER';
        return 'EMPLOYEE';
    }

    function generateEmail(fullName, sicilNo) {
        const parts = fullName.toLowerCase()
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
            .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
            .replace(/Ç/g, 'c').replace(/Ğ/g, 'g').replace(/İ/g, 'i')
            .replace(/Ö/g, 'o').replace(/Ş/g, 's').replace(/Ü/g, 'u')
            .split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0]}.${parts[parts.length - 1]}${sicilNo ? '.' + sicilNo : ''}@sporthink.com`;
        }
        return `${parts[0]}${sicilNo ? '.' + sicilNo : ''}@sporthink.com`;
    }

    function parseDate(dateStr) {
        if (!dateStr) return null;
        // Format: DD.MM.YYYY
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(dateStr);
    }

    function getPasswordForRole(role) {
        if (role === 'STORE_MANAGER') return hash('sm123');
        if (role === 'ASSISTANT_MANAGER') return hash('am123');
        return hash('emp123');
    }

    const allUsers = [];
    const storeManagers = [];
    const assistantManagers = [];
    const employees = [];
    const emailSet = new Set(['admin@sporthink.com', 'bolge.izmir@sporthink.com', 'bolge.ege@sporthink.com', 'bolge.akdeniz@sporthink.com']);
    let activeCount = 0, inactiveCount = 0;

    for (const p of personnel) {
        const isActive = !p.leaveDate;
        const role = titleToRole(p.title);
        const store = storeDbMap[p.storeName];
        if (!store) {
            console.log(`  ⚠ Mağaza bulunamadı: ${p.storeName} (${p.fullName})`);
            continue;
        }

        let email = generateEmail(p.fullName, p.sicilNo);
        // Ensure unique
        if (emailSet.has(email)) {
            email = email.replace('@', `.${Date.now()}@`);
        }
        emailSet.add(email);

        const nameParts = p.fullName.split(/\s+/);
        const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
        const lastName = nameParts[nameParts.length - 1] || '';

        const user = await prisma.user.create({
            data: {
                id: uuidv4(),
                email,
                password: getPasswordForRole(role),
                firstName,
                lastName,
                role,
                storeId: store.id,
                regionId: store.regionId,
                isActive,
                hireDate: parseDate(p.hireDate),
            },
        });

        allUsers.push(user);
        if (role === 'STORE_MANAGER') storeManagers.push(user);
        else if (role === 'ASSISTANT_MANAGER') assistantManagers.push(user);
        else employees.push(user);
        if (isActive) activeCount++; else inactiveCount++;
    }
    console.log(`  ✓ ${allUsers.length} personel oluşturuldu (${activeCount} aktif, ${inactiveCount} ayrılmış)`);
    console.log(`    → ${storeManagers.length} Mağaza Müdürü, ${assistantManagers.length} Müdür Yardımcısı, ${employees.length} Çalışan`);

    // =====================================================================
    // TRAININGS (8) — Sporthink retail training program
    // =====================================================================
    const trainingsData = [
        { title: 'Mağaza Güvenliği ve İş Sağlığı', description: 'Tüm çalışanlar için zorunlu güvenlik eğitimi. İş kazaları, yangın güvenliği ve acil durum prosedürleri.', category: 'Güvenlik', type: 'MANDATORY', durationMinutes: 60 },
        { title: 'Müşteri İlişkileri ve Satış Teknikleri', description: 'Nike, Adidas, Puma gibi premium markalarda müşteri karşılama, ihtiyaç analizi, çapraz satış ve şikayet yönetimi.', category: 'Satış', type: 'MANDATORY', durationMinutes: 45 },
        { title: 'Ürün Bilgisi — Nike & Adidas Koşu Serisi', description: 'Nike Air Max, React, Pegasus ve Adidas Ultraboost, Supernova serilerinin teknik özellikleri, pronasyon analizi ve doğru beden/model önerisi.', category: 'Ürün', type: 'OPTIONAL', durationMinutes: 30 },
        { title: 'Kasa ve POS Sistemi Kullanımı', description: 'Kasa açma/kapama, iade işlemleri, fatura kesimi ve kampanya uygulama eğitimi.', category: 'Operasyon', type: 'MANDATORY', durationMinutes: 40 },
        { title: 'Ürün Bilgisi — Outdoor & Lifestyle', description: 'The North Face, Columbia, Salomon outdoor ekipmanları ve Crocs, Birkenstock, Skechers lifestyle ürünlerinin teknik özellikleri.', category: 'Ürün', type: 'OPTIONAL', durationMinutes: 45 },
        { title: 'Stok Yönetimi ve Depo Düzeni', description: 'Stok sayım teknikleri, FIFO uygulaması, sezon geçişi yönetimi ve envanter optimizasyonu.', category: 'Operasyon', type: 'MANDATORY', durationMinutes: 50 },
        { title: 'Ürün Bilgisi — Hummel & Spor Giyim', description: 'Hummel koleksiyonu, Puma, Converse, Vans sneaker serisi ve Jack&Jones, Mavi, Levis casual giyim ürünleri hakkında detaylı bilgi.', category: 'Ürün', type: 'OPTIONAL', durationMinutes: 35 },
        { title: 'Liderlik ve Mağaza Yönetimi', description: 'Mağaza müdürleri için vardiya planlama, performans değerlendirme, takım motivasyonu ve hedef yönetimi.', category: 'Yönetim', type: 'OPTIONAL', durationMinutes: 90 },
        // 📄 Sporthink Resmi PDF Eğitimleri
        { title: 'Sporthink Müşteri Karşılama Standartları', description: 'Sporthink resmi 6 adımlık müşteri karşılama ve memnuniyet eğitimi. Hoşgeldiniz → İletişime Geç → Doğru Aktarım → Kampanya & Ek Ürün → Satış Tamamlama → Uğurlama.', category: 'Satış', type: 'MANDATORY', durationMinutes: 45 },
        { title: 'Sporthink Alarm ve Etiket Standartları', description: 'Ürün kategorilerine göre alarm yerleşim prosedürleri (t-shirt, pantolon, mont, ayakkabı, terlik, çanta) ve etiketleme kuralları (kırmızı/beyaz sticker, barkod koruma).', category: 'Operasyon', type: 'MANDATORY', durationMinutes: 30 },
    ];

    const trainings = [];
    for (const t of trainingsData) {
        const training = await prisma.training.create({ data: { id: uuidv4(), ...t, createdById: admin.id } });
        trainings.push(training);
    }
    console.log(`  ✓ ${trainings.length} eğitim oluşturuldu`);

    // Training Content
    const contentSets = [
        [
            { type: 'TEXT', title: 'Giriş — İş Güvenliği Neden Önemli?', content: 'İş güvenliği hepimizin sorumluluğudur. Bu eğitimde mağazada karşılaşabileceğiniz riskleri ve önlemleri öğreneceksiniz.' },
            { type: 'TEXT', title: 'Yangın Güvenliği', content: 'Yangın çıkışlarını bilmek, yangın söndürücü kullanımı ve tahliye prosedürleri.' },
            { type: 'TEXT', title: 'İlk Yardım Temelleri', content: 'Temel ilk yardım müdahalesi: kesikler, yanıklar, düşmeler ve bilinç kaybı.' },
        ],
        [
            { type: 'TEXT', title: 'Müşteri Karşılama', content: 'İlk izlenim en önemli adımdır. Göz teması, gülümseme ve profesyonel hitap.' },
            { type: 'TEXT', title: 'İhtiyaç Analizi', content: 'Müşterinin ne aradığını anlamak için açık uçlu sorular sorun.' },
            { type: 'TEXT', title: 'Şikayet Yönetimi', content: 'Şikayetleri fırsata çevirin: DİNLEYİN → EMPATİ → ÇÖZÜM → TAKİP' },
        ],
        [
            { type: 'TEXT', title: 'Koşu Ayakkabısı Seçimi', content: 'Pronasyon analizi, zemin tipi ve koşu mesafesine göre doğru ayakkabı önerisi.' },
            { type: 'TEXT', title: 'Koşu Kıyafetleri', content: 'Mevsime göre katmanlı giyinme stratejisi ve malzeme seçimi.' },
        ],
        [
            { type: 'TEXT', title: 'Kasa Açma ve Kapama', content: 'Günlük kasa açma: devir teslim tutanağı, başlangıç meblağı kontrolü.' },
            { type: 'TEXT', title: 'İade ve Değişim İşlemleri', content: '14 gün içinde fatura ile iade hakkı. 500 TL üzeri müdür onayı gerekir.' },
        ],
        [], // 5 — Outdoor (içerik opsiyonel)
        [], // 6 — Stok Yönetimi (içerik opsiyonel)
        [], // 7 — Hummel (içerik opsiyonel)
        [], // 8 — Liderlik (içerik opsiyonel)
        // 📄 9 — Sporthink Müşteri Karşılama (PDF tabanlı)
        [
            { type: 'TEXT', title: 'Misyonumuz', content: 'Müşterilerimize mağazamıza adım attıkları an itibariyle, karşılama, güler yüz, ilgi ve alaka ile birlikte güven dolu ve benzersiz bir alışveriş konforu sağlamak.' },
            { type: 'TEXT', title: 'STEP 1 — Hoşgeldiniz', content: 'Müşteriler içeri girdiği ilk 7 saniye içinde satınalma kararının %80\'i oluşur. Mağazaya giren müşteriye göz göze gelerek hoşgeldiniz deyin.\n\nÖrnek kalıplar:\n• "Merhaba, hoş geldiniz! Size nasıl yardımcı olabilirim?"\n• "Merhaba hoş geldiniz! İlgilendiğiniz bir ürün var mıydı?"' },
            { type: 'TEXT', title: 'Güler Yüz ve Reyondaki Duruş', content: 'Müşteriyi sıcak bir gülümseme ile karşılayın.\n\n❌ Yapılmaması gerekenler:\n• Elleri cepte karşılama\n• Masa, rail veya ahtapota yaslanarak bekleme\n• Ayakkabı duvarının önünde sabit durma\n\n✅ Yapılması gerekenler:\n• Müşteri yoksa reyonu toplama veya envanter kontrolü' },
            { type: 'TEXT', title: 'STEP 2 — İletişime Geç', content: 'Müşterilere dikkatlice yaklaşın, ihtiyaçlarını dinleyin.\n\n❌ Kapalı uçlu soru: "Waterproof ayakkabı mı arıyorsunuz?" → Müşteri: EVET (konuşma biter)\n✅ Açık uçlu soru: "Waterproof ayakkabıyı nerede kullanacaksınız?" → Müşteri: "Likya yoluna gideceğim" (satış fırsatı!)' },
            { type: 'TEXT', title: 'STEP 3 — Doğru Aktarım', content: 'Sadece satış yapmak için değil, müşterinin ihtiyacına göre doğru ürünü sunun. Müşteri güven duyar ve kalıcı müşteri olur.' },
            { type: 'TEXT', title: 'STEP 4 — Kampanya ve Ek Ürün', content: 'Mevcut kampanyaları müşteriye bildirin. Satın aldığı ürünle birlikte kullanabileceği ek ürün önererek UPT (Units Per Transaction) oranını yükseltin.' },
            { type: 'TEXT', title: 'STEP 5 — Satış Tamamlama ve STEP 6 — Uğurlama', content: 'Satış tamamlanırken:\n• Müşteriye kasaya eşlik edin\n• Satışı kapatırken seçenekli soru sorun: "Siyah mı lacivert mi?"\n\nUğurlama:\n• Geri bildirim alın\n• Teşekkür edin, güler yüzle iyi günler dileyin' },
            { type: 'TEXT', title: '📎 PDF Doküman', content: 'Bu eğitimin orijinal PDF\'ini incelemek için: /trainings/musteri-karsilama.pdf' },
        ],
        // 📄 10 — Sporthink Alarm ve Etiket Standartları (PDF tabanlı)
        [
            { type: 'TEXT', title: 'Alarm Standartları — Giyim', content: '👕 T-Shirt: Yan taraf dikiş kısmından, iç etiket ile aynı hizada\n👖 Pantolon/Eşofman/Şort: Arka sol dikiş kısmından\n🧥 Ceket/Mont: Dikiş kısmından, iç etiket hizasında\n⚠️ 3-in-1 montlarda iç ürüne de ayrı alarm!\n👙 Sporcu Crop/Büstier: Dikiş noktası, alarm izi görünmeyecek kısım' },
            { type: 'TEXT', title: 'Alarm Standartları — Ayakkabı ve Aksesuar', content: '👟 Ayakkabı: Sol tek iç kısım, en üst bağcık deliğinden içeriden dışarıya (müşterinin göremeyeceği kısım)\n🩴 Terlik: İki tel alarm birleştirilerek iki çift birleştirilir — tek eşe alarm yapmak BİDEN KARIŞIKLIĞINA yol açar!\n👜 Çanta: Dikiş kısmından, ek parçalara (kılıf vb.) ayrı alarm\n🧢 Şapka: Dikiş kısmından, alarm izi görünmeyecek kısım' },
            { type: 'TEXT', title: 'Alarm Standartları — Özel Durumlar', content: '🏋️ Eşofman Takımı: Üst ve alt yan yana aynı hizaya getirilerek tek alarmla birleştirilir + her parçaya ayrı alarm = TOPLAMDA 3 ALARM\n🪢 Kemer: Uç kısmının ilk deliğinden alarm\n👥 Çift kemer: Tek alarm ile birbirine sabitleme' },
            { type: 'TEXT', title: 'Etiketleme Kuralları', content: '🔴 İndirimli ürünlerde KIRMIZI sticker\n⚪ İndirimsiz ürünlerde BEYAZ sticker\n\n❌ Orijinal barkod üzerine KESİNLİKLE etiket basılmaz\n❌ İndirimli teşhir ayakkabılarda yeni sezon pop kullanılmaz\n✅ Barkodu kopmuş ürüne Sporthink etiket kartına etiket basılır\n✅ Barkod boşluğu yoksa fiyat arka kısmına basılır' },
            { type: 'TEXT', title: 'Ayakkabı Pop ve Etiket Uygulaması', content: 'Teşhir ayakkabıda:\n• Pop uygulaması: Müşteriye bakan yüzde, bağcığın aşağıdan yukarıya 2. sırasına\n• Etiket: Arka taraf (iç kısım), üstten 2. bağcık sırasına' },
            { type: 'TEXT', title: '📎 PDF Doküman', content: 'Bu eğitimin orijinal PDF\'ini incelemek için: /trainings/alarm-etiket.pdf' },
        ],
    ];

    for (let t = 0; t < Math.min(contentSets.length, trainings.length); t++) {
        for (let s = 0; s < contentSets[t].length; s++) {
            await prisma.trainingContent.create({
                data: { id: uuidv4(), trainingId: trainings[t].id, ...contentSets[t][s], sortOrder: s + 1 },
            });
        }
    }
    console.log('  ✓ Eğitim içerikleri oluşturuldu');

    // Quizzes — 8 sınav, karışık soru tipleri (Nike/Adidas LMS, TalentLMS, perakende sektörü standartlarından ilham)
    // Tip: MULTIPLE_CHOICE, TRUE_FALSE, SCENARIO (senaryo | soru formatı)
    const quizzesData = [
        // 1. Mağaza Güvenliği (trainings[0])
        { trainingId: trainings[0].id, title: 'Mağaza Güvenliği Sınavı', passingScore: 70, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'Yangın sırasında asansör kullanılır mı?', options: ['Evet, en hızlı yol', 'Hayır, kesinlikle kullanılmaz', 'Sadece acil durumlarda', 'Müdür izniyle kullanılır'], correctAnswer: 'Hayır, kesinlikle kullanılmaz', points: 10 },
            { type: 'MULTIPLE_CHOICE', question: 'İlk yardım çantası mağazada nerede bulunmalıdır?', options: ['Sadece depo girişinde', 'Sadece kasa arkasında', 'Hem kasa arkası hem depo girişinde', 'Müdür odasında kilitli'], correctAnswer: 'Hem kasa arkası hem depo girişinde', points: 10 },
            { type: 'TRUE_FALSE', question: 'Mağaza içinde koşmak iş güvenliği açısından tehlikelidir.', correctAnswer: 'Doğru', points: 5 },
            { type: 'TRUE_FALSE', question: 'Yangın söndürücünün son kullanma tarihini kontrol etmek sadece müdürün görevidir.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'SCENARIO', question: 'Mağazada bir müşteri merdivenlerden düştü ve ayak bileğini tutuyor, acı çekiyor.|İlk olarak ne yapmalısınız?', options: ['Müşteriyi kaldırmaya çalışın', 'Sakin olmasını söyleyin, hareket ettirmeyin ve ilk yardım çantasını alıp müdürü arayın', 'Ambulansı arayın ve mağazayı kapatın', 'Hiçbir şey yapmayın, kendi halletsin'], correctAnswer: 'Sakin olmasını söyleyin, hareket ettirmeyin ve ilk yardım çantasını alıp müdürü arayın', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'Mağazada acil tahliye sırasında ilk yapılması gereken nedir?', options: ['Kasayı kilitlemek', 'Müşterileri sakin şekilde yönlendirmek', 'Eşyaları toplamak', 'Stok sayımı yapmak'], correctAnswer: 'Müşterileri sakin şekilde yönlendirmek', points: 10 },
            { type: 'TRUE_FALSE', question: 'Islak zemin uyarı levhası zemin kurumadan kaldırılabilir.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: '25 kg üzeri yük kaldırmada doğru olan nedir?', options: ['Tek başına hızlıca kaldır', 'Yardım iste veya transpalet kullan', 'Bırak, senin işin değil', 'Sırtınla taşı'], correctAnswer: 'Yardım iste veya transpalet kullan', points: 10 },
        ]},
        // 2. Müşteri İlişkileri ve Satış Teknikleri (trainings[1])
        { trainingId: trainings[1].id, title: 'Müşteri İlişkileri ve Satış Sınavı', passingScore: 60, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'Müşteri mağazaya girdiğinde kaç saniye içinde selamlanmalıdır?', options: ['30 saniye', '60 saniye', '10 saniye', '5 dakika'], correctAnswer: '10 saniye', points: 10 },
            { type: 'SCENARIO', question: 'Bir müşteri Nike koşu ayakkabısı almak istiyor ama hangi modeli seçeceğinden emin değil. "Koşuya yeni başladım" diyor.|Müşteriye ilk sorunuz ne olmalıdır?', options: ['"Bütçeniz ne kadar?"', '"Haftada kaç gün, ne kadar süre koşacaksınız ve zemininiz ne? (asfalt/arazi)"', '"En pahalı modeli alın"', '"Nike Pegasus alın, herkes onu alıyor"'], correctAnswer: '"Haftada kaç gün, ne kadar süre koşacaksınız ve zemininiz ne? (asfalt/arazi)"', points: 15 },
            { type: 'TRUE_FALSE', question: 'Müşteriye "Yardımcı olabilir miyim?" sorusu yerine aktivite bazlı soru sormak daha etkilidir.', correctAnswer: 'Doğru', points: 5 },
            { type: 'SCENARIO', question: 'Müşteri Adidas Ultraboost aldı ve kasaya gidiyor.|Çapraz satış için en uygun öneri nedir?', options: ['Birkenstock terlik', 'Adidas koşu çorabı ve koşu şortu', 'Levis jean pantolon', 'Hiçbir şey önermem, satış tamam'], correctAnswer: 'Adidas koşu çorabı ve koşu şortu', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'Ürün stokta yoksa müşteriye ne söylemelisiniz?', options: ['"Yok"', '"Başka mağazamızda veya sporthink.com.tr\'de mevcut, sizin için ayırtabilirim"', '"İnternetten bakın"', '"Bilmiyorum"'], correctAnswer: '"Başka mağazamızda veya sporthink.com.tr\'de mevcut, sizin için ayırtabilirim"', points: 10 },
            { type: 'TRUE_FALSE', question: 'Zor bir müşteri ile tartışmak satış başarısını artırır.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Şikayet yönetiminde doğru sıralama hangisidir?', options: ['Çözüm → Dinle → Kayıt', 'Dinle → Empati → Çözüm → Takip', 'Yönlendir → Kayıt → Dinle', 'Kayıt → Çözüm → Gönder'], correctAnswer: 'Dinle → Empati → Çözüm → Takip', points: 10 },
        ]},
        // 3. Nike & Adidas Koşu Serisi (trainings[2])
        { trainingId: trainings[2].id, title: 'Nike & Adidas Ürün Bilgisi Sınavı', passingScore: 60, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'Nike Pegasus hangi tip koşucu için tasarlanmıştır?', options: ['Sadece profesyonel maratoncu', 'Günlük antrenman koşucusu, nötr pronasyon', 'Sadece sprint koşucusu', 'Yürüyüş yapanlar'], correctAnswer: 'Günlük antrenman koşucusu, nötr pronasyon', points: 10 },
            { type: 'MULTIPLE_CHOICE', question: 'Adidas Ultraboost ayakkabıdaki "Boost" teknolojisi ne sağlar?', options: ['Su geçirmezlik', 'Enerji geri dönüşü ve yastıklama', 'Daha sıkı beden kalıbı', 'GPS takibi'], correctAnswer: 'Enerji geri dönüşü ve yastıklama', points: 10 },
            { type: 'TRUE_FALSE', question: 'Nike Air Max serisinde görünür Air yastıklama birimi bulunur.', correctAnswer: 'Doğru', points: 5 },
            { type: 'TRUE_FALSE', question: 'Koşu ayakkabısı 200 km sonra değiştirilmelidir.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'SCENARIO', question: 'Bir müşteri düz tabanlı olduğunu ve koşarken ayak bileğinin içe doğru yattığını söylüyor (over-pronasyon).|Hangi tip ayakkabı önerirsiniz?', options: ['Neutral (Nötr) - örn. Nike Pegasus', 'Stability (Destek) - örn. Adidas Adistar veya Nike Structure', 'Barefoot (Yalınayak)', 'Racing flat'], correctAnswer: 'Stability (Destek) - örn. Adidas Adistar veya Nike Structure', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'Adidas Samba ve Gazelle hangi kategoridedir?', options: ['Koşu', 'Basketbol', 'Lifestyle/Retro Sneaker', 'Outdoor'], correctAnswer: 'Lifestyle/Retro Sneaker', points: 10 },
            { type: 'TRUE_FALSE', question: 'Adidas Ultraboost hem koşu hem günlük kullanıma uygundur.', correctAnswer: 'Doğru', points: 5 },
        ]},
        // 4. Kasa ve POS Sistemi (trainings[3])
        { trainingId: trainings[3].id, title: 'Kasa ve POS Sistemi Sınavı', passingScore: 80, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'İade işlemlerinde müdür onayı ne zaman gereklidir?', options: ['Her iade işleminde', '500 TL ve üzeri iadelerde', '1000 TL ve üzeri iadelerde', 'Müdür onayı gerekmez'], correctAnswer: '500 TL ve üzeri iadelerde', points: 10 },
            { type: 'TRUE_FALSE', question: 'Z raporu akşam kapanışta son işlem olarak alınır.', correctAnswer: 'Doğru', points: 5 },
            { type: 'TRUE_FALSE', question: 'Faturası olmayan müşteriye direkt nakit iade yapılabilir.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'SCENARIO', question: 'Kasa kapanışında 150 TL açık tespit ettiniz. Gün içinde yoğun çalıştınız ve hatanın kaynağını tam bilmiyorsunuz.|Ne yapmalısınız?', options: ['Cebinizden 150 TL koyun', 'Görmezden gelin', 'Tutanak tutun, farkı kaydedin ve müdüre bildirin', 'Ertesi güne bırakın'], correctAnswer: 'Tutanak tutun, farkı kaydedin ve müdüre bildirin', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'POS cihazında "Batch kapatma" ne anlama gelir?', options: ['Cihazı kapatmak', 'Günlük işlemleri bankaya iletmek', 'Yeni kağıt takmak', 'Şifreyi sıfırlamak'], correctAnswer: 'Günlük işlemleri bankaya iletmek', points: 10 },
            { type: 'SCENARIO', question: 'Sporthink.com.tr üzerinden online sipariş veren bir müşteri mağazaya gelip "siparişimi almaya geldim" diyor.|Doğru prosedür nedir?', options: ['Müşteriye "bilmiyorum" deyin', 'Sipariş numarasını isteyin, sistemden doğrulayın, ürünü hazırlayın, kimlik kontrolü yapın ve teslim edin', 'Kargoya gönderin', 'İade edin'], correctAnswer: 'Sipariş numarasını isteyin, sistemden doğrulayın, ürünü hazırlayın, kimlik kontrolü yapın ve teslim edin', points: 15 },
            { type: 'TRUE_FALSE', question: 'Kredi kartıyla ödeme sırasında onay gelmezse işlemi tekrar denemeden önce çift çekim kontrolü yapılmalıdır.', correctAnswer: 'Doğru', points: 5 },
        ]},
        // 5. Outdoor & Lifestyle (trainings[4])
        { trainingId: trainings[4].id, title: 'Outdoor & Lifestyle Ürün Sınavı', passingScore: 60, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'The North Face montlarda "DryVent" teknolojisi ne sağlar?', options: ['Isı yalıtımı', 'Su geçirmezlik ve nefes alabilirlik', 'GPS takibi', 'UV koruma'], correctAnswer: 'Su geçirmezlik ve nefes alabilirlik', points: 10 },
            { type: 'TRUE_FALSE', question: 'Columbia "Omni-Heat" teknolojisi vücut ısısını yansıtarak sıcak tutar.', correctAnswer: 'Doğru', points: 5 },
            { type: 'SCENARIO', question: 'Müşteri "Bu kışı Uludağ\'da kayak yaparak geçireceğim, ne almalıyım?" diyor.|Doğru ürün önerisi kombinasyonu hangisidir?', options: ['Nike koşu ayakkabısı + Levis jean', 'Columbia snow serisi mont + Salomon kayak botu + termal iç giyim', 'Converse Chuck Taylor + Hummel eşofman', 'Skechers Memory Foam + Birkenstock'], correctAnswer: 'Columbia snow serisi mont + Salomon kayak botu + termal iç giyim', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'Birkenstock terliğin ayağa oturması ne kadar sürer?', options: ['Hemen', '1-2 hafta düzenli giyim ile', '3 ay', 'Hiç oturmaz'], correctAnswer: '1-2 hafta düzenli giyim ile', points: 10 },
            { type: 'TRUE_FALSE', question: 'Crocs terlikler yıkanabilir.', correctAnswer: 'Doğru', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Crocs Classic terlik hangi malzemeden yapılır?', options: ['Deri', 'Croslite (kapalı hücreli reçine)', 'Kauçuk', 'Kumaş'], correctAnswer: 'Croslite (kapalı hücreli reçine)', points: 10 },
            { type: 'MULTIPLE_CHOICE', question: 'Skechers "Memory Foam" tabanlık ne sağlar?', options: ['Dayanıklılık', 'Kişiye özel konfor ve şekil alma', 'Su geçirmezlik', 'Hız artışı'], correctAnswer: 'Kişiye özel konfor ve şekil alma', points: 10 },
            { type: 'TRUE_FALSE', question: 'Salomon ayakkabıları basketbol için uygundur.', correctAnswer: 'Yanlış', points: 5 },
        ]},
        // 6. Stok Yönetimi (trainings[5])
        { trainingId: trainings[5].id, title: 'Stok Yönetimi Sınavı', passingScore: 70, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'FIFO prensibi ne anlama gelir?', options: ['İlk giren ilk çıkar', 'Son giren ilk çıkar', 'En pahalı ilk satılır', 'Rastgele satış'], correctAnswer: 'İlk giren ilk çıkar', points: 10 },
            { type: 'TRUE_FALSE', question: 'Stok sayımında fark çıktığında reyonu hemen tekrar saymak gerekir.', correctAnswer: 'Doğru', points: 5 },
            { type: 'SCENARIO', question: 'Nike Air Max 90 beden 42 talep eden bir müşteri var ama stokta kalmamış. Müşteri "çok istiyorum, beklerim" diyor.|En doğru aksiyon nedir?', options: ['"Maalesef yok" deyip gönderin', 'Diğer Sporthink mağazalarından stok sorgusu yapın, varsa transfer isteyin veya sporthink.com.tr\'ye yönlendirin', 'Farklı beden verin', 'Rakip mağazaya yönlendirin'], correctAnswer: 'Diğer Sporthink mağazalarından stok sorgusu yapın, varsa transfer isteyin veya sporthink.com.tr\'ye yönlendirin', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'Sezon sonu stok eritme stratejisi hangisidir?', options: ['Ürünleri depoya kaldır', 'Kademeli indirim uygula', 'Ürünleri at', 'Hiçbir şey yapma'], correctAnswer: 'Kademeli indirim uygula', points: 10 },
            { type: 'TRUE_FALSE', question: 'Fire (kayıp) oranı, kayıp veya çalınan ürünlerin toplam stoğa oranıdır.', correctAnswer: 'Doğru', points: 5 },
            { type: 'TRUE_FALSE', question: 'Barkod okunamayan ürünü tahmini fiyatla satmak doğrudur.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Depo düzenlemesinde ABC analizi neye göre yapılır?', options: ['Alfabetik sıra', 'Satış hızı ve değerine göre', 'Ürün rengine göre', 'Ağırlığına göre'], correctAnswer: 'Satış hızı ve değerine göre', points: 10 },
        ]},
        // 7. Hummel & Spor Giyim (trainings[6])
        { trainingId: trainings[6].id, title: 'Hummel & Sneaker Markaları Sınavı', passingScore: 60, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'Hummel hangi ülke kökenli bir markadır?', options: ['Almanya', 'Danimarka', 'İsveç', 'İngiltere'], correctAnswer: 'Danimarka', points: 10 },
            { type: 'TRUE_FALSE', question: 'Converse Chuck Taylor orijinalinde basketbol ayakkabısı olarak tasarlanmıştır.', correctAnswer: 'Doğru', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Vans "Off The Wall" sloganı hangi spor kültürüyle ilişkilidir?', options: ['Futbol', 'Kaykay (Skateboard)', 'Yüzme', 'Atletizm'], correctAnswer: 'Kaykay (Skateboard)', points: 10 },
            { type: 'SCENARIO', question: 'Genç bir müşteri (17 yaş) "okula giyecek rahat ama şık ayakkabı istiyorum, arkadaşlarım arasında trend olsun" diyor.|En uygun öneri hangisidir?', options: ['Salomon trekking botu', 'Converse Chuck Taylor, Vans Old Skool veya New Balance 574 — trend sneaker seçenekleri sunun', 'Birkenstock terlik', 'Nike koşu ayakkabısı'], correctAnswer: 'Converse Chuck Taylor, Vans Old Skool veya New Balance 574 — trend sneaker seçenekleri sunun', points: 15 },
            { type: 'TRUE_FALSE', question: 'Mavi Jeans bir Türk markasıdır.', correctAnswer: 'Doğru', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Puma Suede ve Clyde modelleri hangi kategoridedir?', options: ['Koşu', 'Outdoor', 'Retro Sneaker / Lifestyle', 'Futbol'], correctAnswer: 'Retro Sneaker / Lifestyle', points: 10 },
            { type: 'MULTIPLE_CHOICE', question: 'New Balance 574 modeli neden popüler?', options: ['Çok hafif', 'Retro tasarım + günlük konfor + geniş renk yelpazesi', 'En ucuz model', 'Profesyonel koşu ayakkabısı'], correctAnswer: 'Retro tasarım + günlük konfor + geniş renk yelpazesi', points: 10 },
        ]},
        // 8. Liderlik ve Mağaza Yönetimi (trainings[7])
        { trainingId: trainings[7].id, title: 'Liderlik ve Mağaza Yönetimi Sınavı', passingScore: 60, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'Durumsal liderlik yaklaşımına göre yeni bir çalışana hangi stil uygulanmalıdır?', options: ['Delegasyon (bırak yapsın)', 'Yönlendirici (adım adım anlat)', 'Destekleyici', 'Katılımcı'], correctAnswer: 'Yönlendirici (adım adım anlat)', points: 10 },
            { type: 'TRUE_FALSE', question: 'SBI modeli "Durum-Davranış-Etki" anlamına gelir ve geri bildirim için kullanılır.', correctAnswer: 'Doğru', points: 5 },
            { type: 'SCENARIO', question: 'İki takım arkadaşınız vardiya saatleri konusunda sürekli tartışıyor. Bu durum diğer çalışanları da olumsuz etkiliyor.|Doğru yaklaşım nedir?', options: ['Görmezden gelin', 'İkisini ayrı ayrı dinleyin, birlikte toplantı yapın ve her iki tarafın da kabul edebileceği bir vardiya planı oluşturun', 'Birini cezalandırın', 'İkisini de farklı mağazalara transfer edin'], correctAnswer: 'İkisini ayrı ayrı dinleyin, birlikte toplantı yapın ve her iki tarafın da kabul edebileceği bir vardiya planı oluşturun', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'Vardiya planlamasında en önemli kriter nedir?', options: ['Çalışan tercihi', 'Müşteri yoğunluk saatleri', 'Müdürün uygunluğu', 'Rastgele planlama'], correctAnswer: 'Müşteri yoğunluk saatleri', points: 10 },
            { type: 'TRUE_FALSE', question: 'Takım motivasyonunda en etkili yöntem sürekli cezalandırmadır.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Çatışma yönetiminde "kazan-kazan" yaklaşımı ne anlama gelir?', options: ['Herkesin kazanması imkansız', 'Her iki tarafın da kabul edebileceği çözüm bulmak', 'Patron her zaman kazanır', 'Çatışmayı görmezden gelmek'], correctAnswer: 'Her iki tarafın da kabul edebileceği çözüm bulmak', points: 10 },
            { type: 'SCENARIO', question: 'Yeni başlayan bir satış danışmanı ilk haftasında müşterilere yaklaşmakta zorlanıyor ve motivasyonu düşük.|Lider olarak ne yaparsınız?', options: ['Kendi haline bırakın, öğrensin', 'Deneyimli bir çalışanla eşleştirin (buddy sistemi), günlük kısa geri bildirim verin ve ilk satışını kutlayın', 'Hemen uyarın', 'Başka pozisyona aktarın'], correctAnswer: 'Deneyimli bir çalışanla eşleştirin (buddy sistemi), günlük kısa geri bildirim verin ve ilk satışını kutlayın', points: 15 },
        ]},
        // 📄 9. Sporthink Müşteri Karşılama Standartları (trainings[8]) — PDF tabanlı
        { trainingId: trainings[8].id, title: 'Müşteri Karşılama Standartları Sınavı', passingScore: 70, questions: [
            { type: 'TRUE_FALSE', question: 'Müşteri mağazaya girdiği ilk 7 saniyede satınalma kararının %80\'i oluşur.', correctAnswer: 'Doğru', points: 5 },
            { type: 'TRUE_FALSE', question: 'Müşteriyi elleri cepte karşılamak kabul edilebilir.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Satışa başlarken hangi soru tipi kullanılmalıdır?', options: ['Kapalı uçlu: "Waterproof mu arıyorsunuz?"', 'Açık uçlu: "Ayakkabıyı nerede kullanacaksınız?"', 'Hiç soru sormadan ürün gösterme', 'Sadece fiyat söyleme'], correctAnswer: 'Açık uçlu: "Ayakkabıyı nerede kullanacaksınız?"', points: 10 },
            { type: 'SCENARIO', question: 'Müşteri waterproof ayakkabı arıyor. "Dağa gideceğim" diyor. Siz meşgulsünüz, başka müşteri de var.|Ne yaparsınız?', options: ['Müşteriye "bekleyin" deyin', '"Bir müşterimize yardımcı olup hemen döneceğim" diyerek ilginin kopmadığını hissettirin', 'Görmezden gelin', 'Sadece reyonu gösterin'], correctAnswer: '"Bir müşterimize yardımcı olup hemen döneceğim" diyerek ilginin kopmadığını hissettirin', points: 15 },
            { type: 'MULTIPLE_CHOICE', question: 'Satışı kapatırken hangi soru tipi tercih edilmelidir?', options: ['Açık uçlu', 'Kapalı uçlu', 'Seçenekli: "Siyah mı lacivert mi tercih edersiniz?"', 'Hiç soru sorulmaz'], correctAnswer: 'Seçenekli: "Siyah mı lacivert mi tercih edersiniz?"', points: 10 },
            { type: 'TRUE_FALSE', question: 'Sadece satış yapmak için müşteriye ihtiyacından pahalı ürün sunmak doğrudur.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'UPT (Units Per Transaction) oranını artırmak için ne yapılmalıdır?', options: ['Hiçbir şey', 'Kampanya bildirimi ve satın alınan ürünle uyumlu ek ürün önerisi', 'Sadece indirimli ürün satmak', 'Müşteriyi kasaya yönlendirmek'], correctAnswer: 'Kampanya bildirimi ve satın alınan ürünle uyumlu ek ürün önerisi', points: 10 },
            { type: 'SCENARIO', question: 'Müşteri alışverişini tamamladı ve ürünleriyle kasaya yürüyor.|Doğru davranış nedir?', options: ['Arkasından bakmak', 'Müşteriye kasaya kadar eşlik etmek — bu ona değer verildiğini hissettirir', 'Hemen başka müşteriyle ilgilenmek', '"İyi günler" demek yeterli'], correctAnswer: 'Müşteriye kasaya kadar eşlik etmek — bu ona değer verildiğini hissettirir', points: 15 },
        ]},
        // 📄 10. Sporthink Alarm ve Etiket Standartları (trainings[9]) — PDF tabanlı
        { trainingId: trainings[9].id, title: 'Alarm ve Etiket Standartları Sınavı', passingScore: 70, questions: [
            { type: 'MULTIPLE_CHOICE', question: 'T-shirt alarmı hangi bölgeden yapılmalıdır?', options: ['Ön cepden', 'Yan taraf dikiş kısmından, iç etiket hizasında', 'Yakadan', 'Alt kısımdan'], correctAnswer: 'Yan taraf dikiş kısmından, iç etiket hizasında', points: 10 },
            { type: 'TRUE_FALSE', question: 'Ayakkabıda alarm sol tek iç kısma, en üst bağcık deliğinden yapılır.', correctAnswer: 'Doğru', points: 5 },
            { type: 'TRUE_FALSE', question: 'Terlikte sadece tek eşe alarm yapmak yeterlidir.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'Eşofman takımında toplamda kaç alarm bulunmalıdır?', options: ['1', '2', '3', '4'], correctAnswer: '3', points: 10 },
            { type: 'SCENARIO', question: '3-in-1 mont raftan alınacak ve alarma ihtiyaç var. Mont bir dış ceket ve bir iç yelek/polarden oluşuyor.|Toplamda kaç alarm gereklidir?', options: ['1 — sadece dış cekete', '2 — dış cekete ve iç ürüne ayrı ayrı', '3 — her parçaya artı birleştirme', 'Alarm gerekmez'], correctAnswer: '2 — dış cekete ve iç ürüne ayrı ayrı', points: 15 },
            { type: 'TRUE_FALSE', question: 'Orijinal barkod üzerine etiket basılabilir.', correctAnswer: 'Yanlış', points: 5 },
            { type: 'MULTIPLE_CHOICE', question: 'İndirimli ürünlerde hangi renk sticker kullanılır?', options: ['Beyaz', 'Kırmızı', 'Sarı', 'Yeşil'], correctAnswer: 'Kırmızı', points: 10 },
            { type: 'SCENARIO', question: 'Orijinal barkodu kopmuş bir ürün geldi ve satışa sunulması gerekiyor.|Ne yaparsınız?', options: ['Ürünü satmayın', 'Sporthink etiket kartına etiket basın', 'Tahmini fiyat yazın', 'Kasaya sorun'], correctAnswer: 'Sporthink etiket kartına etiket basın', points: 15 },
            { type: 'TRUE_FALSE', question: 'İndirimli teşhir ayakkabılarda yeni sezon pop kullanılmalıdır.', correctAnswer: 'Yanlış', points: 5 },
        ]},
    ];

    const quizzes = [];
    for (const q of quizzesData) {
        const quiz = await prisma.quiz.create({ data: { id: uuidv4(), trainingId: q.trainingId, title: q.title, passScore: q.passingScore } });
        for (let i = 0; i < q.questions.length; i++) {
            const qd = q.questions[i];
            await prisma.quizQuestion.create({
                data: { id: uuidv4(), quizId: quiz.id, type: qd.type || 'MULTIPLE_CHOICE', question: qd.question, options: qd.options ? JSON.stringify(qd.options) : null, correctAnswer: qd.correctAnswer, sortOrder: i + 1, points: qd.points || 10 },
            });
        }
        quizzes.push(quiz);
    }
    console.log(`  ✓ ${quizzes.length} sınav oluşturuldu`);

    // Training Assignments — assign to active employees
    const activeUsers = allUsers.filter(u => u.isActive);
    let assignmentCount = 0;
    for (const user of activeUsers) {
        const mandatoryTrainings = trainings.filter(t => t.type === 'MANDATORY');
        const optionalSample = trainings.filter(t => t.type === 'OPTIONAL').slice(0, Math.floor(Math.random() * 3) + 1);
        const userTrainings = [...mandatoryTrainings, ...optionalSample];
        for (const training of userTrainings) {
            const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'NOT_STARTED'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            await prisma.trainingAssignment.create({
                data: {
                    id: uuidv4(), userId: user.id, trainingId: training.id, assignedById: admin.id, status,
                    completedAt: status === 'COMPLETED' ? daysAgo(Math.floor(Math.random() * 60)) : null,
                    dueDate: daysAgo(-Math.floor(Math.random() * 30)),
                },
            });
            assignmentCount++;
        }
    }
    console.log(`  ✓ ${assignmentCount} eğitim ataması oluşturuldu`);

    // Quiz attempts for active employees
    let attemptCount = 0;
    for (const user of activeUsers.slice(0, Math.min(50, activeUsers.length))) {
        for (const quiz of quizzes) {
            if (Math.random() > 0.4) continue;
            const score = Math.floor(Math.random() * 40) + 60;
            const attempt = await prisma.quizAttempt.create({
                data: { id: uuidv4(), userId: user.id, quizId: quiz.id, score, passed: score >= quiz.passScore, startedAt: daysAgo(Math.floor(Math.random() * 30)), completedAt: daysAgo(Math.floor(Math.random() * 30)) },
            });
            const questions = await prisma.quizQuestion.findMany({ where: { quizId: quiz.id } });
            for (const q of questions) {
                const correct = Math.random() > 0.3;
                const options = JSON.parse(q.options || '[]');
                const wrongAnswer = options.find(o => o !== q.correctAnswer) || 'Bilinmiyor';
                await prisma.quizAnswer.create({
                    data: { id: uuidv4(), attemptId: attempt.id, questionId: q.id, answer: correct ? q.correctAnswer : wrongAnswer, isCorrect: correct },
                });
            }
            attemptCount++;
        }
    }
    console.log(`  ✓ ${attemptCount} sınav denemesi oluşturuldu`);

    // =====================================================================
    // KPI DEFINITIONS & ENTRIES — REAL data from PERAKENDE KPI GÜNCEL.xlsx
    // =====================================================================
    // KPI Definitions: 6 dashboard-compatible + 7 extended from Excel
    const kpiDefs = [
        // Dashboard'ın beklediği ana KPI'lar (Excel sütunlarına eşlenmiş)
        { name: 'Aylık Ciro', unit: 'TL', targetValue: 4200000, frequency: 'MONTHLY', scope: 'STORE' },              // Excel: CİRO
        { name: 'Ürün Satış Adedi', unit: 'Adet', targetValue: 2200, frequency: 'MONTHLY', scope: 'STORE' },       // Excel: Toplam ADET
        { name: 'Sepet Ortalaması', unit: 'TL', targetValue: 2900, frequency: 'MONTHLY', scope: 'STORE' },          // Excel: ATV
        { name: 'Dönüşüm Oranı', unit: '%', targetValue: 7, frequency: 'MONTHLY', scope: 'STORE' },                // Excel: MDO
        { name: 'Müşteri Memnuniyeti', unit: '%', targetValue: 90, frequency: 'MONTHLY', scope: 'STORE' },         // (Excel'de yok, üretiliyor)
        { name: 'Eğitim Tamamlama Oranı', unit: '%', targetValue: 85, frequency: 'MONTHLY', scope: 'STORE' },      // (Excel'de yok, üretiliyor)
        // Excel'den gelen ek mağaza KPI'ları
        { name: 'Hedef Ciro', unit: 'TL', targetValue: 4200000, frequency: 'MONTHLY', scope: 'STORE' },             // Excel: Toplam HEDEF CİRO
        { name: 'UPT', unit: 'Adet', targetValue: 1.9, frequency: 'MONTHLY', scope: 'STORE' },                      // Excel: UPT
        { name: 'Fatura Adedi', unit: 'Adet', targetValue: 1300, frequency: 'MONTHLY', scope: 'STORE' },            // Excel: FATURA
        { name: 'Toplam Ziyaretçi', unit: 'Kişi', targetValue: 20000, frequency: 'MONTHLY', scope: 'STORE' },       // Excel: Toplam Ziyaretçi
        { name: 'Ortalama Satış Fiyatı', unit: 'TL', targetValue: 1700, frequency: 'MONTHLY', scope: 'STORE' },     // Excel: ASP
        { name: 'Tekli Fatura Oranı', unit: '%', targetValue: 60, frequency: 'MONTHLY', scope: 'STORE' },           // Excel: TEKLİ FATURA ORANI
        { name: 'Hedef Gerçekleşme Oranı', unit: '%', targetValue: 100, frequency: 'MONTHLY', scope: 'STORE' },     // Excel: HEDEF GERÇEKLEŞEN ORANI
        // Personel seviyesi KPI'lar (Excel personel sayfasından)
        { name: 'Personel Hedef Ciro', unit: 'TL', targetValue: 500000, frequency: 'MONTHLY', scope: 'EMPLOYEE' },
        { name: 'Personel Ciro', unit: 'TL', targetValue: 500000, frequency: 'MONTHLY', scope: 'EMPLOYEE' },
        { name: 'Personel UPT', unit: 'Adet', targetValue: 2.0, frequency: 'MONTHLY', scope: 'EMPLOYEE' },
        { name: 'Personel Hedef Gerçekleşme', unit: '%', targetValue: 100, frequency: 'MONTHLY', scope: 'EMPLOYEE' },
    ];
    const kpiDefinitions = [];
    const kpiByName = {};
    for (const k of kpiDefs) {
        const kpi = await prisma.kpiDefinition.create({ data: { id: uuidv4(), ...k, createdById: admin.id } });
        kpiDefinitions.push(kpi);
        kpiByName[k.name] = kpi;
    }

    // ----- Excel'den PERAKENDE KPI GÜNCEL.xlsx okuma -----
    const kpiXlsPath = path.join(__dirname, '..', 'PERAKENDE KPI GÜNCEL.xlsx');
    const kpiWb = XLSX.readFile(kpiXlsPath);
    const kpiSheet = kpiWb.Sheets[kpiWb.SheetNames[0]];
    const kpiRows = XLSX.utils.sheet_to_json(kpiSheet, { header: 1, defval: null, raw: true });

    // Excel mağaza ismini seed mağaza ismine eşle (UPPERCASE Türkçe → karışık Türkçe)
    const excelStoreMap = {
        'AKHISAR SPORTHINK MAĞAZA': 'Akhisar Novada Sporthink Mağaza',
        'BOZÜYÜK SPORTHINK MAĞAZA': 'Bozüyük Sporthink Mağaza',
        'DENİZLİ TERASPARK MAĞAZA': 'Denizli Teraspark Mağaza',
        'EDREMİT NOVADA MAĞAZA': 'Edremit Novada Mağaza',
        'KUŞADASI MAĞAZA': 'Kuşadası Mağaza',
        'MALL OF ANTALYA SPORTHINK MAĞAZA': 'Mall Of Antalya Sporthink Mağaza',
        'MENEMEN NOVADA SPORTHINK MAĞAZA': 'Menemen Novada Sporthink Mağaza',
        'MUĞLA FESTİVA SPORTHINK MAĞAZA': 'Muğla Festiva Sporthink Mağaza',
        'OPTIMUM SPORTHINK MAĞAZA': 'Optimum Sporthink Mağaza',
        'SALİHLİ SPORTHINK MAĞAZA': 'Salihli Luna Sporthink Mağaza',
        'SEFERİHİSAR SPORTHINK MAĞAZA': 'Seferihisar Renna Sporthink Mağaza',
        'SELWAY SPORTHINK MAĞAZA': 'Selway Sporthink Mağaza',
        'SÖKE NOVADA SPORTHINK MAĞAZA': 'Söke Novada Sporthink Mağaza',
        'WESTPARK HUMMEL MAĞAZA': 'Westpark Hummel Mağaza',
        'WESTPARK SPORTHINK MAĞAZA': 'Westpark Sporthink Mağaza',
        'ÇİĞLİ KİPA ÇADIR MAĞAZA': 'Çiğli Kipa Çadır Mağaza',
        'ŞİRİNYER MAĞAZASI': 'Şirinyer Sporthink Mağaza',
    };

    // Excel sütun → KPI tanımı eşleştirmesi (mağaza blokları için)
    // Sütun indexleri header satırına göre:
    // 0: MAĞAZA, 1: Bölge, 2: Hedef Ciro, 3: Ciro, 4: Fark, 5: Hedef Ger. %, 6: Ciro LFL, 7: Adet LFL,
    // 8: Toplam Adet, 9: Fatura, 10: Ziyaretçi, 11: Hedef UPT, 12: UPT, 13: Hedef MDO, 14: MDO,
    // 15: ASP, 16: ATV, 17: Tekli Fatura, 18: Ayakkabı/Tekstil
    const storeColumnMap = [
        { col: 2,  kpiName: 'Hedef Ciro' },
        { col: 3,  kpiName: 'Aylık Ciro' },
        { col: 5,  kpiName: 'Hedef Gerçekleşme Oranı', toPct: true },
        { col: 8,  kpiName: 'Ürün Satış Adedi' },
        { col: 9,  kpiName: 'Fatura Adedi' },
        { col: 10, kpiName: 'Toplam Ziyaretçi' },
        { col: 12, kpiName: 'UPT' },
        { col: 14, kpiName: 'Dönüşüm Oranı', toPct: true },
        { col: 15, kpiName: 'Ortalama Satış Fiyatı' },
        { col: 16, kpiName: 'Sepet Ortalaması' },
        { col: 17, kpiName: 'Tekli Fatura Oranı', toPct: true },
    ];

    // Excel bloklarını ayrıştır: OCAK, ŞUBAT mağaza blokları + 2x personel bloğu
    const stores = Object.values(storeDbMap);
    let kpiCount = 0;
    const monthMarkers = []; // [{row, label}]
    const personnelBlocks = []; // [{startRow, period}]
    for (let i = 0; i < kpiRows.length; i++) {
        const r = kpiRows[i];
        if (!r) continue;
        const c0 = (r[0] || '').toString().trim();
        if (!c0) continue;
        if (c0 === 'OCAK') monthMarkers.push({ row: i, period: '2026-01' });
        else if (c0 === 'ŞUBAT' || c0 === 'SUBAT') monthMarkers.push({ row: i, period: '2026-02' });
        else if (c0 === 'PERSONEL HEDEF GERÇEKLEŞTİRME') personnelBlocks.push({ startRow: i });
    }

    // Mağaza KPI blokları (her ay markerından sonraki ~20 satır)
    for (const mm of monthMarkers) {
        // Header satırı mm.row+1, veri satırları mm.row+2'den sonraki boş satıra kadar
        for (let i = mm.row + 2; i < kpiRows.length; i++) {
            const r = kpiRows[i];
            if (!r || !r[0]) break; // blok bitti
            const excelName = String(r[0]).trim().toUpperCase();
            const seedStoreName = excelStoreMap[excelName];
            if (!seedStoreName) continue;
            const store = storeDbMap[seedStoreName];
            if (!store) continue;

            for (const m of storeColumnMap) {
                const raw = r[m.col];
                if (raw === null || raw === undefined || raw === '') continue;
                let v = Number(raw);
                if (!isFinite(v)) continue;
                if (m.toPct) v = v * 100; // 0.07 → 7%, 0.91 → 91%
                const kpi = kpiByName[m.kpiName];
                if (!kpi) continue;
                await prisma.kpiEntry.create({
                    data: {
                        id: uuidv4(),
                        kpiDefinitionId: kpi.id,
                        storeId: store.id,
                        period: mm.period,
                        value: Math.round(v * 100) / 100,
                        enteredById: admin.id,
                        notes: 'PERAKENDE KPI GÜNCEL.xlsx',
                    },
                });
                kpiCount++;
            }
        }
    }

    // Personel KPI blokları
    // Personel blok başlığından sonra: row+1 header, row+2'den itibaren personel kayıtları
    // Sütunlar: 0=Tarih, 1=Mağaza, 2=İSİM SOYİSİM, 3=HEDEF, 4=GERÇEKLEŞEN, 5=UPT, 6=%
    // Personeli isim ile eşle (allUsers içinden firstName+lastName)
    function normalizeName(s) {
        return String(s || '').toLowerCase()
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i')
            .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
            .replace(/\s+/g, ' ').trim();
    }
    const userByName = new Map();
    for (const u of allUsers) {
        userByName.set(normalizeName(`${u.firstName} ${u.lastName}`), u);
    }
    let persKpiCount = 0;
    let persCreated = 0;
    let persMissed = 0;
    for (const pb of personnelBlocks) {
        for (let i = pb.startRow + 2; i < kpiRows.length; i++) {
            const r = kpiRows[i];
            if (!r) break;
            const dateCell = r[0];
            const storeCell = r[1];
            const nameCell = r[2];
            // Toplam satırlarına geldiğimizde dur
            if (typeof storeCell === 'string' && /TOPLAM/i.test(storeCell)) break;
            if (!nameCell) continue;
            // Tarih hücresinden period çıkar
            let period = null;
            if (dateCell instanceof Date) {
                period = `${dateCell.getFullYear()}-${String(dateCell.getMonth() + 1).padStart(2, '0')}`;
            } else if (typeof dateCell === 'number') {
                // Excel serial date
                const d = XLSX.SSF.parse_date_code(dateCell);
                if (d) period = `${d.y}-${String(d.m).padStart(2, '0')}`;
            } else if (typeof dateCell === 'string' && dateCell.includes('-')) {
                const d = new Date(dateCell);
                if (!isNaN(d.getTime())) period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }
            if (!period) continue;

            let user = userByName.get(normalizeName(nameCell));
            // Personel bulunamadıysa otomatik EMPLOYEE olarak oluştur (KPI Excel'deki personel kapsamı tamamlansın)
            if (!user) {
                const excelStoreName = String(storeCell || '').trim().toUpperCase();
                const seedStoreName = excelStoreMap[excelStoreName];
                const store = seedStoreName ? storeDbMap[seedStoreName] : null;
                if (!store) { persMissed++; continue; }

                const nameParts = String(nameCell).trim().split(/\s+/);
                const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
                const lastName = nameParts[nameParts.length - 1] || '';
                let email = generateEmail(`${firstName} ${lastName}`, '');
                if (emailSet.has(email)) {
                    email = email.replace('@', `.kpi${persCreated}@`);
                }
                emailSet.add(email);

                user = await prisma.user.create({
                    data: {
                        id: uuidv4(),
                        email,
                        password: hash('emp123'),
                        firstName,
                        lastName,
                        role: 'EMPLOYEE',
                        storeId: store.id,
                        regionId: store.regionId,
                        isActive: true,
                        hireDate: new Date('2024-01-01'),
                    },
                });
                allUsers.push(user);
                employees.push(user);
                userByName.set(normalizeName(`${firstName} ${lastName}`), user);
                activeCount++;
                persCreated++;
            }

            const hedef = Number(r[3]);
            const gerc = Number(r[4]);
            const upt = Number(r[5]);
            const pct = Number(r[6]);
            const entries = [
                { name: 'Personel Hedef Ciro', val: hedef },
                { name: 'Personel Ciro', val: gerc },
                { name: 'Personel UPT', val: upt },
                { name: 'Personel Hedef Gerçekleşme', val: pct },
            ];
            for (const e of entries) {
                if (!isFinite(e.val)) continue;
                const kpi = kpiByName[e.name];
                if (!kpi) continue;
                await prisma.kpiEntry.create({
                    data: {
                        id: uuidv4(),
                        kpiDefinitionId: kpi.id,
                        userId: user.id,
                        storeId: user.storeId,
                        period,
                        value: Math.round(e.val * 100) / 100,
                        enteredById: admin.id,
                        notes: 'PERAKENDE KPI GÜNCEL.xlsx',
                    },
                });
                persKpiCount++;
            }
        }
    }

    // Eski 4 ay için rastgele veri (2025-09, 2025-10, 2025-11, 2025-12) — dashboard grafiği boş kalmasın
    const oldPeriods = ['2025-09', '2025-10', '2025-11', '2025-12'];
    const randomKpiNames = [
        'Aylık Ciro', 'Ürün Satış Adedi', 'Sepet Ortalaması', 'Dönüşüm Oranı',
        'Müşteri Memnuniyeti', 'Eğitim Tamamlama Oranı', 'Hedef Ciro', 'UPT',
        'Fatura Adedi', 'Toplam Ziyaretçi', 'Ortalama Satış Fiyatı', 'Tekli Fatura Oranı',
    ];
    for (const store of stores) {
        for (const period of oldPeriods) {
            for (const kName of randomKpiNames) {
                const kpi = kpiByName[kName];
                if (!kpi) continue;
                const baseVal = kpi.targetValue || 100;
                const variance = 0.7 + Math.random() * 0.5;
                let value = Math.round(baseVal * variance * 100) / 100;
                if (kpi.unit === '%') value = Math.min(100, Math.max(0, value));
                await prisma.kpiEntry.create({
                    data: { id: uuidv4(), kpiDefinitionId: kpi.id, storeId: store.id, period, value, enteredById: admin.id },
                });
                kpiCount++;
            }
        }
    }

    // 2026-01 ve 2026-02 için Excel'de bulunmayan KPI'ları (Müşteri Memnuniyeti, Eğitim Tamamlama) da üret
    const supplementalKpis = ['Müşteri Memnuniyeti', 'Eğitim Tamamlama Oranı'];
    for (const store of stores) {
        for (const period of ['2026-01', '2026-02']) {
            for (const kName of supplementalKpis) {
                const kpi = kpiByName[kName];
                if (!kpi) continue;
                const value = Math.round((kpi.targetValue * (0.85 + Math.random() * 0.2)) * 100) / 100;
                await prisma.kpiEntry.create({
                    data: { id: uuidv4(), kpiDefinitionId: kpi.id, storeId: store.id, period, value, enteredById: admin.id },
                });
                kpiCount++;
            }
        }
    }

    console.log(`  ✓ ${kpiDefinitions.length} KPI tanımı, ${kpiCount} mağaza KPI girişi, ${persKpiCount} personel KPI girişi oluşturuldu`);
    if (persCreated > 0) console.log(`    + ${persCreated} yeni personel KPI Excel'inden otomatik oluşturuldu`);
    if (persMissed > 0) console.log(`    ⚠ ${persMissed} personel KPI kaydı atlandı (mağaza bilgisi eksik)`);

    // =====================================================================
    // FEEDBACK — real-world operational feedback
    // =====================================================================
    const feedbackTypes = ['OPERATIONAL_ISSUE', 'SUGGESTION', 'INCIDENT', 'PRAISE', 'TRAINING_NEED', 'CUSTOMER_COMPLAINT', 'PRODUCT_DEFECT', 'STOCK_ISSUE', 'STAFF_ISSUE', 'STORE_MAINTENANCE'];
    const feedbackData = [
        { title: 'Klima arızası — Optimum mağaza', description: 'Mağaza kliması 3 gündür çalışmıyor, müşteri şikayetleri artıyor.', type: 'STORE_MAINTENANCE', priority: 'HIGH' },
        { title: 'Yeni ürün eğitimi talebi', description: 'Hummel yeni sezon koleksiyonu hakkında ürün bilgisi eğitimi gerekli.', type: 'TRAINING_NEED', priority: 'MEDIUM' },
        { title: 'Stok sayım farkı — Westpark', description: 'Westpark mağazasında stok sayımında 12 ürün farkı tespit edildi.', type: 'STOCK_ISSUE', priority: 'HIGH' },
        { title: 'Müşteri şikayeti — iade süreci', description: 'Müşteri iade sürecinin uzun sürdüğünden şikayetçi.', type: 'CUSTOMER_COMPLAINT', priority: 'MEDIUM' },
        { title: 'Çalışan takdir — Ece mağaza performansı', description: 'Seferihisar mağazası bu ay satış hedefini %120 gerçekleştirdi. Ece hanım tebrik edilmeli.', type: 'PRAISE', priority: 'LOW' },
        { title: 'Kasa yazıcısı arızası', description: 'Park Bornova kasa yazıcısı kağıt sıkışması sorunu yaşıyor.', type: 'OPERATIONAL_ISSUE', priority: 'MEDIUM' },
        { title: 'Personel eksikliği — hafta sonu', description: 'Hafta sonu vardiyasında yeterli personel bulunmuyor.', type: 'STAFF_ISSUE', priority: 'HIGH' },
        { title: 'Ayakkabı defekt bildirimi', description: 'Koşu ayakkabısı serisinde taban ayrılması sorunu, 3 müşteri iade getirdi.', type: 'PRODUCT_DEFECT', priority: 'CRITICAL' },
        { title: 'Depo düzenleme önerisi', description: 'Depo raflarının kategoriye göre yeniden düzenlenmesi önerisi.', type: 'SUGGESTION', priority: 'LOW' },
        { title: 'Güvenlik kamerası arızası', description: 'Denizli mağaza giriş kamerası 1 haftadır çalışmıyor.', type: 'INCIDENT', priority: 'HIGH' },
        { title: 'Yeni kasa sistemi eğitimi', description: 'POS sistemi güncellendi, tüm personele eğitim verilmeli.', type: 'TRAINING_NEED', priority: 'HIGH' },
        { title: 'Sezon sonu indirim düzenlemesi', description: 'İndirimli ürünlerin ayrı reyonda sergilenmesi önerisi.', type: 'SUGGESTION', priority: 'MEDIUM' },
    ];

    const activeStoreUsers = allUsers.filter(u => u.isActive && u.storeId);
    for (let i = 0; i < feedbackData.length; i++) {
        const fb = feedbackData[i];
        const submitter = activeStoreUsers[i % activeStoreUsers.length];
        const statusOpts = ['NEW', 'IN_REVIEW', 'ACTION_PLANNED', 'IMPLEMENTED', 'CLOSED'];
        await prisma.feedback.create({
            data: {
                id: uuidv4(), title: fb.title, description: fb.description, type: fb.type,
                priority: fb.priority, status: statusOpts[i % statusOpts.length],
                storeId: submitter.storeId, submittedById: submitter.id,
                createdAt: daysAgo(Math.floor(Math.random() * 30) + 1),
            },
        });
    }
    console.log(`  ✓ ${feedbackData.length} geri bildirim oluşturuldu`);

    // =====================================================================
    // MANAGER NOTES
    // =====================================================================
    const activeEmps = employees.filter(e => e.isActive);
    const activeSMs = storeManagers.filter(s => s.isActive);
    const noteTexts = [
        'Bu çeyrekte büyük gelişme gösterdi. Satış tekniklerinde iyileşme var.',
        'Müşteri ilişkilerinde çok başarılı, takım liderliğine aday.',
        'Devamsızlık konusunda uyarıldı.',
        'POS sisteminde çok hızlı, yeni çalışanlara eğitim verebilir.',
        'Ürün bilgisi konusunda geliştirilmeli.',
        'Yaratıcı fikirleriyle mağazaya değer katıyor.',
        'Stok yönetiminde çok düzenli.',
        'Müşteriyle iletişim konusunda çok yetenekli.',
    ];
    let noteCount = 0;
    for (let i = 0; i < Math.min(noteTexts.length, activeEmps.length); i++) {
        const sm = activeSMs[i % activeSMs.length];
        if (!sm) continue;
        await prisma.managerNote.create({ data: { id: uuidv4(), employeeId: activeEmps[i].id, authorId: sm.id, content: noteTexts[i] } });
        noteCount++;
    }
    console.log(`  ✓ ${noteCount} yönetici notu oluşturuldu`);

    // =====================================================================
    // AUDIT LOGS
    // =====================================================================
    const auditActions = [
        { action: 'USER_LOGIN', entity: 'User', details: 'Sisteme giriş yapıldı', userId: admin.id },
        { action: 'TRAINING_CREATED', entity: 'Training', details: 'Yeni eğitim oluşturuldu', userId: admin.id },
        { action: 'TRAINING_ASSIGNED', entity: 'TrainingAssignment', details: 'Toplu eğitim ataması yapıldı', userId: admin.id },
        { action: 'KPI_ENTRY_ADDED', entity: 'KpiEntry', details: 'KPI verisi girildi', userId: admin.id },
        { action: 'FEEDBACK_CREATED', entity: 'Feedback', details: 'Geri bildirim oluşturuldu', userId: activeSMs[0]?.id || admin.id },
    ];
    for (const a of auditActions) {
        await prisma.auditLog.create({
            data: { id: uuidv4(), userId: a.userId, action: a.action, entity: a.entity, details: a.details, ipAddress: '192.168.1.' + (Math.floor(Math.random() * 254) + 1), createdAt: daysAgo(Math.floor(Math.random() * 30)) },
        });
    }
    console.log('  ✓ Audit loglar oluşturuldu');

    // =====================================================================
    // PULSE SURVEY
    // =====================================================================
    const survey = await prisma.pulseSurvey.create({
        data: { id: uuidv4(), title: 'Mart 2026 Nabız Anketi', description: 'Aylık çalışan memnuniyet ve motivasyon değerlendirmesi', period: '2026-03', isAnonymous: true, createdById: admin.id },
    });
    let surveyRespCount = 0;
    for (let i = 0; i < Math.min(20, activeEmps.length); i++) {
        await prisma.pulseSurveyResponse.create({
            data: {
                id: uuidv4(), surveyId: survey.id, userId: activeEmps[i].id,
                overallScore: Math.floor(Math.random() * 3) + 3,
                workloadScore: Math.floor(Math.random() * 3) + 2,
                teamScore: Math.floor(Math.random() * 3) + 3,
                managerScore: Math.floor(Math.random() * 3) + 3,
                growthScore: Math.floor(Math.random() * 3) + 2,
                comment: i < 5 ? ['Takım çalışması harika.', 'İş yükü fazla ama genel memnunum.', 'Eğitim fırsatları artabilir.', 'Vardiya düzeni iyileştirilmeli.', 'Yöneticimiz çok destekleyici.'][i] : null,
            },
        });
        surveyRespCount++;
    }
    console.log(`  ✓ 1 nabız anketi, ${surveyRespCount} yanıt oluşturuldu`);

    // =====================================================================
    // COMMUNITY POSTS
    // =====================================================================
    const communityPosts = [
        { title: 'Nike Pegasus 42 vs Adidas Ultraboost — Hangisini Önerelim?', content: 'Müşteriler sıkça Nike Pegasus ve Adidas Ultraboost arasında kararsız kalıyor.\n\n• Pegasus: Günlük antrenman için ideal, daha hafif, nötr pronasyon\n• Ultraboost: Uzun mesafe ve konfor odaklı, Boost teknolojisi\n\nMüşterinin koşu alışkanlığını sorun ve buna göre yönlendirin.', category: 'TIPS', isPinned: true },
        { title: '📢 Hummel 2026 İlkbahar-Yaz Koleksiyonu Mağazalarda!', content: 'Hummel yeni sezon koleksiyonu tüm mağazalarımıza ulaştı. Retro sneaker serisi, yeni renk seçenekleri ve çocuk koleksiyonu hakkında ürün bilgisi dosyasını incelemeyi unutmayın.\n\nÖne çıkan modeller: Marathona, Seoul, 3S Sport', category: 'ANNOUNCEMENT', isPinned: true },
        { title: 'The North Face & Columbia — Outdoor Müşterilerine Satış İpuçları', content: 'Outdoor ürünlerde müşterinin aktivite tipini sorun:\n\n1. Trekking → Salomon ayakkabı + Columbia ceket\n2. Şehir outdoor → The North Face mont + Timberland bot\n3. Kayak/snowboard → Columbia snow serisi\n\nKatmanlı giyinme stratejisini anlatın, çapraz satış fırsatı yüksek!', category: 'TIPS' },
        { title: 'Crocs ve Birkenstock — En Çok Sorulan Sorular', content: 'Müşteriler sıkça soruyor:\n\n• Crocs yıkanabilir mi? → Evet, ılık su ile\n• Birkenstock nasıl kalıplanır? → İlk 2 hafta kısa süreli giyim\n• Beden seçimi nasıl yapılır? → Crocs rahat kalıp, Birkenstock normal beden\n\nBu bilgileri bilmek satışı kolaylaştırır.', category: 'QUESTION' },
        { title: 'Converse ve Vans — Gençlere Özel Satış Stratejileri', content: 'Genç müşteri kitlemiz Converse Chuck Taylor ve Vans Old Skool modellerini çok seviyor. Sosyal medya trendlerini takip edin, yeni renkleri vitrine koyun ve kombinasyon önerileri sunun.', category: 'TIPS' },
        { title: '🏆 Bu Ay En Çok Satan Markalar', content: '1. Nike — Air Max ve Dunk serisi\n2. Adidas — Samba ve Gazelle\n3. New Balance — 530 ve 574\n4. Converse — Chuck Taylor\n5. Skechers — D\'Lites\n\nBu modelleri vitrin önüne yerleştirin ve stok kontrollerini sıklaştırın.', category: 'ANNOUNCEMENT' },
        // 📄 PDF Eğitim gönderileri
        { title: '📋 Müşteri Karşılama 6 Adımı — Hızlı Hatırlatma', content: 'Sporthink resmi müşteri karşılama standardımız:\n\n1️⃣ HOŞGELDİNİZ — İlk 7 saniye kritik!\n2️⃣ İLETİŞİME GEÇ — Açık uçlu sorular sor\n3️⃣ DOĞRU AKTARIM — İhtiyaca göre ürün sun\n4️⃣ KAMPANYA & EK ÜRÜN — UPT\'yi yükselt\n5️⃣ SATIŞ TAMAMLAMA — Kasaya eşlik et\n6️⃣ UĞURLAMA — Teşekkür et, geri bildirim al\n\n📎 Detaylı PDF: Eğitimler → Müşteri Karşılama Standartları', category: 'ANNOUNCEMENT', isPinned: true },
        { title: '⚠️ Alarm ve Etiket Standartları — Kritik Hatırlatmalar', content: 'Sık yapılan hatalar ve doğruları:\n\n❌ Terlikte tek eşe alarm → ✅ İki çifti birleştir\n❌ Orijinal barkod üzerine etiket → ✅ Kesinlikle basmayın\n❌ İndirimli ayakkabıda yeni sezon pop → ✅ Kullanmayın\n🔴 İndirimli = Kırmızı sticker\n⚪ İndirimsiz = Beyaz sticker\n\n📎 Detaylı PDF: Eğitimler → Alarm ve Etiket Standartları', category: 'TIPS', isPinned: true },
    ];
    const createdPosts = [];
    for (const p of communityPosts) {
        const author = activeEmps[Math.floor(Math.random() * activeEmps.length)];
        const post = await prisma.communityPost.create({ data: { id: uuidv4(), ...p, authorId: author.id } });
        createdPosts.push(post);
    }
    // Comments
    for (let i = 0; i < Math.min(3, createdPosts.length); i++) {
        const commenter = activeEmps[Math.floor(Math.random() * activeEmps.length)];
        await prisma.communityComment.create({ data: { id: uuidv4(), postId: createdPosts[i].id, authorId: commenter.id, content: 'Çok faydalı bilgiler, teşekkürler!' } });
    }
    console.log('  ✓ Topluluk gönderileri oluşturuldu');

    // =====================================================================
    // GAMIFICATION — Rozetler (DEFAULT_BADGES)
    // =====================================================================
    const DEFAULT_BADGES = [
        { code: 'ILK_ADIM', name: 'İlk Adım', description: 'İlk eğitimini tamamladın', icon: 'rocket_launch', color: '#3b82f6', tier: 'BRONZE', category: 'TRAINING', criteria: '1 eğitim tamamla', sortOrder: 1 },
        { code: 'CALISKAN_OGRENCI', name: 'Çalışkan Öğrenci', description: '5 eğitimi başarıyla tamamladın', icon: 'menu_book', color: '#06b6d4', tier: 'SILVER', category: 'TRAINING', criteria: '5 eğitim tamamla', sortOrder: 2 },
        { code: 'EGITIM_SAMPIYONU', name: 'Eğitim Şampiyonu', description: '10 eğitimi başarıyla tamamladın', icon: 'military_tech', color: '#f59e0b', tier: 'GOLD', category: 'TRAINING', criteria: '10 eğitim tamamla', sortOrder: 3 },
        { code: 'SINAV_USTASI', name: 'Sınav Ustası', description: '5 sınavı başarıyla geçtin', icon: 'quiz', color: '#16a34a', tier: 'SILVER', category: 'QUIZ', criteria: '5 sınav geç', sortOrder: 4 },
        { code: 'MUKEMMELLIK', name: 'Mükemmellik Peşinde', description: '3 sınavda %100 puan aldın', icon: 'star', color: '#f59e0b', tier: 'GOLD', category: 'QUIZ', criteria: '3 sınavda 100/100', sortOrder: 5 },
        { code: 'SIMULASYON_FAN', name: 'Simülasyon Hayranı', description: '5 senaryo tamamladın', icon: 'theater_comedy', color: '#8b5cf6', tier: 'BRONZE', category: 'SIMULATION', criteria: '5 simülasyon tamamla', sortOrder: 6 },
        { code: 'ALTIN_SATICI', name: 'Altın Satıcı', description: 'Simülasyonda 85+ puan aldın', icon: 'workspace_premium', color: '#f59e0b', tier: 'GOLD', category: 'SIMULATION', criteria: '85+ simülasyon skoru', sortOrder: 7 },
        { code: 'EMPATI_USTASI', name: 'Empati Ustası', description: 'Simülasyonda 90+ empati puanı aldın', icon: 'favorite', color: '#ec4899', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ empati skoru', sortOrder: 8 },
        { code: 'CAPRAZ_SATIS_USTASI', name: 'Çapraz Satış Ustası', description: 'Simülasyonda 90+ çapraz satış puanı aldın', icon: 'sync_alt', color: '#8b5cf6', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ çapraz satış skoru', sortOrder: 9 },
        { code: 'KAPANIS_USTASI', name: 'Kapanış Ustası', description: 'Simülasyonda 90+ kapanış puanı aldın', icon: 'flag', color: '#16a34a', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ kapanış skoru', sortOrder: 10 },
        { code: 'URUN_UZMANI', name: 'Ürün Uzmanı', description: 'Simülasyonda 90+ ürün bilgisi puanı aldın', icon: 'school', color: '#3b82f6', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ ürün bilgisi skoru', sortOrder: 11 },
        { code: 'TOPLULUK_KATKICISI', name: 'Topluluk Katkıcısı', description: 'Topluluğa 3 gönderi paylaştın', icon: 'forum', color: '#06b6d4', tier: 'BRONZE', category: 'COMMUNITY', criteria: '3 topluluk gönderisi', sortOrder: 12 },
        { code: 'HAFTANIN_KAHRAMANI', name: 'Haftanın Kahramanı', description: '7 gün üst üste aktif oldun', icon: 'local_fire_department', color: '#dc2626', tier: 'SILVER', category: 'STREAK', criteria: '7 gün streak', sortOrder: 13 },
        { code: 'CELIK_DISIPLIN', name: 'Çelik Disiplin', description: '30 gün üst üste aktif oldun', icon: 'whatshot', color: '#dc2626', tier: 'PLATINUM', category: 'STREAK', criteria: '30 gün streak', sortOrder: 14 },
    ];
    const badgeMap = {};
    for (const b of DEFAULT_BADGES) {
        const badge = await prisma.badge.create({ data: { id: uuidv4(), ...b } });
        badgeMap[b.code] = badge;
    }
    console.log(`  ✓ ${DEFAULT_BADGES.length} rozet oluşturuldu`);

    // =====================================================================
    // GAMIFICATION — XP transaction'ları + UserBadge atamaları (random)
    // =====================================================================
    let xpTxCount = 0, userBadgeCount = 0;
    for (const emp of activeEmps.slice(0, 80)) { // İlk 80 aktif çalışana
        const numActions = 3 + Math.floor(Math.random() * 12); // 3-14 aktivite
        for (let i = 0; i < numActions; i++) {
            const events = [
                { source: 'TRAINING_COMPLETE', amount: 50, reason: 'Eğitim tamamlandı' },
                { source: 'QUIZ_PASS', amount: 30, reason: 'Sınav başarıyla geçildi' },
                { source: 'QUIZ_PASS', amount: 60, reason: 'Sınavda mükemmel skor!' },
                { source: 'COMMUNITY_POST', amount: 15, reason: 'Topluluk gönderisi paylaşıldı' },
                { source: 'KPI_GOAL_MET', amount: 100, reason: 'Aylık KPI hedefi tutturuldu' },
            ];
            const e = events[Math.floor(Math.random() * events.length)];
            await prisma.xpTransaction.create({
                data: {
                    id: uuidv4(),
                    userId: emp.id,
                    amount: e.amount,
                    source: e.source,
                    reason: e.reason,
                    createdAt: daysAgo(Math.floor(Math.random() * 60)),
                },
            });
            xpTxCount++;
        }
        // Random rozet ataması (1-3 rozet)
        const numBadges = 1 + Math.floor(Math.random() * 3);
        const codes = Object.keys(badgeMap).sort(() => Math.random() - 0.5).slice(0, numBadges);
        for (const code of codes) {
            try {
                await prisma.userBadge.create({
                    data: {
                        id: uuidv4(),
                        userId: emp.id,
                        badgeId: badgeMap[code].id,
                        earnedAt: daysAgo(Math.floor(Math.random() * 90)),
                    },
                });
                userBadgeCount++;
            } catch { /* unique constraint — skip duplicate */ }
        }
    }
    console.log(`  ✓ ${xpTxCount} XP işlemi, ${userBadgeCount} rozet ataması`);

    // =====================================================================
    // SHIFTS — Bu hafta için her mağazaya 5-10 vardiya
    // =====================================================================
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const shiftTypes = [
        { type: 'MORNING', startTime: '09:00', endTime: '15:00' },
        { type: 'EVENING', startTime: '15:00', endTime: '22:00' },
        { type: 'FULL',    startTime: '09:00', endTime: '18:00' },
    ];

    let shiftCount = 0;
    for (const store of stores) {
        const storeEmps = activeEmps.filter(e => e.storeId === store.id);
        if (storeEmps.length === 0) continue;
        // 2 hafta için (1 geçmiş, 1 gelecek)
        for (let week = -1; week <= 1; week++) {
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const shiftDate = new Date(monday);
                shiftDate.setDate(shiftDate.getDate() + (week * 7) + dayOffset);
                // Pazar günü daha az vardiya
                const numShifts = shiftDate.getDay() === 0 ? 1 : (1 + Math.floor(Math.random() * 3));
                const dayEmps = storeEmps.sort(() => Math.random() - 0.5).slice(0, numShifts);
                for (const emp of dayEmps) {
                    const st = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
                    const status = week < 0 ? (Math.random() > 0.1 ? 'CONFIRMED' : 'MISSED') : 'SCHEDULED';
                    await prisma.shift.create({
                        data: {
                            id: uuidv4(),
                            userId: emp.id,
                            storeId: store.id,
                            date: shiftDate,
                            startTime: st.startTime,
                            endTime: st.endTime,
                            type: st.type,
                            status,
                            createdById: admin.id,
                        },
                    });
                    shiftCount++;
                }
            }
        }
    }
    console.log(`  ✓ ${shiftCount} vardiya oluşturuldu (önceki + bu + sonraki hafta)`);

    // =====================================================================
    // LEAVE BALANCES + LEAVE REQUESTS
    // =====================================================================
    const currentYear = new Date().getFullYear();
    let leaveBalanceCount = 0, leaveReqCount = 0;
    for (const emp of activeEmps) {
        const usedDays = Math.floor(Math.random() * 8); // 0-7
        await prisma.leaveBalance.create({
            data: {
                id: uuidv4(),
                userId: emp.id,
                year: currentYear,
                totalDays: 14,
                usedDays,
                remainingDays: 14 - usedDays,
            },
        });
        leaveBalanceCount++;
    }

    // Sample leave requests
    const leaveTypes = ['ANNUAL', 'SICK', 'UNPAID', 'MARRIAGE', 'OTHER'];
    const leaveStatuses = ['PENDING', 'APPROVED', 'APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED'];
    const leaveReasons = ['Aile ziyareti', 'Hastalandım, doktora gittim', 'Düğün katılımı', 'Tatil planı', 'Çocuk hastalığı', 'Kendime zaman', 'Sınav hazırlığı'];

    for (let i = 0; i < 40; i++) {
        const emp = activeEmps[Math.floor(Math.random() * activeEmps.length)];
        const type = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];
        const startOffset = -30 + Math.floor(Math.random() * 90); // -30 to +60 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + startOffset);
        const duration = 1 + Math.floor(Math.random() * 5);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration - 1);
        // Calculate working days (skip weekends)
        let days = 0;
        const d = new Date(startDate);
        while (d <= endDate) {
            const dow = d.getDay();
            if (dow !== 0 && dow !== 6) days++;
            d.setDate(d.getDate() + 1);
        }
        if (days === 0) continue;

        const approver = status === 'APPROVED' || status === 'REJECTED'
            ? storeManagers.find(sm => sm.storeId === emp.storeId) || admin
            : null;

        await prisma.leaveRequest.create({
            data: {
                id: uuidv4(),
                userId: emp.id,
                type,
                startDate,
                endDate,
                days,
                reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
                status,
                approverId: approver?.id || null,
                approvedAt: approver ? daysAgo(Math.floor(Math.random() * 20)) : null,
                rejectionReason: status === 'REJECTED' ? 'O dönem mağazada personel sıkıntısı yaşanıyor' : null,
                createdAt: daysAgo(Math.floor(Math.random() * 30) + 1),
            },
        });
        leaveReqCount++;
    }
    console.log(`  ✓ ${leaveBalanceCount} izin bakiyesi, ${leaveReqCount} izin talebi`);

    // =====================================================================
    // SEASON + LEAGUE SCORES
    // =====================================================================
    const seasonStart = new Date(currentYear, 0, 1);  // 1 Ocak
    const seasonEnd = new Date(currentYear, 2, 31);   // 31 Mart
    const activeSeason = await prisma.season.create({
        data: {
            id: uuidv4(),
            name: `${currentYear} Q1 — Bahar Sezonu`,
            startDate: seasonStart,
            endDate: seasonEnd,
            status: 'ACTIVE',
            description: 'Yılın ilk sezon yarışması — top 3 mağazaya özel ödüller!',
        },
    });

    // Önceki sezon (geçmiş)
    const prevSeasonStart = new Date(currentYear - 1, 9, 1);
    const prevSeasonEnd = new Date(currentYear - 1, 11, 31);
    await prisma.season.create({
        data: {
            id: uuidv4(),
            name: `${currentYear - 1} Q4 — Kış Sezonu`,
            startDate: prevSeasonStart,
            endDate: prevSeasonEnd,
            status: 'COMPLETED',
            description: 'Tamamlanan kış sezonu',
        },
    });

    // Calculate league scores for active season
    let leagueScoreCount = 0;
    for (const store of stores) {
        const allAssign = await prisma.trainingAssignment.count({ where: { user: { storeId: store.id } } });
        const completedAssign = await prisma.trainingAssignment.count({ where: { user: { storeId: store.id }, status: 'COMPLETED' } });
        const trainingRate = allAssign > 0 ? (completedAssign / allAssign) * 100 : 0;

        const ciroKpi = kpiDefinitions.find(k => k.name === 'Hedef Gerçekleşme Oranı');
        let kpiRate = 0;
        if (ciroKpi) {
            const entries = await prisma.kpiEntry.findMany({
                where: { storeId: store.id, kpiDefinitionId: ciroKpi.id },
                orderBy: { period: 'desc' },
                take: 3,
            });
            if (entries.length > 0) kpiRate = entries.reduce((a, e) => a + e.value, 0) / entries.length;
        }
        kpiRate = Math.min(120, kpiRate);

        const memnunKpi = kpiDefinitions.find(k => k.name === 'Müşteri Memnuniyeti');
        let qualityScore = 0;
        if (memnunKpi) {
            const entries = await prisma.kpiEntry.findMany({
                where: { storeId: store.id, kpiDefinitionId: memnunKpi.id },
                orderBy: { period: 'desc' },
                take: 3,
            });
            if (entries.length > 0) qualityScore = entries.reduce((a, e) => a + e.value, 0) / entries.length;
        }

        const totalAttempts = await prisma.quizAttempt.count({ where: { user: { storeId: store.id } } });
        const passedAttempts = await prisma.quizAttempt.count({ where: { user: { storeId: store.id }, passed: true } });
        const quizRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;

        const trainingPoints = trainingRate * 0.30;
        const kpiPoints = kpiRate * 0.40;
        const qualityPoints = qualityScore * 0.20;
        const quizPoints = quizRate * 0.10;
        const totalPoints = trainingPoints + kpiPoints + qualityPoints + quizPoints;

        await prisma.leagueScore.create({
            data: {
                id: uuidv4(),
                seasonId: activeSeason.id,
                storeId: store.id,
                totalPoints,
                trainingPoints,
                kpiPoints,
                qualityPoints,
                quizPoints,
            },
        });
        leagueScoreCount++;
    }

    // Assign ranks
    const allScores = await prisma.leagueScore.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { totalPoints: 'desc' },
    });
    for (let i = 0; i < allScores.length; i++) {
        await prisma.leagueScore.update({
            where: { id: allScores[i].id },
            data: { rank: i + 1 },
        });
    }
    console.log(`  ✓ 1 aktif sezon + 1 geçmiş sezon, ${leagueScoreCount} mağaza skoru`);

    // =====================================================================
    // DONE
    // =====================================================================
    // Find first store manager for demo login
    const firstSM = storeManagers.find(s => s.isActive);
    const firstAM = assistantManagers.find(a => a.isActive);
    const firstEmp = activeEmps[0];

    console.log('');
    console.log('✅ Seed completed successfully!');
    console.log('');
    console.log('📊 Özet:');
    console.log(`   3 bölge, ${stores.length} mağaza`);
    console.log(`   ${allUsers.length + 4} kullanıcı (1 admin, 3 RM, ${storeManagers.length} SM, ${assistantManagers.length} AM, ${employees.length} çalışan)`);
    console.log(`   ${activeCount} aktif, ${inactiveCount} ayrılmış personel`);
    console.log('   8 eğitim, ' + assignmentCount + ' atama');
    console.log(`   ${quizzes.length} sınav, ${attemptCount} deneme`);
    console.log(`   ${kpiDefinitions.length} KPI tanımı, ${kpiCount} giriş`);
    console.log(`   ${feedbackData.length} geri bildirim`);
    console.log(`   ${DEFAULT_BADGES.length} rozet, ${xpTxCount} XP işlemi, ${userBadgeCount} rozet atama`);
    console.log(`   ${shiftCount} vardiya, ${leaveReqCount} izin talebi`);
    console.log(`   2 sezon, ${leagueScoreCount} mağaza ligi skoru`);
    console.log('');
    console.log('📧 Demo Hesaplar:');
    console.log('   Super Admin:       admin@sporthink.com / admin123');
    console.log('   Bölge Müdürü (İzm): bolge.izmir@sporthink.com / rm123');
    console.log('   Bölge Müdürü (Ege): bolge.ege@sporthink.com / rm123');
    console.log('   Bölge Müdürü (Akd): bolge.akdeniz@sporthink.com / rm123');
    if (firstSM) console.log(`   Mağaza Müdürü:     ${firstSM.email} / sm123`);
    if (firstAM) console.log(`   Müdür Yardımcısı:  ${firstAM.email} / am123`);
    if (firstEmp) console.log(`   Çalışan:           ${firstEmp.email} / emp123`);
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
