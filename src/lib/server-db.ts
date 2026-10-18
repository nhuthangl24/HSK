import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, UserRole, AdminStats, AuditLog, UserSettings, SystemConfig, UserFeedback, PracticedWordRecord } from '@/types/auth';
import { VocabItem, Topic, CustomHskGroup } from '@/types/vocabulary';
import { ExamItem } from '@/types/exam';
import { AppNotification } from '@/types/notification';
import { hashPassword, verifyPassword, isUserAdmin, extractToken, verifyToken } from './server-auth';
import bundledSystemVocab from '@/data/system_vocab.json';

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
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;

  const headerUserId = request.headers.get('x-user-id') || request.headers.get('x-client-user-id');
  const headerEmail = (request.headers.get('x-user-email') || '').trim().toLowerCase();
  const headerRole = (request.headers.get('x-user-role') as UserRole) || 'user';

  const effectiveUserId = payload?.userId || headerUserId || '';
  const effectiveEmail = (payload?.email || headerEmail || '').trim().toLowerCase();
  const effectiveRole = payload?.role || headerRole;

  if (!effectiveUserId && !effectiveEmail) {
    return { isAdmin: false, userId: '', email: '', role: 'user' };
  }

  const caller = effectiveUserId ? getUserRecordById(effectiveUserId) : null;
  const email = (caller?.email || effectiveEmail || '').trim().toLowerCase();
  const role = caller?.role || effectiveRole;
  const isLocked = caller?.isLocked ?? false;

  const isAdmin = !isLocked && (role === 'admin' || isUserAdmin(email, role));
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

export function getAllFeedbacks(): UserFeedback[] {
  return readJsonFile<UserFeedback[]>('feedbacks.json', []);
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
    "isPinned": false,
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
    "downloadsCount": 590,
    "createdAt": "2024-05-25T11:30:00.000Z",
    "updatedAt": "2024-05-25T11:30:00.000Z"
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
    "description": "Đề thi thật HSK Cấp 3 mã đề H31001. Đầy đủ phần nghe hiểu chuẩn phòng thi, phần đọc hiểu và phần viết tay. Tài liệu ôn thi lý tưởng trước khi bước vào kỳ thi thực tế.",
    "pdfUrl": "/exam-files/pdf/hsk3_h31001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_h31001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_h31001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1820,
    "downloadsCount": 640,
    "createdAt": "2024-09-18T16:00:00.000Z",
    "updatedAt": "2024-09-18T16:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk3-h31002",
    "title": "Đề thi thật HSK 3 Mã H31002 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Đề thi thật chuẩn hóa mã H31002 thuộc hệ thống đề thi quốc tế HSK 3. Tích hợp audio MP3 chất lượng cao, file PDF đề thi rõ nét và bảng đáp án chính thức từ CTI Hanban.",
    "pdfUrl": "/exam-files/pdf/hsk3_h31002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_h31002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_h31002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1950,
    "downloadsCount": 710,
    "createdAt": "2025-01-20T08:45:00.000Z",
    "updatedAt": "2025-01-20T08:45:00.000Z"
  },
  {
    "id": "official-hanban-hsk3-h31003",
    "title": "Đề thi thật HSK 3 Mã H31003 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 3,
    "category": "official",
    "year": 2025,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 90,
    "questionCount": 80,
    "description": "Đề thi thật mã đề H31003 kỳ thi HSK 3 do Hanban phát hành. Kiểm tra toàn diện 3 kỹ năng Nghe - Đọc - Viết ở mức độ trung cấp 600 từ vựng cốt lõi.",
    "pdfUrl": "/exam-files/pdf/hsk3_h31003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk3_h31003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk3_h31003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1450,
    "downloadsCount": 510,
    "createdAt": "2025-05-10T14:00:00.000Z",
    "updatedAt": "2025-05-10T14:00:00.000Z"
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
    "description": "Đề thi chính thức HSK Cấp 4 chuẩn quốc tế. Gồm 45 câu Nghe hiểu, 40 câu Đọc hiểu và 15 câu Viết (sắp xếp câu và viết câu theo tranh). Đầy đủ audio phòng thi và đáp án.",
    "pdfUrl": "/exam-files/pdf/hsk4_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 2890,
    "downloadsCount": 1150,
    "createdAt": "2024-03-15T08:15:00.000Z",
    "updatedAt": "2024-03-15T08:15:00.000Z"
  },
  {
    "id": "official-hanban-hsk4-h41001",
    "title": "Đề thi thật HSK 4 Mã H41001 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2022,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi thật HSK Cấp 4 mã đề H41001. Cung cấp bài tập rèn luyện cho 1.200 từ vựng và các cấu trúc ngữ pháp trung cấp, kèm đáp án chuẩn xác từ ban tổ chức thi.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2100,
    "downloadsCount": 830,
    "createdAt": "2024-06-20T10:00:00.000Z",
    "updatedAt": "2024-06-20T10:00:00.000Z"
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
    "description": "Đề thi chuẩn hóa HSK Cấp 4 mã H41002. Bản scan đề thi chuẩn sắc nét, audio tốc độ chuẩn quốc tế và đáp án chi tiết phục vụ luyện đề chuyên sâu.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2320,
    "downloadsCount": 940,
    "createdAt": "2024-10-15T15:30:00.000Z",
    "updatedAt": "2024-10-15T15:30:00.000Z"
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
    "description": "Đề thi thật HSK 4 mã H41003 do Hanban CTI phát hành. Bài thi chuẩn 100 câu phân bổ đều 3 phần thi Nghe - Đọc - Viết kèm file audio phòng thi sống động.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1980,
    "downloadsCount": 790,
    "createdAt": "2025-02-28T09:00:00.000Z",
    "updatedAt": "2025-02-28T09:00:00.000Z"
  },
  {
    "id": "official-hanban-hsk4-h41004",
    "title": "Đề thi thật HSK 4 Mã H41004 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 4,
    "category": "official",
    "year": 2025,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 105,
    "questionCount": 100,
    "description": "Đề thi chính thức HSK 4 mã đề H41004. Cung cấp nguồn tài liệu luyện thi thực chiến sát với độ khó của đề thi trên máy và trên giấy hiện nay.",
    "pdfUrl": "/exam-files/pdf/hsk4_h41004_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk4_h41004_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk4_h41004_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1750,
    "downloadsCount": 680,
    "createdAt": "2025-06-15T11:20:00.000Z",
    "updatedAt": "2025-06-15T11:20:00.000Z"
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
    "description": "Đề thi chính thức HSK Cấp 5 chuẩn quốc tế. Gồm 45 câu Nghe hiểu nâng cao, 45 câu Đọc hiểu đoạn văn dài và 10 câu Viết luận (viết đoạn văn kết hợp từ vựng và tranh ảnh). Kèm audio và đáp án.",
    "pdfUrl": "/exam-files/pdf/hsk5_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 3120,
    "downloadsCount": 1340,
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
    "description": "Đề thi thật HSK Cấp 5 mã đề H50000. Đánh giá khả năng đọc báo chí, xem phim tiếng Trung và diễn đạt lưu loát với vốn từ 2.500 từ vựng. Đầy đủ đề thi PDF, audio và đáp án.",
    "pdfUrl": "/exam-files/pdf/hsk5_h50000_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h50000_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h50000_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2400,
    "downloadsCount": 980,
    "createdAt": "2024-07-10T13:40:00.000Z",
    "updatedAt": "2024-07-10T13:40:00.000Z"
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
    "description": "Đề thi thật chuẩn quốc tế HSK 5 mã H51001. Đầy đủ phần nghe 45 câu tốc độ tự nhiên, bài đọc chuyên khảo và phần viết luận ngắn 80 chữ kèm lời giải chuẩn.",
    "pdfUrl": "/exam-files/pdf/hsk5_h51001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h51001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h51001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2680,
    "downloadsCount": 1110,
    "createdAt": "2024-11-05T10:15:00.000Z",
    "updatedAt": "2024-11-05T10:15:00.000Z"
  },
  {
    "id": "official-hanban-hsk5-h51002",
    "title": "Đề thi thật HSK 5 Mã H51002 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 125,
    "questionCount": 100,
    "description": "Đề thi chính thức HSK Cấp 5 mã đề H51002. Bộ tài liệu gồm file câu hỏi PDF nguyên bản, audio MP3 chất lượng cao đã tối ưu và đáp án đối chiếu từ ban khảo thí.",
    "pdfUrl": "/exam-files/pdf/hsk5_h51002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h51002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h51002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2890,
    "downloadsCount": 1220,
    "createdAt": "2025-03-12T14:50:00.000Z",
    "updatedAt": "2025-03-12T14:50:00.000Z"
  },
  {
    "id": "official-hanban-hsk5-h51003",
    "title": "Đề thi thật HSK 5 Mã H51003 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 5,
    "category": "official",
    "year": 2025,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 125,
    "questionCount": 100,
    "description": "Đề thi thật HSK Cấp 5 mã H51003 do Hanban CTI phát hành. Bộ đề chuẩn chỉnh giúp thí sinh rèn luyện kỹ năng phân bổ thời gian và chiến lược giải quyết bài đọc dài.",
    "pdfUrl": "/exam-files/pdf/hsk5_h51003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk5_h51003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk5_h51003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2150,
    "downloadsCount": 890,
    "createdAt": "2025-07-22T08:30:00.000Z",
    "updatedAt": "2025-07-22T08:30:00.000Z"
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
    "description": "Đề thi chính thức HSK Cấp 6 cấp độ cao cấp nhất của hệ thống 6 bậc. Gồm 50 câu Nghe phóng sự/phỏng vấn, 50 câu Đọc hiểu văn học/khoa học và 1 bài Tóm tắt văn bản 1.000 chữ thành 400 chữ. Kèm audio và đáp án chuẩn.",
    "pdfUrl": "/exam-files/pdf/hsk6_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 3580,
    "downloadsCount": 1620,
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
    "description": "Đề thi thật HSK Cấp 6 mã H60000 chuẩn Hanban. Yêu cầu làm chủ trên 5.000 từ vựng và khả năng diễn đạt lưu loát như người bản xứ. Đầy đủ đề thi PDF, audio và đáp án.",
    "pdfUrl": "/exam-files/pdf/hsk6_h60000_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h60000_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h60000_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2750,
    "downloadsCount": 1180,
    "createdAt": "2024-08-05T12:00:00.000Z",
    "updatedAt": "2024-08-05T12:00:00.000Z"
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
    "description": "Đề thi chính thức HSK Cấp 6 mã đề H61001. Cung cấp bài thi toàn diện với các bài báo khoa học xã hội, phóng sự âm thanh và bài viết rút gọn văn bản kinh điển.",
    "pdfUrl": "/exam-files/pdf/hsk6_h61001_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h61001_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h61001_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 3100,
    "downloadsCount": 1390,
    "createdAt": "2024-12-10T16:15:00.000Z",
    "updatedAt": "2024-12-10T16:15:00.000Z"
  },
  {
    "id": "official-hanban-hsk6-h61002",
    "title": "Đề thi thật HSK 6 Mã H61002 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi thật chuẩn quốc tế HSK 6 mã H61002 do Hanban CTI phát hành. Bản in sắc nét kèm file nghe MP3 chất lượng cao, phục vụ luyện thi học bổng thạc sĩ, tiến sĩ.",
    "pdfUrl": "/exam-files/pdf/hsk6_h61002_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h61002_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h61002_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 3340,
    "downloadsCount": 1510,
    "createdAt": "2025-04-14T09:30:00.000Z",
    "updatedAt": "2025-04-14T09:30:00.000Z"
  },
  {
    "id": "official-hanban-hsk6-h61003",
    "title": "Đề thi thật HSK 6 Mã H61003 — Hanban Past Papers (Full Audio & Đáp án)",
    "hskLevel": 6,
    "category": "official",
    "year": 2025,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban",
    "durationMinutes": 140,
    "questionCount": 101,
    "description": "Đề thi thật HSK Cấp 6 mã đề H61003. Kiểm tra trình độ tiếng Trung đỉnh cao với các câu hỏi bẫy ngữ pháp, thành ngữ bốn chữ và tư duy viết văn súc tích.",
    "pdfUrl": "/exam-files/pdf/hsk6_h61003_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk6_h61003_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk6_h61003_answers.pdf",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2690,
    "downloadsCount": 1140,
    "createdAt": "2025-08-18T15:00:00.000Z",
    "updatedAt": "2025-08-18T15:00:00.000Z"
  },
  {
    "id": "official-cti-hsk79-sample",
    "title": "Đề thi thật HSK Cấp 7–9 Cao Cấp — Hanban / CTI (Kèm Audio MP3 & Đáp án)",
    "hskLevel": 7,
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 210,
    "questionCount": 98,
    "description": "Đề thi chính thức cấp độ HSK 7-9 (Cao Cấp) theo hệ thống tiêu chuẩn HSK 3.0 mới nhất. Gồm 5 kỹ năng toàn diện: Nghe hiểu, Đọc hiểu, Viết luận chuyên sâu, Dịch thuật và Khẩu ngữ nâng cao.",
    "pdfUrl": "/exam-files/pdf/hsk79_exam.pdf",
    "audioUrl": "/exam-files/audio/hsk79_listening.mp3",
    "answerUrl": "/exam-files/pdf/hsk79_answers.pdf",
    "isPinned": true,
    "status": "published",
    "viewsCount": 4210,
    "downloadsCount": 1950,
    "createdAt": "2024-04-01T08:00:00.000Z",
    "updatedAt": "2024-04-01T08:00:00.000Z"
  },
  {
    "id": "official-cti-hskk-primary",
    "title": "Đề thi Khẩu ngữ HSKK Sơ Cấp — Hanban / CTI (Kèm Audio MP3)",
    "hskLevel": "HSKK",
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 20,
    "questionCount": 27,
    "description": "Đề thi thật Khẩu ngữ HSKK Sơ cấp chuẩn hóa. Gồm 3 phần: Nghe lặp lại câu (15 câu), Nghe và trả lời ngắn (10 câu), và Trả lời câu hỏi tự luận (2 câu). Kèm audio hướng dẫn phòng thi.",
    "pdfUrl": "/exam-files/pdf/hskk_primary_exam.pdf",
    "audioUrl": "/exam-files/audio/hskk_primary.mp3",
    "isPinned": false,
    "status": "published",
    "viewsCount": 1650,
    "downloadsCount": 610,
    "createdAt": "2024-03-20T10:00:00.000Z",
    "updatedAt": "2024-03-20T10:00:00.000Z"
  },
  {
    "id": "official-cti-hskk-intermediate",
    "title": "Đề thi Khẩu ngữ HSKK Trung Cấp — Hanban / CTI (Kèm Audio MP3)",
    "hskLevel": "HSKK",
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 23,
    "questionCount": 14,
    "description": "Đề thi thật Khẩu ngữ HSKK Trung cấp chuẩn quốc tế. Cấu trúc gồm: Nghe nhắc lại câu (10 câu), Miêu tả tranh ảnh (2 câu) và Trả lời câu hỏi thảo luận (2 câu). Kèm audio phòng thi hoàn chỉnh.",
    "pdfUrl": "/exam-files/pdf/hskk_intermediate_exam.pdf",
    "audioUrl": "/exam-files/audio/hskk_intermediate.mp3",
    "isPinned": false,
    "status": "published",
    "viewsCount": 2130,
    "downloadsCount": 850,
    "createdAt": "2024-03-20T10:30:00.000Z",
    "updatedAt": "2024-03-20T10:30:00.000Z"
  },
  {
    "id": "official-cti-hskk-advanced",
    "title": "Đề thi Khẩu ngữ HSKK Cao Cấp — Hanban / CTI (Kèm Audio MP3)",
    "hskLevel": "HSKK",
    "category": "official",
    "year": 2024,
    "source": "Ủy ban Khảo thí Hán ngữ Quốc tế Hanban / CTI",
    "durationMinutes": 25,
    "questionCount": 6,
    "description": "Đề thi thật Khẩu ngữ HSKK Cao cấp chuẩn hóa quốc tế. Cấu trúc gồm: Nghe và thuật lại đoạn văn dài (3 câu), Đọc diễn cảm đoạn văn (1 bài) và Thuyết trình quan điểm theo chủ đề (2 câu).",
    "pdfUrl": "/exam-files/pdf/hskk_advanced_exam.pdf",
    "audioUrl": "/exam-files/audio/hskk_advanced.mp3",
    "isPinned": false,
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
  return Array.isArray(stored) ? stored : [];
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
  const filtered = list.filter((n) => n.id !== id);
  if (filtered.length === list.length) return false;
  writeJsonFile('notifications.json', filtered);
  return true;
}



