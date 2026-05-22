import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { notifyUsers } from '@/lib/notify';

/**
 * GET /api/leaves
 * - Çalışan: kendi izinleri
 * - Yönetici: scope'una giren çalışanların izinleri
 *
 * POST /api/leaves
 * Yeni izin talebi oluştur (her kullanıcı kendisi için).
 */

function countWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    const where: any = {};
    if (statusFilter) where.status = statusFilter;

    if (user.role === 'EMPLOYEE' || user.role === 'ASSISTANT_MANAGER') {
        where.userId = user.id;
    } else if (user.role === 'STORE_MANAGER') {
        where.user = { storeId: user.storeId };
    } else if (user.role === 'REGIONAL_MANAGER') {
        where.user = { regionId: user.regionId };
    }
    // SUPER_ADMIN sees all

    const requests = await prisma.leaveRequest.findMany({
        where,
        include: {
            user: { select: { id: true, firstName: true, lastName: true, store: { select: { name: true } } } },
            approver: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return NextResponse.json({ requests });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();
    const { type, startDate, endDate, reason } = body;

    if (!type || !startDate || !endDate) {
        return NextResponse.json({ error: 'type, startDate, endDate gerekli' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
        return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' }, { status: 400 });
    }
    const days = countWorkingDays(start, end);

    // Bakiye kontrolü (sadece yıllık izin için)
    const currentYear = new Date().getFullYear();
    if (type === 'ANNUAL') {
        let balance = await prisma.leaveBalance.findUnique({
            where: { userId_year: { userId: user.id, year: currentYear } },
        });
        if (!balance) {
            balance = await prisma.leaveBalance.create({
                data: {
                    id: uuidv4(),
                    userId: user.id,
                    year: currentYear,
                    totalDays: 14,
                    usedDays: 0,
                    remainingDays: 14,
                },
            });
        }
        if (balance.remainingDays < days) {
            return NextResponse.json({
                error: `Yetersiz izin bakiyesi. Kalan: ${balance.remainingDays} gün, talep edilen: ${days} gün`,
            }, { status: 400 });
        }
    }

    const request = await prisma.leaveRequest.create({
        data: {
            id: uuidv4(),
            userId: user.id,
            type,
            startDate: start,
            endDate: end,
            days,
            reason: reason || null,
            status: 'PENDING',
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, storeId: true, regionId: true } },
        },
    });

    // Yöneticilere bildirim gönder: store manager + bölge müdürü + super admin
    try {
        const orConditions: any[] = [{ role: 'SUPER_ADMIN' }];
        if (request.user.storeId) {
            orConditions.push({ role: 'STORE_MANAGER', storeId: request.user.storeId });
        }
        if (request.user.regionId) {
            orConditions.push({ role: 'REGIONAL_MANAGER', regionId: request.user.regionId });
        }
        const managers = await prisma.user.findMany({
            where: {
                OR: orConditions,
                id: { not: user.id },
            },
            select: { id: true },
        });
        if (managers.length > 0) {
            const fullName = `${request.user.firstName} ${request.user.lastName}`;
            const dateStr = start.toLocaleDateString('tr-TR') === end.toLocaleDateString('tr-TR')
                ? start.toLocaleDateString('tr-TR')
                : `${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`;
            notifyUsers(managers.map(m => m.id), {
                type: 'LEAVE_REQUESTED',
                title: 'Yeni izin talebi',
                message: `${fullName}, ${dateStr} için ${days} günlük izin talep etti.`,
                link: '/leaves',
            }).catch(() => {});
        }
    } catch (e) {
        console.warn('[leaves] manager notify failed:', e);
    }

    return NextResponse.json({ request }, { status: 201 });
}
