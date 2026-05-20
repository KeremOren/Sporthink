import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const feedback = await prisma.feedback.findUnique({
        where: { id },
        include: {
            submittedBy: { select: { firstName: true, lastName: true, role: true } },
            comments: {
                orderBy: { createdAt: 'asc' },
                include: {
                    user: { select: { firstName: true, lastName: true, role: true } },
                },
            },
            logs: {
                orderBy: { createdAt: 'asc' },
                include: {
                    user: { select: { firstName: true, lastName: true, role: true } },
                },
            },
        },
    });

    if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Merge comments and logs into a single activity stream
    const activities = [
        ...(feedback.comments || []).map(c => ({
            id: c.id,
            type: 'COMMENT' as const,
            details: c.content,
            user: c.user,
            createdAt: c.createdAt,
        })),
        ...(feedback.logs || []).map(l => ({
            id: l.id,
            type: l.action,
            details: `${l.oldValue || ''} → ${l.newValue || ''}`.trim(),
            user: l.user,
            createdAt: l.createdAt,
        })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ ...feedback, activities });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { id } = await params;
    const { comment } = await req.json();

    if (!comment?.trim()) return NextResponse.json({ error: 'Comment required' }, { status: 400 });

    const feedbackComment = await prisma.feedbackComment.create({
        data: {
            feedbackId: id,
            userId: user.id,
            content: comment.trim(),
        },
        include: {
            user: { select: { firstName: true, lastName: true, role: true } },
        },
    });

    return NextResponse.json(feedbackComment, { status: 201 });
}
