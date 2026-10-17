export type UserRole = 'user' | 'admin' | 'student' | 'teacher';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  streakDays: number;
  totalMastered: number;
  targetHsk?: number;
  role: UserRole;
  isLocked?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  activeWeek?: number;
  activeMonth?: number;
  newUsersToday?: number;
  newUsersWeek?: number;
  newUsersMonth?: number;
  lockedUsers: number;
  totalSystemWords: number;
  totalCustomWords: number;
  totalReviewsDone: number;
  masteredWordsRate: number;
  hskBreakdown?: Record<number, number>;
  topicBreakdown?: Record<string, number>;
  totalTopics?: number;
  totalCustomHskGroups?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  adminEmail: string;
  target?: string;
  details?: string;
  timestamp: string;
}

export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  ttsVoiceName?: string;
  ttsVoiceURI?: string;
  ttsVoiceGender?: 'default' | 'male' | 'female';
  ttsRate?: number;
  autoPronounce?: boolean;
  fontSize?: 'normal' | 'large' | 'xlarge';
  updatedAt?: string;
}

export interface SystemConfig {
  platformName: string;
  platformDescription: string;
  allowRegistration: boolean;
  maintenanceMode: boolean;
  maxImportBatchSize: number;
  defaultTargetHsk: number;
  updatedAt?: string;
  updatedBy?: string;
}
