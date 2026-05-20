import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // === 1. Training Completion Trend (monthly) ===
        const assignments = await prisma.trainingAssignment.findMany({
            select: { status: true, createdAt: true, completedAt: true },
        });

        // Group by month
        const monthlyTrend: Record<string, { total: number; completed: number }> = {};
        for (let m = 5; m >= 0; m--) {
            const d = new Date();
            d.setMonth(d.getMonth() - m);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyTrend[key] = { total: 0, completed: 0 };
        }
        for (const a of assignments) {
            const key = `${a.createdAt.getFullYear()}-${String(a.createdAt.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyTrend[key]) {
                monthlyTrend[key].total++;
                if (a.status === 'COMPLETED') monthlyTrend[key].completed++;
            }
        }
        const trainingTrend = Object.entries(monthlyTrend).map(([period, data]) => ({
            period,
            total: data.total,
            completed: data.completed,
            rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        }));

        // === 2. Store Performance Scorecard ===
        const storesData = await prisma.store.findMany({
            include: {
                region: true,
                users: { select: { id: true } },
                kpiEntries: {
                    where: { kpiDefinition: { name: 'Aylık Satış Hedefi' } },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { kpiDefinition: true },
                },
                feedback: { select: { id: true, status: true } },
            },
        });

        const storeAssignments = await prisma.trainingAssignment.findMany({
            include: { user: { select: { storeId: true } } },
        });

        const scorecard = storesData.map(store => {
            const storeA = storeAssignments.filter(a => a.user.storeId === store.id);
            const completed = storeA.filter(a => a.status === 'COMPLETED').length;
            const total = storeA.length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            const latestSales = store.kpiEntries[0]?.value || 0;
            const salesTarget = store.kpiEntries[0]?.kpiDefinition?.targetValue || 500000;
            const salesRate = salesTarget > 0 ? Math.round((latestSales / salesTarget) * 100) : 0;

            const openFeedback = store.feedback.filter(f => !['CLOSED', 'IMPLEMENTED'].includes(f.status)).length;

            // Score: weighted average
            const score = Math.round(completionRate * 0.4 + salesRate * 0.4 + Math.max(0, 100 - openFeedback * 20) * 0.2);

            return {
                id: store.id,
                name: store.name,
                region: store.region.name,
                employeeCount: store.users.length,
                completionRate,
                salesRate,
                latestSales,
                openFeedback,
                score,
                status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'warning' : 'critical',
            };
        });

        // === 3. KPI Trends (all KPIs, 6 months, all stores) ===
        const kpiDefinitions = await prisma.kpiDefinition.findMany();
        const kpiEntries = await prisma.kpiEntry.findMany({
            include: { store: true, kpiDefinition: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by KPI → period → average across stores
        const kpiTrends = kpiDefinitions.map(kpi => {
            const entries = kpiEntries.filter(e => e.kpiDefinitionId === kpi.id);
            const byPeriod: Record<string, number[]> = {};
            for (const e of entries) {
                if (!byPeriod[e.period]) byPeriod[e.period] = [];
                byPeriod[e.period].push(e.value);
            }
            const data = Object.entries(byPeriod)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([period, values]) => ({
                    period,
                    avg: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
                    min: Math.min(...values),
                    max: Math.max(...values),
                }));
            return {
                id: kpi.id,
                name: kpi.name,
                unit: kpi.unit,
                target: kpi.targetValue,
                data,
            };
        });

        // === 4. Cross Analysis: Training Completion vs KPI Performance per store ===
        const crossAnalysis = storesData.map(store => {
            const storeA = storeAssignments.filter(a => a.user.storeId === store.id);
            const completionRate = storeA.length > 0
                ? Math.round((storeA.filter(a => a.status === 'COMPLETED').length / storeA.length) * 100)
                : 0;

            // Get average sales performance for this store
            const salesEntries = kpiEntries.filter(e => e.storeId === store.id && e.kpiDefinition.name === 'Aylık Satış Hedefi');
            const avgSales = salesEntries.length > 0
                ? Math.round(salesEntries.reduce((s, e) => s + e.value, 0) / salesEntries.length)
                : 0;

            // Get average customer satisfaction
            const satEntries = kpiEntries.filter(e => e.storeId === store.id && e.kpiDefinition.name === 'Müşteri Memnuniyeti');
            const avgSatisfaction = satEntries.length > 0
                ? Math.round((satEntries.reduce((s, e) => s + e.value, 0) / satEntries.length) * 10) / 10
                : 0;

            return {
                store: store.name,
                completionRate,
                avgSales,
                avgSatisfaction,
            };
        });

        // === 5. Forecast (simple linear regression on training completion) ===
        const trendValues = trainingTrend.map(t => t.rate);
        let forecast = 0;
        if (trendValues.length >= 2) {
            const n = trendValues.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            for (let i = 0; i < n; i++) {
                sumX += i;
                sumY += trendValues[i];
                sumXY += i * trendValues[i];
                sumX2 += i * i;
            }
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            forecast = Math.round(Math.min(100, Math.max(0, slope * n + intercept)));
        }

        // === 6. Quiz Performance Summary ===
        const quizAttempts = await prisma.quizAttempt.findMany({
            include: { quiz: { select: { title: true } } },
        });

        const quizPerformance: Record<string, { title: string; scores: number[]; passed: number; total: number }> = {};
        for (const qa of quizAttempts) {
            const key = qa.quizId;
            if (!quizPerformance[key]) quizPerformance[key] = { title: qa.quiz.title, scores: [], passed: 0, total: 0 };
            if (qa.score != null) quizPerformance[key].scores.push(qa.score);
            if (qa.passed) quizPerformance[key].passed++;
            quizPerformance[key].total++;
        }

        const quizStats = Object.values(quizPerformance).map(q => ({
            title: q.title,
            avgScore: q.scores.length > 0 ? Math.round((q.scores.reduce((s, v) => s + v, 0) / q.scores.length) * 10) / 10 : 0,
            passRate: q.total > 0 ? Math.round((q.passed / q.total) * 100) : 0,
            totalAttempts: q.total,
        }));

        // === 7. Region Summary ===
        const regions = await prisma.region.findMany({ include: { stores: true, users: true } });
        const regionSummary = regions.map(r => {
            const regionStoreIds = r.stores.map(s => s.id);
            const regionAssignments = storeAssignments.filter(a => regionStoreIds.includes(a.user.storeId || ''));
            const regionCompleted = regionAssignments.filter(a => a.status === 'COMPLETED').length;

            return {
                name: r.name,
                storeCount: r.stores.length,
                employeeCount: r.users.length,
                completionRate: regionAssignments.length > 0 ? Math.round((regionCompleted / regionAssignments.length) * 100) : 0,
            };
        });

        return NextResponse.json({
            trainingTrend,
            scorecard,
            kpiTrends,
            crossAnalysis,
            forecast,
            quizStats,
            regionSummary,
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
