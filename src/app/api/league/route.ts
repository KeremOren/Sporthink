import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/league?seasonId=...
 * Mevcut/seçilen sezon için mağaza ligi sıralaması.
 * Sezon belirtilmezse aktif sezon kullanılır.
 */

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let seasonId = searchParams.get('seasonId');

    let season;
    if (seasonId) {
        season = await prisma.season.findUnique({ where: { id: seasonId } });
    } else {
        season = await prisma.season.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
        });
        if (!season) {
            // Fallback: en son sezon
            season = await prisma.season.findFirst({ orderBy: { startDate: 'desc' } });
        }
    }

    if (!season) {
        return NextResponse.json({ season: null, scores: [], allSeasons: [] });
    }

    const [scores, allSeasons] = await Promise.all([
        prisma.leagueScore.findMany({
            where: { seasonId: season.id },
            include: {
                store: { select: { id: true, name: true, region: { select: { name: true } } } },
            },
            orderBy: { totalPoints: 'desc' },
        }),
        prisma.season.findMany({ orderBy: { startDate: 'desc' } }),
    ]);

    // Rank assignment
    const ranked = scores.map((s, idx) => ({
        ...s,
        rank: idx + 1,
    }));

    // Top 3 medal info
    const summary = {
        totalStores: scores.length,
        highestScore: scores[0]?.totalPoints || 0,
        averageScore: scores.length > 0 ? scores.reduce((a, s) => a + s.totalPoints, 0) / scores.length : 0,
        daysRemaining: Math.max(0, Math.ceil((new Date(season.endDate).getTime() - Date.now()) / 86400000)),
    };

    return NextResponse.json({ season, scores: ranked, allSeasons, summary });
}
