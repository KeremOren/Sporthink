import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

/**
 * POST /api/push/test
 *
 * Mevcut kullanıcıya test bildirimi gönderir (push subscription test).
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sporthink.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        return NextResponse.json({ error: 'VAPID anahtarları eksik' }, { status: 500 });
    }

    const user = session.user as any;
    const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    if (subs.length === 0) {
        return NextResponse.json({ error: 'Aktif subscription yok. Önce bildirimleri etkinleştirin.' }, { status: 404 });
    }

    const payload = JSON.stringify({
        title: '🎉 Test Bildirimi',
        body: `Merhaba ${user.firstName}, push bildirimler çalışıyor!`,
        url: '/dashboard',
        tag: 'sporthink-test',
    });

    let sent = 0;
    let failed = 0;
    const invalid: string[] = [];

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
            );
            sent++;
        } catch (err: any) {
            failed++;
            if (err.statusCode === 410 || err.statusCode === 404) invalid.push(sub.endpoint);
        }
    }

    if (invalid.length > 0) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: invalid } } });
    }

    return NextResponse.json({ success: true, sent, failed, subscriptionCount: subs.length });
}
