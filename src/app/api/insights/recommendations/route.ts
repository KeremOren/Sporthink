import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';
import { notifyUsers } from '@/lib/notify';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sporthink.com';
if (VAPID_PUBLIC && VAPID_PRIVATE) {
    try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); } catch {}
}

async function sendPushToUsers(userIds: string[], payload: { title: string; body: string; url?: string }) {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
    try {
        const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
        const body = JSON.stringify({ ...payload, tag: 'training-assigned-' + Date.now() });
        const invalidEndpoints: string[] = [];
        await Promise.all(subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    body
                );
            } catch (err: any) {
                if (err?.statusCode === 410 || err?.statusCode === 404) invalidEndpoints.push(sub.endpoint);
            }
        }));
        if (invalidEndpoints.length > 0) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: invalidEndpoints } } });
        }
    } catch (e) {
        console.warn('[push] sendPushToUsers failed:', e);
    }
}

/**
 * Akıllı Eğitim Önerisi API
 *
 * Her mağaza × KPI anomalisi için, KPI'yı düzeltebilecek eğitimleri öner.
 * KPI ↔ Eğitim ilişkisini başlık / kategori eşleştirmesiyle kurar.
 *
 * GET: Önerileri listele
 * POST: Belirli bir öneriyi UYGULA (training assignment oluştur)
 */

// KPI adı → ilişkili eğitim başlığı/kategorisi anahtar kelimeleri
const KPI_TO_TRAINING_KEYWORDS: Record<string, { categories: string[]; titleKeywords: string[]; reason: string }> = {
    'Aylık Ciro': {
        categories: ['Satış'],
        titleKeywords: ['satış', 'müşteri', 'karşılama', 'çapraz'],
        reason: 'Ciro düşüşü genelde satış teknikleri ve müşteri ilişkilerinden kaynaklanır',
    },
    'Sepet Ortalaması': {
        categories: ['Satış'],
        titleKeywords: ['çapraz', 'ek satış', 'müşteri ilişkileri'],
        reason: 'Sepet ortalaması düşüşü → çapraz satış / ek satış eğitimi',
    },
    'UPT': {
        categories: ['Satış'],
        titleKeywords: ['çapraz', 'ek satış', 'müşteri karşılama'],
        reason: 'UPT düşüşü → ek ürün önerme eğitimi gerekli',
    },
    'Dönüşüm Oranı': {
        categories: ['Satış'],
        titleKeywords: ['müşteri karşılama', 'satış teknikleri', 'kapanış'],
        reason: 'Dönüşüm düşüşü → müşteri karşılama ve kapanış teknikleri',
    },
    'Ürün Satış Adedi': {
        categories: ['Satış', 'Ürün'],
        titleKeywords: ['satış', 'ürün bilgisi', 'çapraz'],
        reason: 'Adet düşüşü → ürün bilgisi ve satış teknikleri',
    },
    'Hedef Gerçekleşme Oranı': {
        categories: ['Satış', 'Yönetim'],
        titleKeywords: ['satış', 'liderlik', 'hedef'],
        reason: 'Hedef tutturulamıyor → satış + liderlik eğitimi',
    },
    'Tekli Fatura Oranı': {
        categories: ['Satış'],
        titleKeywords: ['çapraz', 'ek satış'],
        reason: 'Tek ürünlü fatura çok → çapraz satış geliştirilmeli',
    },
    'Müşteri Memnuniyeti': {
        categories: ['Satış'],
        titleKeywords: ['müşteri karşılama', 'müşteri ilişkileri', 'şikayet'],
        reason: 'Müşteri memnuniyeti düşüşü → karşılama standartları',
    },
};

// KPI → simülasyondaki beceri puanı (hedefleme için)
// Bu becerinin ortalaması düşük olan çalışanlar önceliklendirilir
const KPI_TO_SKILL: Record<string, 'empati' | 'bilgi' | 'capraz' | 'kapanis' | null> = {
    'Aylık Ciro': 'capraz',           // ciro → çapraz satış
    'Sepet Ortalaması': 'capraz',     // sepet → çapraz satış
    'UPT': 'capraz',                  // birim/işlem → çapraz satış
    'Tekli Fatura Oranı': 'capraz',   // tek ürünlü → çapraz satış geliştirilmeli
    'Dönüşüm Oranı': 'kapanis',       // dönüşüm → kapanış
    'Hedef Gerçekleşme Oranı': 'kapanis',
    'Ürün Satış Adedi': 'bilgi',      // adet → ürün bilgisi
    'Müşteri Memnuniyeti': 'empati',  // memnuniyet → empati
};

// Performans eşiği: bu becerideki ortalaması bu değerin ALTINDA olanlar hedeflenir
const PERFORMANCE_THRESHOLD = 75;

const ANOMALY_THRESHOLDS: Record<string, { medium: number; high: number; direction: 'down' | 'up' }> = {
    'Aylık Ciro':              { medium: 10, high: 20, direction: 'down' },
    'Ürün Satış Adedi':        { medium: 10, high: 20, direction: 'down' },
    'Sepet Ortalaması':        { medium: 8, high: 15, direction: 'down' },
    'Dönüşüm Oranı':           { medium: 15, high: 30, direction: 'down' },
    'UPT':                     { medium: 10, high: 20, direction: 'down' },
    'Hedef Gerçekleşme Oranı': { medium: 10, high: 20, direction: 'down' },
    'Müşteri Memnuniyeti':     { medium: 5, high: 10, direction: 'down' },
    'Tekli Fatura Oranı':      { medium: 8, high: 15, direction: 'up' },
};

async function detectAnomalies(scopedStoreIds: string[]) {
    const kpiNames = Object.keys(ANOMALY_THRESHOLDS);
    const defs = await prisma.kpiDefinition.findMany({
        where: { name: { in: kpiNames }, isActive: true },
    });
    const entries = await prisma.kpiEntry.findMany({
        where: {
            kpiDefinitionId: { in: defs.map(d => d.id) },
            storeId: { in: scopedStoreIds },
        },
        orderBy: { period: 'asc' },
        select: { storeId: true, kpiDefinitionId: true, period: true, value: true },
    });

    const defMap = new Map(defs.map(d => [d.id, d]));
    const groups: Record<string, Array<{ period: string; value: number }>> = {};
    for (const e of entries) {
        const key = `${e.storeId}__${e.kpiDefinitionId}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ period: e.period, value: e.value });
    }

    const anomalies: Array<{
        storeId: string; kpiName: string; kpiUnit: string; changePct: number; severity: 'HIGH' | 'MEDIUM' | 'LOW';
        latestValue: number; prevValue: number;
    }> = [];

    for (const [key, series] of Object.entries(groups)) {
        const [storeId, kpiDefId] = key.split('__');
        const def = defMap.get(kpiDefId);
        if (!def) continue;
        series.sort((a, b) => a.period.localeCompare(b.period));
        if (series.length < 2) continue;
        const latest = series[series.length - 1];
        const prev = series[series.length - 2];
        if (prev.value === 0) continue;

        const changePct = ((latest.value - prev.value) / prev.value) * 100;
        const thr = ANOMALY_THRESHOLDS[def.name];
        if (!thr) continue;

        let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        let hit = false;
        if (thr.direction === 'down') {
            const drop = -changePct;
            if (drop >= thr.high) { hit = true; severity = 'HIGH'; }
            else if (drop >= thr.medium) { hit = true; severity = 'MEDIUM'; }
        } else {
            const rise = changePct;
            if (rise >= thr.high) { hit = true; severity = 'HIGH'; }
            else if (rise >= thr.medium) { hit = true; severity = 'MEDIUM'; }
        }

        if (!hit) continue;
        anomalies.push({
            storeId, kpiName: def.name, kpiUnit: def.unit || '',
            changePct: Math.round(changePct * 10) / 10,
            severity, latestValue: latest.value, prevValue: prev.value,
        });
    }
    return anomalies;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const role = user.role;

    const storeWhere: any = {};
    if (role === 'REGIONAL_MANAGER') storeWhere.regionId = user.regionId;
    else if (role === 'STORE_MANAGER' || role === 'ASSISTANT_MANAGER') storeWhere.id = user.storeId;

    const stores = await prisma.store.findMany({ where: storeWhere, select: { id: true, name: true } });
    const storeMap = new Map(stores.map(s => [s.id, s]));
    const anomalies = await detectAnomalies(stores.map(s => s.id));

    // Get all available trainings (active)
    const trainings = await prisma.training.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, title: true, category: true, durationMinutes: true },
    });

    // Build recommendations: for each anomaly, find matching trainings
    type Recommendation = {
        id: string; // synthetic id: storeId__kpiName__trainingId
        storeId: string;
        storeName: string;
        kpiName: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
        changePct: number;
        latestValue: number;
        prevValue: number;
        kpiUnit: string;
        reason: string;
        training: { id: string; title: string; category: string | null; durationMinutes: number | null };
        affectedEmployeeCount: number;
    };

    const recommendations: Recommendation[] = [];

    for (const a of anomalies) {
        const map = KPI_TO_TRAINING_KEYWORDS[a.kpiName];
        if (!map) continue;

        // Find matching trainings (by category OR title keyword)
        const matches = trainings.filter(t => {
            const titleLc = t.title.toLowerCase();
            const catLc = (t.category || '').toLowerCase();
            const catMatch = map.categories.some(c => catLc === c.toLowerCase());
            const titleMatch = map.titleKeywords.some(k => titleLc.includes(k.toLowerCase()));
            return catMatch || titleMatch;
        });
        // Take top 2 most relevant (titleMatch first)
        const ranked = matches
            .map(t => {
                const titleLc = t.title.toLowerCase();
                const score = map.titleKeywords.reduce((acc, k) => acc + (titleLc.includes(k.toLowerCase()) ? 2 : 0), 0)
                              + map.categories.reduce((acc, c) => acc + ((t.category || '').toLowerCase() === c.toLowerCase() ? 1 : 0), 0);
                return { t, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(x => x.t);

        // Count affected employees at this store
        const empCount = await prisma.user.count({
            where: { storeId: a.storeId, role: { in: ['EMPLOYEE', 'ASSISTANT_MANAGER'] }, isActive: true },
        });

        const store = storeMap.get(a.storeId);
        if (!store) continue;

        for (const t of ranked) {
            recommendations.push({
                id: `${a.storeId}__${a.kpiName}__${t.id}`,
                storeId: a.storeId,
                storeName: store.name,
                kpiName: a.kpiName,
                severity: a.severity,
                changePct: a.changePct,
                latestValue: a.latestValue,
                prevValue: a.prevValue,
                kpiUnit: a.kpiUnit,
                reason: map.reason,
                training: t,
                affectedEmployeeCount: empCount,
            });
        }
    }

    // Sort: HIGH > MEDIUM > LOW
    const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    recommendations.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

    return NextResponse.json({
        recommendations,
        summary: {
            total: recommendations.length,
            high: recommendations.filter(r => r.severity === 'HIGH').length,
            uniqueStores: new Set(recommendations.map(r => r.storeId)).size,
            uniqueTrainings: new Set(recommendations.map(r => r.training.id)).size,
        },
    });
}

/**
 * POST /api/insights/recommendations
 * Body: { storeId, trainingId, kpiName }
 * Action: Mağazadaki tüm aktif EMPLOYEE + ASSISTANT_MANAGER'lara eğitim ataması yapar
 */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const role = user.role;
    if (!['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const body = await req.json();
    const { storeId, trainingId, kpiName } = body;
    if (!storeId || !trainingId) return NextResponse.json({ error: 'storeId ve trainingId gerekli' }, { status: 400 });

    // Permission scope check
    if (role === 'STORE_MANAGER' && user.storeId !== storeId) {
        return NextResponse.json({ error: 'Sadece kendi mağazanıza atama yapabilirsiniz' }, { status: 403 });
    }
    if (role === 'REGIONAL_MANAGER') {
        const store = await prisma.store.findUnique({ where: { id: storeId } });
        if (!store || store.regionId !== user.regionId) {
            return NextResponse.json({ error: 'Sadece kendi bölgenize atama yapabilirsiniz' }, { status: 403 });
        }
    }

    // Tüm aktif çalışanları al
    const allEmployees = await prisma.user.findMany({
        where: {
            storeId,
            role: { in: ['EMPLOYEE', 'ASSISTANT_MANAGER'] },
            isActive: true,
        },
        select: { id: true, firstName: true, lastName: true },
    });

    if (allEmployees.length === 0) {
        return NextResponse.json({ error: 'Atama yapılacak çalışan bulunamadı' }, { status: 404 });
    }

    // === PERFORMANSA GÖRE HEDEFLEME ===
    // KPI'a göre ilgili beceriyi bul (capraz/kapanis/empati/bilgi)
    const targetSkill = kpiName ? KPI_TO_SKILL[kpiName] : null;
    const empIds = allEmployees.map(e => e.id);

    // Her çalışanın son sim attempt'lerini çek (max 5 son deneme)
    const recentAttempts = await prisma.simAttempt.findMany({
        where: { userId: { in: empIds } },
        select: {
            userId: true,
            empatiScore: true,
            bilgiScore: true,
            caprazSatisScore: true,
            kapanisScore: true,
            score: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 200, // bir mağazada toplam 200 deneme — yeterli
    });

    // Çalışan başına ortalama hesapla
    type Perf = { count: number; avgRelevant: number; avgOverall: number };
    const perfByUser: Record<string, Perf> = {};
    for (const emp of allEmployees) perfByUser[emp.id] = { count: 0, avgRelevant: 0, avgOverall: 0 };

    const accumulator: Record<string, { relSum: number; ovSum: number; n: number }> = {};
    for (const emp of allEmployees) accumulator[emp.id] = { relSum: 0, ovSum: 0, n: 0 };

    for (const a of recentAttempts) {
        const acc = accumulator[a.userId];
        if (!acc) continue;
        if (acc.n >= 5) continue; // her kullanıcı için son 5 deneme
        let relevant = a.score;
        if (targetSkill === 'empati') relevant = a.empatiScore;
        else if (targetSkill === 'bilgi') relevant = a.bilgiScore;
        else if (targetSkill === 'capraz') relevant = a.caprazSatisScore;
        else if (targetSkill === 'kapanis') relevant = a.kapanisScore;
        acc.relSum += relevant;
        acc.ovSum += a.score;
        acc.n += 1;
    }

    // Hedef listesini oluştur
    const targeted: Array<{
        id: string;
        firstName: string;
        lastName: string;
        reason: 'NO_DATA' | 'LOW_SKILL';
        relevantScore: number | null;
    }> = [];

    for (const emp of allEmployees) {
        const acc = accumulator[emp.id];
        if (acc.n === 0) {
            // Hiç simülasyon yapmamış → eğitimden faydalanır
            targeted.push({
                id: emp.id,
                firstName: emp.firstName,
                lastName: emp.lastName,
                reason: 'NO_DATA',
                relevantScore: null,
            });
        } else {
            const avgRelevant = acc.relSum / acc.n;
            if (avgRelevant < PERFORMANCE_THRESHOLD) {
                targeted.push({
                    id: emp.id,
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    reason: 'LOW_SKILL',
                    relevantScore: Math.round(avgRelevant),
                });
            }
        }
    }

    if (targeted.length === 0) {
        return NextResponse.json({
            success: true,
            created: 0,
            skipped: 0,
            totalEmployees: allEmployees.length,
            targetedUsers: [],
            message: 'Bu mağazadaki tüm çalışanlar bu beceride yeterli performansta — atama yapılmadı.',
        });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 2 hafta süre

    const assignedUsers: typeof targeted = [];
    const skippedUsers: typeof targeted = [];
    let created = 0;
    let skipped = 0;
    for (const emp of targeted) {
        // Zaten atanmış mı?
        const existing = await prisma.trainingAssignment.findUnique({
            where: { trainingId_userId: { trainingId, userId: emp.id } },
        });
        if (existing) {
            skipped++;
            skippedUsers.push(emp);
            continue;
        }
        await prisma.trainingAssignment.create({
            data: {
                id: uuidv4(),
                trainingId,
                userId: emp.id,
                assignedById: user.id,
                status: 'NOT_STARTED',
                dueDate,
            },
        });
        created++;
        assignedUsers.push(emp);
    }

    // Audit log
    await prisma.auditLog.create({
        data: {
            id: uuidv4(),
            userId: user.id,
            action: 'AI_TRAINING_RECOMMENDED',
            entity: 'TrainingAssignment',
            details: JSON.stringify({
                storeId, trainingId, kpiName,
                targetSkill, threshold: PERFORMANCE_THRESHOLD,
                totalEmployees: allEmployees.length,
                targeted: targeted.length,
                created, skipped,
                reason: 'Performansa göre hedeflenmiş öneri',
                assignedNames: assignedUsers.map(u => `${u.firstName} ${u.lastName}`),
            }),
        },
    });

    // Atanan personele bildirim gönder (DB + push, fire-and-forget)
    if (assignedUsers.length > 0) {
        const training = await prisma.training.findUnique({ where: { id: trainingId }, select: { title: true } });
        notifyUsers(assignedUsers.map(u => u.id), {
            type: 'AI_RECOMMENDATION',
            title: 'AI yeni eğitim atadı',
            message: `"${training?.title || 'Yeni eğitim'}" — ${kpiName || 'KPI'} gelişiminiz için önerildi.`,
            link: '/trainings',
        }).catch(() => {});
    }

    const skillLabel: Record<string, string> = {
        empati: 'Empati',
        bilgi: 'Ürün Bilgisi',
        capraz: 'Çapraz Satış',
        kapanis: 'Kapanış',
    };
    const skillText = targetSkill ? skillLabel[targetSkill] : 'genel performans';

    return NextResponse.json({
        success: true,
        created,
        skipped,
        targetSkill,
        threshold: PERFORMANCE_THRESHOLD,
        totalEmployees: allEmployees.length,
        targetedUsers: assignedUsers,
        skippedUsers,
        message: `${allEmployees.length} çalışan içinden ${skillText} performansı düşük ${assignedUsers.length} kişiye atama yapıldı${skipped > 0 ? ` (${skipped} kişide zaten mevcuttu)` : ''}.`,
    });
}
