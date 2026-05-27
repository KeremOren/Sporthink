'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';

const CATEGORIES: Record<string, { label: string; icon: string; color: string; gradient: string }> = {
    MUSTERI_KARSILAMA: { label: 'Müşteri Karşılama', icon: 'waving_hand', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    URUN_ONERME: { label: 'Ürün Önerme', icon: 'inventory_2', color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    ITIRAZ: { label: 'İtiraz Karşılama', icon: 'shield', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    EK_SATIS: { label: 'Ek Satış', icon: 'trending_up', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    IADE_SIKAYET: { label: 'İade & Şikayet', icon: 'support_agent', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
};

const BADGE_META: Record<string, { label: string; icon: string; color: string }> = {
    ALTIN_SATICI: { label: 'Altın Satıcı', icon: 'workspace_premium', color: '#f59e0b' },
    EMPATI_USTASI: { label: 'Empati Ustası', icon: 'favorite', color: '#ec4899' },
    CAPRAZ_SATIS_USTASI: { label: 'Çapraz Satış Ustası', icon: 'sync_alt', color: '#8b5cf6' },
    KAPANIS_USTASI: { label: 'Kapanış Ustası', icon: 'flag', color: '#22c55e' },
    URUN_UZMANI: { label: 'Ürün Uzmanı', icon: 'school', color: '#3b82f6' },
};

type Step = { npc: string; choices: { text: string; originalIndex: number }[] };

type ScenarioData = {
    id: string;
    category: string;
    title: string;
    description: string | null;
    difficulty: string;
    xpReward: number;
    customerContext: string;
    stepCount: number;
    steps: Step[];
};

type ResultBreakdown = {
    stepIndex: number;
    npc: string;
    choiceIndex: number;
    choiceText: string;
    scores: { empati: number; bilgi: number; caprazSatis: number; kapanis: number };
    feedback: string;
    isBest: boolean;
    bestChoiceIndex: number;
    bestChoiceText: string;
};

type Result = {
    attemptId: string;
    score: number;
    scores: { empati: number; bilgi: number; caprazSatis: number; kapanis: number };
    xpEarned: number;
    badge: string | null;
    breakdown: ResultBreakdown[];
};

export default function SimulationPlayPage() {
    const params = useParams();
    const id = String(params?.id || '');
    const { data: session } = useSession();
    const router = useRouter();
    const { showToast } = useToast();

    const [scenario, setScenario] = useState<ScenarioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState<'intro' | 'playing' | 'ai-playing' | 'result' | 'ai-result'>('intro');
    const [mode, setMode] = useState<'classic' | 'ai'>('classic');
    const [stepIndex, setStepIndex] = useState(0);
    const [selections, setSelections] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<Result | null>(null);
    const startTimeRef = useRef<number>(0);

    // AI chat state
    type ChatMsg = { role: 'user' | 'assistant'; content: string; mood?: string };
    const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [customerMood, setCustomerMood] = useState('NÖTR');
    const [conversationEnded, setConversationEnded] = useState(false);
    const [endReason, setEndReason] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { document.title = 'Sporthink | Simülasyon Oyna'; }, []);

    useEffect(() => {
        if (!session || !id) return;
        fetch(`/api/simulations/${id}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) { showToast(d.error, 'error'); router.push('/simulations'); return; }
                setScenario(d);
            })
            .catch(() => showToast('Senaryo yüklenemedi', 'error'))
            .finally(() => setLoading(false));
    }, [session, id]);

    const handleStart = () => {
        if (mode === 'ai') {
            // AI mode: open with customer's opening line (first step's npc as the customer's first message)
            const opening = scenario?.steps?.[0]?.npc || 'Merhaba, yardımcı olabilir misiniz?';
            setChatHistory([{ role: 'assistant', content: opening, mood: 'NÖTR' }]);
            setCustomerMood('NÖTR');
            setConversationEnded(false);
            setEndReason(null);
            setAiResult(null);
            setPhase('ai-playing');
        } else {
            setPhase('playing');
            setStepIndex(0);
            setSelections([]);
            setResult(null);
        }
        startTimeRef.current = Date.now();
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || chatLoading || conversationEnded || !scenario) return;
        const userMsg: ChatMsg = { role: 'user', content: chatInput.trim() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await fetch('/api/simulations/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: scenario.id,
                    history: newHistory,
                    message: chatInput.trim(),
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const aiMsg: ChatMsg = { role: 'assistant', content: data.reply, mood: data.mood };
            setChatHistory([...newHistory, aiMsg]);
            setCustomerMood(data.mood || 'NÖTR');
            if (data.ended) {
                setConversationEnded(true);
                setEndReason(data.endReason);
                showToast(data.endReason === 'SALE_CLOSED' ? 'Satış tamamlandı!' : 'Müşteri ayrıldı.', data.endReason === 'SALE_CLOSED' ? 'success' : 'info');
            }
        } catch (e: any) {
            showToast(e.message || 'AI yanıt veremedi', 'error');
        } finally {
            setChatLoading(false);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    const handleEvaluate = async () => {
        if (!scenario || chatHistory.length < 2) return;
        setSubmitting(true);
        try {
            const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
            const res = await fetch('/api/simulations/ai-evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: scenario.id,
                    history: chatHistory,
                    durationSeconds,
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAiResult(data);
            setPhase('ai-result');
        } catch (e: any) {
            showToast(e.message || 'Değerlendirme yapılamadı', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChoice = async (choiceIdx: number) => {
        if (!scenario) return;
        const next = [...selections, choiceIdx];
        setSelections(next);

        if (stepIndex + 1 < scenario.stepCount) {
            setStepIndex(stepIndex + 1);
        } else {
            // Submit
            setSubmitting(true);
            try {
                const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
                const res = await fetch(`/api/simulations/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ choices: next, durationSeconds }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Hata');
                setResult(data);
                setPhase('result');
            } catch (e: any) {
                showToast(e.message || 'Gönderilemedi', 'error');
            } finally {
                setSubmitting(false);
            }
        }
    };

    if (loading || !scenario) {
        return (
            <div className="page-wrapper">
                <Sidebar />
                <main className="main-content">
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Yükleniyor...</div>
                </main>
            </div>
        );
    }

    const cat = CATEGORIES[scenario.category] || CATEGORIES.MUSTERI_KARSILAMA;
    const currentStep = scenario.steps[stepIndex];
    const progress = scenario.stepCount > 0 ? ((stepIndex) / scenario.stepCount) * 100 : 0;

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header cine-fadeInUp">
                    <div>
                        <button
                            onClick={() => router.push('/simulations')}
                            style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--text-tertiary)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: '0.85rem', marginBottom: 8, padding: 0,
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
                            Simülasyonlara Dön
                        </button>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: cat.gradient,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff',
                            }}>
                                <span className="material-icons-outlined">{cat.icon}</span>
                            </span>
                            {scenario.title}
                        </h1>
                        <p className="page-subtitle">{cat.label} · {scenario.xpReward} XP ödülü</p>
                    </div>
                </div>

                {phase === 'intro' && (
                    <IntroView scenario={scenario} cat={cat} mode={mode} setMode={setMode} onStart={handleStart} />
                )}

                {phase === 'playing' && currentStep && (
                    <PlayView
                        step={currentStep}
                        stepIndex={stepIndex}
                        totalSteps={scenario.stepCount}
                        progress={progress}
                        cat={cat}
                        scenario={scenario}
                        submitting={submitting}
                        onChoose={handleChoice}
                    />
                )}

                {phase === 'ai-playing' && (
                    <AiChatView
                        scenario={scenario}
                        cat={cat}
                        history={chatHistory}
                        input={chatInput}
                        setInput={setChatInput}
                        onSend={handleSendMessage}
                        chatLoading={chatLoading}
                        mood={customerMood}
                        ended={conversationEnded}
                        endReason={endReason}
                        onEvaluate={handleEvaluate}
                        submitting={submitting}
                        chatEndRef={chatEndRef}
                    />
                )}

                {phase === 'result' && result && (
                    <ResultView
                        scenario={scenario}
                        result={result}
                        cat={cat}
                        onRestart={handleStart}
                        onExit={() => router.push('/simulations')}
                    />
                )}

                {phase === 'ai-result' && aiResult && (
                    <AiResultView
                        scenario={scenario}
                        result={aiResult}
                        cat={cat}
                        history={chatHistory}
                        onRestart={handleStart}
                        onExit={() => router.push('/simulations')}
                    />
                )}
            </main>
        </div>
    );
}

function IntroView({ scenario, cat, mode, setMode, onStart }: { scenario: ScenarioData; cat: any; mode: 'classic' | 'ai'; setMode: (m: 'classic' | 'ai') => void; onStart: () => void }) {
    return (
        <div className="cine-fadeInUp" style={{
            maxWidth: 800, margin: '0 auto',
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)', borderRadius: 20,
            padding: 0, overflow: 'hidden',
        }}>
            <div style={{
                padding: '32px 28px',
                background: cat.gradient,
                color: '#fff',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, opacity: 0.9 }}>
                    <span className="material-icons-outlined">storefront</span>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>Müşteri Tanıtımı</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Bu senaryo nasıl bir müşteriyle başlıyor?</h2>
            </div>
            <div style={{ padding: 28 }}>
                <div style={{
                    display: 'flex', gap: 16, marginBottom: 20,
                    padding: '20px',
                    background: 'rgba(245, 158, 11, 0.06)',
                    borderRadius: 12,
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '1.8rem',
                    }}>👤</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                            Senaryo Bilgisi
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                            {scenario.customerContext}
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24,
                }}>
                    <InfoTile icon="quiz" label="Adım" value={`${scenario.stepCount}`} />
                    <InfoTile icon="stars" label="XP" value={`+${scenario.xpReward}`} color="#f59e0b" />
                    <InfoTile icon="psychology" label="4 Beceri" value="Empati / Bilgi / Çapraz / Kapanış" small />
                </div>

                {/* Mode Toggle — Klasik vs AI */}
                <div style={{
                    marginBottom: 18,
                    padding: 4,
                    background: 'rgba(0,0,0,0.04)',
                    borderRadius: 14,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 4,
                }}>
                    <button
                        onClick={() => setMode('classic')}
                        style={{
                            padding: '14px 16px',
                            background: mode === 'classic' ? '#fff' : 'transparent',
                            color: mode === 'classic' ? cat.color : 'var(--text-secondary)',
                            border: 'none', borderRadius: 10,
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                            boxShadow: mode === 'classic' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.92rem' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>list_alt</span>
                            Klasik Mod
                        </div>
                        <div style={{ fontSize: '0.7rem', textAlign: 'left', opacity: 0.85 }}>
                            Çoktan seçmeli sorularla ilerle
                        </div>
                    </button>
                    <button
                        onClick={() => setMode('ai')}
                        style={{
                            padding: '14px 16px',
                            background: mode === 'ai' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                            color: mode === 'ai' ? '#fff' : 'var(--text-secondary)',
                            border: 'none', borderRadius: 10,
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                            boxShadow: mode === 'ai' ? '0 4px 12px rgba(139, 92, 246, 0.35)' : 'none',
                            transition: 'all 0.2s',
                            position: 'relative',
                        }}
                    >
                        <span style={{
                            position: 'absolute', top: 6, right: 6,
                            fontSize: '0.6rem', fontWeight: 800,
                            background: mode === 'ai' ? 'rgba(255,255,255,0.25)' : '#fbbf24',
                            color: mode === 'ai' ? '#fff' : '#78350f',
                            padding: '2px 6px', borderRadius: 4,
                            letterSpacing: 0.5,
                        }}>YENİ</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.92rem' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>smart_toy</span>
                            AI Müşteri (Gemini)
                        </div>
                        <div style={{ fontSize: '0.7rem', textAlign: 'left', opacity: 0.9 }}>
                            Yazarak gerçek müşteriyle konuş
                        </div>
                    </button>
                </div>

                <div style={{
                    padding: 16, borderRadius: 10,
                    background: mode === 'ai' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                    border: `1px solid ${mode === 'ai' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                    marginBottom: 24,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span className="material-icons-outlined" style={{ color: mode === 'ai' ? '#8b5cf6' : '#3b82f6', fontSize: '1.1rem' }}>lightbulb</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: mode === 'ai' ? '#8b5cf6' : '#3b82f6' }}>Nasıl Oynanır?</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {mode === 'ai'
                            ? 'AI müşteri sana doğal şekilde yanıt verir. Mesaj yazarak konuş, ihtiyacını anla, ürün öner, ek satışa yönlendir. Müşteri "Tamam alıyorum" derse satış kapanır, kızarsa ayrılır! Konuşma sonunda Gemini AI tüm performansını 4 beceri üzerinden puanlar.'
                            : 'Her adımda müşteriye verebileceğin 4 farklı cevap görürsün. En uygun cevabı seç. Cevapların 4 ayrı beceride (Empati, Ürün Bilgisi, Çapraz Satış, Kapanış) puanlanır. Sonunda detaylı geri bildirim alacaksın.'}
                    </p>
                </div>

                <button
                    onClick={onStart}
                    style={{
                        width: '100%', padding: '14px 20px',
                        background: mode === 'ai' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : cat.gradient,
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: '1rem', fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: mode === 'ai' ? '0 8px 24px rgba(139, 92, 246, 0.4)' : `0 8px 24px ${cat.color}40`,
                    }}
                >
                    <span className="material-icons-outlined">{mode === 'ai' ? 'smart_toy' : 'play_arrow'}</span>
                    {mode === 'ai' ? 'AI Müşteri ile Başla' : 'Simülasyonu Başlat'}
                </button>
            </div>
        </div>
    );
}

function InfoTile({ icon, label, value, color, small }: { icon: string; label: string; value: string; color?: string; small?: boolean }) {
    return (
        <div style={{
            padding: 14, borderRadius: 12,
            background: 'rgba(0,0,0,0.03)', textAlign: 'center',
        }}>
            <span className="material-icons-outlined" style={{ fontSize: '1.4rem', color: color || 'var(--text-tertiary)' }}>{icon}</span>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: small ? '0.7rem' : '1.1rem', fontWeight: 700, color: color || 'var(--text-primary)', marginTop: 2 }}>{value}</div>
        </div>
    );
}

function PlayView({ step, stepIndex, totalSteps, progress, cat, scenario, submitting, onChoose }: any) {
    return (
        <div className="cine-fadeInUp" style={{
            maxWidth: 820, margin: '0 auto',
        }}>
            {/* Progress */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Adım {stepIndex + 1} / {totalSteps}</span>
                    <span style={{ color: cat.color, fontWeight: 700 }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                        width: `${progress}%`, height: '100%',
                        background: cat.gradient, borderRadius: 4,
                        transition: 'width 0.4s ease',
                    }} />
                </div>
            </div>

            {/* NPC Bubble */}
            <div style={{
                display: 'flex', gap: 14, marginBottom: 24,
                animation: 'cine-fadeInUp 0.5s ease',
            }}>
                <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '1.8rem',
                    boxShadow: '0 6px 16px rgba(245, 158, 11, 0.3)',
                }}>👤</div>
                <div style={{
                    flex: 1, padding: '16px 20px',
                    background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--card-border)', borderRadius: 16,
                    borderTopLeftRadius: 4,
                    position: 'relative',
                }}>
                    <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Müşteri
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                        {step.npc}
                    </p>
                </div>
            </div>

            {/* Choices */}
            <div style={{ marginBottom: 12, fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                Senin Cevabın
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
                {step.choices.map((choice: any, idx: number) => (
                    <button
                        key={idx}
                        disabled={submitting}
                        onClick={() => onChoose(choice.originalIndex ?? idx)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 18px', textAlign: 'left',
                            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                            border: '1px solid var(--card-border)', borderRadius: 12,
                            cursor: submitting ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            color: 'var(--text-primary)', fontSize: '0.92rem',
                            opacity: submitting ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (submitting) return;
                            e.currentTarget.style.borderColor = cat.color;
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = `0 4px 16px ${cat.color}30`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--card-border)';
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: cat.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                            flexShrink: 0,
                        }}>
                            {String.fromCharCode(65 + idx)}
                        </div>
                        <span style={{ flex: 1, lineHeight: 1.5 }}>{choice.text}</span>
                        <span className="material-icons-outlined" style={{ color: cat.color, opacity: 0.5 }}>arrow_forward</span>
                    </button>
                ))}
            </div>

            {submitting && (
                <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-tertiary)' }}>
                    Sonuç hesaplanıyor...
                </div>
            )}
        </div>
    );
}

function ResultView({ scenario, result, cat, onRestart, onExit }: any) {
    const badge = result.badge ? BADGE_META[result.badge] : null;
    const scoreColor = result.score >= 80 ? '#16a34a' : result.score >= 60 ? '#d97706' : '#dc2626';
    const scoreLabel = result.score >= 90 ? 'Mükemmel!' : result.score >= 75 ? 'Çok İyi' : result.score >= 60 ? 'İyi' : result.score >= 40 ? 'Gelişebilir' : 'Tekrar Dene';

    return (
        <div className="cine-fadeInUp" style={{ maxWidth: 880, margin: '0 auto' }}>
            {/* Hero */}
            <div style={{
                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--card-border)', borderRadius: 20,
                padding: 0, overflow: 'hidden', marginBottom: 20,
            }}>
                <div style={{
                    padding: '32px',
                    background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}cc)`,
                    color: '#fff', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.85, marginBottom: 12 }}>
                        Simülasyon Sonucu
                    </div>
                    <div style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, marginBottom: 8 }}>
                        {result.score}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 18 }}>{scoreLabel}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', background: 'rgba(255,255,255,0.2)',
                            borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>stars</span>
                            +{result.xpEarned} XP
                        </div>
                        {badge && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', background: '#fff',
                                color: badge.color, borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{badge.icon}</span>
                                {badge.label} Rozeti!
                            </div>
                        )}
                    </div>
                </div>

                {/* Skill scores */}
                <div style={{ padding: 24 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, fontWeight: 600 }}>
                        Beceri Analizi
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <SkillBar label="Empati" icon="favorite" value={result.scores.empati} color="#ec4899" />
                        <SkillBar label="Ürün Bilgisi" icon="school" value={result.scores.bilgi} color="#3b82f6" />
                        <SkillBar label="Çapraz Satış" icon="sync_alt" value={result.scores.caprazSatis} color="#8b5cf6" />
                        <SkillBar label="Kapanış" icon="flag" value={result.scores.kapanis} color="#22c55e" />
                    </div>
                </div>
            </div>

            {/* Breakdown */}
            <div style={{
                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--card-border)', borderRadius: 16,
                padding: 24, marginBottom: 20,
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons-outlined" style={{ color: cat.color }}>fact_check</span>
                    Adım Adım Değerlendirme
                </h3>
                <div style={{ display: 'grid', gap: 14 }}>
                    {result.breakdown.map((b: ResultBreakdown) => {
                        const isCorrect = b.isBest || b.choiceIndex === b.bestChoiceIndex;
                        return (
                            <div key={b.stepIndex} style={{
                                padding: 16, borderRadius: 12,
                                background: isCorrect ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                                border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <div style={{
                                        width: 26, height: 26, borderRadius: '50%',
                                        background: isCorrect ? '#16a34a' : '#dc2626',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                                    }}>{b.stepIndex + 1}</div>
                                    <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                        "{b.npc}"
                                    </div>
                                    <span className="material-icons-outlined" style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>
                                        {isCorrect ? 'check_circle' : 'cancel'}
                                    </span>
                                </div>

                                <div style={{
                                    padding: 10, borderRadius: 8,
                                    background: 'rgba(0,0,0,0.04)', marginBottom: 8,
                                }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 4 }}>
                                        SENİN CEVABIN
                                    </div>
                                    <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{b.choiceText}</div>
                                </div>

                                {!isCorrect && (
                                    <div style={{
                                        padding: 10, borderRadius: 8,
                                        background: 'rgba(34, 197, 94, 0.1)', marginBottom: 8,
                                    }}>
                                        <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>
                                            DAHA İYİ CEVAP
                                        </div>
                                        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{b.bestChoiceText}</div>
                                    </div>
                                )}

                                {b.feedback && (
                                    <div style={{
                                        display: 'flex', gap: 8, alignItems: 'flex-start',
                                        padding: '8px 12px',
                                        background: 'rgba(59, 130, 246, 0.08)',
                                        borderRadius: 8,
                                        fontSize: '0.82rem', color: 'var(--text-secondary)',
                                    }}>
                                        <span className="material-icons-outlined" style={{ color: '#3b82f6', fontSize: '1rem', marginTop: 1 }}>tips_and_updates</span>
                                        <span style={{ flex: 1 }}>{b.feedback}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
                <button
                    onClick={onExit}
                    style={{
                        flex: 1, padding: '12px 20px',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--card-border)', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                >
                    <span className="material-icons-outlined">list</span>
                    Senaryolara Dön
                </button>
                <button
                    onClick={onRestart}
                    style={{
                        flex: 1, padding: '12px 20px',
                        background: cat.gradient,
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: `0 4px 16px ${cat.color}40`,
                    }}
                >
                    <span className="material-icons-outlined">replay</span>
                    Tekrar Dene
                </button>
            </div>
        </div>
    );
}

function SkillBar({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="material-icons-outlined" style={{ color, fontSize: '1.1rem' }}>{icon}</span>
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{value}%</span>
            </div>
            <div style={{ width: '100%', height: 10, background: 'rgba(0,0,0,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                    width: `${value}%`, height: '100%',
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    borderRadius: 5,
                    transition: 'width 0.8s ease',
                }} />
            </div>
        </div>
    );
}

// =====================================================================
// AI CHAT VIEW — Gemini destekli müşteri roleplay
// =====================================================================
const MOOD_META: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
    NÖTR:              { emoji: '😐', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', label: 'Nötr' },
    İLGİLİ:            { emoji: '🤔', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'İlgili' },
    SİNİRLİ:           { emoji: '😠', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', label: 'Sinirli' },
    KARARSIZ:          { emoji: '🤷', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', label: 'Kararsız' },
    MUTLU:             { emoji: '😊', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)', label: 'Mutlu' },
    HAYAL_KIRIKLIĞI:   { emoji: '😞', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)', label: 'Hayal Kırıklığı' },
};

function AiChatView({ scenario, cat, history, input, setInput, onSend, chatLoading, mood, ended, endReason, onEvaluate, submitting, chatEndRef }: any) {
    const moodInfo = MOOD_META[mood] || MOOD_META.NÖTR;
    const consultantTurns = history.filter((m: any) => m.role === 'user').length;

    return (
        <div className="cine-fadeInUp" style={{ maxWidth: 820, margin: '0 auto' }}>
            {/* Customer mood header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
                padding: '14px 18px',
                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--card-border)', borderRadius: 16,
            }}>
                <div style={{
                    width: 54, height: 54, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '1.8rem',
                    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                }}>👤</div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: '0.95rem' }}>AI Müşteri</strong>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 10,
                            background: moodInfo.bg, color: moodInfo.color,
                            fontSize: '0.72rem', fontWeight: 700,
                        }}>
                            {moodInfo.emoji} {moodInfo.label}
                        </span>
                        <span style={{
                            padding: '3px 8px', borderRadius: 10,
                            background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed',
                            fontSize: '0.7rem', fontWeight: 700,
                        }}>
                            🤖 Gemini AI
                        </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {scenario.customerContext.length > 100 ? scenario.customerContext.substring(0, 100) + '...' : scenario.customerContext}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1 }}>Tur</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: cat.color }}>{consultantTurns}</div>
                </div>
            </div>

            {/* Chat messages */}
            <div style={{
                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--card-border)', borderRadius: 16,
                padding: 18,
                maxHeight: 500,
                overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 14,
                marginBottom: 14,
            }}>
                {history.map((msg: any, idx: number) => (
                    <div key={idx} style={{
                        display: 'flex',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                        gap: 10,
                        alignItems: 'flex-end',
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: msg.role === 'user' ? cat.gradient : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '1.2rem', flexShrink: 0,
                        }}>{msg.role === 'user' ? '👔' : '👤'}</div>
                        <div style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            background: msg.role === 'user' ? cat.gradient : 'rgba(0,0,0,0.04)',
                            color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                            borderRadius: 14,
                            borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                            borderBottomLeftRadius: msg.role === 'user' ? 14 : 4,
                            fontSize: '0.92rem', lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {chatLoading && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '1.2rem',
                        }}>👤</div>
                        <div style={{
                            padding: '14px 18px',
                            background: 'rgba(0,0,0,0.04)',
                            borderRadius: 14,
                            display: 'flex', gap: 6, alignItems: 'center',
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1.4s infinite ease-in-out' }} />
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'cine-pulse 1.4s infinite ease-in-out 0.2s' }} />
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'cine-pulse 1.4s infinite ease-in-out 0.4s' }} />
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* End banner */}
            {ended && (
                <div style={{
                    padding: '14px 18px',
                    background: endReason === 'SALE_CLOSED' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', borderRadius: 12, marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <span className="material-icons-outlined" style={{ fontSize: '1.5rem' }}>
                        {endReason === 'SALE_CLOSED' ? 'check_circle' : 'cancel'}
                    </span>
                    <div style={{ flex: 1 }}>
                        <strong>{endReason === 'SALE_CLOSED' ? 'Satış kapandı!' : 'Müşteri ayrıldı'}</strong>
                        <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                            {endReason === 'SALE_CLOSED' ? 'Tebrikler — müşteriyi ikna ettin!' : 'Konuşmayı sonlandırmak için "Değerlendir" butonuna bas.'}
                        </div>
                    </div>
                </div>
            )}

            {/* Input area */}
            {!ended ? (
                <div style={{
                    display: 'flex', gap: 10,
                    padding: 12,
                    background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--card-border)', borderRadius: 14,
                }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                        placeholder="Müşteriye cevabını yaz... (Enter ile gönder)"
                        rows={2}
                        disabled={chatLoading}
                        style={{
                            flex: 1, padding: '10px 12px',
                            border: '1px solid var(--card-border)',
                            borderRadius: 10,
                            background: 'var(--background)', color: 'var(--text-primary)',
                            fontSize: '0.92rem', resize: 'none', fontFamily: 'inherit',
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={onSend}
                        disabled={chatLoading || !input.trim()}
                        style={{
                            padding: '0 18px',
                            background: cat.gradient,
                            color: '#fff', border: 'none', borderRadius: 10,
                            fontSize: '0.95rem', fontWeight: 700,
                            cursor: chatLoading || !input.trim() ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            opacity: chatLoading || !input.trim() ? 0.5 : 1,
                        }}
                    >
                        <span className="material-icons-outlined">send</span>
                        Gönder
                    </button>
                </div>
            ) : null}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                    onClick={onEvaluate}
                    disabled={consultantTurns < 1 || submitting}
                    style={{
                        flex: 1, padding: '12px 18px',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 700,
                        cursor: consultantTurns < 1 || submitting ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: consultantTurns < 1 || submitting ? 0.5 : 1,
                        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                    }}
                >
                    <span className="material-icons-outlined">grading</span>
                    {submitting ? 'AI puanlıyor...' : 'Konuşmayı Bitir ve Değerlendir'}
                </button>
            </div>

            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                💡 İpucu: Müşteriyi gerçek müşteri gibi düşün. Empati kur, ürün bilgini göster, çapraz satış öner, kapanışa yönlendir.
            </div>
        </div>
    );
}

function AiResultView({ scenario, result, cat, history, onRestart, onExit }: any) {
    const badge = result.badge ? BADGE_META[result.badge] : null;
    const scoreColor = result.score >= 80 ? '#16a34a' : result.score >= 60 ? '#d97706' : '#dc2626';
    const scoreLabel = result.score >= 90 ? 'Mükemmel!' : result.score >= 75 ? 'Çok İyi' : result.score >= 60 ? 'İyi' : result.score >= 40 ? 'Gelişebilir' : 'Tekrar Dene';

    return (
        <div className="cine-fadeInUp" style={{ maxWidth: 880, margin: '0 auto' }}>
            {/* AI Badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999,
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#fff', fontSize: '0.72rem', fontWeight: 800,
                marginBottom: 14,
                boxShadow: '0 3px 10px rgba(139, 92, 246, 0.35)',
            }}>
                <span className="material-icons-outlined" style={{ fontSize: '0.95rem' }}>smart_toy</span>
                Gemini AI Değerlendirmesi
            </div>

            {/* Hero */}
            <div style={{
                background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                border: '1px solid var(--card-border)', borderRadius: 20,
                padding: 0, overflow: 'hidden', marginBottom: 20,
            }}>
                <div style={{
                    padding: 32,
                    background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}cc)`,
                    color: '#fff', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.85, marginBottom: 12 }}>
                        AI Müşteri Roleplay Sonucu
                    </div>
                    <div style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, marginBottom: 8 }}>{result.score}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 18 }}>{scoreLabel}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', background: 'rgba(255,255,255,0.2)',
                            borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>stars</span>
                            +{result.xpEarned} XP
                        </div>
                        {badge && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', background: '#fff',
                                color: badge.color, borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{badge.icon}</span>
                                {badge.label} Rozeti!
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ padding: 24 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, fontWeight: 600 }}>
                        Beceri Analizi
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <SkillBar label="Empati" icon="favorite" value={result.scores.empati} color="#ec4899" />
                        <SkillBar label="Ürün Bilgisi" icon="school" value={result.scores.bilgi} color="#3b82f6" />
                        <SkillBar label="Çapraz Satış" icon="sync_alt" value={result.scores.caprazSatis} color="#8b5cf6" />
                        <SkillBar label="Kapanış" icon="flag" value={result.scores.kapanis} color="#22c55e" />
                    </div>
                </div>
            </div>

            {/* AI Summary */}
            {result.summary && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.04))',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: 16,
                    padding: 20, marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span className="material-icons-outlined" style={{ color: '#8b5cf6' }}>auto_awesome</span>
                        <strong style={{ color: '#8b5cf6' }}>AI Koç Özeti</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{result.summary}</p>
                </div>
            )}

            {/* Strengths & Improvements */}
            {((result.strengths?.length || 0) > 0 || (result.improvements?.length || 0) > 0) && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 14, marginBottom: 16,
                }}>
                    {result.strengths?.length > 0 && (
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.06)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                            borderRadius: 14, padding: 18,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span className="material-icons-outlined" style={{ color: '#16a34a' }}>thumb_up</span>
                                <strong style={{ color: '#16a34a' }}>Güçlü Yönler</strong>
                            </div>
                            <ul style={{ margin: 0, padding: '0 0 0 18px', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                {result.strengths.map((s: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                    {result.improvements?.length > 0 && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.06)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: 14, padding: 18,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span className="material-icons-outlined" style={{ color: '#d97706' }}>tips_and_updates</span>
                                <strong style={{ color: '#d97706' }}>Gelişim Önerileri</strong>
                            </div>
                            <ul style={{ margin: 0, padding: '0 0 0 18px', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                {result.improvements.map((s: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Best/Worst Moments */}
            {(result.bestMoment || result.worstMoment) && (
                <div style={{
                    background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--card-border)', borderRadius: 14,
                    padding: 18, marginBottom: 16,
                }}>
                    {result.bestMoment && (
                        <div style={{ marginBottom: result.worstMoment ? 14 : 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                                ⭐ En İyi Anın
                            </div>
                            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{result.bestMoment}</p>
                        </div>
                    )}
                    {result.worstMoment && (
                        <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                                💡 Geliştirilecek An
                            </div>
                            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{result.worstMoment}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
                <button
                    onClick={onExit}
                    style={{
                        flex: 1, padding: '12px 20px',
                        background: 'transparent', border: '1px solid var(--card-border)',
                        color: 'var(--text-primary)', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                >
                    <span className="material-icons-outlined">arrow_back</span>
                    Senaryolara Dön
                </button>
                <button
                    onClick={onRestart}
                    style={{
                        flex: 1, padding: '12px 20px',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
                    }}
                >
                    <span className="material-icons-outlined">replay</span>
                    Tekrar Dene
                </button>
            </div>
        </div>
    );
}
