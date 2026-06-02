import { UserRole } from '@/types';

type Permission = 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'manage';
type Resource =
    | 'users' | 'trainings' | 'training_assignments' | 'quizzes' | 'quiz_attempts'
    | 'kpi_definitions' | 'kpi_entries' | 'feedback' | 'reports' | 'dev_profiles'
    | 'manager_notes' | 'audit_logs' | 'admin';

type Scope = 'all' | 'region' | 'store' | 'self' | 'none';

interface PermissionRule {
    permission: Permission;
    scope: Scope;
}

const PERMISSIONS: Record<Resource, Record<UserRole, PermissionRule[]>> = {
    users: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'create', scope: 'all' }, { permission: 'edit', scope: 'all' }, { permission: 'delete', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }],
    },
    trainings: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'create', scope: 'all' }, { permission: 'edit', scope: 'all' }, { permission: 'delete', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }],
    },
    training_assignments: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'assign', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'assign', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'assign', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }, { permission: 'edit', scope: 'self' }],
    },
    quizzes: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'create', scope: 'all' }, { permission: 'edit', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }],
    },
    quiz_attempts: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'create', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'create', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }, { permission: 'create', scope: 'self' }],
    },
    kpi_definitions: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'create', scope: 'all' }, { permission: 'edit', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }],
    },
    kpi_entries: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'create', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'create', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }],
    },
    feedback: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'create', scope: 'all' }, { permission: 'manage', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }, { permission: 'create', scope: 'region' }, { permission: 'manage', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'create', scope: 'store' }, { permission: 'manage', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'create', scope: 'store' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }, { permission: 'create', scope: 'self' }],
    },
    reports: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }],
        EMPLOYEE: [],
    },
    dev_profiles: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'self' }],
        EMPLOYEE: [{ permission: 'view', scope: 'self' }],
    },
    manager_notes: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'create', scope: 'all' }],
        REGIONAL_MANAGER: [{ permission: 'view', scope: 'region' }, { permission: 'create', scope: 'region' }],
        STORE_MANAGER: [{ permission: 'view', scope: 'store' }, { permission: 'create', scope: 'store' }],
        ASSISTANT_MANAGER: [{ permission: 'view', scope: 'store' }],
        EMPLOYEE: [],
    },
    audit_logs: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }],
        REGIONAL_MANAGER: [],
        STORE_MANAGER: [],
        ASSISTANT_MANAGER: [],
        EMPLOYEE: [],
    },
    admin: {
        SUPER_ADMIN: [{ permission: 'view', scope: 'all' }, { permission: 'manage', scope: 'all' }],
        REGIONAL_MANAGER: [],
        STORE_MANAGER: [],
        ASSISTANT_MANAGER: [],
        EMPLOYEE: [],
    },
};

export function hasPermission(
    role: UserRole,
    resource: Resource,
    permission: Permission
): boolean {
    const rules = PERMISSIONS[resource]?.[role] || [];
    return rules.some(r => r.permission === permission);
}

export function getScope(
    role: UserRole,
    resource: Resource,
    permission: Permission
): Scope {
    const rules = PERMISSIONS[resource]?.[role] || [];
    const rule = rules.find(r => r.permission === permission);
    return rule?.scope || 'none';
}

export function canAccess(role: UserRole, resource: Resource): boolean {
    const rules = PERMISSIONS[resource]?.[role] || [];
    return rules.length > 0;
}

export const ROLE_LABELS: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    REGIONAL_MANAGER: 'Bölge Müdürü',
    STORE_MANAGER: 'Mağaza Müdürü',
    ASSISTANT_MANAGER: 'Müdür Vekili',
    EMPLOYEE: 'Çalışan',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    SUPER_ADMIN: 5,
    REGIONAL_MANAGER: 4,
    STORE_MANAGER: 3,
    ASSISTANT_MANAGER: 2,
    EMPLOYEE: 1,
};

export function isRoleHigherOrEqual(role: UserRole, targetRole: UserRole): boolean {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[targetRole];
}

export const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Eğitimler', href: '/trainings', icon: 'school', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'AI Asistan', href: '/ai-assistant', icon: 'smart_toy', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Satış Simülasyonu', href: '/simulations', icon: 'theater_comedy', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Çalışanlar', href: '/employees', icon: 'people', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'] },
    { label: 'Vardiyalar', href: '/shifts', icon: 'calendar_month', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'İzinler', href: '/leaves', icon: 'beach_access', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'KPI', href: '/kpi', icon: 'trending_up', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'AI İçgörüler', href: '/insights', icon: 'auto_awesome', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER'] },
    { label: 'Performans', href: '/performance', icon: 'speed', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'EMPLOYEE'] },
    { label: 'Başarılarım', href: '/achievements', icon: 'workspace_premium', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Mağaza Ligi', href: '/league', icon: 'emoji_events', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Gelişim Dosyası', href: '/profile', icon: 'folder_shared', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'EMPLOYEE'] },
    { label: 'Sertifikalarım', href: '/certificates', icon: 'workspace_premium', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Nabız Anketi', href: '/pulse', icon: 'poll', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Topluluk', href: '/community', icon: 'forum', roles: ['SUPER_ADMIN', 'REGIONAL_MANAGER', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'EMPLOYEE'] },
    { label: 'Sistem Logları', href: '/audit', icon: 'history', roles: ['SUPER_ADMIN'] },
    { label: 'Yönetim', href: '/admin', icon: 'admin_panel_settings', roles: ['SUPER_ADMIN'] },
];
