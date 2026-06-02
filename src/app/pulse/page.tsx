'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';

const SCORE_EMOJIS = ['', '😢', '😕', '😐', '🙂', '😊'];
const SCORE_COLORS = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

type FormState = {
    question: string;
    options: string[];
    expiresAt: string; // datetime-local string
    period: string;    // YYYY-MM
};

export default function PulsePage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [surveys, setSurveys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Multi-choice create form
    const [form, setForm] = useState<FormState>({
        question: '',
        options: ['', ''],
        expiresAt: '',
        period: new Date().toISOString().slice(0, 7),
    });

    // Per-survey response selections
    const [pickByPoll, setPickByPoll] = useState<Record<string, number>>({});

    useEffect(() => { document.title = 'Sporthink | Nabız Anketi'; }, []);

    const fetchSurveys = () => {
        fetch('/api/pulse')
            .then(r => r.json())
            .then(setSurveys)
            .catch(() => showToast('Anketler yüklenirken hata', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (session) fetchSurveys(); }, [session]);

    const handleCreate = async () => {
        const cleaned = form.options.map(o => o.trim()).filter(o => o.length > 0);
        if (!form.question.trim()) { showToast('Anket sorusu gerekli', 'error'); return; }
        if (cleaned.length < 2) { showToast('En az 2 şık girmelisiniz', 'error'); return; }
        setSubmitting(true);
        try {
            const res = await fetch('/api/pulse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    question: form.question.trim(),
                    options: cleaned,
                    expiresAt: form.expiresAt || null,
                    period: form.period,
                }),
            });
            if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Hata'); }
            showToast('Anket yayınlandı', 'success');
            setForm({ question: '', options: ['', ''], expiresAt: '', period: new Date().toISOString().slice(0, 7) });
            fetchSurveys();
        } catch (err: any) { showToast(err.message || 'Anket oluşturulurken hata', 'error'); }
        finally { setSubmitting(false); }
    };

    const handleRespond = async (surveyId: string) => {
        const idx = pickByPoll[surveyId];
        if (typeof idx !== 'number') { showToast('Bir şık seçin', 'error'); return; }
        setSubmitting(true);
        try {
            const res = await fetch('/api/pulse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'respond', surveyId, selectedOption: idx }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            showToast('Oyunuz kaydedildi', 'success');
            setPickByPoll(prev => { const c = { ...prev }; delete c[surveyId]; return c; });
            fetchSurveys();
        } catch (err: any) { showToast(err.message || 'Hata oluştu', 'error'); }
        finally { setSubmitting(false); }
    };

    if (!session) return null;
    const user = session.user as any;
    const isManager = ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(user.role);

    const polls = surveys.filter(s => s.isPoll);
    const legacy = surveys.filter(s => !s.isPoll);
    const activeCount = polls.filter(s => s.isOpen).length;
    const totalResponses = polls.reduce((a, s) => a + (s.totalResponses || 0), 0);

    const updateOption = (i: number, v: string) => {
        setForm(f => { const opts = [...f.options]; opts[i] = v; return { ...f, options: opts }; });
    };
    const addOption = () => setForm(f => ({ ...f, options: [...f.options, ''] }));
    const removeOption = (i: number) => setForm(f => {
        if (f.options.length <= 2) return f;
        const opts = f.options.filter((_, idx) => idx !== i);
        return { ...f, options: opts };
    });

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-body" style={{ paddingTop: 24 }}>
                    {/* Hero Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 22, gap: 16, flexWrap: 'wrap',
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: '2rem', fontWeight: 800, margin: 0,
                                display: 'inline-flex', alignItems: 'center', gap: 10,
                                color: 'var(--text-primary)',
                            }}>
                                <span style={{
                                    background: 'linear-gradient(135deg, #E53935 0%, #ef5350 100%)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Şirket Anketleri</span>
                                <span style={{ fontSize: '1.8rem' }}>📊</span>
                            </h1>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: 4 }}>
                                Fikrini belirt, şirket süreçlerinde söz sahibi ol.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <MiniStatPill icon="poll" label="Aktif Anket" value={activeCount} color="#22c55e" />
                            <MiniStatPill icon="how_to_vote" label="Toplam Oy" value={totalResponses} color="#3b82f6" />
                            <MiniStatPill icon="forum" label="Toplam Anket" value={polls.length} color="#E53935" />
                        </div>
                    </div>

                    {loading ? <><SkeletonStats count={3} /><SkeletonCard count={2} /></> : (
                        <>
                            {/* Create + Info Section (managers) */}
                            {isManager && (
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)',
                                    gap: 20, marginBottom: 28,
                                }}>
                                    {/* Create Card */}
                                    <div style={{
                                        background: '#fff', borderRadius: 16,
                                        border: '1px solid rgba(34,197,94,0.18)',
                                        borderLeft: '4px solid #22c55e',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                                        padding: 22, position: 'relative', overflow: 'hidden',
                                    }}>
                                        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative' }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10,
                                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                                            }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>add_chart</span>
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                                Yeni Yönetici Anketi Başlat
                                            </h3>
                                        </div>

                                        {/* Question */}
                                        <div style={{ marginBottom: 14, position: 'relative' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                                                Anket Sorusu
                                            </label>
                                            <input
                                                placeholder="Örn: Yeni çıkacak ürünün ana rengi ne olmalı?"
                                                value={form.question}
                                                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                                                style={{
                                                    width: '100%', padding: '12px 14px',
                                                    borderRadius: 10, border: '1px solid #e2e8f0',
                                                    fontSize: '0.95rem', background: '#f8fafc',
                                                    fontWeight: 600, outline: 'none',
                                                }}
                                                onFocus={e => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.background = '#fff'; }}
                                                onBlur={e => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                            />
                                        </div>

                                        {/* Options */}
                                        <div style={{ marginBottom: 12, position: 'relative' }}>
                                            {form.options.map((opt, i) => (
                                                <div key={i} style={{ position: 'relative', marginBottom: 10 }}>
                                                    <span className="material-icons-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>
                                                        format_list_bulleted
                                                    </span>
                                                    <input
                                                        placeholder={`Şık (Seçenek) ${i + 1}`}
                                                        value={opt}
                                                        onChange={e => updateOption(i, e.target.value)}
                                                        style={{
                                                            width: '100%', padding: '11px 42px 11px 42px',
                                                            borderRadius: 10, border: '1px solid #e2e8f0',
                                                            fontSize: '0.9rem', background: '#f8fafc', outline: 'none',
                                                        }}
                                                        onFocus={e => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.background = '#fff'; }}
                                                        onBlur={e => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                                    />
                                                    {form.options.length > 2 && (
                                                        <button
                                                            onClick={() => removeOption(i)}
                                                            title="Şıkkı sil"
                                                            style={{
                                                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                                                width: 26, height: 26, borderRadius: 6, border: 'none',
                                                                background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                        >
                                                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>close</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={addOption}
                                                style={{
                                                    width: '100%', padding: '10px 14px', borderRadius: 10,
                                                    background: 'transparent', border: '1.5px dashed #E53935',
                                                    color: '#E53935', fontWeight: 700, fontSize: '0.85rem',
                                                    cursor: 'pointer', marginTop: 4,
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    transition: 'background 0.2s ease',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,57,53,0.06)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                                                Daha Fazla Şık Ekle
                                            </button>
                                        </div>

                                        {/* Closing date */}
                                        <div style={{ marginBottom: 12, position: 'relative' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '0.95rem', color: '#22c55e' }}>schedule</span>
                                                Anket Kapanış Tarihi ve Saati
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={form.expiresAt}
                                                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                                                style={{
                                                    width: '100%', padding: '11px 14px',
                                                    borderRadius: 10, border: '1px solid #e2e8f0',
                                                    fontSize: '0.9rem', background: '#f8fafc', outline: 'none',
                                                }}
                                            />
                                            <div style={{
                                                marginTop: 6, fontSize: '0.72rem', color: '#94a3b8',
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                            }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '0.85rem', color: '#f59e0b' }}>info</span>
                                                Boş bırakılırsa anket süresiz açık kalır.
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'relative' }}>
                                            <button
                                                onClick={() => setForm({ question: '', options: ['', ''], expiresAt: '', period: new Date().toISOString().slice(0, 7) })}
                                                disabled={submitting}
                                                style={{
                                                    padding: '11px 18px', borderRadius: 10,
                                                    background: 'transparent', border: '1px solid #e2e8f0',
                                                    color: '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                                }}
                                            >
                                                Temizle
                                            </button>
                                            <button
                                                onClick={handleCreate}
                                                disabled={submitting || !form.question.trim()}
                                                style={{
                                                    padding: '11px 22px', borderRadius: 10,
                                                    background: form.question.trim() ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#cbd5e1',
                                                    color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.9rem',
                                                    cursor: form.question.trim() && !submitting ? 'pointer' : 'not-allowed',
                                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                                    boxShadow: form.question.trim() ? '0 6px 16px rgba(34,197,94,0.35)' : 'none',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>campaign</span>
                                                {submitting ? 'Yayınlanıyor...' : 'Anketi Yayınla'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)',
                                        borderRadius: 16,
                                        border: '1px solid rgba(34,197,94,0.25)',
                                        padding: '24px 20px', textAlign: 'center',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                                        position: 'relative', overflow: 'hidden',
                                    }}>
                                        <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)' }} />
                                        <div style={{ position: 'absolute', bottom: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)' }} />

                                        <div style={{
                                            width: 56, height: 56, borderRadius: 16,
                                            background: 'linear-gradient(135deg, #22c55e, #10b981)',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
                                            position: 'relative',
                                        }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '1.6rem' }}>verified</span>
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#065f46', position: 'relative' }}>
                                            Fikriniz Önemli
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.55, color: '#047857', position: 'relative' }}>
                                            Katıldığınız anketler yönetim ekibine doğrudan veri sağlar.
                                            Her ankette sadece <strong>1 oy hakkınız</strong> bulunmaktadır.
                                            Şeffaf sonuçları oy verdikten hemen sonra görebilirsiniz.
                                        </p>
                                        <div style={{
                                            marginTop: 4, display: 'flex', gap: 14,
                                            fontSize: '0.7rem', color: '#065f46', fontWeight: 700, position: 'relative',
                                        }}>
                                            <span>🔒 Anonim</span>
                                            <span>⚡ Anında</span>
                                            <span>📊 Şeffaf</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Polls list */}
                            {polls.length === 0 && legacy.length === 0 ? (
                                <div className="empty-state">
                                    <span className="material-icons-outlined">poll</span>
                                    <p>Henüz anket oluşturulmamış</p>
                                </div>
                            ) : (
                                <>
                                    {polls.length > 0 && (
                                        <>
                                            <SectionTitle icon="how_to_vote" title="Aktif Anketler" count={polls.length} />
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 18, marginBottom: 28 }}>
                                                {polls.map(p => (
                                                    <PollCard
                                                        key={p.id}
                                                        poll={p}
                                                        pick={pickByPoll[p.id]}
                                                        onPick={(idx) => setPickByPoll(prev => ({ ...prev, [p.id]: idx }))}
                                                        onSubmit={() => handleRespond(p.id)}
                                                        submitting={submitting}
                                                        isManager={isManager}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {legacy.length > 0 && (
                                        <>
                                            <SectionTitle icon="history" title="Eski Skor Anketleri" count={legacy.length} />
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
                                                {legacy.map((survey: any) => (
                                                    <div key={survey.id} className="card" style={{ border: survey.isActive ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
                                                        <div className="card-header" style={{ borderBottom: 'none' }}>
                                                            <div>
                                                                <h4 className="card-title" style={{ fontSize: '1rem' }}>
                                                                    {survey.isActive && <span className="badge badge-success" style={{ marginRight: 8, fontSize: '0.6rem' }}>Aktif</span>}
                                                                    {survey.title}
                                                                </h4>
                                                                <div className="text-xs text-secondary" style={{ marginTop: 4 }}>
                                                                    Dönem: {survey.period} | {survey.totalResponses} yanıt
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {survey.totalResponses > 0 && (
                                                            <div style={{ padding: '12px 0' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-lg)', background: survey.averages.overall >= 4 ? 'rgba(34,197,94,0.08)' : survey.averages.overall >= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)' }}>
                                                                    <span style={{ fontSize: '2rem' }}>{SCORE_EMOJIS[Math.round(survey.averages.overall)] || '😐'}</span>
                                                                    <div>
                                                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: survey.averages.overall >= 4 ? '#22c55e' : survey.averages.overall >= 3 ? '#f59e0b' : '#ef4444' }}>
                                                                            {survey.averages.overall}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Genel Ortalama</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

/* ============== Sub Components ============== */

function MiniStatPill({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 999,
            background: 'var(--bg-secondary)', border: `1px solid ${color}40`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
            <span style={{
                width: 26, height: 26, borderRadius: 7,
                background: `${color}22`, color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>{icon}</span>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
            </div>
        </div>
    );
}

function SectionTitle({ icon, title, count }: { icon: string; title: string; count: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 14px' }}>
            <span className="material-icons-outlined" style={{ color: '#E53935', fontSize: '1.2rem' }}>{icon}</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
            <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(229,57,53,0.12)', color: '#E53935', fontSize: '0.7rem', fontWeight: 700 }}>{count}</span>
        </div>
    );
}

function PollCard({ poll, pick, onPick, onSubmit, submitting, isManager }: {
    poll: any; pick: number | undefined; onPick: (i: number) => void;
    onSubmit: () => void; submitting: boolean; isManager: boolean;
}) {
    const total = poll.totalResponses || 0;
    const showResults = poll.hasResponded || !poll.isOpen || isManager;
    const myIdx = poll.myResponse?.selectedOption;
    const isExpired = poll.isExpired;
    const expires = poll.expiresAt ? new Date(poll.expiresAt) : null;

    const maxCount = Math.max(1, ...(poll.optionCounts || [0]));
    const winnerIdx = poll.optionCounts ? poll.optionCounts.indexOf(maxCount) : -1;

    return (
        <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
            position: 'relative',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        padding: '3px 9px', borderRadius: 999,
                        background: poll.isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.15)',
                        color: poll.isOpen ? '#16a34a' : '#64748b',
                        fontSize: '0.68rem', fontWeight: 800, letterSpacing: 0.3,
                    }}>
                        {poll.isOpen ? '● AÇIK' : isExpired ? 'SÜRESİ DOLDU' : 'KAPALI'}
                    </span>
                    {poll.isAnonymous && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            🔒 Anonim
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>how_to_vote</span>
                    {total} oy
                </div>
            </div>

            {/* Question */}
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                {poll.question}
            </h4>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(poll.options || []).map((opt: string, i: number) => {
                    const count = poll.optionCounts?.[i] || 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isPicked = pick === i;
                    const isMine = myIdx === i;
                    const isWinner = showResults && total > 0 && i === winnerIdx;

                    if (showResults) {
                        return (
                            <div key={i} style={{
                                position: 'relative', overflow: 'hidden',
                                padding: '11px 14px', borderRadius: 10,
                                border: isMine ? '2px solid #22c55e' : '1px solid #e2e8f0',
                                background: '#f8fafc',
                            }}>
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    width: `${pct}%`,
                                    background: isWinner
                                        ? 'linear-gradient(90deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))'
                                        : 'linear-gradient(90deg, rgba(229,57,53,0.12), rgba(229,57,53,0.03))',
                                    transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                                }} />
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                        {isMine && <span style={{ color: '#22c55e' }}>✓</span>}
                                        {isWinner && total > 0 && <span>🏆</span>}
                                        {opt}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isWinner ? '#16a34a' : '#475569' }}>
                                        %{pct} <span style={{ fontWeight: 600, fontSize: '0.72rem', color: '#94a3b8' }}>({count})</span>
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => onPick(i)}
                            disabled={!poll.isOpen}
                            style={{
                                padding: '11px 14px', borderRadius: 10,
                                border: isPicked ? '2px solid #22c55e' : '1px solid #e2e8f0',
                                background: isPicked ? 'rgba(34,197,94,0.06)' : '#fff',
                                color: '#0f172a', fontSize: '0.9rem', fontWeight: 600, textAlign: 'left',
                                cursor: poll.isOpen ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: 10,
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => { if (poll.isOpen && !isPicked) { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.background = 'rgba(34,197,94,0.03)'; } }}
                            onMouseLeave={e => { if (poll.isOpen && !isPicked) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; } }}
                        >
                            <span style={{
                                width: 22, height: 22, borderRadius: '50%',
                                border: isPicked ? '6px solid #22c55e' : '2px solid #cbd5e1',
                                background: '#fff', flexShrink: 0,
                                transition: 'border 0.2s ease',
                            }} />
                            {opt}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {expires ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>schedule</span>
                            Kapanış: {formatDate(expires.toISOString())}
                        </span>
                    ) : (
                        <span style={{ color: '#94a3b8' }}>Süresiz açık</span>
                    )}
                </div>
                {poll.isOpen && !poll.hasResponded ? (
                    <button
                        onClick={onSubmit}
                        disabled={submitting || typeof pick !== 'number'}
                        style={{
                            padding: '8px 16px', borderRadius: 8,
                            background: typeof pick === 'number' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#cbd5e1',
                            color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem',
                            cursor: typeof pick === 'number' && !submitting ? 'pointer' : 'not-allowed',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            boxShadow: typeof pick === 'number' ? '0 4px 12px rgba(34,197,94,0.3)' : 'none',
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>how_to_vote</span>
                        Oy Ver
                    </button>
                ) : poll.hasResponded ? (
                    <span style={{
                        padding: '6px 12px', borderRadius: 999,
                        background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                        fontSize: '0.72rem', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                        ✓ Oy Verildi
                    </span>
                ) : null}
            </div>
        </div>
    );
}
