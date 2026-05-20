import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const kpiId = searchParams.get('kpiId');

    const defWhere: any = { isActive: true };
    const definitions = await prisma.kpiDefinition.findMany({ where: defWhere, orderBy: { name: 'asc' } });

    const entryWhere: any = {};
    if (user.role === 'REGIONAL_MANAGER') entryWhere.store = { regionId: user.regionId };
    else if (user.role === 'STORE_MANAGER' || user.role === 'ASSISTANT_MANAGER') entryWhere.storeId = user.storeId;
    if (kpiId) entryWhere.kpiDefinitionId = kpiId;

    const entries = await prisma.kpiEntry.findMany({
        where: entryWhere,
        orderBy: { period: 'asc' },
        include: {
            kpiDefinition: { select: { name: true, unit: true, targetValue: true } },
            store: { select: { name: true } },
        },
    });

    return NextResponse.json({ definitions, entries });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'STORE_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { kpiDefinitionId, value, period, storeId, notes } = await req.json();

    const entry = await prisma.kpiEntry.create({
        data: {
            kpiDefinitionId,
            value: parseFloat(value),
            period,
            storeId: storeId || user.storeId,
            enteredById: user.id,
            notes,
        },
    });

    return NextResponse.json(entry, { status: 201 });
}
