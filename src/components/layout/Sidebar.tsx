'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NAV_ITEMS, ROLE_LABELS } from '@/lib/rbac';
import { UserRole } from '@/types';
import { useState } from 'react';
import { NotificationBell } from '@/components/ui/NotificationProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function getInitials(firstName: string, lastName: string) {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    if (!session?.user) return null;

    const user = session.user as any;
    const role = user.role as UserRole;

    const filteredNav = NAV_ITEMS.filter(item =>
        item.roles.includes(role)
    );

    return (
        <>
            {/* Mobile overlay */}
            {open && (
                <div
                    className="sidebar-overlay active"
                    onClick={() => setOpen(false)}
                />
            )}

            <button className="mobile-menu-btn" onClick={() => setOpen(!open)}>
                <span className="material-icons-outlined">{open ? 'close' : 'menu'}</span>
            </button>

            <aside className={`sidebar ${open ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon" style={{ background: '#1a1a1a', borderRadius: '10px', fontSize: '1.1rem', letterSpacing: '-1px' }}>
                        <span style={{ color: '#fff' }}>sp</span>
                        <span style={{ color: '#E53935' }}>o</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="sidebar-brand-text">
                            sp<span className="brand-highlight">o</span>rthink
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>
                            Training Platform
                        </div>
                    </div>
                    <NotificationBell />
                </div>

                <nav className="sidebar-nav">
                    {filteredNav.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
                            onClick={() => setOpen(false)}
                        >
                            <span className="material-icons-outlined">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {getInitials(user.firstName || '', user.lastName || '')}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.firstName} {user.lastName}</div>
                        <div className="sidebar-user-role">{ROLE_LABELS[role]}</div>
                    </div>
                    <ThemeToggle />
                    <Link
                        href="/profile"
                        style={{
                            background: 'none', border: 'none', color: 'var(--text-tertiary)',
                            cursor: 'pointer', padding: '4px',
                        }}
                        title="Profil & Ayarlar"
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>settings</span>
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        style={{
                            background: 'none', border: 'none', color: 'var(--text-tertiary)',
                            cursor: 'pointer', padding: '4px'
                        }}
                        title="Çıkış Yap"
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
