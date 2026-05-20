'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';

export default function CertificatesPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [gamification, setGamification] = useState<any>(null);

    useEffect(() => { document.title = 'Sporthink | Sertifikalarım'; }, []);

    useEffect(() => {
        if (session) {
            // Fetch certificates
            fetch('/api/certificates', { method: 'POST' })
                .then(r => r.json())
                .then(setCertificates)
                .catch(() => showToast('Sertifikalar yüklenemedi', 'error'))
                .finally(() => setLoading(false));

            // Fetch gamification data
            fetch('/api/gamification')
                .then(r => r.json())
                .then(setGamification)
                .catch(() => {});
        }
    }, [session]);

    if (!session) return null;

    const openCertificate = (certId: string) => {
        window.open(`/api/certificates?assignmentId=${certId}`, '_blank');
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>🏆 Sertifikalarım & Başarılar</h1>
                        <div className="page-header-sub">Tamamlanan eğitimler, rozetler ve liderlik tablosu</div>
                    </div>
                </div>

                <div className="page-body">
                    {/* Gamification Stats */}
                    {gamification && (
                        <>
                            <div className="stat-grid">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: `${gamification.level?.color}20`, color: gamification.level?.color }}>
                                        <span className="material-icons-outlined">emoji_events</span>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{gamification.points}</div>
                                        <div className="stat-label">Toplam Puan</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                                        <span className="material-icons-outlined">military_tech</span>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">Lv.{gamification.level?.level}</div>
                                        <div className="stat-label">{gamification.level?.name}</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                                        <span className="material-icons-outlined">verified</span>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{gamification.earnedBadgeCount}</div>
                                        <div className="stat-label">Kazanılan Rozet</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                                        <span className="material-icons-outlined">workspace_premium</span>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{certificates.length}</div>
                                        <div className="stat-label">Sertifika</div>
                                    </div>
                                </div>
                            </div>

                            {/* Level Progress */}
                            {gamification.nextLevel && (
                                <div className="card mb-lg">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ fontSize: '2rem' }}>🎖️</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <span className="font-semibold">{gamification.level?.name} → {gamification.nextLevel.name}</span>
                                                <span className="text-sm text-secondary">{gamification.pointsToNext} puan kaldı</span>
                                            </div>
                                            <div style={{ width: '100%', height: 10, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${Math.min(100, ((gamification.points - (gamification.nextLevel.points - (gamification.nextLevel.points === 200 ? 200 : gamification.nextLevel.points === 500 ? 300 : gamification.nextLevel.points === 1000 ? 500 : 1000))) / (gamification.nextLevel.points === 200 ? 200 : gamification.nextLevel.points === 500 ? 300 : gamification.nextLevel.points === 1000 ? 500 : 1000)) * 100)}%`,
                                                    height: '100%',
                                                    background: `linear-gradient(90deg, ${gamification.level?.color}, ${gamification.level?.color}cc)`,
                                                    borderRadius: 'var(--radius-full)',
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Badges */}
                            <div className="card mb-lg">
                                <div className="card-header">
                                    <h3 className="card-title">🎖️ Rozetler</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-md)' }}>
                                    {gamification.badges?.map((badge: any) => (
                                        <div key={badge.id} style={{
                                            padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)',
                                            textAlign: 'center',
                                            background: badge.earned ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                                            opacity: badge.earned ? 1 : 0.4,
                                            border: badge.earned ? '2px solid var(--primary)' : '2px solid transparent',
                                            transition: 'var(--transition)',
                                        }}>
                                            <div style={{ fontSize: '2rem', marginBottom: 4 }}>{badge.icon}</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{badge.name}</div>
                                            <div className="text-xs text-secondary" style={{ marginTop: 4 }}>{badge.desc}</div>
                                            {badge.earned && <span className="badge badge-primary" style={{ marginTop: 6, fontSize: '0.6rem' }}>✓ Kazanıldı</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Certificates */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">📜 Sertifikalar</h3>
                        </div>
                        {loading ? <SkeletonCard count={3} /> : certificates.length === 0 ? (
                            <div className="empty-state">
                                <span className="material-icons-outlined">workspace_premium</span>
                                <p>Henüz sertifika yok. Eğitim tamamlayarak sertifika kazanabilirsiniz.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                                {certificates.map(cert => (
                                    <div key={cert.id} className="card card-hover" style={{
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, rgba(200,164,90,0.05), rgba(26,54,93,0.05))',
                                        border: '1px solid rgba(200,164,90,0.2)',
                                    }} onClick={() => openCertificate(cert.id)}>
                                        <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                                            <span style={{ fontSize: '2.5rem' }}>🏅</span>
                                            <h4 style={{ marginTop: 8, fontSize: '0.9rem' }}>{cert.trainingTitle}</h4>
                                            {cert.category && <span className="badge badge-neutral" style={{ marginTop: 8 }}>{cert.category}</span>}
                                            <div className="text-xs text-secondary" style={{ marginTop: 8 }}>
                                                Tamamlanma: {formatDate(cert.completedAt)}
                                            </div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                                SPRT-{cert.certCode}
                                            </div>
                                            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>print</span>
                                                Sertifikayı Yazdır
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
