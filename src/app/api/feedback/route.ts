import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = {};
    if (user.role === 'REGIONAL_MANAGER') where.store = { regionId: user.regionId };
    else if (user.role === 'STORE_MANAGER' || user.role === 'ASSISTANT_MANAGER') where.storeId = user.storeId;
    else if (user.role === 'EMPLOYEE') where.submittedById = user.id;
    if (type) where.type = type;
    if (status) where.status = status;

    const feedback = await prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            submittedBy: { select: { firstName: true, lastName: true } },
            assignedTo: { select: { firstName: true, lastName: true } },
            store: { select: { name: true } },
            _count: { select: { comments: true } },
        },
    });

    return NextResponse.json(feedback);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();

    const feedback = await prisma.feedback.create({
        data: {
            title: body.title,
            description: body.description,
            type: body.type,
            priority: body.priority || 'MEDIUM',
            storeId: body.storeId || user.storeId,
            submittedById: user.id,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
        },
    });

    await prisma.feedbackLog.create({
        data: { feedbackId: feedback.id, action: 'CREATED', newValue: 'NEW', userId: user.id },
    });

    return NextResponse.json(feedback, { status: 201 });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();
    const { id, status, assignedToId } = body;

    const current = await prisma.feedback.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updateData: any = {};
    if (status) {
        updateData.status = status;
        if (['IMPLEMENTED', 'CLOSED'].includes(status)) updateData.closedAt = new Date();
    }
    if (assignedToId) updateData.assignedToId = assignedToId;

    const updated = await prisma.feedback.update({ where: { id }, data: updateData });

    if (status && status !== current.status) {
        await prisma.feedbackLog.create({
            data: { feedbackId: id, action: 'STATUS_CHANGED', oldValue: current.status, newValue: status, userId: user.id },
        });
    }

    return NextResponse.json(updated);
}
