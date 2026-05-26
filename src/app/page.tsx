'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const num = parseInt(target.replace(/\D/g, '')) || 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = Math.ceil(num / 40);
          const timer = setInterval(() => {
            start += step;
            if (start >= num) { setCount(num); clearInterval(timer); }
            else setCount(start);
          }, 30);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [num]);

  const prefix = target.startsWith('%') ? '%' : '';
  const suf = target.endsWith('+') ? '+' : suffix;
  return <div ref={ref} className="landing-stat-value">{prefix}{count}{suf}</div>;
}

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/dashboard');
  }, [session, router]);

  const features = [
    { icon: 'school', title: 'Eğitim Yönetimi', desc: 'İçerik oluşturun, çalışanlara atayın ve ilerlemeyi takip edin' },
    { icon: 'quiz', title: 'Sınav & Değerlendirme', desc: 'Eğitim sonrası sınavlarla yeterlilik ölçümü yapın' },
    { icon: 'trending_up', title: 'KPI Takibi', desc: 'Mağaza ve çalışan performansını gerçek zamanlı izleyin' },
    { icon: 'feedback', title: 'Geri Bildirim', desc: 'Operasyonel sorunları raporlayın ve çözüm süreçlerini yönetin' },
    { icon: 'insights', title: 'BI Analitik', desc: 'Trend, tahmin ve çapraz analiz ile stratejik kararlar alın' },
    { icon: 'admin_panel_settings', title: 'Yönetim', desc: 'Kullanıcıları, mağazaları ve bölgeleri merkezi yönetin' },
  ];

  const stats = [
    { value: '500+', label: 'Çalışan', icon: 'people' },
    { value: '50+', label: 'Mağaza', icon: 'store' },
    { value: '%95', label: 'Memnuniyet', icon: 'thumb_up' },
    { value: '200+', label: 'Eğitim', icon: 'school' },
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon"><span style={{ color: '#fff' }}>sp</span><span style={{ color: '#E53935' }}>o</span></div>
            <span style={{ letterSpacing: '-0.5px' }}>sp<span style={{ color: '#E53935' }}>o</span>rthink</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ThemeToggle />
            <button
              onClick={() => router.push('/login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #E53935 0%, #c62828 50%, #b71c1c 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(229, 57, 53, 0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(229, 57, 53, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(229, 57, 53, 0.45), inset 0 1px 0 rgba(255,255,255,0.15)';
              }}
            >
              <span className="material-icons-outlined" style={{ fontSize: '1.15rem' }}>login</span>
              Giriş Yap
              <span className="material-icons-outlined" style={{ fontSize: '1rem', marginLeft: 2 }}>arrow_forward</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-glow" />
        <h1 className="landing-hero-title">
          Spor Perakende
          <span className="landing-gradient-text"> Eğitim & Gelişim</span>
          <br />Platformu
        </h1>
        <p className="landing-hero-sub">
          Çalışanlarınızı eğitin, performanslarını ölçün ve mağaza
          operasyonlarınızı tek platformdan yönetin.
        </p>
        <div className="landing-hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => router.push('/login')}>
            <span className="material-icons-outlined">rocket_launch</span> Hemen Başla
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="material-icons-outlined">expand_more</span> Özellikleri Keşfet
          </button>
        </div>
        <div className="landing-stats">
          {stats.map((s, i) => (
            <div key={i} className="landing-stat">
              <span className="material-icons-outlined" style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: 4 }}>{s.icon}</span>
              <AnimatedCounter target={s.value} />
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-features">
        <h2 className="landing-section-title">Neler Yapabilirsiniz?</h2>
        <p className="landing-section-sub">Sporthink ile perakende ekibinizin tüm gelişim süreçlerini yönetin</p>
        <div className="landing-features-grid">
          {features.map((f, i) => (
            <div key={i} className="landing-feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="landing-feature-icon">
                <span className="material-icons-outlined">{f.icon}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2 className="landing-section-title">Kullanılan Teknolojiler</h2>
        <p className="landing-section-sub">Modern ve ölçeklenebilir altyapı</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginTop: 32 }}>
          {[
            { name: 'Next.js 16', icon: '⚡' },
            { name: 'Prisma ORM', icon: '🔷' },
            { name: 'PostgreSQL', icon: '🐘' },
            { name: 'Chart.js', icon: '📊' },
            { name: 'NextAuth', icon: '🔐' },
            { name: 'TypeScript', icon: '🔵' },
          ].map((tech, i) => (
            <div key={i} style={{
              padding: '16px 24px', borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 500,
              transition: 'var(--transition)',
            }}>
              <span style={{ fontSize: '1.3rem' }}>{tech.icon}</span>
              {tech.name}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <h2>Ekibinizin potansiyelini ortaya çıkarın</h2>
        <p>Sporthink ile eğitim, performans ve geri bildirim süreçlerinizi dijitalleştirin.</p>
        <button className="btn btn-primary btn-lg" onClick={() => router.push('/login')}>
          <span className="material-icons-outlined">arrow_forward</span> Platforma Giriş Yap
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon" style={{ width: 28, height: 28, fontSize: '0.8rem' }}><span style={{ color: '#fff' }}>sp</span><span style={{ color: '#E53935' }}>o</span></div>
            <span style={{ letterSpacing: '-0.5px' }}>sp<span style={{ color: '#E53935' }}>o</span>rthink</span>
          </div>
          <span className="text-sm text-secondary">© 2026 Sporthink. Tüm hakları saklıdır.</span>
        </div>
      </footer>
    </div>
  );
}
