import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const role = user.role;
    const storeId = user.storeId;
    const regionId = user.regionId;

    // Optional storeId filter (Super Admin / Regional Manager can pick a specific store)
    const { searchParams } = new URL(req.url);
    const filterStoreId = searchParams.get('storeId') || '';

    // Build where clauses based on role scope
    const userWhere: any = {};
    const assignmentWhere: any = {};
    const feedbackWhere: any = {};
    const kpiEntryWhere: any = {};

    if (role === 'REGIONAL_MANAGER') {
        userWhere.regionId = regionId;
        assignmentWhere.user = { regionId };
        feedbackWhere.store = { regionId };
        kpiEntryWhere.store = { regionId };
    } else if (role === 'STORE_MANAGER' || role === 'ASSISTANT_MANAGER') {
        userWhere.storeId = storeId;
        assignmentWhere.user = { storeId };
        feedbackWhere.storeId = storeId;
        kpiEntryWhere.storeId = storeId;
    } else if (role === 'EMPLOYEE') {
        assignmentWhere.userId = user.id;
        feedbackWhere.submittedById = user.id;
    }

    // Apply optional store filter on top (for SA/RM dashboard drill-down)
    if (filterStoreId && (role === 'SUPER_ADMIN' || role === 'REGIONAL_MANAGER')) {
        userWhere.storeId = filterStoreId;
        assignmentWhere.user = { ...(assignmentWhere.user || {}), storeId: filterStoreId };
        feedbackWhere.storeId = filterStoreId;
        kpiEntryWhere.storeId = filterStoreId;
    }

    const [
        totalUsers,
        activeTrainings,
        assignments,
        completedAssignments,
        overdueAssignments,
        openFeedback,
        quizAttempts,
        passedAttempts,
    ] = await Promise.all([
        prisma.user.count({ where: { ...userWhere, isActive: true } }),
        prisma.training.count({ where: { status: 'ACTIVE' } }),
        prisma.trainingAssignment.count({ where: assignmentWhere }),
        prisma.trainingAssignment.count({ where: { ...assignmentWhere, status: 'COMPLETED' } }),
        prisma.trainingAssignment.count({ where: { ...assignmentWhere, status: 'OVERDUE' } }),
        prisma.feedback.count({ where: { ...feedbackWhere, status: { notIn: ['IMPLEMENTED', 'CLOSED'] } } }),
        prisma.quizAttempt.count({ where: role === 'EMPLOYEE' ? { userId: user.id } : {} }),
        prisma.quizAttempt.count({ where: { ...(role === 'EMPLOYEE' ? { userId: user.id } : {}), passed: true } }),
    ]);

    const completionRate = assignments > 0 ? Math.round((completedAssignments / assignments) * 100) : 0;
    const quizPassRate = quizAttempts > 0 ? Math.round((passedAttempts / quizAttempts) * 100) : 0;

    // Total stores count
    const totalStores = await prisma.store.count({
        where: role === 'REGIONAL_MANAGER' ? { regionId } : (role === 'STORE_MANAGER') ? { id: storeId } : {},
    });

    // Training completion by store (for admin/RM)
    let trainingByStore: any[] = [];
    if (role !== 'EMPLOYEE') {
        const stores = await prisma.store.findMany({
            where: role === 'REGIONAL_MANAGER' ? { regionId } : (role === 'STORE_MANAGER' || role === 'ASSISTANT_MANAGER') ? { id: storeId } : {},
            include: {
                users: {
                    include: {
                        trainingAssignments: { select: { status: true } },
                    },
                },
            },
        });

        trainingByStore = stores.map(store => {
            const allAssignments = store.users.flatMap(u => u.trainingAssignments);
            const completed = allAssignments.filter(a => a.status === 'COMPLETED').length;
            const total = allAssignments.length;
            return {
                storeName: store.name,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                total,
                completed,
            };
        });
    }

    // Overdue trainings
    const overdueTrainings = await prisma.trainingAssignment.findMany({
        where: { ...assignmentWhere, status: 'OVERDUE' },
        take: 5,
        include: {
            training: { select: { title: true } },
            user: { select: { firstName: true, lastName: true } },
        },
    });

    // =====================================================================
    // KPI AGGREGATIONS (manager dashboard)
    // =====================================================================
    let kpis: any[] = [];
    let stores: any[] = [];
    if (role !== 'EMPLOYEE') {
        const [defs, entries] = await Promise.all([
            prisma.kpiDefinition.findMany({ where: { isActive: true } }),
            prisma.kpiEntry.findMany({
                where: kpiEntryWhere,
                orderBy: { period: 'asc' },
                select: { kpiDefinitionId: true, period: true, value: true, storeId: true },
            }),
        ]);

        // Distinct sorted periods across all entries
        const periodSet = new Set<string>();
        entries.forEach(e => periodSet.add(e.period));
        const periods = Array.from(periodSet).sort();
        const latestPeriod = periods[periods.length - 1] || '';
        const prevPeriod = periods[periods.length - 2] || '';

        kpis = defs.map(def => {
            // Sum (or avg for %) per period across stores in scope
            const byPeriod: Record<string, { sum: number; count: number }> = {};
            entries.filter(e => e.kpiDefinitionId === def.id).forEach(e => {
                if (!byPeriod[e.period]) byPeriod[e.period] = { sum: 0, count: 0 };
                byPeriod[e.period].sum += e.value;
                byPeriod[e.period].count++;
            });
            const isPercent = def.unit === '%';
            const series = periods.map(p => {
                const b = byPeriod[p];
                if (!b) return { period: p, value: 0 };
                return { period: p, value: isPercent ? Math.round(b.sum / b.count) : b.sum };
            });
            const latest = series.find(s => s.period === latestPeriod)?.value || 0;
            const prev = series.find(s => s.period === prevPeriod)?.value || 0;
            const trendPct = prev > 0 ? Math.round(((latest - prev) / prev) * 1000) / 10 : 0;
            // Target: per-store target * store count for non-% KPIs, raw target for %
            const storeCount = filterStoreId ? 1 : Math.max(1, totalStores);
            const baseTarget = def.targetValue ?? 0;
            const target = isPercent ? baseTarget : baseTarget * storeCount;
            const achievement = target > 0 ? Math.round((latest / target) * 1000) / 10 : 0;
            return {
                id: def.id,
                name: def.name,
                unit: def.unit,
                target,
                latest,
                prev,
                trendPct,
                achievement,
                series,
            };
        });

        // Stores list for filter dropdown
        const storeQuery: any = {};
        if (role === 'REGIONAL_MANAGER') storeQuery.regionId = regionId;
        else if (role === 'STORE_MANAGER' || role === 'ASSISTANT_MANAGER') storeQuery.id = storeId;
        stores = await prisma.store.findMany({ where: storeQuery, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    }

    return NextResponse.json({
        stats: {
            totalUsers,
            activeTrainings,
            completionRate,
            totalStores,
            overdueTrainings: overdueAssignments,
            quizPassRate,
            pendingTrainings: assignments - completedAssignments,
        },
        trainingByStore,
        overdueTrainingsList: overdueTrainings,
        kpis,
        stores,
        filterStoreId,
    });
}
