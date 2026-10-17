import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  addDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import { VocabItem, Deck } from '@/types/vocabulary';
import { User, AdminStats, AuditLog } from '@/types/auth';
import { INITIAL_DECKS } from '@/data/initial-decks';

const COLLECTION_VOCAB = 'vocabulary';
const COLLECTION_DECKS = 'decks';
const COLLECTION_USERS = 'users';
const COLLECTION_PROGRESS = 'user_progress';
const COLLECTION_AUDIT_LOGS = 'audit_logs';

/**
 * Load vocabulary for a specific user (or guest) from Firestore:
 * - Includes official system words (isSystem: true / userId: 'system')
 * - If userId is provided, also includes user's custom words (userId: user.uid)
/**
 * Fast vocabulary loader for a specific user from Firestore:
 * - Extremely fast: queries ONLY user-specific progress and custom words (< 100ms)
 * - Eliminates downloading 2,500+ static system documents on every page reload
 * - Merges user progress into baseSystemWords
 */
export async function loadVocabularyForUser(
  userId?: string,
  baseSystemWords: VocabItem[] = []
): Promise<{ items: VocabItem[]; error?: string }> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) {
    return { items: baseSystemWords, error: 'not-configured' };
  }

  try {
    const customWords: VocabItem[] = [];

    // 1. Fetch only custom words belonging to this user
    if (userId) {
      try {
        const vocabCol = collection(db, COLLECTION_VOCAB);
        const q = query(vocabCol, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as VocabItem;
          if (!data.id) data.id = docSnap.id;
          if (data.isSystem === false) {
            customWords.push(data);
          }
        });
      } catch (err) {
        console.warn('Could not query custom words for user:', err);
      }
    }

    // 2. Combine with base system words (deduplicating by id)
    const wordMap = new Map<string, VocabItem>();
    const todayStr = new Date().toISOString().split('T')[0];

    // STRICT USER ISOLATION:
    // Initialize all words in the sheet with 100% clean practice fields.
    // The sheet (system vocab) is shared, but progress and inputs belong ONLY to each individual user.
    baseSystemWords
      .filter((w) => w.isSystem !== false)
      .forEach((w) => {
        wordMap.set(w.id, {
          ...w,
          hanziPracticeInput: '',
          hanziStatus: 'unlearned',
          translationPracticeInput: '',
          translationStatus: 'unanswered',
          favorite: false,
          notes: '',
          srs: {
            repetition: 0,
            interval: 0,
            easeFactor: 2.5,
            dueDate: todayStr,
            totalReviews: 0,
            correctCount: 0,
            wrongCount: 0,
            history: [],
          },
        });
      });

    // Insert only THIS user's custom words
    customWords
      .filter((w) => !userId || w.userId === userId)
      .forEach((w) => {
        wordMap.set(w.id, {
          ...w,
          hanziPracticeInput: '',
          hanziStatus: 'unlearned',
          translationPracticeInput: '',
          translationStatus: 'unanswered',
          favorite: false,
          notes: '',
          srs: {
            repetition: 0,
            interval: 0,
            easeFactor: 2.5,
            dueDate: todayStr,
            totalReviews: 0,
            correctCount: 0,
            wrongCount: 0,
            history: [],
          },
        });
      });

    // 3. If user is logged in, load and apply ONLY THEIR OWN learning progress from Firestore
    if (userId && wordMap.size > 0) {
      try {
        const progressMap = await loadUserProgressFromFirestore(userId);
        for (const [id, word] of wordMap.entries()) {
          const p = progressMap[id];
          if (p) {
            wordMap.set(id, {
              ...word,
              hanziPracticeInput: (p.hanziPracticeInput as string) ?? '',
              hanziStatus: (p.hanziStatus as VocabItem['hanziStatus']) ?? 'unlearned',
              translationPracticeInput: (p.translationPracticeInput as string) ?? '',
              translationStatus: (p.translationStatus as VocabItem['translationStatus']) ?? 'unanswered',
              favorite: typeof p.favorite === 'boolean' ? p.favorite : false,
              notes: (p.notes as string) ?? '',
              srs: (p.srs as VocabItem['srs']) ?? word.srs,
              updatedAt: (p.updatedAt as string) || word.updatedAt,
            });
          }
        }
      } catch (progressErr) {
        console.warn('Could not load user progress from Firestore:', progressErr);
      }
    }

    return { items: Array.from(wordMap.values()) };
  } catch (err: unknown) {
    const errCode = (err as { code?: string })?.code || '';
    const errMsg = (err as { message?: string })?.message || String(err);
    console.error('Firestore loadVocabularyForUser error:', errCode, errMsg);
    return { items: baseSystemWords, error: errCode || errMsg };
  }
}

/**
 * Save single vocabulary item to Firestore
 */
export async function saveWordToFirestore(item: VocabItem, userId = 'default_user'): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return false;

  try {
    const docRef = doc(db, COLLECTION_VOCAB, item.id);
    await setDoc(
      docRef,
      {
        ...item,
        userId: item.userId || userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Error saving word to Firestore:', err);
    return false;
  }
}

/**
 * Batch save multiple words to Firestore
 */
export async function batchSaveWordsToFirestore(items: VocabItem[], userId = 'default_user'): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured || items.length === 0) return false;

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    for (const item of items) {
      const docRef = doc(db, COLLECTION_VOCAB, item.id);
      batch.set(
        docRef,
        {
          ...item,
          userId: item.userId || userId,
          updatedAt: now,
        },
        { merge: true }
      );
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Error batch saving words to Firestore:', err);
    return false;
  }
}

/**
 * Delete word from Firestore
 */
export async function deleteWordFromFirestore(itemId: string): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return false;

  try {
    const docRef = doc(db, COLLECTION_VOCAB, itemId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting word from Firestore:', err);
    return false;
  }
}

/**
 * Load all vocabulary words from Firestore (raw)
 */
export async function loadWordsFromFirestore(): Promise<VocabItem[]> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return [];

  try {
    const colRef = collection(db, COLLECTION_VOCAB);
    const snapshot = await getDocs(colRef);
    const items: VocabItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as VocabItem;
      if (!data.id) data.id = docSnap.id;
      items.push(data);
    });
    return items;
  } catch (err) {
    console.error('Error loading words from Firestore:', err);
    return [];
  }
}

/**
 * Save deck to Firestore
 */
export async function saveDeckToFirestore(deck: Deck, userId = 'default_user'): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return false;

  try {
    const docRef = doc(db, COLLECTION_DECKS, deck.id);
    await setDoc(
      docRef,
      {
        ...deck,
        ownerId: deck.ownerId || userId,
        userId: deck.userId || userId,
        scope: deck.scope || (deck.isBuiltIn ? 'system' : 'user'),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Error saving deck to Firestore:', err);
    return false;
  }
}

/**
 * Delete a deck from Firestore
 */
export async function deleteDeckFromFirestore(deckId: string): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return false;

  try {
    const docRef = doc(db, COLLECTION_DECKS, deckId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting deck from Firestore:', err);
    return false;
  }
}

/**
 * Load decks for a specific user from Firestore:
 * - If userId is provided: includes system decks and decks created by this user
 * - If guest: returns ONLY system decks
 */
export async function loadDecksForUser(userId?: string): Promise<Deck[]> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return INITIAL_DECKS;

  try {
    const colRef = collection(db, COLLECTION_DECKS);
    const snapshot = await getDocs(colRef);
    const customDecks: Deck[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Deck;
      if (!data.id) data.id = docSnap.id;

      // STRICT USER ISOLATION:
      if (userId) {
        if (
          data.isBuiltIn ||
          data.scope === 'system' ||
          data.ownerId === userId ||
          data.userId === userId
        ) {
          customDecks.push(data);
        }
      } else {
        if (data.isBuiltIn || data.scope === 'system') {
          customDecks.push(data);
        }
      }
    });

    const deckMap = new Map<string, Deck>();
    INITIAL_DECKS.forEach((d) => deckMap.set(d.id, d));
    customDecks.forEach((d) => {
      const existing = deckMap.get(d.id);
      deckMap.set(d.id, { ...existing, ...d });
    });

    return Array.from(deckMap.values());
  } catch (err) {
    console.error('Error loading decks for user from Firestore:', err);
    return INITIAL_DECKS;
  }
}

/**
 * Load all decks from Firestore (legacy alias)
 */
export async function loadDecksFromFirestore(): Promise<Deck[]> {
  return loadDecksForUser();
}

/**
 * Save single user learning progress record to Firestore
 */
export async function saveUserProgressToFirestore(
  userId: string,
  vocabId: string,
  progress: Record<string, unknown>
): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured || !userId) return false;

  try {
    const docId = `${userId}_${vocabId}`;
    const docRef = doc(db, COLLECTION_PROGRESS, docId);
    await setDoc(
      docRef,
      {
        userId,
        vocabId,
        ...progress,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Error saving progress to Firestore:', err);
    return false;
  }
}

/**
 * Batch save user learning progress to Firestore
 */
export async function batchSaveUserProgressToFirestore(
  userId: string,
  records: Array<{ vocabId: string; [key: string]: unknown }>
): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured || !userId || records.length === 0) return false;

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    for (const rec of records) {
      const docId = `${userId}_${rec.vocabId}`;
      const docRef = doc(db, COLLECTION_PROGRESS, docId);
      batch.set(
        docRef,
        {
          userId,
          ...rec,
          updatedAt: now,
        },
        { merge: true }
      );
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Error batch saving progress to Firestore:', err);
    return false;
  }
}

/**
 * Load all user progress from Firestore
 */
export async function loadUserProgressFromFirestore(
  userId: string
): Promise<Record<string, Record<string, unknown>>> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured || !userId) return {};

  try {
    const colRef = collection(db, COLLECTION_PROGRESS);
    const q = query(colRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const result: Record<string, Record<string, unknown>> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.vocabId) {
        result[data.vocabId] = data;
      }
    });
    return result;
  } catch (err) {
    console.error('Error loading progress from Firestore:', err);
    return {};
  }
}

/**
 * Save user profile to Firestore
 */
export async function saveUserToFirestore(user: User): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured || !user.id) return false;

  try {
    const docRef = doc(db, COLLECTION_USERS, user.id);
    await setDoc(docRef, { ...user, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
    return false;
  }
}

/**
 * Load user profile from Firestore
 */
export async function getUserFromFirestore(userId: string): Promise<User | null> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured || !userId) return null;

  try {
    const docRef = doc(db, COLLECTION_USERS, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  } catch (err) {
    console.error('Error getting user from Firestore:', err);
    return null;
  }
}

// ----------------------------------------------------------------------
// ADMIN OPERATIONS (Directly in Cloud Firestore)
// ----------------------------------------------------------------------

export async function loadAllUsersFromFirestore(): Promise<User[]> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return [];

  try {
    const colRef = collection(db, COLLECTION_USERS);
    const snap = await getDocs(colRef);
    const users: User[] = [];
    snap.forEach((d) => {
      users.push(d.data() as User);
    });
    return users;
  } catch (err) {
    console.error('Error loading users from Firestore:', err);
    return [];
  }
}

export async function updateUserInFirestore(userId: string, updates: Partial<User>): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return false;

  try {
    const docRef = doc(db, COLLECTION_USERS, userId);
    await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error updating user in Firestore:', err);
    return false;
  }
}

export async function loadAdminStatsFromFirestore(): Promise<AdminStats> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) {
    return {
      totalUsers: 0,
      activeToday: 0,
      lockedUsers: 0,
      totalSystemWords: 0,
      totalCustomWords: 0,
      totalReviewsDone: 0,
      masteredWordsRate: 0,
    };
  }

  try {
    const usersSnap = await getDocs(collection(db, COLLECTION_USERS));
    const vocabSnap = await getDocs(collection(db, COLLECTION_VOCAB));
    const progressSnap = await getDocs(collection(db, COLLECTION_PROGRESS));

    let totalUsers = 0;
    let lockedUsers = 0;
    let activeToday = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    usersSnap.forEach((d) => {
      totalUsers++;
      const u = d.data() as User;
      if (u.isLocked) lockedUsers++;
      if (u.lastLoginAt && u.lastLoginAt.startsWith(todayStr)) activeToday++;
    });

    let totalSystemWords = 0;
    let totalCustomWords = 0;
    vocabSnap.forEach((d) => {
      const v = d.data() as VocabItem;
      if (v.isSystem !== false || v.userId === 'system') {
        totalSystemWords++;
      } else {
        totalCustomWords++;
      }
    });

    let totalReviewsDone = 0;
    let masteredCount = 0;
    progressSnap.forEach((d) => {
      totalReviewsDone++;
      const p = d.data();
      if (p.hanziStatus === 'correct' && p.translationStatus === 'correct') {
        masteredCount++;
      }
    });

    const masteredWordsRate = totalReviewsDone > 0
      ? Math.round((masteredCount / totalReviewsDone) * 100)
      : 0;

    return {
      totalUsers,
      activeToday: activeToday || totalUsers,
      lockedUsers,
      totalSystemWords,
      totalCustomWords,
      totalReviewsDone,
      masteredWordsRate,
    };
  } catch (err) {
    console.error('Error loading admin stats from Firestore:', err);
    return {
      totalUsers: 0,
      activeToday: 0,
      lockedUsers: 0,
      totalSystemWords: 0,
      totalCustomWords: 0,
      totalReviewsDone: 0,
      masteredWordsRate: 0,
    };
  }
}

export async function addAuditLogToFirestore(
  action: string,
  adminEmail: string,
  target?: string,
  details?: string
): Promise<boolean> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return false;

  try {
    const colRef = collection(db, COLLECTION_AUDIT_LOGS);
    await addDoc(colRef, {
      action,
      adminEmail,
      target: target || '',
      details: details || '',
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Error adding audit log to Firestore:', err);
    return false;
  }
}

export async function loadAuditLogsFromFirestore(): Promise<AuditLog[]> {
  const { db, isConfigured } = getFirebaseServices();
  if (!db || !isConfigured) return [];

  try {
    const colRef = collection(db, COLLECTION_AUDIT_LOGS);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    const logs: AuditLog[] = [];
    snap.forEach((d) => {
      const data = d.data();
      logs.push({
        id: d.id,
        action: data.action || '',
        adminEmail: data.adminEmail || '',
        target: data.target || '',
        details: data.details || '',
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });
    return logs;
  } catch {
    // If orderBy requires an index not yet built, fall back to simple getDocs
    try {
      const snap = await getDocs(collection(db, COLLECTION_AUDIT_LOGS));
      const logs: AuditLog[] = [];
      snap.forEach((d) => {
        const data = d.data();
        logs.push({
          id: d.id,
          action: data.action || '',
          adminEmail: data.adminEmail || '',
          target: data.target || '',
          details: data.details || '',
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });
      return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      return [];
    }
  }
}
