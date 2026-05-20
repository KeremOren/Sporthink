import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const viewStoreId = searchParams.get('storeId');
    const period = searchParams.get('period'); // e.g. "2026-02"

    // Determine scope based on role
    let storeFilter: any = {};
    if (user.role === 'EMPLOYEE' || user.role === 'STORE_MANAGER' || user.role === 'ASSISTANT_MANAGER') {
        storeFilter = { storeId: user.storeId };
    } else if (user.role === 'REGIONAL_MANAGER') {
        if (viewStoreId) {
            storeFilter = { storeId: viewStoreId };
        } else {
            storeFilter = { store: { regionId: user.regionId } };
        }
    } else if (user.role === 'SUPER_ADMIN') {
        if (viewStoreId) storeFilter = { storeId: viewStoreId };
    }

    // Get all KPI definitions
    const kpiDefinitions = await prisma.kpiDefinition.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    // Get KPI entries with store info
    const kpiEntries = await prisma.kpiEntry.findMany({
        where: {
            ...storeFilter,
            ...(period ? { period } : {}),
        },
        include: {
            kpiDefinition: true,
            store: { select: { id: true, name: true } },
        },
        orderBy: { period: 'desc' },
    });

    // Group by store for consolidated view
    const storePerformance: Record<string, any> = {};
    kpiEntries.forEach(entry => {
        const storeId = entry.storeId || 'unknown';
        const storeName = entry.store?.name || 'Bilinmeyen';
        if (!storePerformance[storeId]) {
            storePerformance[storeId] = { storeId, storeName, kpis: {}, periods: new Set() };
        }
        storePerformance[storeId].periods.add(entry.period);

        const defId = entry.kpiDefinitionId;
        if (!storePerformance[storeId].kpis[defId]) {
            storePerformance[storeId].kpis[defId] = {
                name: entry.kpiDefinition.name,
                unit: entry.kpiDefinition.unit,
                targetValue: entry.kpiDefinition.targetValue,
                entries: [],
            };
        }
        storePerformance[storeId].kpis[defId].entries.push({
            period: entry.period,
            value: entry.value,
            notes: entry.notes,
        });
    });

    // Convert sets to arrays and calculate summaries
    const storeData = Object.values(storePerformance).map((store: any) => {
        store.periods = [...store.periods].sort().reverse();
        // Calculate latest period summary
        const latestPeriod = store.periods[0];
        const latestKpis = Object.values(store.kpis).map((kpi: any) => {
            const latestEntry = kpi.entries.find((e: any) => e.period === latestPeriod);
            const previousEntry = kpi.entries.find((e: any) => e.period === store.periods[1]);
            const achievement = kpi.targetValue > 0 && latestEntry
                ? Math.round((latestEntry.value / kpi.targetValue) * 100)
                : null;
            const trend = latestEntry && previousEntry
                ? Math.round(((latestEntry.value - previousEntry.value) / previousEntry.value) * 100)
                : null;
            return {
                name: kpi.name,
                unit: kpi.unit,
                targetValue: kpi.targetValue,
                currentValue: latestEntry?.value || 0,
                previousValue: previousEntry?.value || null,
                achievement,
                trend,
                entries: kpi.entries.sort((a: any, b: any) => a.period.localeCompare(b.period)),
            };
        });
        return {
            storeId: store.storeId,
            storeName: store.storeName,
            latestPeriod,
            kpis: latestKpis,
        };
    });

    // Get available stores for filter (based on role)
    let storesForFilter: any[] = [];
    if (user.role === 'SUPER_ADMIN') {
        storesForFilter = await prisma.store.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
    } else if (user.role === 'REGIONAL_MANAGER') {
        storesForFilter = await prisma.store.findMany({ where: { regionId: user.regionId }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    }

    // Available periods
    const allPeriods = [...new Set(kpiEntries.map(e => e.period))].sort().reverse();

    // Calculate Training Completion Rate per store (new KPI)
    for (const store of storeData) {
        const storeAssignments = await prisma.trainingAssignment.findMany({
            where: { user: { storeId: store.storeId } },
            select: { status: true },
        });
        const totalAssign = storeAssignments.length;
        const completedAssign = storeAssignments.filter(a => a.status === 'COMPLETED').length;
        const trainingCompRate = totalAssign > 0 ? Math.round((completedAssign / totalAssign) * 100) : 0;

        store.kpis.push({
            name: 'Eğitim Tamamlama Oranı',
            unit: '%',
            targetValue: 80,
            currentValue: trainingCompRate,
            previousValue: null,
            achievement: Math.round((trainingCompRate / 80) * 100),
            trend: null,
            entries: [],
        });
    }

    return NextResponse.json({
        stores: storeData,
        kpiDefinitions: kpiDefinitions.map(d => ({ id: d.id, name: d.name, unit: d.unit, targetValue: d.targetValue })),
        availableStores: storesForFilter,
        availablePeriods: allPeriods,
        userRole: user.role,
    });
}
