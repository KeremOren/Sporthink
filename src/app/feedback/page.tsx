'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { useNotifications } from '@/components/ui/NotificationProvider';
import { SkeletonKanban } from '@/components/ui/Skeleton';
import { getStatusColor, getStatusLabel, formatDate, formatDateTime } from '@/lib/utils';

const STATUS_ORDER = ['NEW', 'IN_REVIEW', 'ACTION_PLANNED', 'IMPLEMENTED', 'CLOSED'];
const TYPES = ['OPERATIONAL_ISSUE', 'SUGGESTION', 'INCIDENT', 'PRAISE', 'TRAINING_NEED', 'CUSTOMER_COMPLAINT', 'PRODUCT_DEFECT', 'STOCK_ISSUE', 'STAFF_ISSUE', 'STORE_MAINTENANCE'];

export default function FeedbackPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const { addNotification } = useNotifications();
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [showCreate, setShowCreate] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');
    const [form, setForm] = useState({ title: '', description: '', type: 'OPERATIONAL_ISSUE', priority: 'MEDIUM' });
    // Detail / Comments
    const [selectedFb, setSelectedFb] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    useEffect(() => { document.title = 'Sporthink | Geri Bildirim'; }, []);

    useEffect(() => {
        if (session) fetchFeedback();
    }, [session]);

    const fetchFeedback = () => {
        const params = typeFilter ? `?type=${typeFilter}` : '';
        fetch(`/api/feedback${params}`).then(r => r.json()).then(setFeedback).finally(() => setLoading(false));
    };

    useEffect(() => { if (session) fetchFeedback(); }, [typeFilter]);

    const handleCreate = async () => {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        setShowCreate(false);
        setForm({ title: '', description: '', type: 'OPERATIONAL_ISSUE', priority: 'MEDIUM' });
        showToast('Geri bildirim başarıyla oluşturuldu', 'success');
        addNotification({ title: 'Yeni Geri Bildirim', message: `"${form.title}" başarıyla oluşturuldu.`, type: 'feedback', link: '/feedback' });
        fetchFeedback();
    };

    const updateStatus = async (id: string, newStatus: string) => {
        await fetch('/api/feedback', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus }),
        });
        showToast(`Durum güncellendi: ${getStatusLabel(newStatus)}`, 'success');
        addNotification({ title: 'Durum Değişikliği', message: `Geri bildirim durumu "${getStatusLabel(newStatus)}" olarak güncellendi.`, type: 'info', link: '/feedback' });
        fetchFeedback();
    };

    const openDetail = async (fb: any) => {
        setSelectedFb(fb);
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/feedback/${fb.id}`);
            setDetail(await res.json());
        } catch { setDetail(null); }
        setLoadingDetail(false);
    };

    const sendComment = async () => {
        if (!commentText.trim() || !selectedFb) return;
        setSendingComment(true);
        try {
            await fetch(`/api/feedback/${selectedFb.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: commentText }),
            });
            setCommentText('');
            // Refresh detail
            const res = await fetch(`/api/feedback/${selectedFb.id}`);
            setDetail(await res.json());
            showToast('Yorum eklendi', 'success');
        } catch {
            showToast('Yorum eklenirken hata oluştu', 'error');
        }
        setSendingComment(false);
    };

    if (!session) return null;
    const user = session.user as any;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Geri Bildirim</h1>
                        <div className="page-header-sub">{feedback.length} kayıt</div>
                    </div>
                    <div className="flex gap-sm">
                        <button className={`btn ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setView('kanban')}>
                            <span className="material-icons-outlined">view_kanban</span>
                        </button>
                        <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setView('list')}>
                            <span className="material-icons-outlined">list</span>
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            <span className="material-icons-outlined">add</span> Yeni
                        </button>
                    </div>
                </div>

                <div className="page-body">
                    <div className="filter-bar">
                        <select className="form-select" style={{ width: 'auto', minWidth: 180 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            <option value="">Tüm Türler</option>
                            {TYPES.map(t => <option key={t} value={t}>{getStatusLabel(t)}</option>)}
                        </select>
                    </div>

                    {loading ? (
                        <SkeletonKanban columns={5} />
                    ) : view === 'kanban' ? (
                        <div className="kanban-board">
                            {STATUS_ORDER.map(s => {
                                const items = feedback.filter(f => f.status === s);
                                return (
                                    <div key={s} className="kanban-column">
                                        <div className="kanban-column-header">
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(s) }} />
                                                {getStatusLabel(s)}
                                            </span>
                                            <span className="kanban-count">{items.length}</span>
                                        </div>
                                        <div className="kanban-column-body">
                                            {items.map(fb => (
                                                <div key={fb.id} className="kanban-card" onClick={() => openDetail(fb)}>
                                                    <div className="flex justify-between items-center mb-sm">
                                                        <span className="badge" style={{ background: `${getStatusColor(fb.priority)}20`, color: getStatusColor(fb.priority), fontSize: '0.65rem' }}>
                                                            {getStatusLabel(fb.priority)}
                                                        </span>
                                                        <span className="text-xs text-secondary">{getStatusLabel(fb.type)}</span>
                                                    </div>
                                                    <div className="font-semibold text-sm" style={{ marginBottom: 4 }}>{fb.title}</div>
                                                    <div className="text-xs text-secondary">{fb.submittedBy?.firstName} {fb.submittedBy?.lastName}</div>
                                                    <div className="text-xs text-secondary">{fb.store?.name}</div>
                                                    {user.role !== 'EMPLOYEE' && (
                                                        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                            {STATUS_ORDER.filter(ns => ns !== s).slice(0, 2).map(ns => (
                                                                <button key={ns} className="btn btn-ghost btn-sm" style={{ fontSize: '0.6rem', padding: '2px 6px' }} onClick={e => { e.stopPropagation(); updateStatus(fb.id, ns); }}>
                                                                    → {getStatusLabel(ns)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Başlık</th><th>Tür</th><th>Öncelik</th><th>Durum</th><th>Gönderen</th><th>Mağaza</th><th>Tarih</th></tr>
                                </thead>
                                <tbody>
                                    {feedback.map(fb => (
                                        <tr key={fb.id} onClick={() => openDetail(fb)} style={{ cursor: 'pointer' }}>
                                            <td className="font-semibold">{fb.title}</td>
                                            <td><span className="badge badge-neutral">{getStatusLabel(fb.type)}</span></td>
                                            <td><span className="badge" style={{ background: `${getStatusColor(fb.priority)}20`, color: getStatusColor(fb.priority) }}>{getStatusLabel(fb.priority)}</span></td>
                                            <td><span className="badge" style={{ background: `${getStatusColor(fb.status)}20`, color: getStatusColor(fb.status) }}>{getStatusLabel(fb.status)}</span></td>
                                            <td className="text-sm">{fb.submittedBy?.firstName} {fb.submittedBy?.lastName}</td>
                                            <td className="text-sm">{fb.store?.name || '-'}</td>
                                            <td className="text-sm text-secondary">{formatDate(fb.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Yeni Geri Bildirim</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}><span className="material-icons-outlined">close</span></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Başlık</label>
                                    <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Geri bildirim başlığı" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Açıklama</label>
                                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detaylı açıklama..." />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Tür</label>
                                        <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                            {TYPES.map(t => <option key={t} value={t}>{getStatusLabel(t)}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Öncelik</label>
                                        <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{getStatusLabel(p)}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleCreate} disabled={!form.title || !form.description}>Gönder</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail + Comments Modal */}
                {selectedFb && (
                    <div className="modal-overlay" onClick={() => { setSelectedFb(null); setDetail(null); }}>
                        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{selectedFb.title}</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedFb(null); setDetail(null); }}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {loadingDetail ? (
                                    <div className="loading-center"><div className="spinner" /></div>
                                ) : detail ? (
                                    <>
                                        <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                                            <span className="badge" style={{ background: `${getStatusColor(detail.status)}20`, color: getStatusColor(detail.status) }}>
                                                {getStatusLabel(detail.status)}
                                            </span>
                                            <span className="badge" style={{ background: `${getStatusColor(detail.priority)}20`, color: getStatusColor(detail.priority) }}>
                                                {getStatusLabel(detail.priority)}
                                            </span>
                                            <span className="badge badge-neutral">{getStatusLabel(detail.type)}</span>
                                        </div>

                                        <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)', lineHeight: 1.7 }}>
                                            {detail.description}
                                        </p>

                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-lg)' }}>
                                            Gönderen: {detail.submittedBy?.firstName} {detail.submittedBy?.lastName} • {formatDate(detail.createdAt)}
                                        </div>

                                        {/* Status Transitions */}
                                        {user.role !== 'EMPLOYEE' && (
                                            <div className="flex gap-sm mb-lg" style={{ flexWrap: 'wrap' }}>
                                                {STATUS_ORDER.filter(s => s !== detail.status).map(s => (
                                                    <button key={s} className="btn btn-ghost btn-sm" onClick={() => { updateStatus(detail.id, s); setSelectedFb(null); setDetail(null); }}>
                                                        → {getStatusLabel(s)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Activity / Comments */}
                                        <h4 style={{ marginBottom: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
                                            Aktivite & Yorumlar ({detail.activities?.length || 0})
                                        </h4>

                                        <div className="comment-thread">
                                            {detail.activities?.map((act: any) => {
                                                const isComment = act.type === 'COMMENT';
                                                const actionLabels: Record<string, string> = {
                                                    COMMENT: 'Yorum',
                                                    STATUS_CHANGE: 'Durum Değişikliği',
                                                    CREATED: 'Oluşturuldu',
                                                    ASSIGNED: 'Atandı',
                                                    PRIORITY_CHANGE: 'Öncelik Değişikliği',
                                                };
                                                const actionIcons: Record<string, string> = {
                                                    COMMENT: 'chat_bubble_outline',
                                                    STATUS_CHANGE: 'swap_horiz',
                                                    CREATED: 'add_circle_outline',
                                                    ASSIGNED: 'person_add',
                                                    PRIORITY_CHANGE: 'flag',
                                                };
                                                const actionColors: Record<string, string> = {
                                                    COMMENT: '#3b82f6',
                                                    STATUS_CHANGE: '#8b5cf6',
                                                    CREATED: '#22c55e',
                                                    ASSIGNED: '#06b6d4',
                                                    PRIORITY_CHANGE: '#f59e0b',
                                                };
                                                const color = actionColors[act.type] || '#6b7280';
                                                return (
                                                    <div key={act.id} className="comment-item" style={{ borderLeft: `3px solid ${color}`, paddingLeft: 'var(--space-md)', marginLeft: 4 }}>
                                                        <div className="comment-avatar" style={{ background: `${color}20`, color }}>
                                                            <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>
                                                                {actionIcons[act.type] || 'info'}
                                                            </span>
                                                        </div>
                                                        <div className="comment-body">
                                                            <div className="comment-header">
                                                                <span className="comment-author">
                                                                    {act.user?.firstName} {act.user?.lastName}
                                                                    <span className="badge" style={{ marginLeft: 8, fontSize: '0.6rem', background: `${color}20`, color }}>
                                                                        {actionLabels[act.type] || act.type}
                                                                    </span>
                                                                </span>
                                                                <span className="comment-time">{formatDateTime(act.createdAt)}</span>
                                                            </div>
                                                            <div className="comment-text">
                                                                {isComment ? act.details : (
                                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                        {act.details}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add Comment */}
                                        <div className="comment-form">
                                            <input
                                                className="form-input"
                                                placeholder="Yorum yazın..."
                                                value={commentText}
                                                onChange={e => setCommentText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && sendComment()}
                                            />
                                            <button className="btn btn-primary btn-sm" onClick={sendComment} disabled={sendingComment || !commentText.trim()}>
                                                <span className="material-icons-outlined">send</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-state"><p>Detay yüklenemedi</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
