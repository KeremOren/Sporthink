'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { ROLE_LABELS } from '@/lib/rbac';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    timestamp: string;
    model?: string;
}

// Role-specific AI persona configuration
const AI_PERSONAS: Record<string, { name: string; icon: string; color: string; subtitle: string; welcome: string; suggestions: string[] }> = {
    SUPER_ADMIN: {
        name: 'Yönetim Asistanı',
        icon: 'admin_panel_settings',
        color: '#E53935',
        subtitle: 'Sistem yönetimi, raporlama ve stratejik kararlar',
        welcome: '🏢 Merhaba Admin! Ben **Sporthink Yönetim Asistanınızım** — Google Gemini AI ile güçlendirilmiş.\n\nSize şu konularda yardımcı olabilirim:\n\n• 📊 Tüm mağazaların eğitim performans analizi\n• 📈 KPI ve hedef takibi\n• 🎯 Eğitim içerik stratejisi önerileri\n• 📋 Sistem raporları ve istatistikler\n• 🧠 Stratejik karar desteği',
        suggestions: [
            'Hangi mağazanın eğitim tamamlama oranı en düşük?',
            'Genel KPI performansı nasıl?',
            'Eğitim stratejisi önerileri ver',
            'Düşük performanslı mağazalar için aksiyon planı oluştur',
        ],
    },
    REGIONAL_MANAGER: {
        name: 'Bölge Danışmanı',
        icon: 'map',
        color: '#8b5cf6',
        subtitle: 'Bölge performansı ve mağaza karşılaştırmaları',
        welcome: '📊 Merhaba Bölge Müdürü! Ben **Bölge Performans Danışmanınızım** — Gemini AI destekli.\n\nBölgenizdeki mağazalar hakkında:\n\n• 🏪 Mağazalar arası karşılaştırma\n• 👥 Personel gelişim önerileri\n• 📋 Eğitim atama stratejileri\n• 📈 KPI hedeflerine ulaşım analizi',
        suggestions: [
            'Bölgemdeki mağazaları karşılaştır',
            'Personel gelişim önerisi ver',
            'Eğitim tamamlama oranlarını analiz et',
            'Düşük performanslı çalışanlar için plan oluştur',
        ],
    },
    STORE_MANAGER: {
        name: 'Mağaza Koçu',
        icon: 'store',
        color: '#0ea5e9',
        subtitle: 'Ekip yönetimi, eğitim takibi ve mağaza performansı',
        welcome: '🏪 Merhaba Mağaza Müdürü! Ben **Mağaza Koçunuzum** — Gemini AI ile güçlendirilmiş.\n\nSize şu konularda yardımcı olabilirim:\n\n• 👥 Ekibinizin eğitim durumu\n• 💡 Satış danışmanı koçluk önerileri\n• 📋 Mağaza operasyon standartları\n• 🎯 Geri bildirim ve motivasyon teknikleri',
        suggestions: [
            'Ekibimin eğitim durumunu özetle',
            'Yeni başlayan personele ne önerirsin?',
            'Müşteri karşılama tekniklerini anlat',
            'Motivasyon ve koçluk teknikleri öner',
        ],
    },
    ASSISTANT_MANAGER: {
        name: 'Operasyon Asistanı',
        icon: 'support_agent',
        color: '#22c55e',
        subtitle: 'Günlük operasyonlar ve eğitim desteği',
        welcome: '🤝 Merhaba! Ben **Operasyon Asistanınızım** — Gemini AI destekli.\n\n• 🏪 Mağaza standartları ve prosedürler\n• 📚 Eğitim içerikleri hakkında sorular\n• ⚙️ Operasyonel süreç rehberliği',
        suggestions: [
            'Mağaza açılış prosedürü nedir?',
            'Kasa işlemleri hakkında bilgi ver',
            'Stok yönetimi nasıl yapılır?',
            'Müşteri şikayeti nasıl yönetilir?',
        ],
    },
    EMPLOYEE: {
        name: 'Öğrenme Arkadaşın',
        icon: 'school',
        color: '#f59e0b',
        subtitle: 'Kişisel gelişim, eğitim desteği ve kariyer rehberliği',
        welcome: '👋 Merhaba! Ben senin **Öğrenme Arkadaşınım** — Gemini AI ile güçlendirilmiş!\n\nSana şu konularda yardımcı olabilirim:\n\n• 📚 Eğitim içeriklerini özetleme\n• 📝 Sınava hazırlık soruları\n• 🎯 Kariyer gelişim önerileri\n• 🏷️ Mağaza standartları bilgisi\n• 💪 Motivasyon ve öğrenme ipuçları',
        suggestions: [
            'Sınava nasıl hazırlanmalıyım?',
            'Alarm ve etiket kurallarını özetle',
            'Müşteri karşılama 6 adımı nedir?',
            'Kariyer gelişimim için ne yapmalıyım?',
        ],
    },
};

// Simple markdown renderer
function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, i) => {
        let processed: React.ReactNode = line;
        
        // Bold
        if (line.includes('**')) {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            processed = parts.map((part, j) => 
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            );
        }
        
        // Headers
        if (line.startsWith('### ')) {
            elements.push(<div key={i} style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 8, marginBottom: 4 }}>{typeof processed === 'string' ? processed.slice(4) : processed}</div>);
            return;
        }
        if (line.startsWith('## ')) {
            elements.push(<div key={i} style={{ fontWeight: 700, fontSize: '1rem', marginTop: 10, marginBottom: 4 }}>{typeof processed === 'string' ? processed.slice(3) : processed}</div>);
            return;
        }
        
        // Bullet points
        if (line.match(/^[•\-\*]\s/)) {
            elements.push(
                <div key={i} style={{ display: 'flex', gap: 6, paddingLeft: 4, marginBottom: 2 }}>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span>{typeof processed === 'string' ? processed.replace(/^[•\-\*]\s/, '') : processed}</span>
                </div>
            );
            return;
        }
        
        // Numbered lists
        if (line.match(/^\d+[\.\)]\s/)) {
            const num = line.match(/^(\d+)/)?.[1];
            elements.push(
                <div key={i} style={{ display: 'flex', gap: 6, paddingLeft: 4, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, minWidth: 18 }}>{num}.</span>
                    <span>{typeof processed === 'string' ? processed.replace(/^\d+[\.\)]\s/, '') : processed}</span>
                </div>
            );
            return;
        }
        
        // Empty line
        if (line.trim() === '') {
            elements.push(<div key={i} style={{ height: 8 }} />);
            return;
        }
        
        elements.push(<div key={i}>{processed}</div>);
    });
    
    return <>{elements}</>;
}

export default function AiAssistantPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState('');
    const [trainings, setTrainings] = useState<any[]>([]);
    const [displayText, setDisplayText] = useState<string>('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const user = session?.user as any;
    const role = user?.role || 'EMPLOYEE';
    const persona = AI_PERSONAS[role] || AI_PERSONAS.EMPLOYEE;
    const storageKey = `sporthink-ai-chat-${user?.id || 'anon'}`;

    useEffect(() => { document.title = 'Sporthink | AI Asistan'; }, []);

    // Load chat history from localStorage
    useEffect(() => {
        if (session) {
            fetch('/api/trainings').then(r => r.json()).then(data => {
                setTrainings(data.trainings || []);
            });

            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.length > 0) {
                        setMessages(parsed);
                        return;
                    }
                } catch { /* ignore */ }
            }

            // Welcome message
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: persona.welcome,
                timestamp: new Date().toISOString(),
            }]);
        }
    }, [session]);

    // Save to localStorage when messages change
    useEffect(() => {
        if (messages.length > 0 && user?.id) {
            localStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, displayText]);

    // Typing animation
    const animateTyping = useCallback((fullText: string, msgId: string) => {
        setIsTyping(true);
        let index = 0;
        const speed = 8; // ms per character
        
        const timer = setInterval(() => {
            index += 3; // 3 chars at a time for speed
            if (index >= fullText.length) {
                index = fullText.length;
                clearInterval(timer);
                setIsTyping(false);
                setDisplayText('');
                // Update the actual message
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullText } : m));
            } else {
                setDisplayText(fullText.substring(0, index));
            }
        }, speed);

        return () => clearInterval(timer);
    }, []);

    const handleSend = async (text?: string) => {
        const question = text || input.trim();
        if (!question || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: question,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Build history for context (last 10 messages)
            const recentHistory = messages
                .filter(m => m.id !== 'welcome')
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question, 
                    trainingId: selectedTraining || undefined,
                    history: recentHistory,
                }),
            });

            const data = await res.json();
            const fullAnswer = data.answer || 'Yanıt alınamadı.';

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '', // Will be filled by animation
                sources: data.sources,
                timestamp: data.timestamp || new Date().toISOString(),
                model: data.model,
            };

            setMessages(prev => [...prev, aiMsg]);
            
            // Start typing animation
            animateTyping(fullAnswer, aiMsg.id);
        } catch {
            showToast('AI yanıt veremedi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content);
        showToast('Mesaj kopyalandı', 'success');
    };

    const clearChat = () => {
        const welcomeMsg: Message = {
            id: 'welcome',
            role: 'assistant',
            content: persona.welcome,
            timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
        localStorage.removeItem(storageKey);
        showToast('Sohbet temizlendi', 'success');
    };

    if (!session) return null;

    const showSuggestions = messages.length <= 1 && !loading;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="material-icons-outlined" style={{ color: persona.color, fontSize: '1.5rem' }}>{persona.icon}</span>
                            {persona.name}
                            <span style={{ 
                                fontSize: '0.55rem', 
                                background: 'linear-gradient(135deg, #4285F4, #EA4335, #FBBC04, #34A853)', 
                                WebkitBackgroundClip: 'text', 
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 700,
                                letterSpacing: 0.5,
                                padding: '2px 8px',
                                border: '1px solid rgba(66,133,244,0.3)',
                                borderRadius: 20,
                            }}>
                                Gemini AI
                            </span>
                        </h1>
                        <div className="page-header-sub">{persona.subtitle}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div className="badge" style={{ background: `${persona.color}15`, color: persona.color, padding: '6px 14px', fontSize: '0.8rem' }}>
                            {ROLE_LABELS[role as keyof typeof ROLE_LABELS]} Modu
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={clearChat} title="Yeni Sohbet">
                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>refresh</span>
                        </button>
                    </div>
                </div>

                <div className="page-body" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
                    {/* Training Selector */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexShrink: 0, flexWrap: 'wrap' }}>
                        <div className="card" style={{ padding: 'var(--space-sm) var(--space-md)', flex: 1, minWidth: 300 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span className="material-icons-outlined" style={{ color: persona.color, fontSize: '1.2rem' }}>school</span>
                                <select className="form-select" value={selectedTraining} onChange={e => setSelectedTraining(e.target.value)}
                                    style={{ flex: 1 }}>
                                    <option value="">Genel bilgi tabanı (tüm konular)</option>
                                    {trainings.map(t => (
                                        <option key={t.id} value={t.id}>📚 {t.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Suggestion Chips */}
                    {showSuggestions && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-md)', flexWrap: 'wrap', flexShrink: 0 }}>
                            {persona.suggestions.map((s, i) => (
                                <button key={i} className="btn btn-ghost" onClick={() => handleSend(s)}
                                    style={{
                                        fontSize: '0.78rem', padding: '8px 16px',
                                        border: `1px solid ${persona.color}30`,
                                        borderRadius: 'var(--radius-full)',
                                        color: persona.color,
                                        background: `${persona.color}08`,
                                        transition: 'all 0.2s ease',
                                    }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>lightbulb</span>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="card" style={{ flex: 1, overflow: 'auto', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {messages.map((msg, idx) => {
                            const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1 && isTyping;
                            const displayContent = isLastAssistant ? displayText : msg.content;
                            
                            if (!displayContent && msg.role === 'assistant' && msg.id !== 'welcome') return null;
                            
                            return (
                                <div key={msg.id} style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    animation: 'fadeInUp 0.3s ease',
                                }}>
                                    <div style={{
                                        maxWidth: '78%',
                                        padding: 'var(--space-md)',
                                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        background: msg.role === 'user'
                                            ? `linear-gradient(135deg, ${persona.color}, ${persona.color}cc)`
                                            : 'var(--bg-tertiary)',
                                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                        fontSize: '0.88rem',
                                        lineHeight: 1.7,
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                        position: 'relative',
                                    }}>
                                        {msg.role === 'assistant' && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: persona.color, fontWeight: 600 }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>{persona.icon}</span>
                                                    {persona.name}
                                                    {msg.model && (
                                                        <span style={{ 
                                                            fontSize: '0.6rem', 
                                                            opacity: 0.6,
                                                            background: 'rgba(66,133,244,0.1)',
                                                            padding: '1px 6px',
                                                            borderRadius: 8,
                                                        }}>
                                                            ✨ Gemini
                                                        </span>
                                                    )}
                                                </div>
                                                {displayContent && msg.id !== 'welcome' && !isLastAssistant && (
                                                    <button 
                                                        onClick={() => copyMessage(displayContent)}
                                                        style={{ 
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            color: 'var(--text-tertiary)', padding: 2,
                                                            opacity: 0.5, transition: 'opacity 0.2s',
                                                        }}
                                                        onMouseEnter={e => (e.target as HTMLElement).style.opacity = '1'}
                                                        onMouseLeave={e => (e.target as HTMLElement).style.opacity = '0.5'}
                                                        title="Kopyala"
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>content_copy</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        
                                        {msg.role === 'assistant' ? renderMarkdown(displayContent) : displayContent}
                                        
                                        {isLastAssistant && (
                                            <span style={{ 
                                                display: 'inline-block', 
                                                width: 2, height: 14, 
                                                background: persona.color, 
                                                marginLeft: 2,
                                                animation: 'blink 0.7s infinite',
                                                verticalAlign: 'middle',
                                            }} />
                                        )}

                                        {msg.sources && msg.sources.length > 0 && !isLastAssistant && (
                                            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '0.75rem' }}>source</span>
                                                {msg.sources.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {loading && !isTyping && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: persona.color, fontSize: '0.85rem', padding: '8px 0' }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <span className="ai-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: persona.color, animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                                    <span className="ai-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: persona.color, animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                                    <span className="ai-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: persona.color, animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                                </div>
                                {persona.name} düşünüyor...
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexShrink: 0 }}>
                        <input
                            ref={inputRef}
                            className="form-input"
                            style={{ flex: 1, fontSize: '0.9rem' }}
                            placeholder={role === 'EMPLOYEE' ? 'Eğitimle ilgili bir soru sor...' : role === 'STORE_MANAGER' ? 'Mağaza operasyonları hakkında sorun...' : 'Bir soru sorun...'}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            disabled={loading || isTyping}
                        />
                        <button className="btn btn-primary" onClick={() => handleSend()} disabled={!input.trim() || loading || isTyping}
                            style={{ padding: '0 20px', background: persona.color, borderColor: persona.color }}>
                            <span className="material-icons-outlined">send</span>
                        </button>
                    </div>
                </div>

                {/* Animations */}
                <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(8px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes blink {
                        0%, 50% { opacity: 1; }
                        51%, 100% { opacity: 0; }
                    }
                    @keyframes bounce {
                        0%, 80%, 100% { transform: scale(0); }
                        40% { transform: scale(1); }
                    }
                `}</style>
            </main>
        </div>
    );
}
