import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * PUT /api/notifications/[id]
 * Bildirim okundu olarak işaretle
 *
 * DELETE /api/notifications/[id]
 * Tek bildirimi sil
 */

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== user.id) {
        return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 });
    }

    const updated = await prisma.notification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ notification: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== user.id) {
        return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 });
    }

    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
