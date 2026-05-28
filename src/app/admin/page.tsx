'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ROLE_LABELS } from '@/lib/rbac';

export default function AdminPage() {
    const { data: session, status } = useSession();
    const { showToast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('users');
    const [showCreate, setShowCreate] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [form, setForm] = useState({ email: '', password: 'default123', firstName: '', lastName: '', role: 'EMPLOYEE', storeId: '', regionId: '' });
    const [userSearch, setUserSearch] = useState('');
    const [orgSearch, setOrgSearch] = useState('');
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

    useEffect(() => { document.title = 'Sporthink | Yönetim'; }, []);

    useEffect(() => {
        if (session) loadData();
    }, [session]);

    const loadData = async () => {
        const [u, org] = await Promise.all([
            fetch('/api/users').then(r => r.json()),
            fetch('/api/admin/org').then(r => r.json()),
        ]);
        setUsers(u);
        setStores(org.stores || []);
        setRegions(org.regions || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            setShowCreate(false);
            setForm({ email: '', password: 'default123', firstName: '', lastName: '', role: 'EMPLOYEE', storeId: '', regionId: '' });
            showToast('Kullanıcı başarıyla oluşturuldu', 'success');
            loadData();
        } catch {
            showToast('Kullanıcı oluşturulurken hata oluştu', 'error');
        }
    };

    const handleEdit = async () => {
        if (!editUser) return;
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editUser.id,
                    firstName: editUser.firstName,
                    lastName: editUser.lastName,
                    role: editUser.role,
                    storeId: editUser.storeId || null,
                    regionId: editUser.regionId || null,
                    isActive: editUser.isActive,
                    exitDate: editUser.exitDate || null,
                }),
            });
            if (!res.ok) throw new Error();
            setEditUser(null);
            showToast('Kullanıcı güncellendi', 'success');
            loadData();
        } catch {
            showToast('Güncelleme sırasında hata oluştu', 'error');
        }
    };

    const toggleActive = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, isActive: !currentStatus }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                showToast(data?.error || 'İşlem başarısız', 'error');
                return;
            }
            showToast(currentStatus ? 'Kullanıcı deaktif edildi' : 'Kullanıcı aktif edildi', 'success');
            loadData();
        } catch {
            showToast('İşlem sırasında hata oluştu', 'error');
        }
    };

    if (!session) return null;

    const getInitials = (fn: string, ln: string) => `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Yönetim Paneli</h1>
                        <div className="page-header-sub">Sistem yönetimi</div>
                    </div>
                </div>

                <div className="page-body">
                    <div className="tabs">
                        {[
                            { key: 'users', label: 'Kullanıcılar', icon: 'people' },
                            { key: 'org', label: 'Organizasyon', icon: 'business' },
                        ].map(t => (
                            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 4 }}>{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'users' && (() => {
                        const q = userSearch.trim().toLowerCase();
                        const filteredUsers = q
                            ? users.filter(u => {
                                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                                const email = (u.email || '').toLowerCase();
                                const store = (u.store?.name || '').toLowerCase();
                                const region = (u.region?.name || '').toLowerCase();
                                const role = (ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role || '').toLowerCase();
                                return fullName.includes(q) || email.includes(q) || store.includes(q) || region.includes(q) || role.includes(q);
                            })
                            : users;
                        return (
                        <>
                            <div className="flex justify-between items-center mb-lg" style={{ gap: 12, flexWrap: 'wrap' }}>
                                <span className="text-secondary">
                                    {q ? `${filteredUsers.length} / ${users.length}` : users.length} kayıtlı kullanıcı
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 auto', justifyContent: 'flex-end', minWidth: 240 }}>
                                    <div style={{ position: 'relative', flex: '0 1 320px', minWidth: 220 }}>
                                        <span className="material-icons-outlined" style={{
                                            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                            color: 'var(--text-tertiary)', fontSize: '1.05rem', pointerEvents: 'none',
                                        }}>search</span>
                                        <input
                                            className="form-input"
                                            style={{ paddingLeft: 36, paddingRight: userSearch ? 36 : 12, fontSize: '0.85rem', height: 36 }}
                                            placeholder="İsim, email, mağaza, rol ara..."
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                        />
                                        {userSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setUserSearch('')}
                                                style={{
                                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                                    color: 'var(--text-tertiary)', padding: 4,
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title="Aramayı temizle"
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>close</span>
                                            </button>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                                        <span className="material-icons-outlined">person_add</span> Kullanıcı Ekle
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <SkeletonTable rows={8} cols={6} />
                            ) : (
                                <div className="table-container">
                                    <table>
                                        <thead><tr><th>Kullanıcı</th><th>Rol</th><th>Mağaza</th><th>Bölge</th><th>Durum</th><th>İşlemler</th></tr></thead>
                                        <tbody>
                                            {filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-tertiary)' }}>
                                                        <span className="material-icons-outlined" style={{ fontSize: '1.6rem', display: 'block', marginBottom: 4, opacity: 0.5 }}>search_off</span>
                                                        &quot;{userSearch}&quot; için sonuç yok
                                                    </td>
                                                </tr>
                                            ) : filteredUsers.map(u => (
                                                <tr key={u.id} style={{ opacity: u.isActive === false ? 0.5 : 1 }}>
                                                    <td>
                                                        <div className="flex items-center gap-sm">
                                                            <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{getInitials(u.firstName, u.lastName)}</div>
                                                            <div><div className="font-semibold">{u.firstName} {u.lastName}</div><div className="text-xs text-secondary">{u.email}</div></div>
                                                        </div>
                                                    </td>
                                                    <td><span className="badge badge-primary">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</span></td>
                                                    <td className="text-sm">{u.store?.name || '-'}</td>
                                                    <td className="text-sm">{u.region?.name || '-'}</td>
                                                    <td>
                                                        <span className={`badge ${u.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                                                            {u.isActive !== false ? 'Aktif' : 'Deaktif'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-xs">
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditUser({ ...u, storeId: u.storeId || '', regionId: u.regionId || '' })} title="Düzenle">
                                                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>edit</span>
                                                            </button>
                                                            <button
                                                                className={`btn btn-sm ${u.isActive !== false ? 'btn-ghost' : 'btn-success'}`}
                                                                onClick={() => toggleActive(u.id, u.isActive !== false)}
                                                                title={u.isActive !== false ? 'Deaktif Et' : 'Aktif Et'}
                                                            >
                                                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>
                                                                    {u.isActive !== false ? 'block' : 'check_circle'}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                        );
                    })()}

                    {tab === 'org' && (() => {
                        const REGION_PALETTE: Record<string, { color: string; bg: string; gradient: string }> = {
                            AKD: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
                            EGE: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', gradient: 'linear-gradient(135deg, #22c55e, #4ade80)' },
                            IZM: { color: '#E53935', bg: 'rgba(229,57,53,0.08)', gradient: 'linear-gradient(135deg, #E53935, #ef5350)' },
                            MAR: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
                            KAR: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
                            ANA: { color: '#ec4899', bg: 'rgba(236,72,153,0.08)', gradient: 'linear-gradient(135deg, #ec4899, #f472b6)' },
                            DEFAULT: { color: '#64748b', bg: 'rgba(100,116,139,0.08)', gradient: 'linear-gradient(135deg, #64748b, #94a3b8)' },
                        };
                        const getPalette = (code: string) => REGION_PALETTE[code] || REGION_PALETTE.DEFAULT;

                        // Toplam çalışan sayısı
                        const totalEmployees = stores.reduce((sum: number, s: any) => sum + (s._count?.users || 0), 0);

                        // Mağazaları bölgeye göre grupla
                        const storesByRegion: Record<string, any[]> = {};
                        stores.forEach((s: any) => {
                            const rid = s.regionId || s.region?.id || '';
                            if (!storesByRegion[rid]) storesByRegion[rid] = [];
                            storesByRegion[rid].push(s);
                        });

                        // Arama filtresi
                        const q = orgSearch.trim().toLowerCase();
                        const matchesQuery = (s: any) => {
                            if (!q) return true;
                            return (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
                        };

                        const toggleRegion = (rid: string) => {
                            const next = new Set(expandedRegions);
                            if (next.has(rid)) next.delete(rid);
                            else next.add(rid);
                            setExpandedRegions(next);
                        };

                        // Arama varsa ilgili bölgeleri otomatik aç
                        const visibleRegions = regions.map((r: any) => {
                            const regionStores = (storesByRegion[r.id] || []).filter(matchesQuery);
                            return { ...r, filteredStores: regionStores };
                        }).filter((r: any) => !q || r.filteredStores.length > 0);

                        const stats = [
                            { label: 'Bölge', value: regions.length, icon: 'public', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                            { label: 'Mağaza', value: stores.length, icon: 'storefront', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
                            { label: 'Toplam Çalışan', value: totalEmployees, icon: 'groups', color: '#E53935', bg: 'rgba(229,57,53,0.1)' },
                        ];

                        return (
                            <div>
                                {/* Stat cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                                    {stats.map((s, idx) => (
                                        <div key={s.label} style={{
                                            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                            border: `1px solid ${s.color}22`,
                                            borderRadius: 14, padding: '18px 20px',
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                            transition: 'all 0.25s ease',
                                            animation: `cine-fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) ${idx * 0.08}s both`,
                                        }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: 12,
                                                background: s.bg, color: s.color,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Search */}
                                <div style={{ position: 'relative', marginBottom: 16, maxWidth: 420 }}>
                                    <span className="material-icons-outlined" style={{
                                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--text-tertiary)', fontSize: '1.1rem', pointerEvents: 'none',
                                    }}>search</span>
                                    <input
                                        className="form-input"
                                        style={{ paddingLeft: 40, paddingRight: orgSearch ? 36 : 12, height: 40 }}
                                        placeholder="Mağaza adı veya kodu ara..."
                                        value={orgSearch}
                                        onChange={e => setOrgSearch(e.target.value)}
                                    />
                                    {orgSearch && (
                                        <button onClick={() => setOrgSearch('')} style={{
                                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-tertiary)', padding: 4,
                                        }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>close</span>
                                        </button>
                                    )}
                                </div>

                                {/* Region cards (expandable) */}
                                {visibleRegions.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="material-icons-outlined">search_off</span>
                                        <p>&quot;{orgSearch}&quot; için sonuç bulunamadı</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {visibleRegions.map((r: any, idx: number) => {
                                            const palette = getPalette(r.code);
                                            const regionStores = r.filteredStores;
                                            const totalRegionEmployees = regionStores.reduce((sum: number, s: any) => sum + (s._count?.users || 0), 0);
                                            const isExpanded = expandedRegions.has(r.id) || !!q;

                                            return (
                                                <div key={r.id} style={{
                                                    background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                                    border: `1px solid ${palette.color}22`,
                                                    borderRadius: 14, overflow: 'hidden',
                                                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                                    animation: `cine-fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) ${idx * 0.05}s both`,
                                                }}>
                                                    {/* Region header */}
                                                    <button
                                                        onClick={() => toggleRegion(r.id)}
                                                        style={{
                                                            width: '100%', padding: '14px 18px',
                                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: 14,
                                                            textAlign: 'left',
                                                            transition: 'background 0.2s ease',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = palette.bg; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                                    >
                                                        <div style={{
                                                            width: 44, height: 44, borderRadius: 12,
                                                            background: palette.gradient, color: '#fff',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0, boxShadow: `0 4px 12px ${palette.color}33`,
                                                        }}>
                                                            <span className="material-icons-outlined" style={{ fontSize: '1.4rem' }}>location_on</span>
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{r.name}</h4>
                                                                <span style={{
                                                                    padding: '2px 8px', borderRadius: 6,
                                                                    background: palette.bg, color: palette.color,
                                                                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: 0.5,
                                                                }}>{r.code}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                                {regionStores.length} mağaza • {totalRegionEmployees} çalışan
                                                            </div>
                                                        </div>
                                                        <span className="material-icons-outlined" style={{
                                                            color: 'var(--text-tertiary)', fontSize: '1.4rem',
                                                            transition: 'transform 0.25s ease',
                                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        }}>expand_more</span>
                                                    </button>

                                                    {/* Stores grid (expanded) */}
                                                    {isExpanded && regionStores.length > 0 && (
                                                        <div style={{
                                                            padding: '4px 14px 14px',
                                                            borderTop: `1px dashed ${palette.color}33`,
                                                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10,
                                                        }}>
                                                            {regionStores.map((s: any) => (
                                                                <div key={s.id} style={{
                                                                    padding: '10px 12px', borderRadius: 10,
                                                                    background: 'var(--bg-secondary)',
                                                                    border: '1px solid var(--border)',
                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                    transition: 'all 0.2s ease',
                                                                }}
                                                                    onMouseEnter={e => {
                                                                        e.currentTarget.style.borderColor = palette.color;
                                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                                    }}
                                                                >
                                                                    <span className="material-icons-outlined" style={{
                                                                        color: palette.color, fontSize: '1.1rem', flexShrink: 0,
                                                                    }}>storefront</span>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {s.name}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                                            {s.code} • {s._count?.users || 0} çalışan
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {isExpanded && regionStores.length === 0 && (
                                                        <div style={{
                                                            padding: '14px 18px', borderTop: `1px dashed ${palette.color}33`,
                                                            color: 'var(--text-tertiary)', fontSize: '0.82rem', textAlign: 'center',
                                                        }}>
                                                            Bu bölgede mağaza yok
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Create User Modal */}
                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Yeni Kullanıcı</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}><span className="material-icons-outlined">close</span></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Ad</label><input className="form-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Soyad</label><input className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">E-posta</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Şifre</label><input className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Rol</label>
                                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        <option value="EMPLOYEE">Çalışan</option><option value="STORE_MANAGER">Mağaza Müdürü</option><option value="REGIONAL_MANAGER">Bölge Müdürü</option><option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Bölge</label>
                                        <select className="form-select" value={form.regionId} onChange={e => setForm({ ...form, regionId: e.target.value })}><option value="">Seçin</option>{regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Mağaza</label>
                                        <select className="form-select" value={form.storeId} onChange={e => setForm({ ...form, storeId: e.target.value })}><option value="">Seçin</option>{stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleCreate} disabled={!form.email || !form.firstName}>Oluştur</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {editUser && (
                    <div className="modal-overlay" onClick={() => setEditUser(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Kullanıcı Düzenle</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditUser(null)}><span className="material-icons-outlined">close</span></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Ad</label><input className="form-input" value={editUser.firstName} onChange={e => setEditUser({ ...editUser, firstName: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Soyad</label><input className="form-input" value={editUser.lastName} onChange={e => setEditUser({ ...editUser, lastName: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">E-posta (değiştirilemez)</label><input className="form-input" value={editUser.email} disabled style={{ opacity: 0.6 }} /></div>
                                <div className="form-group"><label className="form-label">Rol</label>
                                    <select className="form-select" value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                                        <option value="EMPLOYEE">Çalışan</option><option value="STORE_MANAGER">Mağaza Müdürü</option><option value="REGIONAL_MANAGER">Bölge Müdürü</option><option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Bölge</label>
                                        <select className="form-select" value={editUser.regionId || ''} onChange={e => setEditUser({ ...editUser, regionId: e.target.value })}><option value="">Seçin</option>{regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Mağaza</label>
                                        <select className="form-select" value={editUser.storeId || ''} onChange={e => setEditUser({ ...editUser, storeId: e.target.value })}><option value="">Seçin</option>{stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-checkbox">
                                        <input type="checkbox" checked={editUser.isActive !== false} onChange={e => {
                                            const isActive = e.target.checked;
                                            setEditUser({ ...editUser, isActive, exitDate: isActive ? null : new Date().toISOString().split('T')[0] });
                                        }} />
                                        <span>Aktif Kullanıcı</span>
                                    </label>
                                </div>
                                {editUser.isActive === false && (
                                    <div className="form-group">
                                        <label className="form-label">Çıkış Tarihi</label>
                                        <input className="form-input" type="date" value={editUser.exitDate || ''} onChange={e => setEditUser({ ...editUser, exitDate: e.target.value })} />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setEditUser(null)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleEdit}>Kaydet</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
