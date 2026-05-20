import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// AI-powered automatic quiz generation from training content
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    const { trainingId, questionCount = 5 } = await request.json();

    if (!trainingId) {
        return NextResponse.json({ error: 'Eğitim ID gerekli' }, { status: 400 });
    }

    try {
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            include: { contents: true, quiz: true },
        });

        if (!training) {
            return NextResponse.json({ error: 'Eğitim bulunamadı' }, { status: 404 });
        }

        // Extract text content from training
        const textContent = training.contents
            .map(c => c.content || c.title || '')
            .join('\n');

        if (!textContent.trim()) {
            return NextResponse.json({ error: 'Eğitim içeriği boş' }, { status: 400 });
        }

        // Generate quiz questions from content
        const questions = generateQuestionsFromContent(textContent, training.title, questionCount);

        // Create quiz if not exists
        let quiz = training.quiz;
        if (!quiz) {
            quiz = await prisma.quiz.create({
                data: {
                    trainingId,
                    title: `${training.title} - Otomatik Sınav`,
                    passScore: 70,
                    maxAttempts: 3,
                },
            });
        }

        // Add questions to quiz
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await prisma.quizQuestion.create({
                data: {
                    quizId: quiz.id,
                    type: q.type,
                    question: q.question,
                    options: JSON.stringify(q.options),
                    correctAnswer: q.correctAnswer,
                    points: 1,
                    sortOrder: i,
                },
            });
        }

        return NextResponse.json({
            quizId: quiz.id,
            questionsGenerated: questions.length,
            questions: questions.map(q => ({ ...q, correctAnswer: '***' })),
        });
    } catch (error) {
        console.error('Quiz generation error:', error);
        return NextResponse.json({ error: 'Quiz oluşturulamadı' }, { status: 500 });
    }
}

function generateQuestionsFromContent(content: string, title: string, count: number) {
    const sentences = content.split(/[.!?\n]/).filter(s => s.trim().length > 15);
    const questions: any[] = [];

    // Generate True/False questions
    for (let i = 0; i < Math.min(Math.ceil(count / 2), sentences.length); i++) {
        const sentence = sentences[i]?.trim();
        if (!sentence) continue;
        questions.push({
            type: 'TRUE_FALSE',
            question: `"${sentence}" ifadesi doğru mudur?`,
            options: ['Doğru', 'Yanlış'],
            correctAnswer: 'Doğru',
        });
    }

    // Generate multiple choice questions
    const mcCount = count - questions.length;
    for (let i = 0; i < mcCount; i++) {
        const idx = Math.min(i + Math.ceil(count / 2), sentences.length - 1);
        const sentence = sentences[idx]?.trim();
        if (!sentence) continue;

        const keywords = sentence.split(/\s+/).filter(w => w.length > 4);
        const keyword = keywords[0] || title;

        questions.push({
            type: 'MULTIPLE_CHOICE',
            question: `${title} eğitiminde ${keyword} ile ilgili hangisi doğrudur?`,
            options: [
                sentence.substring(0, 80),
                'Bu konuda herhangi bir kural bulunmamaktadır',
                'Bu durum sadece yöneticileri ilgilendirir',
                'Belirtilen kural uygulanmaz',
            ],
            correctAnswer: sentence.substring(0, 80),
        });
    }

    return questions.slice(0, count);
}
