/**
 * Seeds Satış Simülasyonu scenarios (Sporthink — spor perakende).
 * Run: node prisma/seed-simulations.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Compact helper: c(text, [e,b,c,k], feedback?, isBest?)
//   scores order: empati, bilgi, caprazSatis, kapanis (0-3)
function c(text, scores, feedback = '', isBest = false) {
    return {
        text,
        scores: { empati: scores[0], bilgi: scores[1], caprazSatis: scores[2], kapanis: scores[3] },
        feedback,
        isBest,
    };
}
// step(npc, choices)
function step(npc, choices) { return { npc, choices }; }

// Each scenario: { category, title, description, difficulty, xpReward, customerContext, steps }
const SCENARIOS = [];

// Will be filled by category blocks below.
require('./sim-scenarios/musteri-karsilama')(SCENARIOS, step, c);
require('./sim-scenarios/urun-onerme')(SCENARIOS, step, c);
require('./sim-scenarios/itiraz')(SCENARIOS, step, c);
require('./sim-scenarios/ek-satis')(SCENARIOS, step, c);
require('./sim-scenarios/iade-sikayet')(SCENARIOS, step, c);

async function main() {
    console.log(`Seeding ${SCENARIOS.length} simulation scenarios...`);
    await prisma.simAttempt.deleteMany();
    await prisma.simScenario.deleteMany();

    let sortOrder = 0;
    for (const s of SCENARIOS) {
        await prisma.simScenario.create({
            data: {
                category: s.category,
                title: s.title,
                description: s.description,
                difficulty: s.difficulty,
                xpReward: s.xpReward,
                customerContext: s.customerContext,
                steps: JSON.stringify(s.steps),
                sortOrder: sortOrder++,
            },
        });
        console.log(`  ✓ [${s.category}] ${s.title}`);
    }
    console.log(`\nDone. ${SCENARIOS.length} scenarios created.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
