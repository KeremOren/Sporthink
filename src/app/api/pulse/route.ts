import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

function parseOptions(raw: string | null): string[] {
    if (!raw) return [];
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
    } catch { return []; }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;

    const surveys = await prisma.pulseSurvey.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            responses: {
                select: {
                    id: true,
                    userId: true,
                    overallScore: true,
                    workloadScore: true,
                    teamScore: true,
                    managerScore: true,
                    growthScore: true,
                    selectedOption: true,
                    comment: true,
                    createdAt: true,
                },
            },
            createdBy: { select: { firstName: true, lastName: true } },
        },
        take: 24,
    });

    const now = new Date();

    const enriched = surveys.map(survey => {
        const myResponse = survey.responses.find(r => r.userId === user.id);
        const totalResponses = survey.responses.length;
        const isPoll = !!survey.question && !!survey.options;
        const options = isPoll ? parseOptions(survey.options) : [];
        const isExpired = !!survey.expiresAt && new Date(survey.expiresAt) < now;
        const isOpen = survey.isActive && !isExpired;

        // Multi-choice poll aggregations
        let optionCounts: number[] = [];
        if (isPoll) {
            optionCounts = options.map(() => 0);
            survey.responses.forEach(r => {
                if (typeof r.selectedOption === 'number' && r.selectedOption >= 0 && r.selectedOption < optionCounts.length) {
                    optionCounts[r.selectedOption]++;
                }
            });
        }

        // Legacy scored averages
        const scored = survey.responses.filter(r => r.overallScore != null);
        const scoredCount = scored.length;
        const avg = (key: 'overallScore' | 'workloadScore' | 'teamScore' | 'managerScore' | 'growthScore') => {
            const arr = survey.responses.filter(r => r[key] != null);
            if (!arr.length) return 0;
            return Math.round((arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length) * 10) / 10;
        };

        return {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            period: survey.period,
            isActive: survey.isActive,
            isAnonymous: survey.isAnonymous,
            isPoll,
            isOpen,
            isExpired,
            question: survey.question,
            options,
            optionCounts,
            createdBy: survey.createdBy,
            createdAt: survey.createdAt,
            expiresAt: survey.expiresAt,
            hasResponded: !!myResponse,
            myResponse: myResponse || null,
            totalResponses,
            averages: scoredCount > 0
                ? { overall: avg('overallScore'), workload: avg('workloadScore'), team: avg('teamScore'), manager: avg('managerScore'), growth: avg('growthScore') }
                : { overall: 0, workload: 0, team: 0, manager: 0, growth: 0 },
            comments: (user.role !== 'EMPLOYEE') ? survey.responses.filter(r => r.comment).map(r => ({
                comment: r.comment,
                createdAt: r.createdAt,
            })) : [],
        };
    });

    return NextResponse.json(enriched);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();

    if (body.action === 'create') {
        if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
        }

        // Multi-choice poll path
        if (body.question && Array.isArray(body.options)) {
            const cleanOptions = body.options.map((o: any) => String(o || '').trim()).filter((o: string) => o.length > 0);
            if (cleanOptions.length < 2) {
                return NextResponse.json({ error: 'En az 2 şık girmelisiniz' }, { status: 400 });
            }
            const survey = await prisma.pulseSurvey.create({
                data: {
                    title: body.title || body.question.slice(0, 80),
                    description: body.description || null,
                    period: body.period || new Date().toISOString().slice(0, 7),
                    isAnonymous: body.isAnonymous !== false,
                    createdById: user.id,
                    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
                    question: body.question,
                    options: JSON.stringify(cleanOptions),
                },
            });
            return NextResponse.json(survey, { status: 201 });
        }

        // Legacy scored survey
        const survey = await prisma.pulseSurvey.create({
            data: {
                title: body.title,
                description: body.description || null,
                period: body.period,
                isAnonymous: body.isAnonymous !== false,
                createdById: user.id,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            },
        });
        return NextResponse.json(survey, { status: 201 });
    }

    if (body.action === 'respond') {
        const existing = await prisma.pulseSurveyResponse.findUnique({
            where: { surveyId_userId: { surveyId: body.surveyId, userId: user.id } },
        });
        if (existing) return NextResponse.json({ error: 'Bu ankete zaten yanıt verdiniz' }, { status: 400 });

        // Check expiry
        const survey = await prisma.pulseSurvey.findUnique({ where: { id: body.surveyId } });
        if (!survey) return NextResponse.json({ error: 'Anket bulunamadı' }, { status: 404 });
        if (!survey.isActive) return NextResponse.json({ error: 'Anket kapalı' }, { status: 400 });
        if (survey.expiresAt && new Date(survey.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'Anket süresi doldu' }, { status: 400 });
        }

        // Multi-choice poll response
        if (survey.question && survey.options) {
            const opts = parseOptions(survey.options);
            const idx = Number(body.selectedOption);
            if (!Number.isInteger(idx) || idx < 0 || idx >= opts.length) {
                return NextResponse.json({ error: 'Geçersiz şık' }, { status: 400 });
            }
            const response = await prisma.pulseSurveyResponse.create({
                data: {
                    surveyId: body.surveyId,
                    userId: user.id,
                    selectedOption: idx,
                    comment: body.comment || null,
                },
            });
            return NextResponse.json(response, { status: 201 });
        }

        // Legacy scored response
        const response = await prisma.pulseSurveyResponse.create({
            data: {
                surveyId: body.surveyId,
                userId: user.id,
                overallScore: body.overallScore,
                workloadScore: body.workloadScore || null,
                teamScore: body.teamScore || null,
                managerScore: body.managerScore || null,
                growthScore: body.growthScore || null,
                comment: body.comment || null,
            },
        });
        return NextResponse.json(response, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
