import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getUserXp, xpToLevel, levelTier, checkAndAwardBadges } from '@/lib/gamification';

/**
 * GET /api/gamification/profile?userId=...
 * Kullanıcı XP profili: toplam XP, seviye, rozetler, son işlemler.
 *
 * userId verilmezse mevcut kullanıcının profilini döner.
 */

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessionUser = session.user as any;
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId') || sessionUser.id;

    // Otomatik rozet kontrolü (sadece kendi profilini görüntülerken)
    if (queryUserId === sessionUser.id) {
        await checkAndAwardBadges(sessionUser.id).catch(() => {});
    }

    const user = await prisma.user.findUnique({
        where: { id: queryUserId },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, store: { select: { name: true } } },
    });
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

    const [totalXp, recentTransactions, userBadges, allBadges] = await Promise.all([
        getUserXp(queryUserId),
        prisma.xpTransaction.findMany({
            where: { userId: queryUserId },
            orderBy: { createdAt: 'desc' },
            take: 15,
        }),
        prisma.userBadge.findMany({
            where: { userId: queryUserId },
            include: { badge: true },
            orderBy: { earnedAt: 'desc' },
        }),
        prisma.badge.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    ]);

    const levelInfo = xpToLevel(totalXp);
    const tier = levelTier(levelInfo.level);

    // Tüm rozetleri "kazanıldı/kazanılmadı" olarak işaretle
    const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
    const badgesWithStatus = allBadges.map(b => ({
        ...b,
        earned: earnedBadgeIds.has(b.id),
        earnedAt: userBadges.find(ub => ub.badgeId === b.id)?.earnedAt || null,
    }));

    return NextResponse.json({
        user,
        xp: {
            total: totalXp,
            level: levelInfo.level,
            currentLevelXp: levelInfo.currentLevelXp,
            nextLevelXp: levelInfo.nextLevelXp,
            progressPct: levelInfo.progressPct,
            tier,
        },
        badges: {
            total: badgesWithStatus.length,
            earned: userBadges.length,
            list: badgesWithStatus,
        },
        recentTransactions,
    });
}
