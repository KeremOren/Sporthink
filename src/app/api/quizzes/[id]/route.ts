import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
            questions: { orderBy: { sortOrder: 'asc' } },
            training: { select: { title: true } },
        },
    });

    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(quiz);
}
