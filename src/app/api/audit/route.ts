import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || '';
    const entity = searchParams.get('entity') || '';
    const userId = searchParams.get('userId') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;

    const where: any = {};
    if (action) where.action = { contains: action };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.auditLog.count({ where }),
    ]);

    // Get unique entities and actions for filter dropdowns
    const entities = await prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true } });
    const actions = await prisma.auditLog.findMany({ distinct: ['action'], select: { action: true } });
    const users = await prisma.user.findMany({ select: { id: true, firstName: true, lastName: true } });

    return NextResponse.json({
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        filters: {
            entities: entities.map(e => e.entity),
            actions: actions.map(a => a.action),
            users: users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })),
        },
    });
}
