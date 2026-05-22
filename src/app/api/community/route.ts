import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { awardXp, checkAndAwardBadges, XP_REWARDS } from '@/lib/gamification';
import { notifyUser } from '@/lib/notify';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = {};
    if (category) where.category = category;

    const posts = await prisma.communityPost.findMany({
        where,
        include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true, store: { select: { name: true } } } },
            comments: {
                include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
                orderBy: { createdAt: 'asc' },
            },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 50,
    });

    return NextResponse.json(posts);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();

    // Create post
    if (body.action === 'create_post') {
        const post = await prisma.communityPost.create({
            data: {
                title: body.title,
                content: body.content,
                category: body.category || 'TIPS',
                authorId: user.id,
            },
            include: {
                author: { select: { id: true, firstName: true, lastName: true, role: true, store: { select: { name: true } } } },
                comments: true,
            },
        });

        // === XP + ROZET ===
        await awardXp({
            userId: user.id,
            amount: XP_REWARDS.COMMUNITY_POST,
            source: 'COMMUNITY_POST',
            sourceId: post.id,
            reason: 'Topluluk gönderisi paylaşıldı',
        });
        try {
            const newBadges = await checkAndAwardBadges(user.id);
            for (const code of newBadges) {
                const badgeRow = await prisma.badge.findUnique({ where: { code } });
                if (badgeRow) {
                    notifyUser({
                        userId: user.id,
                        type: 'BADGE_EARNED',
                        title: 'Yeni rozet kazandın! 🏆',
                        message: `"${badgeRow.name}" — ${badgeRow.description}`,
                        link: '/achievements',
                    }).catch(() => {});
                }
            }
        } catch (e) {
            console.warn('[community] badge check failed:', e);
        }

        return NextResponse.json(post, { status: 201 });
    }

    // Add comment
    if (body.action === 'add_comment') {
        const comment = await prisma.communityComment.create({
            data: {
                postId: body.postId,
                content: body.content,
                authorId: user.id,
            },
            include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
        });
        return NextResponse.json(comment, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
