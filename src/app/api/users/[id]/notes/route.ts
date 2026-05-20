import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const notes = await prisma.managerNote.findMany({
        where: { employeeId: id },
        include: {
            author: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (user.role === 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { content } = await req.json();

    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const note = await prisma.managerNote.create({
        data: {
            employeeId: id,
            authorId: user.id,
            content: content.trim(),
        },
        include: {
            author: { select: { firstName: true, lastName: true, role: true } },
        },
    });

    return NextResponse.json(note, { status: 201 });
}
