import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'training-completion';

    const assignmentWhere: any = {};
    const feedbackWhere: any = {};
    if (user.role === 'REGIONAL_MANAGER') {
        assignmentWhere.user = { regionId: user.regionId };
        feedbackWhere.store = { regionId: user.regionId };
    } else if (user.role === 'STORE_MANAGER' || user.role === 'ASSISTANT_MANAGER') {
        assignmentWhere.user = { storeId: user.storeId };
        feedbackWhere.storeId = user.storeId;
    }

    if (reportType === 'training-completion') {
        const stores = await prisma.store.findMany({
            where: user.role === 'REGIONAL_MANAGER' ? { regionId: user.regionId } : (user.role === 'STORE_MANAGER' || user.role === 'ASSISTANT_MANAGER') ? { id: user.storeId } : {},
            include: { region: { select: { name: true } } },
        });

        const storeData = await Promise.all(stores.map(async (store) => {
            const total = await prisma.trainingAssignment.count({ where: { user: { storeId: store.id } } });
            const completed = await prisma.trainingAssignment.count({ where: { user: { storeId: store.id }, status: 'COMPLETED' } });
            const overdue = await prisma.trainingAssignment.count({ where: { user: { storeId: store.id }, status: 'OVERDUE' } });
            return { storeName: store.name, regionName: store.region.name, total, completed, overdue, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
        }));

        return NextResponse.json({ type: 'training-completion', data: storeData });
    }

    if (reportType === 'quiz-stats') {
        const attempts = await prisma.quizAttempt.findMany({
            where: user.role !== 'SUPER_ADMIN' ? { user: user.role === 'REGIONAL_MANAGER' ? { regionId: user.regionId } : { storeId: user.storeId } } : {},
            include: { quiz: { select: { title: true, passScore: true } }, user: { select: { firstName: true, lastName: true } } },
        });

        const quizGroups: any = {};
        attempts.forEach(a => {
            if (!quizGroups[a.quizId]) quizGroups[a.quizId] = { title: a.quiz.title, attempts: 0, passed: 0, totalScore: 0 };
            quizGroups[a.quizId].attempts++;
            if (a.passed) quizGroups[a.quizId].passed++;
            quizGroups[a.quizId].totalScore += a.score || 0;
        });

        const data = Object.values(quizGroups).map((g: any) => ({
            ...g, passRate: Math.round((g.passed / g.attempts) * 100), avgScore: Math.round(g.totalScore / g.attempts),
        }));

        return NextResponse.json({ type: 'quiz-stats', data });
    }

    if (reportType === 'kpi-performance') {
        const entries = await prisma.kpiEntry.findMany({
            where: user.role === 'REGIONAL_MANAGER' ? { store: { regionId: user.regionId } } : (user.role === 'STORE_MANAGER' || user.role === 'ASSISTANT_MANAGER') ? { storeId: user.storeId } : {},
            include: { kpiDefinition: true, store: { select: { name: true } } },
            orderBy: { period: 'desc' },
        });

        return NextResponse.json({ type: 'kpi-performance', data: entries });
    }

    if (reportType === 'feedback-analytics') {
        const [total, byStatus, byType] = await Promise.all([
            prisma.feedback.count({ where: feedbackWhere }),
            prisma.feedback.groupBy({ by: ['status'], where: feedbackWhere, _count: true }),
            prisma.feedback.groupBy({ by: ['type'], where: feedbackWhere, _count: true }),
        ]);

        // Calculate avg resolution time
        const closedItems = await prisma.feedback.findMany({
            where: { ...feedbackWhere, closedAt: { not: null } },
            select: { createdAt: true, closedAt: true },
        });

        let avgResolutionDays = 0;
        if (closedItems.length > 0) {
            const totalDays = closedItems.reduce((sum, item) => {
                const diff = (new Date(item.closedAt!).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                return sum + diff;
            }, 0);
            avgResolutionDays = Math.round(totalDays / closedItems.length * 10) / 10;
        }

        return NextResponse.json({ type: 'feedback-analytics', data: { total, byStatus, byType, avgResolutionDays } });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
}
