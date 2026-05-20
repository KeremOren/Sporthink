'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="not-found-page">
            <div className="not-found-container">
                <div className="not-found-code">404</div>
                <div className="not-found-icon">
                    <span className="material-icons-outlined">explore_off</span>
                </div>
                <h1>Sayfa Bulunamadı</h1>
                <p>Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
                <div className="not-found-actions">
                    <Link href="/dashboard" className="btn btn-primary">
                        <span className="material-icons-outlined">home</span> Dashboard'a Git
                    </Link>
                    <Link href="/" className="btn btn-ghost">
                        <span className="material-icons-outlined">arrow_back</span> Ana Sayfa
                    </Link>
                </div>
            </div>
        </div>
    );
}
