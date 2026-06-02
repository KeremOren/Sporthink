'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';
import { ROLE_LABELS } from '@/lib/rbac';
import {
    Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
    DoughnutController, BarController, LineController, LineElement, PointElement, Filler,
} from 'chart.js';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
    DoughnutController, BarController, LineController, LineElement, PointElement, Filler);

// Map KPI name → icon + bg color (Material Icons + brand palette)
const KPI_META: Record<string, { icon: string; bg: string; iconColor: string }> = {
    'Aylık Ciro':              { icon: 'payments',           bg: '#fee2e2', iconColor: '#dc2626' },
    'Ürün Satış Adedi':        { icon: 'shopping_bag',       bg: '#dbeafe', iconColor: '#2563eb' },
    'Sepet Ortalaması':        { icon: 'shopping_cart',      bg: '#fef3c7', iconColor: '#d97706' },
    'Dönüşüm Oranı':           { icon: 'transform',          bg: '#fce7f3', iconColor: '#db2777' },
    'Müşteri Memnuniyeti':     { icon: 'sentiment_satisfied',bg: '#dcfce7', iconColor: '#16a34a' },
    'Eğitim Tamamlama Oranı':  { icon: 'school',             bg: '#d1fae5', iconColor: '#059669' },
    // Excel'den gelen yeni KPI'lar
    'UPT':                     { icon: 'inventory_2',        bg: '#e0e7ff', iconColor: '#4f46e5' },
    'Fatura Adedi':            { icon: 'receipt_long',       bg: '#cffafe', iconColor: '#0891b2' },
    'Toplam Ziyaretçi':        { icon: 'groups',             bg: '#fae8ff', iconColor: '#a21caf' },
    'Ortalama Satış Fiyatı':   { icon: 'sell',               bg: '#fee2e2', iconColor: '#e11d48' },
    'Tekli Fatura Oranı':      { icon: 'pie_chart',          bg: '#fef9c3', iconColor: '#ca8a04' },
};

function formatTL(v: number): string {
    if (v >= 1_000_000) return `₺${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `₺${(v / 1_000).toFixed(1)}K`;
    return `₺${v.toLocaleString('tr-TR')}`;
}

function formatNum(v: number): string {
    return v.toLocaleString('tr-TR');
}

function formatPeriodLabel(p: string): string {
    // Expected "YYYY-MM" → "Oca"
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const [, m] = p.split('-');
    return months[parseInt(m, 10) - 1] || p;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStoreId, setFilterStoreId] = useState('');

    // Chart refs
    const cirRef = useRef<HTMLCanvasElement>(null);
    const adetRef = useRef<HTMLCanvasElement>(null);
    const sepetRef = useRef<HTMLCanvasElement>(null);
    const donusumRef = useRef<HTMLCanvasElement>(null);
    const chartsRef = useRef<Chart[]>([]);

    useEffect(() => { document.title = 'Sporthink | Dashboard'; }, []);

    const fetchData = (sid: string) => {
        const url = sid ? `/api/dashboard?storeId=${sid}` : '/api/dashboard';
        setLoading(true);
        fetch(url)
            .then(r => r.json())
            .then(setData)
            .catch(() => showToast('Dashboard verileri yüklenirken hata', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (session) fetchData(filterStoreId); }, [session, filterStoreId]);

    /* ============== Render Charts ============== */
    useEffect(() => {
        if (!data || loading) return;
        // Destroy existing charts
        chartsRef.current.forEach(c => c.destroy());
        chartsRef.current = [];

        const kpiByName = (n: string) => (data.kpis || []).find((k: any) => k.name === n);
        const cir = kpiByName('Aylık Ciro');
        const adet = kpiByName('Ürün Satış Adedi');
        const sepet = kpiByName('Sepet Ortalaması');
        const donusum = kpiByName('Dönüşüm Oranı');

        // Line: Aylık Ciro
        if (cirRef.current && cir?.series?.length) {
            const labels = cir.series.map((s: any) => formatPeriodLabel(s.period));
            const values = cir.series.map((s: any) => s.value);
            const c = new Chart(cirRef.current, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Ciro (₺)',
                        data: values,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.15)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#22c55e',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
                        tooltip: {
                            backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#cbd5e1',
                            padding: 12, cornerRadius: 8, displayColors: true,
                            callbacks: { label: (ctx) => `₺${Number(ctx.raw).toLocaleString('tr-TR')}` },
                        },
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => `₺${(Number(v) / 1000).toFixed(0)}K` } },
                    },
                },
            });
            chartsRef.current.push(c);
        }

        // Bar: Aylık Adet
        if (adetRef.current && adet?.series?.length) {
            const labels = adet.series.map((s: any) => formatPeriodLabel(s.period));
            const values = adet.series.map((s: any) => s.value);
            const c = new Chart(adetRef.current, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Adet',
                        data: values,
                        backgroundColor: 'rgba(59,130,246,0.7)',
                        hoverBackgroundColor: 'rgba(59,130,246,1)',
                        borderRadius: 6,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
                        tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#cbd5e1', padding: 12, cornerRadius: 8 },
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                    },
                },
            });
            chartsRef.current.push(c);
        }

        // Line: Sepet Ortalaması
        if (sepetRef.current && sepet?.series?.length) {
            const labels = sepet.series.map((s: any) => formatPeriodLabel(s.period));
            const values = sepet.series.map((s: any) => Math.round(s.value / Math.max(1, data?.stats?.totalStores || 1)));
            const c = new Chart(sepetRef.current, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Sepet Ort. (₺)',
                        data: values,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245,158,11,0.12)',
                        fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                    },
                },
            });
            chartsRef.current.push(c);
        }

        // Line: Dönüşüm Oranı
        if (donusumRef.current && donusum?.series?.length) {
            const labels = donusum.series.map((s: any) => formatPeriodLabel(s.period));
            const values = donusum.series.map((s: any) => s.value);
            const c = new Chart(donusumRef.current, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Dönüşüm (%)',
                        data: values,
                        borderColor: '#db2777',
                        backgroundColor: 'rgba(219,39,119,0.12)',
                        fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => `%${v}` } },
                    },
                },
            });
            chartsRef.current.push(c);
        }

        return () => {
            chartsRef.current.forEach(c => c.destroy());
            chartsRef.current = [];
        };
    }, [data, loading]);

    if (!session) return null;
    const user = session.user as any;
    const role = user.role;

    // EMPLOYEE keeps a simple stat view
    if (role === 'EMPLOYEE') {
        const stats = [
            { label: 'Bekleyen Eğitim', value: data?.stats?.pendingTrainings || 0, icon: 'school', color: '#6366f1' },
            { label: 'Tamamlanma %', value: `%${data?.stats?.completionRate || 0}`, icon: 'check_circle', color: '#22c55e' },
            { label: 'Sınav Başarı', value: `%${data?.stats?.quizPassRate || 0}`, icon: 'quiz', color: '#f59e0b' },
            { label: 'Geciken', value: data?.stats?.overdueTrainings || 0, icon: 'warning', color: '#ef4444' },
        ];
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="page-header">
                        <div>
                            <h1>Dashboard</h1>
                            <div className="page-header-sub">Hoş geldin, {user.firstName} 👋</div>
                        </div>
                    </div>
                    <div className="page-body">
                        {loading ? <SkeletonStats count={4} /> : (
                            <div className="stat-grid">
                                {stats.map((s, i) => (
                                    <div key={i} className="stat-card" style={{ '--stat-color': s.color } as any}>
                                        <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
                                            <span className="material-icons-outlined">{s.icon}</span>
                                        </div>
                                        <div className="stat-info">
                                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                                            <div className="stat-label">{s.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    /* ============== MANAGER DASHBOARD ============== */
    const kpiByName = (n: string) => (data?.kpis || []).find((k: any) => k.name === n);
    // (insights state lifted into component below as InsightsWidget)

    const cir = kpiByName('Aylık Ciro');
    const adet = kpiByName('Ürün Satış Adedi');
    const sepet = kpiByName('Sepet Ortalaması');
    const donusum = kpiByName('Dönüşüm Oranı');
    const memnun = kpiByName('Müşteri Memnuniyeti');
    const egitimKpi = kpiByName('Eğitim Tamamlama Oranı');
    // Excel'den gelen ek KPI'lar
    const upt = kpiByName('UPT');
    const fatura = kpiByName('Fatura Adedi');
    const ziyaretci = kpiByName('Toplam Ziyaretçi');
    const asp = kpiByName('Ortalama Satış Fiyatı');
    const tekli = kpiByName('Tekli Fatura Oranı');
    const storeCount = Math.max(1, data?.stats?.totalStores || 1);

    const target = cir?.target || 0;
    const actual = cir?.latest || 0;
    const achievement = cir?.achievement || 0;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Greeting Header */}
                <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            Hoş Geldin, {user.firstName} <span style={{ fontSize: '1.5rem' }}>👋</span>
                        </h1>
                        <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                            İşte mağazanın ve ekibinin bugünkü eğitim & performans özeti.
                        </div>
                    </div>
                    <span style={{
                        padding: '6px 14px', borderRadius: 999,
                        background: 'rgba(229,57,53,0.1)', color: '#E53935',
                        fontSize: '0.75rem', fontWeight: 700,
                    }}>
                        {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                    </span>
                </div>

                <div style={{ padding: '20px 28px 32px' }}>
                    {/* Store Filter Card */}
                    {(role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER') && data?.stores?.length > 0 && (
                        <div style={{
                            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(229,57,53,0.08)', borderRadius: 14,
                            padding: 16, marginBottom: 20,
                            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                        }}>
                            <div style={{ flex: 1, minWidth: 240 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span className="material-icons-outlined" style={{ color: '#E53935', fontSize: '1.2rem' }}>filter_alt</span>
                                    <strong style={{ fontSize: '0.95rem' }}>Genel Mağaza Filtresi</strong>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    Aşağıdaki tüm verileri seçtiğiniz mağazaya göre güncelleyin.
                                </div>
                            </div>
                            <select
                                value={filterStoreId}
                                onChange={e => setFilterStoreId(e.target.value)}
                                style={{
                                    padding: '10px 14px', borderRadius: 10,
                                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.88rem', fontWeight: 600, minWidth: 260,
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="">Tüm Mağazalar (Genel Toplam)</option>
                                {data.stores.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {loading ? (
                        <>
                            <SkeletonStats count={6} />
                            <div style={{ marginTop: 20 }}><SkeletonCard count={2} /></div>
                        </>
                    ) : (
                        <>
                            {/* KPI Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
                                {/* Ciro */}
                                {cir && <KpiCard
                                    label="Ciro (Gerçekleşen)"
                                    value={formatTL(actual)}
                                    deltaPct={cir.trendPct}
                                    icon="payments" bg="#fee2e2" iconColor="#dc2626"
                                />}
                                {/* Aylık Hedef */}
                                {cir && <KpiCard
                                    label="Aylık Hedef"
                                    value={formatTL(target)}
                                    subText="Sistem hedefi"
                                    icon="track_changes" bg="#ede9fe" iconColor="#7c3aed"
                                />}
                                {/* Hedef Gerçekleşme */}
                                {cir && <KpiCard
                                    label="Hedef Gerçekleşme"
                                    value={`%${achievement.toFixed(1)}`}
                                    subText={achievement >= 100 ? '⚡ harika' : achievement >= 80 ? '⚡ iyi gidiyor' : achievement >= 50 ? '⚠ yetersiz' : '🔴 düşük'}
                                    icon="percent" bg="#fef3c7" iconColor="#d97706"
                                />}
                                {/* Adet Satış */}
                                {adet && <KpiCard
                                    label="Adet (Satış)"
                                    value={formatNum(adet.latest)}
                                    deltaPct={adet.trendPct}
                                    icon="shopping_bag" bg="#dbeafe" iconColor="#2563eb"
                                />}
                                {/* Sepet Ort */}
                                {sepet && <KpiCard
                                    label="Sepet Ortalaması"
                                    value={formatTL(Math.round(sepet.latest / Math.max(1, data?.stats?.totalStores || 1)))}
                                    deltaPct={sepet.trendPct}
                                    icon="shopping_cart" bg="#fed7aa" iconColor="#ea580c"
                                />}
                                {/* Dönüşüm */}
                                {donusum && <KpiCard
                                    label="Müşteri Dönüşüm"
                                    value={`%${donusum.latest}`}
                                    deltaPct={donusum.trendPct}
                                    icon="trending_up" bg="#fce7f3" iconColor="#db2777"
                                />}
                                {/* Müşteri Memnuniyeti */}
                                {memnun && <KpiCard
                                    label="Müşteri Memnuniyeti"
                                    value={`%${memnun.latest}`}
                                    deltaPct={memnun.trendPct}
                                    icon="sentiment_satisfied" bg="#dcfce7" iconColor="#16a34a"
                                />}
                                {/* Eğitim Tamamlama */}
                                <KpiCard
                                    label="Eğitim Tamamlama"
                                    value={`%${data?.stats?.completionRate || 0}`}
                                    subText="Atanan eğitimler"
                                    icon="school" bg="#d1fae5" iconColor="#059669"
                                />
                            </div>

                            {/* Operasyonel KPI'lar — Excel'den (UPT, Fatura, Ziyaretçi, ASP, Tekli Fatura) */}
                            {(upt || fatura || ziyaretci || asp || tekli) && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <span className="material-icons-outlined" style={{ color: '#E53935', fontSize: '1.3rem' }}>insights</span>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                                            Operasyonel KPI'lar
                                        </h3>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                            Perakende KPI verilerinden — OCAK / ŞUBAT 2026
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
                                        {upt && <KpiCard
                                            label="UPT (Sepet Adedi)"
                                            value={(upt.latest / storeCount).toFixed(2)}
                                            subText="Mağaza ortalaması"
                                            deltaPct={upt.trendPct}
                                            icon="inventory_2" bg="#e0e7ff" iconColor="#4f46e5"
                                        />}
                                        {fatura && <KpiCard
                                            label="Fatura Adedi"
                                            value={formatNum(fatura.latest)}
                                            subText="Toplam fatura"
                                            deltaPct={fatura.trendPct}
                                            icon="receipt_long" bg="#cffafe" iconColor="#0891b2"
                                        />}
                                        {ziyaretci && <KpiCard
                                            label="Toplam Ziyaretçi"
                                            value={formatNum(ziyaretci.latest)}
                                            subText="Aylık trafik"
                                            deltaPct={ziyaretci.trendPct}
                                            icon="groups" bg="#fae8ff" iconColor="#a21caf"
                                        />}
                                        {asp && <KpiCard
                                            label="Ortalama Satış Fiyatı"
                                            value={formatTL(Math.round(asp.latest / storeCount))}
                                            subText="Ürün başına (ASP)"
                                            deltaPct={asp.trendPct}
                                            icon="sell" bg="#fee2e2" iconColor="#e11d48"
                                        />}
                                        {tekli && <KpiCard
                                            label="Tekli Fatura Oranı"
                                            value={`%${tekli.latest}`}
                                            subText="Tek ürünlü fatura"
                                            deltaPct={tekli.trendPct}
                                            icon="pie_chart" bg="#fef9c3" iconColor="#ca8a04"
                                        />}
                                    </div>
                                </>
                            )}

                            {/* AI Insights Widget — anomaliler + akıllı eğitim önerileri */}
                            <InsightsWidget />

                            {/* Org snapshot row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
                                <MiniStat label="Toplam Kullanıcı" value={data?.stats?.totalUsers || 0} icon="people" color="#6366f1" />
                                <MiniStat label="Aktif Eğitim" value={data?.stats?.activeTrainings || 0} icon="menu_book" color="#06b6d4" />
                                <MiniStat label="Sınav Başarı %" value={`%${data?.stats?.quizPassRate || 0}`} icon="quiz" color="#22c55e" />
                                <MiniStat label="Gecikmiş" value={data?.stats?.overdueTrainings || 0} icon="warning" color="#ef4444" />
                                <MiniStat label="Toplam Mağaza" value={data?.stats?.totalStores || 0} icon="store" color="#f59e0b" />
                            </div>

                            {/* Charts Row 1 */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, marginBottom: 20 }}>
                                <ChartCard title="Aylık Ciro" subtitle="Mağaza toplam satış geliri (₺)">
                                    <canvas ref={cirRef} />
                                </ChartCard>
                                <ChartCard title="Aylık Adet" subtitle="Satılan ürün adedi">
                                    <canvas ref={adetRef} />
                                </ChartCard>
                            </div>

                            {/* Charts Row 2 */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, marginBottom: 20 }}>
                                <ChartCard title="Sepet Ortalaması" subtitle="Aylık ortalama sepet tutarı (₺)">
                                    <canvas ref={sepetRef} />
                                </ChartCard>
                                <ChartCard title="Dönüşüm Oranı" subtitle="Müşteri dönüşümü (%)">
                                    <canvas ref={donusumRef} />
                                </ChartCard>
                            </div>

                            {/* Charts Row 3 — Training Performance */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 1.6fr', gap: 20, marginBottom: 20 }}>
                                <TrainingProgressCard
                                    completionRate={data?.stats?.completionRate || 0}
                                    completed={(data?.trainingByStore || []).reduce((a: number, s: any) => a + s.completed, 0)}
                                    total={(data?.trainingByStore || []).reduce((a: number, s: any) => a + s.total, 0)}
                                    overdue={data?.stats?.overdueTrainings || 0}
                                    quizPassRate={data?.stats?.quizPassRate || 0}
                                />

                                {data?.trainingByStore?.length > 0 && (
                                    <StoreLeaderboardCard stores={data.trainingByStore} />
                                )}
                            </div>

                            {/* Overdue Trainings Alert */}
                            {data?.overdueTrainingsList?.length > 0 && (
                                <div style={{
                                    background: 'var(--bg-secondary)', border: '1px solid rgba(239,68,68,0.25)',
                                    borderRadius: 14, overflow: 'hidden',
                                    boxShadow: '0 4px 16px rgba(239,68,68,0.08)',
                                }}>
                                    <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="material-icons-outlined" style={{ color: '#dc2626' }}>warning</span>
                                        <strong style={{ color: '#dc2626' }}>Gecikmiş Eğitimler</strong>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                            Acil eylem gerekiyor
                                        </span>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                                                <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Çalışan</th>
                                                <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Eğitim</th>
                                                <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.overdueTrainingsList.map((item: any) => (
                                                <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '12px 18px', fontSize: '0.85rem' }}>{item.user.firstName} {item.user.lastName}</td>
                                                    <td style={{ padding: '12px 18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.training.title}</td>
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700 }}>Gecikmiş</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

/* ====== AI Insights Widget — compact dashboard banner ====== */
function InsightsWidget() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/insights/anomalies')
            .then(r => r.json())
            .then(d => setData(d))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return null;
    const anomalies = data?.anomalies || [];
    const summary = data?.summary || {};
    const top3 = anomalies.slice(0, 3);

    return (
        <div className="cine-fadeInUp" style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.04))',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: 16, padding: 18, marginBottom: 22,
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Glow decoration */}
            <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 120, height: 120, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: anomalies.length > 0 ? 14 : 0 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                }}>
                    <span className="material-icons-outlined">auto_awesome</span>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1rem', color: '#7c3aed' }}>AI İçgörüler</strong>
                        <span style={{
                            padding: '2px 8px', borderRadius: 999,
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff', fontSize: '0.65rem', fontWeight: 800, letterSpacing: 0.5,
                        }}>YENİ</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {anomalies.length === 0
                            ? '✅ Tüm mağazalarınız stabil performans gösteriyor — anomali tespit edilmedi.'
                            : `🔍 Son dönemde ${summary.total} KPI anomalisi tespit edildi (${summary.high} yüksek, ${summary.medium} orta). ${summary.affectedStores} mağaza etkilendi.`}
                    </div>
                </div>
                <a
                    href="/insights"
                    style={{
                        padding: '8px 14px',
                        background: 'var(--bg-secondary)',
                        color: '#8b5cf6', textDecoration: 'none',
                        borderRadius: 10, fontSize: '0.82rem', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        flexShrink: 0,
                    }}
                >
                    Detaylar
                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
                </a>
            </div>

            {/* Top 3 anomaly preview */}
            {top3.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {top3.map((a: any, idx: number) => {
                        const sev = a.severity === 'HIGH' ? '#dc2626' : a.severity === 'MEDIUM' ? '#d97706' : '#0891b2';
                        return (
                            <div key={idx} style={{
                                padding: 12, borderRadius: 10,
                                background: 'var(--bg-secondary)',
                                border: `1px solid ${sev}33`,
                                borderLeftWidth: 3, borderLeftColor: sev,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {a.storeName.replace(' Sporthink Mağaza', '').replace(' Mağaza', '')}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: sev }}>
                                        {a.changePct > 0 ? '+' : ''}{a.changePct.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                    {a.kpiName} • {a.severity === 'HIGH' ? 'Yüksek' : a.severity === 'MEDIUM' ? 'Orta' : 'Düşük'} risk
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ====== Sub-components ====== */
function KpiCard({ label, value, deltaPct, subText, icon, bg, iconColor }: {
    label: string; value: string; deltaPct?: number; subText?: string;
    icon: string; bg: string; iconColor: string;
}) {
    const up = (deltaPct ?? 0) >= 0;
    return (
        <div style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(229,57,53,0.06)', borderRadius: 14,
            padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        }}
        onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: bg, color: iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <span className="material-icons-outlined" style={{ fontSize: '1.5rem' }}>{icon}</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-primary)' }}>{value}</div>
                {deltaPct !== undefined ? (
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: up ? '#16a34a' : '#dc2626', marginTop: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: '0.85rem' }}>{up ? '↑' : '↓'}</span>
                        {up ? '+' : ''}%{Math.abs(deltaPct).toFixed(1)}
                    </div>
                ) : subText ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{subText}</div>
                ) : null}
            </div>
        </div>
    );
}

function MiniStat({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
    return (
        <div style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.04)', borderRadius: 12,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}18`, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <span className="material-icons-outlined" style={{ fontSize: '1.15rem' }}>{icon}</span>
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{value}</div>
            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(229,57,53,0.06)', borderRadius: 14,
            padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E53935', margin: 0 }}>{title}</h3>
                    {subtitle && <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
                </div>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>
                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>more_horiz</span>
                </button>
            </div>
            <div style={{ height: 260 }}>{children}</div>
        </div>
    );
}

function TrainingProgressCard({ completionRate, completed, total, overdue, quizPassRate }: {
    completionRate: number; completed: number; total: number; overdue: number; quizPassRate: number;
}) {
    const size = 200;
    const stroke = 16;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (completionRate / 100) * c;
    const tier = completionRate >= 80 ? { from: '#22c55e', to: '#16a34a', label: 'Mükemmel' }
        : completionRate >= 50 ? { from: '#f59e0b', to: '#d97706', label: 'İyi gidiyor' }
            : { from: '#ef4444', to: '#dc2626', label: 'Dikkat gerekli' };

    return (
        <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            border: '1px solid rgba(229,57,53,0.06)', borderRadius: 14,
            padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${tier.from}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, position: 'relative' }}>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E53935', margin: 0 }}>Eğitim Tamamlanma</h3>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>Genel performans özeti</div>
                </div>
                <span style={{
                    padding: '4px 10px', borderRadius: 999,
                    background: `${tier.from}1a`, color: tier.from,
                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: 0.3,
                }}>
                    {tier.label}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', height: size + 10 }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <defs>
                        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={tier.from} />
                            <stop offset="100%" stopColor={tier.to} />
                        </linearGradient>
                    </defs>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f3" strokeWidth={stroke} />
                    <circle
                        cx={size / 2} cy={size / 2} r={r} fill="none"
                        stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={`${dash} ${c}`}
                        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)' }}
                    />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: tier.from, lineHeight: 1 }}>%{completionRate}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>TAMAMLANMA</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 }}>
                <ProgressStat icon="check_circle" label="Tamamlanan" value={completed} color="#22c55e" />
                <ProgressStat icon="schedule" label="Devam Eden" value={Math.max(0, total - completed - overdue)} color="#3b82f6" />
                <ProgressStat icon="warning" label="Geciken" value={overdue} color="#ef4444" />
            </div>

            <div style={{
                marginTop: 14, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(229,57,53,0.05)', border: '1px solid rgba(229,57,53,0.1)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <span className="material-icons-outlined" style={{ color: '#E53935', fontSize: '1.1rem' }}>quiz</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sınav Başarı Oranı</div>
                    <div style={{ fontSize: '0.95rem', color: '#E53935', fontWeight: 700 }}>%{quizPassRate}</div>
                </div>
            </div>
        </div>
    );
}

function ProgressStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    return (
        <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 8px', textAlign: 'center',
        }}>
            <div style={{
                width: 30, height: 30, borderRadius: 8, margin: '0 auto 6px',
                background: `${color}22`, color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{icon}</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600 }}>{label}</div>
        </div>
    );
}

function StoreLeaderboardCard({ stores }: { stores: any[] }) {
    const [tab, setTab] = useState<'top' | 'flop'>('top');
    const sorted = [...stores].sort((a, b) => b.completionRate - a.completionRate);
    const list = tab === 'top' ? sorted.slice(0, 8) : sorted.slice(-5).reverse();
    const avg = stores.length > 0 ? Math.round(stores.reduce((a, s) => a + s.completionRate, 0) / stores.length) : 0;

    const colorFor = (pct: number) =>
        pct >= 80 ? { from: '#22c55e', to: '#16a34a', bg: 'rgba(34,197,94,0.08)' }
            : pct >= 50 ? { from: '#f59e0b', to: '#d97706', bg: 'rgba(245,158,11,0.08)' }
                : { from: '#ef4444', to: '#dc2626', bg: 'rgba(239,68,68,0.08)' };

    const rankBadge = (idx: number) => {
        if (tab !== 'top') return null;
        if (idx === 0) return { emoji: '🥇', bg: 'linear-gradient(135deg, #fde047, #facc15)' };
        if (idx === 1) return { emoji: '🥈', bg: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)' };
        if (idx === 2) return { emoji: '🥉', bg: 'linear-gradient(135deg, #fdba74, #fb923c)' };
        return null;
    };

    return (
        <div style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(229,57,53,0.06)', borderRadius: 14,
            padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E53935', margin: 0 }}>Mağaza Sıralaması</h3>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {stores.length} mağaza • Ortalama %{avg}
                    </div>
                </div>
                <div style={{ display: 'inline-flex', background: 'var(--bg-tertiary)', borderRadius: 8, padding: 3 }}>
                    <button onClick={() => setTab('top')} style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: tab === 'top' ? 'var(--bg-secondary)' : 'transparent',
                        color: tab === 'top' ? '#E53935' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                        boxShadow: tab === 'top' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    }}>🔝 En İyiler</button>
                    <button onClick={() => setTab('flop')} style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: tab === 'flop' ? 'var(--bg-secondary)' : 'transparent',
                        color: tab === 'flop' ? '#E53935' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                        boxShadow: tab === 'flop' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    }}>⚠️ Geride Kalanlar</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {list.map((s, idx) => {
                    const col = colorFor(s.completionRate);
                    const badge = rankBadge(idx);
                    return (
                        <div key={s.storeName} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: 10,
                            background: badge ? col.bg : 'var(--bg-secondary)',
                            border: `1px solid ${badge ? col.from + '30' : 'var(--border)'}`,
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: badge ? badge.bg : 'var(--bg-tertiary)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: badge ? '1.1rem' : '0.85rem', fontWeight: 800,
                                color: badge ? '#fff' : 'var(--text-secondary)', flexShrink: 0,
                            }}>
                                {badge ? badge.emoji : `#${idx + 1}`}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4,
                                }}>{s.storeName}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${s.completionRate}%`,
                                            background: `linear-gradient(90deg, ${col.from}, ${col.to})`,
                                            borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {s.completed}/{s.total}
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                fontSize: '1.05rem', fontWeight: 800, color: col.from,
                                minWidth: 56, textAlign: 'right',
                            }}>
                                %{s.completionRate}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
