'use client';

import { useState, useMemo } from 'react';

type Content = {
    id: string;
    type: string;
    title: string;
    content: string;
    sortOrder: number;
};

type Props = {
    title: string;
    contents: Content[];
    onClose: () => void;
    onSectionRead?: (idx: number) => void; // mark step read
    completedSteps: Set<number>;
    onAllCompleted?: () => void; // called when last section marked read
    hasQuiz?: boolean;
    onStartQuiz?: () => void;
};

export default function TrainingViewer({ title, contents, onClose, onSectionRead, completedSteps, onAllCompleted, hasQuiz, onStartQuiz }: Props) {
    const [activeIdx, setActiveIdx] = useState(0);
    const total = contents.length;
    const doneCount = completedSteps.size;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const current = contents[activeIdx];
    const isDone = completedSteps.has(activeIdx);
    const allDone = doneCount === total;

    const pdfUrl = useMemo(() => {
        if (!current?.content) return null;
        const m = current.content.match(/\/trainings\/[\w-]+\.pdf/);
        return m ? m[0] : null;
    }, [current]);

    const handleMarkRead = () => {
        if (isDone) return;
        onSectionRead?.(activeIdx);
        // If was last unread section → trigger allCompleted
        const willBeAllDone = doneCount + 1 === total;
        if (willBeAllDone) {
            setTimeout(() => onAllCompleted?.(), 400);
        } else if (activeIdx < total - 1) {
            setTimeout(() => setActiveIdx(i => i + 1), 300);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: '#0a0a0a',
            display: 'flex', flexDirection: 'column',
            animation: 'cine-fadeInUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
        }}>
            {/* Top Bar */}
            <div style={{
                padding: '14px 24px',
                background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 16,
            }}>
                <button onClick={onClose} style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span className="material-icons-outlined">close</span>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${pct}%`,
                                background: allDone ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #E53935, #ef5350)',
                                transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1), background 0.4s ease',
                            }} />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {doneCount}/{total} bölüm • %{pct}
                        </span>
                    </div>
                </div>
                {allDone && hasQuiz ? (
                    <button onClick={onStartQuiz} style={{
                        padding: '10px 18px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #E53935, #ef5350)',
                        color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 16px rgba(229,57,53,0.4)',
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>quiz</span>
                        Sınava Başla
                    </button>
                ) : !isDone ? (
                    <button onClick={handleMarkRead} style={{
                        padding: '10px 18px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
                    }}>
                        <span style={{ fontSize: '1rem' }}>✓</span> Okudum / Tamamladım
                    </button>
                ) : (
                    <span style={{
                        padding: '10px 18px', borderRadius: 10,
                        background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                        fontWeight: 700, fontSize: '0.85rem',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>verified</span>
                        Okundu
                    </span>
                )}
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar */}
                <div style={{
                    width: 280, flexShrink: 0,
                    background: '#111', borderRight: '1px solid rgba(255,255,255,0.06)',
                    overflowY: 'auto',
                }}>
                    <div style={{ padding: '20px 20px 12px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>
                            BÖLÜMLER
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                            {doneCount} / {total} tamamlandı
                        </div>
                    </div>
                    {contents.map((c, idx) => {
                        const isActive = idx === activeIdx;
                        const isComplete = completedSteps.has(idx);
                        return (
                            <button
                                key={c.id}
                                onClick={() => setActiveIdx(idx)}
                                style={{
                                    width: '100%', padding: '12px 20px',
                                    background: isActive ? 'rgba(229,57,53,0.18)' : 'transparent',
                                    borderLeft: isActive ? '3px solid #E53935' : '3px solid transparent',
                                    border: 'none', cursor: 'pointer', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    transition: 'background 0.2s ease',
                                }}
                                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                            >
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: isComplete ? '#22c55e' : isActive ? '#E53935' : 'rgba(255,255,255,0.08)',
                                    color: '#fff', fontSize: '0.78rem', fontWeight: 700,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    {isComplete ? '✓' : idx + 1}
                                </span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.78)', fontSize: '0.82rem', fontWeight: isActive ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.title || `Bölüm ${idx + 1}`}
                                    </div>
                                    {isActive && !isComplete && (
                                        <div style={{ color: '#E53935', fontSize: '0.7rem', fontWeight: 600, marginTop: 2 }}>Okunuyor</div>
                                    )}
                                    {isComplete && (
                                        <div style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 600, marginTop: 2 }}>Tamamlandı</div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 32px 12px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#888' }}>Bölüm {activeIdx + 1} / {total}</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111', marginTop: 2 }}>{current?.title || `Bölüm ${activeIdx + 1}`}</div>
                    </div>

                    <div style={{ flex: 1, padding: 24 }}>
                        {pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 280px)', border: 'none', borderRadius: 12, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                                title={current?.title}
                            />
                        ) : current?.type === 'VIDEO' && current?.content ? (
                            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                                <a href={current.content} target="_blank" rel="noreferrer" style={{ color: '#E53935', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                    <span className="material-icons-outlined">play_circle</span> Videoyu Aç
                                </a>
                            </div>
                        ) : (
                            <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', color: '#111', lineHeight: 1.7, fontSize: '0.95rem' }}>
                                {(current?.content || '').split('\n').map((p, i) => p.trim() ? <p key={i} style={{ marginBottom: 12 }}>{p}</p> : null)}
                            </div>
                        )}
                    </div>

                    {/* Footer Nav */}
                    <div style={{ padding: '14px 32px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={activeIdx === 0} style={{
                            padding: '8px 16px', borderRadius: 8,
                            background: 'transparent', border: 'none',
                            color: activeIdx === 0 ? '#ccc' : '#444',
                            fontWeight: 600, fontSize: '0.85rem',
                            cursor: activeIdx === 0 ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>← Önceki</button>
                        <span style={{ color: '#999', fontSize: '0.85rem', fontWeight: 600 }}>{activeIdx + 1} / {total}</span>
                        <button onClick={() => setActiveIdx(i => Math.min(total - 1, i + 1))} disabled={activeIdx === total - 1} style={{
                            padding: '8px 16px', borderRadius: 8,
                            background: 'transparent', border: 'none',
                            color: activeIdx === total - 1 ? '#ccc' : '#444',
                            fontWeight: 600, fontSize: '0.85rem',
                            cursor: activeIdx === total - 1 ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>Sonraki →</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
