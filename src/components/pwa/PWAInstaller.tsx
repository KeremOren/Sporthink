'use client';

import { useEffect, useState } from 'react';

/**
 * PWA Installer
 *
 * - Registers service worker
 * - Captures beforeinstallprompt event
 * - Shows a custom install banner after 30s on dashboard if installable
 * - Requests notification permission lazily
 */
export default function PWAInstaller() {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        // 1. Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .catch((err) => console.warn('[PWA] SW register failed:', err));
        }

        // 2. Detect if already installed (standalone mode)
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        if (isStandalone) {
            setInstalled(true);
            return;
        }

        // 3. Check if user already dismissed
        const dismissedAt = localStorage.getItem('pwa-install-dismissed-at');
        if (dismissedAt) {
            const days = (Date.now() - parseInt(dismissedAt, 10)) / 86400000;
            if (days < 7) return; // dismissed within last 7 days
        }

        // 4. Capture install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            // Show banner after 20s of usage
            setTimeout(() => setShowBanner(true), 20000);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // 5. Detect installation success
        const installedHandler = () => {
            setInstalled(true);
            setShowBanner(false);
            setInstallPrompt(null);
        };
        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
            setInstalled(true);
        } else {
            localStorage.setItem('pwa-install-dismissed-at', String(Date.now()));
        }
        setShowBanner(false);
        setInstallPrompt(null);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa-install-dismissed-at', String(Date.now()));
        setShowBanner(false);
    };

    if (!showBanner || installed) return null;

    return (
        <div
            className="cine-fadeInUp"
            style={{
                position: 'fixed', bottom: 24, right: 24,
                zIndex: 9999,
                maxWidth: 360,
                background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                color: '#fff',
                borderRadius: 16,
                padding: 18,
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', gap: 14, alignItems: 'flex-start',
            }}
        >
            <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 800, letterSpacing: -1,
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                <span>sp</span><span style={{ color: '#E53935' }}>o</span>
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 4 }}>
                    Sporthink'i Yükle
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: 12 }}>
                    Daha hızlı erişim, çevrimdışı kullanım ve bildirimler için ana ekranınıza ekleyin.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleInstall}
                        style={{
                            padding: '8px 14px',
                            background: '#E53935', color: '#fff',
                            border: 'none', borderRadius: 8,
                            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>download</span>
                        Yükle
                    </button>
                    <button
                        onClick={handleDismiss}
                        style={{
                            padding: '8px 14px',
                            background: 'transparent', color: 'rgba(255,255,255,0.7)',
                            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Şimdi Değil
                    </button>
                </div>
            </div>
            <button
                onClick={handleDismiss}
                style={{
                    background: 'transparent', border: 'none',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 2,
                }}
                aria-label="Kapat"
            >
                <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>close</span>
            </button>
        </div>
    );
}
