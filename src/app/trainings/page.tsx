'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { useNotifications } from '@/components/ui/NotificationProvider';
import { SkeletonCard } from '@/components/ui/Skeleton';

type EmpTab = 'all' | 'in_progress' | 'completed' | 'not_started';
type ManagerTab = 'all' | 'assigned';

const CATEGORY_COLORS: Record<string, string> = {
    'Satış': '#E53935',
    'Ürün': '#8b5cf6',
    'Marka & Ürün': '#8b5cf6',
    'Güvenlik': '#0ea5e9',
    'Operasyon': '#f59e0b',
    'Yönetim': '#22c55e',
};

const CATEGORY_GRADIENTS: Record<string, string> = {
    'Satış': 'linear-gradient(135deg, #E53935 0%, #ef5350 50%, #ff7043 100%)',
    'Ürün': 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)',
    'Marka & Ürün': 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)',
    'Güvenlik': 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
    'Operasyon': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)',
    'Yönetim': 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
};

function getTrainingImage(t: any): string | null {
    const title = (t.title || '').toLowerCase();
    if (title.includes('müşteri') && title.includes('karşılama')) return '/trainings/musteri-karsilama/slide-01.jpg';
    if (title.includes('alarm') && title.includes('etiket')) return '/trainings/alarm-etiket/slide-01.jpg';
    return null;
}

function formatShortDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function TrainingsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { showToast } = useToast();
    const { addNotification } = useNotifications();
    const [trainings, setTrainings] = useState<any[]>([]);
    const [myAssignments, setMyAssignments] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [empTab, setEmpTab] = useState<EmpTab>('all');
    const [mgrTab, setMgrTab] = useState<ManagerTab>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', category: 'Güvenlik', type: 'MANDATORY', durationMinutes: '', minPassRate: '70' });

    useEffect(() => { document.title = 'Sporthink | Eğitimlerim'; }, []);

    useEffect(() => { if (session) fetchTrainings(); }, [session]);

    const fetchTrainings = () => {
        fetch('/api/trainings')
            .then(r => r.json())
            .then(data => { setTrainings(data.trainings || []); setMyAssignments(data.myAssignments || {}); })
            .finally(() => setLoading(false));
    };

    const handleCreate = async () => {
        try {
            await fetch('/api/trainings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            setShowCreate(false);
            setForm({ title: '', description: '', category: 'Güvenlik', type: 'MANDATORY', durationMinutes: '', minPassRate: '70' });
            showToast('Eğitim başarıyla oluşturuldu', 'success');
            addNotification({ title: 'Yeni Eğitim Oluşturuldu', message: `"${form.title}" eğitimi başarıyla eklendi.`, type: 'training', link: '/trainings' });
            fetchTrainings();
        } catch {
            showToast('Eğitim oluşturulurken hata oluştu', 'error');
        }
    };

    if (!session) return null;

    const user = session.user as any;
    const role = user?.role;
    const isManager = ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(role);
    const categories = ['Güvenlik', 'Satış', 'Ürün', 'Operasyon', 'Yönetim', 'Marka & Ürün'];

    /* ---------------- EMPLOYEE VIEW: "Eğitimlerim" ---------------- */
    if (!isManager) {
        const assignedTrainings = trainings.filter(t => myAssignments[t.id]);

        const getStatus = (t: any): 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' => {
            const a = myAssignments[t.id];
            if (!a) return 'NOT_STARTED';
            if (a.status === 'COMPLETED') return 'COMPLETED';
            if (a.status === 'IN_PROGRESS') return 'IN_PROGRESS';
            return 'NOT_STARTED';
        };

        const counts = {
            all: assignedTrainings.length,
            in_progress: assignedTrainings.filter(t => getStatus(t) === 'IN_PROGRESS').length,
            completed: assignedTrainings.filter(t => getStatus(t) === 'COMPLETED').length,
            not_started: assignedTrainings.filter(t => getStatus(t) === 'NOT_STARTED').length,
        };

        const filtered = assignedTrainings.filter(t => {
            if (empTab === 'all') return true;
            const s = getStatus(t);
            if (empTab === 'in_progress') return s === 'IN_PROGRESS';
            if (empTab === 'completed') return s === 'COMPLETED';
            if (empTab === 'not_started') return s === 'NOT_STARTED';
            return true;
        });

        const successPct = counts.all > 0 ? Math.round((counts.completed / counts.all) * 100) : 0;

        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="page-header">
                        <div>
                            <h1>Eğitimlerim</h1>
                            <div className="page-header-sub">Atanmış ve devam eden kurslar</div>
                        </div>
                    </div>

                    <div style={{ padding: 'var(--space-xl)' }}>
                        {/* Top success card */}
                        <div style={{
                            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(229,57,53,0.08)', borderRadius: 16,
                            padding: 20, marginBottom: 20,
                            display: 'flex', flexDirection: 'column', gap: 12,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>
                                        {counts.completed} / {counts.all} kurs başarıyla tamamlandı
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#E53935', lineHeight: 1 }}>%{successPct}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, color: '#E53935' }}>BAŞARI</div>
                                </div>
                            </div>
                            <div style={{ height: 12, background: 'var(--bg-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${successPct}%`,
                                    background: 'linear-gradient(90deg, #E53935, #ef5350)',
                                    boxShadow: '0 0 12px rgba(229,57,53,0.4)',
                                    transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                                }} />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                            {([
                                { key: 'all' as EmpTab, label: 'Tümü', count: counts.all },
                                { key: 'in_progress' as EmpTab, label: 'Devam Eden', count: counts.in_progress },
                                { key: 'completed' as EmpTab, label: 'Tamamlandı', count: counts.completed },
                                { key: 'not_started' as EmpTab, label: 'Başlanmadı', count: counts.not_started },
                            ]).map(tab => {
                                const isActive = empTab === tab.key;
                                return (
                                    <button key={tab.key} onClick={() => setEmpTab(tab.key)} style={{
                                        padding: '10px 18px', borderRadius: 999,
                                        border: isActive ? '2px solid #E53935' : '2px solid var(--border)',
                                        background: isActive ? '#fff' : 'transparent',
                                        color: isActive ? '#E53935' : 'var(--text-secondary)',
                                        fontWeight: isActive ? 700 : 500, fontSize: '0.85rem',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                        boxShadow: isActive ? '0 4px 12px rgba(229,57,53,0.15)' : 'none',
                                        transition: 'all 0.25s ease',
                                    }}>
                                        {tab.label}
                                        <span style={{
                                            background: isActive ? '#E53935' : 'var(--bg-tertiary)',
                                            color: isActive ? '#fff' : 'var(--text-tertiary)',
                                            padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                                        }}>{tab.count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Cards */}
                        {loading ? (
                            <SkeletonCard count={6} />
                        ) : filtered.length === 0 ? (
                            <div className="empty-state">
                                <span className="material-icons-outlined">school</span>
                                <p>{empTab === 'all' ? 'Sana atanmış bir eğitim yok' : 'Bu durumda eğitim bulunamadı'}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                                {filtered.map((t, idx) => {
                                    const a = myAssignments[t.id];
                                    const status = getStatus(t);
                                    const isCompleted = status === 'COMPLETED';
                                    const isInProgress = status === 'IN_PROGRESS';
                                    const contentsCount = t._count?.contents || 1;
                                    const completedSections = isCompleted ? contentsCount : 0;
                                    const pct = isCompleted ? 100 : isInProgress ? 50 : 0;
                                    const hasPdf = true; // current trainings primarily PDF-based

                                    return (
                                        <div key={t.id} style={{
                                            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                            border: '1px solid rgba(229,57,53,0.06)',
                                            borderRadius: 16, padding: 18,
                                            display: 'flex', flexDirection: 'column', gap: 12,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                            transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                                            animation: `cine-fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) ${idx * 0.06}s both`,
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                                        }}>
                                            {/* Pill badges */}
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 999,
                                                    border: '1px solid rgba(139,92,246,0.4)',
                                                    color: '#8b5cf6', fontSize: '0.7rem', fontWeight: 700,
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>eco</span>
                                                    GELİŞİM
                                                </span>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 999,
                                                    background: isCompleted ? 'rgba(34,197,94,0.12)' : isInProgress ? 'rgba(245,158,11,0.12)' : 'rgba(229,57,53,0.12)',
                                                    color: isCompleted ? '#16a34a' : isInProgress ? '#b45309' : '#dc2626',
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                }}>
                                                    {isCompleted ? 'Tamamlandı' : isInProgress ? 'Devam Ediyor' : 'Başlanmadı'}
                                                </span>
                                                {hasPdf && (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 999,
                                                        border: '1px solid rgba(229,57,53,0.35)',
                                                        color: '#E53935', fontSize: '0.7rem', fontWeight: 700,
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    }}>
                                                        <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>picture_as_pdf</span>
                                                        PDF
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.35, margin: 0 }}>
                                                {t.title}
                                            </h3>

                                            {/* Duration pill */}
                                            {t.durationMinutes && (
                                                <span style={{
                                                    alignSelf: 'flex-start',
                                                    padding: '4px 12px', borderRadius: 999,
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.75rem', fontWeight: 600,
                                                }}>{t.durationMinutes} dk</span>
                                            )}

                                            {/* Progress */}
                                            <div>
                                                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                                                    <div style={{
                                                        height: '100%', width: `${pct}%`, borderRadius: 6,
                                                        background: isCompleted ? 'linear-gradient(90deg, #22c55e, #16a34a)' : isInProgress ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'var(--bg-tertiary)',
                                                        boxShadow: isCompleted ? '0 0 10px rgba(34,197,94,0.4)' : isInProgress ? '0 0 10px rgba(245,158,11,0.3)' : 'none',
                                                        transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                                                    }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem' }}>
                                                    <span style={{ color: 'var(--text-tertiary)' }}>{completedSections}/{contentsCount} bölüm tamamlandı</span>
                                                    <span style={{ fontWeight: 700, color: isCompleted ? '#16a34a' : isInProgress ? '#b45309' : 'var(--text-tertiary)' }}>%{pct}</span>
                                                </div>
                                            </div>

                                            {/* Date */}
                                            {(a?.completedAt || a?.dueDate) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>calendar_today</span>
                                                    {a.completedAt ? `Son: ${formatShortDate(a.completedAt)}` : `Bitiş: ${formatShortDate(a.dueDate)}`}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                                <button onClick={() => router.push(`/trainings/${t.id}`)} style={{
                                                    flex: 1, padding: '10px 14px', borderRadius: 10,
                                                    border: isCompleted ? '1.5px solid rgba(34,197,94,0.4)' : 'none',
                                                    background: isCompleted ? 'rgba(34,197,94,0.08)' : 'linear-gradient(135deg, #E53935, #ef5350)',
                                                    color: isCompleted ? '#16a34a' : '#fff',
                                                    fontSize: '0.82rem', fontWeight: 600,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    boxShadow: isCompleted ? 'none' : '0 4px 12px rgba(229,57,53,0.3)',
                                                    transition: 'all 0.25s ease',
                                                }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{isCompleted ? 'visibility' : 'visibility'}</span>
                                                    {isCompleted ? 'Tekrar Görüntüle' : isInProgress ? 'Devam Et' : 'Görüntüle'}
                                                </button>
                                                {t.quiz && (
                                                    <button
                                                        onClick={() => {
                                                            if (isCompleted) {
                                                                router.push(`/trainings/${t.id}?quiz=1`);
                                                            } else {
                                                                showToast('Sınava başlamadan önce tüm bölümleri okumalısınız', 'error');
                                                                router.push(`/trainings/${t.id}`);
                                                            }
                                                        }}
                                                        title={isCompleted ? 'Sınava başla' : 'Tüm bölümleri okuduktan sonra sınava girebilirsin'}
                                                        style={{
                                                            padding: '10px 14px', borderRadius: 10,
                                                            background: isCompleted ? 'rgba(229,57,53,0.12)' : 'rgba(148,163,184,0.12)',
                                                            border: isCompleted ? '1px solid rgba(229,57,53,0.3)' : '1px solid rgba(148,163,184,0.3)',
                                                            color: isCompleted ? '#E53935' : '#94a3b8',
                                                            fontSize: '0.78rem', fontWeight: 700,
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                                        }}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>{isCompleted ? 'quiz' : 'lock'}</span>
                                                        Quiz
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    /* ---------------- MANAGER VIEW (existing catalog design) ---------------- */
    const mgrAssigned = trainings.filter(t => myAssignments[t.id]);
    const mgrVisible = mgrTab === 'assigned' ? mgrAssigned : trainings;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            Eğitim Merkezi <span style={{ fontSize: '1.6rem' }}>📚</span>
                        </h1>
                        <div className="page-header-sub">Zorunlu eğitimlerini tamamla, quizleri çöz ve kendini geliştir.</div>
                    </div>
                    <button onClick={() => setShowCreate(true)} style={{
                        padding: '10px 18px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #E53935, #ec4899)',
                        color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 16px rgba(229,57,53,0.35)',
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>add_circle</span>
                        Eğitim Ekle / Ata
                    </button>
                </div>

                <div style={{ padding: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
                        {([
                            { key: 'all' as ManagerTab, label: 'Sistemdeki Tüm Eğitimler', icon: 'apps', count: trainings.length },
                            { key: 'assigned' as ManagerTab, label: 'Atanan Eğitimler', icon: 'assignment_ind', count: mgrAssigned.length },
                        ]).map(tab => {
                            const isActive = mgrTab === tab.key;
                            return (
                                <button key={tab.key} onClick={() => setMgrTab(tab.key)} style={{
                                    padding: '12px 24px', background: 'transparent', border: 'none',
                                    borderBottom: isActive ? '3px solid #E53935' : '3px solid transparent',
                                    color: isActive ? '#E53935' : 'var(--text-secondary)',
                                    fontWeight: isActive ? 700 : 500, fontSize: '0.88rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: -2,
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{tab.icon}</span>
                                    {tab.label}
                                    <span style={{
                                        background: isActive ? '#E53935' : 'var(--bg-tertiary)',
                                        color: isActive ? '#fff' : 'var(--text-tertiary)',
                                        padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
                                    }}>{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {loading ? (
                        <SkeletonCard count={6} />
                    ) : mgrVisible.length === 0 ? (
                        <div className="empty-state">
                            <span className="material-icons-outlined">school</span>
                            <p>{mgrTab === 'assigned' ? 'Sana atanmış bir eğitim yok' : 'Henüz eğitim eklenmemiş'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                            {mgrVisible.map((t, idx) => {
                                const isMandatory = t.type === 'MANDATORY';
                                const catColor = CATEGORY_COLORS[t.category] || '#64748b';
                                const catGradient = CATEGORY_GRADIENTS[t.category] || 'linear-gradient(135deg, #64748b, #94a3b8)';
                                const imageUrl = getTrainingImage(t);
                                const showInfoNote = mgrTab === 'all';

                                return (
                                    <div key={t.id} style={{
                                        background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                        borderRadius: 16, overflow: 'hidden',
                                        border: '1px solid rgba(229,57,53,0.06)',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                        display: 'flex', flexDirection: 'column',
                                        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                                        animation: `cine-fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) ${idx * 0.06}s both`,
                                    }}>
                                        <div style={{ position: 'relative', height: 160, background: imageUrl ? `url(${imageUrl}) center/cover` : catGradient, overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 100%)' }} />
                                            <div style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 6, background: isMandatory ? '#E53935' : 'rgba(15,23,42,0.85)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                                                {isMandatory ? 'ZORUNLU EĞİTİM' : 'EĞİTİM KATALOĞU'}
                                            </div>
                                            {t.durationMinutes && (
                                                <div style={{ position: 'absolute', bottom: 12, right: 12, padding: '4px 10px', borderRadius: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>schedule</span>
                                                    {t.durationMinutes} dk
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: catColor, marginBottom: 6 }}>{t.category || 'Genel'}</div>
                                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 10, lineHeight: 1.35 }}>{t.title}</h3>
                                            {t.description && (
                                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                                                    {t.description}
                                                </p>
                                            )}
                                            {showInfoNote && (
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, marginBottom: 12 }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '0.95rem', color: '#6366f1', marginTop: 1 }}>info</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                        Atama Durumu sayfasından personellere atayabilirsiniz.
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                                <button onClick={() => router.push(`/trainings/${t.id}/assignments`)} style={{
                                                    padding: '10px 14px', borderRadius: 10, background: 'rgba(14,165,233,0.1)', color: '#0ea5e9',
                                                    border: '1px solid rgba(14,165,233,0.25)', fontSize: '0.82rem', fontWeight: 600,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>group</span>
                                                    Atama Durumu
                                                </button>
                                                <button onClick={() => router.push(`/trainings/${t.id}`)} style={{
                                                    padding: '10px 14px', borderRadius: 10,
                                                    background: 'linear-gradient(135deg, #E53935, #ef5350)',
                                                    color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    boxShadow: '0 4px 12px rgba(229,57,53,0.3)',
                                                }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>visibility</span>
                                                    Görüntüle
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Yeni Eğitim Ekle</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Eğitim Başlığı</label>
                                    <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Eğitim başlığı" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Açıklama</label>
                                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Eğitim açıklaması" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Kategori</label>
                                        <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tür</label>
                                        <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                            <option value="MANDATORY">Zorunlu</option>
                                            <option value="OPTIONAL">İsteğe Bağlı (Katalog)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Süre (dakika)</label>
                                        <input className="form-input" type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} placeholder="45" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Min. Başarı Oranı (%)</label>
                                        <input className="form-input" type="number" min="0" max="100" value={form.minPassRate} onChange={e => setForm({ ...form, minPassRate: e.target.value })} placeholder="70" />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleCreate} disabled={!form.title}>Oluştur</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
