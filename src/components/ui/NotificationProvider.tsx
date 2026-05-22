'use client';

import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * NotificationProvider — DB-backed (önceki localStorage versiyonunun yerine)
 *
 * - Mount'ta /api/notifications GET → son 50 bildirim
 * - 30 saniyede bir polling (yeni bildirim için)
 * - markAsRead / markAllAsRead / clearAll → ilgili API'yi çağırır
 */

// DB'den gelen ham notification tipi
type DbNotification = {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: string;
    readAt: string | null;
};

// UI tipi (tip alanı UI sınıfına map'lendi)
type Notification = {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'training' | 'feedback';
    rawType: string;
    read: boolean;
    createdAt: Date;
    link?: string;
};

// DB type → UI category
const TYPE_TO_UI: Record<string, Notification['type']> = {
    TRAINING_ASSIGNED: 'training',
    QUIZ_FAILED_RETRY: 'warning',
    TRAINING_OVERDUE: 'warning',
    LEAVE_REQUESTED: 'info',
    LEAVE_APPROVED: 'success',
    LEAVE_REJECTED: 'warning',
    SHIFT_ASSIGNED: 'info',
    AI_RECOMMENDATION: 'training',
    BADGE_EARNED: 'success',
    KPI_ANOMALY: 'warning',
    GENERAL: 'info',
};

function mapNotif(n: DbNotification): Notification {
    return {
        id: n.id,
        title: n.title,
        message: n.message,
        type: TYPE_TO_UI[n.type] || 'info',
        rawType: n.type,
        read: n.read,
        createdAt: new Date(n.createdAt),
        link: n.link || undefined,
    };
}

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    refresh: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearAll: () => Promise<void>;
    /**
     * Geriye dönük uyumluluk — sadece local (UI-only) bildirim ekler.
     * DB'ye gitmez, sayfa yenilenince kaybolur.
     * Gerçek bildirimler server-side notifyUser() ile gönderilmelidir.
     */
    addNotification: (n: { title: string; message: string; type: Notification['type']; link?: string }) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(async () => {
        if (status !== 'authenticated') return;
        try {
            const res = await fetch('/api/notifications', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications((data.notifications || []).map(mapNotif));
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // sessiz başarısızlık
        }
    }, [status]);

    // İlk yükleme + auth değişimi
    useEffect(() => {
        if (status === 'authenticated') {
            refresh();
        } else if (status === 'unauthenticated') {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [status, refresh]);

    // 30 saniyede bir polling
    useEffect(() => {
        if (status !== 'authenticated') return;
        const interval = setInterval(() => {
            refresh();
        }, 30000);
        return () => clearInterval(interval);
    }, [status, refresh]);

    // Sayfa odak'a geldiğinde tazeleme (kullanıcı sekmeye dönünce)
    useEffect(() => {
        if (status !== 'authenticated') return;
        const onFocus = () => refresh();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [status, refresh]);

    const markAsRead = useCallback(async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        // Local-only (UI-tetiklemeli) bildirimler DB'de yok
        if (id.startsWith('local-')) return;
        try {
            await fetch(`/api/notifications/${id}`, { method: 'PUT' });
        } catch {
            refresh();
        }
    }, [refresh]);

    const markAllAsRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        try {
            await fetch('/api/notifications/read-all', { method: 'PUT' });
        } catch {
            refresh();
        }
    }, [refresh]);

    const clearAll = useCallback(async () => {
        setNotifications([]);
        setUnreadCount(0);
        try {
            await fetch('/api/notifications', { method: 'DELETE' });
        } catch {
            refresh();
        }
    }, [refresh]);

    // Local-only (UI-tetiklemeli) bildirim — geriye dönük uyumluluk
    const addNotification = useCallback((n: { title: string; message: string; type: Notification['type']; link?: string }) => {
        const localNotif: Notification = {
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: n.title,
            message: n.message,
            type: n.type,
            rawType: 'GENERAL',
            read: false,
            createdAt: new Date(),
            link: n.link,
        };
        setNotifications(prev => [localNotif, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, refresh, markAsRead, markAllAsRead, clearAll, addNotification }}>
            {children}
        </NotificationContext.Provider>
    );
}

// ==================== Bell Icon + Dropdown ====================

const typeIcons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    success: 'check_circle',
    training: 'school',
    feedback: 'feedback',
};

const typeColors: Record<string, string> = {
    info: '#3b82f6',
    warning: '#f59e0b',
    success: '#22c55e',
    training: '#6366f1',
    feedback: '#06b6d4',
};

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const [open, setOpen] = useState(false);
    const [pushPermission, setPushPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            if (
                ref.current && !ref.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Position strategy: pin to top-right of the viewport (like Slack/Gmail).
    // - Desktop: 16px from right edge, 70px from top (under any potential header).
    // - Mobile (<640px): null pos → CSS media query handles bottom-sheet layout.
    const computePosition = () => {
        if (window.innerWidth < 640) return null;
        const dropdownWidth = 340; // Yeni kompakt boyut
        return {
            top: 24,
            left: window.innerWidth - dropdownWidth - 20,
        };
    };

    useEffect(() => {
        if (!open) return;
        setPos(computePosition());
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const reposition = () => setPos(computePosition());
        window.addEventListener('resize', reposition);
        return () => window.removeEventListener('resize', reposition);
    }, [open]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) { setPushPermission('unsupported'); return; }
        setPushPermission(Notification.permission);
    }, [open]);

    const timeAgo = (date: Date) => {
        const d = new Date(date);
        const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
        if (minutes < 1) return 'Az önce';
        if (minutes < 60) return `${minutes} dk önce`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} saat önce`;
        return `${Math.floor(hours / 24)} gün önce`;
    };

    return (
        <div className="notification-bell-wrap" ref={ref}>
            <button
                ref={btnRef}
                className="notification-bell-btn"
                onClick={() => setOpen(!open)}
                title="Bildirimler"
                aria-label="Bildirimler"
            >
                <span className="material-icons-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
                {unreadCount > 0 && <span className="notification-bell-pulse" />}
            </button>

            {open && (
                <>
                    {/* Backdrop — subtle, click to close */}
                    <div
                        className="notification-backdrop"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                <div
                    ref={dropdownRef}
                    className="notification-dropdown notification-dropdown-v2"
                    style={pos ? {
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        right: 'auto',
                        marginTop: 0,
                    } : undefined}
                >
                    {/* Gradient header */}
                    <div className="notification-dropdown-header-v2">
                        <div className="notif-header-bg" />
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>notifications</span>
                                    Bildirimler
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                                    {unreadCount > 0
                                        ? `${unreadCount} okunmamış bildirim`
                                        : notifications.length > 0
                                            ? `${notifications.length} bildirim — hepsi okundu`
                                            : 'Yeni bildirimleri burada görürsün'}
                                </div>
                            </div>
                            {(unreadCount > 0 || notifications.length > 0) && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {unreadCount > 0 && (
                                        <button
                                            className="notif-header-btn"
                                            onClick={() => { markAllAsRead(); }}
                                            title="Tümünü okundu işaretle"
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>done_all</span>
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            className="notif-header-btn"
                                            onClick={() => { clearAll(); }}
                                            title="Tümünü temizle"
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>delete_sweep</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty-compact">
                                <div className="notif-empty-icon-sm">
                                    <span className="material-icons-outlined">notifications_none</span>
                                </div>
                                <div className="notif-empty-text-sm">Yeni bildirimin yok</div>
                                <div className="notif-empty-sub-sm">Eğitim ve duyurular burada belirir</div>
                                {pushPermission === 'default' && (
                                    <a href="/profile?tab=settings" className="notif-empty-cta-sm">
                                        Push bildirimleri aç
                                    </a>
                                )}
                            </div>
                        ) : (
                            notifications.slice(0, 20).map(n => (
                                <div
                                    key={n.id}
                                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                                    onClick={() => { markAsRead(n.id); if (n.link) window.location.href = n.link; }}
                                >
                                    <div className="notification-item-icon" style={{ color: typeColors[n.type] || '#94a3b8', background: `${typeColors[n.type] || '#94a3b8'}15` }}>
                                        <span className="material-icons-outlined">{typeIcons[n.type] || 'info'}</span>
                                    </div>
                                    <div className="notification-item-content">
                                        <div className="notification-item-title">{n.title}</div>
                                        <div className="notification-item-msg">{n.message}</div>
                                        <div className="notification-item-time">{timeAgo(n.createdAt)}</div>
                                    </div>
                                    {!n.read && <div className="notification-unread-dot" />}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="notification-dropdown-footer">
                            <a href="/profile?tab=settings" style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>settings</span>
                                Bildirim Ayarları
                            </a>
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
}
