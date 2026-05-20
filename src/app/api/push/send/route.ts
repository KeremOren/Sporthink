import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

/**
 * POST /api/push/send (Yönetici)
 * Body: { userIds?: string[], storeId?: string, regionId?: string, all?: boolean,
 *         title, body, url?, urgent? }
 *
 * Hedeflenen kullanıcı(lar)ın tüm push subscription'larına bildirim gönderir.
 * Geçersiz subscription'ları temizler.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sporthink.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        return NextResponse.json({ error: 'VAPID anahtarları eksik (sunucu yapılandırması)' }, { status: 500 });
    }

    const body = await req.json();
    const { userIds, storeId, regionId, all, title, body: notifBody, url, urgent } = body;

    if (!title || !notifBody) {
        return NextResponse.json({ error: 'title ve body gerekli' }, { status: 400 });
    }

    // Hedef kullanıcıları belirle (scope kontrolüyle)
    const userWhere: any = { isActive: true };

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        userWhere.id = { in: userIds };
    } else if (storeId) {
        userWhere.storeId = storeId;
    } else if (regionId) {
        userWhere.regionId = regionId;
    } else if (all && user.role === 'SUPER_ADMIN') {
        // tüm aktif kullanıcılar
    } else {
        return NextResponse.json({ error: 'Hedef gerekli (userIds, storeId, regionId veya all)' }, { status: 400 });
    }

    // Scope koruma
    if (user.role === 'STORE_MANAGER') {
        userWhere.storeId = user.storeId;
    } else if (user.role === 'REGIONAL_MANAGER') {
        userWhere.regionId = user.regionId;
    }

    const targets = await prisma.user.findMany({
        where: userWhere,
        include: { pushSubscriptions: true },
    });

    const payload = JSON.stringify({
        title,
        body: notifBody,
        url: url || '/dashboard',
        urgent: !!urgent,
        tag: `sporthink-${Date.now()}`,
    });

    let sent = 0;
    let failed = 0;
    const invalidEndpoints: string[] = [];

    for (const target of targets) {
        for (const sub of target.pushSubscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    payload
                );
                sent++;
            } catch (err: any) {
                failed++;
                // 410 Gone veya 404 → subscription geçersiz, sil
                if (err.statusCode === 410 || err.statusCode === 404) {
                    invalidEndpoints.push(sub.endpoint);
                }
                console.warn('[Push] send failed:', err?.statusCode, err?.body || err?.message);
            }
        }
    }

    // Geçersiz subscription'ları temizle
    if (invalidEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint: { in: invalidEndpoints } },
        });
    }

    return NextResponse.json({
        success: true,
        sent,
        failed,
        cleaned: invalidEndpoints.length,
        targetUsers: targets.length,
    });
}
