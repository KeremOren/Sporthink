'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';
import { Chart, LineElement, PointElement, LineController, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';

Chart.register(LineElement, PointElement, LineController, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend, Filler);

// Format large numbers
function fmt(val: number, unit: string) {
    if (unit === 'TL') return val.toLocaleString('tr-TR') + ' TL';
    if (unit === '%') return val + '%';
    if (unit === 'Adet') return val.toLocaleString('tr-TR') + ' Adet';
    return val + (unit ? ' ' + unit : '');
}

export default function PerformancePage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const trendChartRef = useRef<HTMLCanvasElement>(null);
    const compareChartRef = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<Chart[]>([]);

    useEffect(() => { document.title = 'Sporthink | Performans Takibi'; }, []);

    const fetchData = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedStore) params.set('storeId', selectedStore);
        if (selectedPeriod) params.set('period', selectedPeriod);
        fetch(`/api/performance?${params}`)
            .then(r => r.json())
            .then(setData)
            .catch(() => showToast('Performans verileri yüklenirken hata', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (session) fetchData();
    }, [session, selectedStore, selectedPeriod]);

    // Get the store to display (first/only store)
    const store = data?.stores?.[0];

    // ── Charts ──
    useEffect(() => {
        chartInstances.current.forEach(c => c.destroy());
        chartInstances.current = [];
        if (!store?.kpis?.length) return;

        // Find main revenue KPI for trend chart
        const revenueKpi = store.kpis.find((k: any) => k.unit === 'TL' && (k.name.includes('Ciro') || k.name.includes('Satış')))
            || store.kpis.find((k: any) => k.unit === 'TL');

        // ─ Trend Chart ─
        if (trendChartRef.current && revenueKpi?.entries?.length > 0) {
            const labels = revenueKpi.entries.map((e: any) => {
                const [y, m] = e.period.split('-');
                const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
                return months[parseInt(m) - 1] + ' ' + y.slice(2);
            });
            const values = revenueKpi.entries.map((e: any) => e.value);
            const targets = revenueKpi.entries.map(() => revenueKpi.targetValue);

            chartInstances.current.push(new Chart(trendChartRef.current, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: revenueKpi.name + ' (Gerçekleşen)',
                            data: values,
                            borderColor: '#E53935',
                            backgroundColor: 'rgba(229,57,53,0.08)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointRadius: 5,
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#E53935',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                        },
                        {
                            label: 'Hedef',
                            data: targets,
                            borderColor: 'rgba(148,163,184,0.5)',
                            borderDash: [8, 4],
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    plugins: {
                        legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, usePointStyle: true, pointStyle: 'circle' } },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)',
                            titleFont: { family: 'Inter' },
                            bodyFont: { family: 'Inter' },
                            padding: 12,
                            callbacks: {
                                label: (ctx: any) => {
                                    const v = ctx.raw?.toLocaleString('tr-TR');
                                    return ` ${ctx.dataset.label}: ${v} TL`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(51,65,85,0.15)' } },
                        y: {
                            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${(v / 1000).toFixed(0)}K` },
                            grid: { color: 'rgba(51,65,85,0.15)' },
                        },
                    },
                },
            }));
        }

        // ─ KPI Achievement Chart (Horizontal Bar) ─
        if (compareChartRef.current && store.kpis.length > 0) {
            const kpiNames = store.kpis.map((k: any) => k.name);
            const achievements = store.kpis.map((k: any) => k.achievement || 0);
            const barColors = achievements.map((a: number) =>
                a >= 100 ? 'rgba(34,197,94,0.75)' : a >= 80 ? 'rgba(245,158,11,0.75)' : 'rgba(239,68,68,0.75)'
            );
            const borderColors = achievements.map((a: number) =>
                a >= 100 ? '#22c55e' : a >= 80 ? '#f59e0b' : '#ef4444'
            );

            chartInstances.current.push(new Chart(compareChartRef.current, {
                type: 'bar',
                data: {
                    labels: kpiNames,
                    datasets: [{
                        label: 'Hedef Gerçekleşme (%)',
                        data: achievements,
                        backgroundColor: barColors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15,23,42,0.95)',
                            callbacks: { label: (ctx: any) => ` Gerçekleşme: %${ctx.raw}` },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { color: '#64748b', callback: (v: any) => `%${v}` },
                            grid: { color: 'rgba(51,65,85,0.15)' },
                            max: Math.max(...achievements, 120),
                        },
                        y: {
                            ticks: { color: '#94a3b8', font: { size: 11 } },
                            grid: { display: false },
                        },
                    },
                },
            }));
        }

        return () => { chartInstances.current.forEach(c => c.destroy()); chartInstances.current = []; };
    }, [data]);

    if (!session) return null;
    const user = session.user as any;

    // Low performers
    const lowPerformers = data?.stores?.flatMap((s: any) =>
        s.kpis
            .filter((k: any) => k.achievement !== null && k.achievement < 90)
            .map((k: any) => ({
                storeName: s.storeName,
                kpiName: k.name,
                achievement: k.achievement,
                currentValue: k.currentValue,
                targetValue: k.targetValue,
                diff: k.currentValue - k.targetValue,
                unit: k.unit,
                trend: k.trend,
            }))
    ) || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* ── Header ── */}
                <div className="page-header">
                    <div>
                        <h1>Performans Takibi</h1>
                        <div className="page-header-sub">Satış hedefleri, KPI ve performans analizi</div>
                    </div>
                    {store && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="badge" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935', padding: '6px 12px' }}>
                                {store.latestPeriod}
                            </span>
                        </div>
                    )}
                </div>

                <div className="page-body">
                    {/* ── Filters ── */}
                    {data?.availableStores?.length > 0 && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                            <select
                                className="form-select"
                                style={{ width: 'auto', minWidth: 220 }}
                                value={selectedStore}
                                onChange={e => setSelectedStore(e.target.value)}
                            >
                                <option value="">Tüm Mağazalar</option>
                                {data.availableStores.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {data?.availablePeriods?.length > 0 && (
                                <select
                                    className="form-select"
                                    style={{ width: 'auto', minWidth: 160 }}
                                    value={selectedPeriod}
                                    onChange={e => setSelectedPeriod(e.target.value)}
                                >
                                    <option value="">Tüm Dönemler</option>
                                    {data.availablePeriods.map((p: string) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <><SkeletonStats count={5} /><SkeletonCard count={2} /></>
                    ) : !store ? (
                        <div className="empty-state">
                            <span className="material-icons-outlined">trending_up</span>
                            <p>Performans verisi bulunamadı</p>
                        </div>
                    ) : (
                        <>
                            {/* ══════ SECTION 1: KPI Summary Cards ══════ */}
                            <div className="stat-grid" style={{ marginBottom: 28 }}>
                                {store.kpis.map((kpi: any) => {
                                    const isGood = kpi.achievement !== null && kpi.achievement >= 100;
                                    const isWarn = kpi.achievement !== null && kpi.achievement >= 80 && kpi.achievement < 100;
                                    const color = isGood ? '#22c55e' : isWarn ? '#f59e0b' : '#ef4444';
                                    const isInverse = kpi.name.includes('İade') || kpi.name.includes('Devamsızlık');
                                    const trendColor = kpi.trend !== null
                                        ? (isInverse ? (kpi.trend < 0 ? '#22c55e' : '#ef4444') : (kpi.trend > 0 ? '#22c55e' : '#ef4444'))
                                        : 'var(--text-tertiary)';

                                    return (
                                        <div key={kpi.name} className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
                                            <div className="stat-info" style={{ width: '100%' }}>
                                                {/* Title + Trend */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                    <div className="stat-label" style={{ fontSize: '0.78rem' }}>{kpi.name}</div>
                                                    {kpi.trend !== null && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', fontWeight: 600, color: trendColor }}>
                                                            <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>
                                                                {isInverse
                                                                    ? (kpi.trend < 0 ? 'trending_down' : 'trending_up')
                                                                    : (kpi.trend > 0 ? 'trending_up' : kpi.trend < 0 ? 'trending_down' : 'trending_flat')
                                                                }
                                                            </span>
                                                            {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Value */}
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                                                    <span className="stat-value" style={{ fontSize: '1.3rem' }}>
                                                        {kpi.unit === 'TL' ? kpi.currentValue.toLocaleString('tr-TR') : kpi.currentValue}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{kpi.unit}</span>
                                                </div>

                                                {/* Progress Bar */}
                                                {kpi.achievement !== null && (
                                                    <>
                                                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%',
                                                                width: `${Math.min(kpi.achievement, 100)}%`,
                                                                borderRadius: 3,
                                                                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                                                                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                                                            }} />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                                                                Hedef: {fmt(kpi.targetValue, kpi.unit)}
                                                            </span>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>%{kpi.achievement}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ══════ SECTION 2: Charts ══════ */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                                {/* Satış Trendi */}
                                <div className="card">
                                    <div className="card-header">
                                        <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: '#E53935' }}>show_chart</span>
                                            Satış Trendi
                                        </h4>
                                    </div>
                                    <div style={{ height: 280, padding: '0 8px 8px' }}>
                                        <canvas ref={trendChartRef} />
                                    </div>
                                </div>

                                {/* KPI Hedef Gerçekleşme */}
                                <div className="card">
                                    <div className="card-header">
                                        <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: '#8b5cf6' }}>bar_chart</span>
                                            KPI Hedef Gerçekleşme
                                        </h4>
                                    </div>
                                    <div style={{ height: 280, padding: '0 8px 8px' }}>
                                        <canvas ref={compareChartRef} />
                                    </div>
                                </div>
                            </div>

                            {/* ══════ SECTION 3: Detaylı Tablo ══════ */}
                            <div className="card" style={{ marginBottom: 28 }}>
                                <div className="card-header">
                                    <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: '#0ea5e9' }}>table_chart</span>
                                        Detaylı Performans — Hedef Fark Analizi
                                    </h4>
                                    {data.stores.length > 1 && (
                                        <span className="badge" style={{ background: 'var(--bg-tertiary)' }}>{data.stores.length} mağaza</span>
                                    )}
                                </div>
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                {data.stores.length > 1 && <th>Mağaza</th>}
                                                <th>KPI</th>
                                                <th style={{ textAlign: 'right' }}>Hedef</th>
                                                <th style={{ textAlign: 'right' }}>Gerçekleşen</th>
                                                <th style={{ textAlign: 'right' }}>Fark</th>
                                                <th style={{ textAlign: 'center' }}>Gerçekleşme</th>
                                                <th style={{ textAlign: 'center' }}>Trend</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.stores.map((s: any) =>
                                                s.kpis.map((kpi: any) => {
                                                    const diff = kpi.targetValue ? kpi.currentValue - kpi.targetValue : null;
                                                    const isInverse = kpi.name.includes('İade') || kpi.name.includes('Devamsızlık');
                                                    const diffPositive = isInverse ? (diff !== null && diff <= 0) : (diff !== null && diff >= 0);

                                                    return (
                                                        <tr key={s.storeId + kpi.name}>
                                                            {data.stores.length > 1 && <td style={{ fontWeight: 500 }}>{s.storeName}</td>}
                                                            <td style={{ fontWeight: 600 }}>{kpi.name}</td>
                                                            <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(kpi.targetValue, kpi.unit)}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(kpi.currentValue, kpi.unit)}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 600, color: diffPositive ? '#22c55e' : '#ef4444' }}>
                                                                {diff !== null ? (
                                                                    <>
                                                                        {diff >= 0 ? '+' : ''}
                                                                        {kpi.unit === 'TL' ? diff.toLocaleString('tr-TR') : diff.toFixed(1)} {kpi.unit}
                                                                    </>
                                                                ) : '—'}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {kpi.achievement !== null && (
                                                                    <span className={`badge ${kpi.achievement >= 100 ? 'badge-success' : kpi.achievement >= 80 ? 'badge-warning' : 'badge-danger'}`}>
                                                                        %{kpi.achievement}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {kpi.trend !== null && (
                                                                    <span style={{
                                                                        display: 'inline-flex', alignItems: 'center', gap: 2,
                                                                        fontSize: '0.78rem', fontWeight: 600,
                                                                        color: (isInverse ? kpi.trend < 0 : kpi.trend > 0) ? '#22c55e' : '#ef4444',
                                                                    }}>
                                                                        <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>
                                                                            {kpi.trend > 0 ? 'arrow_upward' : kpi.trend < 0 ? 'arrow_downward' : 'remove'}
                                                                        </span>
                                                                        {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ══════ SECTION 4: Düşük Performans Uyarısı ══════ */}
                            {lowPerformers.length > 0 && (
                                <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                                    <div className="card-header">
                                        <h4 className="card-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>warning</span>
                                            Düşük Performans Uyarısı — %90 Altı
                                        </h4>
                                        <span className="badge badge-danger">{lowPerformers.length} uyarı</span>
                                    </div>
                                    <div className="table-container" style={{ border: 'none' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Mağaza</th>
                                                    <th>KPI</th>
                                                    <th style={{ textAlign: 'center' }}>Gerçekleşme</th>
                                                    <th style={{ textAlign: 'right' }}>Fark</th>
                                                    <th style={{ textAlign: 'center' }}>Durum</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lowPerformers
                                                    .sort((a: any, b: any) => a.achievement - b.achievement)
                                                    .map((item: any, i: number) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 500 }}>{item.storeName}</td>
                                                            <td>{item.kpiName}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span className={`badge ${item.achievement >= 80 ? 'badge-warning' : 'badge-danger'}`}>
                                                                    %{item.achievement}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>
                                                                {item.unit === 'TL' ? item.diff.toLocaleString('tr-TR') : item.diff.toFixed(1)} {item.unit}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span className={`badge ${item.achievement < 70 ? 'badge-danger' : item.achievement < 80 ? 'badge-warning' : ''}`}
                                                                    style={{ fontSize: '0.7rem' }}>
                                                                    {item.achievement < 70 ? '🔴 Kritik' : item.achievement < 80 ? '🟡 Düşük' : '🟠 Takipte'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
