import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();
    const { endpoint } = body || {};

    if (!endpoint) {
        return NextResponse.json({ error: 'endpoint gerekli' }, { status: 400 });
    }

    try {
        await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Unsubscribe başarısız' }, { status: 500 });
    }
}
