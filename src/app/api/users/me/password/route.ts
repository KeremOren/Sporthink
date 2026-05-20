import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Mevcut ve yeni şifre gerekli' }, { status: 400 });
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
    }

    const bcryptjs = require('bcryptjs');
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

    const valid = bcryptjs.compareSync(currentPassword, dbUser.password);
    if (!valid) return NextResponse.json({ error: 'Mevcut şifre hatalı' }, { status: 400 });

    const hashed = bcryptjs.hashSync(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
    });

    return NextResponse.json({ success: true });
}
