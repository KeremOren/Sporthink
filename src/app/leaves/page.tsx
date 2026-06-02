'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';

type LeaveRequest = {
    id: string;
    userId: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string | null;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
    approvedAt: string | null;
    user: { id: string; firstName: string; lastName: string; store?: { name: string } };
    approver: { id: string; firstName: string; lastName: string } | null;
};

const LEAVE_TYPES: Record<string, { label: string; icon: string; color: string }> = {
    ANNUAL:      { label: 'Yıllık İzin',     icon: 'beach_access', color: '#3b82f6' },
    SICK:        { label: 'Hastalık İzni',    icon: 'sick',          color: '#dc2626' },
    UNPAID:      { label: 'Ücretsiz İzin',    icon: 'money_off',     color: '#94a3b8' },
    MARRIAGE:    { label: 'Evlilik İzni',     icon: 'favorite',      color: '#ec4899' },
    BEREAVEMENT: { label: 'Vefat İzni',       icon: 'church',        color: '#6b7280' },
    OTHER:       { label: 'Diğer',            icon: 'help_outline',  color: '#8b5cf6' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    PENDING:   { label: 'Beklemede',  color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)',  icon: 'pending' },
    APPROVED:  { label: 'Onaylandı',   color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)',  icon: 'check_circle' },
    REJECTED:  { label: 'Reddedildi',  color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)',  icon: 'cancel' },
    CANCELLED: { label: 'İptal Edildi', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', icon: 'block' },
};

function formatDate(d: string): string {
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeavesPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const user = session?.user as any;
    const role = user?.role;
    const isManager = role && ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(role);

    const [tab, setTab] = useState<'my' | 'approval'>(isManager ? 'approval' : 'my');
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<{ balance: any; pendingDays: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    useEffect(() => { document.title = 'Sporthink | İzinler'; }, []);

    const reload = async () => {
        setLoading(true);
        try {
            const query = statusFilter ? `?status=${statusFilter}` : '';
            const [reqRes, balRes] = await Promise.all([
                fetch('/api/leaves' + query).then(r => r.json()),
                fetch('/api/leaves/balance').then(r => r.json()),
            ]);
            setRequests(reqRes.requests || []);
            setBalance(balRes);
        } catch {
            showToast('Yüklenemedi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (session) reload(); }, [session, statusFilter]);

    const handleCreate = async (data: any) => {
        try {
            const res = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Hata');
            showToast('İzin talebi oluşturuldu', 'success');
            setShowNewModal(false);
            reload();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleAction = async (id: string, action: string, rejectionReason?: string) => {
        try {
            const res = await fetch(`/api/leaves/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, rejectionReason }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Hata');
            const labels: Record<string, string> = { APPROVE: 'onaylandı', REJECT: 'reddedildi', CANCEL: 'iptal edildi' };
            showToast(`Talep ${labels[action] || 'güncellendi'}`, 'success');
            setRejectingId(null);
            setRejectReason('');
            reload();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const myRequests = requests.filter(r => r.userId === user?.id);
    const pendingApproval = requests.filter(r => r.status === 'PENDING' && r.userId !== user?.id);
    const visibleList = tab === 'my' ? myRequests : (isManager ? requests.filter(r => r.userId !== user?.id) : myRequests);

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header cine-fadeInUp" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            }}>
                                <span className="material-icons-outlined">beach_access</span>
                            </span>
                            İzin Yönetimi
                        </h1>
                        <p className="page-subtitle">İzin taleplerini gönder ve takip et</p>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        style={{
                            padding: '12px 18px',
                            background: 'linear-gradient(135deg, #16a34a, #15803d)',
                            color: '#fff', border: 'none', borderRadius: 12,
                            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                        }}
                    >
                        <span className="material-icons-outlined">add</span>
                        Yeni İzin Talebi
                    </button>
                </div>

                <div style={{ padding: '20px 28px 32px' }}>
                    {/* Balance card */}
                    {balance && balance.balance && (
                        <div className="cine-fadeInUp" style={{
                            borderRadius: 16, marginBottom: 22, marginTop: 4,
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14,
                        }}>
                            <BalanceTile
                                icon="event_available" color="#16a34a"
                                label="Yıllık Bakiye" value={balance.balance.totalDays}
                                subText={`${new Date().getFullYear()} yılı`}
                            />
                            <BalanceTile
                                icon="event_busy" color="#dc2626"
                                label="Kullanılan" value={balance.balance.usedDays}
                                subText={`%${balance.balance.totalDays > 0 ? Math.round((balance.balance.usedDays / balance.balance.totalDays) * 100) : 0} kullanıldı`}
                            />
                            <BalanceTile
                                icon="pending_actions" color="#d97706"
                                label="Beklemede" value={balance.pendingDays}
                                subText="Onay bekleyen"
                            />
                            <BalanceTile
                                icon="check_circle" color="#3b82f6"
                                label="Kalan" value={balance.balance.remainingDays}
                                subText="Talep edilebilir"
                                highlight
                            />
                        </div>
                    )}

                    {/* Tabs */}
                    {isManager && (
                        <div style={{
                            display: 'flex', gap: 6, padding: 4,
                            background: 'rgba(0,0,0,0.04)',
                            borderRadius: 12, marginBottom: 16,
                            maxWidth: 500,
                        }}>
                            <button
                                onClick={() => setTab('approval')}
                                style={{
                                    flex: 1, padding: '10px 16px',
                                    background: tab === 'approval' ? '#fff' : 'transparent',
                                    color: tab === 'approval' ? '#16a34a' : 'var(--text-secondary)',
                                    border: 'none', borderRadius: 8,
                                    fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    boxShadow: tab === 'approval' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                                }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>approval</span>
                                Onaylanacaklar ({pendingApproval.length})
                            </button>
                            <button
                                onClick={() => setTab('my')}
                                style={{
                                    flex: 1, padding: '10px 16px',
                                    background: tab === 'my' ? '#fff' : 'transparent',
                                    color: tab === 'my' ? '#3b82f6' : 'var(--text-secondary)',
                                    border: 'none', borderRadius: 8,
                                    fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    boxShadow: tab === 'my' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                                }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>person</span>
                                Kendi İzinlerim
                            </button>
                        </div>
                    )}

                    {/* Status filter */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        {[
                            { value: '', label: 'Tümü', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: 'list_alt' },
                            { value: 'PENDING', label: 'Bekleyen', color: '#d97706', bg: 'rgba(217,119,6,0.12)', icon: 'schedule' },
                            { value: 'APPROVED', label: 'Onaylanan', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', icon: 'check_circle' },
                            { value: 'REJECTED', label: 'Reddedilen', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: 'cancel' },
                            { value: 'CANCELLED', label: 'İptal', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: 'block' },
                        ].map(f => {
                            const active = statusFilter === f.value;
                            return (
                                <button
                                    key={f.value}
                                    onClick={() => setStatusFilter(f.value)}
                                    style={{
                                        padding: '7px 14px',
                                        background: active ? f.color : f.bg,
                                        color: active ? '#fff' : f.color,
                                        border: `1px solid ${active ? f.color : 'transparent'}`,
                                        borderRadius: 999,
                                        fontSize: '0.8rem', fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        transition: 'all 0.2s ease',
                                        boxShadow: active ? `0 4px 12px ${f.color}55` : 'none',
                                        transform: active ? 'translateY(-1px)' : 'translateY(0)',
                                    }}
                                    onMouseEnter={e => {
                                        if (active) return;
                                        (e.currentTarget as HTMLButtonElement).style.background = `${f.color}22`;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${f.color}55`;
                                    }}
                                    onMouseLeave={e => {
                                        if (active) return;
                                        (e.currentTarget as HTMLButtonElement).style.background = f.bg;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                                    }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>{f.icon}</span>
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* List */}
                    {loading ? <SkeletonCard count={3} /> : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {visibleList.length === 0 ? (
                                <div style={{
                                    padding: '60px 20px', textAlign: 'center',
                                    background: 'var(--glass-bg)', borderRadius: 14, border: '1px solid var(--card-border)',
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', opacity: 0.5 }}>event_available</span>
                                    <h4 style={{ margin: '8px 0 4px' }}>Henüz izin talebi yok</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                                        {tab === 'approval' ? 'Onay bekleyen izin yok' : 'İlk izin talebinizi oluşturmak için yukarıdaki butona tıklayın'}
                                    </p>
                                </div>
                            ) : visibleList.map(req => (
                                <LeaveCard
                                    key={req.id}
                                    request={req}
                                    isManager={isManager}
                                    isOwn={req.userId === user?.id}
                                    onApprove={() => handleAction(req.id, 'APPROVE')}
                                    onReject={() => setRejectingId(req.id)}
                                    onCancel={() => handleAction(req.id, 'CANCEL')}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* New leave modal */}
                {showNewModal && (
                    <LeaveModal
                        onSubmit={handleCreate}
                        onClose={() => setShowNewModal(false)}
                        balance={balance}
                    />
                )}

                {/* Reject reason modal */}
                {rejectingId && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                    }}>
                        <div style={{
                            background: 'var(--bg-secondary)', borderRadius: 16, padding: 24,
                            maxWidth: 440, width: '100%', border: '1px solid var(--card-border)',
                        }}>
                            <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 700 }}>Reddetme Nedeni</h3>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Talebi neden reddediyorsunuz?"
                                rows={4}
                                style={{
                                    width: '100%', padding: '10px 12px',
                                    border: '1px solid var(--card-border)', borderRadius: 8,
                                    background: 'var(--background)', color: 'var(--text-primary)',
                                    fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical',
                                }}
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                                <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="btn btn-ghost" style={{ flex: 1 }}>
                                    İptal
                                </button>
                                <button
                                    onClick={() => rejectingId && handleAction(rejectingId, 'REJECT', rejectReason)}
                                    style={{
                                        flex: 1, padding: '10px 18px',
                                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                        color: '#fff', border: 'none', borderRadius: 8,
                                        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    Reddet
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function BalanceTile({ icon, color, label, value, subText, highlight }: any) {
    // Her kart kendi renginin solid (parlak) versiyonunu kullanır — dark/light her ikisinde net görünür
    const gradient = highlight
        ? 'linear-gradient(135deg, #16a34a, #15803d)'
        : `linear-gradient(135deg, ${color}, ${color}dd)`;
    return (
        <div style={{
            padding: 16,
            background: gradient,
            borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: `0 6px 18px ${color}40`,
            color: '#fff',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.22)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <span className="material-icons-outlined">{icon}</span>
            </div>
            <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {value} <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.9 }}>gün</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.98)' }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)' }}>{subText}</div>
            </div>
        </div>
    );
}

function LeaveCard({ request, isManager, isOwn, onApprove, onReject, onCancel }: any) {
    const type = LEAVE_TYPES[request.type] || LEAVE_TYPES.OTHER;
    const status = STATUS_META[request.status] || STATUS_META.PENDING;
    const canManagerAct = isManager && !isOwn && request.status === 'PENDING';
    const canCancel = isOwn && request.status === 'PENDING';

    return (
        <div className="cine-fadeInUp" style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)',
            borderLeft: `4px solid ${type.color}`,
            borderRadius: 12, padding: 16,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
            {/* Type icon */}
            <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: `${type.color}20`, color: type.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <span className="material-icons-outlined">{type.icon}</span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.95rem' }}>{type.label}</strong>
                    <span style={{
                        padding: '2px 8px', borderRadius: 6,
                        background: status.bg, color: status.color,
                        fontSize: '0.7rem', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '0.8rem' }}>{status.icon}</span>
                        {status.label}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                        {request.days} işgünü
                    </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {formatDate(request.startDate)} → {formatDate(request.endDate)}
                </div>
                {!isOwn && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                        👤 {request.user.firstName} {request.user.lastName}
                        {request.user.store?.name && ` • ${request.user.store.name}`}
                    </div>
                )}
                {request.reason && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic' }}>
                        💬 {request.reason}
                    </div>
                )}
                {request.rejectionReason && (
                    <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4 }}>
                        ❌ Red nedeni: {request.rejectionReason}
                    </div>
                )}
                {request.approvedAt && request.approver && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {request.status === 'APPROVED' ? '✅' : '❌'} {request.approver.firstName} {request.approver.lastName} • {formatDate(request.approvedAt)}
                    </div>
                )}
            </div>

            {/* Actions */}
            {canManagerAct && (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onReject} style={{
                        padding: '8px 14px', background: 'rgba(220, 38, 38, 0.1)',
                        color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.25)',
                        borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    }}>
                        Reddet
                    </button>
                    <button onClick={onApprove} style={{
                        padding: '8px 14px', background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    }}>
                        Onayla
                    </button>
                </div>
            )}
            {canCancel && (
                <button onClick={onCancel} className="btn btn-ghost btn-sm">
                    İptal Et
                </button>
            )}
        </div>
    );
}

function LeaveModal({ onSubmit, onClose, balance }: any) {
    const [form, setForm] = useState({
        type: 'ANNUAL',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        reason: '',
    });

    // Calculate working days preview
    const calcDays = () => {
        const s = new Date(form.startDate);
        const e = new Date(form.endDate);
        if (e < s) return 0;
        let count = 0;
        const d = new Date(s);
        while (d <= e) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) count++;
            d.setDate(d.getDate() + 1);
        }
        return count;
    };
    const days = calcDays();
    const isAnnual = form.type === 'ANNUAL';
    const insufficient = isAnnual && balance?.balance && days > balance.balance.remainingDays;

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                background: 'var(--bg-secondary)', borderRadius: 16, padding: 24,
                maxWidth: 520, width: '100%', border: '1px solid var(--card-border)',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Yeni İzin Talebi</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                {/* Type */}
                <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>İzin Tipi</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                    {Object.entries(LEAVE_TYPES).map(([code, t]) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => setForm({ ...form, type: code })}
                            style={{
                                padding: '10px 6px',
                                background: form.type === code ? t.color : 'transparent',
                                color: form.type === code ? '#fff' : 'var(--text-secondary)',
                                border: `1px solid ${form.type === code ? t.color : 'var(--card-border)'}`,
                                borderRadius: 8, cursor: 'pointer',
                                fontSize: '0.72rem', fontWeight: 700,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Başlangıç</label>
                        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: 8, background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Bitiş</label>
                        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: 8, background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                    </div>
                </div>

                {/* Days preview */}
                <div style={{
                    padding: 12, borderRadius: 8, marginBottom: 14,
                    background: insufficient ? 'rgba(220, 38, 38, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                    border: `1px solid ${insufficient ? 'rgba(220, 38, 38, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                    fontSize: '0.85rem',
                }}>
                    📅 Toplam <strong>{days}</strong> iş günü
                    {isAnnual && balance?.balance && (
                        <span style={{ color: 'var(--text-tertiary)' }}> · Kalan bakiye: <strong>{balance.balance.remainingDays}</strong></span>
                    )}
                    {insufficient && (
                        <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 4, fontSize: '0.82rem' }}>
                            ⚠️ Yetersiz bakiye!
                        </div>
                    )}
                </div>

                {/* Reason */}
                <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Açıklama (opsiyonel)</label>
                <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="İzin nedenini kısaca açıklayın..."
                    rows={3}
                    style={{
                        width: '100%', padding: '10px 12px',
                        border: '1px solid var(--card-border)', borderRadius: 8,
                        background: 'var(--background)', color: 'var(--text-primary)',
                        fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical',
                    }}
                />

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>İptal</button>
                    <button
                        onClick={() => onSubmit(form)}
                        disabled={insufficient || days < 1}
                        style={{
                            flex: 1, padding: '10px 18px',
                            background: insufficient ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)',
                            color: '#fff', border: 'none', borderRadius: 8,
                            fontSize: '0.9rem', fontWeight: 700,
                            cursor: insufficient ? 'not-allowed' : 'pointer',
                            opacity: insufficient || days < 1 ? 0.5 : 1,
                        }}
                    >
                        Talep Gönder
                    </button>
                </div>
            </div>
        </div>
    );
}
