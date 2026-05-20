import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const shift = await prisma.shift.findUnique({ where: { id }, include: { store: true } });
    if (!shift) return NextResponse.json({ error: 'Vardiya bulunamadı' }, { status: 404 });

    // Scope
    if (user.role === 'EMPLOYEE' || user.role === 'ASSISTANT_MANAGER') {
        // Employees can only update status of their own shift
        if (shift.userId !== user.id) return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
        const body = await req.json();
        if (!['CONFIRMED', 'MISSED'].includes(body.status)) {
            return NextResponse.json({ error: 'Sadece status güncelleyebilirsiniz (CONFIRMED, MISSED)' }, { status: 400 });
        }
        const updated = await prisma.shift.update({ where: { id }, data: { status: body.status } });
        return NextResponse.json({ shift: updated });
    }

    // Manager: scope check
    if (user.role === 'STORE_MANAGER' && shift.storeId !== user.storeId) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }
    if (user.role === 'REGIONAL_MANAGER' && shift.store.regionId !== user.regionId) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (body.userId) updateData.userId = body.userId;
    if (body.date) updateData.date = new Date(body.date);
    if (body.startTime) updateData.startTime = body.startTime;
    if (body.endTime) updateData.endTime = body.endTime;
    if (body.type) updateData.type = body.type;
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await prisma.shift.update({
        where: { id },
        data: updateData,
        include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            store: { select: { id: true, name: true } },
        },
    });
    return NextResponse.json({ shift: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    const shift = await prisma.shift.findUnique({ where: { id }, include: { store: true } });
    if (!shift) return NextResponse.json({ error: 'Vardiya bulunamadı' }, { status: 404 });

    if (user.role === 'STORE_MANAGER' && shift.storeId !== user.storeId) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }
    if (user.role === 'REGIONAL_MANAGER' && shift.store.regionId !== user.regionId) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    await prisma.shift.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
