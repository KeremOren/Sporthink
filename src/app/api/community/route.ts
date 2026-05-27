import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = {};
    if (category) where.category = category;

    const posts = await prisma.communityPost.findMany({
        where,
        include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true, store: { select: { name: true } } } },
            comments: {
                include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
                orderBy: { createdAt: 'asc' },
            },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 50,
    });

    return NextResponse.json(posts);
}

/**
 * DELETE /api/community?commentId=xxx → yorum sil
 * Sahibi veya SUPER_ADMIN silebilir
 */
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');
    const postId = searchParams.get('postId');

    // Yorum silme
    if (commentId) {
        const comment = await prisma.communityComment.findUnique({ where: { id: commentId } });
        if (!comment) return NextResponse.json({ error: 'Yorum bulunamadı' }, { status: 404 });
        // Sadece sahibi veya admin silebilir
        if (comment.authorId !== user.id && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Sadece kendi yorumunuzu silebilirsiniz' }, { status: 403 });
        }
        await prisma.communityComment.delete({ where: { id: commentId } });
        return NextResponse.json({ success: true });
    }

    // Gönderi silme
    if (postId) {
        const post = await prisma.communityPost.findUnique({ where: { id: postId } });
        if (!post) return NextResponse.json({ error: 'Gönderi bulunamadı' }, { status: 404 });
        if (post.authorId !== user.id && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Sadece kendi gönderinizi silebilirsiniz' }, { status: 403 });
        }
        await prisma.communityPost.delete({ where: { id: postId } });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'commentId veya postId gerekli' }, { status: 400 });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();

    // Create post
    if (body.action === 'create_post') {
        const post = await prisma.communityPost.create({
            data: {
                title: body.title,
                content: body.content,
                category: body.category || 'TIPS',
                authorId: user.id,
            },
            include: {
                author: { select: { id: true, firstName: true, lastName: true, role: true, store: { select: { name: true } } } },
                comments: true,
            },
        });
        return NextResponse.json(post, { status: 201 });
    }

    // Add comment (or reply)
    if (body.action === 'add_comment') {
        const comment = await prisma.communityComment.create({
            data: {
                postId: body.postId,
                content: body.content,
                authorId: user.id,
                parentId: body.parentId || null,  // Yanıt verirken parentId set edilir
            },
            include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
        });
        return NextResponse.json(comment, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
