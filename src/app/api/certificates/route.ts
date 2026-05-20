import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Generate certificate for completed training
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
        return NextResponse.json({ error: 'Assignment ID gerekli' }, { status: 400 });
    }

    try {
        const assignment = await prisma.trainingAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                training: true,
                user: { select: { firstName: true, lastName: true, email: true } },
            },
        });

        if (!assignment) {
            return NextResponse.json({ error: 'Atama bulunamadı' }, { status: 404 });
        }

        if (assignment.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Eğitim henüz tamamlanmamış' }, { status: 400 });
        }

        // Generate certificate HTML
        const certHtml = generateCertificateHtml({
            userName: `${assignment.user.firstName} ${assignment.user.lastName}`,
            trainingTitle: assignment.training.title,
            completedAt: assignment.completedAt || new Date(),
            certId: assignment.id.substring(0, 8).toUpperCase(),
        });

        return new Response(certHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    } catch (error) {
        console.error('Certificate error:', error);
        return NextResponse.json({ error: 'Sertifika oluşturulamadı' }, { status: 500 });
    }
}

// Get list of certificates for current user
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;

    const completedAssignments = await prisma.trainingAssignment.findMany({
        where: { userId: user.id, status: 'COMPLETED' },
        include: {
            training: { select: { title: true, category: true } },
        },
        orderBy: { completedAt: 'desc' },
    });

    const certificates = completedAssignments.map(a => ({
        id: a.id,
        trainingTitle: a.training.title,
        category: a.training.category,
        completedAt: a.completedAt,
        certCode: a.id.substring(0, 8).toUpperCase(),
    }));

    return NextResponse.json(certificates);
}

function generateCertificateHtml(data: { userName: string; trainingTitle: string; completedAt: Date; certId: string }) {
    const date = new Date(data.completedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Sertifika - ${data.userName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f4f8; }
.certificate {
    width: 900px; height: 636px; background: white;
    border: 3px solid #1a365d; position: relative; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.cert-border { position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px; border: 2px solid #c8a45a; }
.cert-inner-border { position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px; border: 1px solid #e8d5a0; }
.cert-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 60px; text-align: center; }
.cert-logo { font-size: 2rem; font-weight: 700; color: #1a365d; letter-spacing: 6px; margin-bottom: 8px; font-family: 'Inter', sans-serif; }
.cert-subtitle { font-size: 0.75rem; color: #666; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; }
.cert-title { font-family: 'Playfair Display', serif; font-size: 2.5rem; color: #c8a45a; margin-bottom: 20px; letter-spacing: 4px; }
.cert-text { font-size: 0.9rem; color: #555; margin-bottom: 8px; }
.cert-name { font-family: 'Playfair Display', serif; font-size: 2rem; color: #1a365d; margin: 12px 0; border-bottom: 2px solid #c8a45a; padding-bottom: 8px; display: inline-block; }
.cert-training { font-size: 1rem; color: #333; font-weight: 600; margin: 16px 0; padding: 8px 24px; background: #f8f4e8; border-radius: 4px; }
.cert-date { font-size: 0.8rem; color: #888; margin-top: 20px; }
.cert-id { position: absolute; bottom: 30px; right: 40px; font-size: 0.65rem; color: #bbb; font-family: monospace; }
.cert-corner { position: absolute; width: 60px; height: 60px; }
.cert-corner.tl { top: 20px; left: 20px; border-top: 3px solid #c8a45a; border-left: 3px solid #c8a45a; }
.cert-corner.tr { top: 20px; right: 20px; border-top: 3px solid #c8a45a; border-right: 3px solid #c8a45a; }
.cert-corner.bl { bottom: 20px; left: 20px; border-bottom: 3px solid #c8a45a; border-left: 3px solid #c8a45a; }
.cert-corner.br { bottom: 20px; right: 20px; border-bottom: 3px solid #c8a45a; border-right: 3px solid #c8a45a; }
@media print { body { background: white; } .certificate { box-shadow: none; } }
</style>
</head>
<body>
<div class="certificate">
    <div class="cert-border"></div>
    <div class="cert-inner-border"></div>
    <div class="cert-corner tl"></div>
    <div class="cert-corner tr"></div>
    <div class="cert-corner bl"></div>
    <div class="cert-corner br"></div>
    <div class="cert-content">
        <div class="cert-logo">SPORTHINK</div>
        <div class="cert-subtitle">Training Platform</div>
        <div class="cert-title">SERTİFİKA</div>
        <div class="cert-text">Bu belge ile,</div>
        <div class="cert-name">${data.userName}</div>
        <div class="cert-text">adlı çalışanın aşağıdaki eğitimi başarıyla tamamladığı onaylanır.</div>
        <div class="cert-training">${data.trainingTitle}</div>
        <div class="cert-date">Tamamlanma Tarihi: ${date}</div>
    </div>
    <div class="cert-id">Sertifika No: SPRT-${data.certId}</div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;
}
