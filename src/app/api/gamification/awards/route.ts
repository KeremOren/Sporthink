import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { awardXp, checkAndAwardBadges, XP_REWARDS } from '@/lib/gamification';

/**
 * POST /api/gamification/awards
 * Body: { event: 'TRAINING_COMPLETE' | 'QUIZ_PASS' | 'QUIZ_PERFECT' | 'COMMUNITY_POST', sourceId?, score? }
 *
 * Aksiyon olaylarından sonra XP ekler ve rozet kontrolünü çalıştırır.
 * Mevcut entegrasyon noktalarından (training tamamlama, quiz submit) çağrılır.
 */

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();
    const { event, sourceId, score } = body;

    let amount = 0;
    let reason = '';

    switch (event) {
        case 'TRAINING_COMPLETE':
            amount = XP_REWARDS.TRAINING_COMPLETE;
            reason = 'Eğitim tamamlandı';
            break;
        case 'QUIZ_PASS':
            amount = score === 100 ? XP_REWARDS.QUIZ_PERFECT : XP_REWARDS.QUIZ_PASS;
            reason = score === 100 ? 'Sınavda mükemmel skor!' : 'Sınav başarıyla geçildi';
            break;
        case 'COMMUNITY_POST':
            amount = XP_REWARDS.COMMUNITY_POST;
            reason = 'Topluluk gönderisi paylaşıldı';
            break;
        case 'KPI_GOAL_MET':
            amount = XP_REWARDS.KPI_GOAL_MET;
            reason = 'Aylık KPI hedefi tutturuldu';
            break;
        default:
            return NextResponse.json({ error: 'Bilinmeyen event' }, { status: 400 });
    }

    const tx = await awardXp({
        userId: user.id,
        amount,
        source: event,
        sourceId,
        reason,
    });

    const newBadges = await checkAndAwardBadges(user.id);

    return NextResponse.json({ transaction: tx, newBadges });
}
