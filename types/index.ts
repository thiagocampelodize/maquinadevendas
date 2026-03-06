export type UserRole = 'ADMIN' | 'GESTOR' | 'VENDEDOR';

export type Period = 'morning' | 'midday' | 'afternoon' | 'evening';

export interface SellerRanking {
  id: string;
  name: string;
  sales: number;
  goal: number;
  hasValidGoal?: boolean;
  percentageOfGoal: number;
  salesToday?: number;
  avatar?: string;
  phone?: string;
}

export interface SalesPerson {
  id: string;
  name: string;
  goal: number;
}

export interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  detailedExplanation: string;
  lessonLink?: string;
  completed: boolean;
  taskType: 'omc' | 'specific';
  isCustom?: boolean;
  period?: Period;
  assignedTo?: 'all' | 'gestor' | string;
  createdBy?: string;
  createdAt?: string;
  completedBy?: string;
  completedAt?: string;
  supabaseId?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  active: boolean;
}
