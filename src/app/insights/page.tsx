'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';

type Anomaly = {
    storeId: string;
    storeName: string;
    kpiName: string;
    kpiUnit: string;
    latestPeriod: string;
    prevPeriod: string;
    latestValue: number;
    prevValue: number;
    changePct: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    direction: 'down' | 'up';
    hint: string;
};

type Recommendation = {
    id: string;
    storeId: string;
    storeName: string;
    kpiName: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    changePct: number;
    latestValue: number;
    prevValue: number;
    kpiUnit: string;
    reason: string;
    training: { id: string; title: string; category: string | null; durationMinutes: number | null };
    affectedEmployeeCount: number;
};

const SEVERITY_META = {
    HIGH:   { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)',  border: 'rgba(220, 38, 38, 0.25)', label: 'YÜKSEK',  icon: 'crisis_alert' },
    MEDIUM: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)',  border: 'rgba(217, 119, 6, 0.25)', label: 'ORTA',    icon: 'warning' },
    LOW:    { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.1)',  border: 'rgba(8, 145, 178, 0.25)', label: 'DÜŞÜK',   icon: 'info' },
};

function formatValue(v: number, unit: string): string {
    if (unit === 'TL') {
        if (v >= 1_000_000) return `₺${(v / 1_000_000).toFixed(2)}M`;
        if (v >= 1_000) return `₺${(v / 1_000).toFixed(1)}K`;
        return `₺${v.toLocaleString('tr-TR')}`;
    }
    if (unit === '%') return `%${Math.round(v * 10) / 10}`;
    if (unit === 'Adet' && v < 10) return v.toFixed(2);
    return v.toLocaleString('tr-TR');
}

function formatPeriod(p: string): string {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const [y, m] = p.split('-');
    return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function InsightsPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [anomalySummary, setAnomalySummary] = useState<any>(null);
    const [recSummary, setRecSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
    const [tab, setTab] = useState<'anomalies' | 'recommendations'>('anomalies');

    useEffect(() => { document.title = 'Sporthink | AI İçgörüler'; }, []);

    useEffect(() => {
        if (!session) return;
        Promise.all([
            fetch('/api/insights/anomalies').then(r => r.json()),
            fetch('/api/insights/recommendations').then(r => r.json()),
        ])
            .then(([anomData, recData]) => {
                setAnomalies(anomData.anomalies || []);
                setAnomalySummary(anomData.summary);
                setRecommendations(recData.recommendations || []);
                setRecSummary(recData.summary);
            })
            .catch(() => showToast('İçgörüler yüklenemedi', 'error'))
            .finally(() => setLoading(false));
    }, [session]);

    const applyRecommendation = async (rec: Recommendation) => {
        setApplyingId(rec.id);
        try {
            const res = await fetch('/api/insights/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: rec.storeId, trainingId: rec.training.id, kpiName: rec.kpiName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Hata');
            showToast(data.message || 'Atama tamamlandı', 'success');
            setAppliedIds(new Set([...appliedIds, rec.id]));
        } catch (e: any) {
            showToast(e.message || 'Atama başarısız', 'error');
        } finally {
            setApplyingId(null);
        }
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <Sidebar />
                <main className="main-content">
                    <div style={{ padding: 28 }}>
                        <SkeletonStats count={4} />
                        <div style={{ marginTop: 20 }}><SkeletonCard count={3} /></div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header cine-fadeInUp">
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff',
                            }}>
                                <span className="material-icons-outlined">auto_awesome</span>
                            </span>
                            AI İçgörüler
                            <span style={{
                                padding: '4px 10px', borderRadius: 999,
                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                                letterSpacing: 0.5,
                            }}>YENİ</span>
                        </h1>
                        <p className="page-subtitle">
                            Sistem KPI'larınızı analiz eder, anormalliği tespit eder ve uygun eğitimi otomatik önerir.
                        </p>
                    </div>
                </div>

                <div style={{ padding: '0 28px 32px' }}>
                    {/* Summary cards */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 14, marginBottom: 22,
                    }}>
                        <SummaryCard
                            icon="crisis_alert" color="#dc2626" bg="#fee2e2"
                            label="Yüksek Risk" value={anomalySummary?.high || 0}
                            subText="Acil müdahale gerekli"
                        />
                        <SummaryCard
                            icon="warning" color="#d97706" bg="#fef3c7"
                            label="Orta Risk" value={anomalySummary?.medium || 0}
                            subText="Yakın takip gerekli"
                        />
                        <SummaryCard
                            icon="store" color="#7c3aed" bg="#ede9fe"
                            label="Etkilenen Mağaza" value={anomalySummary?.affectedStores || 0}
                            subText={`${anomalySummary?.total || 0} anomali tespit edildi`}
                        />
                        <SummaryCard
                            icon="auto_awesome" color="#16a34a" bg="#dcfce7"
                            label="AI Öneri" value={recSummary?.total || 0}
                            subText="Otomatik eğitim önerileri"
                        />
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex', gap: 6, padding: 4,
                        background: 'rgba(0,0,0,0.04)',
                        borderRadius: 12, marginBottom: 16,
                        maxWidth: 500,
                    }}>
                        <button
                            onClick={() => setTab('anomalies')}
                            style={{
                                flex: 1, padding: '10px 16px',
                                background: tab === 'anomalies' ? '#fff' : 'transparent',
                                color: tab === 'anomalies' ? '#dc2626' : 'var(--text-secondary)',
                                border: 'none', borderRadius: 8,
                                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: tab === 'anomalies' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>trending_down</span>
                            Anomaliler ({anomalies.length})
                        </button>
                        <button
                            onClick={() => setTab('recommendations')}
                            style={{
                                flex: 1, padding: '10px 16px',
                                background: tab === 'recommendations' ? '#fff' : 'transparent',
                                color: tab === 'recommendations' ? '#7c3aed' : 'var(--text-secondary)',
                                border: 'none', borderRadius: 8,
                                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: tab === 'recommendations' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>school</span>
                            Eğitim Önerileri ({recommendations.length})
                        </button>
                    </div>

                    {/* Anomaly list */}
                    {tab === 'anomalies' && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {anomalies.length === 0 ? (
                                <EmptyState
                                    icon="check_circle"
                                    title="Anomali tespit edilmedi"
                                    message="Tüm mağazalarınız stabil performans gösteriyor. 👍"
                                    color="#16a34a"
                                />
                            ) : anomalies.map((a, idx) => {
                                const sev = SEVERITY_META[a.severity];
                                return (
                                    <div key={idx} className="cine-fadeInUp" style={{
                                        background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                        border: `1px solid ${sev.border}`,
                                        borderLeftWidth: 4, borderRadius: 14,
                                        padding: 18, display: 'flex', gap: 16, alignItems: 'center',
                                        animationDelay: `${idx * 0.04}s`,
                                    }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: sev.bg, color: sev.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <span className="material-icons-outlined">{sev.icon}</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                <strong style={{ fontSize: '0.95rem' }}>{a.storeName}</strong>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 6,
                                                    background: sev.bg, color: sev.color,
                                                    fontSize: '0.65rem', fontWeight: 800, letterSpacing: 0.5,
                                                }}>{sev.label} RİSK</span>
                                            </div>
                                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                                                <strong>{a.kpiName}</strong> KPI'sı{' '}
                                                <span style={{ color: sev.color, fontWeight: 700 }}>
                                                    {a.changePct > 0 ? '↑' : '↓'} %{Math.abs(a.changePct).toFixed(1)}
                                                </span>{' '}
                                                {a.direction === 'down' ? 'düştü' : 'yükseldi (kötü)'}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                                {formatPeriod(a.prevPeriod)}: {formatValue(a.prevValue, a.kpiUnit)} →{' '}
                                                {formatPeriod(a.latestPeriod)}: {formatValue(a.latestValue, a.kpiUnit)}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: sev.color }}>
                                                {a.changePct > 0 ? '+' : ''}{a.changePct.toFixed(1)}%
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                değişim
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Recommendation list */}
                    {tab === 'recommendations' && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {recommendations.length === 0 ? (
                                <EmptyState
                                    icon="psychology"
                                    title="Şu an aktif öneri yok"
                                    message="Sistem KPI'larınızı izliyor. Anomali tespit edilirse otomatik eğitim önerileri burada listelenir."
                                    color="#8b5cf6"
                                />
                            ) : recommendations.map((rec, idx) => {
                                const sev = SEVERITY_META[rec.severity];
                                const applied = appliedIds.has(rec.id);
                                const applying = applyingId === rec.id;
                                return (
                                    <div key={rec.id} className="cine-fadeInUp" style={{
                                        background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: 14, padding: 18,
                                        animationDelay: `${idx * 0.04}s`,
                                    }}>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: 12,
                                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                                color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <span className="material-icons-outlined">school</span>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                                    <strong style={{ fontSize: '0.95rem' }}>{rec.storeName}</strong>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 6,
                                                        background: sev.bg, color: sev.color,
                                                        fontSize: '0.65rem', fontWeight: 800, letterSpacing: 0.5,
                                                    }}>{sev.label}</span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                                                    📊 <strong>{rec.kpiName}</strong>{' '}
                                                    <span style={{ color: sev.color, fontWeight: 700 }}>
                                                        {rec.changePct > 0 ? '↑' : '↓'} %{Math.abs(rec.changePct).toFixed(1)}
                                                    </span>{' '}
                                                    — {rec.reason}
                                                </div>
                                                <div style={{
                                                    padding: 12, borderRadius: 10,
                                                    background: 'rgba(139, 92, 246, 0.06)',
                                                    border: '1px solid rgba(139, 92, 246, 0.15)',
                                                    marginBottom: 12,
                                                }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                                        🎯 Önerilen Eğitim
                                                    </div>
                                                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                                        {rec.training.title}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                        <span>📂 {rec.training.category || 'Genel'}</span>
                                                        {rec.training.durationMinutes && <span>⏱️ {rec.training.durationMinutes} dk</span>}
                                                        <span>👥 {rec.affectedEmployeeCount} çalışan</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => applyRecommendation(rec)}
                                                    disabled={applied || applying}
                                                    style={{
                                                        padding: '10px 18px',
                                                        background: applied ? 'rgba(34, 197, 94, 0.15)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                                        color: applied ? '#16a34a' : '#fff',
                                                        border: applied ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                                                        borderRadius: 10,
                                                        fontSize: '0.85rem', fontWeight: 700,
                                                        cursor: applied || applying ? 'default' : 'pointer',
                                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                                        boxShadow: applied ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.35)',
                                                    }}
                                                >
                                                    <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>
                                                        {applied ? 'check_circle' : applying ? 'hourglass_top' : 'auto_awesome'}
                                                    </span>
                                                    {applied ? 'Atama Yapıldı' : applying ? 'Atanıyor...' : `${rec.affectedEmployeeCount} Çalışana Otomatik Ata`}
                                                </button>
                                            </div>
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

function SummaryCard({ icon, color, bg, label, value, subText }: any) {
    return (
        <div className="cine-fadeInUp" style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)', borderRadius: 14,
            padding: 16, display: 'flex', gap: 12, alignItems: 'center',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: bg, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <span className="material-icons-outlined">{icon}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{subText}</div>
            </div>
        </div>
    );
}

function EmptyState({ icon, title, message, color }: any) {
    return (
        <div style={{
            padding: '60px 20px', textAlign: 'center',
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)', borderRadius: 14,
        }}>
            <span className="material-icons-outlined" style={{ fontSize: '3.5rem', color, opacity: 0.8 }}>{icon}</span>
            <h3 style={{ margin: '12px 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
            <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>{message}</p>
        </div>
    );
}
