import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (category) where.category = category;
    // Default olarak sadece ACTIVE eğitimleri göster, status=all ile arşivler de gelir
    if (status === 'all') {
        // no filter
    } else if (status) {
        where.status = status;
    } else {
        where.status = 'ACTIVE';
    }

    const trainings = await prisma.training.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { assignments: true, contents: true } },
            quiz: { select: { id: true, title: true } },
            createdBy: { select: { firstName: true, lastName: true } },
        },
    });

    // For employees and store managers, also get their assignment status
    let myAssignments: any = {};
    if (['EMPLOYEE', 'STORE_MANAGER', 'ASSISTANT_MANAGER'].includes(user.role)) {
        const assignments = await prisma.trainingAssignment.findMany({
            where: { userId: user.id },
            select: { trainingId: true, status: true, dueDate: true, completedAt: true, startedAt: true },
        });
        assignments.forEach(a => { myAssignments[a.trainingId] = a; });
    }

    return NextResponse.json({ trainings, myAssignments });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes((session.user as any).role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, category, type, durationMinutes, minPassRate, contents } = body;

    const training = await prisma.training.create({
        data: {
            title, description, category,
            type: type || 'MANDATORY',
            durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
            minPassRate: minPassRate ? parseInt(minPassRate) : 70,
            createdById: (session.user as any).id,
            contents: contents ? {
                create: contents.map((c: any, i: number) => ({
                    type: c.type || 'TEXT',
                    title: c.title,
                    content: c.content,
                    sortOrder: i,
                })),
            } : undefined,
        },
        include: { contents: true },
    });

    return NextResponse.json(training, { status: 201 });
}
