import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/leaves/balance
 * Mevcut kullanıcının izin bakiyesini döner. Yoksa oluşturup döner.
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const year = new Date().getFullYear();

    let balance = await prisma.leaveBalance.findUnique({
        where: { userId_year: { userId: user.id, year } },
    });

    if (!balance) {
        balance = await prisma.leaveBalance.create({
            data: {
                id: uuidv4(),
                userId: user.id,
                year,
                totalDays: 14,
                usedDays: 0,
                remainingDays: 14,
            },
        });
    }

    // Yıl içinde APPROVED ve PENDING toplamları
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const pendingDays = await prisma.leaveRequest.aggregate({
        where: {
            userId: user.id,
            status: 'PENDING',
            type: 'ANNUAL',
            startDate: { gte: yearStart, lte: yearEnd },
        },
        _sum: { days: true },
    });

    return NextResponse.json({
        balance,
        pendingDays: pendingDays._sum.days || 0,
    });
}
