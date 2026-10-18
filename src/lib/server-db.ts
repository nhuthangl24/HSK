import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, UserRole, AdminStats, AuditLog, UserSettings, SystemConfig, UserFeedback } from '@/types/auth';
import { VocabItem, Topic, CustomHskGroup } from '@/types/vocabulary';
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
  if (!payload?.userId) {
    return { isAdmin: false, userId: '', email: '', role: 'user' };
  }

  const caller = getUserRecordById(payload.userId);
  const email = (caller?.email || payload.email || '').trim().toLowerCase();
  const role = caller?.role || payload.role;
  const isLocked = caller?.isLocked ?? false;

  const isAdmin = !isLocked && (role === 'admin' || isUserAdmin(email, role));
  return {
    isAdmin,
    userId: payload.userId,
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

export function getTopics(userId?: string): Topic[] {
  let stored = readJsonFile<Topic[]>('topics.json', []);
  if (stored.length === 0) {
    stored = [...DEFAULT_SYSTEM_TOPICS];
    writeJsonFile('topics.json', stored);
  }

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

  let totalReviews = 0;
  let masteredCount = 0;
  for (const vId of Object.keys(userProgress)) {
    const p = userProgress[vId];
    if (p.hanziStatus === 'correct' || (p.srs && p.srs.repetition >= 2)) {
      masteredCount++;
    }
    totalReviews += p.srs?.totalReviews || 0;
  }

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

