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
  zaloCommunityEnabled?: boolean;
  zaloCommunityUrl?: string;
  zaloCommunityTitle?: string;
  zaloCommunityDescription?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserFeedback {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  category: 'feature' | 'bug' | 'voice' | 'content' | 'other';
  rating?: number; // 1-5
  message: string;
  createdAt: string;
  deviceInfo?: string;
  status?: 'new' | 'reviewed' | 'resolved';
}

export interface PracticedWordRecord {
  vocabId: string;
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  hskLevel?: number | string;
  hanziStatus?: 'correct' | 'wrong' | 'uncertain' | 'unlearned';
  hanziPracticeInput?: string;
  translationStatus?: 'correct' | 'review' | 'unanswered';
  translationPracticeInput?: string;
  favorite?: boolean;
  notes?: string;
  lastPracticedAt?: string;
  srs?: {
    repetition?: number;
    interval?: number;
    easeFactor?: number;
    nextReview?: string;
    totalReviews?: number;
    successRate?: number;
  };
  isMastered: boolean;
}

