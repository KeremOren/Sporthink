import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/shifts?storeId=...&startDate=...&endDate=...
 * Returns shifts for the given range, filtered by user's scope.
 *
 * POST /api/shifts
 * Create a single shift (managers only).
 */

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    const where: any = {};

    // Scope based on role
    if (user.role === 'EMPLOYEE' || user.role === 'ASSISTANT_MANAGER') {
        where.userId = user.id;
    } else if (user.role === 'STORE_MANAGER') {
        where.storeId = user.storeId;
    } else if (user.role === 'REGIONAL_MANAGER') {
        where.store = { regionId: user.regionId };
    }
    // SUPER_ADMIN sees all

    // Apply explicit filters (override scope where applicable)
    if (storeId && ['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user.role)) {
        where.storeId = storeId;
    }
    if (userId && ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role)) {
        where.userId = userId;
    }

    if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
    }

    const shifts = await prisma.shift.findMany({
        where,
        include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            store: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ shifts });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, storeId, date, startTime, endTime, type, notes } = body;

    if (!userId || !storeId || !date || !startTime || !endTime) {
        return NextResponse.json({ error: 'userId, storeId, date, startTime, endTime gerekli' }, { status: 400 });
    }

    // Permission scope
    if (user.role === 'STORE_MANAGER' && storeId !== user.storeId) {
        return NextResponse.json({ error: 'Sadece kendi mağazanıza vardiya atayabilirsiniz' }, { status: 403 });
    }
    if (user.role === 'REGIONAL_MANAGER') {
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store || store.regionId !== user.regionId) {
            return NextResponse.json({ error: 'Bölgeniz dışındaki mağazaya atama yapamazsınız' }, { status: 403 });
        }
    }

    const shift = await prisma.shift.create({
        data: {
            id: uuidv4(),
            userId,
            storeId,
            date: new Date(date),
            startTime,
            endTime,
            type: type || 'FULL',
            notes: notes || null,
            createdById: user.id,
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            store: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ shift }, { status: 201 });
}
