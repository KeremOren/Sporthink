'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import Sidebar from '@/components/layout/Sidebar';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';
import { getStatusLabel } from '@/lib/utils';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import QuizModal from '@/components/quiz/QuizModal';
import TrainingViewer from '@/components/training/TrainingViewer';

const CONTENT_TYPES = [
    { value: 'TEXT', label: 'Metin', icon: 'article' },
    { value: 'VIDEO', label: 'Video', icon: 'play_circle' },
    { value: 'FILE', label: 'Dosya', icon: 'attach_file' },
    { value: 'QUIZ', label: 'Sınav', icon: 'quiz' },
];

export default function TrainingDetailPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [training, setTraining] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeStep, setActiveStep] = useState(0);
    const [assignModal, setAssignModal] = useState(false);
    const [contentModal, setContentModal] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [assigning, setAssigning] = useState(false);
    const [contentForm, setContentForm] = useState({ type: 'TEXT', title: '', content: '' });
    const [addingContent, setAddingContent] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [showQuiz, setShowQuiz] = useState(false);
    const [assignedSearch, setAssignedSearch] = useState('');
    const [modalSearch, setModalSearch] = useState('');

    const user = session?.user as any;

    const refreshTraining = async () => {
        const res = await fetch(`/api/trainings/${params.id}`);
        setTraining(await res.json());
    };

    useEffect(() => {
        fetch(`/api/trainings/${params.id}`)
            .then(r => r.json())
            .then(data => { setTraining(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [params.id]);

    const loadUsers = async () => {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data.filter((u: any) => u.role === 'EMPLOYEE'));
    };

    const handleAssign = async () => {
        if (selectedUsers.length === 0) return;
        setAssigning(true);
        try {
            for (const userId of selectedUsers) {
                await fetch('/api/trainings/assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trainingId: params.id, userId }),
                });
            }
            showToast(`${selectedUsers.length} çalışana eğitim atandı`, 'success');
            setAssignModal(false);
            setSelectedUsers([]);
            setModalSearch('');
            await refreshTraining();
        } catch {
            showToast('Atama sırasında hata oluştu', 'error');
        }
        setAssigning(false);
    };

    const handleComplete = async () => {
        const assignment = training?.assignments?.find((a: any) => a.userId === user?.id);
        if (!assignment) return;
        try {
            await fetch('/api/trainings/assignments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentId: assignment.id, status: 'COMPLETED' }),
            });
            showToast('Eğitim tamamlandı olarak işaretlendi!', 'success');
            await refreshTraining();
        } catch {
            showToast('Bir hata oluştu', 'error');
        }
    };

    const handleAddContent = async () => {
        if (!contentForm.title || !contentForm.type) return;
        setAddingContent(true);
        try {
            await fetch(`/api/trainings/${params.id}/contents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contentForm),
            });
            showToast('İçerik adımı eklendi', 'success');
            setContentModal(false);
            setContentForm({ type: 'TEXT', title: '', content: '' });
            await refreshTraining();
        } catch {
            showToast('İçerik eklenirken hata oluştu', 'error');
        }
        setAddingContent(false);
    };

    const handleDeleteContent = async (contentId: string) => {
        if (!confirm('Bu içerik adımını silmek istediğinizden emin misiniz?')) return;
        try {
            await fetch(`/api/trainings/${params.id}/contents?contentId=${contentId}`, { method: 'DELETE' });
            showToast('İçerik adımı silindi', 'success');
            setActiveStep(0);
            await refreshTraining();
        } catch {
            showToast('Silme sırasında hata oluştu', 'error');
        }
    };

    // Pre-fill completedSteps if assignment is already COMPLETED (allow re-taking quiz)
    useEffect(() => {
        if (!training || user?.role !== 'EMPLOYEE') return;
        const a = training.assignments?.find((x: any) => x.userId === user?.id);
        if (a && a.status === 'COMPLETED') {
            const total = training.contents?.length || 0;
            setCompletedSteps(new Set(Array.from({ length: total }, (_, i) => i)));
        }
    }, [training?.id]);

    // Auto-open quiz only when all sections are completed
    useEffect(() => {
        if (!training || user?.role !== 'EMPLOYEE' || searchParams.get('quiz') !== '1' || !training.quiz) return;
        const total = training.contents?.length || 0;
        if (total > 0 && completedSteps.size >= total) {
            setShowQuiz(true);
        } else {
            showToast('Sınava başlamadan önce tüm bölümleri okumalısınız', 'error');
        }
    }, [training, user?.role, searchParams, completedSteps]);

    // Mark IN_PROGRESS once content is loaded for the assigned employee
    useEffect(() => {
        if (!training || user?.role !== 'EMPLOYEE') return;
        const a = training.assignments?.find((x: any) => x.userId === user?.id);
        if (a && a.status === 'NOT_STARTED') {
            fetch('/api/trainings/assignments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentId: a.id, status: 'IN_PROGRESS' }),
            }).catch(() => {});
        }
    }, [training?.id]);

    if (!session) return null;

    /* ---------------- EMPLOYEE FULLSCREEN VIEWER ---------------- */
    if (user?.role === 'EMPLOYEE' && training && !loading) {
        return (
            <>
                <TrainingViewer
                    title={training.title}
                    contents={(training.contents || []).slice().sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))}
                    onClose={() => router.push('/trainings')}
                    completedSteps={completedSteps}
                    onSectionRead={(idx) => {
                        const next = new Set(completedSteps);
                        next.add(idx);
                        setCompletedSteps(next);
                        showToast('Bölüm okundu olarak işaretlendi', 'success');
                    }}
                    onAllCompleted={async () => {
                        if (!training.quiz) {
                            await handleComplete();
                        }
                    }}
                    hasQuiz={!!training.quiz}
                    onStartQuiz={() => setShowQuiz(true)}
                />
                {showQuiz && training.quiz && (
                    <QuizModal
                        quizId={training.quiz.id}
                        trainingTitle={training.title}
                        onClose={() => setShowQuiz(false)}
                        onPassed={async () => { await refreshTraining(); }}
                    />
                )}
            </>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/trainings')}>
                                <span className="material-icons-outlined">arrow_back</span>
                            </button>
                            <h1>{loading ? 'Yükleniyor...' : training?.title || 'Eğitim Detayı'}</h1>
                        </div>
                        {training && (
                            <p className="page-header-sub">
                                {training.category} • {training.type === 'MANDATORY' ? 'Zorunlu' : 'İsteğe Bağlı'}
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        {['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user?.role) && (
                            <button className="btn btn-ghost" onClick={() => setContentModal(true)}>
                                <span className="material-icons-outlined">add_circle</span>
                                İçerik Ekle
                            </button>
                        )}
                        {user?.role !== 'EMPLOYEE' && (
                            <button className="btn btn-primary" onClick={() => { setAssignModal(true); loadUsers(); }}>
                                <span className="material-icons-outlined">person_add</span>
                                Çalışanlara Ata
                            </button>
                        )}
                    </div>
                </div>

                <div className="page-body" style={{ animation: 'cine-fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
                    {loading ? (
                        <>
                            <SkeletonStats count={3} />
                            <SkeletonCard count={1} />
                        </>
                    ) : !training ? (
                        <div className="empty-state">
                            <span className="material-icons-outlined">error_outline</span>
                            <p>Eğitim bulunamadı</p>
                        </div>
                    ) : (
                        <>
                            {/* Training Meta */}
                            <div className="training-meta" style={{ animation: 'cine-fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: 12, border: '1px solid rgba(229,57,53,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                                <div className="training-meta-item">
                                    <span className="material-icons-outlined">category</span>
                                    {training.category}
                                </div>
                                <div className="training-meta-item">
                                    <span className="material-icons-outlined">schedule</span>
                                    {training.durationMinutes || 30} dakika
                                </div>
                                <div className="training-meta-item">
                                    <span className="material-icons-outlined">people</span>
                                    {training.assignments?.length || 0} atanmış
                                </div>
                                {training.quiz && (
                                    <div className="training-meta-item">
                                        <span className="material-icons-outlined">quiz</span>
                                        Sınav: {training.quiz.title}
                                    </div>
                                )}
                                <div className="training-meta-item">
                                    <span className="material-icons-outlined">person</span>
                                    {training.createdBy?.firstName} {training.createdBy?.lastName}
                                </div>
                            </div>

                            {/* Assignment Progress */}
                            {training.assignments?.length > 0 && user?.role !== 'EMPLOYEE' && (() => {
                                const total = training.assignments.length;
                                const completed = training.assignments.filter((a: any) => a.status === 'COMPLETED').length;
                                const inProgress = training.assignments.filter((a: any) => a.status === 'IN_PROGRESS').length;
                                const overdue = training.assignments.filter((a: any) => a.status === 'OVERDUE').length;
                                const notStarted = total - completed - inProgress - overdue;
                                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                                return (
                                    <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid rgba(229,57,53,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animation: 'cine-fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>bar_chart</span>
                                            Tamamlanma Durumu
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                            <div style={{ flex: 1, height: 10, borderRadius: 6, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 6, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
                                                    width: `${pct}%`,
                                                    background: pct >= 80 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : pct >= 50 ? 'linear-gradient(90deg, #f59e0b, #eab308)' : 'linear-gradient(90deg, #ef4444, #f97316)',
                                                    boxShadow: pct >= 80 ? '0 0 12px rgba(34,197,94,0.3)' : pct >= 50 ? '0 0 12px rgba(245,158,11,0.3)' : '0 0 12px rgba(239,68,68,0.3)',
                                                    animation: 'cine-progressFill 1.2s cubic-bezier(0.22,1,0.36,1) both',
                                                }} />
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444', minWidth: 50, textAlign: 'right' }}>%{pct}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)' }}>
                                            {[
                                                { label: 'Toplam', value: total, color: '#6366f1' },
                                                { label: 'Tamamlandı', value: completed, color: '#22c55e' },
                                                { label: 'Devam Ediyor', value: inProgress, color: '#f59e0b' },
                                                { label: 'Gecikmiş', value: overdue, color: '#ef4444' },
                                            ].map(s => (
                                                <div key={s.label} style={{ textAlign: 'center', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', background: `${s.color}10`, border: `1px solid ${s.color}20`, transition: 'all 0.35s ease', animation: `cine-scaleIn 0.5s cubic-bezier(0.22,1,0.36,1) ${0.2 + 0.08}s both` }}>
                                                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{s.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Assignment Table */}
                                        <details style={{ marginTop: 'var(--space-md)' }}>
                                            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
                                                Atanan Çalışanları Göster ({total})
                                            </summary>
                                            <div className="table-container" style={{ marginTop: 'var(--space-sm)', maxHeight: 250, overflow: 'auto' }}>
                                                <table>
                                                    <thead><tr><th>Çalışan</th><th>Mağaza</th><th>Durum</th></tr></thead>
                                                    <tbody>
                                                        {training.assignments.map((a: any) => (
                                                            <tr key={a.id}>
                                                                <td className="text-sm">{a.user?.firstName} {a.user?.lastName}</td>
                                                                <td className="text-sm text-secondary">{a.user?.store?.name || '-'}</td>
                                                                <td><span className={`badge ${a.status === 'COMPLETED' ? 'badge-success' : a.status === 'OVERDUE' ? 'badge-danger' : a.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-neutral'}`}>{getStatusLabel(a.status)}</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </details>
                                    </div>
                                );
                            })()}
                            {/* Top reading progress bar */}
                            {training.contents?.length > 0 && user?.role === 'EMPLOYEE' && (() => {
                                const total = training.contents.length;
                                const done = completedSteps.size;
                                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                                const allDone = done === total && total > 0;
                                return (
                                    <div style={{ marginBottom: 'var(--space-lg)', padding: 16, borderRadius: 12, background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: '1px solid rgba(229,57,53,0.08)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.85rem' }}>
                                            <span style={{ fontWeight: 600 }}>Okuma İlerlemesi</span>
                                            <span style={{ color: allDone ? '#16a34a' : 'var(--text-secondary)', fontWeight: 700 }}>{done} / {total} • %{pct}</span>
                                        </div>
                                        <div style={{ height: 10, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${pct}%`,
                                                background: allDone ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #e53935, #ef4444)',
                                                boxShadow: allDone ? '0 0 12px rgba(34,197,94,0.4)' : '0 0 12px rgba(229,57,53,0.3)',
                                                transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1), background 0.4s ease',
                                            }} />
                                        </div>
                                        {allDone && training.quiz && (
                                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>verified</span>
                                                    Tüm içerikler okundu! Sınava hazırsınız.
                                                </span>
                                                <button className="btn btn-primary" onClick={() => setShowQuiz(true)}>
                                                    <span className="material-icons-outlined">quiz</span> Sınava Başla
                                                </button>
                                            </div>
                                        )}
                                        {allDone && !training.quiz && (
                                            <div style={{ marginTop: 12 }}>
                                                <button className="btn btn-success" onClick={handleComplete}>
                                                    <span className="material-icons-outlined">check_circle</span> Eğitimi Tamamla
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Content Stepper */}
                            {training.contents?.length > 0 ? (
                                <div className="training-detail">
                                    <div className="training-sidebar">
                                        <div className="card">
                                            <h4 style={{ marginBottom: 'var(--space-md)' }}>İçerik Adımları</h4>
                                            <div className="step-list">
                                                {training.contents.map((content: any, idx: number) => {
                                                    const isDone = completedSteps.has(idx);
                                                    return (
                                                    <div key={content.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <button
                                                            className={`step-item ${idx === activeStep ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                                                            onClick={() => setActiveStep(idx)}
                                                            style={{ flex: 1 }}
                                                        >
                                                            <span className="step-number" style={isDone ? { background: '#22c55e', color: '#fff' } : undefined}>
                                                                {isDone ? '✓' : idx + 1}
                                                            </span>
                                                            <span className="truncate">{content.title}</span>
                                                        </button>
                                                        {['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user?.role) && (
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() => handleDeleteContent(content.id)}
                                                                title="Sil"
                                                                style={{ padding: 2, minWidth: 'auto', color: 'var(--danger)' }}
                                                            >
                                                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="training-content-area">
                                        <div className="flex justify-between items-center mb-md">
                                            <h2>{training.contents[activeStep]?.title}</h2>
                                            <span className="badge badge-neutral">
                                                {CONTENT_TYPES.find(t => t.value === training.contents[activeStep]?.type)?.label || training.contents[activeStep]?.type}
                                            </span>
                                        </div>

                                        {/* Type-specific rendering */}
                                        {training.contents[activeStep]?.type === 'VIDEO' && training.contents[activeStep]?.content && (
                                            <div style={{ marginBottom: 16, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)', padding: 16 }}>
                                                <div className="flex items-center gap-sm text-secondary">
                                                    <span className="material-icons-outlined">play_circle</span>
                                                    <a href={training.contents[activeStep].content} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>
                                                        Videoyu Aç
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {training.contents[activeStep]?.type === 'FILE' && training.contents[activeStep]?.content && (
                                            <div style={{ marginBottom: 16, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)', padding: 16 }}>
                                                <div className="flex items-center gap-sm text-secondary">
                                                    <span className="material-icons-outlined">attach_file</span>
                                                    <a href={training.contents[activeStep].content} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>
                                                        Dosyayı İndir
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        <div className="training-content-body">
                                            {(() => {
                                                const currentContent = training.contents[activeStep]?.content || '';
                                                const pdfMatch = currentContent.match(/\/trainings\/[\w-]+\.pdf/);
                                                if (pdfMatch) {
                                                    return (
                                                        <>
                                                            {/* PDF Viewer */}
                                                            <div style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid rgba(99,102,241,0.3)', background: 'var(--bg-tertiary)' }}>
                                                                <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <div className="flex items-center gap-sm">
                                                                        <span className="material-icons-outlined" style={{ color: '#ef4444' }}>picture_as_pdf</span>
                                                                        <span className="font-semibold">Orijinal PDF Döküman</span>
                                                                    </div>
                                                                    <a href={pdfMatch[0]} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                                                                        <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>download</span>
                                                                        PDF İndir
                                                                    </a>
                                                                </div>
                                                                <iframe
                                                                    src={pdfMatch[0]}
                                                                    style={{ width: '100%', height: 500, border: 'none' }}
                                                                    title="PDF Viewer"
                                                                />
                                                            </div>
                                                        </>
                                                    );
                                                }
                                                return currentContent.split('\n').map((p: string, i: number) => (
                                                    <p key={i}>{p}</p>
                                                ));
                                            })()}
                                        </div>

                                        <div className="training-actions">
                                            <button
                                                className="btn btn-ghost"
                                                disabled={activeStep === 0}
                                                onClick={() => setActiveStep(s => s - 1)}
                                            >
                                                <span className="material-icons-outlined">arrow_back</span>
                                                Önceki
                                            </button>

                                            {user?.role === 'EMPLOYEE' && !completedSteps.has(activeStep) && (
                                                <button
                                                    className="btn btn-success"
                                                    onClick={() => {
                                                        const next = new Set(completedSteps);
                                                        next.add(activeStep);
                                                        setCompletedSteps(next);
                                                        showToast('Okundu olarak işaretlendi', 'success');
                                                        if (activeStep < training.contents.length - 1) {
                                                            setTimeout(() => setActiveStep(s => s + 1), 250);
                                                        }
                                                    }}
                                                >
                                                    <span className="material-icons-outlined">check_circle</span>
                                                    Okudum / Tamamladım
                                                </button>
                                            )}
                                            {user?.role === 'EMPLOYEE' && completedSteps.has(activeStep) && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 600, fontSize: '0.88rem' }}>
                                                    <span className="material-icons-outlined">verified</span>
                                                    Bu bölüm okundu
                                                </span>
                                            )}

                                            {activeStep < training.contents.length - 1 && (
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => setActiveStep(s => s + 1)}
                                                >
                                                    Sonraki
                                                    <span className="material-icons-outlined">arrow_forward</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
                                    <h3>{training.title}</h3>
                                    <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
                                        {training.description || 'Bu eğitim için henüz içerik eklenmemiş.'}
                                    </p>
                                    {['SUPER_ADMIN', 'REGIONAL_MANAGER'].includes(user?.role) && (
                                        <div style={{ marginTop: 'var(--space-md)' }}>
                                            <button className="btn btn-primary" onClick={() => setContentModal(true)}>
                                                <span className="material-icons-outlined">add_circle</span>
                                                İlk İçerik Adımını Ekle
                                            </button>
                                        </div>
                                    )}
                                    {user?.role === 'EMPLOYEE' && (
                                        <div className="training-actions">
                                            <button className="btn btn-success" onClick={handleComplete}>
                                                <span className="material-icons-outlined">check_circle</span>
                                                Tamamladım
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Assignments Table */}
                            {user?.role !== 'EMPLOYEE' && training.assignments?.length > 0 && (() => {
                                const q = assignedSearch.trim().toLowerCase();
                                const filteredAssignments = q
                                    ? training.assignments.filter((a: any) => {
                                        const fullName = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.toLowerCase();
                                        const store = (a.user?.store?.name || '').toLowerCase();
                                        return fullName.includes(q) || store.includes(q);
                                    })
                                    : training.assignments;
                                return (
                                <div style={{ marginTop: 'var(--space-xl)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', gap: 12, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0 }}>
                                            Atanmış Çalışanlar
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500, marginLeft: 8 }}>
                                                ({q ? `${filteredAssignments.length} / ${training.assignments.length}` : training.assignments.length})
                                            </span>
                                        </h3>
                                        <div style={{ position: 'relative', minWidth: 260, flex: '0 1 320px' }}>
                                            <span className="material-icons-outlined" style={{
                                                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                                color: 'var(--text-tertiary)', fontSize: '1.05rem', pointerEvents: 'none',
                                            }}>search</span>
                                            <input
                                                className="form-input"
                                                style={{ paddingLeft: 36, paddingRight: assignedSearch ? 36 : 12, fontSize: '0.85rem' }}
                                                placeholder="İsim, soyisim veya mağaza ara..."
                                                value={assignedSearch}
                                                onChange={e => setAssignedSearch(e.target.value)}
                                            />
                                            {assignedSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignedSearch('')}
                                                    style={{
                                                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                                        color: 'var(--text-tertiary)', padding: 4,
                                                        display: 'flex', alignItems: 'center',
                                                    }}
                                                    title="Aramayı temizle"
                                                >
                                                    <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>close</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Çalışan</th>
                                                    <th>Mağaza</th>
                                                    <th>Durum</th>
                                                    <th>İlerleme</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAssignments.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                                            <span className="material-icons-outlined" style={{ fontSize: '1.4rem', display: 'block', marginBottom: 4, opacity: 0.5 }}>search_off</span>
                                                            "{assignedSearch}" için sonuç yok
                                                        </td>
                                                    </tr>
                                                ) : filteredAssignments.map((a: any) => (
                                                    <tr key={a.id}>
                                                        <td>{a.user.firstName} {a.user.lastName}</td>
                                                        <td>{a.user.store?.name || '-'}</td>
                                                        <td>
                                                            <span className={`badge badge-${a.status === 'COMPLETED' ? 'success' : a.status === 'IN_PROGRESS' ? 'info' : 'neutral'}`}>
                                                                {a.status === 'COMPLETED' ? 'Tamamlandı' : a.status === 'IN_PROGRESS' ? 'Devam Ediyor' : 'Başlanmadı'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {(() => {
                                                                const pct = a.status === 'COMPLETED' ? 100 : a.status === 'IN_PROGRESS' ? 50 : a.status === 'OVERDUE' ? 30 : 0;
                                                                const bg = a.status === 'COMPLETED' ? 'linear-gradient(90deg, #22c55e, #16a34a)' : a.status === 'IN_PROGRESS' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : a.status === 'OVERDUE' ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'var(--bg-tertiary)';
                                                                const glow = a.status === 'COMPLETED' ? '0 0 8px rgba(34,197,94,0.3)' : a.status === 'IN_PROGRESS' ? '0 0 8px rgba(245,158,11,0.3)' : a.status === 'OVERDUE' ? '0 0 8px rgba(239,68,68,0.3)' : 'none';
                                                                return (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div style={{ width: 120, height: 8, borderRadius: 4, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                                                                            <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: bg, boxShadow: glow, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
                                                                        </div>
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: a.status === 'COMPLETED' ? '#22c55e' : a.status === 'IN_PROGRESS' ? '#f59e0b' : a.status === 'OVERDUE' ? '#ef4444' : 'var(--text-tertiary)', minWidth: 28 }}>%{pct}</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                );
                            })()}
                        </>
                    )}
                </div>

                {/* Assign Modal */}
                {assignModal && (
                    <div className="modal-overlay" onClick={() => setAssignModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Çalışanlara Ata</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setAssignModal(false)}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {users.length === 0 ? (
                                    <div className="loading-center"><div className="spinner" /></div>
                                ) : (() => {
                                    const q = modalSearch.trim().toLowerCase();
                                    const filteredUsers = q
                                        ? users.filter(u => {
                                            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                                            const store = (u.store?.name || '').toLowerCase();
                                            const email = (u.email || '').toLowerCase();
                                            return fullName.includes(q) || store.includes(q) || email.includes(q);
                                        })
                                        : users;
                                    return (
                                    <>
                                    {/* Search input */}
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <span className="material-icons-outlined" style={{
                                            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                            color: 'var(--text-tertiary)', fontSize: '1.05rem', pointerEvents: 'none',
                                        }}>search</span>
                                        <input
                                            className="form-input"
                                            style={{ paddingLeft: 36, paddingRight: modalSearch ? 36 : 12 }}
                                            placeholder="İsim, soyisim veya mağaza ara..."
                                            value={modalSearch}
                                            onChange={e => setModalSearch(e.target.value)}
                                            autoFocus
                                        />
                                        {modalSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setModalSearch('')}
                                                style={{
                                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                                    color: 'var(--text-tertiary)', padding: 4,
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title="Aramayı temizle"
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '1.05rem' }}>close</span>
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                                        {q ? `${filteredUsers.length} sonuç bulundu` : `${users.length} çalışan listeleniyor`}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: 400, overflowY: 'auto' }}>
                                        {filteredUsers.length === 0 ? (
                                            <div style={{
                                                padding: 24, textAlign: 'center',
                                                color: 'var(--text-tertiary)', fontSize: '0.82rem',
                                            }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '1.6rem', display: 'block', marginBottom: 4, opacity: 0.5 }}>
                                                    search_off
                                                </span>
                                                "{modalSearch}" için sonuç yok
                                            </div>
                                        ) : filteredUsers.map(u => {
                                            const alreadyAssigned = training?.assignments?.some((a: any) => a.userId === u.id);
                                            return (
                                                <label key={u.id} className="form-checkbox" style={{
                                                    padding: 'var(--space-sm) var(--space-md)',
                                                    background: selectedUsers.includes(u.id) ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                    borderRadius: 'var(--radius-md)',
                                                    opacity: alreadyAssigned ? 0.5 : 1,
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={alreadyAssigned}
                                                        checked={selectedUsers.includes(u.id)}
                                                        onChange={e => {
                                                            setSelectedUsers(prev =>
                                                                e.target.checked
                                                                    ? [...prev, u.id]
                                                                    : prev.filter(id => id !== u.id)
                                                            );
                                                        }}
                                                    />
                                                    <span>{u.firstName} {u.lastName}</span>
                                                    {alreadyAssigned && <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Zaten atanmış</span>}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    </>
                                    );
                                })()}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setAssignModal(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleAssign} disabled={assigning || selectedUsers.length === 0}>
                                    {assigning ? 'Atanıyor...' : `${selectedUsers.length} Kişiye Ata`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quiz Modal */}
                {showQuiz && training?.quiz && (
                    <QuizModal
                        quizId={training.quiz.id}
                        trainingTitle={training.title}
                        onClose={() => setShowQuiz(false)}
                        onPassed={async () => { await refreshTraining(); }}
                    />
                )}

                {/* Add Content Modal */}
                {contentModal && (
                    <div className="modal-overlay" onClick={() => setContentModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>İçerik Adımı Ekle</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setContentModal(false)}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">İçerik Türü</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                        {CONTENT_TYPES.map(ct => (
                                            <button
                                                key={ct.value}
                                                className={`btn ${contentForm.type === ct.value ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                                                onClick={() => setContentForm({ ...contentForm, type: ct.value })}
                                                style={{ flexDirection: 'column', gap: 4, padding: '12px 8px' }}
                                            >
                                                <span className="material-icons-outlined">{ct.icon}</span>
                                                {ct.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Başlık</label>
                                    <input className="form-input" value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} placeholder="Adım başlığı" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{['VIDEO', 'FILE'].includes(contentForm.type) ? (contentForm.type === 'VIDEO' ? 'Video URL' : 'Dosya URL') : 'İçerik Metni'}</label>
                                    {['TEXT', 'QUIZ'].includes(contentForm.type) ? (
                                        <textarea className="form-textarea" rows={6} value={contentForm.content} onChange={e => setContentForm({ ...contentForm, content: e.target.value })} placeholder="İçerik metnini buraya yazın..." />
                                    ) : (
                                        <input className="form-input" value={contentForm.content} onChange={e => setContentForm({ ...contentForm, content: e.target.value })} placeholder="https://..." />
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setContentModal(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleAddContent} disabled={!contentForm.title || addingContent}>
                                    {addingContent ? (
                                        <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Ekleniyor...</>
                                    ) : (
                                        <><span className="material-icons-outlined">add</span> Ekle</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
