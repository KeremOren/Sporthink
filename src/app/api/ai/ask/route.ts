import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Role-specific system prompts
const ROLE_PROMPTS: Record<string, string> = {
    SUPER_ADMIN: `Sen Sporthink perakende zincirinin üst düzey yönetim asistanısın. Kullanıcı bir Super Admin (Sistem Yöneticisi).
Stratejik, analitik ve veri odaklı yanıtlar ver. Sistem genelinde eğitim performansı, mağaza karşılaştırmaları, KPI takibi ve personel yönetimi hakkında uzman düzeyinde bilgi sun.
Tüm mağazaların verilerine erişimi var. Raporlama, trend analizi ve stratejik kararlar konusunda yardımcı ol.`,

    REGIONAL_MANAGER: `Sen Sporthink perakende zincirinin bölge performans danışmanısın. Kullanıcı bir Bölge Müdürü.
Bölge yönetimi perspektifinden yanıt ver. Mağazalar arası karşılaştırma yap, performans önerileri sun. 
Pratik, uygulanabilir ve sonuç odaklı tavsiyeler ver. Eğitim takibi ve personel gelişimi konularına odaklan.`,

    STORE_MANAGER: `Sen Sporthink perakende zincirinin mağaza koçusun. Kullanıcı bir Mağaza Müdürü.
Ekip yönetimi, satış danışmanı performansı, mağaza operasyonları ve müşteri deneyimi konularında pratik öneriler sun.
Koçluk ve mentorluk yaklaşımıyla yanıt ver. Geri bildirim verme teknikleri, motivasyon ve eğitim takibi konularında yardımcı ol.`,

    ASSISTANT_MANAGER: `Sen Sporthink perakende zincirinin operasyon asistanısın. Kullanıcı bir Müdür Yardımcısı.
Günlük mağaza operasyonları, prosedürler, stok yönetimi ve ekip koordinasyonu konularında net bilgi ver.
Operasyonel süreçlere odaklan, iş akışlarını anlat.`,

    EMPLOYEE: `Sen Sporthink perakende zincirinin öğrenme arkadaşısın. Kullanıcı bir Satış Danışmanı (çalışan).
Samimi, cesaretlendirici ve öğretici bir dilde yanıt ver. Karmaşık konuları basit ve anlaşılır anlat.
Eğitim içerikleri, sınav hazırlığı, müşteri karşılama teknikleri, ürün bilgisi ve kariyer gelişimi hakkında yardımcı ol.
Emoji kullan, motive et, öğrenmeyi teşvik et. Sınav hazırlık soruları sorulursa pratik sorular üret.`,
};

const SPORTHINK_KNOWLEDGE = `
## Sporthink Hakkında
- Sporthink, çok markalı spor perakende zinciridir.
- Nike, Adidas, Puma, The North Face, Columbia, Hummel, Converse, Vans gibi markalar satılır.
- Mağazalar İzmir ve Ege Bölgesinde yer alır.

## Mağaza Standartları
- Alarm ve Etiket: Terlikte tek eşe alarm → İki çifti birleştir. Orijinal barkod üzerine etiket basmayın. İndirimli = Kırmızı sticker, İndirimsiz = Beyaz sticker.
- Müşteri Karşılama 6 Adımı: 1) Gülümseyerek karşıla, 2) Göz teması kur, 3) "Hoş geldiniz" de, 4) İhtiyaç analizi yap, 5) Ürün önerisi sun, 6) Teşekkür et ve vedalaş.
- Mağaza açılış prosedürü: Alarm kontrolü, kasa sayımı, ışık/müzik açma, vitrin düzeni, temizlik kontrolü.
- Kasa İşlemleri: Fatura kesme, iade işlemleri, kampanya uygulama, POS sistemi kullanımı.

## Eğitim Sistemi
- Zorunlu (MANDATORY) ve İsteğe Bağlı (OPTIONAL) eğitimler vardır.
- Her eğitim sonunda sınav yapılabilir.
- Sınav geçme puanı varsayılan %70, eğitim başına ayarlanabilir (minPassRate).
- Maksimum 3 sınav hakkı verilir.
- Başarısız olunursa eğitim otomatik tekrar atanır.
- Tamamlanan eğitimler için sertifika verilir.
- Kategoriler: Güvenlik, Satış, Ürün, Operasyon, Yönetim.

## KPI ve Performans
- Aylık ciro, adet, sepet, UPT (Units Per Transaction) takip edilir.
- %90 altı hedef gerçekleşme düşük performans olarak işaretlenir.
- Mağaza bazlı ve çalışan bazlı performans analizi yapılır.

## Platform Özellikleri
- Dashboard: Eğitim tamamlama oranları ve KPI özetleri
- Eğitimler: Eğitim listesi, içerik, sınav
- KPI: Mağaza bazlı performans metrikleri
- Performans: Hedef gerçekleşme ve düşük performans uyarıları
- Gelişim Dosyası: Pozitif / Yapıcı / Odaklanmış geri bildirim (3 kategori)
- Nabız Anketi: Anonim çalışan memnuniyet anketleri
- Topluluk: Tartışma, duyuru, bilgi paylaşımı, Teams entegrasyonu
- Sertifikalarım: Tamamlanan eğitim sertifikaları
- Sistem Logları: Admin işlem kayıtları

## Roller
- Super Admin: Tüm yetkiler, sistem yönetimi
- Bölge Müdürü (Regional Manager): Bölge mağazalarını yönetir
- Mağaza Müdürü (Store Manager): Kendi mağazasını ve satış danışmanlarını yönetir
- Müdür Yardımcısı (Assistant Manager): Operasyonel destek
- Çalışan (Employee / Satış Danışmanı): Eğitim alır, sınav olur
`;

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { question, trainingId, history } = await request.json();

    if (!question?.trim()) {
        return NextResponse.json({ error: 'Soru gerekli' }, { status: 400 });
    }

    try {
        // Get training content for context (RAG)
        let trainingContext = '';
        let trainingTitle = '';
        if (trainingId) {
            const training = await prisma.training.findUnique({
                where: { id: trainingId },
                include: { contents: true },
            });
            if (training) {
                trainingTitle = training.title;
                trainingContext = `\n\n## Seçili Eğitim: "${training.title}"\nİçerik:\n${training.contents
                    .map(c => `${c.title ? `### ${c.title}\n` : ''}${c.content || ''}`)
                    .join('\n\n')}`;
            }
        }

        // Get user stats
        const userStats = await getUserStats(user.id, user.role, user.storeId);

        // Build system prompt
        const rolePrompt = ROLE_PROMPTS[user.role] || ROLE_PROMPTS.EMPLOYEE;
        const systemPrompt = `${rolePrompt}

Kullanıcı Bilgileri:
- Ad: ${user.firstName} ${user.lastName}
- Rol: ${user.role}
${user.storeName ? `- Mağaza: ${user.storeName}` : ''}

${formatUserStats(user.role, userStats)}

${SPORTHINK_KNOWLEDGE}
${trainingContext}

Kurallar:
- Türkçe yanıt ver.
- Kısa ve öz yanıtlar ver, gereksiz uzatma.
- Markdown formatı kullan (bold, liste, emoji).
- Kullanıcının rolüne göre uygun bir dil ve ton kullan.
- Eğer eğitim içeriği seçildiyse, yanıtlarını o içeriğe dayandır.

KAPSAM KURALI (ÇOK ÖNEMLİ):
- SADECE şu konularda cevap ver: Sporthink şirketi, perakende sektörü, mağaza operasyonları, satış teknikleri, müşteri ilişkileri, ekip yönetimi, eğitim/sınav konuları, KPI ve performans, kariyer gelişimi, iş hayatı motivasyonu, iletişim becerileri.
- AŞAĞIDAKİ KONULARA CEVAP VERME: yemek tarifleri, kod yazma, programlama, oyunlar, müzik, film/dizi, kişisel ilişkiler, sağlık tavsiyesi, hukuki tavsiye, genel kültür soruları, siyasi/dini konular, başka şirketlerin iç işleri, ödev/sınav hilesi.
- Konu dışı bir soru gelirse şu yanıtı ver (KESİNLİKLE BAŞKA BİR ŞEY EKLEME):

"🚫 Ben sadece Sporthink ve iş ile ilgili konularda yardımcı olabilirim. İşinle, mağazanla, eğitimlerinle veya kariyer gelişiminle ilgili bir konuda nasıl yardımcı olabilirim? 😊"

- Şüpheli bir soruda (iş hayatıyla bağlantı kurulabilir mi diye düşünüyorsan) sadece iş bağlamında kalarak yanıtla.`;

        // Call Groq API (OpenAI-compatible chat completions)
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            // Fallback to rule-based if no API key
            return NextResponse.json({
                answer: generateFallbackAnswer(question, user, userStats),
                sources: trainingId ? [trainingTitle || 'Eğitim İçeriği'] : ['Sporthink Bilgi Tabanı'],
                timestamp: new Date().toISOString(),
            });
        }

        // Groq modelleri (sırayla denenir — biri başarısız olursa diğerine geçer)
        const modelsToTry = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
        let answer = '';
        let usedModel = '';
        let lastError = '';

        // Konuşma geçmişini OpenAI mesaj formatına çevir (son 6 mesaj)
        const historyMessages = (history || [])
            .filter((msg: any) => msg.content && msg.content.trim())
            .slice(-6)
            .map((msg: any) => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
            }));

        const messages = [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: question },
        ];

        for (const modelName of modelsToTry) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages,
                        temperature: 0.7,
                        max_tokens: 1024,
                    }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    lastError = `${res.status}: ${errData?.error?.message || res.statusText}`;
                    console.warn(`Groq model ${modelName} failed: ${lastError.substring(0, 120)}`);
                    continue;
                }

                const data = await res.json();
                answer = data?.choices?.[0]?.message?.content || '';
                if (answer) {
                    usedModel = modelName;
                    break;
                }
            } catch (modelError: any) {
                lastError = modelError?.message || String(modelError);
                console.warn(`Groq model ${modelName} fetch error:`, lastError.substring(0, 150));
                continue;
            }
        }

        if (!answer) {
            // Tüm modeller başarısız → fallback
            console.error('All Groq models failed. Last error:', lastError);
            return NextResponse.json({
                answer: generateFallbackAnswer(question, user, userStats),
                sources: ['Sporthink Bilgi Tabanı'],
                timestamp: new Date().toISOString(),
            });
        }

        // Log interaction
        await prisma.auditLog.create({
            data: {
                action: 'AI_QUESTION',
                entity: 'ai_assistant',
                details: JSON.stringify({ question: question.substring(0, 200), trainingId, role: user.role, model: usedModel }),
                userId: user.id,
            },
        });

        return NextResponse.json({
            answer,
            sources: trainingId ? [trainingTitle || 'Eğitim İçeriği'] : ['Sporthink AI Asistan'],
            timestamp: new Date().toISOString(),
            model: usedModel,
        });

    } catch (error: any) {
        console.error('AI error:', error);
        
        // Fallback to rule-based on unexpected error
        const userStats = await getUserStats(user.id, user.role, user.storeId);
        return NextResponse.json({
            answer: generateFallbackAnswer(question, user, userStats),
            sources: ['Sporthink Bilgi Tabanı (Offline)'],
            timestamp: new Date().toISOString(),
            fallback: true,
        });
    }
}

// ==================== HELPERS ====================

async function getUserStats(userId: string, role: string, storeId?: string) {
    const stats: any = {};

    const now = new Date();
    const isOverdue = (a: any) => a.status !== 'COMPLETED' && a.dueDate && new Date(a.dueDate) < now;

    if (role === 'EMPLOYEE' || role === 'ASSISTANT_MANAGER') {
        const assignments = await prisma.trainingAssignment.findMany({
            where: { userId },
            select: { status: true, dueDate: true, training: { select: { title: true } } },
        });
        stats.totalAssignments = assignments.length;
        stats.completed = assignments.filter(a => a.status === 'COMPLETED').length;
        stats.overdue = assignments.filter(isOverdue).length;
        stats.inProgress = assignments.filter(a => a.status === 'IN_PROGRESS' || a.status === 'READY_FOR_QUIZ').length;
        stats.completionRate = stats.totalAssignments > 0 ? Math.round((stats.completed / stats.totalAssignments) * 100) : 0;
        // Gerçek eğitim isimleri
        stats.completedTitles = assignments.filter(a => a.status === 'COMPLETED').map(a => a.training.title).slice(0, 8);
        stats.pendingTitles = assignments.filter(a => a.status !== 'COMPLETED').map(a => a.training.title).slice(0, 8);
        stats.overdueTitles = assignments.filter(isOverdue).map(a => a.training.title).slice(0, 8);
        // Sertifika sayısı = tamamlanan eğitim sayısı
        stats.certificateCount = stats.completed;
    }

    if (role === 'STORE_MANAGER' && storeId) {
        const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
        stats.storeName = store?.name || 'Mağazanız';
        const teamMembers = await prisma.user.findMany({
            where: { storeId, role: { in: ['EMPLOYEE', 'ASSISTANT_MANAGER'] }, isActive: true },
            select: {
                firstName: true, lastName: true,
                trainingAssignments: { select: { status: true, dueDate: true } },
            },
        });
        stats.teamSize = teamMembers.length;
        const allAssign = teamMembers.flatMap(m => m.trainingAssignments);
        stats.teamTotal = allAssign.length;
        stats.teamCompleted = allAssign.filter(a => a.status === 'COMPLETED').length;
        stats.teamOverdue = allAssign.filter(isOverdue).length;
        stats.teamRate = stats.teamTotal > 0 ? Math.round((stats.teamCompleted / stats.teamTotal) * 100) : 0;
        // Geride kalan çalışanlar (gecikmiş eğitimi olanlar)
        stats.laggingMembers = teamMembers
            .filter(m => m.trainingAssignments.some(isOverdue))
            .map(m => `${m.firstName} ${m.lastName}`)
            .slice(0, 6);
        // En iyi çalışanlar (hepsini tamamlamış)
        stats.topMembers = teamMembers
            .filter(m => m.trainingAssignments.length > 0 && m.trainingAssignments.every(a => a.status === 'COMPLETED'))
            .map(m => `${m.firstName} ${m.lastName}`)
            .slice(0, 6);
    }

    if (role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER') {
        const totalUsers = await prisma.user.count({ where: { isActive: true } });
        const totalAssignments = await prisma.trainingAssignment.count();
        const completedAssignments = await prisma.trainingAssignment.count({ where: { status: 'COMPLETED' } });
        stats.totalUsers = totalUsers;
        stats.totalAssignments = totalAssignments;
        stats.completedAssignments = completedAssignments;
        stats.overallRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

        // Mağaza bazlı tamamlama oranı (en iyi / en kötü)
        const storeWhere: any = {};
        if (role === 'REGIONAL_MANAGER' && (await prisma.user.findUnique({ where: { id: userId }, select: { regionId: true } }))?.regionId) {
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { regionId: true } });
            if (u?.regionId) storeWhere.regionId = u.regionId;
        }
        const stores = await prisma.store.findMany({
            where: storeWhere,
            select: {
                name: true,
                users: { where: { isActive: true }, select: { trainingAssignments: { select: { status: true } } } },
            },
        });
        const storeRates = stores.map(s => {
            const all = s.users.flatMap(u => u.trainingAssignments);
            const done = all.filter(a => a.status === 'COMPLETED').length;
            return { name: s.name, rate: all.length > 0 ? Math.round((done / all.length) * 100) : 0, total: all.length };
        }).filter(s => s.total > 0).sort((a, b) => b.rate - a.rate);
        stats.topStores = storeRates.slice(0, 3).map(s => `${s.name} (%${s.rate})`);
        stats.bottomStores = storeRates.slice(-3).reverse().map(s => `${s.name} (%${s.rate})`);
        stats.storeCount = stores.length;
    }

    return stats;
}

function formatUserStats(role: string, stats: any): string {
    const list = (arr?: string[]) => (arr && arr.length ? arr.join(', ') : 'yok');

    if (role === 'EMPLOYEE' || role === 'ASSISTANT_MANAGER') {
        return `BU ÇALIŞANIN GERÇEK VERİLERİ (yanıtlarında bunları kullan):
- Toplam atanan eğitim: ${stats.totalAssignments || 0}
- Tamamlanan: ${stats.completed || 0} (= ${stats.certificateCount || 0} sertifika)
- Devam eden: ${stats.inProgress || 0}
- Gecikmiş: ${stats.overdue || 0}
- Tamamlama oranı: %${stats.completionRate || 0}
- Tamamladığı eğitimler: ${list(stats.completedTitles)}
- Henüz bitirmediği eğitimler: ${list(stats.pendingTitles)}
- GECİKMİŞ eğitimleri (öncelik ver): ${list(stats.overdueTitles)}

Bu çalışana özel, kişisel tavsiyeler ver. "Şu eğitimini tamamlamalısın" gibi somut yönlendir.`;
    }
    if (role === 'STORE_MANAGER') {
        return `BU MAĞAZA MÜDÜRÜNÜN GERÇEK VERİLERİ (yanıtlarında bunları kullan):
- Mağaza: ${stats.storeName || '-'}
- Ekip büyüklüğü: ${stats.teamSize || 0} kişi
- Toplam eğitim ataması: ${stats.teamTotal || 0}
- Tamamlanan: ${stats.teamCompleted || 0}
- Gecikmiş: ${stats.teamOverdue || 0}
- Ekip tamamlama oranı: %${stats.teamRate || 0}
- Geride kalan çalışanlar (gecikmiş eğitimi olanlar): ${list(stats.laggingMembers)}
- Tüm eğitimlerini bitiren çalışanlar: ${list(stats.topMembers)}

Müdüre koçluk yap. Geride kalan çalışanları ismen söyle ve onlar için aksiyon öner.`;
    }
    if (role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER') {
        return `${role === 'SUPER_ADMIN' ? 'SİSTEM' : 'BÖLGE'} GERÇEK VERİLERİ (yanıtlarında bunları kullan):
- Mağaza sayısı: ${stats.storeCount || 0}
- Toplam aktif kullanıcı: ${stats.totalUsers || 0}
- Toplam eğitim ataması: ${stats.totalAssignments || 0}
- Tamamlanan: ${stats.completedAssignments || 0}
- Genel tamamlama oranı: %${stats.overallRate || 0}
- EN İYİ mağazalar: ${list(stats.topStores)}
- EN GERİDE mağazalar (aksiyon gerekli): ${list(stats.bottomStores)}

Stratejik ve veri odaklı konuş. Geride kalan mağazaları ismen söyle ve onlar için plan öner.`;
    }
    return '';
}

function generateFallbackAnswer(question: string, user: any, stats: any): string {
    const q = question.toLowerCase();
    const name = user.firstName || '';

    if (q.includes('alarm') || q.includes('etiket')) {
        return `🏷️ **Alarm ve Etiket Standartları:**\n\n• Terlikte tek eşe alarm → İki çifti birleştir\n• Orijinal barkod üzerine etiket → **Kesinlikle basmayın**\n• İndirimli = 🔴 Kırmızı sticker\n• İndirimsiz = ⚪ Beyaz sticker\n\n💡 Bu kuralları sınavda karşına çıkabilir!`;
    }
    if (q.includes('müşteri') || q.includes('karşılama')) {
        return `👋 **Müşteri Karşılama 6 Adımı:**\n\n1. 😊 Gülümseyerek karşıla\n2. 👁️ Göz teması kur\n3. 🗣️ "Hoş geldiniz" de\n4. 🎯 İhtiyaç analizi yap\n5. 👕 Ürün önerisi sun\n6. 🙏 Teşekkür et ve vedalaş`;
    }
    if (q.includes('performans') || q.includes('durum')) {
        if (user.role === 'EMPLOYEE') {
            return `📊 **${name}, eğitim durumun:**\n\n• Toplam: ${stats.totalAssignments || 0}\n• Tamamlanan: ${stats.completed || 0}\n• Gecikmiş: ${stats.overdue || 0}\n• Oran: **%${stats.completionRate || 0}**`;
        }
    }
    
    return `🤖 Şu an offline modda yanıt veriyorum. Daha detaylı yanıtlar için internet bağlantısını kontrol edin.\n\n**Sorunuz:** "${question}"\n\nÖneri butonlarından birini deneyebilirsiniz.`;
}
