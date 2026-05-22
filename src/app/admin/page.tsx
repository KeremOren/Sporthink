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
            await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, isActive: !currentStatus }),
            });
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

                    {tab === 'org' && (
                        <div className="chart-grid">
                            <div className="card">
                                <div className="card-header"><h4 className="card-title">Bölgeler</h4></div>
                                {regions.map((r: any) => (
                                    <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div className="font-semibold">{r.name}</div>
                                        <div className="text-xs text-secondary">Kod: {r.code} • {r._count?.stores || 0} mağaza</div>
                                    </div>
                                ))}
                            </div>
                            <div className="card">
                                <div className="card-header"><h4 className="card-title">Mağazalar</h4></div>
                                {stores.map((s: any) => (
                                    <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div className="font-semibold">{s.name}</div>
                                        <div className="text-xs text-secondary">{s.code} • {s.region?.name} • {s._count?.users || 0} çalışan</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
