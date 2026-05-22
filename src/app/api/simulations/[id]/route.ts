import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { awardXp, checkAndAwardBadges } from '@/lib/gamification';
import { notifyUser } from '@/lib/notify';

type Scores = { empati: number; bilgi: number; caprazSatis: number; kapanis: number };
type Choice = { text: string; scores: Scores; feedback?: string; isBest?: boolean };
type Step = { npc: string; choices: Choice[] };

function parseSteps(raw: string): Step[] {
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : [];
    } catch { return []; }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const user = session.user as any;

    const scenario = await prisma.simScenario.findUnique({ where: { id } });
    if (!scenario) return NextResponse.json({ error: 'Senaryo bulunamadı' }, { status: 404 });

    const steps = parseSteps(scenario.steps);
    // Strip evaluation fields from choices when sending to client (anti-cheat)
    const safeSteps = steps.map(s => ({
        npc: s.npc,
        choices: s.choices.map(c => ({ text: c.text })),
    }));

    const myAttempts = await prisma.simAttempt.findMany({
        where: { userId: user.id, scenarioId: id },
        orderBy: { completedAt: 'desc' },
        take: 5,
    });

    return NextResponse.json({
        id: scenario.id,
        category: scenario.category,
        title: scenario.title,
        description: scenario.description,
        difficulty: scenario.difficulty,
        xpReward: scenario.xpReward,
        customerContext: scenario.customerContext,
        stepCount: steps.length,
        steps: safeSteps,
        myAttempts: myAttempts.map(a => ({
            id: a.id,
            score: a.score,
            xpEarned: a.xpEarned,
            badge: a.badge,
            completedAt: a.completedAt,
        })),
    });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const user = session.user as any;
    const body = await req.json();

    const choices: number[] = Array.isArray(body.choices) ? body.choices.map((c: any) => Number(c)) : [];
    const durationSeconds: number | null = typeof body.durationSeconds === 'number' ? body.durationSeconds : null;

    const scenario = await prisma.simScenario.findUnique({ where: { id } });
    if (!scenario) return NextResponse.json({ error: 'Senaryo bulunamadı' }, { status: 404 });

    const steps = parseSteps(scenario.steps);
    if (choices.length !== steps.length) {
        return NextResponse.json({ error: 'Eksik veya fazla seçim' }, { status: 400 });
    }

    // Compute scores
    const totals: Scores = { empati: 0, bilgi: 0, caprazSatis: 0, kapanis: 0 };
    const maxTotals: Scores = { empati: 0, bilgi: 0, caprazSatis: 0, kapanis: 0 };
    const breakdown: Array<{
        stepIndex: number;
        npc: string;
        choiceIndex: number;
        choiceText: string;
        scores: Scores;
        feedback: string;
        isBest: boolean;
        bestChoiceIndex: number;
        bestChoiceText: string;
    }> = [];

    steps.forEach((step, i) => {
        const idx = choices[i];
        const choice = step.choices[idx];
        if (!choice) return;

        totals.empati += choice.scores?.empati || 0;
        totals.bilgi += choice.scores?.bilgi || 0;
        totals.caprazSatis += choice.scores?.caprazSatis || 0;
        totals.kapanis += choice.scores?.kapanis || 0;

        // Max possible per step = best per dimension across all choices
        const stepMax = step.choices.reduce(
            (acc, c) => ({
                empati: Math.max(acc.empati, c.scores?.empati || 0),
                bilgi: Math.max(acc.bilgi, c.scores?.bilgi || 0),
                caprazSatis: Math.max(acc.caprazSatis, c.scores?.caprazSatis || 0),
                kapanis: Math.max(acc.kapanis, c.scores?.kapanis || 0),
            }),
            { empati: 0, bilgi: 0, caprazSatis: 0, kapanis: 0 }
        );
        maxTotals.empati += stepMax.empati;
        maxTotals.bilgi += stepMax.bilgi;
        maxTotals.caprazSatis += stepMax.caprazSatis;
        maxTotals.kapanis += stepMax.kapanis;

        // Find best choice index for review
        let bestIdx = 0;
        let bestSum = -1;
        step.choices.forEach((c, j) => {
            if (c.isBest) {
                bestIdx = j;
                bestSum = Infinity;
                return;
            }
            const sum = (c.scores?.empati || 0) + (c.scores?.bilgi || 0) + (c.scores?.caprazSatis || 0) + (c.scores?.kapanis || 0);
            if (sum > bestSum) {
                bestIdx = j;
                bestSum = sum;
            }
        });

        breakdown.push({
            stepIndex: i,
            npc: step.npc,
            choiceIndex: idx,
            choiceText: choice.text,
            scores: choice.scores || { empati: 0, bilgi: 0, caprazSatis: 0, kapanis: 0 },
            feedback: choice.feedback || '',
            isBest: !!choice.isBest || idx === bestIdx,
            bestChoiceIndex: bestIdx,
            bestChoiceText: step.choices[bestIdx]?.text || '',
        });
    });

    const pct = (got: number, max: number) => max > 0 ? Math.round((got / max) * 100) : 0;
    const empatiPct = pct(totals.empati, maxTotals.empati);
    const bilgiPct = pct(totals.bilgi, maxTotals.bilgi);
    const caprazPct = pct(totals.caprazSatis, maxTotals.caprazSatis);
    const kapanisPct = pct(totals.kapanis, maxTotals.kapanis);
    const overall = Math.round((empatiPct + bilgiPct + caprazPct + kapanisPct) / 4);

    // XP: scale reward by performance
    const xpEarned = Math.round((scenario.xpReward * overall) / 100);

    // Badges
    let badge: string | null = null;
    if (overall >= 90) badge = 'ALTIN_SATICI';
    else if (empatiPct >= 90) badge = 'EMPATI_USTASI';
    else if (caprazPct >= 90) badge = 'CAPRAZ_SATIS_USTASI';
    else if (kapanisPct >= 90) badge = 'KAPANIS_USTASI';
    else if (bilgiPct >= 90) badge = 'URUN_UZMANI';

    const attempt = await prisma.simAttempt.create({
        data: {
            scenarioId: id,
            userId: user.id,
            score: overall,
            empatiScore: empatiPct,
            bilgiScore: bilgiPct,
            caprazSatisScore: caprazPct,
            kapanisScore: kapanisPct,
            xpEarned,
            badge,
            choices: JSON.stringify(choices),
            durationSeconds,
        },
    });

    // === XP LEDGER + ROZET KONTROLÜ ===
    if (xpEarned > 0) {
        await awardXp({
            userId: user.id,
            amount: xpEarned,
            source: 'SIMULATION',
            sourceId: attempt.id,
            reason: `Simülasyon: skor ${overall}`,
        });
    }
    let newBadges: string[] = [];
    try {
        newBadges = await checkAndAwardBadges(user.id);
        for (const code of newBadges) {
            const badgeRow = await prisma.badge.findUnique({ where: { code } });
            if (badgeRow) {
                notifyUser({
                    userId: user.id,
                    type: 'BADGE_EARNED',
                    title: 'Yeni rozet kazandın! 🏆',
                    message: `"${badgeRow.name}" — ${badgeRow.description}`,
                    link: '/achievements',
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.warn('[sim] badge check failed:', e);
    }

    return NextResponse.json({
        attemptId: attempt.id,
        score: overall,
        scores: {
            empati: empatiPct,
            bilgi: bilgiPct,
            caprazSatis: caprazPct,
            kapanis: kapanisPct,
        },
        xpEarned,
        badge,
        newBadges,
        breakdown,
    });
}
