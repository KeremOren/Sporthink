'use client';

import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';

type Notification = {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'training' | 'feedback';
    read: boolean;
    createdAt: Date;
    link?: string;
};

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('sporthink_notifications');
            if (stored) setNotifications(JSON.parse(stored));
        } catch { }
    }, []);

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('sporthink_notifications', JSON.stringify(notifications));
        } catch { }
    }, [notifications]);

    const addNotification = useCallback((n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
        const notif: Notification = {
            ...n,
            id: crypto.randomUUID(),
            read: false,
            createdAt: new Date(),
        };
        setNotifications(prev => [notif, ...prev].slice(0, 50));
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}>
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
                                            onClick={markAllAsRead}
                                            title="Tümünü okundu işaretle"
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>done_all</span>
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            className="notif-header-btn"
                                            onClick={clearAll}
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

function SampleRow({ icon, color, label }: { icon: string; color: string; label: string }) {
    return (
        <div className="notif-empty-sample-row">
            <span
                className="notif-empty-sample-icon"
                style={{ color, background: `${color}15` }}
            >
                <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>{icon}</span>
            </span>
            <span>{label}</span>
        </div>
    );
}
