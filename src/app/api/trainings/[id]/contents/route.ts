import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST — add a content step to a training
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.title || !body.type) {
        return NextResponse.json({ error: 'Başlık ve tür gerekli' }, { status: 400 });
    }

    // Get the next sort order
    const maxSort = await prisma.trainingContent.aggregate({
        where: { trainingId: id },
        _max: { sortOrder: true },
    });

    const contentData = await prisma.trainingContent.create({
        data: {
            trainingId: id,
            type: body.type,
            title: body.title,
            content: body.content || body.body || null,
            sortOrder: (maxSort._max.sortOrder || 0) + 1,
        },
    });

    return NextResponse.json(contentData, { status: 201 });
}

// DELETE — remove a content step
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
        return NextResponse.json({ error: 'contentId required' }, { status: 400 });
    }

    await prisma.trainingContent.delete({ where: { id: contentId } });
    return NextResponse.json({ success: true });
}
