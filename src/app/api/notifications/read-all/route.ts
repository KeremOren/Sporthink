import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * PUT /api/notifications/read-all
 * Mevcut kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretle.
 */
export async function PUT() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const result = await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ updated: result.count });
}
