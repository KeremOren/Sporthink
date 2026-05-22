'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ROLE_LABELS } from '@/lib/rbac';
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';

export default function EmployeesPage() {
    const { data: session, status } = useSession();
    const { showToast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [profileTab, setProfileTab] = useState('overview');
    const [noteText, setNoteText] = useState('');
    const [sendingNote, setSendingNote] = useState(false);

    useEffect(() => { document.title = 'Sporthink | Çalışanlar'; }, []);

    useEffect(() => {
        if (session) {
            fetch('/api/users?withCount=1').then(r => r.json()).then(setUsers).finally(() => setLoading(false));
        }
    }, [session]);

    const loadProfile = async (userId: string) => {
        setProfileTab('overview');
        const res = await fetch(`/api/users/${userId}`);
        const data = await res.json();
        setProfileData(data);
        setSelectedUser(userId);
    };

    const sendNote = async () => {
        if (!noteText.trim() || !selectedUser) return;
        setSendingNote(true);
        try {
            await fetch(`/api/users/${selectedUser}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: noteText, type: 'GENERAL' }),
            });
            setNoteText('');
            showToast('Not başarıyla eklendi', 'success');
            // Refresh profile
            const res = await fetch(`/api/users/${selectedUser}`);
            setProfileData(await res.json());
        } catch {
            showToast('Not eklenirken hata oluştu', 'error');
        }
        setSendingNote(false);
    };

    if (status === 'loading' || loading) {
        return <div className="app-layout"><Sidebar /><main className="main-content"><div className="page-header"><div><h1>Çalışanlar</h1></div></div><div className="page-body"><SkeletonTable rows={8} cols={7} /></div></main></div>;
    }

    const filtered = users.filter(u => {
        const matchesSearch = !filter || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(filter.toLowerCase());
        const matchesRole = !roleFilter || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getInitials = (fn: string, ln: string) => `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();

    const userRole = (session?.user as any)?.role;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>{userRole === 'STORE_MANAGER' ? 'Satış Danışmanlarım' : 'Çalışanlar'}</h1>
                        <div className="page-header-sub">
                            {userRole === 'STORE_MANAGER' 
                                ? `${users.length} satış danışmanı` 
                                : `${users.length} çalışan`}
                        </div>
                    </div>
                </div>

                <div className="page-body" style={{ animation: 'cine-fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
                    <div className="filter-bar">
                        <div className="search-input">
                            <span className="material-icons-outlined">search</span>
                            <input placeholder="İsim veya e-posta ara..." value={filter} onChange={e => setFilter(e.target.value)} />
                        </div>
                        <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                            <option value="">Tüm Roller</option>
                            <option value="STORE_MANAGER">Mağaza Müdürü</option>
                            <option value="EMPLOYEE">Çalışan</option>
                            <option value="REGIONAL_MANAGER">Bölge Müdürü</option>
                        </select>
                    </div>

                    {/* Personnel count header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 16, padding: '10px 16px',
                        background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
                        borderRadius: 10, border: '1px solid rgba(229,57,53,0.08)',
                        animation: 'cine-fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>people</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Personel Listesi</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            {filtered.length}/{users.length}
                        </span>
                    </div>

                    {/* Card-based employee list */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                        borderRadius: 14, border: '1px solid rgba(229,57,53,0.06)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                        animation: 'cine-fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both',
                    }}>
                        {filtered.map((u, idx) => {
                            const roleColor = u.role === 'STORE_MANAGER' ? '#E53935' : u.role === 'REGIONAL_MANAGER' ? '#8b5cf6' : u.role === 'SUPER_ADMIN' ? '#f59e0b' : '#0ea5e9';
                            return (
                                <div key={u.id}
                                    onClick={() => loadProfile(u.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '14px 18px', cursor: 'pointer',
                                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                                        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                                        background: selectedUser === u.id ? 'rgba(229,57,53,0.08)' : 'transparent',
                                        position: 'relative',
                                        animation: `cine-fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) ${Math.min(idx * 0.03, 0.6)}s both`,
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(229,57,53,0.05)';
                                        (e.currentTarget as HTMLDivElement).style.paddingLeft = '22px';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLDivElement).style.background = selectedUser === u.id ? 'rgba(229,57,53,0.08)' : 'transparent';
                                        (e.currentTarget as HTMLDivElement).style.paddingLeft = '18px';
                                    }}
                                >
                                    {/* Active indicator line */}
                                    {selectedUser === u.id && (
                                        <div style={{
                                            position: 'absolute', left: 0, top: '15%', height: '70%', width: 3,
                                            background: 'var(--primary)', borderRadius: '0 4px 4px 0',
                                        }} />
                                    )}

                                    {/* Avatar */}
                                    <div style={{
                                        width: 42, height: 42, borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                                        boxShadow: `0 2px 8px ${roleColor}30`,
                                        transition: 'transform 0.3s ease',
                                    }}>
                                        {getInitials(u.firstName, u.lastName)}
                                    </div>

                                    {/* Name + Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                                {u.firstName} {u.lastName}
                                            </span>
                                            {!u.isActive && (
                                                <span style={{
                                                    fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px',
                                                    borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                                }}>AYRILDI</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]} · {u.store?.name || u.email}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>{u._count?.trainingAssignments || 0}</div>
                                            <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Eğitim</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#8b5cf6' }}>{u._count?.quizAttempts || 0}</div>
                                            <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Sınav</div>
                                        </div>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: u.isActive ? '#22c55e' : '#ef4444',
                                            boxShadow: u.isActive ? '0 0 6px rgba(34,197,94,0.4)' : '0 0 6px rgba(239,68,68,0.4)',
                                        }} />
                                    </div>

                                    {/* Chevron */}
                                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                                        chevron_right
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Profile Modal */}
                {selectedUser && profileData && (
                    <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="flex items-center gap-md">
                                    <div className="sidebar-avatar" style={{ width: 48, height: 48, fontSize: '1rem' }}>
                                        {getInitials(profileData.firstName, profileData.lastName)}
                                    </div>
                                    <div>
                                        <h3>{profileData.firstName} {profileData.lastName}</h3>
                                        <div className="text-sm text-secondary">
                                            {ROLE_LABELS[profileData.role as keyof typeof ROLE_LABELS]}
                                            {profileData.store && ` • ${profileData.store.name}`}
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="tabs">
                                    {['overview', 'trainings', 'quizzes', 'feedback', 'notes'].map(tab => (
                                        <button key={tab} className={`tab ${profileTab === tab ? 'active' : ''}`} onClick={() => setProfileTab(tab)}>
                                            {{ overview: 'Genel', trainings: 'Eğitimler', quizzes: 'Sınavlar', feedback: 'Geri Bildirim', notes: 'Notlar' }[tab]}
                                        </button>
                                    ))}
                                </div>

                                {profileTab === 'overview' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                        <div className="card"><div className="stat-label">E-posta</div><div className="font-semibold">{profileData.email}</div></div>
                                        <div className="card"><div className="stat-label">İşe Giriş</div><div className="font-semibold">{formatDate(profileData.hireDate)}</div></div>
                                        <div className="card">
                                            <div className="stat-label">Durum</div>
                                            <div className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className={`badge ${profileData.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                    {profileData.isActive ? 'Aktif' : 'Ayrıldı'}
                                                </span>
                                                {profileData.exitDate && <span className="text-xs text-secondary">Çıkış: {formatDate(profileData.exitDate)}</span>}
                                            </div>
                                        </div>
                                        <div className="card"><div className="stat-label">Eğitimler</div><div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{profileData.trainingAssignments?.length || 0}</div></div>
                                    </div>
                                )}

                                {profileTab === 'trainings' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {profileData.trainingAssignments?.map((a: any) => (
                                            <div key={a.id} style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-sm">{a.training.title}</span>
                                                    <span className="badge" style={{ background: `${getStatusColor(a.status)}20`, color: getStatusColor(a.status) }}>
                                                        {getStatusLabel(a.status)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-secondary mt-sm">{a.training.category} • {a.training.type === 'MANDATORY' ? 'Zorunlu' : 'İsteğe Bağlı'}</div>
                                            </div>
                                        ))}
                                        {(!profileData.trainingAssignments || profileData.trainingAssignments.length === 0) && <div className="empty-state"><p>Eğitim ataması yok</p></div>}
                                    </div>
                                )}

                                {profileTab === 'quizzes' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {profileData.quizAttempts?.map((a: any) => (
                                            <div key={a.id} style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-sm">{a.quiz.title}</span>
                                                    <span className={`badge ${a.passed ? 'badge-success' : 'badge-danger'}`}>{a.passed ? 'Geçti' : 'Kaldı'} - %{a.score}</span>
                                                </div>
                                                <div className="text-xs text-secondary mt-sm">Geçme notu: %{a.quiz.passScore}</div>
                                            </div>
                                        ))}
                                        {(!profileData.quizAttempts || profileData.quizAttempts.length === 0) && <div className="empty-state"><p>Sınav denemesi yok</p></div>}
                                    </div>
                                )}

                                {profileTab === 'feedback' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {profileData.submittedFeedback?.map((fb: any) => (
                                            <div key={fb.id} style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-sm">{fb.title}</span>
                                                    <span className="badge" style={{ background: `${getStatusColor(fb.status)}20`, color: getStatusColor(fb.status) }}>
                                                        {getStatusLabel(fb.status)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-secondary mt-sm">{getStatusLabel(fb.type)} • {formatDate(fb.createdAt)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {profileTab === 'notes' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                        {/* Add Note Form */}
                                        {(session?.user as any)?.role !== 'EMPLOYEE' && (
                                            <div className="comment-form" style={{ marginBottom: 'var(--space-md)' }}>
                                                <input
                                                    className="form-input"
                                                    placeholder="Yeni not ekle..."
                                                    value={noteText}
                                                    onChange={e => setNoteText(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && sendNote()}
                                                />
                                                <button className="btn btn-primary btn-sm" onClick={sendNote} disabled={sendingNote || !noteText.trim()}>
                                                    <span className="material-icons-outlined">add</span>
                                                </button>
                                            </div>
                                        )}
                                        <div className="comment-thread" style={{ maxHeight: 350 }}>
                                            {profileData.receivedNotes?.map((n: any) => (
                                                <div key={n.id} className="comment-item">
                                                    <div className="comment-avatar">
                                                        {n.author.firstName?.[0]}{n.author.lastName?.[0]}
                                                    </div>
                                                    <div className="comment-body">
                                                        <div className="comment-header">
                                                            <span className="comment-author">{n.author.firstName} {n.author.lastName}</span>
                                                            <span className="comment-time">{formatDate(n.createdAt)}</span>
                                                        </div>
                                                        <div className="comment-text">{n.content}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {(!profileData.receivedNotes || profileData.receivedNotes.length === 0) && <div className="empty-state"><p>Henüz not eklenmemiş</p></div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
