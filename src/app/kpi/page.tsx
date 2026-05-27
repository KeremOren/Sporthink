'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { Chart, LineElement, BarElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, LineController, BarController } from 'chart.js';

Chart.register(LineElement, BarElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, LineController, BarController);

export default function KpiPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [definitions, setDefinitions] = useState<any[]>([]);
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKpi, setSelectedKpi] = useState<string>('');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ kpiDefinitionId: '', value: '', period: '', storeId: '', notes: '' });

    const lineChartRef = useRef<HTMLCanvasElement>(null);
    const barChartRef = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<Chart[]>([]);

    useEffect(() => { document.title = 'Sporthink | KPI'; }, []);

    useEffect(() => {
        if (session) fetchData();
    }, [session]);

    const fetchData = () => {
        fetch('/api/kpi').then(r => r.json()).then(data => {
            setDefinitions(data.definitions || []);
            setEntries(data.entries || []);
            if (data.definitions?.length > 0 && !selectedKpi) setSelectedKpi(data.definitions[0].id);
        })
            .catch(() => showToast('KPI verileri yüklenirken hata oluştu', 'error'))
            .finally(() => setLoading(false));
    };

    const handleAddEntry = async () => {
        try {
            const res = await fetch('/api/kpi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                showToast(data?.error || 'KPI verisi kaydedilemedi', 'error');
                return;
            }
            setShowAdd(false);
            setForm({ kpiDefinitionId: '', value: '', period: '', storeId: '', notes: '' });
            showToast('KPI verisi başarıyla kaydedildi', 'success');
            fetchData();
        } catch {
            showToast('KPI verisi kaydedilirken hata oluştu', 'error');
        }
    };

    if (!session) return null;
    const user = session.user as any;
    const role = user?.role;
    const currentDef = definitions.find(d => d.id === selectedKpi);
    const filteredEntries = entries.filter(e => e.kpiDefinitionId === selectedKpi);

    // Build charts when selected KPI changes
    useEffect(() => {
        if (!currentDef || filteredEntries.length === 0) return;
        chartInstances.current.forEach(c => c.destroy());
        chartInstances.current = [];

        // Line chart — trend over time (average across stores)
        if (lineChartRef.current) {
            const periods = [...new Set(filteredEntries.map((e: any) => e.period))].sort();
            const avgByPeriod = periods.map(p => {
                const vals = filteredEntries.filter((e: any) => e.period === p).map((e: any) => e.value);
                return vals.reduce((s: number, v: number) => s + v, 0) / vals.length;
            });
            const c = new Chart(lineChartRef.current, {
                type: 'line',
                data: {
                    labels: periods,
                    datasets: [
                        {
                            label: `Ortalama ${currentDef.unit || ''}`,
                            data: avgByPeriod.map(v => Math.round(v * 100) / 100),
                            borderColor: '#E53935', backgroundColor: 'rgba(229,57,53,0.1)',
                            fill: true, tension: 0.4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#E53935',
                        },
                        {
                            label: 'Hedef',
                            data: periods.map(() => currentDef.targetValue),
                            borderColor: '#ef4444', borderDash: [6, 3], borderWidth: 2, pointRadius: 0, fill: false,
                        },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#94a3b8' } } },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                    },
                },
            });
            chartInstances.current.push(c);
        }

        // Bar chart — latest period by store
        if (barChartRef.current) {
            const latestPeriod = [...new Set(filteredEntries.map((e: any) => e.period))].sort().pop();
            const latestEntries = filteredEntries.filter((e: any) => e.period === latestPeriod);
            const storeNames = latestEntries.map((e: any) => e.store?.name || 'Genel');
            const values = latestEntries.map((e: any) => e.value);
            const c = new Chart(barChartRef.current, {
                type: 'bar',
                data: {
                    labels: storeNames,
                    datasets: [{
                        label: `${latestPeriod} — ${currentDef.unit || ''}`,
                        data: values,
                        backgroundColor: values.map((v: number) =>
                            v >= (currentDef.targetValue || 0) ? 'rgba(34,197,94,0.7)' : 'rgba(245,158,11,0.7)'
                        ),
                        borderRadius: 8, borderSkipped: false,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#94a3b8' } } },
                    scales: {
                        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                    },
                },
            });
            chartInstances.current.push(c);
        }

        return () => { chartInstances.current.forEach(c => c.destroy()); };
    }, [selectedKpi, entries]);

    // Group entries by store for comparison
    const storeGroups: Record<string, any[]> = {};
    filteredEntries.forEach(e => {
        const storeName = e.store?.name || 'Genel';
        if (!storeGroups[storeName]) storeGroups[storeName] = [];
        storeGroups[storeName].push(e);
    });

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>KPI & Performans</h1>
                        <div className="page-header-sub">{definitions.length} KPI tanımı</div>
                    </div>
                    {['SUPER_ADMIN', 'STORE_MANAGER'].includes(role) && (
                        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                            <span className="material-icons-outlined">add</span> Veri Girişi
                        </button>
                    )}
                </div>

                <div className="page-body">
                    {loading ? (
                        <>
                            <SkeletonCard count={3} />
                            <div style={{ marginTop: 'var(--space-lg)' }}>
                                <SkeletonTable rows={5} cols={5} />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* KPI Selector */}
                            <div className="tabs" style={{ borderBottom: 'none', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
                                {definitions.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => setSelectedKpi(d.id)}
                                        className={`btn ${selectedKpi === d.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                    >
                                        {d.name}
                                    </button>
                                ))}
                            </div>

                            {currentDef && (
                                <>
                                    {/* KPI Info Card */}
                                    <div className="card mb-lg">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3>{currentDef.name}</h3>
                                                <p className="text-sm text-secondary mt-sm">{currentDef.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
                                                    {currentDef.targetValue}{currentDef.unit === '%' ? '%' : ` ${currentDef.unit || ''}`}
                                                </div>
                                                <div className="text-xs text-secondary">Hedef</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Charts */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                                        <div className="card" style={{ padding: 'var(--space-md)' }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>📈 Trend (Ortalama)</h4>
                                            <div style={{ height: 220 }}>
                                                <canvas ref={lineChartRef} />
                                            </div>
                                        </div>
                                        <div className="card" style={{ padding: 'var(--space-md)' }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>🏪 Mağaza Karşılaştırması (Son Dönem)</h4>
                                            <div style={{ height: 220 }}>
                                                <canvas ref={barChartRef} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* KPI Data by Store */}
                                    <div className="chart-grid">
                                        {Object.entries(storeGroups).map(([storeName, storeEntries]) => {
                                            const sorted = storeEntries.sort((a: any, b: any) => a.period.localeCompare(b.period));
                                            const latest = sorted[sorted.length - 1];
                                            const achievement = currentDef.targetValue ? Math.round((latest?.value / currentDef.targetValue) * 100) : 0;

                                            return (
                                                <div key={storeName} className="card">
                                                    <div className="card-header">
                                                        <h4 className="card-title">{storeName}</h4>
                                                        <span className={`badge ${achievement >= 100 ? 'badge-success' : achievement >= 80 ? 'badge-warning' : 'badge-danger'}`}>
                                                            %{achievement}
                                                        </span>
                                                    </div>

                                                    {/* Mini trend display */}
                                                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80, margin: '12px 0' }}>
                                                        {sorted.map((entry: any, i: number) => {
                                                            const maxVal = Math.max(...sorted.map((e: any) => e.value), currentDef.targetValue || 1);
                                                            const height = maxVal > 0 ? Math.max((entry.value / maxVal) * 100, 8) : 8;
                                                            const isAboveTarget = currentDef.targetValue ? entry.value >= currentDef.targetValue : true;
                                                            return (
                                                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                                                        {entry.value >= 1000 ? `${(entry.value / 1000).toFixed(0)}K` : entry.value}
                                                                    </span>
                                                                    <div style={{
                                                                        width: '100%', height: `${height}%`, minHeight: 6,
                                                                        background: isAboveTarget ? 'var(--success)' : entry.value >= (currentDef.targetValue * 0.8) ? 'var(--warning)' : 'var(--danger)',
                                                                        borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease'
                                                                    }} />
                                                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)' }}>{entry.period.slice(-2)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="flex justify-between text-xs text-secondary">
                                                        <span>Son: {latest?.value >= 1000 ? `${(latest.value / 1000).toFixed(1)}K` : latest?.value}{currentDef.unit === '%' ? '%' : ` ${currentDef.unit || ''}`}</span>
                                                        <span>Hedef: {currentDef.targetValue >= 1000 ? `${(currentDef.targetValue / 1000).toFixed(0)}K` : currentDef.targetValue}{currentDef.unit === '%' ? '%' : ` ${currentDef.unit || ''}`}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Data Table */}
                                    <div className="card mt-lg">
                                        <div className="card-header"><h4 className="card-title">Veri Tablosu</h4></div>
                                        <div className="table-container" style={{ border: 'none' }}>
                                            <table>
                                                <thead>
                                                    <tr><th>Dönem</th><th>Mağaza</th><th>Değer</th><th>Hedef</th><th>Başarı</th></tr>
                                                </thead>
                                                <tbody>
                                                    {filteredEntries.sort((a: any, b: any) => b.period.localeCompare(a.period)).slice(0, 20).map((e: any) => {
                                                        const ach = currentDef.targetValue ? Math.round((e.value / currentDef.targetValue) * 100) : 0;
                                                        return (
                                                            <tr key={e.id}>
                                                                <td>{e.period}</td>
                                                                <td>{e.store?.name || '-'}</td>
                                                                <td className="font-semibold">{e.value}{currentDef.unit === '%' ? '%' : ` ${currentDef.unit || ''}`}</td>
                                                                <td className="text-secondary">{currentDef.targetValue}</td>
                                                                <td><span className={`badge ${ach >= 100 ? 'badge-success' : ach >= 80 ? 'badge-warning' : 'badge-danger'}`}>%{ach}</span></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Add KPI Entry Modal */}
                {showAdd && (
                    <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>KPI Veri Girişi</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><span className="material-icons-outlined">close</span></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">KPI</label>
                                    <select className="form-select" value={form.kpiDefinitionId} onChange={e => setForm({ ...form, kpiDefinitionId: e.target.value })}>
                                        <option value="">Seçin</option>
                                        {definitions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Değer</label>
                                        <input className="form-input" type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Dönem</label>
                                        <input className="form-input" type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notlar</label>
                                    <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ek notlar..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleAddEntry} disabled={!form.kpiDefinitionId || !form.value || !form.period}>Kaydet</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
