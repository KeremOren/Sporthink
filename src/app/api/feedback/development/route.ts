import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const role = user.role;

    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const { category, content, targetUserId } = body;

    if (!content?.trim()) {
        return NextResponse.json({ error: 'İçerik gerekli' }, { status: 400 });
    }

    if (!['POSITIVE', 'CONSTRUCTIVE', 'FOCUSED'].includes(category)) {
        return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 });
    }

    try {
        // Create feedback as a manager note with category
        const note = await prisma.managerNote.create({
            data: {
                content: content.trim(),
                type: category,
                authorId: user.id,
                employeeId: targetUserId || user.id,
            },
        });

            await prisma.auditLog.create({
                data: {
                    action: 'CREATE_FEEDBACK',
                    entity: 'development_feedback',
                    entityId: note.id,
                    details: JSON.stringify({ category, targetUserId: targetUserId || user.id }),
                    userId: user.id,
                },
            });

        return NextResponse.json(note);
    } catch (error) {
        console.error('Feedback creation error:', error);
        return NextResponse.json({ error: 'Geri bildirim kaydedilemedi' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    try {
        const notes = await prisma.managerNote.findMany({
            where: { employeeId: userId },
            include: {
                author: { select: { firstName: true, lastName: true, role: true } },
                employee: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map notes to feedback format
        const feedbackHistory = notes.map(note => ({
            id: note.id,
            category: note.type || 'POSITIVE',
            content: note.content,
            createdAt: note.createdAt,
            author: note.author,
            targetUser: note.employee,
        }));

        return NextResponse.json(feedbackHistory);
    } catch (error) {
        console.error('Feedback fetch error:', error);
        return NextResponse.json({ error: 'Veriler yüklenemedi' }, { status: 500 });
    }
}
