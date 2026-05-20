import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gamification library
 *
 * - XP ledger: bir kullanıcıya XP ekle
 * - Level: XP → level dönüşümü
 * - Badge: kullanıcıya rozet ver (kriter zaten DB'de check edildi varsayar)
 * - Otomatik kontrol: belirli aksiyondan sonra rozet kriterlerini değerlendir
 */

export const XP_REWARDS = {
    TRAINING_COMPLETE: 50,
    QUIZ_PASS: 30,
    QUIZ_PERFECT: 60,        // 100/100 puan
    SIMULATION: 0,           // SimAttempt'tan zaten gelir
    KPI_GOAL_MET: 100,       // Aylık hedef tutturma
    COMMUNITY_POST: 15,
    STREAK_7: 50,
    STREAK_30: 200,
    BADGE_AWARD: 25,         // her rozet kazanımında bonus
};

/** XP → seviye (basit: her 500 XP = 1 seviye) */
export function xpToLevel(xp: number): { level: number; nextLevelXp: number; progressPct: number; currentLevelXp: number } {
    const level = Math.floor(xp / 500) + 1;
    const currentLevelXp = xp % 500;
    const nextLevelXp = 500;
    const progressPct = Math.round((currentLevelXp / nextLevelXp) * 100);
    return { level, nextLevelXp, progressPct, currentLevelXp };
}

export const LEVEL_TIERS = [
    { min: 1,  max: 4,  label: 'Çaylak',      color: '#94a3b8', icon: 'eco' },
    { min: 5,  max: 9,  label: 'Acemi',       color: '#0891b2', icon: 'school' },
    { min: 10, max: 19, label: 'Uzman',       color: '#16a34a', icon: 'verified' },
    { min: 20, max: 29, label: 'Profesyonel', color: '#d97706', icon: 'workspace_premium' },
    { min: 30, max: 49, label: 'Usta',        color: '#dc2626', icon: 'military_tech' },
    { min: 50, max: 999, label: 'Efsane',     color: '#7c3aed', icon: 'auto_awesome' },
];

export function levelTier(level: number) {
    return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0];
}

/** Bir kullanıcıya XP ekle ve ledger kaydı oluştur */
export async function awardXp(params: {
    userId: string;
    amount: number;
    source: string;
    sourceId?: string;
    reason: string;
}) {
    if (params.amount <= 0) return null;
    return await prisma.xpTransaction.create({
        data: {
            id: uuidv4(),
            userId: params.userId,
            amount: params.amount,
            source: params.source,
            sourceId: params.sourceId || null,
            reason: params.reason,
        },
    });
}

/** Kullanıcının toplam XP'sini al */
export async function getUserXp(userId: string): Promise<number> {
    const result = await prisma.xpTransaction.aggregate({
        where: { userId },
        _sum: { amount: true },
    });
    return result._sum.amount || 0;
}

/** Bir kullanıcıya rozet ver (henüz almadıysa) */
export async function awardBadge(params: {
    userId: string;
    badgeCode: string;
    context?: string;
}) {
    const badge = await prisma.badge.findUnique({ where: { code: params.badgeCode } });
    if (!badge) return null;

    const existing = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId: params.userId, badgeId: badge.id } },
    });
    if (existing) return null; // zaten verilmiş

    const userBadge = await prisma.userBadge.create({
        data: {
            id: uuidv4(),
            userId: params.userId,
            badgeId: badge.id,
            context: params.context || null,
        },
    });

    // Rozet için bonus XP
    await awardXp({
        userId: params.userId,
        amount: XP_REWARDS.BADGE_AWARD,
        source: 'BADGE_AWARD',
        sourceId: badge.id,
        reason: `Rozet kazandın: ${badge.name}`,
    });

    return userBadge;
}

/** Bir kullanıcının kazanabileceği rozetleri kontrol et ve ver */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
    const awarded: string[] = [];

    // İlgili istatistikleri çek
    const [
        completedTrainings,
        passedQuizzes,
        perfectQuizzes,
        simAttempts,
        bestSimScore,
        topEmpati,
        topCapraz,
        topKapanis,
        topBilgi,
        communityPosts,
    ] = await Promise.all([
        prisma.trainingAssignment.count({ where: { userId, status: 'COMPLETED' } }),
        prisma.quizAttempt.count({ where: { userId, passed: true } }),
        prisma.quizAttempt.count({ where: { userId, passed: true, score: 100 } }),
        prisma.simAttempt.count({ where: { userId } }),
        prisma.simAttempt.aggregate({ where: { userId }, _max: { score: true } }),
        prisma.simAttempt.aggregate({ where: { userId }, _max: { empatiScore: true } }),
        prisma.simAttempt.aggregate({ where: { userId }, _max: { caprazSatisScore: true } }),
        prisma.simAttempt.aggregate({ where: { userId }, _max: { kapanisScore: true } }),
        prisma.simAttempt.aggregate({ where: { userId }, _max: { bilgiScore: true } }),
        prisma.communityPost.count({ where: { authorId: userId } }),
    ]);

    const checks: Array<{ code: string; condition: boolean }> = [
        { code: 'ILK_ADIM',         condition: completedTrainings >= 1 },
        { code: 'CALISKAN_OGRENCI', condition: completedTrainings >= 5 },
        { code: 'EGITIM_SAMPIYONU', condition: completedTrainings >= 10 },
        { code: 'SINAV_USTASI',     condition: passedQuizzes >= 5 },
        { code: 'MUKEMMELLIK',      condition: perfectQuizzes >= 3 },
        { code: 'SIMULASYON_FAN',   condition: simAttempts >= 5 },
        { code: 'ALTIN_SATICI',     condition: (bestSimScore._max.score || 0) >= 85 },
        { code: 'EMPATI_USTASI',    condition: (topEmpati._max.empatiScore || 0) >= 90 },
        { code: 'CAPRAZ_SATIS_USTASI', condition: (topCapraz._max.caprazSatisScore || 0) >= 90 },
        { code: 'KAPANIS_USTASI',   condition: (topKapanis._max.kapanisScore || 0) >= 90 },
        { code: 'URUN_UZMANI',      condition: (topBilgi._max.bilgiScore || 0) >= 90 },
        { code: 'TOPLULUK_KATKICISI', condition: communityPosts >= 3 },
    ];

    for (const check of checks) {
        if (check.condition) {
            const result = await awardBadge({ userId, badgeCode: check.code });
            if (result) awarded.push(check.code);
        }
    }

    return awarded;
}

/** Default rozetler — seed/migration için */
export const DEFAULT_BADGES = [
    // Training
    { code: 'ILK_ADIM', name: 'İlk Adım', description: 'İlk eğitimini tamamladın', icon: 'rocket_launch', color: '#3b82f6', tier: 'BRONZE', category: 'TRAINING', criteria: '1 eğitim tamamla', sortOrder: 1 },
    { code: 'CALISKAN_OGRENCI', name: 'Çalışkan Öğrenci', description: '5 eğitimi başarıyla tamamladın', icon: 'menu_book', color: '#06b6d4', tier: 'SILVER', category: 'TRAINING', criteria: '5 eğitim tamamla', sortOrder: 2 },
    { code: 'EGITIM_SAMPIYONU', name: 'Eğitim Şampiyonu', description: '10 eğitimi başarıyla tamamladın', icon: 'military_tech', color: '#f59e0b', tier: 'GOLD', category: 'TRAINING', criteria: '10 eğitim tamamla', sortOrder: 3 },
    // Quiz
    { code: 'SINAV_USTASI', name: 'Sınav Ustası', description: '5 sınavı başarıyla geçtin', icon: 'quiz', color: '#16a34a', tier: 'SILVER', category: 'QUIZ', criteria: '5 sınav geç', sortOrder: 4 },
    { code: 'MUKEMMELLIK', name: 'Mükemmellik Peşinde', description: '3 sınavda %100 puan aldın', icon: 'star', color: '#f59e0b', tier: 'GOLD', category: 'QUIZ', criteria: '3 sınavda 100/100', sortOrder: 5 },
    // Simulation
    { code: 'SIMULASYON_FAN', name: 'Simülasyon Hayranı', description: '5 senaryo tamamladın', icon: 'theater_comedy', color: '#8b5cf6', tier: 'BRONZE', category: 'SIMULATION', criteria: '5 simülasyon tamamla', sortOrder: 6 },
    { code: 'ALTIN_SATICI', name: 'Altın Satıcı', description: 'Simülasyonda 85+ puan aldın', icon: 'workspace_premium', color: '#f59e0b', tier: 'GOLD', category: 'SIMULATION', criteria: '85+ simülasyon skoru', sortOrder: 7 },
    { code: 'EMPATI_USTASI', name: 'Empati Ustası', description: 'Simülasyonda 90+ empati puanı aldın', icon: 'favorite', color: '#ec4899', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ empati skoru', sortOrder: 8 },
    { code: 'CAPRAZ_SATIS_USTASI', name: 'Çapraz Satış Ustası', description: 'Simülasyonda 90+ çapraz satış puanı aldın', icon: 'sync_alt', color: '#8b5cf6', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ çapraz satış skoru', sortOrder: 9 },
    { code: 'KAPANIS_USTASI', name: 'Kapanış Ustası', description: 'Simülasyonda 90+ kapanış puanı aldın', icon: 'flag', color: '#16a34a', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ kapanış skoru', sortOrder: 10 },
    { code: 'URUN_UZMANI', name: 'Ürün Uzmanı', description: 'Simülasyonda 90+ ürün bilgisi puanı aldın', icon: 'school', color: '#3b82f6', tier: 'GOLD', category: 'SIMULATION', criteria: '90+ ürün bilgisi skoru', sortOrder: 11 },
    // Community
    { code: 'TOPLULUK_KATKICISI', name: 'Topluluk Katkıcısı', description: 'Topluluğa 3 gönderi paylaştın', icon: 'forum', color: '#06b6d4', tier: 'BRONZE', category: 'COMMUNITY', criteria: '3 topluluk gönderisi', sortOrder: 12 },
    // Streak (manual award)
    { code: 'HAFTANIN_KAHRAMANI', name: 'Haftanın Kahramanı', description: '7 gün üst üste aktif oldun', icon: 'local_fire_department', color: '#dc2626', tier: 'SILVER', category: 'STREAK', criteria: '7 gün streak', sortOrder: 13 },
    { code: 'CELIK_DISIPLIN', name: 'Çelik Disiplin', description: '30 gün üst üste aktif oldun', icon: 'whatshot', color: '#dc2626', tier: 'PLATINUM', category: 'STREAK', criteria: '30 gün streak', sortOrder: 14 },
];
