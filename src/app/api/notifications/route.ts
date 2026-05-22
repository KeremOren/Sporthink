import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/notifications
 * Mevcut kullanıcının son 50 bildirimini döner.
 * Query: ?unread=1 → sadece okunmamışlar
 *
 * DELETE /api/notifications
 * Tüm bildirimleri sil
 */

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const onlyUnread = searchParams.get('unread') === '1';

    const where: any = { userId: user.id };
    if (onlyUnread) where.read = false;

    const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
}

export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const result = await prisma.notification.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ deleted: result.count });
}
