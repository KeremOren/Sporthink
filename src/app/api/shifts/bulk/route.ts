import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/shifts/bulk
 * Body: { shifts: [{ userId, storeId, date, startTime, endTime, type, notes }] }
 *
 * Toplu vardiya oluşturma (haftalık plan yapmak için).
 */

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    const body = await req.json();
    const { shifts } = body;

    if (!Array.isArray(shifts) || shifts.length === 0) {
        return NextResponse.json({ error: 'shifts dizisi gerekli' }, { status: 400 });
    }

    // Validate each shift's scope
    if (user.role === 'STORE_MANAGER') {
        const invalid = shifts.find((s: any) => s.storeId !== user.storeId);
        if (invalid) return NextResponse.json({ error: 'Bazı vardiyalar farklı mağazaya ait' }, { status: 403 });
    }

    const created: any[] = [];
    for (const s of shifts) {
        if (!s.userId || !s.storeId || !s.date || !s.startTime || !s.endTime) continue;
        try {
            const shift = await prisma.shift.create({
                data: {
                    id: uuidv4(),
                    userId: s.userId,
                    storeId: s.storeId,
                    date: new Date(s.date),
                    startTime: s.startTime,
                    endTime: s.endTime,
                    type: s.type || 'FULL',
                    notes: s.notes || null,
                    createdById: user.id,
                },
            });
            created.push(shift);
        } catch (e) {
            // skip invalid entries
        }
    }

    return NextResponse.json({ created: created.length, shifts: created });
}
