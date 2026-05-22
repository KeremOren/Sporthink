'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonCard } from '@/components/ui/Skeleton';

const CATEGORIES = [
    { key: 'MUSTERI_KARSILAMA', label: 'Müşteri Karşılama', icon: 'waving_hand', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { key: 'URUN_ONERME', label: 'Ürün Önerme', icon: 'inventory_2', color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    { key: 'ITIRAZ', label: 'İtiraz Karşılama', icon: 'shield', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { key: 'EK_SATIS', label: 'Ek Satış', icon: 'add_shopping_cart', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    { key: 'IADE_SIKAYET', label: 'İade / Şikayet', icon: 'reply', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
];

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string }> = {
    EASY: { label: 'Kolay', color: '#16a34a', bg: 'rgba(34, 197, 94, 0.15)' },
    MEDIUM: { label: 'Orta', color: '#d97706', bg: 'rgba(245, 158, 11, 0.15)' },
    HARD: { label: 'Zor', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.15)' },
};

const BADGE_META: Record<string, { label: string; icon: string; color: string }> = {
    ALTIN_SATICI: { label: 'Altın Satıcı', icon: 'workspace_premium', color: '#f59e0b' },
    EMPATI_USTASI: { label: 'Empati Ustası', icon: 'favorite', color: '#ec4899' },
    CAPRAZ_SATIS_USTASI: { label: 'Çapraz Satış Ustası', icon: 'sync_alt', color: '#8b5cf6' },
    KAPANIS_USTASI: { label: 'Kapanış Ustası', icon: 'flag', color: '#22c55e' },
    URUN_UZMANI: { label: 'Ürün Uzmanı', icon: 'school', color: '#3b82f6' },
};

type Scenario = {
    id: string;
    category: string;
    title: string;
    description: string | null;
    difficulty: string;
    xpReward: number;
    myBest: number | null;
    myBadge: string | null;
    completed: boolean;
};

type RecentAttempt = {
    id: string;
    scenarioTitle: string;
    category: string;
    difficulty: string;
    score: number;
    xpEarned: number;
    badge: string | null;
    empatiScore: number;
    bilgiScore: number;
    caprazSatisScore: number;
    kapanisScore: number;
    completedAt: string;
};

type SimData = {
    scenarios: Scenario[];
    recent: RecentAttempt[];
    stats: {
        totalXP: number;
        level: number;
        xpInLevel: number;
        xpToNext: number;
        completedCount: number;
        totalScenarios: number;
        totalAttempts: number;
    };
};

export default function SimulationsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { showToast } = useToast();
    const [data, setData] = useState<SimData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeCat, setActiveCat] = useState<string>(CATEGORIES[1].key); // Ürün Önerme default (like reference)
    const [confirmClear, setConfirmClear] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => { document.title = 'Sporthink | Satış Simülasyonu'; }, []);

    useEffect(() => {
        if (!session) return;
        fetch('/api/simulations')
            .then(r => r.json())
            .then(setData)
            .catch(() => showToast('Simülasyonlar yüklenemedi', 'error'))
            .finally(() => setLoading(false));
    }, [session]);

    const countsByCat = useMemo(() => {
        const map: Record<string, { total: number; completed: number }> = {};
        CATEGORIES.forEach(c => { map[c.key] = { total: 0, completed: 0 }; });
        data?.scenarios.forEach(s => {
            if (!map[s.category]) map[s.category] = { total: 0, completed: 0 };
            map[s.category].total++;
            if (s.completed) map[s.category].completed++;
        });
        return map;
    }, [data]);

    const filteredScenarios = useMemo(() =>
        data?.scenarios.filter(s => s.category === activeCat) || [],
        [data, activeCat]
    );

    const refresh = () => {
        fetch('/api/simulations')
            .then(r => r.json())
            .then(setData)
            .catch(() => {});
    };

    const handleClearAll = async () => {
        setClearing(true);
        try {
            const res = await fetch('/api/simulations', { method: 'DELETE' });
            if (!res.ok) throw new Error();
            const result = await res.json();
            showToast(`${result.deleted} kayıt silindi`, 'success');
            setConfirmClear(false);
            refresh();
        } catch {
            showToast('Silme işlemi başarısız oldu', 'error');
        }
        setClearing(false);
    };

    const handleDeleteOne = async (attemptId: string) => {
        try {
            const res = await fetch(`/api/simulations?attemptId=${attemptId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            showToast('Kayıt silindi', 'success');
            refresh();
        } catch {
            showToast('Silinemedi', 'error');
        }
    };

    const activeCatMeta = CATEGORIES.find(c => c.key === activeCat)!;
    const stats = data?.stats;

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header cine-fadeInUp" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            Satış Simülasyonu <span style={{ fontSize: '1.5rem' }}>🎯</span>
                        </h1>
                        <p className="page-subtitle">Gerçek müşteri senaryolarında pratik yap, satış becerilerini geliştir.</p>
                    </div>
                    {stats && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #E53935, #c62828)',
                            color: '#fff',
                            borderRadius: 999,
                            fontSize: '0.95rem', fontWeight: 700,
                            boxShadow: '0 6px 18px rgba(229, 57, 53, 0.35)',
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>stars</span>
                            {stats.totalXP} XP
                        </div>
                    )}
                </div>

                {/* Main grid */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '300px 1fr',
                    gap: 20, alignItems: 'flex-start',
                }}>
                    {/* Categories Sidebar */}
                    <div className="cine-fadeInUp" style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 16, padding: 16,
                        position: 'sticky', top: 20,
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700,
                            marginBottom: 12, paddingBottom: 12,
                            borderBottom: '1px solid var(--card-border)',
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1.15rem', color: 'var(--text-tertiary)' }}>category</span>
                            Kategoriler
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {CATEGORIES.map(cat => {
                                const isActive = activeCat === cat.key;
                                const counts = countsByCat[cat.key] || { total: 0, completed: 0 };
                                return (
                                    <button
                                        key={cat.key}
                                        onClick={() => setActiveCat(cat.key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 12px',
                                            background: isActive ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                                            border: isActive ? `2px solid ${cat.color}` : '2px solid transparent',
                                            borderRadius: 12,
                                            cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{
                                            width: 42, height: 42, borderRadius: 12,
                                            background: cat.gradient,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', flexShrink: 0,
                                            boxShadow: `0 4px 12px ${cat.color}40`,
                                        }}>
                                            <span className="material-icons-outlined">{cat.icon}</span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                {counts.total} senaryo
                                            </div>
                                        </div>
                                        <div style={{
                                            minWidth: 28, height: 28, borderRadius: '50%',
                                            background: isActive ? cat.color : 'rgba(0,0,0,0.06)',
                                            color: isActive ? '#fff' : 'var(--text-tertiary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 700,
                                            padding: '0 8px',
                                        }}>{counts.total}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scenarios List */}
                    <div>
                        {/* Category header banner */}
                        <div className="cine-fadeInUp" style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px 18px', marginBottom: 14,
                            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                            border: '1px solid var(--card-border)', borderRadius: 14,
                            borderLeft: `4px solid ${activeCatMeta.color}`,
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: activeCatMeta.gradient,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff',
                            }}>
                                <span className="material-icons-outlined">{activeCatMeta.icon}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {activeCatMeta.label} Senaryoları
                                </h2>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {filteredScenarios.length} senaryo · {(countsByCat[activeCat]?.completed || 0)} tamamlandı
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : filteredScenarios.length === 0 ? (
                            <div style={{
                                padding: 50, textAlign: 'center',
                                background: 'linear-gradient(135deg, rgba(229, 57, 53, 0.04), rgba(229, 57, 53, 0.01))',
                                borderRadius: 16,
                                border: `2px dashed ${activeCatMeta.color}40`,
                            }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%',
                                    background: activeCatMeta.gradient,
                                    margin: '0 auto 16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 8px 24px ${activeCatMeta.color}40`,
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '2.4rem', color: '#fff' }}>{activeCatMeta.icon}</span>
                                </div>
                                <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {activeCatMeta.label} kategorisinde senaryo yakında!
                                </h3>
                                <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                                    Bu kategoride henüz senaryo eklenmemiş. Sistem yöneticin senaryolar ekledikçe burada görünecek.
                                    Bu sırada diğer kategorileri keşfedebilirsin!
                                </p>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {CATEGORIES.filter(c => c.key !== activeCat && (data?.scenarios || []).some(s => s.category === c.key)).slice(0, 3).map(c => (
                                        <button
                                            key={c.key}
                                            onClick={() => setActiveCat(c.key)}
                                            style={{
                                                padding: '8px 14px',
                                                background: c.gradient,
                                                color: '#fff', border: 'none', borderRadius: 10,
                                                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                boxShadow: `0 4px 12px ${c.color}40`,
                                            }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{c.icon}</span>
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {filteredScenarios.map((s, idx) => (
                                    <ScenarioRow
                                        key={s.id}
                                        scenario={s}
                                        catMeta={activeCatMeta}
                                        onPlay={() => router.push(`/simulations/${s.id}`)}
                                        delay={idx * 40}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Recent Results */}
                        <div className="cine-fadeInUp" style={{ marginTop: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                                <h2 style={{
                                    fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)',
                                    margin: 0, display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <span className="material-icons-outlined" style={{ color: '#E53935' }}>history</span>
                                    Son Sonuçlarım
                                    {data?.recent && data.recent.length > 0 && (
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                            ({data.recent.length})
                                        </span>
                                    )}
                                </h2>
                                {data?.recent && data.recent.length > 0 && (
                                    <button
                                        onClick={() => setConfirmClear(true)}
                                        style={{
                                            padding: '7px 14px',
                                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 8,
                                            fontSize: '0.8rem', fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 3px 10px rgba(239,68,68,0.3)',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 5px 14px rgba(239,68,68,0.45)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 3px 10px rgba(239,68,68,0.3)';
                                        }}
                                        title="Tüm geçmişi temizle"
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>delete_sweep</span>
                                        Geçmişi Temizle
                                    </button>
                                )}
                            </div>
                            {(!data?.recent || data.recent.length === 0) ? (
                                <div style={{
                                    padding: '32px 22px', textAlign: 'center',
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(139, 92, 246, 0.02))',
                                    borderRadius: 14,
                                    border: '1px dashed rgba(99, 102, 241, 0.25)',
                                }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        margin: '0 auto 12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 6px 16px rgba(99, 102, 241, 0.35)',
                                    }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '1.6rem', color: '#fff' }}>rocket_launch</span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                        İlk simülasyonun seni bekliyor!
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', maxWidth: 420, margin: '0 auto 12px' }}>
                                        Yukarıdan bir kategori ve senaryo seç. Her tamamladığın simülasyonla <strong style={{ color: '#f59e0b' }}>XP kazan</strong>, rozet topla, becerini geliştir.
                                    </div>
                                    {(data?.scenarios || []).length > 0 && (
                                        <button
                                            onClick={() => {
                                                const first = (data!.scenarios || [])[0];
                                                if (first) router.push(`/simulations/${first.id}`);
                                            }}
                                            style={{
                                                padding: '10px 20px',
                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                color: '#fff', border: 'none', borderRadius: 10,
                                                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.35)',
                                            }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>play_circle</span>
                                            Hemen Başla
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {data.recent.slice(0, 5).map(r => (
                                        <RecentRow
                                            key={r.id}
                                            attempt={r}
                                            onDelete={() => handleDeleteOne(r.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Geçmiş Temizle Onay Modal */}
                {confirmClear && (
                    <div
                        onClick={() => !clearing && setConfirmClear(false)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 1000,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 20,
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'var(--card-bg)',
                                borderRadius: 16,
                                padding: 24,
                                maxWidth: 420,
                                width: '100%',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                border: '1px solid var(--card-border)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'rgba(239,68,68,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#ef4444',
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '1.4rem' }}>warning</span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Geçmişi temizlemek istediğine emin misin?
                                </h3>
                            </div>
                            <p style={{ margin: '0 0 18px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Tüm simülasyon denemen <strong>({data?.recent.length || 0} kayıt)</strong> kalıcı olarak silinecek.
                                Kazandığın <strong style={{ color: '#f59e0b' }}>{data?.stats.totalXP || 0} XP</strong> ve rozetler de geri alınacak.
                                Bu işlem <strong>geri alınamaz</strong>.
                            </p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setConfirmClear(false)}
                                    disabled={clearing}
                                    style={{
                                        padding: '9px 16px',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: 8,
                                        fontSize: '0.85rem', fontWeight: 600,
                                        cursor: clearing ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleClearAll}
                                    disabled={clearing}
                                    style={{
                                        padding: '9px 16px',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: '0.85rem', fontWeight: 700,
                                        cursor: clearing ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
                                        opacity: clearing ? 0.7 : 1,
                                    }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>delete_sweep</span>
                                    {clearing ? 'Siliniyor...' : 'Evet, Hepsini Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function ScenarioRow({ scenario, catMeta, onPlay, delay }: { scenario: Scenario; catMeta: any; onPlay: () => void; delay: number }) {
    const diff = DIFFICULTY_META[scenario.difficulty] || DIFFICULTY_META.MEDIUM;
    const badge = scenario.myBadge ? BADGE_META[scenario.myBadge] : null;

    return (
        <div
            className="cine-fadeInUp"
            style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 18px',
                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--card-border)', borderRadius: 14,
                borderLeft: `4px solid ${catMeta.color}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                animationDelay: `${delay}ms`,
            }}
            onClick={onPlay}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = catMeta.color;
                e.currentTarget.style.borderLeftColor = catMeta.color;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.borderLeftColor = catMeta.color;
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <h3 style={{
                        margin: 0, fontSize: '1rem', fontWeight: 700,
                        color: 'var(--text-primary)', lineHeight: 1.3,
                    }}>{scenario.title}</h3>
                    <span style={{
                        padding: '2px 10px', borderRadius: 999,
                        background: diff.bg, color: diff.color,
                        fontSize: '0.7rem', fontWeight: 700,
                    }}>{diff.label}</span>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 10px', borderRadius: 999,
                        background: 'rgba(245, 158, 11, 0.15)', color: '#d97706',
                        fontSize: '0.7rem', fontWeight: 700,
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>stars</span>
                        {scenario.xpReward} XP
                    </span>
                    {scenario.completed && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 10px', borderRadius: 999,
                            background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a',
                            fontSize: '0.7rem', fontWeight: 700,
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>check_circle</span>
                            En İyi: {scenario.myBest}
                        </span>
                    )}
                    {badge && (
                        <span title={badge.label} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 10px', borderRadius: 999,
                            background: `${badge.color}20`, color: badge.color,
                            fontSize: '0.7rem', fontWeight: 700,
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>{badge.icon}</span>
                            {badge.label}
                        </span>
                    )}
                </div>
                {scenario.description && (
                    <p style={{
                        margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)',
                        lineHeight: 1.4,
                    }}>{scenario.description}</p>
                )}
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onPlay(); }}
                title={scenario.completed ? 'Tekrar Oyna' : 'Başla'}
                style={{
                    width: 52, height: 52, flexShrink: 0,
                    borderRadius: '50%',
                    background: catMeta.gradient,
                    color: '#fff', border: 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 6px 16px ${catMeta.color}50`,
                    transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
                <span className="material-icons-outlined" style={{ fontSize: '1.6rem' }}>
                    {scenario.completed ? 'replay' : 'play_arrow'}
                </span>
            </button>
        </div>
    );
}

function RecentRow({ attempt, onDelete }: { attempt: RecentAttempt; onDelete: () => void }) {
    const cat = CATEGORIES.find(c => c.key === attempt.category);
    const diff = DIFFICULTY_META[attempt.difficulty] || DIFFICULTY_META.MEDIUM;
    const badge = attempt.badge ? BADGE_META[attempt.badge] : null;
    const date = new Date(attempt.completedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    const [hovered, setHovered] = useState(false);

    const scoreColor = attempt.score >= 80 ? '#16a34a' : attempt.score >= 60 ? '#d97706' : '#dc2626';

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 14, alignItems: 'center',
            padding: '10px 14px',
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            borderRadius: 10,
            transition: 'all 0.2s ease',
            border: hovered ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--card-border)',
            boxShadow: hovered ? '0 2px 8px rgba(239,68,68,0.08)' : 'none',
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: cat?.gradient || '#E53935',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
            }}>
                <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>{cat?.icon || 'theater_comedy'}</span>
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attempt.scenarioTitle}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {cat?.label} · {diff.label} · {date}
                </div>
            </div>
            {badge && (
                <div title={badge.label} style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '3px 8px', borderRadius: 999,
                    background: `${badge.color}20`, color: badge.color,
                    fontSize: '0.68rem', fontWeight: 700,
                }}>
                    <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>{badge.icon}</span>
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{attempt.score}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>puan</div>
                </div>
                <div style={{
                    padding: '3px 8px', borderRadius: 999,
                    background: 'rgba(245, 158, 11, 0.15)', color: '#d97706',
                    fontSize: '0.68rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 2,
                }}>
                    <span className="material-icons-outlined" style={{ fontSize: '0.8rem' }}>stars</span>
                    +{attempt.xpEarned}
                </div>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Bu kaydı silmek istediğine emin misin? Kazandığın XP geri alınacak.')) {
                        onDelete();
                    }
                }}
                title="Bu kaydı sil"
                style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: hovered ? '#ef4444' : 'rgba(239,68,68,0.12)',
                    color: hovered ? '#fff' : '#ef4444',
                    border: hovered ? '1px solid #ef4444' : '1px solid rgba(239,68,68,0.3)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                }}
            >
                <span className="material-icons-outlined" style={{ fontSize: '1.15rem' }}>delete</span>
            </button>
        </div>
    );
}
