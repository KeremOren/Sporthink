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

        // Call Gemini API
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            // Fallback to rule-based if no API key
            return NextResponse.json({
                answer: generateFallbackAnswer(question, user, userStats),
                sources: trainingId ? [trainingTitle || 'Eğitim İçeriği'] : ['Sporthink Bilgi Tabanı'],
                timestamp: new Date().toISOString(),
            });
        }

        // Try multiple models with direct fetch (more reliable than SDK)
        const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
        let answer = '';
        let usedModel = '';
        let lastError = '';

        // Build conversation context from history
        const historyContext = (history || [])
            .filter((msg: any) => msg.content && msg.content.trim())
            .slice(-6)
            .map((msg: any) => `${msg.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${msg.content}`)
            .join('\n\n');

        const fullPrompt = historyContext 
            ? `Önceki konuşma:\n${historyContext}\n\nKullanıcının yeni sorusu: ${question}`
            : question;

        for (const modelName of modelsToTry) {
            try {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        contents: [{
                            parts: [{ text: fullPrompt }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1024,
                        },
                    }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    lastError = `${res.status}: ${errData?.error?.message || res.statusText}`;
                    console.warn(`Model ${modelName} failed: ${lastError.substring(0, 120)}`);
                    
                    // If rate limited, wait and retry once
                    if (res.status === 429) {
                        console.log(`Rate limited on ${modelName}, waiting 10s...`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        
                        const retryRes = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                system_instruction: { parts: [{ text: systemPrompt }] },
                                contents: [{ parts: [{ text: fullPrompt }] }],
                                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
                            }),
                        });
                        
                        if (retryRes.ok) {
                            const retryData = await retryRes.json();
                            answer = retryData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (answer) { usedModel = modelName; break; }
                        }
                    }
                    continue;
                }

                const data = await res.json();
                answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (answer) {
                    usedModel = modelName;
                    break;
                }
            } catch (modelError: any) {
                lastError = modelError?.message || String(modelError);
                console.warn(`Model ${modelName} fetch error:`, lastError.substring(0, 150));
                continue;
            }
        }

        if (!answer) {
            // All models failed — return clear error
            console.error('All Gemini models failed. Last error:', lastError);
            
            const errorAnswer = `⚠️ **Gemini API Geçici Olarak Kullanılamıyor**\n\nAPI key'iniz rate limit'e ulaşmış durumda. Bu genellikle yeni oluşturulmuş API key'lerde birkaç saat sürebilir.\n\n**Yapabilecekleriniz:**\n1. ⏳ Birkaç dakika bekleyip tekrar deneyin\n2. 🔑 [Google AI Studio](https://aistudio.google.com/apikey)'dan yeni bir projede key oluşturun\n3. 📊 Rate Limit sayfanızı kontrol edin\n\n_Sistem şu an Sporthink bilgi tabanı ile yanıt verecek._\n\n---\n\n${generateFallbackAnswer(question, user, userStats)}`;

            return NextResponse.json({
                answer: errorAnswer,
                sources: ['Sporthink Bilgi Tabanı (API Bekleniyor)'],
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
            sources: trainingId ? [trainingTitle || 'Eğitim İçeriği'] : ['Gemini AI + Sporthink Bilgi Tabanı'],
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

    if (role === 'EMPLOYEE' || role === 'ASSISTANT_MANAGER') {
        const assignments = await prisma.trainingAssignment.findMany({
            where: { userId },
            select: { status: true },
        });
        stats.totalAssignments = assignments.length;
        stats.completed = assignments.filter(a => a.status === 'COMPLETED').length;
        stats.overdue = assignments.filter(a => a.status === 'OVERDUE').length;
        stats.inProgress = assignments.filter(a => a.status === 'IN_PROGRESS').length;
        stats.completionRate = stats.totalAssignments > 0 ? Math.round((stats.completed / stats.totalAssignments) * 100) : 0;
    }

    if (role === 'STORE_MANAGER' && storeId) {
        const storeUsers = await prisma.user.count({ where: { storeId, role: 'EMPLOYEE', isActive: true } });
        const storeAssignments = await prisma.trainingAssignment.findMany({
            where: { user: { storeId } },
            select: { status: true },
        });
        stats.teamSize = storeUsers;
        stats.teamTotal = storeAssignments.length;
        stats.teamCompleted = storeAssignments.filter(a => a.status === 'COMPLETED').length;
        stats.teamOverdue = storeAssignments.filter(a => a.status === 'OVERDUE').length;
        stats.teamRate = stats.teamTotal > 0 ? Math.round((stats.teamCompleted / stats.teamTotal) * 100) : 0;
    }

    if (role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER') {
        const totalUsers = await prisma.user.count({ where: { isActive: true } });
        const totalAssignments = await prisma.trainingAssignment.count();
        const completedAssignments = await prisma.trainingAssignment.count({ where: { status: 'COMPLETED' } });
        stats.totalUsers = totalUsers;
        stats.totalAssignments = totalAssignments;
        stats.completedAssignments = completedAssignments;
        stats.overallRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
    }

    return stats;
}

function formatUserStats(role: string, stats: any): string {
    if (role === 'EMPLOYEE' || role === 'ASSISTANT_MANAGER') {
        return `Kullanıcı İstatistikleri:
- Toplam eğitim: ${stats.totalAssignments || 0}
- Tamamlanan: ${stats.completed || 0}
- Devam eden: ${stats.inProgress || 0}
- Gecikmiş: ${stats.overdue || 0}
- Tamamlama oranı: %${stats.completionRate || 0}`;
    }
    if (role === 'STORE_MANAGER') {
        return `Mağaza İstatistikleri:
- Ekip büyüklüğü: ${stats.teamSize || 0} satış danışmanı
- Toplam eğitim ataması: ${stats.teamTotal || 0}
- Tamamlanan: ${stats.teamCompleted || 0}
- Gecikmiş: ${stats.teamOverdue || 0}
- Ekip tamamlama oranı: %${stats.teamRate || 0}`;
    }
    if (role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER') {
        return `Sistem İstatistikleri:
- Toplam aktif kullanıcı: ${stats.totalUsers || 0}
- Toplam eğitim ataması: ${stats.totalAssignments || 0}
- Tamamlanan: ${stats.completedAssignments || 0}
- Genel tamamlama oranı: %${stats.overallRate || 0}`;
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
