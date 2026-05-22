import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [regions, stores] = await Promise.all([
        prisma.region.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { stores: true } } },
        }),
        prisma.store.findMany({
            orderBy: { name: 'asc' },
            include: {
                region: { select: { name: true } },
                _count: { select: { users: true } },
            },
        }),
    ]);

    return NextResponse.json({ regions, stores }, {
        headers: { 'Cache-Control': 'private, max-age=60' },
    });
}
