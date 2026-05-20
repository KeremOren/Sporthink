'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ROLE_LABELS } from '@/lib/rbac';
import { formatDateTime } from '@/lib/utils';

const CATEGORIES = [
    { key: 'TIPS', label: 'İpuçları', icon: 'lightbulb', color: '#f59e0b' },
    { key: 'QUESTION', label: 'Soru-Cevap', icon: 'help', color: '#6366f1' },
    { key: 'ANNOUNCEMENT', label: 'Duyuru', icon: 'campaign', color: '#06b6d4' },
    { key: 'SUCCESS_STORY', label: 'Başarı Hikayesi', icon: 'emoji_events', color: '#22c55e' },
];

export default function CommunityPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filterCat, setFilterCat] = useState('');
    const [form, setForm] = useState({ title: '', content: '', category: 'TIPS' });
    const [commentText, setCommentText] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { document.title = 'Sporthink | Topluluk'; }, []);

    const fetchPosts = () => {
        const params = filterCat ? `?category=${filterCat}` : '';
        fetch(`/api/community${params}`)
            .then(r => r.json())
            .then(setPosts)
            .catch(() => showToast('Gönderiler yüklenirken hata', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (session) fetchPosts(); }, [session, filterCat]);

    const handleCreate = async () => {
        if (!form.title.trim() || !form.content.trim()) { showToast('Başlık ve içerik gerekli', 'error'); return; }
        setSubmitting(true);
        try {
            const res = await fetch('/api/community', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create_post', ...form }),
            });
            if (!res.ok) throw new Error();
            showToast('Gönderi paylaşıldı', 'success');
            setShowCreate(false);
            setForm({ title: '', content: '', category: 'TIPS' });
            fetchPosts();
        } catch { showToast('Hata oluştu', 'error'); }
        finally { setSubmitting(false); }
    };

    const handleComment = async (postId: string) => {
        const text = commentText[postId]?.trim();
        if (!text) return;
        try {
            const res = await fetch('/api/community', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_comment', postId, content: text }),
            });
            if (!res.ok) throw new Error();
            setCommentText({ ...commentText, [postId]: '' });
            fetchPosts();
        } catch { showToast('Yorum eklenirken hata', 'error'); }
    };

    if (!session) return null;
    const user = session.user as any;

    const getCat = (key: string) => CATEGORIES.find(c => c.key === key) || CATEGORIES[0];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Topluluk</h1>
                        <div className="page-header-sub">Bilgi paylaşımı, ipuçları ve tartışmalar</div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <span className="material-icons-outlined">edit</span> Gönderi Paylaş
                    </button>
                </div>

                <div className="page-body">
                    {/* Category Filter */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                        <button className={`btn ${!filterCat ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterCat('')} style={{ fontSize: '0.8rem' }}>
                            Tümü
                        </button>
                        {CATEGORIES.map(cat => (
                            <button key={cat.key} className={`btn ${filterCat === cat.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterCat(cat.key)} style={{ fontSize: '0.8rem' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '0.9rem', color: filterCat === cat.key ? '#fff' : cat.color }}>{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {loading ? <SkeletonCard count={3} /> : posts.length === 0 ? (
                        <div className="empty-state">
                            <span className="material-icons-outlined">forum</span>
                            <p>Henüz gönderi yok</p>
                            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>İlk Gönderiyi Paylaş</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                            {posts.map(post => {
                                const cat = getCat(post.category);
                                return (
                                    <div key={post.id} className="card" style={{ borderLeft: `4px solid ${cat.color}` }}>
                                        {/* Post Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <div className="sidebar-avatar" style={{ width: 40, height: 40, fontSize: '0.8rem', flexShrink: 0 }}>
                                                {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                    {post.author?.firstName} {post.author?.lastName}
                                                    <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: '0.6rem' }}>
                                                        {ROLE_LABELS[post.author?.role as keyof typeof ROLE_LABELS] || post.author?.role}
                                                    </span>
                                                    {post.author?.store?.name && (
                                                        <span className="text-xs text-secondary" style={{ marginLeft: 4 }}>• {post.author.store.name}</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-secondary">
                                                    {formatDateTime(post.createdAt)}
                                                    {post.isPinned && <span style={{ marginLeft: 8, color: '#f59e0b' }}>📌 Sabitlenmiş</span>}
                                                </div>
                                            </div>
                                            <span className="badge" style={{ background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30` }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '0.8rem', marginRight: 4 }}>{cat.icon}</span>
                                                {cat.label}
                                            </span>
                                        </div>

                                        {/* Post Content */}
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{post.title}</h4>
                                        <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{post.content}</div>

                                        {/* Comments */}
                                        {post.comments?.length > 0 && (
                                            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-tertiary)' }}>
                                                    {post.comments.length} yorum
                                                </div>
                                                {post.comments.map((c: any) => (
                                                    <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10, paddingLeft: 8 }}>
                                                        <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: '0.6rem', flexShrink: 0 }}>
                                                            {c.author?.firstName?.[0]}{c.author?.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.78rem' }}>
                                                                <span style={{ fontWeight: 600 }}>{c.author?.firstName} {c.author?.lastName}</span>
                                                                <span className="text-xs text-secondary" style={{ marginLeft: 8 }}>{formatDateTime(c.createdAt)}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>{c.content}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add Comment */}
                                        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                            <input
                                                className="form-input" style={{ flex: 1, fontSize: '0.82rem' }}
                                                placeholder="Yorum yaz..."
                                                value={commentText[post.id] || ''}
                                                onChange={e => setCommentText({ ...commentText, [post.id]: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                                            />
                                            <button className="btn btn-primary" style={{ padding: '0 12px' }} onClick={() => handleComment(post.id)} disabled={!commentText[post.id]?.trim()}>
                                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>send</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Create Post Modal */}
                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                            <div className="modal-header">
                                <h3>Gönderi Paylaş</h3>
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Kategori</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {CATEGORIES.map(cat => (
                                            <button key={cat.key} className={`btn ${form.category === cat.key ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => setForm({ ...form, category: cat.key })} style={{ fontSize: '0.8rem' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>{cat.icon}</span> {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Başlık *</label>
                                    <input className="form-input" placeholder="Gönderi başlığı" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">İçerik *</label>
                                    <textarea className="form-input" rows={5} placeholder="Paylaşmak istediğiniz bilgi, soru veya hikaye..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>İptal</button>
                                <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                                    {submitting ? 'Paylaşılıyor...' : 'Paylaş'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
