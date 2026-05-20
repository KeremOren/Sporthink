import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const CATEGORY_LABEL: Record<string, string> = {
    MUSTERI_KARSILAMA: 'Müşteri Karşılama',
    URUN_ONERME: 'Ürün Önerme',
    ITIRAZ: 'İtiraz Karşılama',
    EK_SATIS: 'Ek Satış',
    IADE_SIKAYET: 'İade & Şikayet',
};

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { scenarioId, history, message } = await request.json();

    if (!scenarioId || !message?.trim()) {
        return NextResponse.json({ error: 'scenarioId ve message gerekli' }, { status: 400 });
    }

    const scenario = await prisma.simScenario.findUnique({ where: { id: scenarioId } });
    if (!scenario) return NextResponse.json({ error: 'Senaryo bulunamadı' }, { status: 404 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({
            reply: 'Hmm, ben şu an düşünemiyorum (AI servisi kapalı). Yöneticine söyle, lütfen.',
            offline: true,
        });
    }

    // Build customer persona from scenario
    const persona = `Sen bir Sporthink spor mağazasına gelen GERÇEK bir müşterisin. Bir satış danışmanıyla konuşuyorsun.

## Senaryo Bağlamı
**Kategori:** ${CATEGORY_LABEL[scenario.category] || scenario.category}
**Senaryo başlığı:** ${scenario.title}
**Müşteri bağlamı:** ${scenario.customerContext}

## Rol Kuralları
- Sen MÜŞTERİSİN, satış danışmanı değilsin. Asla rolden çıkma.
- Türkçe, doğal, kısa cevaplar ver (2-4 cümle yeterli).
- Gerçek bir müşteri gibi davran: bazen kararsız ol, bazen itiraz et, bazen sorular sor.
- Senaryo kategorisine uygun davranış sergile (örn. İTİRAZ kategorisindeyse fiyat/kalite/marka itirazı yap).
- Eğer satış danışmanı iyi cevap verirse yumuşa, kötü cevap verirse sertleş.
- Satış danışmanı gerçekten ikna ediciyse, "Tamam, alıyorum" deyip konuşmayı bitirebilirsin (bu durumda mesajının sonuna [SATIS_TAMAM] yaz).
- Satış danışmanı çok kötü davranırsa "Mağazadan çıkıyorum" deyip konuşmayı bitirebilirsin (mesajının sonuna [MUSTERI_TERK] yaz).
- 8 mesaj sonunda hala karar veremezsen "Düşüneceğim, sağolun" diyerek kibarca ayrılabilirsin.

## Etiketleme
Mesajının başında MUTLAKA tek satır mood göstergesi olmalı:
- [MOOD:NÖTR] / [MOOD:İLGİLİ] / [MOOD:SİNİRLİ] / [MOOD:KARARSIZ] / [MOOD:MUTLU] / [MOOD:HAYAL_KIRIKLIĞI]

Örnek format:
[MOOD:KARARSIZ]
Hmm, biraz pahalı geldi bana. Daha uygun fiyatlı bir alternatif var mı?
`;

    // Convert history to Gemini format
    const contents: any[] = [];
    for (const msg of (history || [])) {
        if (!msg.content?.trim()) continue;
        contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        });
    }
    // Add new user message
    contents.push({
        role: 'user',
        parts: [{ text: message }],
    });

    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let reply = '';
    let usedModel = '';

    for (const modelName of modelsToTry) {
        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: persona }] },
                    contents,
                    generationConfig: { temperature: 0.85, maxOutputTokens: 300 },
                }),
            });

            if (!res.ok) continue;
            const data = await res.json();
            reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (reply) { usedModel = modelName; break; }
        } catch {
            continue;
        }
    }

    if (!reply) {
        return NextResponse.json({
            reply: '[MOOD:NÖTR]\nÖzür dilerim, sizi pek anlayamadım. Tekrar söyler misiniz?',
            offline: false,
        });
    }

    // Parse mood + end tags
    let mood = 'NÖTR';
    let ended = false;
    let endReason: string | null = null;

    const moodMatch = reply.match(/\[MOOD:([A-Z_İĞÜŞÖÇ]+)\]/i);
    if (moodMatch) {
        mood = moodMatch[1];
        reply = reply.replace(moodMatch[0], '').trim();
    }
    if (/\[SATIS_TAMAM\]/i.test(reply)) {
        ended = true;
        endReason = 'SALE_CLOSED';
        reply = reply.replace(/\[SATIS_TAMAM\]/gi, '').trim();
    }
    if (/\[MUSTERI_TERK\]/i.test(reply)) {
        ended = true;
        endReason = 'CUSTOMER_LEFT';
        reply = reply.replace(/\[MUSTERI_TERK\]/gi, '').trim();
    }

    return NextResponse.json({
        reply,
        mood,
        ended,
        endReason,
        model: usedModel,
    });
}
