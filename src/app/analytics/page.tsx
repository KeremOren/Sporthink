'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonCard, SkeletonStats } from '@/components/ui/Skeleton';
import { Chart, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, DoughnutController, BarController, LineController, ScatterController } from 'chart.js';

Chart.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, DoughnutController, BarController, LineController, ScatterController);

export default function AnalyticsPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeKpi, setActiveKpi] = useState(0);

    // Chart refs
    const trendRef = useRef<HTMLCanvasElement>(null);
    const scorecardBarRef = useRef<HTMLCanvasElement>(null);
    const kpiTrendRef = useRef<HTMLCanvasElement>(null);
    const scatterRef = useRef<HTMLCanvasElement>(null);
    const quizRef = useRef<HTMLCanvasElement>(null);
    const regionRef = useRef<HTMLCanvasElement>(null);

    const chartInstances = useRef<Chart[]>([]);

    useEffect(() => { document.title = 'Sporthink | İleri Analiz'; }, []);

    useEffect(() => {
        if (session) {
            fetch('/api/analytics')
                .then(r => r.json())
                .then(setData)
                .catch(() => showToast('Analytics verileri yüklenirken hata', 'error'))
                .finally(() => setLoading(false));
        }
    }, [session]);

    // Destroy all charts on cleanup
    useEffect(() => {
        return () => { chartInstances.current.forEach(c => c.destroy()); };
    }, []);

    // Build charts when data loads
    useEffect(() => {
        if (!data || loading) return;
        chartInstances.current.forEach(c => c.destroy());
        chartInstances.current = [];

        buildTrendChart();
        buildScorecardBar();
        buildScatterPlot();
        buildQuizChart();
        buildRegionChart();
    }, [data, loading]);

    // Rebuild KPI chart when activeKpi changes
    useEffect(() => {
        if (!data?.kpiTrends?.length) return;
        buildKpiTrendChart();
    }, [data, activeKpi]);

    function buildTrendChart() {
        if (!trendRef.current || !data?.trainingTrend) return;
        const labels = data.trainingTrend.map((t: any) => t.period);
        const rates = data.trainingTrend.map((t: any) => t.rate);
        // Add forecast point
        const forecastLabels = [...labels, 'Tahmin'];
        const forecastData = [...rates, data.forecast];

        const c = new Chart(trendRef.current, {
            type: 'line',
            data: {
                labels: forecastLabels,
                datasets: [
                    {
                        label: 'Tamamlanma Oranı (%)',
                        data: rates,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#6366f1',
                        borderWidth: 3,
                    },
                    {
                        label: 'Tahmin',
                        data: [...Array(rates.length - 1).fill(null), rates[rates.length - 1], data.forecast],
                        borderColor: '#f59e0b',
                        borderDash: [8, 4],
                        pointRadius: [0, 0, 0, 0, 0, 0, 8],
                        pointBackgroundColor: '#f59e0b',
                        borderWidth: 2,
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                    y: { min: 0, max: 100, ticks: { color: '#94a3b8', callback: (v: any) => v + '%' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                },
            },
        });
        chartInstances.current.push(c);
    }

    function buildScorecardBar() {
        if (!scorecardBarRef.current || !data?.scorecard) return;
        const sorted = [...data.scorecard].sort((a: any, b: any) => b.score - a.score);
        const c = new Chart(scorecardBarRef.current, {
            type: 'bar',
            data: {
                labels: sorted.map((s: any) => s.name),
                datasets: [{
                    label: 'Performans Skoru',
                    data: sorted.map((s: any) => s.score),
                    backgroundColor: sorted.map((s: any) =>
                        s.status === 'excellent' ? 'rgba(34,197,94,0.7)' :
                            s.status === 'good' ? 'rgba(59,130,246,0.7)' :
                                s.status === 'warning' ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)'
                    ),
                    borderRadius: 8,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                    y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
                },
            },
        });
        chartInstances.current.push(c);
    }

    function buildKpiTrendChart() {
        if (!kpiTrendRef.current || !data?.kpiTrends?.length) return;
        // Find and destroy existing KPI chart
        const existingIdx = chartInstances.current.findIndex(c => (c.canvas as any)?.id === 'kpiTrendCanvas');
        if (existingIdx >= 0) { chartInstances.current[existingIdx].destroy(); chartInstances.current.splice(existingIdx, 1); }

        const kpi = data.kpiTrends[activeKpi];
        const c = new Chart(kpiTrendRef.current, {
            type: 'line',
            data: {
                labels: kpi.data.map((d: any) => d.period),
                datasets: [
                    {
                        label: `Ortalama (${kpi.unit})`,
                        data: kpi.data.map((d: any) => d.avg),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: '#8b5cf6',
                    },
                    {
                        label: 'Hedef',
                        data: kpi.data.map(() => kpi.target),
                        borderColor: '#ef4444',
                        borderDash: [6, 3],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                },
            },
        });
        (kpiTrendRef.current as any).id = 'kpiTrendCanvas';
        chartInstances.current.push(c);
    }

    function buildScatterPlot() {
        if (!scatterRef.current || !data?.crossAnalysis) return;
        const c = new Chart(scatterRef.current, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Mağazalar',
                    data: data.crossAnalysis.map((d: any) => ({ x: d.completionRate, y: d.avgSatisfaction })),
                    backgroundColor: data.crossAnalysis.map((_: any, i: number) => {
                        const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
                        return colors[i % colors.length];
                    }),
                    pointRadius: 12,
                    pointHoverRadius: 16,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const store = data.crossAnalysis[ctx.dataIndex];
                                return `${store.store}: Eğitim %${store.completionRate}, Memnuniyet %${store.avgSatisfaction}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Eğitim Tamamlanma (%)', color: '#94a3b8' },
                        ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' },
                    },
                    y: {
                        title: { display: true, text: 'Müşteri Memnuniyeti (%)', color: '#94a3b8' },
                        ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' },
                    },
                },
            },
        });
        chartInstances.current.push(c);
    }

    function buildQuizChart() {
        if (!quizRef.current || !data?.quizStats) return;
        const c = new Chart(quizRef.current, {
            type: 'bar',
            data: {
                labels: data.quizStats.map((q: any) => q.title),
                datasets: [
                    { label: 'Ort. Puan', data: data.quizStats.map((q: any) => q.avgScore), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
                    { label: 'Geçme Oranı (%)', data: data.quizStats.map((q: any) => q.passRate), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } } },
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 15 }, grid: { display: false } },
                    y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                },
            },
        });
        chartInstances.current.push(c);
    }

    function buildRegionChart() {
        if (!regionRef.current || !data?.regionSummary) return;
        const c = new Chart(regionRef.current, {
            type: 'doughnut',
            data: {
                labels: data.regionSummary.map((r: any) => r.name),
                datasets: [{
                    data: data.regionSummary.map((r: any) => r.employeeCount),
                    backgroundColor: ['#6366f1', '#22c55e', '#f59e0b'],
                    borderWidth: 0,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 12 } } } },
            },
        });
        chartInstances.current.push(c);
    }

    const getStatusIcon = (status: string) => {
        if (status === 'excellent') return '🟢';
        if (status === 'good') return '🔵';
        if (status === 'warning') return '🟡';
        return '🔴';
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">📊 İleri Analiz & İş Zekası</h1>
                        <p className="text-secondary">Trend analizi, tahminleme ve çapraz veri karşılaştırması</p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 gap-lg">
                        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </div>
                ) : data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

                        {/* ====== ROW 1: Trend + Forecast ====== */}
                        <div className="card" style={{ padding: 'var(--space-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>📈 Eğitim Tamamlanma Trendi</h2>
                                    <p className="text-secondary text-sm">Son 6 ay + gelecek ay tahmini</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.85rem', padding: '6px 14px' }}>
                                        🔮 Tahmin: %{data.forecast}
                                    </span>
                                </div>
                            </div>
                            <div style={{ height: 300 }}>
                                <canvas ref={trendRef} />
                            </div>
                        </div>

                        {/* ====== ROW 2: Scorecard + Scorecard Bar ====== */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                            {/* Scorecard Table */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                                    🏆 Mağaza Performans Skorkartı
                                </h2>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr>
                                                <th>Mağaza</th>
                                                <th>Eğitim</th>
                                                <th>Satış</th>
                                                <th>Açık FB</th>
                                                <th>Skor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.scorecard?.sort((a: any, b: any) => b.score - a.score).map((s: any) => (
                                                <tr key={s.id}>
                                                    <td>
                                                        <span>{getStatusIcon(s.status)} </span>
                                                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                                                    </td>
                                                    <td>%{s.completionRate}</td>
                                                    <td>%{s.salesRate}</td>
                                                    <td>{s.openFeedback}</td>
                                                    <td><span style={{ fontWeight: 700, color: s.score >= 80 ? '#22c55e' : s.score >= 60 ? '#6366f1' : s.score >= 40 ? '#f59e0b' : '#ef4444' }}>{s.score}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Scorecard Bar */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                                    📊 Performans Sıralaması
                                </h2>
                                <div style={{ height: 280 }}>
                                    <canvas ref={scorecardBarRef} />
                                </div>
                            </div>
                        </div>

                        {/* ====== ROW 3: KPI Trend ====== */}
                        <div className="card" style={{ padding: 'var(--space-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>📉 KPI Trend Analizi</h2>
                                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                                    {data.kpiTrends?.map((kpi: any, i: number) => (
                                        <button
                                            key={kpi.id}
                                            onClick={() => setActiveKpi(i)}
                                            className={`btn ${i === activeKpi ? 'btn-primary' : 'btn-ghost'}`}
                                            style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                        >
                                            {kpi.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {data.kpiTrends?.[activeKpi] && (
                                <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                                    <div className="stat-card" style={{ padding: '8px 16px', flex: 1 }}>
                                        <div className="stat-label">Hedef</div>
                                        <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                                            {data.kpiTrends[activeKpi].target} {data.kpiTrends[activeKpi].unit}
                                        </div>
                                    </div>
                                    <div className="stat-card" style={{ padding: '8px 16px', flex: 1 }}>
                                        <div className="stat-label">Son Dönem Ort.</div>
                                        <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                                            {data.kpiTrends[activeKpi].data?.[data.kpiTrends[activeKpi].data.length - 1]?.avg} {data.kpiTrends[activeKpi].unit}
                                        </div>
                                    </div>
                                    <div className="stat-card" style={{ padding: '8px 16px', flex: 1 }}>
                                        <div className="stat-label">Min — Max</div>
                                        <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                                            {data.kpiTrends[activeKpi].data?.[data.kpiTrends[activeKpi].data.length - 1]?.min} — {data.kpiTrends[activeKpi].data?.[data.kpiTrends[activeKpi].data.length - 1]?.max}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div style={{ height: 280 }}>
                                <canvas ref={kpiTrendRef} />
                            </div>
                        </div>

                        {/* ====== ROW 4: Cross Analysis + Quiz Stats ====== */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                            {/* Scatter Plot — Correlation */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>🔗 Çapraz Analiz</h2>
                                <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-md)' }}>Eğitim tamamlanma vs müşteri memnuniyeti korelasyonu</p>
                                <div style={{ height: 280 }}>
                                    <canvas ref={scatterRef} />
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
                                    {data.crossAnalysis?.map((s: any, i: number) => {
                                        const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
                                        return (
                                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#94a3b8' }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], display: 'inline-block' }} />
                                                {s.store}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Quiz Performance */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                                    📝 Sınav Performansı
                                </h2>
                                <div style={{ height: 280 }}>
                                    <canvas ref={quizRef} />
                                </div>
                            </div>
                        </div>

                        {/* ====== ROW 5: Region Summary + Distribution ====== */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                            {/* Region Table */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                                    🗺️ Bölge Özeti
                                </h2>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Bölge</th>
                                            <th>Mağaza</th>
                                            <th>Çalışan</th>
                                            <th>Tamamlanma</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.regionSummary?.map((r: any, i: number) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{r.name}</td>
                                                <td>{r.storeCount}</td>
                                                <td>{r.employeeCount}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                        <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${r.completionRate}%`, background: r.completionRate >= 60 ? '#22c55e' : r.completionRate >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 3, transition: 'width 0.5s ease' }} />
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>%{r.completionRate}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Region Distribution Doughnut */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                                    👥 Bölge Çalışan Dağılımı
                                </h2>
                                <div style={{ height: 280 }}>
                                    <canvas ref={regionRef} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                        <p className="text-secondary">Veri bulunamadı</p>
                    </div>
                )}
            </main>
        </div>
    );
}
