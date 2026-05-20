'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ROLE_LABELS } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    NOT_STARTED: { label: 'Başlanmadı', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: 'schedule' },
    IN_PROGRESS: { label: 'Devam Ediyor', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'play_circle' },
    COMPLETED: { label: 'Tamamlandı', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: 'check_circle' },
    OVERDUE: { label: 'Gecikti', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: 'warning' },
};

export default function AssignmentStatusPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const trainingId = params?.id as string;
    const { showToast } = useToast();

    const [training, setTraining] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAssign, setShowAssign] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [dueDate, setDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 15;

    useEffect(() => { document.title = 'Sporthink | Atama Durumu'; }, []);

    useEffect(() => {
        if (session && trainingId) {
            fetchData();
            fetchUsers();
        }
    }, [session, trainingId]);

    const fetchData = () => {
        setLoading(true);
        fetch(`/api/trainings/assignments?trainingId=${trainingId}`)
            .then(r => r.json())
            .then(data => {
                setTraining(data.training);
                setAssignments(data.assignments || []);
            })
            .catch(() => showToast('Atama verileri yüklenirken hata', 'error'))
            .finally(() => setLoading(false));
    };

    const fetchUsers = () => {
        fetch('/api/users')
            .then(r => r.json())
            .then(data => setUsers(Array.isArray(data) ? data : []))
            .catch(() => { });
    };

    const handleAssign = async () => {
        if (selectedUserIds.length === 0) {
            showToast('En az bir personel seçin', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/trainings/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trainingId, userIds: selectedUserIds, dueDate: dueDate || null }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            showToast(`${data.count} personele atama yapıldı`, 'success');
            setShowAssign(false);
            setSelectedUserIds([]);
            setDueDate('');
            fetchData();
        } catch {
            showToast('Atama yapılırken hata oluştu', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!session) return null;
    const user = session.user as any;
    const role = user?.role;
    const isManager = ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(role);

    if (!isManager) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="empty-state">
                        <span className="material-icons-outlined">lock</span>
                        <p>Bu sayfaya erişim yetkiniz yok</p>
                    </div>
                </main>
            </div>
        );
    }

    // Compute effective status (OVERDUE if past dueDate and not completed)
    const effectiveStatus = (a: any): string => {
        if (a.status === 'COMPLETED') return 'COMPLETED';
        if (a.dueDate && new Date(a.dueDate) < new Date()) return 'OVERDUE';
        return a.status;
    };

    // Stats (use effective status — mutually exclusive)
    const total = assignments.length;
    const completed = assignments.filter(a => effectiveStatus(a) === 'COMPLETED').length;
    const inProgress = assignments.filter(a => effectiveStatus(a) === 'IN_PROGRESS').length;
    const notStarted = assignments.filter(a => effectiveStatus(a) === 'NOT_STARTED').length;
    const overdue = assignments.filter(a => effectiveStatus(a) === 'OVERDUE').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Filter assignments
    const filteredAssignments = assignments.filter(a => {
        if (statusFilter !== 'all' && effectiveStatus(a) !== statusFilter) return false;
        if (searchTerm) {
            const name = `${a.user?.firstName} ${a.user?.lastName}`.toLowerCase();
            if (!name.includes(searchTerm.toLowerCase())) return false;
        }
        return true;
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pagedAssignments = filteredAssignments.slice(pageStart, pageStart + PAGE_SIZE);

    // Users available to assign (not already assigned)
    const assignedUserIds = new Set(assignments.map(a => a.user?.id));
    const availableUsers = users.filter(u => !assignedUserIds.has(u.id) && u.isActive);

    const stats = [
        { label: 'Toplam Atama', value: total, color: '#6366f1', icon: 'groups' },
        { label: 'Tamamlandı', value: completed, color: '#22c55e', icon: 'check_circle' },
        { label: 'Devam Ediyor', value: inProgress, color: '#f59e0b', icon: 'play_circle' },
        { label: 'Başlanmadı', value: notStarted, color: '#64748b', icon: 'schedule' },
        { label: 'Gecikti', value: overdue, color: '#ef4444', icon: 'warning' },
    ];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <button
                            onClick={() => router.push('/trainings')}
                            style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--text-secondary)', fontSize: '0.82rem',
                                cursor: 'pointer', marginBottom: 6,
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: 0,
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
                            Eğitim Merkezi'ne Dön
                        </button>
                        <h1>{training?.title || 'Eğitim Atamaları'}</h1>
                        <div className="page-header-sub">
                            {training?.category && <span style={{ marginRight: 12 }}>📁 {training.category}</span>}
                            {training?.durationMinutes && <span>⏱ {training.durationMinutes} dk</span>}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAssign(true)}
                        style={{
                            padding: '10px 18px',
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #E53935, #ec4899)',
                            color: '#fff', border: 'none',
                            fontSize: '0.85rem', fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 16px rgba(229,57,53,0.35)',
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>person_add</span>
                        Personel Ata
                    </button>
                </div>

                <div style={{ padding: 'var(--space-xl)' }}>
                    {loading ? (
                        <SkeletonCard count={3} />
                    ) : (
                        <>
                            {/* Description card */}
                            {training?.description && (
                                <div style={{
                                    background: 'var(--glass-bg)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(229,57,53,0.06)',
                                    borderRadius: 14,
                                    padding: '16px 20px',
                                    marginBottom: 20,
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.6,
                                }}>
                                    {training.description}
                                </div>
                            )}

                            {/* Completion overview */}
                            <div style={{
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(16px)',
                                borderRadius: 16,
                                padding: '20px 24px',
                                marginBottom: 20,
                                border: '1px solid rgba(229,57,53,0.1)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Genel Tamamlanma Oranı</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            %{completionRate}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                            {completed} / {total} personel tamamladı
                                        </div>
                                    </div>
                                </div>
                                <div style={{ height: 10, borderRadius: 6, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${completionRate}%`,
                                        background: 'linear-gradient(90deg, #22c55e, #16a34a, #15803d)',
                                        boxShadow: '0 0 12px rgba(34,197,94,0.4)',
                                        transition: 'width 1s ease',
                                    }} />
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: 14,
                                marginBottom: 24,
                            }}>
                                {stats.map(s => (
                                    <div key={s.label}
                                        onClick={() => {
                                            if (s.label === 'Toplam Atama') setStatusFilter('all');
                                            else if (s.label === 'Tamamlandı') setStatusFilter('COMPLETED');
                                            else if (s.label === 'Devam Ediyor') setStatusFilter('IN_PROGRESS');
                                            else if (s.label === 'Başlanmadı') setStatusFilter('NOT_STARTED');
                                            else if (s.label === 'Gecikti') setStatusFilter('OVERDUE');
                                        }}
                                        style={{
                                            background: 'var(--glass-bg)',
                                            backdropFilter: 'blur(16px)',
                                            border: `1px solid ${s.color}22`,
                                            borderRadius: 14,
                                            padding: '14px 16px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                                            (e.currentTarget as HTMLDivElement).style.borderColor = `${s.color}55`;
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                                            (e.currentTarget as HTMLDivElement).style.borderColor = `${s.color}22`;
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span className="material-icons-outlined" style={{ color: s.color, fontSize: '1.1rem' }}>{s.icon}</span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{s.label}</span>
                                        </div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Filters */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                                    <span className="material-icons-outlined" style={{
                                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--text-tertiary)', fontSize: '1.1rem', pointerEvents: 'none',
                                    }}>search</span>
                                    <input
                                        className="form-input"
                                        style={{ paddingLeft: 36 }}
                                        placeholder="Personel ara..."
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                                    />
                                </div>
                                <select className="form-select" style={{ minWidth: 180 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                                    <option value="all">Tüm Durumlar</option>
                                    <option value="NOT_STARTED">Başlanmadı</option>
                                    <option value="IN_PROGRESS">Devam Ediyor</option>
                                    <option value="COMPLETED">Tamamlandı</option>
                                    <option value="OVERDUE">Gecikti</option>
                                </select>
                            </div>

                            {/* Assignments Table */}
                            {filteredAssignments.length === 0 ? (
                                <div className="empty-state">
                                    <span className="material-icons-outlined">person_off</span>
                                    <p>{assignments.length === 0 ? 'Henüz personel atanmamış' : 'Filtreye uyan personel yok'}</p>
                                    {assignments.length === 0 && (
                                        <button className="btn btn-primary" onClick={() => setShowAssign(true)}>
                                            <span className="material-icons-outlined">person_add</span>
                                            İlk Personeli Ata
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    background: 'var(--glass-bg)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(229,57,53,0.06)',
                                    borderRadius: 14,
                                    overflow: 'hidden',
                                }}>
                                    <div className="table-container" style={{ border: 'none' }}>
                                        <table style={{ fontSize: '0.78rem' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: '8px 12px' }}>Personel</th>
                                                    <th style={{ padding: '8px 12px' }}>Mağaza</th>
                                                    <th style={{ padding: '8px 12px' }}>Durum</th>
                                                    <th style={{ padding: '8px 12px' }}>Atanma</th>
                                                    <th style={{ padding: '8px 12px' }}>Son Tarih</th>
                                                    <th style={{ padding: '8px 12px' }}>Tamamlanma</th>
                                                    <th style={{ padding: '8px 12px' }}>Atayan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedAssignments.map(a => {
                                                    const meta = STATUS_META[a.status] || STATUS_META.NOT_STARTED;
                                                    const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'COMPLETED';
                                                    const finalMeta = isOverdue ? STATUS_META.OVERDUE : meta;
                                                    return (
                                                        <tr key={a.id} style={{ height: 40 }}>
                                                            <td style={{ padding: '6px 12px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div className="sidebar-avatar" style={{ width: 24, height: 24, fontSize: '0.6rem', flexShrink: 0 }}>
                                                                        {a.user?.firstName?.[0]}{a.user?.lastName?.[0]}
                                                                    </div>
                                                                    <span style={{ fontWeight: 600 }}>{a.user?.firstName} {a.user?.lastName}</span>
                                                                    <span style={{
                                                                        fontSize: '0.65rem',
                                                                        color: 'var(--text-tertiary)',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 4,
                                                                        background: 'var(--bg-tertiary)',
                                                                    }}>
                                                                        {ROLE_LABELS[a.user?.role as keyof typeof ROLE_LABELS] || a.user?.role}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{a.user?.store?.name || '-'}</td>
                                                            <td style={{ padding: '6px 12px' }}>
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                                                    padding: '2px 8px', borderRadius: 10,
                                                                    background: finalMeta.bg, color: finalMeta.color,
                                                                    fontSize: '0.68rem', fontWeight: 600,
                                                                }}>
                                                                    <span className="material-icons-outlined" style={{ fontSize: '0.78rem' }}>{finalMeta.icon}</span>
                                                                    {finalMeta.label}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{formatDate(a.createdAt)}</td>
                                                            <td style={{ padding: '6px 12px', color: isOverdue ? '#ef4444' : 'var(--text-secondary)', fontWeight: isOverdue ? 600 : 400 }}>
                                                                {a.dueDate ? formatDate(a.dueDate) : '-'}
                                                            </td>
                                                            <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>
                                                                {a.completedAt ? formatDate(a.completedAt) : '-'}
                                                            </td>
                                                            <td style={{ padding: '6px 12px', color: 'var(--text-tertiary)' }}>
                                                                {a.assignedBy ? `${a.assignedBy.firstName} ${a.assignedBy.lastName}` : 'Sistem'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 16px',
                                            borderTop: '1px solid var(--border)',
                                            background: 'var(--bg-secondary)',
                                        }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredAssignments.length)} / {filteredAssignments.length} personel
                                            </span>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <button
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 6,
                                                        border: '1px solid var(--border)',
                                                        background: 'transparent',
                                                        color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                        fontSize: '0.78rem',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                    }}
                                                >
                                                    <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>chevron_left</span>
                                                    Önceki
                                                </button>
                                                <span style={{ fontSize: '0.78rem', padding: '0 8px', color: 'var(--text-secondary)' }}>
                                                    Sayfa <strong>{currentPage}</strong> / {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 6,
                                                        border: '1px solid var(--border)',
                                                        background: 'transparent',
                                                        color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                        fontSize: '0.78rem',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                    }}
                                                >
                                                    Sonraki
                                                    <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>chevron_right</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Assign Modal */}
                {showAssign && (
                    <div className="modal-overlay" onClick={() => setShowAssign(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                            <div className="modal-header">
                                <h3>Personel Ata</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAssign(false)}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Son Tarih (opsiyonel)</label>
                                    <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        Personel Seç ({selectedUserIds.length} seçili)
                                    </label>
                                    {availableUsers.length === 0 ? (
                                        <div style={{
                                            padding: 20, textAlign: 'center',
                                            background: 'var(--bg-tertiary)', borderRadius: 8,
                                            color: 'var(--text-tertiary)', fontSize: '0.85rem',
                                        }}>
                                            Atanabilecek personel yok (hepsi zaten atanmış)
                                        </div>
                                    ) : (
                                        <div style={{
                                            maxHeight: 300, overflowY: 'auto',
                                            border: '1px solid var(--border)',
                                            borderRadius: 8,
                                            background: 'var(--bg-secondary)',
                                        }}>
                                            {availableUsers.map(u => {
                                                const selected = selectedUserIds.includes(u.id);
                                                return (
                                                    <label key={u.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        background: selected ? 'rgba(229,57,53,0.08)' : 'transparent',
                                                        borderBottom: '1px solid var(--border)',
                                                        transition: 'background 0.2s ease',
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => {
                                                                if (selected) setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                                                                else setSelectedUserIds([...selectedUserIds, u.id]);
                                                            }}
                                                        />
                                                        <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: '0.65rem', flexShrink: 0 }}>
                                                            {u.firstName?.[0]}{u.lastName?.[0]}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                                                {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                                                                {u.store?.name && ` • ${u.store.name}`}
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {availableUsers.length > 0 && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedUserIds(availableUsers.map(u => u.id))}
                                                style={{
                                                    fontSize: '0.75rem', padding: '4px 10px',
                                                    border: '1px solid var(--border)', borderRadius: 6,
                                                    background: 'transparent', color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Tümünü Seç
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedUserIds([])}
                                                style={{
                                                    fontSize: '0.75rem', padding: '4px 10px',
                                                    border: '1px solid var(--border)', borderRadius: 6,
                                                    background: 'transparent', color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Temizle
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowAssign(false)}>İptal</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAssign}
                                    disabled={submitting || selectedUserIds.length === 0}
                                >
                                    {submitting ? 'Atanıyor...' : `${selectedUserIds.length} Personele Ata`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
