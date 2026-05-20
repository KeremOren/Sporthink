'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { ROLE_LABELS } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';
import PushNotificationToggle from '@/components/pwa/PushNotificationToggle';

export default function ProfilePage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [tab, setTab] = useState('overview');
    const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [devData, setDevData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [feedbackForm, setFeedbackForm] = useState({ category: 'POSITIVE', content: '', targetUserId: '' });
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const [feedbackFilter, setFeedbackFilter] = useState('ALL');

    useEffect(() => { document.title = 'Sporthink | Gelişim Dosyası'; }, []);

    useEffect(() => {
        if (session) {
            fetch('/api/users/me/development')
                .then(r => r.json())
                .then(setDevData)
                .catch(() => showToast('Gelişim verileri yüklenirken hata', 'error'))
                .finally(() => setLoading(false));
        }
    }, [session]);

    if (!session) return null;
    const user = session.user as any;
    const role = user.role;
    const isManager = ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(role);

    const handlePasswordChange = async () => {
        if (pw.newPw !== pw.confirm) { showToast('Yeni şifreler eşleşmiyor', 'error'); return; }
        if (pw.newPw.length < 6) { showToast('Şifre en az 6 karakter olmalı', 'error'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.newPw }),
            });
            if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Hata'); }
            setPw({ current: '', newPw: '', confirm: '' });
            showToast('Şifre başarıyla güncellendi', 'success');
        } catch (err: any) {
            showToast(err.message || 'Şifre güncellenirken hata oluştu', 'error');
        } finally { setSaving(false); }
    };

    const handleSendFeedback = async () => {
        if (!feedbackForm.content.trim()) return;
        setSendingFeedback(true);
        try {
            const res = await fetch('/api/feedback/development', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackForm),
            });
            if (!res.ok) throw new Error('Hata');
            setFeedbackForm({ ...feedbackForm, content: '', targetUserId: '' });
            showToast('Geri bildirim başarıyla kaydedildi', 'success');
            // Refresh data
            const data = await fetch('/api/users/me/development').then(r => r.json());
            setDevData(data);
        } catch {
            showToast('Geri bildirim kaydedilirken hata oluştu', 'error');
        } finally { setSendingFeedback(false); }
    };

    const feedbackCategories = {
        POSITIVE: { label: 'Pozitif Geri Bildirim', icon: 'thumb_up', color: '#22c55e', desc: 'Yüksek performanslı çalışanlar' },
        CONSTRUCTIVE: { label: 'Yapıcı Geri Bildirim', icon: 'build', color: '#f59e0b', desc: 'Ortalama/Gelişmekte olan çalışanlar' },
        FOCUSED: { label: 'Odaklanmış Geri Bildirim', icon: 'center_focus_strong', color: '#ef4444', desc: 'Düşük performanslı çalışanlar' },
    };

    const tabs = [
        { key: 'overview', label: 'Genel Bakış', icon: 'dashboard' },
        { key: 'positive', label: 'Pozitif', icon: 'thumb_up' },
        { key: 'constructive', label: 'Yapıcı', icon: 'build' },
        { key: 'focused', label: 'Odaklanmış', icon: 'center_focus_strong' },
        { key: 'history', label: 'Geçmiş & Rapor', icon: 'history' },
        { key: 'settings', label: 'Ayarlar', icon: 'settings' },
    ];

    // Filter feedback by category
    const getFeedbackByCategory = (category: string) => {
        if (!devData?.feedbackHistory) return [];
        return devData.feedbackHistory.filter((f: any) => f.category === category);
    };

    const allFeedback = devData?.feedbackHistory || [];
    const filteredFeedback = feedbackFilter === 'ALL' ? allFeedback : allFeedback.filter((f: any) => f.category === feedbackFilter);

    const renderFeedbackCard = (fb: any) => {
        const cat = feedbackCategories[fb.category as keyof typeof feedbackCategories] || feedbackCategories.POSITIVE;
        return (
            <div key={fb.id} style={{
                padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)',
                background: `${cat.color}08`, border: `1px solid ${cat.color}20`,
                marginBottom: 'var(--space-sm)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span className="material-icons-outlined" style={{ color: cat.color, fontSize: '1.2rem' }}>{cat.icon}</span>
                    <span className="badge" style={{ background: `${cat.color}20`, color: cat.color, fontSize: '0.7rem' }}>{cat.label}</span>
                    <span className="text-xs text-secondary" style={{ marginLeft: 'auto' }}>{formatDate(fb.createdAt)}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', paddingLeft: 32, marginBottom: 6 }}>{fb.content}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', paddingLeft: 32 }}>
                    {fb.author ? `${fb.author.firstName} ${fb.author.lastName} — ${ROLE_LABELS[fb.author.role as keyof typeof ROLE_LABELS] || fb.author.role}` : ''}
                    {fb.targetUser ? ` → ${fb.targetUser.firstName} ${fb.targetUser.lastName}` : ''}
                </div>
            </div>
        );
    };

    const renderFeedbackSection = (category: string) => {
        const cat = feedbackCategories[category as keyof typeof feedbackCategories];
        const items = getFeedbackByCategory(category);
        return (
            <div className="card">
                <div className="card-header">
                    <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-icons-outlined" style={{ color: cat.color }}>{cat.icon}</span>
                        {cat.label}
                        <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{items.length}</span>
                    </h4>
                    <span className="text-xs text-secondary">{cat.desc}</span>
                </div>

                {/* Feedback Form for Managers */}
                {isManager && (
                    <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
                        <textarea
                            className="form-textarea"
                            placeholder={`${cat.label} yazın...`}
                            value={feedbackForm.category === category ? feedbackForm.content : ''}
                            onChange={e => setFeedbackForm({ ...feedbackForm, category, content: e.target.value })}
                            style={{ minHeight: 80, marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleSendFeedback}
                                disabled={sendingFeedback || (feedbackForm.category !== category) || !feedbackForm.content.trim()}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>send</span>
                                Gönder
                            </button>
                        </div>
                    </div>
                )}

                {items.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-icons-outlined" style={{ color: cat.color }}>{cat.icon}</span>
                        <p>Henüz {cat.label.toLowerCase()} yok</p>
                    </div>
                ) : (
                    <div>{items.map(renderFeedbackCard)}</div>
                )}
            </div>
        );
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Gelişim Dosyası</h1>
                        <div className="page-header-sub">Geri bildirim, gelişim takibi ve raporlama</div>
                    </div>
                </div>

                <div className="page-body">
                    {/* Profile Card */}
                    <div className="card mb-lg">
                        <div className="flex items-center gap-md" style={{ padding: 'var(--space-md) 0' }}>
                            <div className="sidebar-avatar" style={{ width: 72, height: 72, fontSize: '1.5rem', flexShrink: 0 }}>
                                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ marginBottom: 4 }}>{user.firstName} {user.lastName}</h2>
                                <div className="text-secondary">{user.email}</div>
                                <div className="flex gap-sm mt-sm" style={{ flexWrap: 'wrap' }}>
                                    <span className="badge badge-primary">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}</span>
                                    {user.storeName && <span className="badge badge-neutral">{user.storeName}</span>}
                                    {user.regionName && <span className="badge badge-info">{user.regionName}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="tabs" style={{ overflowX: 'auto' }}>
                        {tabs.map(t => (
                            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 4 }}>{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <><SkeletonStats count={4} /><SkeletonCard count={2} /></>
                    ) : (
                        <>
                            {/* ===== OVERVIEW ===== */}
                            {tab === 'overview' && devData && (
                                <>
                                    <div className="stat-grid">
                                        <div className="stat-card">
                                            <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                                                <span className="material-icons-outlined">thumb_up</span>
                                            </div>
                                            <div className="stat-info">
                                                <div className="stat-value">{getFeedbackByCategory('POSITIVE').length}</div>
                                                <div className="stat-label">Pozitif Geri Bildirim</div>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                                                <span className="material-icons-outlined">build</span>
                                            </div>
                                            <div className="stat-info">
                                                <div className="stat-value">{getFeedbackByCategory('CONSTRUCTIVE').length}</div>
                                                <div className="stat-label">Yapıcı Geri Bildirim</div>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                                                <span className="material-icons-outlined">center_focus_strong</span>
                                            </div>
                                            <div className="stat-info">
                                                <div className="stat-value">{getFeedbackByCategory('FOCUSED').length}</div>
                                                <div className="stat-label">Odaklanmış Geri Bildirim</div>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                                                <span className="material-icons-outlined">school</span>
                                            </div>
                                            <div className="stat-info">
                                                <div className="stat-value">%{devData.summary?.trainingCompletionRate || 0}</div>
                                                <div className="stat-label">Eğitim Tamamlama</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Summary Cards */}
                                    <div className="chart-grid" style={{ marginTop: 'var(--space-lg)' }}>
                                        {Object.entries(feedbackCategories).map(([key, cat]) => {
                                            const count = getFeedbackByCategory(key).length;
                                            return (
                                                <div key={key} className="card card-hover" style={{ cursor: 'pointer', borderLeft: `4px solid ${cat.color}` }}
                                                    onClick={() => setTab(key.toLowerCase())}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <span className="material-icons-outlined" style={{ color: cat.color, fontSize: '2rem' }}>{cat.icon}</span>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{cat.label}</div>
                                                            <div className="text-sm text-secondary">{cat.desc}</div>
                                                            <div className="text-xs text-secondary mt-sm">{count} kayıt</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* ===== POSITIVE FEEDBACK ===== */}
                            {tab === 'positive' && devData && renderFeedbackSection('POSITIVE')}

                            {/* ===== CONSTRUCTIVE FEEDBACK ===== */}
                            {tab === 'constructive' && devData && renderFeedbackSection('CONSTRUCTIVE')}

                            {/* ===== FOCUSED FEEDBACK ===== */}
                            {tab === 'focused' && devData && renderFeedbackSection('FOCUSED')}

                            {/* ===== HISTORY & REPORTING ===== */}
                            {tab === 'history' && devData && (
                                <div className="card">
                                    <div className="card-header">
                                        <h4 className="card-title">
                                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: 4 }}>history</span>
                                            Geri Bildirim Geçmişi
                                        </h4>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {['ALL', 'POSITIVE', 'CONSTRUCTIVE', 'FOCUSED'].map(f => (
                                                <button key={f} className={`btn btn-sm ${feedbackFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => setFeedbackFilter(f)}>
                                                    {f === 'ALL' ? 'Tümü' : feedbackCategories[f as keyof typeof feedbackCategories]?.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Summary Report */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                        {Object.entries(feedbackCategories).map(([key, cat]) => (
                                            <div key={key} style={{
                                                padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                                                background: `${cat.color}08`, border: `1px solid ${cat.color}20`, textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cat.color }}>{getFeedbackByCategory(key).length}</div>
                                                <div className="text-xs text-secondary">{cat.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {filteredFeedback.length === 0 ? (
                                        <div className="empty-state">
                                            <span className="material-icons-outlined">history</span>
                                            <p>Henüz geri bildirim geçmişi yok</p>
                                        </div>
                                    ) : (
                                        <div>{filteredFeedback.map(renderFeedbackCard)}</div>
                                    )}
                                </div>
                            )}

                            {/* ===== SETTINGS ===== */}
                            {tab === 'settings' && (
                                <div className="chart-grid">
                                    {/* Push Notifications */}
                                    <div className="card">
                                        <div className="card-header"><h4 className="card-title">🔔 Bildirimler</h4></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <PushNotificationToggle />
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                                                Push bildirimler için Sporthink'i ana ekranınıza ekleyebilirsiniz (tarayıcı menüsü → "Uygulama olarak yükle").
                                                İlk kez etkinleştirdiğinizde tarayıcı izin isteyecek.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card">
                                        <div className="card-header"><h4 className="card-title">Kişisel Bilgiler</h4></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {[
                                                { icon: 'person', label: 'Ad Soyad', value: `${user.firstName} ${user.lastName}` },
                                                { icon: 'email', label: 'E-posta', value: user.email },
                                                { icon: 'badge', label: 'Rol', value: ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] },
                                                ...(user.storeName ? [{ icon: 'store', label: 'Mağaza', value: user.storeName }] : []),
                                                ...(user.regionName ? [{ icon: 'map', label: 'Bölge', value: user.regionName }] : []),
                                            ].map((item, i) => (
                                                <div key={i} className="profile-info-row">
                                                    <span className="material-icons-outlined text-secondary" style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                                    <div>
                                                        <div className="text-xs text-secondary">{item.label}</div>
                                                        <div className="font-semibold">{item.value}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="card" style={{ maxWidth: 500 }}>
                                        <div className="card-header"><h4 className="card-title">Şifre Değiştir</h4></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            <div className="form-group">
                                                <label className="form-label">Mevcut Şifre</label>
                                                <input className="form-input" type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} placeholder="••••••••" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Yeni Şifre</label>
                                                <input className="form-input" type="password" value={pw.newPw} onChange={e => setPw({ ...pw, newPw: e.target.value })} placeholder="En az 6 karakter" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Yeni Şifre (Tekrar)</label>
                                                <input className="form-input" type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} placeholder="••••••••" />
                                            </div>
                                            <button className="btn btn-primary" onClick={handlePasswordChange} disabled={!pw.current || !pw.newPw || !pw.confirm || saving}>
                                                {saving ? (<><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Kaydediliyor...</>) : (<><span className="material-icons-outlined">save</span> Şifreyi Güncelle</>)}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
