import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';
import { awardXp, checkAndAwardBadges, XP_REWARDS } from '@/lib/gamification';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const trainingId = searchParams.get('trainingId');
    if (!trainingId) return NextResponse.json({ error: 'trainingId required' }, { status: 400 });

    const training = await prisma.training.findUnique({
        where: { id: trainingId },
        select: { id: true, title: true, description: true, category: true, type: true, durationMinutes: true, minPassRate: true },
    });
    if (!training) return NextResponse.json({ error: 'Training not found' }, { status: 404 });

    const assignments = await prisma.trainingAssignment.findMany({
        where: { trainingId },
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    id: true, firstName: true, lastName: true, email: true, role: true,
                    store: { select: { id: true, name: true } },
                },
            },
            assignedBy: { select: { firstName: true, lastName: true } },
        },
    });

    return NextResponse.json({ training, assignments });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['SUPER_ADMIN', 'STORE_MANAGER'].includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { trainingId, userIds, dueDate } = await req.json();

    const training = await prisma.training.findUnique({
        where: { id: trainingId },
        select: { id: true, title: true },
    });

    const assignments = await Promise.all(
        userIds.map(async (userId: string) => {
            // Mevcut atama var mı kontrol et (yeni atama mı yoksa güncelleme mi?)
            const existing = await prisma.trainingAssignment.findUnique({
                where: { trainingId_userId: { trainingId, userId } },
            });

            const assignment = await prisma.trainingAssignment.upsert({
                where: { trainingId_userId: { trainingId, userId } },
                update: { dueDate: dueDate ? new Date(dueDate) : null },
                create: {
                    trainingId,
                    userId,
                    assignedById: user.id,
                    dueDate: dueDate ? new Date(dueDate) : null,
                },
            });

            // Yeni atama ise bildirim gönder
            if (!existing && training) {
                const dueText = dueDate
                    ? ` Son tarih: ${new Date(dueDate).toLocaleDateString('tr-TR')}.`
                    : '';
                notifyUser({
                    userId,
                    type: 'TRAINING_ASSIGNED',
                    title: 'Yeni eğitim atandı',
                    message: `"${training.title}" eğitimi size atandı.${dueText}`,
                    link: `/trainings/${trainingId}`,
                }).catch(() => {});
            }

            return assignment;
        })
    );

    return NextResponse.json({ count: assignments.length });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignmentId, status } = await req.json();
    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

    if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Önceki durumu al (XP çift verilmesini engellemek için)
    const previousAssignment = await prisma.trainingAssignment.findUnique({
        where: { id: assignmentId },
        include: { training: { select: { id: true, title: true } } },
    });

    const updateData: any = { status };
    if (status === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    const assignment = await prisma.trainingAssignment.update({
        where: { id: assignmentId },
        data: updateData,
    });

    // === XP + ROZET ÖDÜLLERİ ===
    let xpAwarded = 0;
    let newBadges: string[] = [];
    // Sadece ilk kez COMPLETED olunca XP ver (zaten COMPLETED ise tekrar verme)
    if (status === 'COMPLETED' && previousAssignment && previousAssignment.status !== 'COMPLETED') {
        await awardXp({
            userId: previousAssignment.userId,
            amount: XP_REWARDS.TRAINING_COMPLETE,
            source: 'TRAINING_COMPLETE',
            sourceId: previousAssignment.training?.id,
            reason: `Eğitim tamamlandı: ${previousAssignment.training?.title || ''}`,
        });
        xpAwarded = XP_REWARDS.TRAINING_COMPLETE;

        try {
            newBadges = await checkAndAwardBadges(previousAssignment.userId);
            for (const code of newBadges) {
                const badge = await prisma.badge.findUnique({ where: { code } });
                if (badge) {
                    notifyUser({
                        userId: previousAssignment.userId,
                        type: 'BADGE_EARNED',
                        title: 'Yeni rozet kazandın! 🏆',
                        message: `"${badge.name}" — ${badge.description}`,
                        link: '/achievements',
                    }).catch(() => {});
                }
            }
        } catch (e) {
            console.warn('[training] badge check failed:', e);
        }
    }

    return NextResponse.json({ ...assignment, xpAwarded, newBadges });
}
