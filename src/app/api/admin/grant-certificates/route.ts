import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * TEK SEFERLİK DEMO ENDPOINT'İ
 * Belirli bir çalışana tamamlanmış eğitimler kazandırır → Sertifikalarım sayfasında görünür.
 * Sadece SUPER_ADMIN erişebilir. Sergi/demo sonrası silinecek.
 *
 * Kullanım: tarayıcıdan /api/admin/grant-certificates adresini ziyaret et.
 */
const TARGET_EMAIL = 'alara.deniz@sporthink.com';
const HOW_MANY = 4; // kaç eğitim tamamlanmış gösterilsin

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = session.user as any;
    if (admin.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Sadece Super Admin' }, { status: 403 });
    }

    // Hedef çalışanı bul
    const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
    if (!user) {
        return NextResponse.json({ error: `Kullanıcı bulunamadı: ${TARGET_EMAIL}` }, { status: 404 });
    }

    // Aktif eğitimlerden bir kaçını seç
    const trainings = await prisma.training.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        take: HOW_MANY,
        select: { id: true, title: true },
    });

    if (trainings.length === 0) {
        return NextResponse.json({ error: 'Aktif eğitim bulunamadı' }, { status: 404 });
    }

    const now = new Date();
    const results: { training: string; action: string }[] = [];

    for (let i = 0; i < trainings.length; i++) {
        const t = trainings[i];
        // Tamamlanma tarihini biraz geçmişe yay (gerçekçi görünsün)
        const completedAt = new Date(now.getTime() - (i + 1) * 5 * 24 * 60 * 60 * 1000);

        const existing = await prisma.trainingAssignment.findUnique({
            where: { trainingId_userId: { trainingId: t.id, userId: user.id } },
        });

        if (existing) {
            await prisma.trainingAssignment.update({
                where: { id: existing.id },
                data: { status: 'COMPLETED', completedAt, startedAt: existing.startedAt || completedAt },
            });
            results.push({ training: t.title, action: 'güncellendi → COMPLETED' });
        } else {
            await prisma.trainingAssignment.create({
                data: {
                    trainingId: t.id,
                    userId: user.id,
                    assignedById: admin.id,
                    status: 'COMPLETED',
                    startedAt: completedAt,
                    completedAt,
                },
            });
            results.push({ training: t.title, action: 'oluşturuldu → COMPLETED' });
        }
    }

    return NextResponse.json({
        success: true,
        user: `${user.firstName} ${user.lastName} (${user.email})`,
        message: `${results.length} eğitim tamamlandı olarak işaretlendi. Bu çalışanla giriş yapıp Sertifikalarım sayfasını açabilirsin.`,
        results,
    });
}
