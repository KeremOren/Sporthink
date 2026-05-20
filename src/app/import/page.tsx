'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';

const IMPORT_TYPES = [
    {
        key: 'users',
        label: 'Kullanıcılar',
        icon: 'people',
        color: '#6366f1',
        description: 'Çalışan, müdür ve yöneticileri toplu olarak ekleyin',
        columns: ['email', 'firstName', 'lastName', 'role', 'storeName', 'password', 'hireDate'],
        columnLabels: ['E-posta *', 'Ad *', 'Soyad *', 'Rol', 'Mağaza Adı', 'Şifre', 'İşe Giriş'],
        notes: 'Roller: EMPLOYEE, ASSISTANT_MANAGER, STORE_MANAGER, REGIONAL_MANAGER. Şifre verilmezse "sporthink123" atanır.',
    },
    {
        key: 'kpi',
        label: 'KPI Verileri',
        icon: 'trending_up',
        color: '#22c55e',
        description: 'Aylık KPI hedef gerçekleşmelerini toplu yükleyin',
        columns: ['storeName', 'kpiName', 'period', 'value', 'notes'],
        columnLabels: ['Mağaza Adı *', 'KPI Adı *', 'Dönem *', 'Değer *', 'Notlar'],
        notes: 'Dönem formatı: 2026-03. KPI adları sistemle eşleşmeli (örn: Aylık Satış Hedefi).',
    },
    {
        key: 'trainings',
        label: 'Eğitimler',
        icon: 'school',
        color: '#f59e0b',
        description: 'Eğitim müfredatını toplu olarak oluşturun',
        columns: ['title', 'description', 'category', 'type', 'durationMinutes'],
        columnLabels: ['Başlık *', 'Açıklama', 'Kategori', 'Tür', 'Süre (dk)'],
        notes: 'Tür: MANDATORY veya OPTIONAL. Süre dakika cinsindendir.',
    },
];

export default function ImportPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { document.title = 'Sporthink | Toplu Veri Yükleme'; }, []);

    const handleUpload = async () => {
        if (!file || !selectedType) return;
        setUploading(true);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', selectedType);
            const res = await fetch('/api/import', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
            if (data.success > 0) showToast(`${data.success} kayıt başarıyla eklendi`, 'success');
            if (data.errors?.length > 0) showToast(`${data.errors.length} satırda hata var`, 'warning');
        } catch (err: any) {
            showToast(err.message || 'Yükleme hatası', 'error');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = (type: string) => {
        window.open(`/api/import?template=${type}`, '_blank');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.csv') || f.name.endsWith('.xls'))) {
            setFile(f);
        } else {
            showToast('Sadece Excel (.xlsx, .xls) veya CSV dosyaları desteklenir', 'error');
        }
    };

    if (!session) return null;
    const user = session.user as any;
    if (user.role !== 'SUPER_ADMIN') {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="empty-state">
                        <span className="material-icons-outlined">lock</span>
                        <p>Bu sayfaya erişim yetkiniz yok</p>
                    </div>
                </main>
            </div>
        );
    }

    const activeType = IMPORT_TYPES.find(t => t.key === selectedType);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1>Toplu Veri Yükleme</h1>
                        <div className="page-header-sub">Excel veya CSV dosyası ile toplu veri aktarımı</div>
                    </div>
                </div>

                <div className="page-body">
                    {/* Step 1: Select Type */}
                    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="card-header">
                            <h4 className="card-title">
                                <span className="material-icons-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: 4 }}>looks_one</span>
                                Veri Türü Seçin
                            </h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                            {IMPORT_TYPES.map(type => (
                                <button key={type.key} onClick={() => { setSelectedType(type.key); setFile(null); setResult(null); }}
                                    style={{
                                        padding: '20px', borderRadius: 'var(--radius-lg)', textAlign: 'left', cursor: 'pointer',
                                        border: selectedType === type.key ? `2px solid ${type.color}` : '2px solid var(--border)',
                                        background: selectedType === type.key ? `${type.color}10` : 'var(--bg-secondary)',
                                        transition: 'all 0.2s ease',
                                    }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '1.5rem', color: type.color }}>{type.icon}</span>
                                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{type.label}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{type.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Upload File */}
                    {selectedType && activeType && (
                        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                            <div className="card-header">
                                <h4 className="card-title">
                                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: 4 }}>looks_two</span>
                                    Dosya Yükleyin
                                </h4>
                                <button className="btn btn-ghost" onClick={() => downloadTemplate(selectedType)} style={{ fontSize: '0.8rem' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>download</span> Şablon İndir
                                </button>
                            </div>

                            {/* Column Info */}
                            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', fontSize: '0.8rem' }}>
                                <div style={{ fontWeight: 600, marginBottom: 8 }}>Beklenen Sütunlar:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {activeType.columnLabels.map((col, i) => (
                                        <span key={i} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{col}</span>
                                    ))}
                                </div>
                                <div style={{ marginTop: 8, color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>💡 {activeType.notes}</div>
                            </div>

                            {/* Drop Zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragOver ? 'var(--primary)' : file ? '#22c55e' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-lg)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                                    background: dragOver ? 'rgba(99,102,241,0.05)' : file ? 'rgba(34,197,94,0.05)' : 'transparent',
                                    transition: 'all 0.2s ease',
                                }}>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
                                {file ? (
                                    <>
                                        <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: '#22c55e' }}>check_circle</span>
                                        <div style={{ marginTop: 8, fontWeight: 600 }}>{file.name}</div>
                                        <div className="text-xs text-secondary">{(file.size / 1024).toFixed(1)} KB</div>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)' }}>cloud_upload</span>
                                        <div style={{ marginTop: 8, fontWeight: 600 }}>Dosyayı sürükleyin veya tıklayın</div>
                                        <div className="text-xs text-secondary">.xlsx, .xls veya .csv formatı</div>
                                    </>
                                )}
                            </div>

                            {/* Upload Button */}
                            {file && (
                                <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost" onClick={() => { setFile(null); setResult(null); }}>Temizle</button>
                                    <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                                        {uploading ? (
                                            <><span className="material-icons-outlined spin" style={{ fontSize: '1rem' }}>sync</span> Yükleniyor...</>
                                        ) : (
                                            <><span className="material-icons-outlined" style={{ fontSize: '1rem' }}>upload</span> Yükle ve İşle</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Results */}
                    {result && (
                        <div className="card">
                            <div className="card-header">
                                <h4 className="card-title">
                                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: 4 }}>fact_check</span>
                                    Sonuçlar
                                </h4>
                            </div>

                            <div className="stat-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                                <div className="stat-card" style={{ borderBottom: '3px solid var(--primary)' }}>
                                    <div className="stat-info">
                                        <div className="stat-label">Toplam Satır</div>
                                        <div className="stat-value">{result.total}</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ borderBottom: '3px solid #22c55e' }}>
                                    <div className="stat-info">
                                        <div className="stat-label">Başarılı</div>
                                        <div className="stat-value" style={{ color: '#22c55e' }}>{result.success}</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ borderBottom: `3px solid ${result.errors?.length > 0 ? '#ef4444' : '#22c55e'}` }}>
                                    <div className="stat-info">
                                        <div className="stat-label">Hata</div>
                                        <div className="stat-value" style={{ color: result.errors?.length > 0 ? '#ef4444' : '#22c55e' }}>{result.errors?.length || 0}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Success message */}
                            {result.success > 0 && (
                                <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(34,197,94,0.08)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="material-icons-outlined" style={{ color: '#22c55e' }}>task_alt</span>
                                    <span style={{ color: '#22c55e', fontWeight: 600 }}>{result.success} kayıt başarıyla eklendi!</span>
                                </div>
                            )}

                            {/* Error details */}
                            {result.errors?.length > 0 && (
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: '#ef4444' }}>Hatalar:</div>
                                    <div style={{ maxHeight: 300, overflow: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        {result.errors.map((err: string, i: number) => (
                                            <div key={i} style={{ padding: '8px 12px', fontSize: '0.78rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '0.9rem', color: '#ef4444' }}>error</span>
                                                {err}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
