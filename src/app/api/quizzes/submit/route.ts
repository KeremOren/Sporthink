import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // If passed, mark training assignment as completed
    if (passed) {
        await prisma.trainingAssignment.updateMany({
            where: { trainingId: quiz.trainingId, userId: user.id, status: { not: 'COMPLETED' } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });
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
        totalQuestions: quiz.questions.length,
        correctAnswers: correctCount,
        remainingAttempts: quiz.maxAttempts - previousAttempts - 1,
        autoRetry,
        autoRetryMessage: autoRetry ? `Başarı oranınız %${score} (minimum %${minPass}). Eğitim otomatik olarak tekrar atandı.` : null,
        breakdown,
    });
}
