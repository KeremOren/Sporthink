'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type Question = {
    id: string;
    question: string;
    options?: string;
    type?: string;
    points: number;
};

type Quiz = {
    id: string;
    title: string;
    passScore?: number;
    questions: Question[];
};

type BreakdownItem = {
    index: number;
    questionId: string;
    question: string;
    options?: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
};

type SubmitResult = {
    attemptId: string;
    score: number;
    passScore: number;
    passed: boolean;
    totalQuestions: number;
    correctAnswers: number;
    remainingAttempts: number;
    autoRetry?: boolean;
    autoRetryMessage?: string | null;
    breakdown?: BreakdownItem[];
};

type Props = {
    quizId: string;
    trainingTitle?: string;
    onClose: () => void;
    onPassed?: (result: SubmitResult) => void;
    onFailed?: (result: SubmitResult) => void;
};

export default function QuizModal({ quizId, trainingTitle, onClose, onPassed, onFailed }: Props) {
    const { showToast } = useToast();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<SubmitResult | null>(null);
    const [showReview, setShowReview] = useState(false);
    const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong'>('all');
    const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
    const reviewItemRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const jumpToQuestion = (idx: number) => {
        setReviewFilter('all');
        setShowReview(true);
        setHighlightIdx(idx);
        setTimeout(() => {
            reviewItemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
        setTimeout(() => setHighlightIdx(null), 1600);
    };

    useEffect(() => {
        fetch(`/api/quizzes/${quizId}`)
            .then(r => r.json())
            .then(data => { setQuiz(data); setLoading(false); })
            .catch(() => { showToast('Sınav yüklenemedi', 'error'); setLoading(false); });
    }, [quizId]);

    const handleSubmit = async () => {
        if (!quiz) return;

        // Eksik soru varsa kullanıcıyı uyar + onay al
        const totalQ = quiz.questions.length;
        const answeredQ = Object.keys(answers).filter(k => answers[k]).length;
        if (answeredQ < totalQ) {
            const missing = totalQ - answeredQ;
            if (!confirm(`${missing} soru cevaplanmadı. Yine de sınavı bitirmek istiyor musun?\n\nCevaplamadığın sorular yanlış sayılır.`)) {
                return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/quizzes/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizId: quiz.id, answers }),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data?.error || 'Sınav gönderilemedi', 'error');
                return;
            }
            const result = data as SubmitResult;
            setResult(result);
            if (result.passed) {
                showToast('Tebrikler! Sınavı geçtiniz', 'success');
                onPassed?.(result);
            } else {
                showToast('Geçer not alınamadı', 'warning');
                onFailed?.(result);
            }
        } catch {
            showToast('Sınav gönderilirken hata oluştu', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetry = () => {
        setCurrentIdx(0);
        setAnswers({});
        setResult(null);
        setShowReview(false);
    };

    if (loading || !quiz) {
        return (
            <div className="modal-overlay">
                <div className="modal" style={{ maxWidth: 720, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    const questions = quiz.questions || [];
    const total = questions.length;
    const currentQ = questions[currentIdx];
    const answered = Object.keys(answers).filter(k => answers[k]).length;
    const allAnswered = answered === total;
    const progress = total > 0 ? Math.round(((currentIdx + 1) / total) * 100) : 0;

    return (
        <div className="modal-overlay" style={{
            alignItems: 'flex-start', padding: '5vh 16px', overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
        }}>
            <div
                className="modal"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: 720, width: '100%', padding: 0, borderRadius: 16,
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'cine-scaleIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
                    border: '1px solid var(--card-border)',
                    boxShadow: '0 40px 100px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Red Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)',
                    padding: '20px 24px', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(229,57,53,0.3)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="material-icons-outlined" style={{ fontSize: '1.8rem' }}>quiz</span>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.5, opacity: 0.9 }}>EĞİTİM QUİZİ</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{trainingTitle || quiz.title}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                {/* RESULT SCREEN */}
                {result ? (
                    <div style={{ padding: 24, textAlign: 'center', flex: 1, overflowY: 'auto', minHeight: 0 }}>
                        {(() => {
                            const passColor = result.passed ? '#16a34a' : '#dc2626';
                            const passBg = result.passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)';
                            const passBorder = result.passed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
                            // pass threshold in question count
                            const passNote = Math.ceil((result.passScore / 100) * result.totalQuestions);
                            return (
                            <div style={{
                                background: passBg, border: `1px solid ${passBorder}`,
                                borderRadius: 14, padding: '24px 20px', marginBottom: 16,
                            }}>
                                <div style={{ fontSize: 56, marginBottom: 4, animation: 'cine-scaleIn 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
                                    {result.passed ? '🎉' : '😔'}
                                </div>
                                <h2 style={{ color: passColor, margin: '4px 0 6px' }}>
                                    {result.passed ? 'Başarılı' : 'Başarısız'}
                                </h2>
                                <div style={{ color: passColor, fontSize: '0.85rem', marginBottom: 16 }}>
                                    Geçme notu: {passNote}/{result.totalQuestions}. {result.passed ? 'Tebrikler!' : 'Tekrar deneyebilirsiniz.'}
                                </div>
                                {/* Stats row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, color: passColor, lineHeight: 1 }}>{result.correctAnswers}</div>
                                        <div style={{ fontSize: '0.72rem', color: passColor, marginTop: 4 }}>Doğru</div>
                                    </div>
                                    <span style={{ color: passColor, fontSize: '1.6rem', fontWeight: 300 }}>/</span>
                                    <div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, color: passColor, lineHeight: 1 }}>{result.totalQuestions}</div>
                                        <div style={{ fontSize: '0.72rem', color: passColor, marginTop: 4 }}>Toplam</div>
                                    </div>
                                    <span style={{ color: passColor, fontSize: '1.6rem', fontWeight: 300 }}>•</span>
                                    <div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, color: passColor, lineHeight: 1 }}>%{result.score}</div>
                                        <div style={{ fontSize: '0.72rem', color: passColor, marginTop: 4 }}>Başarı</div>
                                    </div>
                                </div>
                            </div>
                            );
                        })()}

                        {/* Number bubbles — clickable to jump to question */}
                        {result.breakdown && result.breakdown.length > 0 && (
                            <>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                                    Soruyu görmek için numarasına tıklayın
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                                    {result.breakdown.map(b => (
                                        <button
                                            key={b.questionId}
                                            onClick={() => jumpToQuestion(b.index)}
                                            title={`Soru ${b.index} • ${b.isCorrect ? 'Doğru' : 'Yanlış'}`}
                                            style={{
                                                width: 36, height: 36, borderRadius: 8,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: '0.95rem',
                                                background: b.isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: b.isCorrect ? '#16a34a' : '#dc2626',
                                                border: `1px solid ${b.isCorrect ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                                                cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; e.currentTarget.style.boxShadow = b.isCorrect ? '0 4px 10px rgba(34,197,94,0.25)' : '0 4px 10px rgba(239,68,68,0.25)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            {b.index}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {result.autoRetryMessage && (
                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.85rem', color: '#b45309' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 6 }}>refresh</span>
                                {result.autoRetryMessage}
                            </div>
                        )}

                        {/* Review section */}
                        {result.breakdown && result.breakdown.length > 0 && (() => {
                            const correctCount = result.breakdown.filter(b => b.isCorrect).length;
                            const wrongCount = result.breakdown.length - correctCount;
                            const filtered = result.breakdown.filter(b =>
                                reviewFilter === 'all' ? true : reviewFilter === 'correct' ? b.isCorrect : !b.isCorrect
                            );
                            return (
                                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                                    <button onClick={() => setShowReview(s => !s)} style={{
                                        width: '100%', padding: '12px 16px', borderRadius: 10,
                                        background: showReview ? 'rgba(229,57,53,0.06)' : '#f8fafc',
                                        border: `1px solid ${showReview ? 'rgba(229,57,53,0.25)' : '#e2e8f0'}`,
                                        color: '#0f172a', fontWeight: 700, fontSize: '0.9rem',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span className="material-icons-outlined" style={{ color: '#E53935' }}>fact_check</span>
                                            Cevapları İncele
                                        </span>
                                        <span className="material-icons-outlined" style={{ color: '#64748b' }}>{showReview ? 'expand_less' : 'expand_more'}</span>
                                    </button>

                                    {showReview && (
                                        <>
                                            {/* Filter tabs */}
                                            <div style={{ display: 'flex', gap: 8, margin: '14px 0 12px', background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
                                                {[
                                                    { key: 'all', label: 'Tümü', count: result.breakdown.length, color: '#0f172a' },
                                                    { key: 'correct', label: 'Doğrular', count: correctCount, color: '#16a34a' },
                                                    { key: 'wrong', label: 'Yanlışlar', count: wrongCount, color: '#dc2626' },
                                                ].map(t => {
                                                    const active = reviewFilter === t.key;
                                                    return (
                                                        <button
                                                            key={t.key}
                                                            onClick={() => setReviewFilter(t.key as any)}
                                                            style={{
                                                                flex: 1, padding: '8px 10px', borderRadius: 8,
                                                                background: active ? '#fff' : 'transparent',
                                                                border: 'none', cursor: 'pointer',
                                                                color: active ? t.color : '#64748b',
                                                                fontWeight: 700, fontSize: '0.82rem',
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                                transition: 'all 0.2s ease',
                                                            }}
                                                        >
                                                            {t.label}
                                                            <span style={{
                                                                padding: '1px 7px', borderRadius: 999,
                                                                background: active ? `${t.color}1a` : 'rgba(100,116,139,0.15)',
                                                                color: active ? t.color : '#64748b',
                                                                fontSize: '0.7rem', fontWeight: 800,
                                                            }}>{t.count}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {filtered.length === 0 ? (
                                                    <div style={{
                                                        padding: 20, textAlign: 'center', color: '#94a3b8',
                                                        background: '#f8fafc', borderRadius: 10, fontSize: '0.85rem',
                                                    }}>
                                                        {reviewFilter === 'correct' ? 'Doğru cevap yok.' : 'Yanlış cevap yok. Tebrikler!'}
                                                    </div>
                                                ) : filtered.map(b => {
                                                    // Parse options if multi-choice
                                                    let opts: string[] = [];
                                                    try { opts = JSON.parse(b.options || '[]'); } catch { opts = []; }
                                                    // True/False detection
                                                    const isTF = !opts.length && (b.correctAnswer === 'Doğru' || b.correctAnswer === 'Yanlış');
                                                    if (isTF) opts = ['Doğru', 'Yanlış'];

                                                    const isHighlighted = highlightIdx === b.index;
                                                    return (
                                                        <div
                                                            key={b.questionId}
                                                            ref={(el) => { reviewItemRefs.current[b.index] = el; }}
                                                            style={{
                                                                border: `${isHighlighted ? 2 : 1}px solid ${b.isCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                                                                background: '#fff',
                                                                borderRadius: 12, padding: 14,
                                                                boxShadow: isHighlighted
                                                                    ? `0 0 0 4px ${b.isCorrect ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}, 0 6px 20px rgba(0,0,0,0.06)`
                                                                    : '0 1px 3px rgba(0,0,0,0.03)',
                                                                transition: 'box-shadow 0.4s ease, border 0.3s ease',
                                                                scrollMarginTop: 16,
                                                            }}
                                                        >
                                                            {/* Header */}
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                                                                <span style={{
                                                                    width: 26, height: 26, borderRadius: 7,
                                                                    background: b.isCorrect ? '#22c55e' : '#ef4444',
                                                                    color: '#fff', fontSize: '0.78rem', fontWeight: 800,
                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                }}>{b.index}</span>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.4 }}>
                                                                        {b.question}
                                                                    </div>
                                                                </div>
                                                                <span style={{
                                                                    padding: '4px 10px', borderRadius: 999,
                                                                    background: b.isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                                    color: b.isCorrect ? '#16a34a' : '#dc2626',
                                                                    fontSize: '0.68rem', fontWeight: 800, letterSpacing: 0.4,
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                    flexShrink: 0,
                                                                }}>
                                                                    <span style={{ fontSize: '0.85rem' }}>{b.isCorrect ? '✓' : '✕'}</span>
                                                                    {b.isCorrect ? 'DOĞRU' : 'YANLIŞ'}
                                                                </span>
                                                            </div>

                                                            {/* Options listed (multi-choice / TF) */}
                                                            {opts.length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    {opts.map((opt, oi) => {
                                                                        const isUserPick = (b.userAnswer || '').trim().toLowerCase() === opt.trim().toLowerCase();
                                                                        const isCorrectOpt = b.correctAnswer.trim().toLowerCase() === opt.trim().toLowerCase();
                                                                        let bg = '#f8fafc', border = '#e2e8f0', color = '#475569', iconName = '', iconColor = '#94a3b8';
                                                                        if (isCorrectOpt) {
                                                                            bg = 'rgba(34,197,94,0.08)'; border = 'rgba(34,197,94,0.35)'; color = '#15803d'; iconName = 'check_circle'; iconColor = '#16a34a';
                                                                        } else if (isUserPick) {
                                                                            bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.35)'; color = '#b91c1c'; iconName = 'cancel'; iconColor = '#dc2626';
                                                                        }
                                                                        return (
                                                                            <div key={oi} style={{
                                                                                display: 'flex', alignItems: 'center', gap: 10,
                                                                                padding: '9px 12px', borderRadius: 8,
                                                                                background: bg, border: `1px solid ${border}`,
                                                                                fontSize: '0.85rem', color, fontWeight: isCorrectOpt || isUserPick ? 600 : 500,
                                                                            }}>
                                                                                <span style={{
                                                                                    width: 22, height: 22, borderRadius: '50%',
                                                                                    background: isCorrectOpt ? '#22c55e' : isUserPick ? '#ef4444' : '#e2e8f0',
                                                                                    color: isCorrectOpt || isUserPick ? '#fff' : '#64748b',
                                                                                    fontSize: '0.7rem', fontWeight: 800,
                                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                                    flexShrink: 0,
                                                                                }}>{String.fromCharCode(65 + oi)}</span>
                                                                                <span style={{ flex: 1 }}>{opt}</span>
                                                                                {iconName && (
                                                                                    <span className="material-icons-outlined" style={{ fontSize: '1.05rem', color: iconColor }}>{iconName}</span>
                                                                                )}
                                                                                {isUserPick && !isCorrectOpt && (
                                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.15)' }}>SEÇİMİN</span>
                                                                                )}
                                                                                {isCorrectOpt && isUserPick && (
                                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.15)' }}>SEÇİMİN</span>
                                                                                )}
                                                                                {isCorrectOpt && !isUserPick && (
                                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.15)' }}>DOĞRU CEVAP</span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                // Short answer
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    <div style={{
                                                                        padding: '9px 12px', borderRadius: 8,
                                                                        background: b.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                                                        border: `1px solid ${b.isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                                        fontSize: '0.85rem',
                                                                    }}>
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>SENİN CEVABIN: </span>
                                                                        <span style={{ color: b.isCorrect ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{b.userAnswer || '(boş)'}</span>
                                                                    </div>
                                                                    {!b.isCorrect && (
                                                                        <div style={{
                                                                            padding: '9px 12px', borderRadius: 8,
                                                                            background: 'rgba(34,197,94,0.08)',
                                                                            border: '1px solid rgba(34,197,94,0.3)',
                                                                            fontSize: '0.85rem',
                                                                        }}>
                                                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>DOĞRU CEVAP: </span>
                                                                            <span style={{ color: '#15803d', fontWeight: 600 }}>{b.correctAnswer}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            {!result.passed && result.remainingAttempts > 0 && (
                                <button onClick={handleRetry} style={{
                                    flex: 1, padding: '12px 20px', borderRadius: 10,
                                    background: '#fff', color: '#444',
                                    border: '1.5px solid var(--border)',
                                    fontWeight: 700, fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                                    Tekrar Dene
                                </button>
                            )}
                            <button onClick={onClose} style={{
                                flex: 1, padding: '12px 20px', borderRadius: 10,
                                background: 'linear-gradient(135deg, #E53935, #ef5350)',
                                color: '#fff', border: 'none',
                                fontWeight: 700, fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: '0 4px 12px rgba(229,57,53,0.3)',
                            }}>
                                <span style={{ fontSize: '1rem' }}>✓</span> Kapat
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Progress bar */}
                        <div style={{ padding: '16px 24px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Soru {currentIdx + 1} / {total}</span>
                                <span style={{ color: '#E53935', fontWeight: 700 }}>%{progress}</span>
                            </div>
                            <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${progress}%`,
                                    background: 'linear-gradient(90deg, #e53935, #ef4444)',
                                    transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
                                }} />
                            </div>
                        </div>

                        {/* Question */}
                        {currentQ && (
                            <div style={{ padding: '20px 24px', minHeight: 320 }}>
                                <div style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    marginBottom: 20,
                                    lineHeight: 1.5,
                                    color: 'var(--text-primary)',
                                }}>
                                    {currentQ.question}
                                </div>

                                {currentQ.type === 'SHORT_ANSWER' ? (
                                    <textarea className="form-input" rows={4} placeholder="Cevabınızı yazın..." value={answers[currentQ.id] || ''} onChange={e => setAnswers({ ...answers, [currentQ.id]: e.target.value })} />
                                ) : currentQ.type === 'TRUE_FALSE' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        {['Doğru', 'Yanlış'].map(opt => {
                                            const selected = answers[currentQ.id] === opt;
                                            const color = opt === 'Doğru' ? '#22c55e' : '#ef4444';
                                            const icon = opt === 'Doğru' ? 'check_circle' : 'cancel';
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => setAnswers({ ...answers, [currentQ.id]: opt })}
                                                    style={{
                                                        padding: '18px 16px',
                                                        borderRadius: 14,
                                                        border: selected ? `2px solid ${color}` : '2px solid var(--border)',
                                                        background: selected ? `${color}22` : 'var(--card-bg)',
                                                        cursor: 'pointer',
                                                        fontWeight: 700,
                                                        fontSize: '1rem',
                                                        color: selected ? color : 'var(--text-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 8,
                                                        boxShadow: selected ? `0 4px 14px ${color}33` : 'none',
                                                        transform: selected ? 'scale(1.02)' : 'scale(1)',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (!selected) {
                                                            e.currentTarget.style.borderColor = color;
                                                            e.currentTarget.style.background = `${color}11`;
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (!selected) {
                                                            e.currentTarget.style.borderColor = 'var(--border)';
                                                            e.currentTarget.style.background = 'var(--card-bg)';
                                                        }
                                                    }}
                                                >
                                                    <span className="material-icons-outlined" style={{ fontSize: '1.25rem', color: selected ? color : 'var(--text-tertiary)' }}>{icon}</span>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {(() => {
                                            let opts: string[] = [];
                                            try { opts = JSON.parse(currentQ.options || '[]'); } catch { opts = []; }
                                            return opts.map((opt, oi) => {
                                                const selected = answers[currentQ.id] === opt;
                                                return (
                                                    <button
                                                        key={oi}
                                                        onClick={() => setAnswers({ ...answers, [currentQ.id]: opt })}
                                                        style={{
                                                            textAlign: 'left',
                                                            padding: '14px 16px',
                                                            borderRadius: 12,
                                                            border: selected ? '2px solid #e53935' : '2px solid var(--border)',
                                                            background: selected ? 'rgba(229,57,53,0.15)' : 'var(--card-bg)',
                                                            color: 'var(--text-primary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 12,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: selected ? '0 4px 14px rgba(229,57,53,0.25)' : 'none',
                                                            transform: selected ? 'scale(1.01)' : 'scale(1)',
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (!selected) {
                                                                e.currentTarget.style.borderColor = '#e53935';
                                                                e.currentTarget.style.background = 'rgba(229,57,53,0.08)';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (!selected) {
                                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                                e.currentTarget.style.background = 'var(--card-bg)';
                                                            }
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: 32, height: 32, borderRadius: '50%',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            background: selected ? '#e53935' : 'var(--bg-secondary)',
                                                            color: selected ? '#fff' : 'var(--text-primary)',
                                                            border: selected ? 'none' : '1px solid var(--border)',
                                                            fontWeight: 700,
                                                            fontSize: '0.88rem',
                                                            flexShrink: 0,
                                                            transition: 'all 0.2s ease',
                                                        }}>{String.fromCharCode(65 + oi)}</span>
                                                        <span style={{
                                                            fontSize: '0.95rem',
                                                            color: 'var(--text-primary)',
                                                            fontWeight: selected ? 600 : 500,
                                                            lineHeight: 1.4,
                                                        }}>{opt}</span>
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{
                            padding: '14px 24px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                            background: 'var(--bg-secondary)',
                        }}>
                            <button className="btn btn-ghost" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>
                                <span className="material-icons-outlined">arrow_back</span> Önceki
                            </button>

                            {/* Cevaplanan sayacı */}
                            <div style={{
                                fontSize: '0.78rem',
                                color: allAnswered ? '#16a34a' : 'var(--text-tertiary)',
                                fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>
                                    {allAnswered ? 'check_circle' : 'pending'}
                                </span>
                                {answered}/{total} cevaplandı
                            </div>

                            {currentIdx < total - 1 ? (
                                <button className="btn btn-primary" onClick={() => setCurrentIdx(i => i + 1)}>
                                    Sonraki <span className="material-icons-outlined">arrow_forward</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 20px',
                                        background: submitting
                                            ? 'rgba(229,57,53,0.5)'
                                            : allAnswered
                                                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                                : 'linear-gradient(135deg, #e53935, #c62828)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 10,
                                        fontSize: '0.88rem',
                                        fontWeight: 700,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        boxShadow: allAnswered
                                            ? '0 4px 14px rgba(34,197,94,0.4)'
                                            : '0 4px 14px rgba(229,57,53,0.4)',
                                        transition: 'all 0.2s ease',
                                    }}
                                    title={!allAnswered ? `${total - answered} soru cevaplanmadı — yine de bitirebilirsin` : 'Sınavı tamamla'}
                                    onMouseEnter={e => {
                                        if (!submitting) {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {submitting ? (
                                        <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Gönderiliyor...</>
                                    ) : (
                                        <>
                                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>send</span>
                                            Sınavı Bitir
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
