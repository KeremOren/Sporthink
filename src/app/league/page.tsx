'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';

type Score = {
    id: string;
    storeId: string;
    totalPoints: number;
    trainingPoints: number;
    kpiPoints: number;
    qualityPoints: number;
    quizPoints: number;
    rank: number | null;
    store: { id: string; name: string; region: { name: string } };
};

type Season = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    description: string | null;
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaguePage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const user = session?.user as any;
    const canCalculate = user?.role === 'SUPER_ADMIN' || user?.role === 'REGIONAL_MANAGER';

    const [season, setSeason] = useState<Season | null>(null);
    const [scores, setScores] = useState<Score[]>([]);
    const [allSeasons, setAllSeasons] = useState<Season[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { document.title = 'Sporthink | Mağaza Ligi'; }, []);

    const reload = async () => {
        setLoading(true);
        try {
            const query = selectedSeasonId ? `?seasonId=${selectedSeasonId}` : '';
            const res = await fetch('/api/league' + query);
            const data = await res.json();
            setSeason(data.season);
            setScores(data.scores || []);
            setAllSeasons(data.allSeasons || []);
            setSummary(data.summary);
        } catch {
            showToast('Lig yüklenemedi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (session) reload(); }, [session, selectedSeasonId]);

    const handleCalculate = async () => {
        if (!confirm('Skorları yeniden hesaplamak istediğinizden emin misiniz?')) return;
        setCalculating(true);
        try {
            const res = await fetch('/api/league/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seasonId: selectedSeasonId || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Hata');
            showToast(`${data.updated} mağaza skoru güncellendi`, 'success');
            await reload();
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setCalculating(false);
        }
    };

    const myStoreId = user?.storeId;
    const myStoreScore = scores.find(s => s.storeId === myStoreId);

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                <div className="page-header cine-fadeInUp" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'linear-gradient(135deg, #f59e0b, #dc2626)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            }}>
                                <span className="material-icons-outlined">emoji_events</span>
                            </span>
                            Mağaza Ligi
                            <span style={{
                                padding: '4px 10px', borderRadius: 999,
                                background: 'linear-gradient(135deg, #f59e0b, #dc2626)',
                                color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                                letterSpacing: 0.5,
                            }}>YENİ</span>
                        </h1>
                        <p className="page-subtitle">
                            Sezonluk mağaza yarışması — eğitim, KPI, kalite ve sınav skorlarının ağırlıklı sıralaması
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {allSeasons.length > 0 && (
                            <select
                                value={selectedSeasonId || (season?.id || '')}
                                onChange={(e) => setSelectedSeasonId(e.target.value)}
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 10, background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {allSeasons.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.status === 'ACTIVE' ? '· Aktif' : s.status === 'COMPLETED' ? '· Bitti' : '· Yakında'}
                                    </option>
                                ))}
                            </select>
                        )}
                        {canCalculate && (
                            <button
                                onClick={handleCalculate}
                                disabled={calculating}
                                style={{
                                    padding: '10px 16px',
                                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                    color: '#fff', border: 'none', borderRadius: 10,
                                    fontSize: '0.85rem', fontWeight: 700,
                                    cursor: calculating ? 'wait' : 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    opacity: calculating ? 0.6 : 1,
                                }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>refresh</span>
                                {calculating ? 'Hesaplanıyor...' : 'Skorları Yenile'}
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ padding: '0 28px 32px' }}>
                    {/* Season banner */}
                    {season && (
                        <div className="cine-fadeInUp" style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(220, 38, 38, 0.04))',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: 16, padding: 18,
                            marginBottom: 22,
                            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 14,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1.6rem' }}>military_tech</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '1.1rem' }}>{season.name}</strong>
                                    <span style={{
                                        padding: '2px 10px', borderRadius: 999,
                                        background: season.status === 'ACTIVE' ? '#16a34a' : '#94a3b8',
                                        color: '#fff', fontSize: '0.65rem', fontWeight: 800, letterSpacing: 0.5,
                                    }}>
                                        {season.status === 'ACTIVE' ? '● AKTİF' : season.status === 'UPCOMING' ? 'YAKINDA' : 'BİTTİ'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                    {new Date(season.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                    {' - '}
                                    {new Date(season.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                                {season.description && (
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        {season.description}
                                    </div>
                                )}
                            </div>
                            {summary && season.status === 'ACTIVE' && (
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>
                                        {summary.daysRemaining}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>gün kaldı</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scoring formula info */}
                    <div style={{
                        padding: 14, borderRadius: 12,
                        background: 'rgba(99, 102, 241, 0.06)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        marginBottom: 22,
                        display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.82rem', flexWrap: 'wrap',
                    }}>
                        <span className="material-icons-outlined" style={{ color: '#6366f1' }}>info</span>
                        <strong style={{ color: '#6366f1' }}>Skor Formülü:</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>
                            📚 Eğitim <strong>%30</strong> · 📊 KPI <strong>%40</strong> · 😊 Müşteri Memnuniyeti <strong>%20</strong> · 🎯 Sınav <strong>%10</strong>
                        </span>
                    </div>

                    {loading ? <SkeletonCard count={3} /> : (
                        <>
                            {/* Podium */}
                            {scores.length >= 3 && (
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 14,
                                    marginBottom: 22, alignItems: 'flex-end',
                                }}>
                                    <PodiumStore score={scores[1]} medal="🥈" height={200} />
                                    <PodiumStore score={scores[0]} medal="🥇" height={240} primary />
                                    <PodiumStore score={scores[2]} medal="🥉" height={170} />
                                </div>
                            )}

                            {/* My store highlight */}
                            {myStoreScore && myStoreScore.rank && myStoreScore.rank > 3 && (
                                <div style={{
                                    marginBottom: 16, padding: 16,
                                    background: 'linear-gradient(135deg, rgba(229, 57, 53, 0.08), rgba(229, 57, 53, 0.02))',
                                    border: '1px solid rgba(229, 57, 53, 0.25)',
                                    borderRadius: 14,
                                }}>
                                    <div style={{ fontSize: '0.78rem', color: '#E53935', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                        Senin Mağazan
                                    </div>
                                    <ScoreRow score={myStoreScore} isMe expanded={expandedId === myStoreScore.id} onToggle={() => setExpandedId(expandedId === myStoreScore.id ? null : myStoreScore.id)} />
                                </div>
                            )}

                            {/* Full leaderboard (excluding top 3) */}
                            {scores.slice(3).length > 0 && (
                                <div style={{
                                    background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                                    border: '1px solid var(--card-border)', borderRadius: 14,
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '14px 18px',
                                        background: 'rgba(0, 0, 0, 0.03)',
                                        borderBottom: '1px solid var(--card-border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <strong style={{ fontSize: '0.95rem' }}>Tüm Sıralamalar</strong>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                            {scores.length} mağaza yarışıyor
                                        </span>
                                    </div>
                                    {scores.slice(3).map(score => (
                                        <ScoreRow
                                            key={score.id}
                                            score={score}
                                            isMe={score.storeId === myStoreId}
                                            expanded={expandedId === score.id}
                                            onToggle={() => setExpandedId(expandedId === score.id ? null : score.id)}
                                        />
                                    ))}
                                </div>
                            )}

                            {scores.length === 0 && (
                                <div style={{
                                    padding: '60px 20px', textAlign: 'center',
                                    background: 'var(--glass-bg)', borderRadius: 14, border: '1px solid var(--card-border)',
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '3rem', color: '#f59e0b', opacity: 0.6 }}>emoji_events</span>
                                    <h4 style={{ margin: '8px 0 4px' }}>Henüz skor hesaplanmadı</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                                        {canCalculate ? 'Yukarıdaki "Skorları Yenile" butonuna basın' : 'Yönetici skorları hesapladığında burada görünecek'}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

function PodiumStore({ score, medal, height, primary }: { score: Score; medal: string; height: number; primary?: boolean }) {
    const storeName = score.store.name.replace(' Sporthink Mağaza', '').replace(' Mağaza', '');
    return (
        <div style={{
            background: primary
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'var(--glass-bg)',
            color: primary ? '#fff' : 'var(--text-primary)',
            borderRadius: 16,
            padding: 18,
            textAlign: 'center',
            minHeight: height,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            border: primary ? 'none' : '1px solid var(--card-border)',
            boxShadow: primary ? '0 12px 32px rgba(245, 158, 11, 0.4)' : 'none',
            position: 'relative',
            backdropFilter: 'blur(16px)',
        }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 6, lineHeight: 1 }}>{medal}</div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85, marginBottom: 2 }}>
                {score.store.region.name}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>
                {storeName}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>
                {Math.round(score.totalPoints)}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>puan</div>
        </div>
    );
}

function ScoreRow({ score, isMe, expanded, onToggle }: { score: Score; isMe?: boolean; expanded: boolean; onToggle: () => void }) {
    const storeName = score.store.name.replace(' Sporthink Mağaza', '').replace(' Mağaza', '');
    const rankColor = !score.rank ? '#94a3b8' : score.rank <= 3 ? '#f59e0b' : score.rank <= 10 ? '#16a34a' : '#94a3b8';

    return (
        <div style={{
            background: isMe ? 'rgba(229, 57, 53, 0.04)' : 'transparent',
            borderBottom: '1px solid var(--card-border)',
            transition: 'background 0.15s',
        }}>
            <div
                onClick={onToggle}
                style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    cursor: 'pointer',
                }}
            >
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${rankColor}15`,
                    color: rankColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.95rem',
                    flexShrink: 0,
                }}>
                    #{score.rank || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.92rem' }}>{storeName}</strong>
                        {isMe && (
                            <span style={{
                                padding: '1px 6px', borderRadius: 4,
                                background: '#E53935', color: '#fff',
                                fontSize: '0.6rem', fontWeight: 800,
                            }}>BENİM MAĞAZAM</span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {score.store.region.name}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: rankColor }}>
                        {Math.round(score.totalPoints)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>puan</div>
                </div>
                <span className="material-icons-outlined" style={{
                    color: 'var(--text-tertiary)',
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                }}>
                    expand_more
                </span>
            </div>

            {/* Expandable breakdown */}
            {expanded && (
                <div style={{
                    padding: '12px 18px 18px 72px',
                    background: 'rgba(0, 0, 0, 0.02)',
                }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Skor Dağılımı
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <BreakdownBar label="📚 Eğitim Tamamlama" value={score.trainingPoints} maxValue={30} color="#3b82f6" />
                        <BreakdownBar label="📊 KPI Hedef Gerçekleşme" value={score.kpiPoints} maxValue={48} color="#16a34a" />
                        <BreakdownBar label="😊 Müşteri Memnuniyeti" value={score.qualityPoints} maxValue={20} color="#ec4899" />
                        <BreakdownBar label="🎯 Sınav Başarısı" value={score.quizPoints} maxValue={10} color="#8b5cf6" />
                    </div>
                </div>
            )}
        </div>
    );
}

function BreakdownBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
    const pct = Math.min(100, (value / maxValue) * 100);
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{value.toFixed(1)} / {maxValue}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    borderRadius: 3,
                    transition: 'width 0.6s ease',
                }} />
            </div>
        </div>
    );
}
