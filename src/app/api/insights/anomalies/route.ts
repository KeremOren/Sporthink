import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Anomali Tespiti API
 *
 * Her KPI için son 2 dönemi karşılaştırır:
 *  - En son dönem değeri vs Bir önceki dönemin değeri
 *  - Yüzdesel değişim hesaplanır
 *  - Eşik (% düşüş) aşan KPI'lar anomaly olarak işaretlenir
 *
 * Çıktı: Her mağaza × KPI için anomaly listesi (severity HIGH/MEDIUM/LOW).
 */

// KPI bazlı eşikler (düşüş %): Bu KPI hangi % düşüşte anomaly sayılır?
const ANOMALY_THRESHOLDS: Record<string, { medium: number; high: number; direction: 'down' | 'up' }> = {
    'Aylık Ciro':              { medium: 10, high: 20, direction: 'down' },
    'Ürün Satış Adedi':        { medium: 10, high: 20, direction: 'down' },
    'Sepet Ortalaması':        { medium: 8, high: 15, direction: 'down' },
    'Dönüşüm Oranı':           { medium: 15, high: 30, direction: 'down' },
    'UPT':                     { medium: 10, high: 20, direction: 'down' },
    'Hedef Gerçekleşme Oranı': { medium: 10, high: 20, direction: 'down' },
    'Müşteri Memnuniyeti':     { medium: 5, high: 10, direction: 'down' },
    'Tekli Fatura Oranı':      { medium: 8, high: 15, direction: 'up' }, // Yüksek = kötü (çapraz satış yok)
};

// KPI → düşüş için tavsiye edilen eğitim kategorisi
const KPI_TRAINING_HINT: Record<string, string> = {
    'Aylık Ciro':              'Satış',
    'Ürün Satış Adedi':        'Satış',
    'Sepet Ortalaması':        'Satış',
    'Dönüşüm Oranı':           'Satış',
    'UPT':                     'Satış',
    'Hedef Gerçekleşme Oranı': 'Satış',
    'Müşteri Memnuniyeti':     'Satış',
    'Tekli Fatura Oranı':      'Satış',
};

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const role = user.role;

    // Scope based on role
    const storeWhere: any = {};
    if (role === 'REGIONAL_MANAGER') storeWhere.regionId = user.regionId;
    else if (role === 'STORE_MANAGER' || role === 'ASSISTANT_MANAGER') storeWhere.id = user.storeId;

    // Get all stores in scope
    const stores = await prisma.store.findMany({ where: storeWhere, select: { id: true, name: true, regionId: true } });

    // Get all KPI definitions we care about (those in ANOMALY_THRESHOLDS)
    const kpiNames = Object.keys(ANOMALY_THRESHOLDS);
    const defs = await prisma.kpiDefinition.findMany({
        where: { name: { in: kpiNames }, isActive: true },
    });

    // Get all entries for these KPIs across scoped stores
    const storeIds = stores.map(s => s.id);
    const entries = await prisma.kpiEntry.findMany({
        where: {
            kpiDefinitionId: { in: defs.map(d => d.id) },
            storeId: { in: storeIds },
        },
        orderBy: { period: 'asc' },
        select: { storeId: true, kpiDefinitionId: true, period: true, value: true },
    });

    // Group by store × KPI
    const storeMap = new Map(stores.map(s => [s.id, s]));
    const defMap = new Map(defs.map(d => [d.id, d]));

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

    const anomalies: Anomaly[] = [];

    // Group entries by (storeId, kpiDefId)
    const groups: Record<string, Array<{ period: string; value: number }>> = {};
    for (const e of entries) {
        const key = `${e.storeId}__${e.kpiDefinitionId}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ period: e.period, value: e.value });
    }

    for (const [key, series] of Object.entries(groups)) {
        const [storeId, kpiDefId] = key.split('__');
        const store = storeMap.get(storeId);
        const def = defMap.get(kpiDefId);
        if (!store || !def) continue;

        // Sort and take last 2 periods
        series.sort((a, b) => a.period.localeCompare(b.period));
        if (series.length < 2) continue;

        const latest = series[series.length - 1];
        const prev = series[series.length - 2];
        if (prev.value === 0) continue;

        const changePct = ((latest.value - prev.value) / prev.value) * 100;
        const thr = ANOMALY_THRESHOLDS[def.name];
        if (!thr) continue;

        // Direction check
        let isAnomaly = false;
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (thr.direction === 'down') {
            const drop = -changePct; // pozitif = düşüş
            if (drop >= thr.high) { isAnomaly = true; severity = 'HIGH'; }
            else if (drop >= thr.medium) { isAnomaly = true; severity = 'MEDIUM'; }
        } else {
            const rise = changePct;
            if (rise >= thr.high) { isAnomaly = true; severity = 'HIGH'; }
            else if (rise >= thr.medium) { isAnomaly = true; severity = 'MEDIUM'; }
        }

        if (!isAnomaly) continue;

        anomalies.push({
            storeId: store.id,
            storeName: store.name,
            kpiName: def.name,
            kpiUnit: def.unit || '',
            latestPeriod: latest.period,
            prevPeriod: prev.period,
            latestValue: latest.value,
            prevValue: prev.value,
            changePct: Math.round(changePct * 10) / 10,
            severity,
            direction: thr.direction,
            hint: KPI_TRAINING_HINT[def.name] || 'Satış',
        });
    }

    // Sort: HIGH > MEDIUM, then by abs(changePct) descending
    const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    anomalies.sort((a, b) => {
        if (severityRank[b.severity] !== severityRank[a.severity]) return severityRank[b.severity] - severityRank[a.severity];
        return Math.abs(b.changePct) - Math.abs(a.changePct);
    });

    // Summary counts
    const summary = {
        total: anomalies.length,
        high: anomalies.filter(a => a.severity === 'HIGH').length,
        medium: anomalies.filter(a => a.severity === 'MEDIUM').length,
        affectedStores: new Set(anomalies.map(a => a.storeId)).size,
    };

    return NextResponse.json({ anomalies, summary });
}
