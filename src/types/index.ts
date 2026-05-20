export type UserRole = 'SUPER_ADMIN' | 'REGIONAL_MANAGER' | 'STORE_MANAGER' | 'ASSISTANT_MANAGER' | 'EMPLOYEE';

export type TrainingType = 'MANDATORY' | 'OPTIONAL';
export type TrainingStatus = 'ACTIVE' | 'ARCHIVED';
export type AssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export type KpiFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type KpiScope = 'STORE' | 'EMPLOYEE' | 'REGION';

export type FeedbackType = 'OPERATIONAL_ISSUE' | 'SUGGESTION' | 'INCIDENT' | 'PRAISE' | 'TRAINING_NEED' | 'CUSTOMER_COMPLAINT' | 'PRODUCT_DEFECT' | 'STOCK_ISSUE' | 'STAFF_ISSUE' | 'STORE_MAINTENANCE';
export type FeedbackStatus = 'NEW' | 'IN_REVIEW' | 'ACTION_PLANNED' | 'IMPLEMENTED' | 'CLOSED';
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SessionUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    storeId?: string | null;
    regionId?: string | null;
    storeName?: string | null;
    regionName?: string | null;
}

export interface DashboardStats {
    totalUsers: number;
    activeTrainings: number;
    completionRate: number;
    openFeedback: number;
    pendingTrainings?: number;
    quizPassRate?: number;
    avgKpiAchievement?: number;
    overdueTrainings?: number;
}

export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
        fill?: boolean;
        tension?: number;
    }[];
}
