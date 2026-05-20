import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/push/subscribe
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 *
 * Kullanıcının web-push subscription'ını DB'ye kaydeder. Aynı endpoint zaten varsa günceller.
 */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();
    const { endpoint, keys, userAgent } = body || {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json({ error: 'Geçersiz subscription' }, { status: 400 });
    }

    try {
        // Upsert: aynı endpoint zaten varsa lastUsedAt'i güncelle
        const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
        if (existing) {
            await prisma.pushSubscription.update({
                where: { endpoint },
                data: {
                    userId: user.id,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent: userAgent || existing.userAgent,
                    lastUsedAt: new Date(),
                },
            });
        } else {
            await prisma.pushSubscription.create({
                data: {
                    id: uuidv4(),
                    userId: user.id,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent: userAgent || null,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Push subscribe error:', e);
        return NextResponse.json({ error: 'Subscribe başarısız' }, { status: 500 });
    }
}
