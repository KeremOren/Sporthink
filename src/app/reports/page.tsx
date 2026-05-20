'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default function ReportsPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [tab, setTab] = useState<'training' | 'quiz' | 'feedback' | 'kpi-performance'>('training');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const chartRef1 = useRef<HTMLCanvasElement>(null);
    const chartRef2 = useRef<HTMLCanvasElement>(null);
    const chartInstance1 = useRef<Chart | null>(null);
    const chartInstance2 = useRef<Chart | null>(null);
    const reportAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.title = 'Sporthink | Raporlar';
    }, []);

    useEffect(() => {
        if (session) fetchReport(tab);
    }, [session, tab]);

    const fetchReport = async (type: string) => {
        setLoading(true);
        const apiType = type === 'training' ? 'training-completion' : type === 'quiz' ? 'quiz-stats' : type === 'feedback' ? 'feedback-analytics' : type;
        const res = await fetch(`/api/reports?type=${apiType}`);
        const d = await res.json();
        setData(d);
        setLoading(false);
    };

    useEffect(() => {
        if (!data || loading) return;

        // Destroy previous charts
        chartInstance1.current?.destroy();
        chartInstance2.current?.destroy();

        if (tab === 'training' && chartRef1.current) {
            const labels = data.data?.map((s: any) => s.storeName) || data.storeBreakdown?.map((s: any) => s.storeName) || [];
            const completed = data.data?.map((s: any) => s.completed) || data.storeBreakdown?.map((s: any) => s.completed) || [];
            const total = data.data?.map((s: any) => s.total) || data.storeBreakdown?.map((s: any) => s.total) || [];

            chartInstance1.current = new Chart(chartRef1.current, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Tamamlanan', data: completed, backgroundColor: 'rgba(34, 197, 94, 0.7)', borderRadius: 6 },
                        { label: 'Toplam', data: total, backgroundColor: 'rgba(99, 102, 241, 0.4)', borderRadius: 6 },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
                        title: { display: true, text: 'Mağaza Bazlı Eğitim Tamamlanma', color: '#f1f5f9', font: { family: 'Inter', size: 14 } },
                    },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.5)' } },
                        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.5)' }, beginAtZero: true },
                    },
                },
            });
        }

        if (tab === 'feedback' && chartRef1.current && chartRef2.current) {
            const fbData = data.data || data;
            const statusLabels = fbData.byStatus?.map((s: any) => s.status) || [];
            const statusValues = fbData.byStatus?.map((s: any) => s._count) || [];
            const statusColors = ['#8b5cf6', '#f59e0b', '#3b82f6', '#22c55e', '#6b7280'];

            chartInstance1.current = new Chart(chartRef1.current, {
                type: 'doughnut',
                data: {
                    labels: statusLabels.map((s: string) => {
                        const map: Record<string, string> = { NEW: 'Yeni', IN_REVIEW: 'İnceleniyor', ACTION_PLANNED: 'Planlandı', IMPLEMENTED: 'Uygulandı', CLOSED: 'Kapatıldı' };
                        return map[s] || s;
                    }),
                    datasets: [{
                        data: statusValues,
                        backgroundColor: statusColors.slice(0, statusLabels.length),
                        borderWidth: 0,
                    }],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { family: 'Inter' } } },
                        title: { display: true, text: 'Durum Dağılımı', color: '#f1f5f9', font: { family: 'Inter', size: 14 } },
                    },
                },
            });

            const typeLabels = fbData.byType?.map((t: any) => t.type) || [];
            const typeValues = fbData.byType?.map((t: any) => t._count) || [];

            chartInstance2.current = new Chart(chartRef2.current, {
                type: 'bar',
                data: {
                    labels: typeLabels.map((t: string) => {
                        const map: Record<string, string> = { OPERATIONAL_ISSUE: 'Operasyonel', SUGGESTION: 'Öneri', INCIDENT: 'Olay', PRAISE: 'Takdir', TRAINING_NEED: 'Eğitim İhtiyacı', CUSTOMER_COMPLAINT: 'Müşteri Şikayeti', PRODUCT_DEFECT: 'Ürün Hatası', STOCK_ISSUE: 'Stok Sorunu', STAFF_ISSUE: 'Personel', STORE_MAINTENANCE: 'Bakım' };
                        return map[t] || t;
                    }),
                    datasets: [{
                        label: 'Adet',
                        data: typeValues,
                        backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6'],
                        borderRadius: 8,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Tür Bazlı Dağılım', color: '#f1f5f9', font: { family: 'Inter', size: 14 } },
                    },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.5)' }, beginAtZero: true },
                        y: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                    },
                },
            });
        }

        if (tab === 'quiz' && chartRef1.current) {
            const quizData = data.data || data.quizStats || [];
            const labels = quizData.map((q: any) => q.title || q.quiz?.title || 'Quiz') || [];
            const avgScores = quizData.map((q: any) => q.avgScore || Math.round(q._avg?.score || 0)) || [];
            const attempts = quizData.map((q: any) => q.attempts || q._count?.id || 0) || [];

            chartInstance1.current = new Chart(chartRef1.current, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Ort. Puan', data: avgScores, backgroundColor: 'rgba(99, 102, 241, 0.7)', borderRadius: 6, yAxisID: 'y' },
                        { label: 'Deneme Sayısı', data: attempts, backgroundColor: 'rgba(6, 182, 212, 0.5)', borderRadius: 6, yAxisID: 'y1' },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
                        title: { display: true, text: 'Sınav İstatistikleri', color: '#f1f5f9', font: { family: 'Inter', size: 14 } },
                    },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.5)' } },
                        y: { type: 'linear', position: 'left', ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.5)' }, beginAtZero: true, title: { display: true, text: 'Puan', color: '#94a3b8' } },
                        y1: { type: 'linear', position: 'right', ticks: { color: '#94a3b8' }, grid: { display: false }, beginAtZero: true, title: { display: true, text: 'Deneme', color: '#94a3b8' } },
                    },
                },
            });
        }

        if (tab === 'kpi-performance' && chartRef1.current) {
            const kpiData = data.data || [];
            // Group by KPI name
            const kpiGroups: Record<string, any[]> = {};
            kpiData.forEach((e: any) => {
                const name = e.kpiDefinition?.name || 'KPI';
                if (!kpiGroups[name]) kpiGroups[name] = [];
                kpiGroups[name].push(e);
            });
            const kpiNames = Object.keys(kpiGroups);
            const latestValues = kpiNames.map(name => {
                const sorted = kpiGroups[name].sort((a: any, b: any) => b.period?.localeCompare(a.period));
                return sorted[0]?.value || 0;
            });
            const targets = kpiNames.map(name => kpiGroups[name][0]?.kpiDefinition?.targetValue || 0);

            chartInstance1.current = new Chart(chartRef1.current, {
                type: 'bar',
                data: {
                    labels: kpiNames,
                    datasets: [
                        { label: 'Güncel Değer', data: latestValues, backgroundColor: 'rgba(99, 102, 241, 0.7)', borderRadius: 6 },
                        { label: 'Hedef', data: targets, backgroundColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 6 },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
                        title: { display: true, text: 'KPI Performansı — Güncel vs Hedef', color: '#f1f5f9', font: { family: 'Inter', size: 14 } },
                    },
                    scales: {
                        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(51,65,85,0.5)' } },
                        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.5)' }, beginAtZero: true },
                    },
                },
            });
        }

        return () => {
            chartInstance1.current?.destroy();
            chartInstance2.current?.destroy();
        };
    }, [data, loading, tab]);

    const exportCSV = () => {
        if (!data) return;
        let csv = '';
        const rows = data.data || data.storeBreakdown || data.quizStats || [];

        if (tab === 'training') {
            csv = 'Mağaza,Bölge,Tamamlanan,Toplam,Geciken,Oran\n';
            rows.forEach((s: any) => {
                csv += `"${s.storeName}","${s.regionName || ''}",${s.completed},${s.total},${s.overdue || 0},${s.rate || (s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0)}%\n`;
            });
        } else if (tab === 'quiz') {
            csv = 'Sınav,Deneme,Ort. Puan,Geçme Oranı,Max,Min\n';
            rows.forEach((q: any) => {
                csv += `"${q.title || q.quiz?.title || ''}",${q.attempts || q._count?.id || 0},${q.avgScore || Math.round(q._avg?.score || 0)},${q.passRate || 0}%,${q._max?.score || 0},${q._min?.score || 0}\n`;
            });
        } else if (tab === 'feedback') {
            const fbData = data.data || data;
            csv = 'Durum,Adet\n';
            const statusMap: Record<string, string> = { NEW: 'Yeni', IN_REVIEW: 'İnceleniyor', ACTION_PLANNED: 'Planlandı', IMPLEMENTED: 'Uygulandı', CLOSED: 'Kapatıldı' };
            (fbData.byStatus || []).forEach((s: any) => { csv += `"${statusMap[s.status] || s.status}",${s._count}\n`; });
            csv += '\nTür,Adet\n';
            const typeMap: Record<string, string> = { OPERATIONAL_ISSUE: 'Operasyonel', SUGGESTION: 'Öneri', INCIDENT: 'Olay', PRAISE: 'Takdir', TRAINING_NEED: 'Eğitim İhtiyacı', CUSTOMER_COMPLAINT: 'Müşteri Şikayeti', PRODUCT_DEFECT: 'Ürün Hatası', STOCK_ISSUE: 'Stok Sorunu', STAFF_ISSUE: 'Personel', STORE_MAINTENANCE: 'Bakım' };
            (fbData.byType || []).forEach((t: any) => { csv += `"${typeMap[t.type] || t.type}",${t._count}\n`; });
            csv += `\nToplam,${fbData.total || 0}\nOrt. Çözüm Süresi,"${fbData.avgResolutionDays || 0} gün"\n`;
        } else if (tab === 'kpi-performance') {
            csv = 'KPI,Dönem,Mağaza,Değer,Hedef,Birim\n';
            rows.forEach((e: any) => {
                csv += `"${e.kpiDefinition?.name || ''}","${e.period}","${e.store?.name || ''}",${e.value},${e.kpiDefinition?.targetValue || ''},"${e.kpiDefinition?.unit || ''}"\n`;
            });
        }

        if (csv) {
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `sporthink_${tab}_rapor.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('CSV dosyası indirildi', 'success');
        }
    };

    const exportPDF = async () => {
        if (!reportAreaRef.current) return;
        showToast('PDF hazırlanıyor...', 'info');
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(reportAreaRef.current, {
                backgroundColor: '#0f172a',
                scale: 2,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = (canvas.height * pdfW) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
            pdf.save(`sporthink_${tab}_rapor.pdf`);
            showToast('PDF dosyası indirildi', 'success');
        } catch {
            showToast('PDF oluşturulurken hata', 'error');
        }
    };

    if (!session) return null;

    const tabs = [
        { key: 'training', label: 'Eğitim Tamamlanma', icon: 'school' },
        { key: 'quiz', label: 'Sınav İstatistikleri', icon: 'quiz' },
        { key: 'feedback', label: 'Geri Bildirim Analizi', icon: 'feedback' },
        { key: 'kpi-performance', label: 'KPI Performansı', icon: 'trending_up' },
    ];

    const storeData = data?.data || data?.storeBreakdown || [];
    const quizData = data?.data || data?.quizStats || [];
    const fbData = data?.data || data;
    const kpiRows = data?.data || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Raporlar & Analiz</h1>
                        <div className="page-header-sub">Detaylı performans raporları</div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn-ghost" onClick={exportCSV}>
                            <span className="material-icons-outlined">download</span> CSV
                        </button>
                        <button className="btn btn-primary" onClick={exportPDF}>
                            <span className="material-icons-outlined">picture_as_pdf</span> PDF
                        </button>
                    </div>
                </div>

                <div className="page-body">
                    <div className="tabs">
                        {tabs.map(t => (
                            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key as any)}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem', marginRight: 4 }}>{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <SkeletonTable rows={6} cols={4} />
                    ) : (
                        <div ref={reportAreaRef}>
                            {/* Charts */}
                            <div className="chart-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                                <div className="card">
                                    <canvas ref={chartRef1} />
                                </div>
                                {tab === 'feedback' && (
                                    <div className="card">
                                        <canvas ref={chartRef2} />
                                    </div>
                                )}
                            </div>

                            {/* Data Tables */}
                            {tab === 'training' && storeData.length > 0 && (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr><th>Mağaza</th><th>Bölge</th><th>Tamamlanan</th><th>Toplam</th><th>Geciken</th><th>Oran</th><th>İlerleme</th></tr>
                                        </thead>
                                        <tbody>
                                            {storeData.map((s: any, i: number) => {
                                                const pct = s.rate || (s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0);
                                                return (
                                                    <tr key={i}>
                                                        <td className="font-semibold">{s.storeName}</td>
                                                        <td className="text-secondary">{s.regionName || '-'}</td>
                                                        <td>{s.completed}</td>
                                                        <td>{s.total}</td>
                                                        <td className={s.overdue > 0 ? 'text-danger' : ''}>{s.overdue || 0}</td>
                                                        <td className={pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'}>{pct}%</td>
                                                        <td><div className="progress-bar" style={{ width: 150 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'quiz' && quizData.length > 0 && (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr><th>Sınav</th><th>Deneme</th><th>Ort. Puan</th><th>Geçme Oranı</th><th>Max</th><th>Min</th></tr>
                                        </thead>
                                        <tbody>
                                            {quizData.map((q: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="font-semibold">{q.title || q.quiz?.title || `Quiz ${i + 1}`}</td>
                                                    <td>{q.attempts || q._count?.id || 0}</td>
                                                    <td>{q.avgScore || Math.round(q._avg?.score || 0)}</td>
                                                    <td className={((q.passRate || 0) >= 70) ? 'text-success' : 'text-warning'}>{q.passRate || 0}%</td>
                                                    <td>{q._max?.score || '-'}</td>
                                                    <td>{q._min?.score || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'feedback' && fbData && (
                                <>
                                    {/* Summary stats */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                        <div className="stat-card" style={{ textAlign: 'center' }}>
                                            <div className="stat-label">Toplam Geri Bildirim</div>
                                            <div className="stat-value" style={{ color: '#6366f1' }}>{fbData.total || 0}</div>
                                        </div>
                                        <div className="stat-card" style={{ textAlign: 'center' }}>
                                            <div className="stat-label">Ort. Çözüm Süresi</div>
                                            <div className="stat-value" style={{ color: '#f59e0b' }}>{fbData.avgResolutionDays || 0} gün</div>
                                        </div>
                                        <div className="stat-card" style={{ textAlign: 'center' }}>
                                            <div className="stat-label">Tür Sayısı</div>
                                            <div className="stat-value" style={{ color: '#22c55e' }}>{fbData.byType?.length || 0}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                                        <div className="table-container">
                                            <table>
                                                <thead><tr><th>Durum</th><th>Adet</th></tr></thead>
                                                <tbody>
                                                    {(fbData.byStatus || []).map((s: any, i: number) => {
                                                        const map: Record<string, string> = { NEW: 'Yeni', IN_REVIEW: 'İnceleniyor', ACTION_PLANNED: 'Planlandı', IMPLEMENTED: 'Uygulandı', CLOSED: 'Kapatıldı' };
                                                        return (<tr key={i}><td className="font-semibold">{map[s.status] || s.status}</td><td>{s._count}</td></tr>);
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="table-container">
                                            <table>
                                                <thead><tr><th>Tür</th><th>Adet</th></tr></thead>
                                                <tbody>
                                                    {(fbData.byType || []).map((t: any, i: number) => {
                                                        const map: Record<string, string> = { OPERATIONAL_ISSUE: 'Operasyonel', SUGGESTION: 'Öneri', INCIDENT: 'Olay', PRAISE: 'Takdir', TRAINING_NEED: 'Eğitim İhtiyacı', CUSTOMER_COMPLAINT: 'Müşteri Şikayeti', PRODUCT_DEFECT: 'Ürün Hatası', STOCK_ISSUE: 'Stok Sorunu', STAFF_ISSUE: 'Personel', STORE_MAINTENANCE: 'Bakım' };
                                                        return (<tr key={i}><td className="font-semibold">{map[t.type] || t.type}</td><td>{t._count}</td></tr>);
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {tab === 'kpi-performance' && kpiRows.length > 0 && (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr><th>KPI</th><th>Dönem</th><th>Mağaza</th><th>Değer</th><th>Hedef</th><th>Başarı</th></tr>
                                        </thead>
                                        <tbody>
                                            {kpiRows.slice(0, 30).map((e: any, i: number) => {
                                                const ach = e.kpiDefinition?.targetValue ? Math.round((e.value / e.kpiDefinition.targetValue) * 100) : 0;
                                                return (
                                                    <tr key={i}>
                                                        <td className="font-semibold">{e.kpiDefinition?.name || '-'}</td>
                                                        <td>{e.period}</td>
                                                        <td>{e.store?.name || '-'}</td>
                                                        <td>{e.value} {e.kpiDefinition?.unit || ''}</td>
                                                        <td className="text-secondary">{e.kpiDefinition?.targetValue || '-'}</td>
                                                        <td><span className={`badge ${ach >= 100 ? 'badge-success' : ach >= 80 ? 'badge-warning' : 'badge-danger'}`}>%{ach}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
