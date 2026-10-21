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
  admin?: string;
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
  hanziFont?: string;
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

export interface AdminGuide {
  id: string;
  slug: string;
  title: string;
  category: string;
  description?: string;
  summary?: string;
  content: string; // Markdown / step-by-step instructions
  order: number;
  tags?: string[];
  icon?: string;
  isPublished?: boolean;
  author?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown' | 'down';
  latencyMs?: number;
  lastCheckedAt?: string;
  lastCheck?: string;
  message?: string;
  details?: unknown;
}

export interface SystemHealthReport {
  overallStatus?: 'healthy' | 'degraded' | 'unavailable' | 'down';
  status?: 'healthy' | 'degraded' | 'down' | 'unavailable';
  checkedAt: string;
  uptimeSeconds?: number;
  uptime?: number;
  nodeVersion?: string;
  version?: string;
  environment?: string;
  memoryUsageMb?: number;
  services: ServiceHealthStatus[];
  recentErrorsCount?: number;
  metrics?: {
    memoryRssMb?: number;
    memoryHeapMb?: number;
    memoryHeapTotalMb?: number;
    dbLatencyMs?: number;
    pdfExamFilesCount?: number;
    audioExamFilesCount?: number;
    unresolvedErrorsCount?: number;
    totalUsersCount?: number;
    totalVocabCount?: number;
  };
}

export interface DiagnosticCheckItem {
  id: string;
  name: string;
  category: 'runtime' | 'database' | 'storage' | 'security' | 'workspaces' | 'errors';
  status: 'pass' | 'warning' | 'fail';
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface DeepDiagnosticResult {
  auditedAt: string;
  allPassed: boolean;
  scorePercent: number;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  checks: DiagnosticCheckItem[];
}

export interface SystemErrorLog {
  id: string;
  timestamp: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category?: string;
  module: string;
  message: string;
  stack?: string;
  path?: string;
  userId?: string;
  count: number;
  status: 'open' | 'acknowledged' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: string;
  details?: string;
}

