'use client';

import { useState, useEffect } from 'react';

export function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const saved = localStorage.getItem('sporthink-theme') as 'dark' | 'light' | null;
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        }
    }, []);

    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('sporthink-theme', next);
    };

    return (
        <button
            onClick={toggle}
            title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
            aria-label={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
            style={{
                background: 'none',
                border: 'none',
                color: theme === 'dark' ? '#fbbf24' : '#6366f1',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                borderRadius: 8,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'rotate(20deg)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'rotate(0deg)';
            }}
        >
            <span className="material-icons-outlined" style={{ fontSize: '1.35rem' }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
}
