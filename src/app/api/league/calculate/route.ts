import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/league/calculate
 * Body: { seasonId? }
 *
 * Mağaza skorlarını hesaplar (Eğitim %30, KPI %40, Müşteri Memnuniyeti %20, Quiz %10).
 * Sezon bazlı; aktif sezon kullanılır.
 *
 * Sadece SUPER_ADMIN ve REGIONAL_MANAGER çalıştırabilir.
 */

const WEIGHTS = {
    training: 0.30,
    kpi: 0.40,
    quality: 0.20, // müşteri memnuniyeti
    quiz: 0.10,
};

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let seasonId = body.seasonId;

    let season = seasonId
        ? await prisma.season.findUnique({ where: { id: seasonId } })
        : await prisma.season.findFirst({ where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } });

    if (!season) {
        return NextResponse.json({ error: 'Aktif sezon yok' }, { status: 404 });
    }

    const stores = await prisma.store.findMany({
        where: user.role === 'REGIONAL_MANAGER' ? { regionId: user.regionId } : {},
    });

    const trainings = await prisma.training.count({ where: { status: 'ACTIVE' } });

    let updated = 0;
    for (const store of stores) {
        // 1. Training completion rate (0-100)
        const allAssignments = await prisma.trainingAssignment.count({
            where: { user: { storeId: store.id } },
        });
        const completedAssignments = await prisma.trainingAssignment.count({
            where: { user: { storeId: store.id }, status: 'COMPLETED' },
        });
        const trainingRate = allAssignments > 0 ? (completedAssignments / allAssignments) * 100 : 0;

        // 2. KPI achievement (avg of Hedef Gerçekleşme Oranı for the season period)
        const kpiDef = await prisma.kpiDefinition.findFirst({ where: { name: 'Hedef Gerçekleşme Oranı' } });
        let kpiRate = 0;
        if (kpiDef) {
            const periodFilter: any = { storeId: store.id, kpiDefinitionId: kpiDef.id };
            const entries = await prisma.kpiEntry.findMany({
                where: periodFilter,
                orderBy: { period: 'desc' },
                take: 3,
            });
            if (entries.length > 0) {
                kpiRate = entries.reduce((a, e) => a + e.value, 0) / entries.length;
            }
        }
        // Cap kpiRate at 120 (so >100% achievement is rewarded)
        kpiRate = Math.min(120, kpiRate);

        // 3. Quality score (Müşteri Memnuniyeti)
        const qualityKpi = await prisma.kpiDefinition.findFirst({ where: { name: 'Müşteri Memnuniyeti' } });
        let qualityScore = 0;
        if (qualityKpi) {
            const entries = await prisma.kpiEntry.findMany({
                where: { storeId: store.id, kpiDefinitionId: qualityKpi.id },
                orderBy: { period: 'desc' },
                take: 3,
            });
            if (entries.length > 0) {
                qualityScore = entries.reduce((a, e) => a + e.value, 0) / entries.length;
            }
        }

        // 4. Quiz pass rate
        const totalAttempts = await prisma.quizAttempt.count({
            where: { user: { storeId: store.id } },
        });
        const passedAttempts = await prisma.quizAttempt.count({
            where: { user: { storeId: store.id }, passed: true },
        });
        const quizRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;

        // Weighted total
        const trainingPoints = trainingRate * WEIGHTS.training;
        const kpiPoints = kpiRate * WEIGHTS.kpi;
        const qualityPoints = qualityScore * WEIGHTS.quality;
        const quizPoints = quizRate * WEIGHTS.quiz;
        const totalPoints = trainingPoints + kpiPoints + qualityPoints + quizPoints;

        // Upsert
        const existing = await prisma.leagueScore.findUnique({
            where: { seasonId_storeId: { seasonId: season.id, storeId: store.id } },
        });
        if (existing) {
            await prisma.leagueScore.update({
                where: { id: existing.id },
                data: {
                    totalPoints,
                    trainingPoints,
                    kpiPoints,
                    qualityPoints,
                    quizPoints,
                    lastCalculated: new Date(),
                },
            });
        } else {
            await prisma.leagueScore.create({
                data: {
                    id: uuidv4(),
                    seasonId: season.id,
                    storeId: store.id,
                    totalPoints,
                    trainingPoints,
                    kpiPoints,
                    qualityPoints,
                    quizPoints,
                },
            });
        }
        updated++;
    }

    // Assign ranks
    const allScores = await prisma.leagueScore.findMany({
        where: { seasonId: season.id },
        orderBy: { totalPoints: 'desc' },
    });
    for (let i = 0; i < allScores.length; i++) {
        await prisma.leagueScore.update({
            where: { id: allScores[i].id },
            data: { rank: i + 1 },
        });
    }

    return NextResponse.json({ success: true, updated, season: season.name });
}
