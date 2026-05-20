'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonTable } from '@/components/ui/Skeleton';

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    USER_LOGIN: { label: 'Giriş', color: '#6366f1', icon: '🔑' },
    USER_CREATED: { label: 'Kullanıcı Oluşturma', color: '#22c55e', icon: '👤' },
    USER_DEACTIVATED: { label: 'Kullanıcı Pasif', color: '#ef4444', icon: '🚫' },
    USER_ROLE_CHANGED: { label: 'Rol Değişikliği', color: '#f59e0b', icon: '🔄' },
    PASSWORD_CHANGED: { label: 'Şifre Değişikliği', color: '#8b5cf6', icon: '🔒' },
    TRAINING_CREATED: { label: 'Eğitim Oluşturma', color: '#06b6d4', icon: '📚' },
    TRAINING_ASSIGNED: { label: 'Eğitim Atama', color: '#0ea5e9', icon: '📋' },
    TRAINING_COMPLETED: { label: 'Eğitim Tamamlama', color: '#22c55e', icon: '✅' },
    QUIZ_COMPLETED: { label: 'Sınav Tamamlama', color: '#a855f7', icon: '📝' },
    FEEDBACK_CREATED: { label: 'Geri Bildirim', color: '#ec4899', icon: '💬' },
    FEEDBACK_STATUS_CHANGED: { label: 'FB Durum Değişikliği', color: '#f97316', icon: '🔀' },
    FEEDBACK_COMMENT: { label: 'FB Yorum', color: '#64748b', icon: '💭' },
    KPI_ENTRY_ADDED: { label: 'KPI Girişi', color: '#14b8a6', icon: '📊' },
    CREATE_FEEDBACK: { label: 'Geri Bildirim', color: '#8b5cf6', icon: '📝' },
    ERROR: { label: 'Hata', color: '#ef4444', icon: '⚠️' },
    DATA_CORRECTION: { label: 'Veri Düzeltme', color: '#f97316', icon: '🔧' },
};

function getActionInfo(action: string) {
    return ACTION_LABELS[action] || { label: action, color: '#64748b', icon: '📌' };
}

export default function AuditPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<any>({});

    // Filter state
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const fetchLogs = async (pg = 1) => {
        try {
            const params = new URLSearchParams();
            params.set('page', String(pg));
            if (actionFilter) params.set('action', actionFilter);
            if (entityFilter) params.set('entity', entityFilter);
            if (userFilter) params.set('userId', userFilter);
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);

            const res = await fetch(`/api/audit?${params.toString()}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setPage(data.page || 1);
            setTotalPages(data.totalPages || 1);
            setFilters(data.filters || {});
        } catch {
            showToast('İşlem kayıtları yüklenirken hata', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { document.title = 'Sporthink | Sistem Logları'; }, []);

    useEffect(() => {
        if (session) fetchLogs();
    }, [session]);

    const applyFilters = () => {
        setLoading(true);
        fetchLogs(1);
    };

    const clearFilters = () => {
        setActionFilter('');
        setEntityFilter('');
        setUserFilter('');
        setFromDate('');
        setToDate('');
        setLoading(true);
        setTimeout(() => fetchLogs(1), 50);
    };

    const handleExportCSV = () => {
        const headers = ['Tarih,Kullanıcı,Aksiyon,Entity,Detay,IP Adresi'];
        const rows = logs.map(l => {
            const date = new Date(l.createdAt).toLocaleString('tr-TR');
            const user = l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Sistem';
            return `"${date}","${user}","${l.action}","${l.entity}","${l.details || ''}","${l.ipAddress || ''}"`;
        });
        const csv = '\uFEFF' + [...headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV dosyası indirildi', 'success');
    };

    const formatDate = (d: string) => new Date(d).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Sistem Logları</h1>
                        <p className="text-secondary">Kim, ne zaman, ne değiştirdi — {total} kayıt</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleExportCSV} disabled={logs.length === 0}>
                        <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>download</span> CSV İndir
                    </button>
                </div>

                {/* Filters */}
                <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: 150 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Aksiyon</label>
                            <select className="form-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                                <option value="">Tümü</option>
                                {filters.actions?.map((a: string) => (
                                    <option key={a} value={a}>{getActionInfo(a).label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 150 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Entity</label>
                            <select className="form-select" value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
                                <option value="">Tümü</option>
                                {filters.entities?.map((e: string) => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 150 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Kullanıcı</label>
                            <select className="form-select" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                                <option value="">Tümü</option>
                                {filters.users?.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 130 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Başlangıç</label>
                            <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        </div>
                        <div style={{ flex: 1, minWidth: 130 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Bitiş</label>
                            <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                        <button className="btn btn-primary" onClick={applyFilters} style={{ padding: '8px 16px' }}>Filtrele</button>
                        <button className="btn btn-ghost" onClick={clearFilters} style={{ padding: '8px 16px' }}>Temizle</button>
                    </div>
                </div>

                {/* Timeline / Table */}
                {loading ? <SkeletonTable /> : (
                    <>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 150 }}>Tarih</th>
                                        <th style={{ width: 170 }}>Kullanıcı</th>
                                        <th style={{ width: 180 }}>Aksiyon</th>
                                        <th>Detay</th>
                                        <th style={{ width: 100 }}>IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => {
                                        const info = getActionInfo(log.action);
                                        return (
                                            <tr key={log.id}>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(log.createdAt)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                                        <div style={{
                                                            width: 28, height: 28, borderRadius: '50%',
                                                            background: `${info.color}20`, color: info.color,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.7rem', fontWeight: 700,
                                                        }}>
                                                            {log.user ? `${log.user.firstName?.[0]}${log.user.lastName?.[0]}` : '?'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                                                {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistem'}
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                                                                {log.user?.role || ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{
                                                        background: `${info.color}20`, color: info.color,
                                                        fontSize: '0.7rem', padding: '3px 10px',
                                                    }}>
                                                        {info.icon} {info.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.8rem' }}>{log.details || '—'}</td>
                                                <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{log.ipAddress || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                    {logs.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>Kayıt bulunamadı</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                                <button className="btn btn-ghost" onClick={() => { setLoading(true); fetchLogs(page - 1); }} disabled={page <= 1}>
                                    ← Önceki
                                </button>
                                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Sayfa {page} / {totalPages}
                                </span>
                                <button className="btn btn-ghost" onClick={() => { setLoading(true); fetchLogs(page + 1); }} disabled={page >= totalPages}>
                                    Sonraki →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
