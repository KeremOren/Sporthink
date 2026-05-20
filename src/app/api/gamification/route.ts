import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Gamification endpoint - badges, points, leaderboard
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'profile';

    if (type === 'leaderboard') {
        // Get top performers across all users
        const users = await prisma.user.findMany({
            where: { isActive: true, role: 'EMPLOYEE' },
            select: {
                id: true, firstName: true, lastName: true,
                store: { select: { name: true } },
                trainingAssignments: { select: { status: true } },
                quizAttempts: { select: { score: true, passed: true } },
            },
            take: 50,
        });

        const leaderboard = users.map(u => {
            const totalTrainings = u.trainingAssignments.length;
            const completedTrainings = u.trainingAssignments.filter(a => a.status === 'COMPLETED').length;
            const avgQuizScore = u.quizAttempts.length > 0
                ? Math.round(u.quizAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / u.quizAttempts.length)
                : 0;
            const passedQuizzes = u.quizAttempts.filter(a => a.passed).length;

            // Calculate gamification points
            const points = (completedTrainings * 100) + (passedQuizzes * 50) + (avgQuizScore * 2);

            return {
                userId: u.id,
                name: `${u.firstName} ${u.lastName}`,
                store: u.store?.name || '',
                points,
                completedTrainings,
                avgQuizScore,
                passedQuizzes,
                level: getLevel(points),
            };
        }).sort((a, b) => b.points - a.points);

        return NextResponse.json({ leaderboard: leaderboard.slice(0, 20) });
    }

    // Get user's gamification profile
    const userId = user.id;

    const [assignments, quizAttempts] = await Promise.all([
        prisma.trainingAssignment.findMany({ where: { userId }, select: { status: true, completedAt: true } }),
        prisma.quizAttempt.findMany({ where: { userId }, select: { score: true, passed: true } }),
    ]);

    const completedTrainings = assignments.filter(a => a.status === 'COMPLETED').length;
    const passedQuizzes = quizAttempts.filter(a => a.passed).length;
    const avgScore = quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / quizAttempts.length)
        : 0;
    const points = (completedTrainings * 100) + (passedQuizzes * 50) + (avgScore * 2);

    // Calculate badges
    const badges = [];
    if (completedTrainings >= 1) badges.push({ id: 'first_training', name: 'İlk Adım', icon: '🎯', desc: 'İlk eğitimini tamamla', earned: true });
    if (completedTrainings >= 5) badges.push({ id: 'five_trainings', name: 'Öğrenme Yolunda', icon: '📚', desc: '5 eğitim tamamla', earned: true });
    if (completedTrainings >= 10) badges.push({ id: 'ten_trainings', name: 'Eğitim Ustası', icon: '🏆', desc: '10 eğitim tamamla', earned: true });
    if (passedQuizzes >= 1) badges.push({ id: 'first_quiz', name: 'Sınav Başarısı', icon: '✅', desc: 'İlk sınavı geç', earned: true });
    if (passedQuizzes >= 5) badges.push({ id: 'quiz_master', name: 'Sınav Uzmanı', icon: '🧠', desc: '5 sınav geç', earned: true });
    if (avgScore >= 90) badges.push({ id: 'high_scorer', name: 'Yüksek Puan', icon: '⭐', desc: 'Ortalama %90+ al', earned: true });
    if (avgScore >= 95) badges.push({ id: 'perfect', name: 'Mükemmeliyetçi', icon: '💎', desc: 'Ortalama %95+ al', earned: true });

    // Potential badges (not yet earned)
    const potentialBadges = [
        { id: 'first_training', name: 'İlk Adım', icon: '🎯', desc: 'İlk eğitimini tamamla', earned: completedTrainings >= 1 },
        { id: 'five_trainings', name: 'Öğrenme Yolunda', icon: '📚', desc: '5 eğitim tamamla', earned: completedTrainings >= 5 },
        { id: 'ten_trainings', name: 'Eğitim Ustası', icon: '🏆', desc: '10 eğitim tamamla', earned: completedTrainings >= 10 },
        { id: 'first_quiz', name: 'Sınav Başarısı', icon: '✅', desc: 'İlk sınavı geç', earned: passedQuizzes >= 1 },
        { id: 'quiz_master', name: 'Sınav Uzmanı', icon: '🧠', desc: '5 sınav geç', earned: passedQuizzes >= 5 },
        { id: 'high_scorer', name: 'Yüksek Puan', icon: '⭐', desc: 'Ortalama %90+ al', earned: avgScore >= 90 },
        { id: 'perfect', name: 'Mükemmeliyetçi', icon: '💎', desc: 'Ortalama %95+ al', earned: avgScore >= 95 },
        { id: 'streak_7', name: '7 Gün Seri', icon: '🔥', desc: '7 gün üst üste eğitim tamamla', earned: false },
    ];

    return NextResponse.json({
        points,
        level: getLevel(points),
        nextLevel: getNextLevel(points),
        pointsToNext: getPointsToNext(points),
        stats: { completedTrainings, passedQuizzes, avgScore, totalAssignments: assignments.length },
        badges: potentialBadges,
        earnedBadgeCount: badges.length,
    });
}

function getLevel(points: number) {
    if (points >= 2000) return { name: 'Şampiyon', level: 5, color: '#f59e0b' };
    if (points >= 1000) return { name: 'Uzman', level: 4, color: '#8b5cf6' };
    if (points >= 500) return { name: 'Profesyonel', level: 3, color: '#06b6d4' };
    if (points >= 200) return { name: 'Gelişen', level: 2, color: '#22c55e' };
    return { name: 'Başlangıç', level: 1, color: '#64748b' };
}

function getNextLevel(points: number) {
    if (points >= 2000) return null;
    if (points >= 1000) return { name: 'Şampiyon', points: 2000 };
    if (points >= 500) return { name: 'Uzman', points: 1000 };
    if (points >= 200) return { name: 'Profesyonel', points: 500 };
    return { name: 'Gelişen', points: 200 };
}

function getPointsToNext(points: number) {
    const next = getNextLevel(points);
    return next ? next.points - points : 0;
}
