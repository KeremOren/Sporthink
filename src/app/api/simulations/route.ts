import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;

    const [scenarios, myAttempts] = await Promise.all([
        prisma.simScenario.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
                id: true,
                category: true,
                title: true,
                description: true,
                difficulty: true,
                xpReward: true,
            },
        }),
        prisma.simAttempt.findMany({
            where: { userId: user.id },
            orderBy: { completedAt: 'desc' },
            include: { scenario: { select: { title: true, category: true, difficulty: true } } },
            take: 20,
        }),
    ]);

    // Best attempt per scenario for the user
    const allMine = await prisma.simAttempt.findMany({
        where: { userId: user.id },
        select: { scenarioId: true, score: true, xpEarned: true, badge: true },
    });

    const bestByScenario: Record<string, { score: number; badge: string | null }> = {};
    for (const a of allMine) {
        const cur = bestByScenario[a.scenarioId];
        if (!cur || a.score > cur.score) bestByScenario[a.scenarioId] = { score: a.score, badge: a.badge };
    }

    const totalXP = allMine.reduce((s, a) => s + (a.xpEarned || 0), 0);
    const completedCount = Object.keys(bestByScenario).length;
    const totalScenarios = scenarios.length;

    // Level system: every 100 XP = 1 level
    const level = Math.floor(totalXP / 100) + 1;
    const xpInLevel = totalXP % 100;

    const enrichedScenarios = scenarios.map(s => ({
        ...s,
        myBest: bestByScenario[s.id]?.score ?? null,
        myBadge: bestByScenario[s.id]?.badge ?? null,
        completed: !!bestByScenario[s.id],
    }));

    const recent = myAttempts.map(a => ({
        id: a.id,
        scenarioTitle: a.scenario.title,
        category: a.scenario.category,
        difficulty: a.scenario.difficulty,
        score: a.score,
        xpEarned: a.xpEarned,
        badge: a.badge,
        empatiScore: a.empatiScore,
        bilgiScore: a.bilgiScore,
        caprazSatisScore: a.caprazSatisScore,
        kapanisScore: a.kapanisScore,
        completedAt: a.completedAt,
    }));

    return NextResponse.json({
        scenarios: enrichedScenarios,
        recent,
        stats: {
            totalXP,
            level,
            xpInLevel,
            xpToNext: 100 - xpInLevel,
            completedCount,
            totalScenarios,
            totalAttempts: allMine.length,
        },
    });
}

/**
 * DELETE /api/simulations
 * Kullanıcının tüm simülasyon geçmişini sil (kendi kayıtları).
 * Query: ?attemptId=xxx → sadece o tek denemeyi sil
 */
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');

    if (attemptId) {
        // Tekli silme — ownership kontrolü
        const attempt = await prisma.simAttempt.findUnique({ where: { id: attemptId } });
        if (!attempt || attempt.userId !== user.id) {
            return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
        }
        await prisma.simAttempt.delete({ where: { id: attemptId } });
        return NextResponse.json({ deleted: 1 });
    }

    // Toplu silme — kullanıcının tüm attempt'leri
    const result = await prisma.simAttempt.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ deleted: result.count });
}
