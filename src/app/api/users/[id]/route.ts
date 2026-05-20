import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userId = id;
    const profile = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            store: true,
            region: true,
            trainingAssignments: {
                include: { training: { select: { title: true, category: true, type: true } } },
                orderBy: { createdAt: 'desc' },
            },
            quizAttempts: {
                include: { quiz: { select: { title: true, passScore: true } } },
                orderBy: { startedAt: 'desc' },
            },
            receivedNotes: {
                include: { author: { select: { firstName: true, lastName: true, role: true } } },
                orderBy: { createdAt: 'desc' },
            },
            submittedFeedback: {
                select: { id: true, title: true, type: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Remove password from response
    const { password, ...safeProfile } = profile;

    return NextResponse.json(safeProfile);
}
