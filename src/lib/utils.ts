import prisma from './prisma';

export async function createAuditLog(
    userId: string | null,
    action: string,
    entity: string,
    entityId: string | null,
    details?: string
) {
    await prisma.auditLog.create({
        data: { userId, action, entity, entityId, details },
    });
}

export function formatDate(date: Date | string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

export function formatDateTime(date: Date | string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        NOT_STARTED: '#94a3b8',
        IN_PROGRESS: '#3b82f6',
        COMPLETED: '#22c55e',
        OVERDUE: '#ef4444',
        ACTIVE: '#22c55e',
        ARCHIVED: '#94a3b8',
        NEW: '#8b5cf6',
        IN_REVIEW: '#f59e0b',
        ACTION_PLANNED: '#3b82f6',
        IMPLEMENTED: '#22c55e',
        CLOSED: '#6b7280',
        LOW: '#22c55e',
        MEDIUM: '#f59e0b',
        HIGH: '#f97316',
        CRITICAL: '#ef4444',
    };
    return colors[status] || '#94a3b8';
}

export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        NOT_STARTED: 'Başlanmadı',
        IN_PROGRESS: 'Devam Ediyor',
        COMPLETED: 'Tamamlandı',
        OVERDUE: 'Gecikmiş',
        ACTIVE: 'Aktif',
        ARCHIVED: 'Arşivlenmiş',
        NEW: 'Yeni',
        IN_REVIEW: 'İnceleniyor',
        ACTION_PLANNED: 'Aksiyon Planlandı',
        IMPLEMENTED: 'Uygulandı',
        CLOSED: 'Kapatıldı',
        MANDATORY: 'Zorunlu',
        OPTIONAL: 'İsteğe Bağlı',
        LOW: 'Düşük',
        MEDIUM: 'Orta',
        HIGH: 'Yüksek',
        CRITICAL: 'Kritik',
        OPERATIONAL_ISSUE: 'Operasyonel Sorun',
        SUGGESTION: 'Öneri',
        INCIDENT: 'Olay',
        PRAISE: 'Takdir',
        TRAINING_NEED: 'Eğitim İhtiyacı',
        CUSTOMER_COMPLAINT: 'Müşteri Şikayeti',
        PRODUCT_DEFECT: 'Ürün Hatası',
        STOCK_ISSUE: 'Stok Sorunu',
        STAFF_ISSUE: 'Personel Sorunu',
        STORE_MAINTENANCE: 'Mağaza Bakım',
    };
    return labels[status] || status;
}

export function calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

export function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function generatePeriod(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
