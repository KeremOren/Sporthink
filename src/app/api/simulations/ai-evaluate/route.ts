import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

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
    const { scenarioId, history, durationSeconds } = await request.json();

    if (!scenarioId || !Array.isArray(history) || history.length === 0) {
        return NextResponse.json({ error: 'scenarioId ve history gerekli' }, { status: 400 });
    }

    const scenario = await prisma.simScenario.findUnique({ where: { id: scenarioId } });
    if (!scenario) return NextResponse.json({ error: 'Senaryo bulunamadı' }, { status: 404 });

    const apiKey = process.env.GEMINI_API_KEY;

    // Build transcript
    const transcript = history
        .filter((m: any) => m.content?.trim())
        .map((m: any) => `${m.role === 'assistant' ? '🧑 MÜŞTERİ' : '👔 SATIŞ DANIŞMANI'}: ${m.content}`)
        .join('\n\n');

    let evaluation: any = null;

    if (apiKey) {
        const prompt = `Sen Sporthink perakende zincirinin satış koçu ve değerlendirme uzmanısın. Aşağıda, bir satış danışmanının AI ile yaptığı müşteri rolyplay simülasyonunun tam transkripti var.

## Senaryo
Kategori: ${CATEGORY_LABEL[scenario.category] || scenario.category}
Başlık: ${scenario.title}
Müşteri bağlamı: ${scenario.customerContext}

## Transkript
${transcript}

## Görevin
Satış danışmanının (👔 SATIŞ DANIŞMANI) performansını değerlendir. Çıktı YALNIZCA aşağıdaki JSON formatında, başka hiçbir şey yazma:

{
  "empati": <0-100>,
  "bilgi": <0-100>,
  "caprazSatis": <0-100>,
  "kapanis": <0-100>,
  "overall": <0-100>,
  "summary": "<2-3 cümle özet>",
  "strengths": ["<güçlü yön 1>", "<güçlü yön 2>"],
  "improvements": ["<gelişim önerisi 1>", "<gelişim önerisi 2>"],
  "bestMoment": "<satış danışmanının en iyi yaptığı an>",
  "worstMoment": "<en zayıf an, yoksa boş string>"
}

Değerlendirme kriterleri:
- **Empati**: Müşterinin duygu ve ihtiyaçlarını anlama, dinleme, doğru tonla yanıtlama.
- **Bilgi**: Ürün/marka/teknoloji bilgisi, doğru bilgi verme.
- **Çapraz Satış**: Ek ürün önerme, sepet büyütme, UPT artırma.
- **Kapanış**: Karar verme çağrısı, satışı tamamlama becerisi.
- **Overall**: Genel performans (4 boyutun ortalaması değil, holistik bir not).

Türkçe yaz. Sadece JSON döndür.`;

        const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
        for (const modelName of modelsToTry) {
            try {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 800,
                            responseMimeType: 'application/json',
                        },
                    }),
                });

                if (!res.ok) continue;
                const data = await res.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                try {
                    evaluation = JSON.parse(text);
                    break;
                } catch {
                    // Try to extract JSON if wrapped in markdown
                    const m = text.match(/\{[\s\S]*\}/);
                    if (m) {
                        try { evaluation = JSON.parse(m[0]); break; } catch { /* ignore */ }
                    }
                }
            } catch {
                continue;
            }
        }
    }

    // Fallback heuristic if AI evaluation failed
    if (!evaluation) {
        const consultantMessages = history.filter((m: any) => m.role === 'user' && m.content?.trim());
        const avgLength = consultantMessages.reduce((a: number, m: any) => a + m.content.length, 0) / Math.max(1, consultantMessages.length);
        const turns = consultantMessages.length;
        const base = Math.min(80, 40 + turns * 5 + (avgLength > 50 ? 10 : 0));
        evaluation = {
            empati: base,
            bilgi: base - 5,
            caprazSatis: base - 10,
            kapanis: base - 5,
            overall: base - 5,
            summary: 'AI değerlendirme servisine ulaşılamadı. Konuşma uzunluğuna göre tahmini bir puan verildi.',
            strengths: ['Sohbeti sürdürdün'],
            improvements: ['Daha detaylı ürün önerileri sun', 'Ek ürünler öner'],
            bestMoment: '',
            worstMoment: '',
        };
    }

    // Clamp scores
    const clamp = (v: any) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    const scores = {
        empati: clamp(evaluation.empati),
        bilgi: clamp(evaluation.bilgi),
        caprazSatis: clamp(evaluation.caprazSatis),
        kapanis: clamp(evaluation.kapanis),
    };
    const overall = clamp(evaluation.overall ?? (scores.empati + scores.bilgi + scores.caprazSatis + scores.kapanis) / 4);
    const xpEarned = Math.round((overall / 100) * scenario.xpReward);

    // Determine badge
    let badge: string | null = null;
    if (overall >= 85) badge = 'ALTIN_SATICI';
    else if (scores.empati >= 90) badge = 'EMPATI_USTASI';
    else if (scores.caprazSatis >= 90) badge = 'CAPRAZ_SATIS_USTASI';
    else if (scores.kapanis >= 90) badge = 'KAPANIS_USTASI';
    else if (scores.bilgi >= 90) badge = 'URUN_UZMANI';

    // Save attempt
    const attempt = await prisma.simAttempt.create({
        data: {
            id: uuidv4(),
            scenarioId,
            userId: user.id,
            score: overall,
            empatiScore: scores.empati,
            bilgiScore: scores.bilgi,
            caprazSatisScore: scores.caprazSatis,
            kapanisScore: scores.kapanis,
            xpEarned,
            badge,
            choices: JSON.stringify({ mode: 'AI_CHAT', transcript: history }),
            durationSeconds: durationSeconds || null,
        },
    });

    return NextResponse.json({
        attemptId: attempt.id,
        score: overall,
        scores,
        xpEarned,
        badge,
        summary: evaluation.summary || '',
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
        improvements: Array.isArray(evaluation.improvements) ? evaluation.improvements : [],
        bestMoment: evaluation.bestMoment || '',
        worstMoment: evaluation.worstMoment || '',
    });
}
