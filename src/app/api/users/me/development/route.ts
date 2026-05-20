import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const userId = user.id;

    // 1. Training assignments with details
    const trainingAssignments = await prisma.trainingAssignment.findMany({
        where: { userId },
        include: {
            training: {
                select: { id: true, title: true, category: true, type: true, durationMinutes: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const totalAssignments = trainingAssignments.length;
    const completedAssignments = trainingAssignments.filter(a => a.status === 'COMPLETED').length;
    const inProgressAssignments = trainingAssignments.filter(a => a.status === 'IN_PROGRESS').length;
    const overdueAssignments = trainingAssignments.filter(a => a.status === 'OVERDUE').length;
    const trainingCompletionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // 2. Quiz attempts with scores
    const quizAttempts = await prisma.quizAttempt.findMany({
        where: { userId },
        include: {
            quiz: { select: { id: true, title: true, passScore: true, training: { select: { title: true } } } },
        },
        orderBy: { startedAt: 'desc' },
    });

    const totalQuizzes = quizAttempts.length;
    const passedQuizzes = quizAttempts.filter(a => a.passed).length;
    const avgQuizScore = totalQuizzes > 0 ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalQuizzes) : 0;

    // 3. KPI entries for this user (or their store)
    const kpiEntries = await prisma.kpiEntry.findMany({
        where: user.storeId ? { storeId: user.storeId } : { userId },
        include: {
            kpiDefinition: { select: { id: true, name: true, unit: true, targetValue: true, frequency: true } },
            store: { select: { name: true } },
        },
        orderBy: { period: 'desc' },
        take: 50,
    });

    // Group KPI entries by definition for trend analysis
    const kpiGroups: Record<string, any> = {};
    kpiEntries.forEach(entry => {
        const defId = entry.kpiDefinitionId;
        if (!kpiGroups[defId]) {
            kpiGroups[defId] = {
                id: defId,
                name: entry.kpiDefinition.name,
                unit: entry.kpiDefinition.unit,
                targetValue: entry.kpiDefinition.targetValue,
                frequency: entry.kpiDefinition.frequency,
                entries: [],
            };
        }
        kpiGroups[defId].entries.push({
            period: entry.period,
            value: entry.value,
            notes: entry.notes,
        });
    });

    // Calculate KPI achievement for each definition (latest period)
    const kpiSummary = Object.values(kpiGroups).map((kpi: any) => {
        const latestEntry = kpi.entries[0];
        const achievement = kpi.targetValue > 0
            ? Math.round((latestEntry.value / kpi.targetValue) * 100)
            : null;
        return {
            ...kpi,
            latestValue: latestEntry.value,
            latestPeriod: latestEntry.period,
            achievement,
        };
    });

    // 4. Manager notes (received)
    const managerNotes = await prisma.managerNote.findMany({
        where: { employeeId: userId },
        include: {
            author: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    // 5. Feedback submitted by the user
    const feedbackSummary = await prisma.feedback.findMany({
        where: { submittedById: userId },
        select: { id: true, title: true, type: true, status: true, priority: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    // 6. Development areas (auto-calculated)
    const developmentAreas: { area: string; status: string; detail: string }[] = [];

    // Check training completion
    if (trainingCompletionRate < 50) {
        developmentAreas.push({ area: 'Eğitim Tamamlama', status: 'critical', detail: `Eğitim tamamlama oranı %${trainingCompletionRate} — hedef: %80+` });
    } else if (trainingCompletionRate < 80) {
        developmentAreas.push({ area: 'Eğitim Tamamlama', status: 'warning', detail: `Eğitim tamamlama oranı %${trainingCompletionRate} — hedef: %80+` });
    } else {
        developmentAreas.push({ area: 'Eğitim Tamamlama', status: 'good', detail: `Eğitim tamamlama oranı %${trainingCompletionRate} ✓` });
    }

    // Check quiz performance
    if (avgQuizScore < 60) {
        developmentAreas.push({ area: 'Sınav Performansı', status: 'critical', detail: `Ortalama sınav puanı: %${avgQuizScore} — hedef: %70+` });
    } else if (avgQuizScore < 70) {
        developmentAreas.push({ area: 'Sınav Performansı', status: 'warning', detail: `Ortalama sınav puanı: %${avgQuizScore} — hedef: %70+` });
    } else {
        developmentAreas.push({ area: 'Sınav Performansı', status: 'good', detail: `Ortalama sınav puanı: %${avgQuizScore} ✓` });
    }

    // Check KPI achievement
    kpiSummary.forEach(kpi => {
        if (kpi.achievement !== null) {
            if (kpi.achievement < 70) {
                developmentAreas.push({ area: `KPI: ${kpi.name}`, status: 'critical', detail: `Gerçekleşme: %${kpi.achievement} — hedef: %100` });
            } else if (kpi.achievement < 90) {
                developmentAreas.push({ area: `KPI: ${kpi.name}`, status: 'warning', detail: `Gerçekleşme: %${kpi.achievement} — hedef: %100` });
            } else {
                developmentAreas.push({ area: `KPI: ${kpi.name}`, status: 'good', detail: `Gerçekleşme: %${kpi.achievement} ✓` });
            }
        }
    });

    // Check overdue trainings
    if (overdueAssignments > 0) {
        developmentAreas.push({ area: 'Gecikmiş Eğitimler', status: 'critical', detail: `${overdueAssignments} adet gecikmiş eğitim mevcut` });
    }

    // 7. Feedback history (from manager notes with categories)
    const feedbackNotes = await prisma.managerNote.findMany({
        where: { employeeId: userId },
        include: {
            author: { select: { firstName: true, lastName: true, role: true } },
            employee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const feedbackHistory = feedbackNotes.map(note => ({
        id: note.id,
        category: ['POSITIVE', 'CONSTRUCTIVE', 'FOCUSED'].includes(note.type) ? note.type : 'POSITIVE',
        content: note.content,
        createdAt: note.createdAt,
        author: note.author,
        targetUser: note.employee,
    }));

    return NextResponse.json({
        // Summary stats
        summary: {
            trainingCompletionRate,
            totalAssignments,
            completedAssignments,
            inProgressAssignments,
            overdueAssignments,
            totalQuizzes,
            passedQuizzes,
            avgQuizScore,
        },
        // Detailed data
        trainingAssignments,
        quizAttempts,
        feedbackHistory,
        developmentAreas,
    });
}
