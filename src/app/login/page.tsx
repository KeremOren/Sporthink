'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError('Geçersiz e-posta veya şifre');
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="login-page">
            {/* Sağ üstte tema değiştirici */}
            <div style={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 10,
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--card-border)',
                borderRadius: 999,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}>
                <ThemeToggle />
            </div>
            <div className="login-card">
                <div className="login-logo">
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', lineHeight: 1 }}>
                        sp<span style={{ color: '#E53935' }}>o</span>rthink
                    </div>
                    <p style={{ marginTop: 8 }}>Personel Eğitim, Gelişim & Performans Platformu</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>error</span>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">E-posta Adresi</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="ornek@sporthink.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Şifre</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Giriş yapılıyor...</>
                        ) : (
                            <><span className="material-icons-outlined">login</span> Giriş Yap</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
