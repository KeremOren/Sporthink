'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * PushNotificationToggle — Profil/Ayarlar için bildirimleri aç/kapa butonu.
 *
 * - Notification.permission durumunu izler
 * - Permission al → service worker registration al → push subscription al → API'ye gönder
 * - Test bildirimi gönderme butonu
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
    return output;
}

export default function PushNotificationToggle() {
    const { showToast } = useToast();
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPermission('unsupported');
            return;
        }
        setPermission(Notification.permission);
        // Check existing subscription
        navigator.serviceWorker.ready.then(async (reg) => {
            const sub = await reg.pushManager.getSubscription();
            setSubscribed(!!sub);
        });
    }, []);

    const enablePush = async () => {
        if (permission === 'unsupported') {
            showToast('Tarayıcınız push bildirimleri desteklemiyor', 'error');
            return;
        }

        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') {
                showToast('Bildirim izni reddedildi', 'error');
                return;
            }

            const reg = await navigator.serviceWorker.ready;
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                showToast('VAPID anahtarı eksik (sunucu yapılandırması)', 'error');
                return;
            }

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
            });

            const subJson = sub.toJSON();
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys,
                    userAgent: navigator.userAgent,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Subscribe başarısız');
            }

            setSubscribed(true);
            showToast('🔔 Bildirimler aktif edildi!', 'success');
        } catch (e: any) {
            showToast(e.message || 'Bildirim aktifleştirilemedi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const disablePush = async () => {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
            setSubscribed(false);
            showToast('Bildirimler kapatıldı', 'info');
        } catch {
            showToast('Bildirim kapatılamadı', 'error');
        } finally {
            setLoading(false);
        }
    };

    const sendTest = async () => {
        setTesting(true);
        try {
            const res = await fetch('/api/push/test', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Test başarısız');
            showToast(`✅ ${data.sent} bildirim gönderildi`, 'success');
        } catch (e: any) {
            showToast(e.message || 'Test başarısız', 'error');
        } finally {
            setTesting(false);
        }
    };

    if (permission === 'unsupported') {
        return (
            <div style={{
                padding: 16, borderRadius: 12,
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid var(--card-border)',
                fontSize: '0.85rem', color: 'var(--text-tertiary)',
            }}>
                ⚠️ Bu tarayıcı push bildirimleri desteklemiyor (HTTPS gerekli olabilir).
            </div>
        );
    }

    return (
        <div style={{
            padding: 18, borderRadius: 14,
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: subscribed ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(0,0,0,0.05)',
                    color: subscribed ? '#fff' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <span className="material-icons-outlined">
                        {subscribed ? 'notifications_active' : 'notifications_off'}
                    </span>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 2 }}>
                        Push Bildirimler
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                        {subscribed
                            ? '✅ Yeni eğitim, anomali ve duyurularda tarayıcı bildirimi alacaksın'
                            : 'Yeni eğitim, anomali ve duyurular için bildirim al'}
                    </div>
                </div>
                {subscribed ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={sendTest}
                            disabled={testing}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: '#6366f1',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                borderRadius: 10,
                                fontSize: '0.8rem', fontWeight: 700,
                                cursor: testing ? 'wait' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>send</span>
                            {testing ? 'Gönderiliyor...' : 'Test'}
                        </button>
                        <button
                            onClick={disablePush}
                            disabled={loading}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: 10,
                                fontSize: '0.8rem', fontWeight: 700,
                                cursor: loading ? 'wait' : 'pointer',
                            }}
                        >
                            Kapat
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={enablePush}
                        disabled={loading}
                        style={{
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #E53935, #c62828)',
                            color: '#fff', border: 'none', borderRadius: 10,
                            fontSize: '0.85rem', fontWeight: 700,
                            cursor: loading ? 'wait' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 12px rgba(229, 57, 53, 0.3)',
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>notifications</span>
                        {loading ? 'Aktifleştiriliyor...' : 'Bildirimleri Aç'}
                    </button>
                )}
            </div>
        </div>
    );
}
