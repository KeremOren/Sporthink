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
    const [resultModal, setResultModal] = useState<any>(null);
    const [severityFilter, setSeverityFilter] = useState<'all' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [hideApplied, setHideApplied] = useState(false);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    // Filtreler değişince sayfa 1'e dön
    useEffect(() => { setPage(1); }, [severityFilter, searchQuery, hideApplied, tab]);

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
            // Atama sonucu modal'ı aç — kimin atandığını göster
            setResultModal({
                ...data,
                trainingTitle: rec.training.title,
                storeName: rec.storeName,
                kpiName: rec.kpiName,
            });
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

                    {/* ==================== FILTER BAR ==================== */}
                    {(() => {
                        const sourceList: any[] = tab === 'anomalies' ? anomalies : recommendations;
                        const severityCounts = {
                            all: sourceList.length,
                            HIGH: sourceList.filter((x: any) => x.severity === 'HIGH').length,
                            MEDIUM: sourceList.filter((x: any) => x.severity === 'MEDIUM').length,
                            LOW: sourceList.filter((x: any) => x.severity === 'LOW').length,
                        };
                        const sevChips: Array<{ key: 'all' | 'HIGH' | 'MEDIUM' | 'LOW'; label: string; color: string; bg: string }> = [
                            { key: 'all', label: 'Tümü', color: '#475569', bg: 'rgba(100,116,139,0.12)' },
                            { key: 'HIGH', label: 'Yüksek', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
                            { key: 'MEDIUM', label: 'Orta', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
                            { key: 'LOW', label: 'Düşük', color: '#0891b2', bg: 'rgba(8,145,178,0.12)' },
                        ];
                        return (
                            <div style={{
                                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                border: '1px solid var(--card-border)', borderRadius: 14,
                                padding: 14, marginBottom: 14,
                                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
                                position: 'sticky', top: 12, zIndex: 10,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                            }}>
                                {/* Severity chips */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {sevChips.map(c => {
                                        const active = severityFilter === c.key;
                                        const count = severityCounts[c.key];
                                        return (
                                            <button
                                                key={c.key}
                                                onClick={() => setSeverityFilter(c.key)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: 999,
                                                    background: active ? c.color : c.bg,
                                                    color: active ? '#fff' : c.color,
                                                    border: `1px solid ${active ? c.color : 'transparent'}`,
                                                    fontSize: '0.78rem', fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: active ? `0 4px 12px ${c.color}55` : 'none',
                                                }}
                                            >
                                                {c.label}
                                                <span style={{
                                                    padding: '0 6px', borderRadius: 999,
                                                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                                                    fontSize: '0.7rem', fontWeight: 800,
                                                }}>{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Search */}
                                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                                    <span className="material-icons-outlined" style={{
                                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--text-tertiary)', fontSize: '1rem', pointerEvents: 'none',
                                    }}>search</span>
                                    <input
                                        className="form-input"
                                        style={{ paddingLeft: 34, paddingRight: searchQuery ? 30 : 10, height: 36, fontSize: '0.83rem' }}
                                        placeholder="Mağaza veya KPI ara..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} style={{
                                            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-tertiary)', padding: 2,
                                        }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>close</span>
                                        </button>
                                    )}
                                </div>

                                {/* Hide applied toggle (only for recommendations) */}
                                {tab === 'recommendations' && (
                                    <label style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '6px 12px', borderRadius: 8,
                                        background: hideApplied ? 'rgba(34,197,94,0.1)' : 'transparent',
                                        border: `1px solid ${hideApplied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                        color: hideApplied ? '#16a34a' : 'var(--text-secondary)',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={hideApplied}
                                            onChange={e => setHideApplied(e.target.checked)}
                                            style={{ margin: 0 }}
                                        />
                                        Atananları gizle
                                    </label>
                                )}
                            </div>
                        );
                    })()}

                    {/* Anomaly list */}
                    {tab === 'anomalies' && (() => {
                        const q = searchQuery.trim().toLowerCase();
                        const filtered = anomalies.filter(a => {
                            if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
                            if (q) {
                                const hay = `${a.storeName} ${a.kpiName}`.toLowerCase();
                                if (!hay.includes(q)) return false;
                            }
                            return true;
                        });
                        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                        const currentPage = Math.min(page, totalPages);
                        const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

                        return (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {anomalies.length === 0 ? (
                                <EmptyState
                                    icon="check_circle"
                                    title="Anomali tespit edilmedi"
                                    message="Tüm mağazalarınız stabil performans gösteriyor. 👍"
                                    color="#16a34a"
                                />
                            ) : filtered.length === 0 ? (
                                <EmptyState
                                    icon="search_off"
                                    title="Sonuç yok"
                                    message="Filtreyi sıfırlayıp tekrar dene."
                                    color="#64748b"
                                />
                            ) : (<>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    {filtered.length} sonuç • Sayfa {currentPage} / {totalPages}
                                </div>
                                {paged.map((a, idx) => {
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
                                <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setPage} />
                            </>)}
                        </div>
                        );
                    })()}

                    {/* Recommendation list */}
                    {tab === 'recommendations' && (() => {
                        const q = searchQuery.trim().toLowerCase();
                        const filtered = recommendations.filter(rec => {
                            if (severityFilter !== 'all' && rec.severity !== severityFilter) return false;
                            if (hideApplied && appliedIds.has(rec.id)) return false;
                            if (q) {
                                const hay = `${rec.storeName} ${rec.kpiName} ${rec.training.title}`.toLowerCase();
                                if (!hay.includes(q)) return false;
                            }
                            return true;
                        });
                        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                        const currentPage = Math.min(page, totalPages);
                        const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

                        return (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {recommendations.length === 0 ? (
                                <EmptyState
                                    icon="psychology"
                                    title="Şu an aktif öneri yok"
                                    message="Sistem KPI'larınızı izliyor. Anomali tespit edilirse otomatik eğitim önerileri burada listelenir."
                                    color="#8b5cf6"
                                />
                            ) : filtered.length === 0 ? (
                                <EmptyState
                                    icon="search_off"
                                    title="Sonuç yok"
                                    message="Filtreyi sıfırlayıp tekrar dene."
                                    color="#64748b"
                                />
                            ) : (<>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    {filtered.length} sonuç • Sayfa {currentPage} / {totalPages}
                                </div>
                                {paged.map((rec, idx) => {
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
                                <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setPage} />
                            </>)}
                        </div>
                        );
                    })()}
                </div>

                {/* Atama Sonucu Modal */}
                {resultModal && (
                    <AssignmentResultModal data={resultModal} onClose={() => setResultModal(null)} />
                )}
            </main>
        </div>
    );
}

// ==================== Atama Sonucu Modal ====================
function AssignmentResultModal({ data, onClose }: { data: any; onClose: () => void }) {
    const skillLabels: Record<string, { label: string; color: string; icon: string }> = {
        empati: { label: 'Empati', color: '#ec4899', icon: 'favorite' },
        bilgi: { label: 'Ürün Bilgisi', color: '#3b82f6', icon: 'school' },
        capraz: { label: 'Çapraz Satış', color: '#8b5cf6', icon: 'sync_alt' },
        kapanis: { label: 'Kapanış', color: '#22c55e', icon: 'flag' },
    };
    const skill = data.targetSkill ? skillLabels[data.targetSkill] : null;
    const assigned = data.targetedUsers || [];
    const skippedAlreadyAssigned = data.skippedUsers || [];

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
                overflowY: 'auto',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    color: '#1f2937',
                    borderRadius: 20,
                    maxWidth: 640,
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '22px 24px',
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff', position: 'relative',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 14, right: 14,
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.25)',
                            color: '#fff', border: 'none',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>close</span>
                    </button>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.85, marginBottom: 4 }}>
                        AI Önerisi Uygulandı
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 4 }}>
                        {data.trainingTitle}
                    </div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                        📍 {data.storeName} · 📊 {data.kpiName}
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#16a34a', fontWeight: 700, letterSpacing: 0.5 }}>Atandı</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{data.created}</div>
                        </div>
                        <div style={{ padding: 12, background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#d97706', fontWeight: 700, letterSpacing: 0.5 }}>Zaten Vardı</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', lineHeight: 1 }}>{data.skipped}</div>
                        </div>
                        <div style={{ padding: 12, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#2563eb', fontWeight: 700, letterSpacing: 0.5 }}>Toplam Personel</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2563eb', lineHeight: 1 }}>{data.totalEmployees}</div>
                        </div>
                    </div>

                    {/* Targeting explanation */}
                    <div style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        background: '#faf5ff',
                        border: '1px solid #e9d5ff',
                        borderRadius: 10,
                        fontSize: '0.8rem',
                        color: '#6b21a8',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>psychology</span>
                        <div>
                            <strong>Hedefleme:</strong> {skill ? `${skill.label} becerisi` : 'Genel performans'} ortalaması <strong>%{data.threshold || 75}'in altında</strong> olan çalışanlar seçildi.
                        </div>
                    </div>
                </div>

                {/* Assigned users list */}
                <div style={{ padding: 20 }}>
                    {assigned.length === 0 ? (
                        <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: 6, opacity: 0.5 }}>check_circle</span>
                            <div style={{ fontWeight: 600 }}>Bu mağazada hedef kitleye uyan çalışan bulunamadı.</div>
                            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Hepsi yeterli performansta veya zaten atanmış.</div>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                fontSize: '0.78rem', fontWeight: 700, color: '#1f2937',
                                marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem', color: '#16a34a' }}>group_add</span>
                                Eğitim Atanan Çalışanlar ({assigned.length})
                            </div>
                            <div style={{ display: 'grid', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                                {assigned.map((u: any) => (
                                    <div key={u.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '8px 12px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                    }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                                        }}>
                                            {u.firstName?.[0]}{u.lastName?.[0]}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>
                                                {u.firstName} {u.lastName}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                {u.reason === 'NO_DATA'
                                                    ? '🆕 Hiç simülasyon yapmamış'
                                                    : `📉 ${skill?.label || 'Skor'} ortalaması: ${u.relevantScore}/100`}
                                            </div>
                                        </div>
                                        {u.reason === 'LOW_SKILL' && u.relevantScore != null && (
                                            <div style={{
                                                padding: '3px 8px',
                                                background: '#fee2e2',
                                                color: '#dc2626',
                                                borderRadius: 999,
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                            }}>
                                                {u.relevantScore} / 100
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Skipped users */}
                    {skippedAlreadyAssigned.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                            <div style={{
                                fontSize: '0.78rem', fontWeight: 700, color: '#64748b',
                                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>info</span>
                                Zaten Atanmış Olanlar ({skippedAlreadyAssigned.length})
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                                {skippedAlreadyAssigned.map((u: any) => `${u.firstName} ${u.lastName}`).join(', ')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 20px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 18px',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff', border: 'none',
                            borderRadius: 8,
                            fontSize: '0.85rem', fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                        }}
                    >
                        Tamam
                    </button>
                </div>
            </div>
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

function Pagination({ currentPage, totalPages, onChange }: { currentPage: number; totalPages: number; onChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
            marginTop: 12, padding: '12px 16px',
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)', borderRadius: 12,
        }}>
            <button
                onClick={() => onChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.82rem', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
            >
                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
                Önceki
            </button>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0 12px' }}>
                Sayfa <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> / {totalPages}
            </div>
            <button
                onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.82rem', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
            >
                Sonraki
                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
            </button>
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
