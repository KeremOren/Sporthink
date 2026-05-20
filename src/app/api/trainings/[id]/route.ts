import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const training = await prisma.training.findUnique({
        where: { id },
        include: {
            contents: { orderBy: { sortOrder: 'asc' } },
            quiz: { select: { id: true, title: true, passScore: true, timeLimitMinutes: true } },
            assignments: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, store: { select: { name: true } } } },
                },
            },
            createdBy: { select: { firstName: true, lastName: true } },
        },
    });

    if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(training);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const training = await prisma.training.update({
        where: { id },
        data: {
            title: body.title,
            description: body.description,
            category: body.category,
            type: body.type,
            status: body.status,
        },
    });

    return NextResponse.json(training);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await prisma.training.update({
        where: { id },
        data: { status: 'ARCHIVED' },
    });

    return NextResponse.json({ success: true });
}
