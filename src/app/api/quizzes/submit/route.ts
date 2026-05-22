import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';
import { awardXp, checkAndAwardBadges, XP_REWARDS } from '@/lib/gamification';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { quizId, answers } = await req.json();

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true, training: { select: { id: true, minPassRate: true, title: true } } },
    });

    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    // Check max attempts
    const previousAttempts = await prisma.quizAttempt.count({
        where: { quizId, userId: user.id },
    });

    if (previousAttempts >= quiz.maxAttempts) {
        return NextResponse.json({ error: 'Deneme hakkı doldu' }, { status: 400 });
    }

    // Grade the quiz
    let correctCount = 0;
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    let earnedPoints = 0;

    const graded = quiz.questions.map(q => {
        const userAnswer = answers[q.id] || '';
        const isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        if (isCorrect) {
            correctCount++;
            earnedPoints += q.points;
        }
        return { questionId: q.id, answer: userAnswer, isCorrect };
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const minPass = quiz.training?.minPassRate || 70;
    const passed = score >= minPass;

    // Create attempt
    const attempt = await prisma.quizAttempt.create({
        data: {
            quizId,
            userId: user.id,
            score,
            passed,
            completedAt: new Date(),
            answers: {
                create: graded.map(a => ({
                    questionId: a.questionId,
                    answer: a.answer,
                    isCorrect: a.isCorrect,
                })),
            },
        },
    });

    let autoRetry = false;
    let xpAwarded = 0;
    let newBadges: string[] = [];

    // If passed, mark training assignment as completed
    if (passed) {
        // Önceki tamamlanmamış atamayı COMPLETED yap
        const updateResult = await prisma.trainingAssignment.updateMany({
            where: { trainingId: quiz.trainingId, userId: user.id, status: { not: 'COMPLETED' } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        // === XP + ROZET ÖDÜLLERİ ===
        // 1. Quiz geçti → XP
        const quizXp = score === 100 ? XP_REWARDS.QUIZ_PERFECT : XP_REWARDS.QUIZ_PASS;
        await awardXp({
            userId: user.id,
            amount: quizXp,
            source: 'QUIZ_PASS',
            sourceId: quizId,
            reason: score === 100 ? `Mükemmel skor: ${quiz.training?.title || 'Quiz'}` : `Quiz başarıyla geçildi: ${quiz.training?.title || 'Quiz'}`,
        });
        xpAwarded += quizXp;

        // 2. Eğitim tamamlandıysa training XP'si de ver
        if (updateResult.count > 0 && quiz.training?.id) {
            await awardXp({
                userId: user.id,
                amount: XP_REWARDS.TRAINING_COMPLETE,
                source: 'TRAINING_COMPLETE',
                sourceId: quiz.training.id,
                reason: `Eğitim tamamlandı: ${quiz.training.title || ''}`,
            });
            xpAwarded += XP_REWARDS.TRAINING_COMPLETE;
        }

        // 3. Otomatik rozet kontrolü
        try {
            newBadges = await checkAndAwardBadges(user.id);
            // Yeni rozet kazandıysa bildirim gönder
            for (const code of newBadges) {
                const badge = await prisma.badge.findUnique({ where: { code } });
                if (badge) {
                    notifyUser({
                        userId: user.id,
                        type: 'BADGE_EARNED',
                        title: 'Yeni rozet kazandın! 🏆',
                        message: `"${badge.name}" — ${badge.description}`,
                        link: '/achievements',
                    }).catch(() => {});
                }
            }
        } catch (e) {
            console.warn('[quiz] badge check failed:', e);
        }
    } else {
        // Check if all attempts exhausted and still failed → auto-retry
        const remainingAttempts = quiz.maxAttempts - previousAttempts - 1;
        if (remainingAttempts <= 0) {
            // Mark current assignment as FAILED
            await prisma.trainingAssignment.updateMany({
                where: { trainingId: quiz.trainingId, userId: user.id, status: { not: 'COMPLETED' } },
                data: { status: 'FAILED' },
            });

            // Create a new retry assignment
            await prisma.trainingAssignment.create({
                data: {
                    trainingId: quiz.trainingId,
                    userId: user.id,
                    assignedById: user.id,
                    status: 'NOT_STARTED',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
                },
            });

            // Log the auto-retry
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'AUTO_RETRY_TRAINING',
                    entity: 'Training',
                    entityId: quiz.training?.id,
                    details: `"${quiz.training?.title}" eğitiminde %${score} alındı (min: %${minPass}). Otomatik tekrar atandı.`,
                },
            });

            // Bildirim: quiz başarısız + otomatik tekrar
            notifyUser({
                userId: user.id,
                type: 'QUIZ_FAILED_RETRY',
                title: 'Quiz başarısız — tekrar atandı',
                message: `"${quiz.training?.title}" eğitiminde %${score} aldınız (min: %${minPass}). Eğitim 1 hafta süreyle tekrar atandı.`,
                link: `/trainings/${quiz.training?.id}`,
                urgent: true,
            }).catch(() => {});

            autoRetry = true;
        }
    }

    // Build detailed per-question breakdown for review
    const breakdown = quiz.questions.map((q, idx) => {
        const userAnswer = answers[q.id] || '';
        const isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        return {
            index: idx + 1,
            questionId: q.id,
            question: q.question,
            options: q.options,
            userAnswer,
            correctAnswer: q.correctAnswer,
            isCorrect,
            points: q.points,
        };
    });

    return NextResponse.json({
        attemptId: attempt.id,
        score,
        passScore: minPass,
        passed,
        xpAwarded,
        newBadges,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctCount,
        remainingAttempts: quiz.maxAttempts - previousAttempts - 1,
        autoRetry,
        autoRetryMessage: autoRetry ? `Başarı oranınız %${score} (minimum %${minPass}). Eğitim otomatik olarak tekrar atandı.` : null,
        breakdown,
    });
}
