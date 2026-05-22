/**
 * Notification helper — Sporthink in-app + push bildirim sistemi
 *
 * Tek fonksiyon ile:
 *  1. DB'ye Notification kaydı atar (kullanıcının çan ikonunda görünür)
 *  2. Opsiyonel: Web Push (tarayıcı bildirim) gönderir
 *
 * Tüm API endpoint'lerinden çağrılır (training assignment, quiz, izin vb.)
 */

import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sporthink.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    } catch {
        // already set or invalid keys — sessizce devam et
    }
}

export type NotificationType =
    | 'TRAINING_ASSIGNED'       // Eğitim atandı
    | 'QUIZ_FAILED_RETRY'       // Quiz başarısız, otomatik tekrar atandı
    | 'TRAINING_OVERDUE'        // Eğitim teslim tarihi geçti
    | 'LEAVE_REQUESTED'         // (manager için) Yeni izin talebi geldi
    | 'LEAVE_APPROVED'          // İzin onaylandı
    | 'LEAVE_REJECTED'          // İzin reddedildi
    | 'SHIFT_ASSIGNED'          // Vardiya atandı
    | 'AI_RECOMMENDATION'       // AI eğitim önerisi
    | 'BADGE_EARNED'            // Yeni rozet kazandın
    | 'KPI_ANOMALY'             // (manager için) KPI anomali
    | 'GENERAL';                // Diğer

interface NotifyOptions {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;          // Opsiyonel: tıklayınca gidilecek sayfa
    sendPush?: boolean;     // Default true — Web Push de gönder
    urgent?: boolean;       // Push notification için urgent flag
}

/**
 * Tek kullanıcıya bildirim oluştur (in-app + push).
 */
export async function notifyUser(opts: NotifyOptions) {
    const { userId, type, title, message, link, sendPush = true, urgent = false } = opts;

    // 1. DB'ye in-app notification kaydı
    try {
        await prisma.notification.create({
            data: {
                id: uuidv4(),
                userId,
                type,
                title,
                message,
                link: link || null,
                read: false,
            },
        });
    } catch (e) {
        console.warn('[notify] DB notification failed:', e);
    }

    // 2. Web Push (eğer aktifse ve VAPID keys varsa)
    if (sendPush && VAPID_PUBLIC && VAPID_PRIVATE) {
        try {
            const subs = await prisma.pushSubscription.findMany({ where: { userId } });
            if (subs.length > 0) {
                const payload = JSON.stringify({
                    title,
                    body: message,
                    url: link || '/dashboard',
                    urgent,
                    tag: `notif-${type}-${Date.now()}`,
                });
                const invalidEndpoints: string[] = [];
                await Promise.all(subs.map(async (sub) => {
                    try {
                        await webpush.sendNotification(
                            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                            payload
                        );
                    } catch (err: any) {
                        if (err?.statusCode === 410 || err?.statusCode === 404) {
                            invalidEndpoints.push(sub.endpoint);
                        }
                    }
                }));
                if (invalidEndpoints.length > 0) {
                    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: invalidEndpoints } } });
                }
            }
        } catch (e) {
            console.warn('[notify] push send failed:', e);
        }
    }
}

/**
 * Birden çok kullanıcıya aynı bildirimi gönder (toplu).
 */
export async function notifyUsers(userIds: string[], opts: Omit<NotifyOptions, 'userId'>) {
    await Promise.all(
        userIds.map((userId) => notifyUser({ ...opts, userId }).catch(() => {})),
    );
}
