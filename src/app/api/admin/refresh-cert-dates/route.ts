import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * TEK SEFERLİK: alara.deniz'in tamamlanmış eğitimlerinin completedAt tarihini
 * güncel (bugün) yapar — sertifika tarihi güncel görünsün. Demo sonrası silinecek.
 * Sadece SUPER_ADMIN.
 */
const TARGET_EMAIL = 'alara.deniz@sporthink.com';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Sadece Super Admin' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
    if (!user) return NextResponse.json({ error: `Kullanıcı bulunamadı: ${TARGET_EMAIL}` }, { status: 404 });

    const result = await prisma.trainingAssignment.updateMany({
        where: { userId: user.id, status: 'COMPLETED' },
        data: { completedAt: new Date() },
    });

    return NextResponse.json({
        success: true,
        message: `${result.count} sertifikanın tarihi bugüne güncellendi.`,
    });
}
