import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { xpToLevel, levelTier } from '@/lib/gamification';

/**
 * GET /api/gamification/leaderboard?scope=store|region|global&period=all|month
 * XP'ye göre çalışan sıralaması.
 */

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'store';
    const period = searchParams.get('period') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const userWhere: any = { isActive: true };
    if (scope === 'store' && user.storeId) userWhere.storeId = user.storeId;
    else if (scope === 'region' && user.regionId) userWhere.regionId = user.regionId;
    // 'global' → tüm kullanıcılar

    // Period filter for XP transactions
    const xpWhere: any = {};
    if (period === 'month') {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        xpWhere.createdAt = { gte: start };
    }

    const users = await prisma.user.findMany({
        where: userWhere,
        select: {
            id: true, firstName: true, lastName: true, avatarUrl: true,
            store: { select: { name: true } },
            xpTransactions: {
                where: xpWhere,
                select: { amount: true },
            },
            userBadges: { select: { id: true } },
        },
    });

    const ranked = users
        .map(u => {
            const xp = u.xpTransactions.reduce((sum, t) => sum + t.amount, 0);
            const lvl = xpToLevel(xp);
            return {
                userId: u.id,
                name: `${u.firstName} ${u.lastName}`,
                avatarUrl: u.avatarUrl,
                storeName: u.store?.name || '',
                xp,
                level: lvl.level,
                tier: levelTier(lvl.level),
                badgeCount: u.userBadges.length,
            };
        })
        .filter(u => u.xp > 0)
        .sort((a, b) => b.xp - a.xp)
        .slice(0, limit)
        .map((u, idx) => ({ ...u, rank: idx + 1 }));

    // Mevcut kullanıcının sıralaması (top 20'nin dışındaysa da)
    const me = ranked.find(r => r.userId === user.id);
    let myRank: any = me;
    if (!me) {
        const myXp = users.find(u => u.id === user.id)?.xpTransactions.reduce((s, t) => s + t.amount, 0) || 0;
        if (myXp > 0) {
            const allRanked = users
                .map(u => ({ id: u.id, xp: u.xpTransactions.reduce((s, t) => s + t.amount, 0) }))
                .filter(u => u.xp > 0)
                .sort((a, b) => b.xp - a.xp);
            const idx = allRanked.findIndex(u => u.id === user.id);
            myRank = idx >= 0 ? { rank: idx + 1, xp: myXp } : null;
        }
    }

    return NextResponse.json({ leaderboard: ranked, myRank, scope, period });
}
