import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { notifyUser } from '@/lib/notify';

// Tarih aralığı için formatter
function formatDateRange(start: Date | string, end: Date | string) {
    const s = new Date(start).toLocaleDateString('tr-TR');
    const e = new Date(end).toLocaleDateString('tr-TR');
    return s === e ? s : `${s} - ${e}`;
}

/**
 * PUT /api/leaves/[id]
 * Body: { action: 'APPROVE' | 'REJECT' | 'CANCEL', rejectionReason? }
 *
 * - APPROVE/REJECT: Yönetici işlemi (scope kontrolüyle)
 * - CANCEL: Talep sahibi kendisi iptal eder
 */

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { user: { select: { id: true, storeId: true, regionId: true } } },
    });
    if (!leave) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });

    const body = await req.json();
    const { action, rejectionReason } = body;

    // CANCEL → talep sahibi yapar
    if (action === 'CANCEL') {
        if (leave.userId !== user.id) {
            return NextResponse.json({ error: 'Sadece kendi talebinizi iptal edebilirsiniz' }, { status: 403 });
        }
        if (leave.status !== 'PENDING') {
            return NextResponse.json({ error: 'Sadece bekleyen talep iptal edilebilir' }, { status: 400 });
        }
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        return NextResponse.json({ request: updated });
    }

    // APPROVE / REJECT → yönetici yapar
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    // Scope kontrolü
    if (user.role === 'STORE_MANAGER' && leave.user.storeId !== user.storeId) {
        return NextResponse.json({ error: 'Bu çalışan sizin mağazanızda değil' }, { status: 403 });
    }
    if (user.role === 'REGIONAL_MANAGER' && leave.user.regionId !== user.regionId) {
        return NextResponse.json({ error: 'Bu çalışan sizin bölgenizde değil' }, { status: 403 });
    }

    if (leave.status !== 'PENDING') {
        return NextResponse.json({ error: 'Sadece bekleyen talep işlenebilir' }, { status: 400 });
    }

    if (action === 'APPROVE') {
        // Yıllık izin → bakiyeden düş
        if (leave.type === 'ANNUAL') {
            const year = new Date(leave.startDate).getFullYear();
            let balance = await prisma.leaveBalance.findUnique({
                where: { userId_year: { userId: leave.userId, year } },
            });
            if (!balance) {
                balance = await prisma.leaveBalance.create({
                    data: {
                        id: uuidv4(),
                        userId: leave.userId,
                        year,
                        totalDays: 14,
                        usedDays: 0,
                        remainingDays: 14,
                    },
                });
            }
            if (balance.remainingDays < leave.days) {
                return NextResponse.json({ error: 'Çalışanın bakiyesi yetersiz' }, { status: 400 });
            }
            await prisma.leaveBalance.update({
                where: { id: balance.id },
                data: {
                    usedDays: balance.usedDays + leave.days,
                    remainingDays: balance.remainingDays - leave.days,
                },
            });
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approverId: user.id,
                approvedAt: new Date(),
            },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                id: uuidv4(),
                userId: user.id,
                action: 'LEAVE_APPROVED',
                entity: 'LeaveRequest',
                entityId: id,
                details: JSON.stringify({ days: leave.days, type: leave.type }),
            },
        });

        // Bildirim: izin onaylandı
        notifyUser({
            userId: leave.userId,
            type: 'LEAVE_APPROVED',
            title: 'İzin talebiniz onaylandı',
            message: `${formatDateRange(leave.startDate, leave.endDate)} tarihli ${leave.days} günlük izin talebiniz onaylandı.`,
            link: '/leaves',
        }).catch(() => {});

        return NextResponse.json({ request: updated });
    }

    if (action === 'REJECT') {
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approverId: user.id,
                approvedAt: new Date(),
                rejectionReason: rejectionReason || null,
            },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });

        await prisma.auditLog.create({
            data: {
                id: uuidv4(),
                userId: user.id,
                action: 'LEAVE_REJECTED',
                entity: 'LeaveRequest',
                entityId: id,
                details: JSON.stringify({ reason: rejectionReason || '' }),
            },
        });

        // Bildirim: izin reddedildi
        const reasonText = rejectionReason ? ` Sebep: ${rejectionReason}` : '';
        notifyUser({
            userId: leave.userId,
            type: 'LEAVE_REJECTED',
            title: 'İzin talebiniz reddedildi',
            message: `${formatDateRange(leave.startDate, leave.endDate)} tarihli izin talebiniz reddedildi.${reasonText}`,
            link: '/leaves',
        }).catch(() => {});

        return NextResponse.json({ request: updated });
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
}

/**
 * DELETE /api/leaves/[id]
 * Talep sahibi veya SUPER_ADMIN bir izin kaydını tamamen siler.
 * Onaylanmış yıllık izin silinirse bakiye geri yüklenir.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });

    // Sadece talep sahibi veya SUPER_ADMIN silebilir
    if (leave.userId !== user.id && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Sadece kendi talebinizi silebilirsiniz' }, { status: 403 });
    }

    // Onaylanmış yıllık izin siliniyorsa bakiyeyi geri yükle
    if (leave.status === 'APPROVED' && leave.type === 'ANNUAL') {
        const year = new Date(leave.startDate).getFullYear();
        const balance = await prisma.leaveBalance.findUnique({
            where: { userId_year: { userId: leave.userId, year } },
        });
        if (balance) {
            await prisma.leaveBalance.update({
                where: { id: balance.id },
                data: {
                    usedDays: Math.max(0, balance.usedDays - leave.days),
                    remainingDays: balance.remainingDays + leave.days,
                },
            });
        }
    }

    await prisma.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
