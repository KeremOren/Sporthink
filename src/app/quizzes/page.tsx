'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { useNotifications } from '@/components/ui/NotificationProvider';
import { SkeletonCard } from '@/components/ui/Skeleton';
import QuizModal from '@/components/quiz/QuizModal';

export default function QuizzesPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const { addNotification } = useNotifications();
    const [trainings, setTrainings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState<{ id: string; title: string } | null>(null);

    useEffect(() => { document.title = 'Sporthink | Sınavlar'; }, []);

    useEffect(() => {
        if (session) {
            fetch('/api/trainings')
                .then(r => r.json())
                .then(data => {
                    const withQuiz = (data.trainings || []).filter((t: any) => t.quiz);
                    setTrainings(withQuiz);
                })
                .catch(() => showToast('Sınavlar yüklenirken hata oluştu', 'error'))
                .finally(() => setLoading(false));
        }
    }, [session]);

    if (!session) return null;
    const user = session.user as any;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Sınavlar</h1>
                        <div className="page-header-sub">{trainings.length} sınavlı eğitim</div>
                    </div>
                </div>

                <div className="page-body" style={{ animation: 'cine-fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
                    {loading ? (
                        <SkeletonCard count={4} />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                            {trainings.map((t, i) => (
                                <div key={t.id} className="card card-hover" style={{ animation: `cine-fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) ${0.1 * i}s both`, background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: '1px solid rgba(229,57,53,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                                    <div className="flex justify-between items-center mb-sm">
                                        <span className="badge badge-info">
                                            <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>quiz</span>
                                            Sınav
                                        </span>
                                        <span className="text-xs text-secondary">{t.category}</span>
                                    </div>
                                    <h3 style={{ marginBottom: 8 }}>{t.title}</h3>
                                    <p className="text-sm text-secondary mb-md">{t.description?.substring(0, 100)}...</p>
                                    <div className="text-xs text-secondary mb-md">
                                        Sınav: {t.quiz.title}
                                    </div>
                                    {['EMPLOYEE', 'STORE_MANAGER'].includes(user?.role) && (
                                        <button className="btn btn-primary btn-sm w-full" onClick={() => setActiveQuiz({ id: t.quiz.id, title: t.title })}>
                                            <span className="material-icons-outlined">play_arrow</span> Sınava Başla
                                        </button>
                                    )}
                                </div>
                            ))}
                            {trainings.length === 0 && (
                                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                    <span className="material-icons-outlined">quiz</span>
                                    <p>Sınavlı eğitim bulunamadı</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {activeQuiz && (
                    <QuizModal
                        quizId={activeQuiz.id}
                        trainingTitle={activeQuiz.title}
                        onClose={() => setActiveQuiz(null)}
                        onPassed={(r) => addNotification({ title: 'Sınav Başarılı!', message: `${activeQuiz.title} sınavını %${r.score} puanla geçtiniz.`, type: 'success', link: '/quizzes' })}
                        onFailed={(r) => addNotification({ title: 'Sınav Sonucu', message: `${activeQuiz.title} sınavından %${r.score} puan aldınız.`, type: 'warning', link: '/quizzes' })}
                    />
                )}
            </main>
        </div>
    );
}
