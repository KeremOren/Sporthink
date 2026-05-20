'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/ToastProvider';
import { SkeletonCard } from '@/components/ui/Skeleton';

type Shift = {
    id: string;
    userId: string;
    storeId: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    status: string;
    notes: string | null;
    user: { id: string; firstName: string; lastName: string };
    store: { id: string; name: string };
};

type Employee = { id: string; firstName: string; lastName: string; role: string };

const SHIFT_TYPES = [
    { code: 'MORNING', label: 'Sabah',  icon: 'wb_sunny',    color: '#f59e0b', startTime: '09:00', endTime: '15:00' },
    { code: 'EVENING', label: 'Akşam',  icon: 'nights_stay', color: '#6366f1', startTime: '15:00', endTime: '22:00' },
    { code: 'FULL',    label: 'Tam Gün', icon: 'schedule',   color: '#16a34a', startTime: '09:00', endTime: '18:00' },
    { code: 'NIGHT',   label: 'Gece',   icon: 'bedtime',     color: '#7c3aed', startTime: '22:00', endTime: '06:00' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    SCHEDULED: { label: 'Planlandı', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    CONFIRMED: { label: 'Onaylandı', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
    MISSED:    { label: 'Gelmedi',   color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
    SWAPPED:   { label: 'Değişti',   color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
};

function startOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay() || 7;
    if (day !== 1) date.setHours(-24 * (day - 1));
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatDateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function formatDayLabel(d: Date): string {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const day = d.getDay();
    return `${days[day === 0 ? 0 : day]}`;
}

export default function ShiftsPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const user = session?.user as any;
    const role = user?.role;
    const canEdit = role && ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'].includes(role);

    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [addContext, setAddContext] = useState<{ date: string; userId?: string } | null>(null);

    useEffect(() => { document.title = 'Sporthink | Vardiya Planlama'; }, []);

    // Load shifts for the week
    useEffect(() => {
        if (!session) return;
        const startStr = formatDateKey(weekStart);
        const endDate = new Date(weekStart);
        endDate.setDate(endDate.getDate() + 6);
        const endStr = formatDateKey(endDate);

        setLoading(true);
        fetch(`/api/shifts?startDate=${startStr}&endDate=${endStr}`)
            .then(r => r.json())
            .then(d => setShifts(d.shifts || []))
            .catch(() => showToast('Vardiyalar yüklenemedi', 'error'))
            .finally(() => setLoading(false));
    }, [session, weekStart]);

    // Load employees for assignment (managers only)
    useEffect(() => {
        if (!session || !canEdit) return;
        fetch('/api/users?role=EMPLOYEE,ASSISTANT_MANAGER&isActive=true')
            .then(r => r.json())
            .then(d => {
                const list = Array.isArray(d) ? d : (d.users || []);
                setEmployees(list);
            })
            .catch(() => {});
    }, [session, canEdit]);

    const days = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [weekStart]);

    const shiftsByDay = useMemo(() => {
        const map: Record<string, Shift[]> = {};
        for (const s of shifts) {
            const key = s.date.slice(0, 10);
            if (!map[key]) map[key] = [];
            map[key].push(s);
        }
        return map;
    }, [shifts]);

    const navigateWeek = (offset: number) => {
        const next = new Date(weekStart);
        next.setDate(next.getDate() + offset * 7);
        setWeekStart(next);
    };

    const goToday = () => setWeekStart(startOfWeek(new Date()));

    const handleAddShift = async (data: any) => {
        try {
            const res = await fetch('/api/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: data.userId,
                    storeId: user.storeId || data.storeId,
                    date: data.date,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    type: data.type,
                    notes: data.notes,
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Hata');
            setShifts([...shifts, result.shift]);
            setShowAddModal(false);
            setAddContext(null);
            showToast('Vardiya eklendi', 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleUpdateShift = async (id: string, data: any) => {
        try {
            const res = await fetch(`/api/shifts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Hata');
            setShifts(shifts.map(s => s.id === id ? result.shift : s));
            setEditingShift(null);
            showToast('Vardiya güncellendi', 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (!confirm('Bu vardiyayı silmek istediğinizden emin misiniz?')) return;
        try {
            const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Silinemedi');
            setShifts(shifts.filter(s => s.id !== id));
            showToast('Vardiya silindi', 'info');
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleConfirmShift = async (s: Shift) => {
        try {
            const res = await fetch(`/api/shifts/${s.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CONFIRMED' }),
            });
            if (!res.ok) throw new Error();
            setShifts(shifts.map(x => x.id === s.id ? { ...x, status: 'CONFIRMED' } : x));
            showToast('Vardiya onaylandı', 'success');
        } catch {
            showToast('Onaylanamadı', 'error');
        }
    };

    const totalShifts = shifts.length;
    const confirmedCount = shifts.filter(s => s.status === 'CONFIRMED').length;
    const totalHours = shifts.reduce((acc, s) => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const hours = (eh + em/60) - (sh + sm/60);
        return acc + (hours > 0 ? hours : hours + 24);
    }, 0);

    return (
        <div className="page-wrapper">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header cine-fadeInUp" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            }}>
                                <span className="material-icons-outlined">calendar_month</span>
                            </span>
                            Vardiya Planlama
                        </h1>
                        <p className="page-subtitle">
                            {canEdit ? 'Haftalık vardiya planını oluştur ve yönet' : 'Bu haftaki vardiya planın'}
                        </p>
                    </div>

                    {/* Week navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--glass-bg)', padding: 8, borderRadius: 12, border: '1px solid var(--card-border)' }}>
                        <button onClick={() => navigateWeek(-1)} className="btn btn-ghost btn-sm" title="Önceki hafta">
                            <span className="material-icons-outlined">chevron_left</span>
                        </button>
                        <div style={{ padding: '4px 12px', minWidth: 180, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                {weekStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – {(() => {
                                    const end = new Date(weekStart);
                                    end.setDate(end.getDate() + 6);
                                    return end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                                })()}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                {weekStart.toLocaleDateString('tr-TR', { year: 'numeric' })}
                            </div>
                        </div>
                        <button onClick={() => navigateWeek(1)} className="btn btn-ghost btn-sm" title="Sonraki hafta">
                            <span className="material-icons-outlined">chevron_right</span>
                        </button>
                        <button onClick={goToday} className="btn btn-secondary btn-sm" style={{ marginLeft: 4 }}>
                            Bugün
                        </button>
                    </div>
                </div>

                <div style={{ padding: '0 28px 32px' }}>
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 22 }}>
                        <MiniStatCard icon="event" color="#3b82f6" label="Toplam Vardiya" value={String(totalShifts)} />
                        <MiniStatCard icon="check_circle" color="#16a34a" label="Onaylanan" value={`${confirmedCount} / ${totalShifts}`} />
                        <MiniStatCard icon="schedule" color="#f59e0b" label="Toplam Saat" value={`${totalHours.toFixed(0)} sa`} />
                        <MiniStatCard icon="people" color="#8b5cf6" label="Aktif Çalışan" value={String(new Set(shifts.map(s => s.userId)).size)} />
                    </div>

                    {/* Weekly Calendar */}
                    {loading ? (
                        <SkeletonCard count={2} />
                    ) : (
                        <div className="cine-fadeInUp" style={{
                            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                            border: '1px solid var(--card-border)', borderRadius: 16,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                minHeight: 480,
                            }}>
                                {days.map((day, idx) => {
                                    const key = formatDateKey(day);
                                    const dayShifts = shiftsByDay[key] || [];
                                    const isToday = formatDateKey(day) === formatDateKey(new Date());
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <div key={idx} style={{
                                            borderRight: idx < 6 ? '1px solid var(--card-border)' : 'none',
                                            background: isWeekend ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                                            display: 'flex', flexDirection: 'column',
                                        }}>
                                            {/* Day header */}
                                            <div style={{
                                                padding: '12px 10px',
                                                borderBottom: '1px solid var(--card-border)',
                                                textAlign: 'center',
                                                background: isToday ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : (isWeekend ? 'rgba(239, 68, 68, 0.04)' : 'transparent'),
                                                color: isToday ? '#fff' : 'var(--text-primary)',
                                            }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: isToday ? 0.95 : 0.7 }}>
                                                    {formatDayLabel(day)}
                                                </div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 2 }}>
                                                    {day.getDate()}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>
                                                    {day.toLocaleDateString('tr-TR', { month: 'short' })}
                                                </div>
                                            </div>

                                            {/* Shifts */}
                                            <div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 200 }}>
                                                {dayShifts.length === 0 && canEdit && (
                                                    <button
                                                        onClick={() => { setAddContext({ date: key }); setShowAddModal(true); }}
                                                        style={{
                                                            border: '2px dashed var(--card-border)',
                                                            background: 'transparent',
                                                            borderRadius: 8,
                                                            padding: '20px 8px',
                                                            color: 'var(--text-tertiary)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.borderColor = '#3b82f6';
                                                            e.currentTarget.style.color = '#3b82f6';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.borderColor = 'var(--card-border)';
                                                            e.currentTarget.style.color = 'var(--text-tertiary)';
                                                        }}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '1.4rem' }}>add</span>
                                                        Vardiya Ekle
                                                    </button>
                                                )}
                                                {dayShifts.map(s => (
                                                    <ShiftPill
                                                        key={s.id}
                                                        shift={s}
                                                        canEdit={canEdit}
                                                        isOwnShift={s.userId === user?.id}
                                                        onEdit={() => setEditingShift(s)}
                                                        onDelete={() => handleDeleteShift(s.id)}
                                                        onConfirm={() => handleConfirmShift(s)}
                                                    />
                                                ))}
                                                {dayShifts.length > 0 && canEdit && (
                                                    <button
                                                        onClick={() => { setAddContext({ date: key }); setShowAddModal(true); }}
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ fontSize: '0.7rem', padding: '4px 6px', justifyContent: 'center' }}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>add</span>
                                                        Ekle
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                        {SHIFT_TYPES.map(t => (
                            <div key={t.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 12, height: 12, borderRadius: 4, background: t.color }} />
                                {t.label} ({t.startTime}–{t.endTime})
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add modal */}
                {showAddModal && canEdit && (
                    <ShiftModal
                        title="Yeni Vardiya"
                        initial={{ date: addContext?.date, userId: addContext?.userId }}
                        employees={employees}
                        onSave={handleAddShift}
                        onClose={() => { setShowAddModal(false); setAddContext(null); }}
                    />
                )}

                {/* Edit modal */}
                {editingShift && canEdit && (
                    <ShiftModal
                        title="Vardiya Düzenle"
                        initial={{
                            date: editingShift.date.slice(0, 10),
                            userId: editingShift.userId,
                            type: editingShift.type,
                            startTime: editingShift.startTime,
                            endTime: editingShift.endTime,
                            notes: editingShift.notes || '',
                        }}
                        employees={employees}
                        onSave={(data: any) => handleUpdateShift(editingShift.id, data)}
                        onClose={() => setEditingShift(null)}
                    />
                )}
            </main>
        </div>
    );
}

function ShiftPill({ shift, canEdit, isOwnShift, onEdit, onDelete, onConfirm }: any) {
    const typeMeta = SHIFT_TYPES.find(t => t.code === shift.type) || SHIFT_TYPES[2];
    const statusMeta = STATUS_META[shift.status] || STATUS_META.SCHEDULED;
    return (
        <div
            style={{
                position: 'relative',
                background: `${typeMeta.color}15`,
                borderLeft: `3px solid ${typeMeta.color}`,
                borderRadius: 6,
                padding: '6px 8px',
                fontSize: '0.75rem',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span className="material-icons-outlined" style={{ fontSize: '0.85rem', color: typeMeta.color }}>{typeMeta.icon}</span>
                <strong style={{ color: typeMeta.color, fontSize: '0.72rem' }}>{shift.startTime}–{shift.endTime}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {shift.user.firstName} {shift.user.lastName.charAt(0)}.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{
                    padding: '1px 6px', borderRadius: 4,
                    background: statusMeta.bg, color: statusMeta.color,
                    fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                }}>
                    {statusMeta.label}
                </span>
                {canEdit && (
                    <div style={{ display: 'flex', gap: 2 }}>
                        <button
                            onClick={onEdit}
                            style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-tertiary)' }}
                            title="Düzenle"
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>edit</span>
                        </button>
                        <button
                            onClick={onDelete}
                            style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', color: '#dc2626' }}
                            title="Sil"
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '0.85rem' }}>delete</span>
                        </button>
                    </div>
                )}
                {!canEdit && isOwnShift && shift.status === 'SCHEDULED' && (
                    <button
                        onClick={onConfirm}
                        style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', color: '#16a34a', fontSize: '0.65rem', fontWeight: 700 }}
                    >
                        Onayla
                    </button>
                )}
            </div>
        </div>
    );
}

function MiniStatCard({ icon, color, label, value }: any) {
    return (
        <div style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--card-border)', borderRadius: 12,
            padding: 14, display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${color}20`, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <span className="material-icons-outlined">{icon}</span>
            </div>
            <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{label}</div>
            </div>
        </div>
    );
}

function ShiftModal({ title, initial, employees, onSave, onClose }: any) {
    const [form, setForm] = useState({
        date: initial?.date || '',
        userId: initial?.userId || '',
        type: initial?.type || 'FULL',
        startTime: initial?.startTime || '09:00',
        endTime: initial?.endTime || '18:00',
        notes: initial?.notes || '',
    });

    const setType = (t: string) => {
        const type = SHIFT_TYPES.find(x => x.code === t);
        if (type) {
            setForm({ ...form, type: t, startTime: type.startTime, endTime: type.endTime });
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{
                background: 'var(--bg-secondary)', borderRadius: 16, padding: 24,
                maxWidth: 480, width: '100%',
                border: '1px solid var(--card-border)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Date */}
                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Tarih</label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            style={{
                                width: '100%', padding: '10px 12px',
                                border: '1px solid var(--card-border)', borderRadius: 8,
                                background: 'var(--background)', color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>

                    {/* Employee */}
                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Çalışan</label>
                        <select
                            value={form.userId}
                            onChange={(e) => setForm({ ...form, userId: e.target.value })}
                            style={{
                                width: '100%', padding: '10px 12px',
                                border: '1px solid var(--card-border)', borderRadius: 8,
                                background: 'var(--background)', color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                            }}
                        >
                            <option value="">Seçiniz</option>
                            {employees.map((e: Employee) => (
                                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Shift Type */}
                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>Vardiya Tipi</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {SHIFT_TYPES.map(t => (
                                <button
                                    key={t.code}
                                    type="button"
                                    onClick={() => setType(t.code)}
                                    style={{
                                        padding: '8px 4px',
                                        background: form.type === t.code ? t.color : 'transparent',
                                        color: form.type === t.code ? '#fff' : 'var(--text-secondary)',
                                        border: `1px solid ${form.type === t.code ? t.color : 'var(--card-border)'}`,
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 700,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                    }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Başlangıç</label>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px 12px',
                                    border: '1px solid var(--card-border)', borderRadius: 8,
                                    background: 'var(--background)', color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Bitiş</label>
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px 12px',
                                    border: '1px solid var(--card-border)', borderRadius: 8,
                                    background: 'var(--background)', color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                }}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Not (opsiyonel)</label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="örn. Kampanya günü, özel etkinlik..."
                            style={{
                                width: '100%', padding: '10px 12px',
                                border: '1px solid var(--card-border)', borderRadius: 8,
                                background: 'var(--background)', color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
                            İptal
                        </button>
                        <button
                            onClick={() => onSave(form)}
                            disabled={!form.userId || !form.date}
                            style={{
                                flex: 1, padding: '10px 18px',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: '#fff', border: 'none', borderRadius: 8,
                                fontSize: '0.9rem', fontWeight: 700,
                                cursor: (!form.userId || !form.date) ? 'not-allowed' : 'pointer',
                                opacity: (!form.userId || !form.date) ? 0.5 : 1,
                            }}
                        >
                            Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
