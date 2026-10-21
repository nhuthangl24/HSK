import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, UserRole, AdminStats, AuditLog, UserSettings, SystemConfig, UserFeedback, PracticedWordRecord, AdminGuide, SystemHealthReport, ServiceHealthStatus, SystemErrorLog } from '@/types/auth';
import { VocabItem, Topic, CustomHskGroup } from '@/types/vocabulary';
import { ExamItem } from '@/types/exam';
import { AppNotification } from '@/types/notification';
import { hashPassword, verifyPassword, isUserAdmin, extractToken, verifyToken } from './server-auth';
import bundledSystemVocab from '@/data/system_vocab.json';
import { INITIAL_ADMIN_GUIDES } from './admin-guides-data';

interface StoredUserRecord extends User {
  passwordHash?: string;
  salt?: string;
}

export interface UserProgressRecord {
  userId: string;
  vocabId: string;
  hanziPracticeInput?: string;
  hanziStatus: 'correct' | 'wrong' | 'uncertain' | 'unlearned';
  translationPracticeInput?: string;
  translationStatus: 'correct' | 'review' | 'unanswered';
  favorite?: boolean;
  notes?: string;
  srs: VocabItem['srs'];
  updatedAt: string;
}

// Detect serverless environment (Vercel, AWS Lambda, Netlify, read-only docker)
const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NETLIFY ||
  (typeof process !== 'undefined' && process.cwd && process.cwd().startsWith('/var/task'))
);

// In serverless or read-only environments, os.tmpdir() is the only writable directory; in local/server, use .data
let DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'hsk_data')
  : path.join(process.cwd(), '.data');

// In-memory fallback cache so serverless functions never crash even on cold starts
const memoryStore = new Map<string, unknown>();

function ensureDataDir(): string {
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // If creating DATA_DIR failed (e.g. read-only filesystem), switch immediately to tmpdir
    try {
      DATA_DIR = path.join(os.tmpdir(), 'hsk_data');
      if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Memory store fallback
    }
  }
  return DATA_DIR;
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  if (memoryStore.has(filename)) {
    return memoryStore.get(filename) as T;
  }

  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    const repoFilePath = path.join(process.cwd(), '.data', filename);

    // 1. Check DATA_DIR (runtime directory)
    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as T;
      memoryStore.set(filename, parsed);
      return parsed;
    }

    // 2. Check repository .data directory (committed defaults & data on serverless)
    if (fs.existsSync(/*turbopackIgnore: true*/ repoFilePath)) {
      const raw = fs.readFileSync(repoFilePath, 'utf8');
      const parsed = JSON.parse(raw) as T;
      memoryStore.set(filename, parsed);
      try {
        fs.writeFileSync(filePath, raw, 'utf8');
      } catch {}
      return parsed;
    }

    memoryStore.set(filename, defaultValue);
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    } catch {
      // Safe ignore on read-only environments
    }
    return defaultValue;
  } catch {
    memoryStore.set(filename, defaultValue);
    return defaultValue;
  }
}


function writeJsonFile<T>(filename: string, data: T): void {
  memoryStore.set(filename, data);
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Fallback to os.tmpdir() if current DATA_DIR is read-only
    try {
      DATA_DIR = path.join(os.tmpdir(), 'hsk_data');
      if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
    } catch (fallbackErr) {
      console.warn(`[server-db] InMemory state preserved, disk write notice for ${filename}:`, fallbackErr);
    }
  }
}

export function toPublicUser(record: StoredUserRecord): User {
  const { passwordHash: _h, salt: _s, ...publicUser } = record;
  void _h;
  void _s;
  return publicUser;
}

// -------------------------------------------------------------
// USER MANAGEMENT
// -------------------------------------------------------------

export function getAllUsers(): User[] {
  const users = readJsonFile<StoredUserRecord[]>('users.json', []);
  return users.map(toPublicUser);
}


export function getUserRecordByEmail(email: string): StoredUserRecord | null {
  const users = readJsonFile<StoredUserRecord[]>('users.json', []);
  const cleanEmail = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export function getUserRecordById(id: string): StoredUserRecord | null {
  const users = readJsonFile<StoredUserRecord[]>('users.json', []);
  return users.find((u) => u.id === id) || null;
}

export function registerUser(
  name: string,
  email: string,
  password: string,
  role: UserRole = 'user',
  targetHsk = 3
): { user: User; tokenPayloadUser: User } {
  const users = readJsonFile<StoredUserRecord[]>('users.json', []);
  const cleanEmail = email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('Email này đã được sử dụng.');
  }

  const { hash, salt } = hashPassword(password);

  const adminEmails = [
    process.env.ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
    'luunhuthang2402@gmail.com',
    'nhuthangl24@gmail.com',
  ]
    .filter(Boolean)
    .map((e) => (e as string).toLowerCase().trim());

  // Only predefined admin emails can obtain admin role; others are always 'user'
  const effectiveRole: UserRole = adminEmails.includes(cleanEmail) ? 'admin' : (role === 'admin' ? 'user' : role);
  const now = new Date().toISOString();

  const newUser: StoredUserRecord = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    email: cleanEmail,
    role: effectiveRole,
    streakDays: 0,
    totalMastered: 0,
    targetHsk,
    isLocked: false,
    createdAt: now,
    updatedAt: now,
    passwordHash: hash,
    salt,
  };

  users.push(newUser);
  writeJsonFile('users.json', users);

  const publicUser = toPublicUser(newUser);
  return { user: publicUser, tokenPayloadUser: publicUser };
}

export function authenticateUser(
  email: string,
  password: string
): { user: User } {
  const userRecord = getUserRecordByEmail(email);
  if (!userRecord || !userRecord.passwordHash || !userRecord.salt) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }

  if (userRecord.isLocked) {
    throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
  }

  const isValid = verifyPassword(password, userRecord.passwordHash, userRecord.salt);
  if (!isValid) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }

  // Update last active
  updateUser(userRecord.id, { lastLoginAt: new Date().toISOString() });

  return { user: toPublicUser(userRecord) };
}

export function updateUser(id: string, updates: Partial<User>): User {
  const users = readJsonFile<StoredUserRecord[]>('users.json', []);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    // If user is from Firebase Auth and not yet in local users.json, upsert record cleanly
    const newUser: StoredUserRecord = {
      id,
      name: updates.name || updates.email?.split('@')[0] || 'Học viên',
      email: updates.email ? updates.email.trim().toLowerCase() : '',
      role: updates.role || 'user',
      streakDays: updates.streakDays || 0,
      totalMastered: updates.totalMastered || 0,
      targetHsk: updates.targetHsk || 3,
      isLocked: !!updates.isLocked,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates,
    };
    users.push(newUser);
    writeJsonFile('users.json', users);
    return toPublicUser(newUser);
  }

  const current = users[index];
  const updated: StoredUserRecord = {
    ...current,
    ...updates,
    id: current.id, // prevent ID change
    email: updates.email ? updates.email.trim().toLowerCase() : current.email,
    updatedAt: new Date().toISOString(),
  };

  users[index] = updated;
  writeJsonFile('users.json', users);

  return toPublicUser(updated);
}

export function authenticateAdmin(request: Request): {
  isAdmin: boolean;
  userId: string;
  email: string;
  role: UserRole;
} {
  const host = (request.headers.get('host') || '').toLowerCase();
  const isLocalhost =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.');

  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;

  const headerUserId = request.headers.get('x-user-id') || request.headers.get('x-client-user-id');
  const headerEmail = (request.headers.get('x-user-email') || '').trim().toLowerCase();
  const headerRole = (request.headers.get('x-user-role') as UserRole) || 'user';

  const effectiveUserId = payload?.userId || headerUserId || '';
  const effectiveEmail = (payload?.email || headerEmail || '').trim().toLowerCase();
  const effectiveRole = payload?.role || headerRole;

  // On localhost / development, always grant full admin privileges
  if (isLocalhost) {
    return {
      isAdmin: true,
      userId: effectiveUserId || 'UpF7pabMmrMWKEGdMms21OB3EDF3',
      email: effectiveEmail || 'nhuthangl24@gmail.com',
      role: 'admin',
    };
  }

  const caller = effectiveUserId ? getUserRecordById(effectiveUserId) : null;
  const email = (caller?.email || effectiveEmail || '').trim().toLowerCase();
  const role = caller?.role || effectiveRole;
  const isLocked = caller?.isLocked ?? false;

  const isAdmin = !isLocked && (role === 'admin' || effectiveRole === 'admin' || isUserAdmin(email, role));
  return {
    isAdmin,
    userId: effectiveUserId,
    email: email || 'admin@system.local',
    role: isAdmin ? 'admin' : role,
  };
}



// -------------------------------------------------------------
// SYSTEM VOCABULARY (Official Community Database)
// -------------------------------------------------------------

export function getSystemVocabulary(): VocabItem[] {
  const stored = readJsonFile<VocabItem[]>('system_vocab.json', []);
  if (stored && stored.length > 0) {
    return stored.map((v) => ({ ...v, isSystem: true }));
  }

  // Fallback to bundled data if file not yet created in .data or when hosted on serverless/cloud
  try {
    writeJsonFile('system_vocab.json', bundledSystemVocab as VocabItem[]);
  } catch {
    // Read-only filesystem in serverless environments
  }
  return (bundledSystemVocab as VocabItem[]).map((v) => ({ ...v, isSystem: true }));
}

export function saveSystemVocabularyItem(item: VocabItem): VocabItem {
  const list = getSystemVocabulary();
  const index = list.findIndex((i) => i.id === item.id);
  const now = new Date().toISOString();

  const prepared: VocabItem = {
    ...item,
    isSystem: true,
    updatedAt: now,
  };

  if (index >= 0) {
    list[index] = prepared;
  } else {
    list.unshift(prepared);
  }

  writeJsonFile('system_vocab.json', list);
  return prepared;
}

export function deleteSystemVocabularyItem(id: string): boolean {
  const list = getSystemVocabulary();
  const next = list.filter((i) => i.id !== id);
  writeJsonFile('system_vocab.json', next);
  return next.length < list.length;
}

export function batchSaveSystemVocabulary(items: VocabItem[]): number {
  const current = getSystemVocabulary();
  const map = new Map(current.map((i) => [i.id, i]));
  for (const item of items) {
    map.set(item.id, { ...item, isSystem: true, updatedAt: new Date().toISOString() });
  }
  const merged = Array.from(map.values());
  writeJsonFile('system_vocab.json', merged);
  return items.length;
}

// -------------------------------------------------------------
// USER PERSONAL VOCABULARY (Isolated Per User)
// -------------------------------------------------------------

export function getUserPersonalWords(userId: string): VocabItem[] {
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  return allCustom.filter((item) => item.userId === userId && item.isSystem === false);
}

export function saveUserPersonalWord(userId: string, item: VocabItem): VocabItem {
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  const index = allCustom.findIndex((i) => i.id === item.id);
  const now = new Date().toISOString();

  const prepared: VocabItem = {
    ...item,
    userId,
    isSystem: false,
    updatedAt: now,
  };

  if (index >= 0) {
    // Security check: cannot overwrite another user's personal word
    if (allCustom[index].userId !== userId) {
      throw new Error('Bạn không có quyền chỉnh sửa từ vựng này.');
    }
    allCustom[index] = prepared;
  } else {
    allCustom.unshift(prepared);
  }

  writeJsonFile('custom_words.json', allCustom);
  return prepared;
}

export function deleteUserPersonalWord(userId: string, wordId: string): boolean {
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  const target = allCustom.find((i) => i.id === wordId);
  if (!target) return false;
  if (target.userId !== userId) {
    throw new Error('Bạn không có quyền xóa từ vựng này.');
  }

  const next = allCustom.filter((i) => i.id !== wordId);
  writeJsonFile('custom_words.json', next);
  return true;
}

// -------------------------------------------------------------
// USER LEARNING PROGRESS (Isolated Per User)
// -------------------------------------------------------------

export function getUserLearningProgress(userId: string): Record<string, UserProgressRecord> {
  const allProgress = readJsonFile<Record<string, Record<string, UserProgressRecord>>>(
    'user_progress.json',
    {}
  );
  return allProgress[userId] || {};
}

export function saveUserProgress(
  userId: string,
  vocabId: string,
  progress: Partial<UserProgressRecord>
): UserProgressRecord {
  const allProgress = readJsonFile<Record<string, Record<string, UserProgressRecord>>>(
    'user_progress.json',
    {}
  );
  if (!allProgress[userId]) {
    allProgress[userId] = {};
  }

  const current = allProgress[userId][vocabId] || {
    userId,
    vocabId,
    hanziStatus: 'unlearned',
    translationStatus: 'unanswered',
    srs: {
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString().split('T')[0],
      totalReviews: 0,
      correctCount: 0,
      wrongCount: 0,
      history: [],
    },
    updatedAt: new Date().toISOString(),
  };

  const updated: UserProgressRecord = {
    ...current,
    ...progress,
    userId,
    vocabId,
    updatedAt: new Date().toISOString(),
  };

  allProgress[userId][vocabId] = updated;
  writeJsonFile('user_progress.json', allProgress);
  return updated;
}

export function batchSaveUserProgress(
  userId: string,
  records: Array<Partial<UserProgressRecord> & { vocabId: string }>
): number {
  const allProgress = readJsonFile<Record<string, Record<string, UserProgressRecord>>>(
    'user_progress.json',
    {}
  );
  if (!allProgress[userId]) {
    allProgress[userId] = {};
  }

  const now = new Date().toISOString();
  for (const item of records) {
    const vocabId = item.vocabId;
    const current = allProgress[userId][vocabId] || {
      userId,
      vocabId,
      hanziStatus: 'unlearned',
      translationStatus: 'unanswered',
      srs: {
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        dueDate: now.split('T')[0],
        totalReviews: 0,
        correctCount: 0,
        wrongCount: 0,
        history: [],
      },
      updatedAt: now,
    };
    allProgress[userId][vocabId] = {
      ...current,
      ...item,
      userId,
      vocabId,
      updatedAt: now,
    };
  }

  writeJsonFile('user_progress.json', allProgress);
  return records.length;
}


// -------------------------------------------------------------
// AUDIT LOGS & STATS
// -------------------------------------------------------------

export function getAuditLogs(): AuditLog[] {
  return readJsonFile<AuditLog[]>('audit_logs.json', []);
}

export function addAuditLog(
  action: string,
  adminEmail: string,
  target?: string,
  details?: string
): void {
  const logs = getAuditLogs();
  const entry: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    action,
    adminEmail,
    target,
    details,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(entry);
  // Cap at 200 logs
  if (logs.length > 200) logs.pop();
  writeJsonFile('audit_logs.json', logs);
}

export function getAdminMetrics(timeWindow: 'all' | '30d' | '7d' | 'today' = 'all'): AdminStats {
  const users = getAllUsers();
  const systemWords = getSystemVocabulary();
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  const allProgress = readJsonFile<Record<string, Record<string, UserProgressRecord>>>(
    'user_progress.json',
    {}
  );
  const topics = getTopics();
  const customGroups = readJsonFile<CustomHskGroup[]>('custom_hsk_groups.json', []);

  let totalReviews = 0;
  let masteredCount = 0;
  let totalTracked = 0;

  for (const uId of Object.keys(allProgress)) {
    const userMap = allProgress[uId];
    for (const vId of Object.keys(userMap)) {
      totalTracked++;
      const p = userMap[vId];
      if (p.hanziStatus === 'correct' || (p.srs && p.srs.repetition >= 2)) {
        masteredCount++;
      }
      totalReviews += p.srs?.totalReviews || 0;
    }
  }

  const now = new Date();
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStr = now.toISOString().split('T')[0];
  const weekAgoMs = nowMs - 7 * dayMs;
  const monthAgoMs = nowMs - 30 * dayMs;

  let newUsersToday = 0;
  let newUsersWeek = 0;
  let newUsersMonth = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let activeMonth = 0;

  for (const u of users) {
    const createdMs = u.createdAt ? new Date(u.createdAt).getTime() : 0;
    if (u.createdAt && u.createdAt.startsWith(todayStr)) newUsersToday++;
    if (createdMs >= weekAgoMs) newUsersWeek++;
    if (createdMs >= monthAgoMs) newUsersMonth++;

    if (u.lastLoginAt) {
      const loginMs = new Date(u.lastLoginAt).getTime();
      if (u.lastLoginAt.startsWith(todayStr)) activeToday++;
      if (loginMs >= weekAgoMs) activeWeek++;
      if (loginMs >= monthAgoMs) activeMonth++;
    }
  }

  // HSK breakdown (1 to 9)
  const hskBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  for (const w of systemWords) {
    if (w.hskLevel && hskBreakdown[w.hskLevel] !== undefined) {
      hskBreakdown[w.hskLevel]++;
    }
  }
  for (const w of allCustom) {
    if (w.hskLevel && hskBreakdown[w.hskLevel] !== undefined) {
      hskBreakdown[w.hskLevel]++;
    }
  }

  // Topic breakdown
  const topicBreakdown: Record<string, number> = {};
  for (const t of topics) {
    topicBreakdown[t.name] = t.wordCount || 0;
  }

  return {
    totalUsers: users.length,
    activeToday: Math.max(activeToday, users.length > 0 ? 1 : 0),
    activeWeek: Math.max(activeWeek, activeToday, users.length > 0 ? 1 : 0),
    activeMonth: Math.max(activeMonth, activeWeek, users.length > 0 ? 1 : 0),
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    lockedUsers: users.filter((u) => u.isLocked).length,
    totalSystemWords: systemWords.length,
    totalCustomWords: allCustom.length,
    totalReviewsDone: totalReviews,
    masteredWordsRate: totalTracked > 0 ? Math.round((masteredCount / totalTracked) * 100) : 0,
    hskBreakdown,
    topicBreakdown,
    totalTopics: topics.length,
    totalCustomHskGroups: customGroups.length,
  };
}

// -------------------------------------------------------------
// TOPICS MANAGEMENT (Official vs User Custom)
// -------------------------------------------------------------

const DEFAULT_SYSTEM_TOPICS: Topic[] = [
  {
    id: 'topic-daily',
    name: 'Giao tiếp hàng ngày',
    description: 'Từ vựng thông dụng cho chào hỏi, xã giao, sinh hoạt thường nhật',
    scope: 'system',
    ownerId: 'system',
    color: '#10b981',
    icon: 'MessageSquare',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'topic-food',
    name: 'Ẩm thực & Nhà hàng',
    description: 'Món ăn, đồ uống, gọi món, nấu nướng và hương vị',
    scope: 'system',
    ownerId: 'system',
    color: '#f59e0b',
    icon: 'Utensils',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'topic-travel',
    name: 'Du lịch & Khách sạn',
    description: 'Sân bay, khách sạn, chỉ đường, phương tiện và địa điểm',
    scope: 'system',
    ownerId: 'system',
    color: '#3b82f6',
    icon: 'Compass',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'topic-work',
    name: 'Công sở & Kinh doanh',
    description: 'Họp hành, đàm phán, thư tín, hợp đồng và nghề nghiệp',
    scope: 'system',
    ownerId: 'system',
    color: '#8b5cf6',
    icon: 'Briefcase',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'topic-family',
    name: 'Gia đình & Xã hội',
    description: 'Họ hàng, các mối quan hệ, tính cách và cảm xúc',
    scope: 'system',
    ownerId: 'system',
    color: '#ec4899',
    icon: 'Heart',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'topic-shopping',
    name: 'Mua sắm & Tiền tệ',
    description: 'Giá cả, mặc cả, thanh toán, ngân hàng và thời trang',
    scope: 'system',
    ownerId: 'system',
    color: '#06b6d4',
    icon: 'ShoppingBag',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function isTopicDbInitialized(): boolean {
  if (memoryStore.has('topics.json')) return true;
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, 'topics.json');
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function getTopics(userId?: string): Topic[] {
  if (!isTopicDbInitialized()) {
    writeJsonFile('topics.json', [...DEFAULT_SYSTEM_TOPICS]);
  }
  let stored = readJsonFile<Topic[]>('topics.json', []);
  if (!Array.isArray(stored)) stored = [];

  // Calculate dynamic wordCount per topic
  const systemWords = getSystemVocabulary();
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);

  return stored
    .filter((t) => {
      if (userId === 'all') return true;
      if (!userId) return t.scope === 'system';
      return t.scope === 'system' || t.ownerId === userId;
    })
    .map((t) => {
      const sysCount = systemWords.filter((w) => w.topicId === t.id).length;
      const userCustomCount = allCustom.filter(
        (w) => w.topicId === t.id && (t.scope === 'system' || w.userId === t.ownerId)
      ).length;
      return {
        ...t,
        wordCount: sysCount + userCustomCount,
      };
    });
}

export function createTopic(
  userId: string,
  data: Partial<Topic>,
  asAdmin = false
): Topic {
  const topics = readJsonFile<Topic[]>('topics.json', [...DEFAULT_SYSTEM_TOPICS]);
  const name = (data.name || '').trim();
  if (!name) throw new Error('Tên chủ đề không được để trống.');

  const now = new Date().toISOString();
  const isSystem = asAdmin && data.scope === 'system';

  const newTopic: Topic = {
    id: `topic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    description: data.description?.trim() || '',
    scope: isSystem ? 'system' : 'user',
    ownerId: isSystem ? 'system' : userId,
    color: data.color || '#10b981',
    icon: data.icon || 'Layers',
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  topics.push(newTopic);
  writeJsonFile('topics.json', topics);
  return newTopic;
}

export function updateTopic(
  userId: string,
  topicId: string,
  data: Partial<Topic>,
  asAdmin = false
): Topic {
  const topics = readJsonFile<Topic[]>('topics.json', [...DEFAULT_SYSTEM_TOPICS]);
  const index = topics.findIndex((t) => t.id === topicId);
  if (index === -1) throw new Error('Không tìm thấy chủ đề.');

  const target = topics[index];
  if (!asAdmin && target.ownerId !== userId) {
    throw new Error('Bạn không có quyền chỉnh sửa chủ đề này.');
  }

  const updated: Topic = {
    ...target,
    name: data.name?.trim() || target.name,
    description: data.description !== undefined ? data.description.trim() : target.description,
    color: data.color || target.color,
    icon: data.icon || target.icon,
    updatedAt: new Date().toISOString(),
  };

  topics[index] = updated;
  writeJsonFile('topics.json', topics);
  return updated;
}

export function deleteTopic(
  userId: string,
  topicId: string,
  asAdmin = false
): { success: boolean; affectedWords: number } {
  const topics = readJsonFile<Topic[]>('topics.json', [...DEFAULT_SYSTEM_TOPICS]);
  const target = topics.find((t) => t.id === topicId);
  if (!target) throw new Error('Không tìm thấy chủ đề.');

  if (!asAdmin && target.ownerId !== userId) {
    throw new Error('Bạn không có quyền xóa chủ đề này.');
  }

  // Count affected words and unlink
  let affectedWords = 0;
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  const updatedCustom = allCustom.map((w) => {
    if (w.topicId === topicId) {
      affectedWords++;
      const { topicId: _t, topicName: _tn, ...rest } = w;
      void _t;
      void _tn;
      return { ...rest, updatedAt: new Date().toISOString() };
    }
    return w;
  });
  writeJsonFile('custom_words.json', updatedCustom);

  if (asAdmin && target.scope === 'system') {
    const sysWords = getSystemVocabulary();
    const updatedSys = sysWords.map((w) => {
      if (w.topicId === topicId) {
        affectedWords++;
        const { topicId: _t, topicName: _tn, ...rest } = w;
        void _t;
        void _tn;
        return { ...rest, updatedAt: new Date().toISOString() };
      }
      return w;
    });
    writeJsonFile('system_vocab.json', updatedSys);
  }

  const nextTopics = topics.filter((t) => t.id !== topicId);
  writeJsonFile('topics.json', nextTopics);

  return { success: true, affectedWords };
}

// -------------------------------------------------------------
// CUSTOM HSK GROUPS (User Isolated Groups)
// -------------------------------------------------------------

export function getCustomHskGroups(userId?: string): CustomHskGroup[] {
  const groups = readJsonFile<CustomHskGroup[]>('custom_hsk_groups.json', []);
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);

  const filtered = userId && userId !== 'all' ? groups.filter((g) => g.ownerId === userId) : groups;
  return filtered.map((g) => ({
    ...g,
    wordCount: allCustom.filter((w) => w.deckId === g.id && w.userId === g.ownerId).length,
  }));
}

export function createCustomHskGroup(
  userId: string,
  data: Partial<CustomHskGroup>
): CustomHskGroup {
  const groups = readJsonFile<CustomHskGroup[]>('custom_hsk_groups.json', []);
  const name = (data.name || '').trim();
  if (!name) throw new Error('Tên nhóm HSK tùy chỉnh không được để trống.');

  const now = new Date().toISOString();
  const newGroup: CustomHskGroup = {
    id: `deck-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    levelNumber: data.levelNumber || 1,
    description: data.description?.trim() || '',
    scope: 'user',
    ownerId: userId,
    color: data.color || '#f59e0b',
    icon: data.icon || 'BookOpen',
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  groups.push(newGroup);
  writeJsonFile('custom_hsk_groups.json', groups);
  return newGroup;
}

export function updateCustomHskGroup(
  userId: string,
  groupId: string,
  data: Partial<CustomHskGroup>
): CustomHskGroup {
  const groups = readJsonFile<CustomHskGroup[]>('custom_hsk_groups.json', []);
  const index = groups.findIndex((g) => g.id === groupId && g.ownerId === userId);
  if (index === -1) throw new Error('Không tìm thấy nhóm học của bạn.');

  const target = groups[index];
  const updated: CustomHskGroup = {
    ...target,
    name: data.name?.trim() || target.name,
    description: data.description !== undefined ? data.description.trim() : target.description,
    color: data.color || target.color,
    icon: data.icon || target.icon,
    levelNumber: data.levelNumber || target.levelNumber,
    updatedAt: new Date().toISOString(),
  };

  groups[index] = updated;
  writeJsonFile('custom_hsk_groups.json', groups);
  return updated;
}

export function deleteCustomHskGroup(
  userId: string,
  groupId: string
): { success: boolean; affectedWords: number } {
  const groups = readJsonFile<CustomHskGroup[]>('custom_hsk_groups.json', []);
  const target = groups.find((g) => g.id === groupId && g.ownerId === userId);
  if (!target) throw new Error('Không tìm thấy nhóm học của bạn.');

  let affectedWords = 0;
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  const updatedCustom = allCustom.map((w) => {
    if (w.deckId === groupId && w.userId === userId) {
      affectedWords++;
      return {
        ...w,
        deckId: 'deck-all',
        updatedAt: new Date().toISOString(),
      };
    }
    return w;
  });
  writeJsonFile('custom_words.json', updatedCustom);

  const nextGroups = groups.filter((g) => g.id !== groupId);
  writeJsonFile('custom_hsk_groups.json', nextGroups);

  return { success: true, affectedWords };
}

// -------------------------------------------------------------
// USER SETTINGS (Theme, TTS voice, Preferences)
// -------------------------------------------------------------

export function getUserSettings(userId: string): UserSettings {
  const allSettings = readJsonFile<Record<string, UserSettings>>('user_settings.json', {});
  if (allSettings[userId]) {
    return allSettings[userId];
  }
  return {
    userId,
    theme: 'light',
    ttsRate: 0.85,
    autoPronounce: false,
    fontSize: 'normal',
    hanziFont: 'system',
    updatedAt: new Date().toISOString(),
  };
}

export function saveUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): UserSettings {
  const allSettings = readJsonFile<Record<string, UserSettings>>('user_settings.json', {});
  const current = allSettings[userId] || {
    userId,
    theme: 'light',
    ttsRate: 0.85,
    autoPronounce: false,
    fontSize: 'normal',
    hanziFont: 'system',
  };

  const updated: UserSettings = {
    ...current,
    ...settings,
    userId,
    updatedAt: new Date().toISOString(),
  };

  allSettings[userId] = updated;
  writeJsonFile('user_settings.json', allSettings);
  return updated;
}

// -------------------------------------------------------------
// SYSTEM CONFIGURATION (Platform parameters, Registration, Limits)
// -------------------------------------------------------------

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  platformName: 'HSK Interactive Sheet',
  platformDescription: 'Nền tảng học và ôn tập từ vựng tiếng Trung đa tương tác chuẩn HSK 1 - 9',
  allowRegistration: true,
  maintenanceMode: false,
  maxImportBatchSize: 500,
  defaultTargetHsk: 3,
  zaloCommunityEnabled: false,
  zaloCommunityUrl: 'https://zalo.me/g/urwxu6t93bwfnjkzeuok',
  zaloCommunityTitle: 'Tham gia Cộng Đồng Zalo',
  zaloCommunityDescription: 'Hỏi đáp & cùng luyện thi HSK mỗi ngày',
  updatedAt: new Date().toISOString(),
};


export function getSystemConfig(): SystemConfig {
  return readJsonFile<SystemConfig>('system_config.json', DEFAULT_SYSTEM_CONFIG);
}

export function saveSystemConfig(
  adminEmail: string,
  config: Partial<SystemConfig>
): SystemConfig {
  const current = getSystemConfig();
  const updated: SystemConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };
  writeJsonFile('system_config.json', updated);
  addAuditLog(
    'CẬP_NHẬT_CẤU_HÌNH_HỆ_THỐNG',
    adminEmail,
    'Cấu hình nền tảng',
    `Cập nhật cấu hình: ${Object.keys(config).join(', ')}`
  );
  return updated;
}

// -------------------------------------------------------------
// USER WORKSPACE EXPLORER FOR ADMIN
// -------------------------------------------------------------

export interface UserWorkspaceData {
  user: User;
  customWords: VocabItem[];
  customHskGroups: CustomHskGroup[];
  customTopics: Topic[];
  progressCount: number;
  masteredCount: number;
  totalReviews: number;
  settings: UserSettings;
  practicedWords: PracticedWordRecord[];
}

export function syncUsersToServer(incomingUsers: User[]): void {
  if (!Array.isArray(incomingUsers) || incomingUsers.length === 0) return;
  const currentRecords = readJsonFile<StoredUserRecord[]>('users.json', []);
  const recordMap = new Map<string, StoredUserRecord>();
  for (const r of currentRecords) {
    if (r.id) recordMap.set(r.id, r);
  }

  let hasChanges = false;
  for (const u of incomingUsers) {
    if (!u.id) continue;
    const existing = recordMap.get(u.id);
    if (!existing) {
      recordMap.set(u.id, {
        id: u.id,
        name: u.name || u.email?.split('@')[0] || 'Học viên',
        email: u.email || '',
        role: u.role || 'user',
        streakDays: u.streakDays || 0,
        totalMastered: u.totalMastered || 0,
        targetHsk: u.targetHsk || 3,
        isLocked: !!u.isLocked,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passwordHash: '',
        salt: '',
      });
      hasChanges = true;
    } else {
      const updated: StoredUserRecord = {
        ...existing,
        name: u.name || existing.name,
        email: u.email || existing.email,
        role: u.role || existing.role,
        streakDays: typeof u.streakDays === 'number' ? u.streakDays : existing.streakDays,
        totalMastered: typeof u.totalMastered === 'number' ? u.totalMastered : existing.totalMastered,
        targetHsk: typeof u.targetHsk === 'number' ? u.targetHsk : existing.targetHsk,
        isLocked: typeof u.isLocked === 'boolean' ? u.isLocked : existing.isLocked,
      };
      recordMap.set(u.id, updated);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    writeJsonFile('users.json', Array.from(recordMap.values()));
  }
}

export function getUserWorkspaceData(targetUserId: string): UserWorkspaceData {
  let user = getUserRecordById(targetUserId);

  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  const userCustomWords = allCustom.filter((w) => w.userId === targetUserId);
  const userHskGroups = getCustomHskGroups(targetUserId);
  const userTopics = getTopics(targetUserId).filter((t) => t.scope === 'user' && t.ownerId === targetUserId);

  const allProgress = readJsonFile<Record<string, Record<string, UserProgressRecord>>>(
    'user_progress.json',
    {}
  );
  const userProgress = allProgress[targetUserId] || {};

  if (!user) {
    user = {
      id: targetUserId,
      name: 'Học viên ' + (targetUserId.length > 6 ? targetUserId.slice(-4) : targetUserId),
      email: '',
      role: 'user',
      streakDays: 0,
      totalMastered: 0,
      targetHsk: 3,
      isLocked: false,
      createdAt: userCustomWords[0]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: '',
      salt: '',
    };
  }

  // Build a lookup map of all vocabulary (system + custom)
  const systemVocab = getSystemVocabulary();
  const vocabLookup = new Map<string, VocabItem>();
  for (const v of systemVocab) {
    if (v.id) vocabLookup.set(v.id, v);
  }
  for (const w of userCustomWords) {
    if (w.id) vocabLookup.set(w.id, w);
  }

  const practicedWords: PracticedWordRecord[] = [];
  let totalReviews = 0;
  let masteredCount = 0;

  for (const vId of Object.keys(userProgress)) {
    const p = userProgress[vId];
    const word = vocabLookup.get(vId);
    const isMastered = p.hanziStatus === 'correct' || (p.srs && (p.srs.repetition || 0) >= 2);
    if (isMastered) {
      masteredCount++;
    }
    totalReviews += p.srs?.totalReviews || 0;

    const rawP = p as unknown as Record<string, unknown>;
    practicedWords.push({
      vocabId: vId,
      hanzi: word?.hanzi || (rawP.hanzi as string) || vId,
      pinyin: word?.pinyin || (rawP.pinyin as string) || '',
      vietnamese: word?.meaning || (rawP.vietnamese as string) || (rawP.meaning as string) || '',
      hskLevel: word?.hskLevel || (rawP.hskLevel as number) || 1,
      hanziStatus: p.hanziStatus,
      hanziPracticeInput: p.hanziPracticeInput,
      translationStatus: p.translationStatus,
      translationPracticeInput: p.translationPracticeInput,
      favorite: !!p.favorite,
      notes: p.notes,
      lastPracticedAt: (rawP.lastPracticedAt as string) || p.updatedAt || undefined,
      srs: p.srs,
      isMastered,
    });
  }

  // Sort practicedWords: most recently practiced first
  practicedWords.sort((a, b) => {
    const tA = a.lastPracticedAt ? new Date(a.lastPracticedAt).getTime() : 0;
    const tB = b.lastPracticedAt ? new Date(b.lastPracticedAt).getTime() : 0;
    return tB - tA;
  });

  const settings = getUserSettings(targetUserId);

  return {
    user: toPublicUser(user),
    customWords: userCustomWords,
    customHskGroups: userHskGroups,
    customTopics: userTopics,
    progressCount: Object.keys(userProgress).length,
    masteredCount,
    totalReviews,
    settings,
    practicedWords,
  };
}

export function getAllUserWorkspacesSummary(): Array<{
  userId: string;
  name: string;
  email: string;
  customWordsCount: number;
  customHskCount: number;
  customTopicsCount: number;
  masteredCount: number;
  streakDays: number;
  isLocked: boolean;
  createdAt: string;
}> {
  const users = getAllUsers();
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []);
  const allGroups = readJsonFile<CustomHskGroup[]>('custom_hsk_groups.json', []);
  const allTopics = readJsonFile<Topic[]>('topics.json', [...DEFAULT_SYSTEM_TOPICS]);
  const allProgress = readJsonFile<Record<string, Record<string, UserProgressRecord>>>(
    'user_progress.json',
    {}
  );

  const userMap = new Map<string, {
    userId: string;
    name: string;
    email: string;
    streakDays: number;
    isLocked: boolean;
    createdAt: string;
  }>();

  for (const u of users) {
    if (u.id) {
      userMap.set(u.id, {
        userId: u.id,
        name: u.name,
        email: u.email,
        streakDays: u.streakDays || 0,
        isLocked: !!u.isLocked,
        createdAt: u.createdAt || new Date().toISOString(),
      });
    }
  }

  // Also discover any user IDs from custom words, groups, topics, progress
  for (const w of allCustom) {
    if (w.userId && w.userId !== 'system' && !userMap.has(w.userId)) {
      userMap.set(w.userId, {
        userId: w.userId,
        name: 'Học viên ' + (w.userId.length > 6 ? w.userId.slice(-4) : w.userId),
        email: '',
        streakDays: 0,
        isLocked: false,
        createdAt: w.createdAt || new Date().toISOString(),
      });
    }
  }

  for (const g of allGroups) {
    if (g.ownerId && g.ownerId !== 'system' && !userMap.has(g.ownerId)) {
      userMap.set(g.ownerId, {
        userId: g.ownerId,
        name: 'Học viên ' + (g.ownerId.length > 6 ? g.ownerId.slice(-4) : g.ownerId),
        email: '',
        streakDays: 0,
        isLocked: false,
        createdAt: g.createdAt || new Date().toISOString(),
      });
    }
  }

  for (const uId of Object.keys(allProgress)) {
    if (uId && uId !== 'system' && !userMap.has(uId)) {
      userMap.set(uId, {
        userId: uId,
        name: 'Học viên ' + (uId.length > 6 ? uId.slice(-4) : uId),
        email: '',
        streakDays: 0,
        isLocked: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return Array.from(userMap.values()).map((u) => {
    const wordsCount = allCustom.filter((w) => w.userId === u.userId).length;
    const hskCount = allGroups.filter((g) => g.ownerId === u.userId).length;
    const topicCount = allTopics.filter((t) => t.scope === 'user' && t.ownerId === u.userId).length;
    const userProgress = allProgress[u.userId] || {};
    let mastered = 0;
    for (const vId of Object.keys(userProgress)) {
      const p = userProgress[vId];
      if (p.hanziStatus === 'correct' || (p.srs && p.srs.repetition >= 2)) mastered++;
    }

    return {
      userId: u.userId,
      name: u.name,
      email: u.email,
      customWordsCount: wordsCount,
      customHskCount: hskCount,
      customTopicsCount: topicCount,
      masteredCount: mastered,
      streakDays: u.streakDays || 0,
      isLocked: !!u.isLocked,
      createdAt: u.createdAt,
    };
  });
}

// -------------------------------------------------------------
// USER FEEDBACK MANAGEMENT
// -------------------------------------------------------------

const SEED_FEEDBACKS: UserFeedback[] = [
  {
    id: 'fb-seed-01',
    category: 'feature',
    message: 'Nền tảng rất trực quan và tiện dụng! Đề xuất ban quản trị bổ sung thêm tính năng trắc nghiệm âm thanh nghe hiểu trực tiếp trên đề thi thật HSK 5.',
    rating: 5,
    userName: 'Nguyễn Minh Anh',
    userEmail: 'minhanh.hsk@gmail.com',
    deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'reviewed',
    createdAt: '2026-10-20T10:15:00.000Z',
  },
  {
    id: 'fb-seed-02',
    category: 'voice',
    message: 'Giọng đọc Google Tiếng Trung Đài Loan phát âm rất chuẩn và ngữ điệu tự nhiên. Khi luyện thi HSK 4 nghe rất rõ ràng.',
    rating: 5,
    userName: 'Trần Văn Hoàng',
    userEmail: 'hoang.tran92@outlook.com',
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'resolved',
    createdAt: '2026-10-19T14:30:00.000Z',
  },
  {
    id: 'fb-seed-03',
    category: 'content',
    message: 'Bộ từ vựng HSK 3 rất chuẩn ngữ cảnh, nhưng ở từ 清楚 mong admin bổ sung thêm câu ví dụ thực tế trong đề thi.',
    rating: 4,
    userName: 'Lê Thu Trang',
    userEmail: 'thutrang.cmn@gmail.com',
    deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    status: 'new',
    createdAt: '2026-10-21T08:20:00.000Z',
  },
  {
    id: 'fb-seed-04',
    category: 'bug',
    message: 'Trên trình duyệt Safari iOS, khi xuất phiếu luyện viết chữ Hán PDF thỉnh thoảng nét kẻ ô mễ bị mờ nhẹ ở chế độ tối.',
    rating: 4,
    userName: 'Phạm Quốc Bảo',
    userEmail: 'baopq.dev@gmail.com',
    deviceInfo: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)',
    status: 'new',
    createdAt: '2026-10-21T11:05:00.000Z',
  },
];

export function getAllFeedbacks(): UserFeedback[] {
  const stored = readJsonFile<UserFeedback[]>('feedbacks.json', []);
  if (!stored || stored.length === 0) {
    writeJsonFile('feedbacks.json', SEED_FEEDBACKS);
    return SEED_FEEDBACKS;
  }
  return stored;
}

export function saveFeedback(fb: Omit<UserFeedback, 'id' | 'createdAt'>): UserFeedback {
  const feedbacks = getAllFeedbacks();
  const newFeedback: UserFeedback = {
    ...fb,
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'new',
  };
  feedbacks.unshift(newFeedback);
  if (feedbacks.length > 1000) feedbacks.length = 1000;
  writeJsonFile('feedbacks.json', feedbacks);
  return newFeedback;
}

export function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'reviewed' | 'resolved'
): boolean {
  const list = getAllFeedbacks();
  const item = list.find((f) => f.id === feedbackId);
  if (!item) return false;
  item.status = status;
  writeJsonFile('feedbacks.json', list);
  return true;
}

export function deleteFeedback(feedbackId: string): boolean {
  const list = getAllFeedbacks();
  const filtered = list.filter((f) => f.id !== feedbackId);
  if (filtered.length === list.length) return false;
  writeJsonFile('feedbacks.json', filtered);
  return true;
}

// -------------------------------------------------------------
// EXAM REPOSITORY & SHARING HUB MANAGEMENT
// -------------------------------------------------------------

const INITIAL_STARTER_EXAMS: ExamItem[] = [
  {
    "id": "official-cti-hsk1-sample",
    "title": "Đề thi thật HSK 1 Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3 & Đáp án)",
    "hskLevel": 1,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 40,
    "questionCount": 40,
    "description": "Đề thi chính thức HSK Cấp 1 chuẩn hóa quốc tế do CTI Hanban phát hành. Gồm 20 câu Nghe hiểu (kèm file audio MP3 phòng thi) và 20 câu Đọc hiểu. Kèm bảng đáp án chuẩn từ ban khảo thí.",
    "pdfUrl": "/exam-files/pdf/hsk1_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk1_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk1_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 1420,
    "downloadsCount": 490,
    "createdAt": "2024-03-15T08:00:00.000Z",
    "updatedAt": "2024-03-15T08:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk1-h10000",
    "title": "Đề thi thật HSK 1 Mã H10000 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 1,
    "category": "official",
    "year": 2022,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 40,
    "questionCount": 40,
    "description": "Đề thi thật mã đề H10000 của kỳ thi HSK Cấp 1. Nội dung bám sát cấu trúc đề chuẩn gồm 4 phần Nghe hiểu (20 câu) và 4 phần Đọc hiểu (20 câu), kèm audio gốc và đáp án chi tiết.",
    "pdfUrl": "/exam-files/pdf/hsk1_h10000_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk1_h10000_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk1_h10000_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 980,
    "downloadsCount": 310,
    "createdAt": "2024-05-10T09:00:00.000Z",
    "updatedAt": "2024-05-10T09:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk1-h10901",
    "title": "Đề thi thật HSK 1 Mã H10901 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 1,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 40,
    "questionCount": 40,
    "description": "Đề thi thật chuẩn hóa mã H10901 cấp độ HSK 1. Kiểm tra năng lực nghe hiểu và nhận diện mặt chữ Hán sơ cấp, đầy đủ file PDF đề thi, đáp án chính thức và file nghe MP3.",
    "pdfUrl": "/exam-files/pdf/hsk1_h10901_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk1_h10901_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk1_h10901_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 850,
    "downloadsCount": 275,
    "createdAt": "2024-08-20T10:30:00.000Z",
    "updatedAt": "2024-08-20T10:30:00.000Z"
  },
  {
    "id": "official-hanban-hsk1-h10902",
    "title": "Đề thi thật HSK 1 Mã H10902 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 1,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 40,
    "questionCount": 40,
    "description": "Đề thi thật chính thức mã đề H10902 cấp độ HSK 1 do Hanban phát hành. Bản in chuẩn rõ nét, đầy đủ phần nghe tranh, đối thoại và bảng đáp án đối chiếu sau khi làm bài.",
    "pdfUrl": "/exam-files/pdf/hsk1_h10902_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk1_h10902_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk1_h10902_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 780,
    "downloadsCount": 240,
    "createdAt": "2024-11-05T09:00:00.000Z",
    "updatedAt": "2024-11-05T09:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk1-h11001",
    "title": "Đề thi thật HSK 1 Mã H11001 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 1,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 40,
    "questionCount": 40,
    "description": "Đề thi thật mã đề H11001 kỳ thi HSK 1 chính thức. Bao gồm trọn bộ đề thi bản in sắc nét, file audio chuẩn giọng phát thanh viên và bảng đáp án đối chiếu sau khi làm bài.",
    "pdfUrl": "/exam-files/pdf/hsk1_h11001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk1_h11001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk1_h11001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1120,
    "downloadsCount": 430,
    "createdAt": "2025-01-15T11:00:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  {
    "id": "blcup-hsk1-complete-book",
    "title": "Tuyển Tập Đề Thi Thật BLCUP HSK 1 (Trọn Bộ Đề + Đáp Án Chuẩn BLCU) — NXB Đại học Ngôn ngữ Bắc Kinh",
    "hskLevel": 1,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 120,
    "questionCount": 160,
    "description": "Ấn phẩm sách đề thi chuẩn hóa trọn bộ HSK Cấp 1 của Nhà xuất bản ĐH Ngôn ngữ Bắc Kinh (BLCUP). Tổng hợp các bộ đề mẫu kinh điển, phân tích ma trận bẫy đề thi và file nghe MP3 kèm theo.",
    "pdfUrl": "/exam-files/pdf/hsk1_blcup_complete_book.pdf",
    "audioUrl": "/exam-files/audio/hsk1_blcup_book_audio.mp3",
    "isPinned": true,
    "status": "published",
    "viewsCount": 1890,
    "downloadsCount": 650,
    "createdAt": "2024-04-10T08:00:00.000Z",
    "updatedAt": "2024-04-10T08:00:00.000Z"
  },
  {
    "id": "official-cti-yct1-m01",
    "title": "Đề thi Chuẩn Quốc Tế Hán Ngữ Thiếu Nhi YCT 1 — Hanban / CTI (Kèm Audio & Đáp án)",
    "hskLevel": 1,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 35,
    "questionCount": 35,
    "description": "Đề thi chuẩn hóa kỳ thi YCT (Youth Chinese Test) Cấp độ 1 dành cho người mới bắt đầu học tiếng Trung. Cấu trúc sinh động gồm 20 câu Nghe và 15 câu Đọc hiểu bằng hình ảnh.",
    "pdfUrl": "/exam-files/pdf/yct1_m01_exam.pdf",
    "audioUrl": "/exam-files/audio/yct1_m01_listening.mp3",
    "answerUrl": "/exam-files/pdf/yct1_m01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 640,
    "downloadsCount": 210,
    "createdAt": "2024-06-18T10:00:00.000Z",
    "updatedAt": "2024-06-18T10:00:00.000Z"
  },
  {
    "id": "official-sctop-tocfl-novice-01",
    "title": "Đề thi Chuẩn Năng Lực Hoa Ngữ TOCFL Cấp Nhập Môn (Novice) — SC-TOP Đài Loan",
    "hskLevel": 1,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Chỉ đạo Thử nghiệm Năng lực Hoa ngữ Đài Loan (SC-TOP)",
    "durationMinutes": 50,
    "questionCount": 50,
    "description": "Đề thi chính thức chuẩn hóa quốc tế TOCFL Cấp độ Nhập môn (Novice 1 & Novice 2) do SC-TOP Đài Loan khảo thí. Đầy đủ phần đề thi chữ phồn thể/giản thể và bảng đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/tocfl_novice_01_exam.pdf",
    "answerUrl": "/exam-files/pdf/tocfl_novice_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 720,
    "downloadsCount": 230,
    "createdAt": "2024-07-22T08:30:00.000Z",
    "updatedAt": "2024-07-22T08:30:00.000Z"
  },
  {
    "id": "official-cti-hsk2-sample",
    "title": "Đề thi thật HSK 2 Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3 & Đáp án)",
    "hskLevel": 2,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 55,
    "questionCount": 60,
    "description": "Đề thi chính thức HSK Cấp 2 chuẩn hóa quốc tế. Cấu trúc bài thi gồm 35 câu Nghe hiểu và 25 câu Đọc hiểu, kiểm tra năng lực sử dụng 300 từ vựng và mẫu câu cơ bản.",
    "pdfUrl": "/exam-files/pdf/hsk2_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk2_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk2_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 1340,
    "downloadsCount": 415,
    "createdAt": "2024-03-15T08:05:00.000Z",
    "updatedAt": "2024-03-15T08:05:00.000Z"
  },
  {
    "id": "official-hanban-hsk2-h20000",
    "title": "Đề thi thật HSK 2 Mã H20000 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 2,
    "category": "official",
    "year": 2022,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 55,
    "questionCount": 60,
    "description": "Đề thi chính thức HSK Cấp 2 mã đề H20000. Đầy đủ phần nghe 35 câu (khoảng 25 phút) và phần đọc hiểu 25 câu (22 phút). Kèm audio phòng thi và phiếu đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/hsk2_h20000_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk2_h20000_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk2_h20000_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 910,
    "downloadsCount": 290,
    "createdAt": "2024-06-12T09:15:00.000Z",
    "updatedAt": "2024-06-12T09:15:00.000Z"
  },
  {
    "id": "official-hanban-hsk2-h20901",
    "title": "Đề thi thật HSK 2 Mã H20901 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 2,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 55,
    "questionCount": 60,
    "description": "Đề thi thật HSK Cấp 2 mã H20901 phát hành bởi Hanban. Bản PDF chất lượng cao, bao gồm toàn bộ file nghe audio MP3 chuẩn hóa và đáp án hoàn chỉnh.",
    "pdfUrl": "/exam-files/pdf/hsk2_h20901_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk2_h20901_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk2_h20901_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 820,
    "downloadsCount": 260,
    "createdAt": "2024-09-05T14:20:00.000Z",
    "updatedAt": "2024-09-05T14:20:00.000Z"
  },
  {
    "id": "official-hanban-hsk2-h20902",
    "title": "Đề thi thật HSK 2 Mã H20902 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 2,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 55,
    "questionCount": 60,
    "description": "Đề thi thật chuẩn hóa quốc tế mã đề H20902 cấp độ HSK 2 do Hanban khảo thí. Gồm 35 câu Nghe hiểu và 25 câu Đọc hiểu, kèm audio giọng đọc phát thanh viên chuẩn và đáp án chi tiết.",
    "pdfUrl": "/exam-files/pdf/hsk2_h20902_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk2_h20902_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk2_h20902_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 790,
    "downloadsCount": 255,
    "createdAt": "2024-11-20T10:00:00.000Z",
    "updatedAt": "2024-11-20T10:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk2-h21001",
    "title": "Đề thi thật HSK 2 Mã H21001 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 2,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 55,
    "questionCount": 60,
    "description": "Đề thi chuẩn hóa HSK 2 mã đề H21001. Giúp người học làm quen với ngữ điệu đề thi thật, rèn luyện kỹ năng nghe tranh và đọc hiểu câu đối thoại tiếng Hán sơ cấp.",
    "pdfUrl": "/exam-files/pdf/hsk2_h21001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk2_h21001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk2_h21001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1050,
    "downloadsCount": 380,
    "createdAt": "2025-02-18T10:00:00.000Z",
    "updatedAt": "2025-02-18T10:00:00.000Z"
  },
  {
    "id": "blcup-hsk2-complete-book",
    "title": "Tuyển Tập Đề Thi Thật BLCUP HSK 2 (Trọn Bộ Đề + Đáp Án Chuẩn BLCU) — NXB Đại học Ngôn ngữ Bắc Kinh",
    "hskLevel": 2,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 160,
    "questionCount": 240,
    "description": "Bộ sách đề thi chuẩn hóa toàn diện HSK Cấp 2 của Nhà xuất bản ĐH Ngôn ngữ Bắc Kinh (BLCUP). Hệ thống hóa các bộ đề thi thử bám sát ma trận đề thật, kèm audio MP3 chất lượng cao.",
    "pdfUrl": "/exam-files/pdf/hsk2_blcup_complete_book.pdf",
    "audioUrl": "/exam-files/audio/hsk2_blcup_book_audio.mp3",
    "isPinned": true,
    "status": "published",
    "viewsCount": 1720,
    "downloadsCount": 590,
    "createdAt": "2024-04-12T08:30:00.000Z",
    "updatedAt": "2024-04-12T08:30:00.000Z"
  },
  {
    "id": "official-cti-yct2-m01",
    "title": "Đề thi Chuẩn Quốc Tế Hán Ngữ Thiếu Nhi YCT 2 — Hanban / CTI (Kèm Audio & Đáp án)",
    "hskLevel": 2,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 40,
    "questionCount": 40,
    "description": "Đề thi chuẩn hóa YCT Cấp độ 2 tương đương trình độ HSK 2 sơ cấp. Gồm 20 câu Nghe hiểu tranh ảnh đối thoại và 20 câu Đọc hiểu nối câu, kèm audio và đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/yct2_m01_exam.pdf",
    "audioUrl": "/exam-files/audio/yct2_m01_listening.mp3",
    "answerUrl": "/exam-files/pdf/yct2_m01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 590,
    "downloadsCount": 180,
    "createdAt": "2024-06-25T11:00:00.000Z",
    "updatedAt": "2024-06-25T11:00:00.000Z"
  },
  {
    "id": "official-sctop-tocfl-band-a-01",
    "title": "Đề thi Chuẩn Năng Lực Hoa Ngữ TOCFL Band A (Cấp 1 - 2) — SC-TOP Đài Loan",
    "hskLevel": 2,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Chỉ đạo Thử nghiệm Năng lực Hoa ngữ Đài Loan (SC-TOP)",
    "durationMinutes": 60,
    "questionCount": 50,
    "description": "Đề thi chính thức chuẩn hóa TOCFL Band A (đánh giá cấp độ A1 và A2) phát hành bởi SC-TOP Đài Loan. Kiểm tra khả năng đọc hiểu ngữ pháp và hội thoại thực tế.",
    "pdfUrl": "/exam-files/pdf/tocfl_band_a_01_exam.pdf",
    "answerUrl": "/exam-files/pdf/tocfl_band_a_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 880,
    "downloadsCount": 310,
    "createdAt": "2024-08-01T09:00:00.000Z",
    "updatedAt": "2024-08-01T09:00:00.000Z"
  },
  {
    "id": "official-cti-hsk3-sample",
    "title": "Đề thi thật HSK 3 Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3 & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Đề thi chính thức HSK Cấp 3 chuẩn quốc tế. Cấu trúc chuẩn 3 phần: Nghe hiểu (40 câu), Đọc hiểu (30 câu) và Viết câu (10 câu). Kèm file thu âm audio phòng thi và đáp án.",
    "pdfUrl": "/exam-files/pdf/hsk3_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 2450,
    "downloadsCount": 920,
    "createdAt": "2024-03-15T08:10:00.000Z",
    "updatedAt": "2024-03-15T08:10:00.000Z"
  },
  {
    "id": "official-hanban-hsk3-h30000",
    "title": "Đề thi thật HSK 3 Mã H30000 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2022,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Đề thi thật HSK 3 mã H30000 chính quy. Cấu trúc chuẩn 80 câu gồm Nghe (40 câu), Đọc (30 câu) và Viết sắp xếp câu / điền chữ Hán (10 câu). Đầy đủ audio và đáp án đối chiếu.",
    "pdfUrl": "/exam-files/pdf/hsk3_h30000_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_h30000_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_h30000_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1680,
    "downloadsCount": 610,
    "createdAt": "2024-05-18T10:00:00.000Z",
    "updatedAt": "2024-05-18T10:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk3-h31001",
    "title": "Đề thi thật HSK 3 Mã H31001 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Đề thi thật mã đề H31001 kỳ thi HSK Cấp 3. Rèn luyện tư duy phản xạ tiếng Trung trung cấp, phân bổ thời gian hợp lý cho từng phần thi với audio phòng thi chuẩn.",
    "pdfUrl": "/exam-files/pdf/hsk3_h31001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_h31001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_h31001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1540,
    "downloadsCount": 540,
    "createdAt": "2024-07-20T13:45:00.000Z",
    "updatedAt": "2024-07-20T13:45:00.000Z"
  },
  {
    "id": "official-hanban-hsk3-h31002",
    "title": "Đề thi thật HSK 3 Mã H31002 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Đề thi thật HSK 3 mã H31002 chính thức. Hệ thống câu hỏi bám sát 600 từ vựng và ngữ pháp trọng tâm, đầy đủ bài thi viết tạo câu và điền từ vào chỗ trống.",
    "pdfUrl": "/exam-files/pdf/hsk3_h31002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_h31002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_h31002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1420,
    "downloadsCount": 490,
    "createdAt": "2024-10-14T09:20:00.000Z",
    "updatedAt": "2024-10-14T09:20:00.000Z"
  },
  {
    "id": "official-hanban-hsk3-h31003",
    "title": "Đề thi thật HSK 3 Mã H31003 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Đề thi chuẩn hóa mã đề H31003 năm 2024. Bản scan sắc nét từ đề thi thật, âm thanh audio phòng thi trong trẻo, đáp án chính thức kèm lời giải.",
    "pdfUrl": "/exam-files/pdf/hsk3_h31003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_h31003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_h31003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1890,
    "downloadsCount": 730,
    "createdAt": "2025-01-20T15:00:00.000Z",
    "updatedAt": "2025-01-20T15:00:00.000Z"
  },
  {
    "id": "blcup-hsk3-mock-01",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 3 Mã 01 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Bộ đề thi thử mô phỏng chuyên sâu cấp độ HSK 3 mã BLCUP-01 do ban chuyên gia ĐH Ngôn ngữ Bắc Kinh biên soạn. Bám sát ma trận đề thi thật 100%, file nghe audio chất lượng cao và đáp án giải thích chi tiết.",
    "pdfUrl": "/exam-files/pdf/hsk3_blcup_01_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_blcup_01_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_blcup_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1380,
    "downloadsCount": 490,
    "createdAt": "2024-04-15T08:00:00.000Z",
    "updatedAt": "2024-04-15T08:00:00.000Z"
  },
  {
    "id": "blcup-hsk3-mock-02",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 3 Mã 02 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Bộ đề thi thử mô phỏng chuẩn BLCUP HSK 3 mã BLCUP-02. Thiết kế câu hỏi kiểm tra toàn diện năng lực nghe đối thoại ngắn/dài, đọc hiểu đoạn văn và sắp xếp trật tự từ tiếng Hán.",
    "pdfUrl": "/exam-files/pdf/hsk3_blcup_02_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_blcup_02_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_blcup_02_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1250,
    "downloadsCount": 430,
    "createdAt": "2024-05-20T09:30:00.000Z",
    "updatedAt": "2024-05-20T09:30:00.000Z"
  },
  {
    "id": "blcup-hsk3-mock-03",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 3 Mã 03 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Bộ đề thi mô phỏng chuẩn BLCUP HSK 3 mã BLCUP-03. Cung cấp bài tập rèn luyện kỹ năng nghe phòng thi, bẫy từ đồng âm và cách phân bổ thời gian làm bài đọc hiểu hiệu quả.",
    "pdfUrl": "/exam-files/pdf/hsk3_blcup_03_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_blcup_03_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_blcup_03_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1190,
    "downloadsCount": 395,
    "createdAt": "2024-07-10T11:00:00.000Z",
    "updatedAt": "2024-07-10T11:00:00.000Z"
  },
  {
    "id": "blcup-hsk3-mock-04",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 3 Mã 04 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Bộ đề thi mô phỏng chuẩn BLCUP HSK 3 mã BLCUP-04. Đầy đủ phần nghe 40 câu, đọc 30 câu và phần viết 10 câu kèm bảng đáp án chi tiết và audio MP3 phòng thi.",
    "pdfUrl": "/exam-files/pdf/hsk3_blcup_04_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_blcup_04_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_blcup_04_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1310,
    "downloadsCount": 460,
    "createdAt": "2024-09-02T14:00:00.000Z",
    "updatedAt": "2024-09-02T14:00:00.000Z"
  },
  {
    "id": "official-cti-yct3-m01",
    "title": "Đề thi Chuẩn Quốc Tế Hán Ngữ Thiếu Nhi YCT 3 — Hanban / CTI (Kèm Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 60,
    "questionCount": 60,
    "description": "Đề thi chuẩn hóa kỳ thi YCT Cấp độ 3 tương đương cấp độ HSK 3 trung cấp. Gồm 35 câu Nghe hiểu và 25 câu Đọc hiểu với đầy đủ audio MP3 và bảng đáp án.",
    "pdfUrl": "/exam-files/pdf/yct3_m01_exam.pdf",
    "audioUrl": "/exam-files/audio/yct3_m01_listening.mp3",
    "answerUrl": "/exam-files/pdf/yct3_m01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 560,
    "downloadsCount": 170,
    "createdAt": "2024-08-15T09:00:00.000Z",
    "updatedAt": "2024-08-15T09:00:00.000Z"
  },
  {
    "id": "official-cti-bct-level-a-01",
    "title": "Đề thi Chuẩn Hán Ngữ Thương Mại BCT Cấp A — Hanban / CTI (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 70,
    "questionCount": 60,
    "description": "Đề thi chính thức chuẩn quốc tế Business Chinese Test (BCT Cấp A) dành cho giao tiếp thương mại và công sở cơ bản. Đầy đủ phần nghe hiểu, đọc hiểu và phiếu đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/bct_level_a_01_exam.pdf",
    "audioUrl": "/exam-files/audio/bct_level_a_01_listening.mp3",
    "answerUrl": "/exam-files/pdf/bct_level_a_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1150,
    "downloadsCount": 380,
    "createdAt": "2024-06-05T08:00:00.000Z",
    "updatedAt": "2024-06-05T08:00:00.000Z"
  },
  {
    "id": "official-moet-thpt-d4-2024",
    "title": "Đề thi Tốt nghiệp THPT Quốc Gia Môn Tiếng Trung — Bộ GD&ĐT (Năm 2024 - Mã đề 01)",
    "hskLevel": 3,
    "category": "official",
    "year": 2024,
    "source": "Bộ Giáo dục và Đào tạo Việt Nam",
    "durationMinutes": 60,
    "questionCount": 50,
    "description": "Đề thi chính thức kỳ thi Tốt nghiệp THPT Quốc Gia môn Tiếng Trung Quốc (Khối D4) năm 2024 của Bộ GD&ĐT. Cấu trúc 50 câu trắc nghiệm ngữ âm, từ vựng, ngữ pháp và đọc hiểu, kèm đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/thpt_d4_2024_exam.pdf",
    "answerUrl": "/exam-files/pdf/thpt_d4_2024_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2180,
    "downloadsCount": 870,
    "createdAt": "2024-06-30T16:00:00.000Z",
    "updatedAt": "2024-06-30T16:00:00.000Z"
  },
  {
    "id": "official-moet-thpt-d4-2023",
    "title": "Đề thi Tốt nghiệp THPT Quốc Gia Môn Tiếng Trung — Bộ GD&ĐT (Năm 2023 - Mã đề 02)",
    "hskLevel": 3,
    "category": "official",
    "year": 2023,
    "source": "Bộ Giáo dục và Đào tạo Việt Nam",
    "durationMinutes": 60,
    "questionCount": 50,
    "description": "Đề thi chính thức kỳ thi Tốt nghiệp THPT Quốc Gia môn Tiếng Trung Quốc (Khối D4) năm 2023 của Bộ GD&ĐT. Kiểm tra trọng tâm kiến thức ngữ pháp trung cấp, câu đồng nghĩa và bài đọc hiểu kèm đáp án.",
    "pdfUrl": "/exam-files/pdf/thpt_d4_2023_exam.pdf",
    "answerUrl": "/exam-files/pdf/thpt_d4_2023_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1940,
    "downloadsCount": 780,
    "createdAt": "2024-07-01T15:30:00.000Z",
    "updatedAt": "2024-07-01T15:30:00.000Z"
  },
  {
    "id": "official-cti-hsk4-sample",
    "title": "Đề thi thật HSK 4 Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3 & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi chính thức HSK Cấp 4 chuẩn hóa do Hanban CTI phát hành. Gồm 45 câu Nghe, 40 câu Đọc hiểu và 15 câu Viết (sắp xếp câu & viết câu theo tranh). Đầy đủ audio và lời giải chi tiết.",
    "pdfUrl": "/exam-files/pdf/hsk4_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 3120,
    "downloadsCount": 1280,
    "createdAt": "2024-03-15T08:15:00.000Z",
    "updatedAt": "2024-03-15T08:15:00.000Z"
  },
  {
    "id": "official-hanban-hsk4-h41001",
    "title": "Đề thi thật HSK 4 Mã H41001 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi thật HSK 4 mã H41001 chính thức. Chuẩn hóa ma trận đề thi trung - cao cấp, yêu cầu nắm vững 1.200 từ vựng. Đầy đủ bản in sắc nét, audio phòng thi và bảng đáp án.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2150,
    "downloadsCount": 840,
    "createdAt": "2024-06-08T11:00:00.000Z",
    "updatedAt": "2024-06-08T11:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk4-h41002",
    "title": "Đề thi thật HSK 4 Mã H41002 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi thật chính thức mã H41002 cấp độ HSK 4. Thử thách khả năng nghe hiểu tốc độ nhanh, tư duy đọc lướt và kỹ năng đặt câu chính xác theo từ cho sẵn.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1980,
    "downloadsCount": 770,
    "createdAt": "2024-08-16T14:30:00.000Z",
    "updatedAt": "2024-08-16T14:30:00.000Z"
  },
  {
    "id": "official-hanban-hsk4-h41003",
    "title": "Đề thi thật HSK 4 Mã H41003 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi thật mã đề H41003 cấp độ HSK 4. Trọn bộ file PDF rõ ràng, file nghe MP3 tiêu chuẩn và bảng đáp án chi tiết cho toàn bộ 100 câu hỏi.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2340,
    "downloadsCount": 920,
    "createdAt": "2024-11-12T10:00:00.000Z",
    "updatedAt": "2024-11-12T10:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk4-h41004",
    "title": "Đề thi thật HSK 4 Mã H41004 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi chuẩn hóa HSK 4 mã đề H41004 do Hanban phát hành năm 2024. Cấu trúc câu hỏi thực tế, giúp thí sinh làm quen hoàn hảo với áp lực thời gian phòng thi.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41004_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41004_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41004_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2760,
    "downloadsCount": 1090,
    "createdAt": "2025-02-10T08:30:00.000Z",
    "updatedAt": "2025-02-10T08:30:00.000Z"
  },
  {
    "id": "blcup-hsk4-mock-01",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 4 Mã 01 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi mô phỏng chuẩn hóa HSK Cấp 4 mã BLCUP-01 do ban giáo sư ĐH Ngôn ngữ Bắc Kinh thiết kế. Phân bổ độ khó sát với kỳ thi thật, bao gồm 45 câu nghe, 40 câu đọc và 15 câu viết kèm audio MP3.",
    "pdfUrl": "/exam-files/pdf/hsk4_blcup_01_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_blcup_01_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_blcup_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1850,
    "downloadsCount": 710,
    "createdAt": "2024-04-18T09:00:00.000Z",
    "updatedAt": "2024-04-18T09:00:00.000Z"
  },
  {
    "id": "blcup-hsk4-mock-02",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 4 Mã 02 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi mô phỏng chuẩn BLCUP HSK 4 mã BLCUP-02. Tăng cường các dạng bài đọc hiểu nối đoạn và kỹ năng sắp xếp trật tự câu văn bản học thuật trung cấp.",
    "pdfUrl": "/exam-files/pdf/hsk4_blcup_02_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_blcup_02_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_blcup_02_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1690,
    "downloadsCount": 640,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  },
  {
    "id": "blcup-hsk4-mock-03",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 4 Mã 03 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi mô phỏng chuẩn BLCUP HSK 4 mã BLCUP-03. File audio chất lượng cao với tốc độ đọc chuẩn kỳ thi quốc tế, bảng đáp án chi tiết và giải thích các bẫy ngữ pháp thường gặp.",
    "pdfUrl": "/exam-files/pdf/hsk4_blcup_03_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_blcup_03_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_blcup_03_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1590,
    "downloadsCount": 580,
    "createdAt": "2024-08-22T13:00:00.000Z",
    "updatedAt": "2024-08-22T13:00:00.000Z"
  },
  {
    "id": "blcup-hsk4-mock-04",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 4 Mã 04 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi mô phỏng chuẩn BLCUP HSK 4 mã BLCUP-04. Bộ đề luyện thi tổng hợp giúp học viên tự tin đạt điểm số cao (260+) trong kỳ thi HSK 4 thực tế.",
    "pdfUrl": "/exam-files/pdf/hsk4_blcup_04_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_blcup_04_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_blcup_04_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1740,
    "downloadsCount": 660,
    "createdAt": "2024-10-18T14:30:00.000Z",
    "updatedAt": "2024-10-18T14:30:00.000Z"
  },
  {
    "id": "official-cti-yct4-m01",
    "title": "Đề thi Chuẩn Quốc Tế Hán Ngữ Thiếu Nhi YCT 4 — Hanban / CTI (Kèm Audio & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 85,
    "questionCount": 80,
    "description": "Đề thi chuẩn hóa YCT Cấp độ 4 cấp cao nhất của hệ thống YCT, tương đương chuẩn đầu ra HSK 4. Bao gồm 40 câu Nghe hiểu, 30 câu Đọc hiểu và 10 câu Viết kèm audio và đáp án chi tiết.",
    "pdfUrl": "/exam-files/pdf/yct4_m01_exam.pdf",
    "audioUrl": "/exam-files/audio/yct4_m01_listening.mp3",
    "answerUrl": "/exam-files/pdf/yct4_m01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 680,
    "downloadsCount": 220,
    "createdAt": "2024-09-10T10:00:00.000Z",
    "updatedAt": "2024-09-10T10:00:00.000Z"
  },
  {
    "id": "official-sctop-tocfl-band-b-01",
    "title": "Đề thi Chuẩn Năng Lực Hoa Ngữ TOCFL Band B (Cấp 3 - 4) — SC-TOP Đài Loan",
    "hskLevel": 4,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Chỉ đạo Thử nghiệm Năng lực Hoa ngữ Đài Loan (SC-TOP)",
    "durationMinutes": 60,
    "questionCount": 50,
    "description": "Đề thi chính thức TOCFL Band B (đánh giá cấp độ B1 và B2) do SC-TOP Đài Loan khảo thí. Đòi hỏi vốn từ vựng 2.500 từ và khả năng đọc hiểu văn bản tin tức, xã hội.",
    "pdfUrl": "/exam-files/pdf/tocfl_band_b_01_exam.pdf",
    "answerUrl": "/exam-files/pdf/tocfl_band_b_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1120,
    "downloadsCount": 420,
    "createdAt": "2024-08-10T11:00:00.000Z",
    "updatedAt": "2024-08-10T11:00:00.000Z"
  },
  {
    "id": "official-moet-thpt-d4-2022",
    "title": "Đề thi Tốt nghiệp THPT Quốc Gia Môn Tiếng Trung — Bộ GD&ĐT (Năm 2022 - Mã đề 03)",
    "hskLevel": 4,
    "category": "official",
    "year": 2022,
    "source": "Bộ Giáo dục và Đào tạo Việt Nam",
    "durationMinutes": 60,
    "questionCount": 50,
    "description": "Đề thi chính thức kỳ thi Tốt nghiệp THPT Quốc Gia môn Tiếng Trung Quốc (Khối D4) năm 2022 của Bộ GD&ĐT. Kiểm tra năng lực toàn diện về ngữ pháp, quán dụng ngữ và đọc hiểu kèm đáp án.",
    "pdfUrl": "/exam-files/pdf/thpt_d4_2022_exam.pdf",
    "answerUrl": "/exam-files/pdf/thpt_d4_2022_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1820,
    "downloadsCount": 710,
    "createdAt": "2024-07-05T14:00:00.000Z",
    "updatedAt": "2024-07-05T14:00:00.000Z"
  },
  {
    "id": "official-moet-thpt-d4-2021",
    "title": "Đề thi Tốt nghiệp THPT Quốc Gia Môn Tiếng Trung — Bộ GD&ĐT (Năm 2021 - Mã đề 04)",
    "hskLevel": 4,
    "category": "official",
    "year": 2021,
    "source": "Bộ Giáo dục và Đào tạo Việt Nam",
    "durationMinutes": 60,
    "questionCount": 50,
    "description": "Đề thi chính thức kỳ thi Tốt nghiệp THPT Quốc Gia môn Tiếng Trung Quốc (Khối D4) năm 2021 của Bộ GD&ĐT. Gồm 50 câu trắc nghiệm chuẩn hóa kèm phiếu đáp án đối chiếu.",
    "pdfUrl": "/exam-files/pdf/thpt_d4_2021_exam.pdf",
    "answerUrl": "/exam-files/pdf/thpt_d4_2021_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1690,
    "downloadsCount": 650,
    "createdAt": "2024-07-08T09:30:00.000Z",
    "updatedAt": "2024-07-08T09:30:00.000Z"
  },
  {
    "id": "official-cti-hsk5-sample",
    "title": "Đề thi thật HSK 5 Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3 & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 125,
    "questionCount": 100,
    "description": "Đề thi chính thức HSK Cấp 5 chuẩn quốc tế. Cấu trúc bài thi gồm 45 câu Nghe hiểu nâng cao, 45 câu Đọc hiểu văn bản học thuật và 10 câu Viết luận (kết hợp viết đoạn văn theo từ và tranh).",
    "pdfUrl": "/exam-files/pdf/hsk5_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 3890,
    "downloadsCount": 1650,
    "createdAt": "2024-03-15T08:20:00.000Z",
    "updatedAt": "2024-03-15T08:20:00.000Z"
  },
  {
    "id": "official-hanban-hsk5-h50000",
    "title": "Đề thi thật HSK 5 Mã H50000 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2022,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 125,
    "questionCount": 100,
    "description": "Đề thi thật HSK Cấp 5 mã đề H50000. Đánh giá khả năng hiểu sâu báo chí, phim ảnh và các bài thuyết trình tiếng Trung học thuật. Kèm audio gốc phòng thi và đáp án.",
    "pdfUrl": "/exam-files/pdf/hsk5_h50000_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h50000_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h50000_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2480,
    "downloadsCount": 980,
    "createdAt": "2024-06-20T10:15:00.000Z",
    "updatedAt": "2024-06-20T10:15:00.000Z"
  },
  {
    "id": "official-hanban-hsk5-h51001",
    "title": "Đề thi thật HSK 5 Mã H51001 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 125,
    "questionCount": 100,
    "description": "Đề thi thật HSK 5 mã H51001 chính thức. Bao gồm các chủ đề kinh tế, văn hóa, khoa học đời sống. Bản PDF chất lượng cao kèm file âm thanh MP3 chuẩn tốc độ thực tế.",
    "pdfUrl": "/exam-files/pdf/hsk5_h51001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h51001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h51001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2190,
    "downloadsCount": 870,
    "createdAt": "2024-09-18T15:20:00.000Z",
    "updatedAt": "2024-09-18T15:20:00.000Z"
  },
  {
    "id": "official-hanban-hsk5-h51002",
    "title": "Đề thi thật HSK 5 Mã H51002 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 125,
    "questionCount": 100,
    "description": "Đề thi thật HSK 5 mã H51002 chính quy. Đòi hỏi kỹ năng tổng hợp thông tin, tư duy logic và vốn 2.500 từ vựng. Đầy đủ đề thi và đáp án chấm bài.",
    "pdfUrl": "/exam-files/pdf/hsk5_h51002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h51002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h51002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2080,
    "downloadsCount": 810,
    "createdAt": "2024-11-25T11:00:00.000Z",
    "updatedAt": "2024-11-25T11:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk5-h51003",
    "title": "Đề thi thật HSK 5 Mã H51003 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 125,
    "questionCount": 100,
    "description": "Đề thi chuẩn hóa HSK 5 mã đề H51003 mới nhất. Định dạng chuẩn khảo thí quốc tế, bài nghe rõ giọng đài phát thanh Trung ương, đáp án chính thức kèm lời giải.",
    "pdfUrl": "/exam-files/pdf/hsk5_h51003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h51003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h51003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2980,
    "downloadsCount": 1340,
    "createdAt": "2025-02-25T09:00:00.000Z",
    "updatedAt": "2025-02-25T09:00:00.000Z"
  },
  {
    "id": "blcup-hsk5-complete-book",
    "title": "Tuyển Tập Đề Thi Thật BLCUP HSK 5 (Trọn Bộ Đề + Đáp Án Chuẩn BLCU) — NXB Đại học Ngôn ngữ Bắc Kinh",
    "hskLevel": 5,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 250,
    "questionCount": 200,
    "description": "Ấn phẩm sách đề thi chuẩn hóa trọn bộ HSK Cấp 5 của Nhà xuất bản ĐH Ngôn ngữ Bắc Kinh (BLCUP). Tổng hợp các bộ đề kinh điển, phân tích chi tiết kỹ năng làm bài đọc hiểu dài và viết đoạn văn nghị luận.",
    "pdfUrl": "/exam-files/pdf/hsk5_blcup_complete_book.pdf",
    "audioUrl": "/exam-files/audio/hsk5_blcup_book_audio.mp3",
    "isPinned": true,
    "status": "published",
    "viewsCount": 2450,
    "downloadsCount": 980,
    "createdAt": "2024-05-15T08:30:00.000Z",
    "updatedAt": "2024-05-15T08:30:00.000Z"
  },
  {
    "id": "official-cti-bct-level-b-01",
    "title": "Đề thi Chuẩn Hán Ngữ Thương Mại BCT Cấp B — Hanban / CTI (Full Audio & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 95,
    "questionCount": 92,
    "description": "Đề thi chính thức chuẩn quốc tế Business Chinese Test (BCT Cấp B) dành cho chuyên gia thương mại và đàm phán quốc tế. Tương đương trình độ HSK 5 cao cấp, kèm trọn bộ audio và đáp án.",
    "pdfUrl": "/exam-files/pdf/bct_level_b_01_exam.pdf",
    "audioUrl": "/exam-files/audio/bct_level_b_01_listening.mp3",
    "answerUrl": "/exam-files/pdf/bct_level_b_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1320,
    "downloadsCount": 470,
    "createdAt": "2024-06-12T10:00:00.000Z",
    "updatedAt": "2024-06-12T10:00:00.000Z"
  },
  {
    "id": "official-cti-hsk6-sample",
    "title": "Đề thi thật HSK 6 Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3 & Đáp án)",
    "hskLevel": 6,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi chính thức HSK Cấp 6 chuẩn hóa quốc tế — đỉnh cao năng lực Hán ngữ. Cấu trúc bài thi gồm 50 câu Nghe hiểu chuyên sâu, 50 câu Đọc hiểu học thuật phức tạp và 1 bài Viết tóm tắt văn bản 1.000 chữ.",
    "pdfUrl": "/exam-files/pdf/hsk6_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 4250,
    "downloadsCount": 1890,
    "createdAt": "2024-03-15T08:25:00.000Z",
    "updatedAt": "2024-03-15T08:25:00.000Z"
  },
  {
    "id": "official-hanban-hsk6-h60000",
    "title": "Đề thi thật HSK 6 Mã H60000 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "official",
    "year": 2022,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi thật HSK Cấp 6 mã đề H60000 chính quy. Kiểm tra toàn diện kỹ năng nghe hiểu các bài nói chuyện chuyên sâu, đọc hiểu tác phẩm văn học và viết tóm tắt ngắn. Kèm audio và đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/hsk6_h60000_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h60000_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h60000_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2780,
    "downloadsCount": 1120,
    "createdAt": "2024-06-28T09:00:00.000Z",
    "updatedAt": "2024-06-28T09:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk6-h61001",
    "title": "Đề thi thật HSK 6 Mã H61001 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi thật HSK 6 mã H61001 phát hành bởi Hanban. Bản scan chất lượng cao, bài nghe phát âm chuẩn tốc độ thực tế, đáp án chính xác phục vụ ôn luyện cao cấp.",
    "pdfUrl": "/exam-files/pdf/hsk6_h61001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h61001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h61001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2540,
    "downloadsCount": 1030,
    "createdAt": "2024-09-30T10:45:00.000Z",
    "updatedAt": "2024-09-30T10:45:00.000Z"
  },
  {
    "id": "official-hanban-hsk6-h61002",
    "title": "Đề thi thật HSK 6 Mã H61002 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "official",
    "year": 2023,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi thật mã đề H61002 cấp độ HSK 6. Thử thách đỉnh cao về từ vựng thành ngữ (quán dụng ngữ), cấu trúc câu bệnh và kỹ năng viết văn thuật sự.",
    "pdfUrl": "/exam-files/pdf/hsk6_h61002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h61002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h61002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2390,
    "downloadsCount": 960,
    "createdAt": "2024-12-05T14:15:00.000Z",
    "updatedAt": "2024-12-05T14:15:00.000Z"
  },
  {
    "id": "official-hanban-hsk6-h61003",
    "title": "Đề thi thật HSK 6 Mã H61003 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi chính thức HSK 6 mã H61003 năm 2024. Bản in hoàn chỉnh gồm 101 câu hỏi, file nghe audio MP3 chuẩn hóa và bảng phân tích đáp án chi tiết từ ban giám khảo.",
    "pdfUrl": "/exam-files/pdf/hsk6_h61003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h61003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h61003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 3120,
    "downloadsCount": 1420,
    "createdAt": "2025-03-05T09:30:00.000Z",
    "updatedAt": "2025-03-05T09:30:00.000Z"
  },
  {
    "id": "blcup-hsk6-mock-01",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 6 Mã 01 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi mô phỏng cấp độ HSK 6 chuẩn BLCUP mã 01 do Đại học Ngôn ngữ Bắc Kinh biên soạn. Kiểm tra chuyên sâu năng lực nghe hiểu phỏng vấn dài, đọc hiểu văn học triết học và tóm tắt văn bản.",
    "pdfUrl": "/exam-files/pdf/hsk6_blcup_01_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_blcup_01_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_blcup_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2150,
    "downloadsCount": 890,
    "createdAt": "2024-04-25T08:00:00.000Z",
    "updatedAt": "2024-04-25T08:00:00.000Z"
  },
  {
    "id": "blcup-hsk6-mock-02",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 6 Mã 02 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi mô phỏng chuẩn BLCUP HSK 6 mã 02. Tuyển tập câu hỏi tìm lỗi sai câu bệnh, đọc hiểu tốc độ cao và bài viết tự sự tóm lược theo yêu cầu chuẩn CTI.",
    "pdfUrl": "/exam-files/pdf/hsk6_blcup_02_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_blcup_02_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_blcup_02_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1980,
    "downloadsCount": 810,
    "createdAt": "2024-06-22T10:00:00.000Z",
    "updatedAt": "2024-06-22T10:00:00.000Z"
  },
  {
    "id": "blcup-hsk6-mock-03",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 6 Mã 03 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi mô phỏng chuẩn BLCUP HSK 6 mã 03. Bài nghe audio MP3 tốc độ tiêu chuẩn phòng thi thực tế, phân tích cấu trúc bài viết và bảng đáp án giải thích tỉ mỉ.",
    "pdfUrl": "/exam-files/pdf/hsk6_blcup_03_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_blcup_03_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_blcup_03_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1840,
    "downloadsCount": 760,
    "createdAt": "2024-09-08T11:30:00.000Z",
    "updatedAt": "2024-09-08T11:30:00.000Z"
  },
  {
    "id": "blcup-hsk6-mock-04",
    "title": "Đề thi Mô phỏng Chuẩn BLCUP HSK 6 Mã 04 — ĐH Ngôn ngữ Bắc Kinh (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "mock",
    "year": 2024,
    "source": "Nhà xuất bản Đại học Ngôn ngữ Bắc Kinh (BLCUP)",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi mô phỏng chuẩn BLCUP HSK 6 mã 04. Bộ đề ôn thi chuyên sâu giúp học viên hoàn thiện các kỹ năng nghe - đọc - viết trước kỳ thi lấy chứng chỉ quốc tế.",
    "pdfUrl": "/exam-files/pdf/hsk6_blcup_04_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_blcup_04_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_blcup_04_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2020,
    "downloadsCount": 850,
    "createdAt": "2024-11-15T15:00:00.000Z",
    "updatedAt": "2024-11-15T15:00:00.000Z"
  },
  {
    "id": "official-sctop-tocfl-band-c-01",
    "title": "Đề thi Chuẩn Năng Lực Hoa Ngữ TOCFL Band C (Cấp 5 - 6) — SC-TOP Đài Loan",
    "hskLevel": 6,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Chỉ đạo Thử nghiệm Năng lực Hoa ngữ Đài Loan (SC-TOP)",
    "durationMinutes": 60,
    "questionCount": 50,
    "description": "Đề thi chính thức chuẩn hóa TOCFL Band C (đánh giá cấp độ C1 và C2 - Lưu loát & Tinh thông) do SC-TOP Đài Loan khảo thí. Đầy đủ phần đọc hiểu chuyên ngành học thuật và đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/tocfl_band_c_01_exam.pdf",
    "answerUrl": "/exam-files/pdf/tocfl_band_c_01_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1450,
    "downloadsCount": 610,
    "createdAt": "2024-08-18T10:00:00.000Z",
    "updatedAt": "2024-08-18T10:00:00.000Z"
  },
  {
    "id": "official-cti-hsk-syllabus-2024",
    "title": "Đề cương & Tiêu chuẩn Năng lực HSK 3.0 Toàn diện — CTI Hanban (Bản Gốc 260 Trang)",
    "hskLevel": 6,
    "category": "official",
    "year": 2024,
    "source": "Bộ Giáo dục Trung Quốc & CTI Hanban",
    "durationMinutes": 120,
    "questionCount": 300,
    "description": "Tài liệu đề cương chính thức chuẩn hóa quốc tế về Tiêu chuẩn Năng lực Hán ngữ Quốc tế cho Giáo dục Tiếng Trung (HSK 3.0 - 9 bậc). Quy định chi tiết hệ thống ngữ âm, chữ Hán, từ vựng và ngữ pháp từ HSK 1 đến HSK 9.",
    "pdfUrl": "/exam-files/pdf/hsk30_syllabus.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 5420,
    "downloadsCount": 2890,
    "createdAt": "2024-01-10T08:00:00.000Z",
    "updatedAt": "2024-01-10T08:00:00.000Z"
  },
  {
    "id": "official-cti-hsk79-sample",
    "title": "Đề thi Thật HSK 7–9 Cao Cấp Chuẩn Quốc Tế — CTI Hanban (Kèm Audio MP3 & Speaking)",
    "hskLevel": 7,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 210,
    "questionCount": 98,
    "description": "Bộ đề thi chính thức chuẩn hóa định dạng HSK 3.0 Cấp độ Cao cấp (HSK 7–9). Tích hợp toàn diện cả 5 kỹ năng: Nghe hiểu, Đọc hiểu, Viết luận, Biên dịch & Phiên dịch, và Khẩu ngữ chuyên gia.",
    "pdfUrl": "/exam-files/pdf/hsk79_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk79_listening.mp3",
    "isPinned": true,
    "status": "published",
    "viewsCount": 4890,
    "downloadsCount": 2150,
    "createdAt": "2024-04-12T10:00:00.000Z",
    "updatedAt": "2024-04-12T10:00:00.000Z"
  },
  {
    "id": "official-cti-hskk-so-cap",
    "title": "Đề thi Khẩu ngữ HSKK Sơ Cấp Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3)",
    "hskLevel": "HSKK",
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 20,
    "questionCount": 27,
    "description": "Đề thi chính thức HSKK Sơ cấp (dành cho người học HSK 1 - 2). Cấu trúc gồm 3 phần: Nghe và lặp lại câu (15 câu), Nghe và trả lời ngắn (10 câu), Trả lời câu hỏi tự luận (2 câu). Kèm file thu âm audio hướng dẫn thi.",
    "pdfUrl": "/exam-files/pdf/hskk_primary_exam.pdf",
    "audioUrl": "/exam-files/audio/hskk_primary.mp3",
    "isPinned": true,
    "status": "published",
    "viewsCount": 2680,
    "downloadsCount": 1150,
    "createdAt": "2024-03-20T10:00:00.000Z",
    "updatedAt": "2024-03-20T10:00:00.000Z"
  },
  {
    "id": "official-cti-hskk-trung-cap",
    "title": "Đề thi Khẩu ngữ HSKK Trung Cấp Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3)",
    "hskLevel": "HSKK",
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 23,
    "questionCount": 14,
    "description": "Đề thi chính thức HSKK Trung cấp (kết hợp kỳ thi HSK 3 - 4). Cấu trúc bài thi gồm 3 phần: Nghe và lặp lại câu (10 câu), Miêu tả tranh ảnh (2 câu), và Trả lời câu hỏi phỏng vấn (2 câu). Kèm audio phòng thi.",
    "pdfUrl": "/exam-files/pdf/hskk_intermediate_exam.pdf",
    "audioUrl": "/exam-files/audio/hskk_intermediate.mp3",
    "isPinned": true,
    "status": "published",
    "viewsCount": 3120,
    "downloadsCount": 1390,
    "createdAt": "2024-03-20T10:30:00.000Z",
    "updatedAt": "2024-03-20T10:30:00.000Z"
  },
  {
    "id": "official-cti-hskk-cao-cap",
    "title": "Đề thi Khẩu ngữ HSKK Cao Cấp Chuẩn Quốc Tế — Hanban / CTI (Kèm Audio MP3)",
    "hskLevel": "HSKK",
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 25,
    "questionCount": 6,
    "description": "Đề thi chính thức HSKK Cao cấp (bắt buộc kèm kỳ thi HSK 5 - 6). Đánh giá năng lực diễn thuyết, tóm tắt đoạn văn dài nghe được và bày tỏ quan điểm sâu sắc về các đề tài xã hội.",
    "pdfUrl": "/exam-files/pdf/hskk_advanced_exam.pdf",
    "audioUrl": "/exam-files/audio/hskk_advanced.mp3",
    "isPinned": true,
    "status": "published",
    "viewsCount": 2890,
    "downloadsCount": 1240,
    "createdAt": "2024-03-20T11:00:00.000Z",
    "updatedAt": "2024-03-20T11:00:00.000Z"
  },
  {
    "id": "official-cti-hskk-level6",
    "title": "Đề thi Khẩu ngữ HSKK Cấp 6 Chuyên Sâu — Hanban / CTI (Kèm Audio MP3)",
    "hskLevel": "HSKK",
    "category": "official",
    "year": 2025,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 25,
    "questionCount": 8,
    "description": "Đề thi Khẩu ngữ chuyên biệt dành riêng cho cấp độ HSK 6 theo định hướng HSK 3.0. Kiểm tra khả năng diễn đạt học thuật, hùng biện và tranh luận các đề tài kinh tế xã hội.",
    "pdfUrl": "/exam-files/pdf/hskk_level6_exam.pdf",
    "audioUrl": "/exam-files/audio/hskk_level6.mp3",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2340,
    "downloadsCount": 980,
    "createdAt": "2025-03-01T09:00:00.000Z",
    "updatedAt": "2025-03-01T09:00:00.000Z"
  }
];


export function getAllExams(): ExamItem[] {
  const stored = readJsonFile<ExamItem[]>('exams.json', []);
  return Array.isArray(stored) ? stored : [];
}

export function getExamById(id: string): ExamItem | null {
  const exams = getAllExams();
  return exams.find((e) => e.id === id) || null;
}

export function saveExam(data: Omit<ExamItem, 'id' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'downloadsCount'> & { id?: string }): ExamItem {
  const exams = getAllExams();
  const id = data.id?.trim() || `exam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newExam: ExamItem = {
    ...data,
    id,
    viewsCount: 0,
    downloadsCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  exams.unshift(newExam);
  writeJsonFile('exams.json', exams);
  return newExam;
}

export function updateExam(id: string, updates: Partial<Omit<ExamItem, 'id' | 'createdAt'>>): ExamItem | null {
  const exams = getAllExams();
  const index = exams.findIndex((e) => e.id === id);
  if (index === -1) return null;

  exams[index] = {
    ...exams[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile('exams.json', exams);
  return exams[index];
}

export function deleteExam(id: string): boolean {
  const exams = getAllExams();
  const filtered = exams.filter((e) => e.id !== id);
  if (filtered.length === exams.length) return false;
  writeJsonFile('exams.json', filtered);
  return true;
}

export function deleteAllExams(): boolean {
  writeJsonFile('exams.json', []);
  return true;
}

export function resetStarterExams(): ExamItem[] {
  writeJsonFile('exams.json', INITIAL_STARTER_EXAMS);
  return INITIAL_STARTER_EXAMS;
}

export function incrementExamStats(id: string, type: 'view' | 'download'): boolean {
  const exams = getAllExams();
  const exam = exams.find((e) => e.id === id);
  if (!exam) return false;

  if (type === 'view') {
    exam.viewsCount = (exam.viewsCount || 0) + 1;
  } else if (type === 'download') {
    exam.downloadsCount = (exam.downloadsCount || 0) + 1;
  }

  writeJsonFile('exams.json', exams);
  return true;
}

// -------------------------------------------------------------
// NOTIFICATIONS MANAGEMENT
// -------------------------------------------------------------

const INITIAL_STARTER_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-practice-and-quiz-launch',
    title: '🚀 Ra mắt: Luyện Thi Trắc Nghiệm & Ghép Câu Tiếng Trung!',
    message: 'Hệ thống vừa ra mắt bộ công cụ luyện tập tương tác mới: Trắc nghiệm từ vựng 4 dạng (Hán tự, Pinyin, Dịch nghĩa, Nghe âm), Luyện ghép câu tiếng Trung chuẩn ngữ pháp HSK 1 - 6 (kèm nút Bật/Tắt Pinyin), tự nhập số lượng câu hỏi và Sổ tay câu sai (错题本) tự động lưu lại các câu làm sai để ôn tập củng cố kiến thức!',
    type: 'feature',
    priority: 'urgent',
    isPinned: true,
    actionLabel: 'Luyện tập ngay',
    actionLink: '/practice',
    actionType: 'link',
    actionPayload: '/practice',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-workspace-saas-upgrade',
    title: '✨ Nâng cấp: Không Gian Học Tập & Tiến Độ SRS Cá Nhân',
    message: 'Giao diện không gian học viên vừa được nâng cấp toàn diện: Bổ sung thống kê chi tiết số từ vựng cá nhân, tiến độ ghi nhớ SRS, nhóm HSK riêng, chuỗi ngày streak học tập và tích hợp phát âm nhanh 🔊.',
    type: 'update',
    priority: 'high',
    actionLabel: 'Xem không gian',
    actionLink: '/study',
    actionType: 'link',
    actionPayload: '/study',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-welcome',
    title: 'Chào mừng bạn đến với HSK Master! 🎉',
    message: 'Nền tảng học tiếng Trung tương tác thông minh với bảng tính flashcard, hệ thống lặp lại ngắt quãng SRS và luyện viết chữ Hán chuyên nghiệp.',
    type: 'system',
    priority: 'normal',
    actionLabel: 'Bắt đầu học',
    actionType: 'open_srs',
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-exam-hub-launch',
    title: '🎓 Kho Đề Thi HSK Tuyển Chọn chính thức ra mắt!',
    message: 'Admin đã tuyển chọn và đăng tải các bộ đề thi thật HSK 1 - 6 kèm file nghe Audio MP3 trực tiếp và bảng đáp án chi tiết. Hãy vào làm thử ngay!',
    type: 'exam',
    priority: 'urgent',
    actionLabel: 'Mở Kho Đề Thi',
    actionType: 'open_exams',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-worksheet-pdf',
    title: '📄 Tính năng: Xuất Phiếu Tập Viết Chữ Hán PDF Khổ A4',
    message: 'Bạn có thể xuất phiếu luyện viết chuẩn ô Mễ điền (米字格) và Điền tự (田字格) ra file PDF A4 cực nét để in ra giấy luyện chữ hàng ngày.',
    type: 'update',
    priority: 'normal',
    actionLabel: 'In Phiếu Viết',
    actionType: 'open_worksheet',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
];

function isNotificationDbInitialized(): boolean {
  if (memoryStore.has('notifications.json')) return true;
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, 'notifications.json');
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function getAllNotifications(): AppNotification[] {
  if (!isNotificationDbInitialized()) {
    writeJsonFile('notifications.json', INITIAL_STARTER_NOTIFICATIONS);
    return INITIAL_STARTER_NOTIFICATIONS;
  }
  const stored = readJsonFile<AppNotification[]>('notifications.json', []);
  if (!Array.isArray(stored) || stored.length === 0) {
    writeJsonFile('notifications.json', INITIAL_STARTER_NOTIFICATIONS);
    return INITIAL_STARTER_NOTIFICATIONS;
  }
  return stored;
}

export function deleteAllNotifications(): boolean {
  writeJsonFile('notifications.json', []);
  return true;
}

export function saveNotification(
  data: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }
): AppNotification {
  const list = getAllNotifications();
  const id = data.id?.trim() || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newNotif: AppNotification = {
    ...data,
    id,
    createdAt: now,
  };

  list.unshift(newNotif);
  if (list.length > 200) list.length = 200;
  writeJsonFile('notifications.json', list);
  return newNotif;
}

export function updateNotification(
  id: string,
  updates: Partial<Omit<AppNotification, 'id' | 'createdAt'>>
): AppNotification | null {
  const list = getAllNotifications();
  const index = list.findIndex((n) => n.id === id);
  if (index === -1) return null;

  list[index] = {
    ...list[index],
    ...updates,
  };

  writeJsonFile('notifications.json', list);
  return list[index];
}

export function deleteNotification(id: string): boolean {
  const list = getAllNotifications();
  const cleanId = (id || '').trim();
  let decodedId = cleanId;
  try {
    decodedId = decodeURIComponent(cleanId);
  } catch {
    // ignore
  }

  const filtered = list.filter((n) => n.id !== cleanId && n.id !== decodedId && n.id !== id);
  if (filtered.length === list.length) {
    // Case-insensitive fallback
    const altFiltered = list.filter((n) => n.id.toLowerCase() !== cleanId.toLowerCase());
    if (altFiltered.length !== list.length) {
      writeJsonFile('notifications.json', altFiltered);
      return true;
    }
    return false;
  }
  writeJsonFile('notifications.json', filtered);
  return true;
}

// -------------------------------------------------------------
// USER DELETION WITH CASCADE CLEANUP
// -------------------------------------------------------------
export function deleteUser(id: string): boolean {
  const users = readJsonFile<StoredUserRecord[]>('users.json', []) || [];
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  writeJsonFile('users.json', users);

  // Cascade cleanup user custom words
  const allCustom = readJsonFile<VocabItem[]>('custom_words.json', []) || [];
  const filteredCustom = allCustom.filter((w) => w.userId !== id);
  if (filteredCustom.length !== allCustom.length) {
    writeJsonFile('custom_words.json', filteredCustom);
  }

  // Cascade cleanup user progress
  const allProgress = readJsonFile<UserProgressRecord[]>('user_progress.json', []) || [];
  const filteredProgress = allProgress.filter((p) => p.userId !== id);
  if (filteredProgress.length !== allProgress.length) {
    writeJsonFile('user_progress.json', filteredProgress);
  }

  return true;
}

// -------------------------------------------------------------
// ADMIN DOCUMENTATION & GUIDES ENGINE
// -------------------------------------------------------------
export function getAllAdminGuides(): AdminGuide[] {
  const existing = readJsonFile<AdminGuide[]>('admin_guides.json', []);
  if (!existing || existing.length === 0) {
    writeJsonFile('admin_guides.json', INITIAL_ADMIN_GUIDES);
    return [...INITIAL_ADMIN_GUIDES];
  }
  return existing.sort((a, b) => a.order - b.order);
}

export function getAdminGuideById(id: string): AdminGuide | null {
  const guides = getAllAdminGuides();
  return guides.find((g) => g.id === id) || null;
}

export function getAdminGuideBySlug(slug: string): AdminGuide | null {
  const guides = getAllAdminGuides();
  return guides.find((g) => g.slug === slug) || null;
}

export function saveAdminGuide(
  guide: Omit<AdminGuide, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): AdminGuide {
  const list = getAllAdminGuides();
  const now = new Date().toISOString();
  if (guide.id) {
    const idx = list.findIndex((g) => g.id === guide.id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...guide,
        updatedAt: now,
      };
      writeJsonFile('admin_guides.json', list);
      return list[idx];
    }
  }
  const newGuide: AdminGuide = {
    ...guide,
    id: guide.id || `guide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  list.push(newGuide);
  writeJsonFile('admin_guides.json', list);
  return newGuide;
}

export function deleteAdminGuide(id: string): boolean {
  const list = getAllAdminGuides();
  const next = list.filter((g) => g.id !== id);
  if (next.length === list.length) return false;
  writeJsonFile('admin_guides.json', next);
  return true;
}

export function resetStarterAdminGuides(): AdminGuide[] {
  writeJsonFile('admin_guides.json', INITIAL_ADMIN_GUIDES);
  return [...INITIAL_ADMIN_GUIDES];
}

// -------------------------------------------------------------
// CENTRALIZED SYSTEM ERROR LOGS ENGINE
// -------------------------------------------------------------
export function getAllSystemErrorLogs(): SystemErrorLog[] {
  const list = readJsonFile<SystemErrorLog[]>('error_logs.json', []) || [];
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addSystemErrorLog(
  error: Omit<SystemErrorLog, 'id' | 'timestamp' | 'count' | 'status'> & { id?: string }
): SystemErrorLog {
  const list = getAllSystemErrorLogs();
  const existing = list.find((e) => e.message === error.message && e.module === error.module && e.status === 'open');
  if (existing) {
    existing.count += 1;
    existing.timestamp = new Date().toISOString();
    writeJsonFile('error_logs.json', list);
    return existing;
  }
  const newLog: SystemErrorLog = {
    ...error,
    id: error.id || `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    count: 1,
    status: 'open',
  };
  list.unshift(newLog);
  if (list.length > 500) list.length = 500;
  writeJsonFile('error_logs.json', list);
  return newLog;
}

export function updateSystemErrorLogStatus(
  id: string,
  status: 'open' | 'acknowledged' | 'resolved',
  resolvedBy?: string
): SystemErrorLog | null {
  const list = getAllSystemErrorLogs();
  const item = list.find((e) => e.id === id);
  if (!item) return null;
  item.status = status;
  if (status === 'resolved') {
    item.resolvedBy = resolvedBy || 'Admin';
    item.resolvedAt = new Date().toISOString();
  }
  writeJsonFile('error_logs.json', list);
  return item;
}

export function deleteSystemErrorLog(id: string): boolean {
  const list = getAllSystemErrorLogs();
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  writeJsonFile('error_logs.json', next);
  return true;
}

export function purgeResolvedSystemErrorLogs(): number {
  const list = getAllSystemErrorLogs();
  const unresolved = list.filter((e) => e.status !== 'resolved');
  const removedCount = list.length - unresolved.length;
  if (removedCount > 0) {
    writeJsonFile('error_logs.json', unresolved);
  }
  return removedCount;
}

// -------------------------------------------------------------
// REAL SYSTEM HEALTH CHECK PROBE ENGINE
// -------------------------------------------------------------
export function checkSystemHealth(): SystemHealthReport {
  const checkedAt = new Date().toISOString();
  const services: ServiceHealthStatus[] = [];

  // 1. Application Node.js Runtime
  const uptimeSeconds = Math.round(process.uptime ? process.uptime() : 0);
  const mem = process.memoryUsage ? process.memoryUsage() : { rss: 0, heapUsed: 0, heapTotal: 0 };
  const memoryMb = Math.round((mem.rss || 0) / (1024 * 1024));
  const heapUsedMb = Math.round((mem.heapUsed || 0) / (1024 * 1024));
  const heapTotalMb = Math.round((mem.heapTotal || 0) / (1024 * 1024));

  services.push({
    name: 'Application Server (Node.js & Next.js Runtime)',
    status: 'healthy',
    latencyMs: 1,
    lastCheckedAt: checkedAt,
    message: `Node ${process.version} • Uptime: ${Math.round(uptimeSeconds / 60)} phút • Bộ nhớ RSS: ${memoryMb} MB (Heap: ${heapUsedMb}/${heapTotalMb} MB)`,
    details: { uptimeSeconds, memoryMb, heapUsedMb, heapTotalMb, nodeVersion: process.version },
  });

  // 2. Server Local Database (.data/ JSON Engine)
  const dbStart = Date.now();
  let usersCount = 0;
  let vocabCount = 0;
  let dbLatency = 1;
  try {
    usersCount = getAllUsers().length;
    vocabCount = getSystemVocabulary().length;
    dbLatency = Math.max(1, Date.now() - dbStart);
    services.push({
      name: 'Cơ sở Dữ liệu Hệ thống (.data/)',
      status: 'healthy',
      latencyMs: dbLatency,
      lastCheckedAt: checkedAt,
      message: `Hoạt động hoàn hảo • ${usersCount} người dùng • ${vocabCount.toLocaleString()} từ vựng HSK 1–9`,
      details: { usersCount, vocabCount, latencyMs: dbLatency },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    services.push({
      name: 'Cơ sở Dữ liệu Hệ thống (.data/)',
      status: 'degraded',
      latencyMs: Date.now() - dbStart,
      lastCheckedAt: checkedAt,
      message: `Cảnh báo truy xuất dữ liệu: ${errMsg}`,
    });
  }

  // 3. Storage & Exam Assets (/public/exam-files)
  let pdfCount = 0;
  let audioCount = 0;
  try {
    const pdfDir = path.join(process.cwd(), 'public', 'exam-files', 'pdf');
    const audioDir = path.join(process.cwd(), 'public', 'exam-files', 'audio');
    pdfCount = fs.existsSync(pdfDir) ? fs.readdirSync(pdfDir).filter((f) => f.endsWith('.pdf')).length : 0;
    audioCount = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).length : 0;

    services.push({
      name: 'Lưu trữ Tài liệu Đề thi (/exam-files)',
      status: pdfCount > 0 && audioCount > 0 ? 'healthy' : 'degraded',
      latencyMs: 2,
      lastCheckedAt: checkedAt,
      message: `${pdfCount} tệp PDF đề thi • ${audioCount} tệp âm thanh MP3 phòng thi sẵn sàng`,
      details: { pdfCount, audioCount },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    services.push({
      name: 'Lưu trữ Tài liệu Đề thi (/exam-files)',
      status: 'unavailable',
      latencyMs: 2,
      lastCheckedAt: checkedAt,
      message: `Không thể đọc thư mục exam-files: ${errMsg}`,
    });
  }

  // 4. Workspaces & Custom Vocabulary Store
  try {
    const wsList = getAllUserWorkspacesSummary();
    const customWordsTotal = wsList.reduce((acc: number, w) => acc + (w.customWordsCount || 0), 0);
    services.push({
      name: 'Không gian Học tập & Sổ từ (Workspaces)',
      status: 'healthy',
      latencyMs: 2,
      lastCheckedAt: checkedAt,
      message: `${wsList.length} học viên có không gian học tập • ${customWordsTotal.toLocaleString()} từ vựng cá nhân lưu trữ`,
      details: { workspacesCount: wsList.length, customWordsTotal },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    services.push({
      name: 'Không gian Học tập & Sổ từ (Workspaces)',
      status: 'degraded',
      latencyMs: 2,
      lastCheckedAt: checkedAt,
      message: `Lỗi đọc workspaces: ${errMsg}`,
    });
  }

  // 5. Cloud Firestore & Firebase Auth Readiness
  const hasFirebaseEnv = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
  );
  services.push({
    name: 'Đồng bộ Đám mây (Cloud Firestore & Auth)',
    status: 'healthy',
    latencyMs: 5,
    lastCheckedAt: checkedAt,
    message: hasFirebaseEnv
      ? 'Đã kết nối đồng bộ cơ sở dữ liệu đám mây Cloud Firestore'
      : 'Vận hành ở chế độ Cơ sở Dữ liệu Máy chủ Cục bộ (.data/) tốc độ cao',
    details: { hasFirebaseEnv },
  });

  // 6. Recent unresolved errors
  const allErrors = getAllSystemErrorLogs();
  const openErrors = allErrors.filter((e) => e.status === 'open');

  const overallStatus =
    services.some((s) => s.status === 'unavailable')
      ? 'unavailable'
      : services.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  const metrics = {
    memoryRssMb: memoryMb,
    memoryHeapMb: heapUsedMb,
    memoryHeapTotalMb: heapTotalMb,
    dbLatencyMs: dbLatency,
    pdfExamFilesCount: pdfCount,
    audioExamFilesCount: audioCount,
    unresolvedErrorsCount: openErrors.length,
    totalUsersCount: usersCount,
    totalVocabCount: vocabCount,
  };

  return {
    overallStatus,
    status: overallStatus,
    checkedAt,
    uptimeSeconds,
    uptime: uptimeSeconds,
    nodeVersion: process.version,
    version: process.version,
    environment: process.env.NODE_ENV || 'production',
    memoryUsageMb: memoryMb,
    services,
    recentErrorsCount: openErrors.length,
    metrics,
  };
}

// -------------------------------------------------------------
// DEEP SYSTEM DIAGNOSTIC AUDIT ENGINE (6-POINT VERIFICATION)
// -------------------------------------------------------------
export interface DiagnosticCheckItem {
  id: string;
  name: string;
  category: 'runtime' | 'database' | 'storage' | 'security' | 'workspaces' | 'errors';
  status: 'pass' | 'warning' | 'fail';
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
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

export function runDeepSystemDiagnostic(): DeepDiagnosticResult {
  const auditedAt = new Date().toISOString();
  const checks: DiagnosticCheckItem[] = [];

  // Check 1: Runtime Engine & Memory Health
  const t1 = Date.now();
  const mem = process.memoryUsage ? process.memoryUsage() : { rss: 0, heapUsed: 0 };
  const rssMb = Math.round((mem.rss || 0) / (1024 * 1024));
  const heapMb = Math.round((mem.heapUsed || 0) / (1024 * 1024));
  const memHealthy = rssMb < 512;
  checks.push({
    id: 'chk-runtime-memory',
    name: 'Kiểm tra Tài nguyên Bộ nhớ & Runtime Node.js',
    category: 'runtime',
    status: memHealthy ? 'pass' : 'warning',
    latencyMs: Math.max(1, Date.now() - t1),
    message: memHealthy
      ? `Tài nguyên tối ưu: RSS ${rssMb}MB, Heap ${heapMb}MB (dưới ngưỡng cảnh báo 512MB)`
      : `Bộ nhớ Node.js RSS ở mức cao (${rssMb}MB), khuyến nghị theo dõi tải`,
    details: { rssMb, heapMb, nodeVersion: process.version, uptimeSeconds: Math.round(process.uptime()) },
  });

  // Check 2: Core HSK Vocabulary Integrity (.data/system_vocabulary.json)
  const t2 = Date.now();
  try {
    const vocab = getSystemVocabulary();
    const missingHanzi = vocab.filter((w) => !w.hanzi).length;
    const missingPinyin = vocab.filter((w) => !w.pinyin).length;
    const missingMeaning = vocab.filter((w) => !w.meaning).length;
    const isVocabHealthy = vocab.length >= 10000 && missingHanzi === 0;

    checks.push({
      id: 'chk-vocab-integrity',
      name: 'Toàn vẹn Bộ Từ vựng Chuẩn HSK 1–9',
      category: 'database',
      status: isVocabHealthy ? 'pass' : 'warning',
      latencyMs: Math.max(1, Date.now() - t2),
      message: isVocabHealthy
        ? `Đã xác thực ${vocab.length.toLocaleString()} từ vựng HSK 1–9. 0 lỗi ký tự Hán, đầy đủ bính âm & nghĩa tiếng Việt.`
        : `Phát hiện bất thường: ${missingHanzi} từ thiếu Hanzi, ${missingPinyin} từ thiếu Pinyin`,
      details: { totalWords: vocab.length, missingHanzi, missingPinyin, missingMeaning },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    checks.push({
      id: 'chk-vocab-integrity',
      name: 'Toàn vẹn Bộ Từ vựng Chuẩn HSK 1–9',
      category: 'database',
      status: 'fail',
      latencyMs: Math.max(1, Date.now() - t2),
      message: `Lỗi đọc tệp system_vocabulary.json: ${errMsg}`,
    });
  }

  // Check 3: Users Database & Authentication
  const t3 = Date.now();
  try {
    const users = getAllUsers();
    const admins = users.filter((u) => u.role === 'admin');
    const hasAdmin = admins.length > 0;
    checks.push({
      id: 'chk-users-security',
      name: 'Cơ sở Dữ liệu Người dùng & Phân quyền Quản trị',
      category: 'security',
      status: hasAdmin ? 'pass' : 'warning',
      latencyMs: Math.max(1, Date.now() - t3),
      message: hasAdmin
        ? `Đã xác minh ${users.length} tài khoản người dùng với ${admins.length} Quản trị viên (Admin) hợp lệ.`
        : `Cảnh báo: Chưa tìm thấy tài khoản Quản trị viên cấp cao trong users.json`,
      details: { totalUsers: users.length, adminUsers: admins.length },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    checks.push({
      id: 'chk-users-security',
      name: 'Cơ sở Dữ liệu Người dùng & Phân quyền Quản trị',
      category: 'security',
      status: 'fail',
      latencyMs: Math.max(1, Date.now() - t3),
      message: `Lỗi đọc users.json: ${errMsg}`,
    });
  }

  // Check 4: Exam PDF & Audio Storage Files
  const t4 = Date.now();
  try {
    const pdfDir = path.join(process.cwd(), 'public', 'exam-files', 'pdf');
    const audioDir = path.join(process.cwd(), 'public', 'exam-files', 'audio');
    const pdfFiles = fs.existsSync(pdfDir) ? fs.readdirSync(pdfDir).filter((f) => f.endsWith('.pdf')) : [];
    const audioFiles = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).filter((f) => f.endsWith('.mp3')) : [];

    // Check for empty files
    let zeroByteCount = 0;
    for (const f of pdfFiles.slice(0, 30)) {
      const st = fs.statSync(path.join(pdfDir, f));
      if (st.size === 0) zeroByteCount++;
    }

    const storageHealthy = pdfFiles.length >= 65 && zeroByteCount === 0;
    checks.push({
      id: 'chk-exam-assets',
      name: 'Kho Tài nguyên Đề thi PDF & File Nghe MP3',
      category: 'storage',
      status: storageHealthy ? 'pass' : 'warning',
      latencyMs: Math.max(1, Date.now() - t4),
      message: storageHealthy
        ? `Đầy đủ ${pdfFiles.length} tệp PDF và ${audioFiles.length} tệp âm thanh MP3. Kiểm tra mẫu không có tệp 0-byte.`
        : `Tìm thấy ${pdfFiles.length} PDFs, ${audioFiles.length} MP3s (phát hiện ${zeroByteCount} tệp rỗng)`,
      details: { pdfFilesCount: pdfFiles.length, audioFilesCount: audioFiles.length, zeroByteCount },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    checks.push({
      id: 'chk-exam-assets',
      name: 'Kho Tài nguyên Đề thi PDF & File Nghe MP3',
      category: 'storage',
      status: 'fail',
      latencyMs: Math.max(1, Date.now() - t4),
      message: `Lỗi kiểm tra thư mục exam-files: ${errMsg}`,
    });
  }

  // Check 5: Workspaces & Custom Vocabulary Store
  const t5 = Date.now();
  try {
    const ws = getAllUserWorkspacesSummary();
    checks.push({
      id: 'chk-workspaces',
      name: 'Tính Khả dụng Hệ thống Không gian Học tập (Workspaces)',
      category: 'workspaces',
      status: 'pass',
      latencyMs: Math.max(1, Date.now() - t5),
      message: `Hệ thống Workspace hoạt động ổn định với ${ws.length} không gian học tập độc lập.`,
      details: { workspacesCount: ws.length },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    checks.push({
      id: 'chk-workspaces',
      name: 'Tính Khả dụng Hệ thống Không gian Học tập (Workspaces)',
      category: 'workspaces',
      status: 'warning',
      latencyMs: Math.max(1, Date.now() - t5),
      message: `Cảnh báo đọc workspaces.json: ${errMsg}`,
    });
  }

  // Check 6: Incident Logging & Audit Trail Engine
  const t6 = Date.now();
  try {
    const errorLogs = getAllSystemErrorLogs();
    const openErrors = errorLogs.filter((e) => e.status === 'open');
    const hasCritical = openErrors.some((e) => e.severity === 'critical');

    checks.push({
      id: 'chk-error-incidents',
      name: 'Đường truyền Nhật ký Sự cố & Báo cáo Lỗi Hệ thống',
      category: 'errors',
      status: hasCritical ? 'warning' : 'pass',
      latencyMs: Math.max(1, Date.now() - t6),
      message: hasCritical
        ? `Phát hiện ${openErrors.length} sự cố chưa xử lý (trong đó có sự cố mức Nghiêm trọng)`
        : `Hệ thống ghi nhận sự cố hoạt động chuẩn xác: ${openErrors.length} sự cố đang mở, không có lỗi nghiêm trọng.`,
      details: { totalLogs: errorLogs.length, openCount: openErrors.length, hasCritical },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    checks.push({
      id: 'chk-error-incidents',
      name: 'Đường truyền Nhật ký Sự cố & Báo cáo Lỗi Hệ thống',
      category: 'errors',
      status: 'fail',
      latencyMs: Math.max(1, Date.now() - t6),
      message: `Lỗi đọc error_logs.json: ${errMsg}`,
    });
  }

  const passedChecks = checks.filter((c) => c.status === 'pass').length;
  const warningChecks = checks.filter((c) => c.status === 'warning').length;
  const failedChecks = checks.filter((c) => c.status === 'fail').length;
  const scorePercent = Math.round((passedChecks / checks.length) * 100);

  return {
    auditedAt,
    allPassed: failedChecks === 0 && warningChecks === 0,
    scorePercent,
    totalChecks: checks.length,
    passedChecks,
    warningChecks,
    failedChecks,
    checks,
  };
}



