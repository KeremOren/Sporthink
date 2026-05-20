'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';

type Profile = {
    user: { id: string; firstName: string; lastName: string; role: string; store: { name: string } | null };
    xp: {
        total: number;
        level: number;
        currentLevelXp: number;
        nextLevelXp: number;
        progressPct: number;
        tier: { label: string; color: string; icon: string; min: number; max: number };
    };
    badges: {
        total: number;
        earned: number;
        list: Array<{
            id: string;
            code: string;
            name: string;
            description: string;
            icon: string;
            color: string;
            tier: string;
            category: string;
            criteria: string | null;
            earned: boolean;
            earnedAt: string | null;
        }>;
    };
    recentTransactions: Array<{
        id: string;
        amount: number;
        source: string;
        reason: string;
        createdAt: string;
    }>;
};

type LeaderEntry = {
    rank: number;
    userId: string;
    name: string;
    storeName: string;
    xp: number;
    level: number;
    tier: { label: string; color: string; icon: string };
    badgeCount: number;
};

const TIER_META: Record<string, { color: string; label: string; glow: string }> = {
    BRONZE:   { color: '#cd7f32', label: 'Bronz',   glow: 'rgba(205, 127, 50, 0.4)' },
    SILVER:   { color: '#c0c0c0', label: 'Gümüş',   glow: 'rgba(192, 192, 192, 0.4)' },
    GOLD:     { color: '#f59e0b', label: 'Altın',   glow: 'rgba(245, 158, 11, 0.4)' },
    PLATINUM: { color: '#7c3aed', label: 'Platin',  glow: 'rgba(124, 58, 237, 0.4)' },
};

const CATEGORY_LABELS: Record<string, string> = {
    TRAINING: '📚 Eğitim',
    QUIZ: '🎯 Sınav',
    SIMULATION: '🎭 Simülasyon',
    COMMUNITY: '💬 Topluluk',
    STREAK: '🔥 Süreklilik',
    KPI: '📊 KPI',
    GENERAL: '⭐ Genel',
};

function timeAgo(date: string): string {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    return `${Math.floor(hours / 24)} gün önce`;
}

export default function AchievementsPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [tab, setTab] = useState<'profile' | 'leaderboard'>('profile');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
    const [myRank, setMyRank] = useState<any>(null);
    const [scope, setScope] = useState<'store' | 'region' | 'global'>('store');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { document.title = 'Sporthink | Başarılarım'; }, []);

    useEffect(() => {
        if (!session) return;
        setLoading(true);
        fetch('/api/gamification/profile')
            .then(r => r.json())
            .then(d => setProfile(d))
            .catch(() => showToast('Profil yüklenemedi', 'error'))
            .finally(() => setLoading(false));
    }, [session]);

    useEffect(() => {
        if (!session || tab !== 'leaderboard') return;
        fetch(`/api/gamification/leaderboard?scope=${scope}&period=all`)
            .then(r => r.json())
            .then(d => {
                setLeaderboard(d.leaderboard || []);
                setMyRank(d.myRank);
            })
            .catch(() => showToast('Sıralama yüklenemedi', 'error'));
    }, [session, tab, scope]);

    if (!profile && loading) {
        return (
            <div className="page-wrapper">
                <Sidebar />
                <main className="main-content">
                    <div style={{ padding: 28 }}>
                        <SkeletonStats count={3} />
                        <div style={{ marginTop: 20 }}><SkeletonCard count={2} /></div>
                    </div>
                </main>
            </div>
        );
    }

    if (!profile) return null;

    const filteredBadges = categoryFilter
        ? profile.badges.list.filter(b => b.category === categoryFilter)
        : profile.badges.list;

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header cine-fadeInUp">
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                            width: 42, height: 42, borderRadius: 12,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                        }}>
                            <span className="material-icons-outlined">workspace_premium</span>
                        </span>
                        Başarılarım
                    </h1>
                    <p className="page-subtitle">XP, seviye ve rozetlerinle motivasyonu yüksek tut</p>
                </div>

                <div style={{ padding: '0 28px 32px' }}>
                    {/* HERO XP CARD */}
                    <div className="cine-fadeInUp" style={{
                        background: `linear-gradient(135deg, ${profile.xp.tier.color}dd, ${profile.xp.tier.color}99)`,
                        color: '#fff',
                        borderRadius: 20, padding: 28,
                        position: 'relative', overflow: 'hidden',
                        marginBottom: 22,
                    }}>
                        <div style={{
                            position: 'absolute', top: -40, right: -40,
                            width: 200, height: 200, borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)',
                        }} />
                        <div style={{
                            position: 'absolute', bottom: -30, left: -30,
                            width: 140, height: 140, borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)',
                        }} />

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                            {/* Level circle */}
                            <div style={{
                                width: 120, height: 120, borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '4px solid rgba(255, 255, 255, 0.3)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                backdropFilter: 'blur(8px)',
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1.8rem', opacity: 0.85 }}>{profile.xp.tier.icon}</span>
                                <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1 }}>{profile.xp.level}</div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85 }}>Seviye</div>
                            </div>

                            <div style={{ flex: 1, minWidth: 240 }}>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85, marginBottom: 4 }}>
                                    {profile.xp.tier.label}
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 8 }}>
                                    {profile.user.firstName} {profile.user.lastName}
                                </div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 14 }}>
                                    {profile.user.store?.name || ''}
                                </div>

                                {/* XP Progress bar */}
                                <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                                    <span>{profile.xp.total.toLocaleString('tr-TR')} XP toplam</span>
                                    <span>{profile.xp.currentLevelXp} / {profile.xp.nextLevelXp} XP</span>
                                </div>
                                <div style={{
                                    width: '100%', height: 12,
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: 6, overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${profile.xp.progressPct}%`, height: '100%',
                                        background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.85))',
                                        borderRadius: 6,
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 6 }}>
                                    Bir sonraki seviyeye {profile.xp.nextLevelXp - profile.xp.currentLevelXp} XP kaldı
                                </div>
                            </div>

                            {/* Badge count */}
                            <div style={{ textAlign: 'center', minWidth: 100 }}>
                                <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>
                                    {profile.badges.earned}
                                </div>
                                <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 4 }}>
                                    / {profile.badges.total} Rozet
                                </div>
                                <div style={{
                                    marginTop: 8, padding: '4px 10px',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    %{Math.round((profile.badges.earned / Math.max(1, profile.badges.total)) * 100)} tamamlandı
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex', gap: 6, padding: 4,
                        background: 'rgba(0,0,0,0.04)',
                        borderRadius: 12, marginBottom: 16,
                        maxWidth: 500,
                    }}>
                        <button
                            onClick={() => setTab('profile')}
                            style={{
                                flex: 1, padding: '10px 16px',
                                background: tab === 'profile' ? '#fff' : 'transparent',
                                color: tab === 'profile' ? '#f59e0b' : 'var(--text-secondary)',
                                border: 'none', borderRadius: 8,
                                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: tab === 'profile' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>workspace_premium</span>
                            Rozetlerim
                        </button>
                        <button
                            onClick={() => setTab('leaderboard')}
                            style={{
                                flex: 1, padding: '10px 16px',
                                background: tab === 'leaderboard' ? '#fff' : 'transparent',
                                color: tab === 'leaderboard' ? '#dc2626' : 'var(--text-secondary)',
                                border: 'none', borderRadius: 8,
                                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: tab === 'leaderboard' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>leaderboard</span>
                            Liderlik Tablosu
                        </button>
                    </div>

                    {tab === 'profile' && (
                        <>
                            {/* Category filter */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setCategoryFilter('')}
                                    style={{
                                        padding: '6px 12px',
                                        background: !categoryFilter ? '#f59e0b' : 'transparent',
                                        color: !categoryFilter ? '#fff' : 'var(--text-secondary)',
                                        border: `1px solid ${!categoryFilter ? '#f59e0b' : 'var(--card-border)'}`,
                                        borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    Tümü ({profile.badges.total})
                                </button>
                                {Object.entries(CATEGORY_LABELS).map(([code, label]) => {
                                    const count = profile.badges.list.filter(b => b.category === code).length;
                                    if (count === 0) return null;
                                    return (
                                        <button
                                            key={code}
                                            onClick={() => setCategoryFilter(code)}
                                            style={{
                                                padding: '6px 12px',
                                                background: categoryFilter === code ? '#f59e0b' : 'transparent',
                                                color: categoryFilter === code ? '#fff' : 'var(--text-secondary)',
                                                border: `1px solid ${categoryFilter === code ? '#f59e0b' : 'var(--card-border)'}`,
                                                borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >
                                            {label} ({count})
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Badge gallery */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: 14, marginBottom: 22,
                            }}>
                                {filteredBadges.map(badge => {
                                    const tierMeta = TIER_META[badge.tier] || TIER_META.BRONZE;
                                    return (
                                        <div
                                            key={badge.id}
                                            className="cine-fadeInUp"
                                            style={{
                                                background: badge.earned
                                                    ? 'var(--glass-bg)'
                                                    : 'rgba(0, 0, 0, 0.03)',
                                                border: badge.earned
                                                    ? `1px solid ${tierMeta.color}40`
                                                    : '1px solid var(--card-border)',
                                                borderRadius: 14,
                                                padding: 18,
                                                textAlign: 'center',
                                                position: 'relative',
                                                opacity: badge.earned ? 1 : 0.6,
                                                filter: badge.earned ? 'none' : 'grayscale(60%)',
                                                transition: 'all 0.2s',
                                                cursor: 'default',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (badge.earned) {
                                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                                    e.currentTarget.style.boxShadow = `0 8px 20px ${tierMeta.glow}`;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            {/* Tier ribbon */}
                                            <div style={{
                                                position: 'absolute', top: 8, right: 8,
                                                padding: '2px 8px', borderRadius: 6,
                                                background: badge.earned ? tierMeta.color : '#94a3b8',
                                                color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                                                letterSpacing: 0.5,
                                            }}>
                                                {tierMeta.label.toUpperCase()}
                                            </div>

                                            {/* Icon */}
                                            <div style={{
                                                width: 64, height: 64, borderRadius: '50%',
                                                background: badge.earned
                                                    ? `linear-gradient(135deg, ${badge.color}, ${badge.color}cc)`
                                                    : 'rgba(148, 163, 184, 0.15)',
                                                color: badge.earned ? '#fff' : '#94a3b8',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                margin: '0 auto 10px',
                                                boxShadow: badge.earned ? `0 6px 16px ${tierMeta.glow}` : 'none',
                                                position: 'relative',
                                            }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '1.8rem' }}>
                                                    {badge.earned ? badge.icon : 'lock'}
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 4 }}>
                                                {badge.name}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', lineHeight: 1.4, minHeight: 32 }}>
                                                {badge.description}
                                            </div>

                                            {badge.earned && badge.earnedAt && (
                                                <div style={{
                                                    marginTop: 8, padding: '3px 8px',
                                                    background: `${tierMeta.color}15`, color: tierMeta.color,
                                                    borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                                                    display: 'inline-block',
                                                }}>
                                                    ✓ {new Date(badge.earnedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                </div>
                                            )}
                                            {!badge.earned && badge.criteria && (
                                                <div style={{
                                                    marginTop: 8, padding: '3px 8px',
                                                    background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-tertiary)',
                                                    borderRadius: 999, fontSize: '0.68rem', fontWeight: 600,
                                                    display: 'inline-block',
                                                }}>
                                                    🔒 {badge.criteria}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Recent XP transactions */}
                            <div style={{
                                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                border: '1px solid var(--card-border)', borderRadius: 14,
                                padding: 18,
                            }}>
                                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="material-icons-outlined" style={{ color: '#f59e0b' }}>history</span>
                                    Son XP Aktiviten
                                </h3>
                                {profile.recentTransactions.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                        Henüz XP kazanmadın. Eğitim al, sınav geç, simülasyona katıl!
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {profile.recentTransactions.map(tx => (
                                            <div key={tx.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '8px 4px',
                                                borderBottom: '1px solid var(--card-border)',
                                            }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 8,
                                                    background: 'rgba(245, 158, 11, 0.12)', color: '#d97706',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>stars</span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tx.reason}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{timeAgo(tx.createdAt)}</div>
                                                </div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#d97706' }}>
                                                    +{tx.amount}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'leaderboard' && (
                        <>
                            {/* Scope selector */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                {[
                                    { value: 'store',  label: 'Mağazam',   icon: 'store' },
                                    { value: 'region', label: 'Bölgem',    icon: 'map' },
                                    { value: 'global', label: 'Türkiye',   icon: 'public' },
                                ].map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setScope(s.value as any)}
                                        style={{
                                            padding: '8px 16px',
                                            background: scope === s.value ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'transparent',
                                            color: scope === s.value ? '#fff' : 'var(--text-secondary)',
                                            border: `1px solid ${scope === s.value ? '#dc2626' : 'var(--card-border)'}`,
                                            borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                        }}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{s.icon}</span>
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Podium (top 3) */}
                            {leaderboard.length >= 3 && (
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 12,
                                    marginBottom: 22, alignItems: 'flex-end',
                                }}>
                                    <PodiumCard entry={leaderboard[1]} medal="🥈" height={150} />
                                    <PodiumCard entry={leaderboard[0]} medal="🥇" height={190} primary />
                                    <PodiumCard entry={leaderboard[2]} medal="🥉" height={130} />
                                </div>
                            )}

                            {/* Rest of leaderboard */}
                            <div style={{
                                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                border: '1px solid var(--card-border)', borderRadius: 14,
                                padding: 4, overflow: 'hidden',
                            }}>
                                {leaderboard.slice(3).length === 0 && leaderboard.length < 3 ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '3rem', opacity: 0.5 }}>emoji_events</span>
                                        <p>Henüz yeterli aktivite yok</p>
                                    </div>
                                ) : leaderboard.slice(3).map(entry => (
                                    <LeaderboardRow key={entry.userId} entry={entry} isMe={entry.userId === (session?.user as any)?.id} />
                                ))}
                            </div>

                            {/* My rank if outside top 20 */}
                            {myRank && !leaderboard.find(l => l.userId === (session?.user as any)?.id) && (
                                <div style={{
                                    marginTop: 14, padding: 16,
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08), rgba(220, 38, 38, 0.02))',
                                    border: '1px solid rgba(220, 38, 38, 0.2)',
                                    borderRadius: 12,
                                    display: 'flex', alignItems: 'center', gap: 14,
                                }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10,
                                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                        color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: '1rem',
                                    }}>
                                        #{myRank.rank}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>Senin sıralaman: #{myRank.rank}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                            {myRank.xp} XP — Top 20'ye girmek için daha çok aktivite yap!
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

function PodiumCard({ entry, medal, height, primary }: { entry: LeaderEntry; medal: string; height: number; primary?: boolean }) {
    return (
        <div style={{
            background: primary
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'var(--glass-bg)',
            color: primary ? '#fff' : 'var(--text-primary)',
            borderRadius: 16,
            padding: 16,
            textAlign: 'center',
            minHeight: height,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            border: primary ? 'none' : '1px solid var(--card-border)',
            boxShadow: primary ? '0 8px 24px rgba(245, 158, 11, 0.35)' : 'none',
            position: 'relative',
        }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>{medal}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 2 }}>
                {entry.name.split(' ').slice(0, 2).join(' ')}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.85, marginBottom: 6 }}>
                {entry.storeName.replace(' Sporthink Mağaza', '').replace(' Mağaza', '')}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{entry.xp.toLocaleString('tr-TR')} XP</div>
            <div style={{
                marginTop: 6, fontSize: '0.65rem', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 999,
                background: primary ? 'rgba(255,255,255,0.25)' : `${entry.tier.color}20`,
                color: primary ? '#fff' : entry.tier.color,
                margin: '6px auto 0',
                width: 'fit-content',
            }}>
                Seviye {entry.level} · {entry.badgeCount} 🏆
            </div>
        </div>
    );
}

function LeaderboardRow({ entry, isMe }: { entry: LeaderEntry; isMe: boolean }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12,
            background: isMe ? 'rgba(229, 57, 53, 0.06)' : 'transparent',
            borderBottom: '1px solid var(--card-border)',
            borderRadius: isMe ? 10 : 0,
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(0, 0, 0, 0.04)',
                color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem',
                flexShrink: 0,
            }}>
                #{entry.rank}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.88rem' }}>{entry.name}</strong>
                    {isMe && (
                        <span style={{
                            padding: '1px 6px', borderRadius: 4,
                            background: '#dc2626', color: '#fff',
                            fontSize: '0.6rem', fontWeight: 800,
                        }}>SEN</span>
                    )}
                    <span style={{
                        padding: '1px 6px', borderRadius: 4,
                        background: `${entry.tier.color}15`, color: entry.tier.color,
                        fontSize: '0.65rem', fontWeight: 700,
                    }}>
                        Lv {entry.level}
                    </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    {entry.storeName.replace(' Sporthink Mağaza', '').replace(' Mağaza', '')}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>
                    {entry.xp.toLocaleString('tr-TR')}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    {entry.badgeCount} rozet
                </div>
            </div>
        </div>
    );
}
