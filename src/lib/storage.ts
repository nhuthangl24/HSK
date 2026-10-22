import { VocabItem, Deck, ColumnConfig } from '@/types/vocabulary';
import { INITIAL_DECKS, isProtectedDeck } from '@/data/initial-decks';

const STORAGE_KEY_VOCAB = 'hsk_vocab_data_v6';
const STORAGE_KEY_DECKS_LEGACY = 'hsk_decks_data_v1';
const STORAGE_KEY_COLUMNS = 'hsk_column_settings_v1';

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'index', label: 'STT', width: 60, minWidth: 50, visible: true, sticky: true, align: 'center' },
  { id: 'hanzi', label: 'Từ mới (Chữ Hán)', width: 140, minWidth: 100, visible: true, align: 'center' },
  { id: 'pinyin', label: 'Phiên âm', width: 150, minWidth: 110, visible: true, align: 'center' },
  { id: 'meaning', label: 'Nghĩa tiếng Việt', width: 190, minWidth: 140, visible: true, align: 'left' },
  { id: 'stroke_order', label: 'Cách viết', width: 120, minWidth: 100, visible: true, align: 'center' },
  { id: 'hanzi_practice', label: 'Ôn tập chữ Hán', width: 160, minWidth: 120, visible: true, align: 'center' },
  { id: 'hanzi_status', label: 'Kết quả', width: 130, minWidth: 100, visible: true, align: 'center' },
  { id: 'example', label: 'Ví dụ (Chữ Hán)', width: 230, minWidth: 160, visible: true, align: 'left' },
  { id: 'example_pinyin', label: 'Phiên âm ví dụ', width: 230, minWidth: 160, visible: true, align: 'left' },
  { id: 'example_meaning', label: 'Dịch', width: 230, minWidth: 160, visible: true, align: 'left' },
  { id: 'translation_practice', label: 'Tập dịch', width: 220, minWidth: 150, visible: true, align: 'left' },
  { id: 'translation_status', label: 'Kết quả dịch', width: 130, minWidth: 100, visible: true, align: 'center' },
  { id: 'actions', label: 'Thao tác', width: 80, minWidth: 70, visible: true, align: 'center' },
];

export interface UserProgressData {
  hanziPracticeInput?: string;
  hanziStatus?: 'correct' | 'wrong' | 'uncertain' | 'unlearned';
  translationPracticeInput?: string;
  translationStatus?: 'correct' | 'review' | 'unanswered';
  favorite?: boolean;
  notes?: string;
  srs?: VocabItem['srs'];
  updatedAt?: string;
}

export type UserProgressMap = Record<string, UserProgressData>;

const STORAGE_KEY_PROGRESS_PREFIX = 'hsk_progress_map_v2_';
const STORAGE_KEY_CUSTOM_WORDS_PREFIX = 'hsk_custom_words_v2_';

export function recoverLegacyProgress(userId?: string): UserProgressMap {
  if (typeof window === 'undefined') return {};
  const progressMap: UserProgressMap = {};

  try {
    const keysToCheck = [
      userId ? `hsk_vocab_user_${userId}` : null,
      userId ? `hsk_vocab_${userId}` : null,
      STORAGE_KEY_VOCAB,
      'hsk_vocab_data_v6',
      'hsk_vocab_data_v5',
      'hsk_vocab_data_v4',
      'hsk_vocab_data_v3',
      'hsk_vocab_data_v2',
      'hsk_vocab_data_v1',
    ].filter(Boolean) as string[];

    for (const key of keysToCheck) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (!item || !item.id) continue;
            const hasInput = !!item.hanziPracticeInput && item.hanziPracticeInput.trim().length > 0;
            const hasStatus = item.hanziStatus && item.hanziStatus !== 'unlearned';
            const hasTranslation = !!item.translationPracticeInput && item.translationPracticeInput.trim().length > 0;
            const hasFav = !!item.favorite;
            const hasNotes = !!item.notes && item.notes.trim().length > 0;

            if (hasInput || hasStatus || hasTranslation || hasFav || hasNotes) {
              if (!progressMap[item.id]) {
                progressMap[item.id] = {
                  hanziPracticeInput: item.hanziPracticeInput || '',
                  hanziStatus: item.hanziStatus || 'unlearned',
                  translationPracticeInput: item.translationPracticeInput || '',
                  translationStatus: item.translationStatus || 'unanswered',
                  favorite: !!item.favorite,
                  notes: item.notes || '',
                  srs: item.srs,
                  updatedAt: item.updatedAt || new Date().toISOString(),
                };
              }
            }
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Recovery error:', err);
  }

  return progressMap;
}

export function getUserProgressMap(userId?: string): UserProgressMap {
  if (typeof window === 'undefined') return {};
  const key = `${STORAGE_KEY_PROGRESS_PREFIX}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
    }
    // Attempt auto-recovery from legacy cache keys if empty
    const recovered = recoverLegacyProgress(userId);
    if (Object.keys(recovered).length > 0) {
      try {
        localStorage.setItem(key, JSON.stringify(recovered));
      } catch {}
      return recovered;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveUserProgressMap(progressMap: UserProgressMap, userId?: string): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEY_PROGRESS_PREFIX}${userId || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(progressMap));
    try {
      window.dispatchEvent(new CustomEvent('hsk_user_activity', { detail: { userId } }));
    } catch {}
  } catch (err) {
    console.error('Failed to save user progress map:', err);
  }
}

export function saveSingleUserProgress(
  vocabId: string,
  progress: Partial<UserProgressData>,
  userId?: string
): void {
  if (typeof window === 'undefined' || !vocabId) return;
  try {
    const currentMap = getUserProgressMap(userId);
    currentMap[vocabId] = {
      ...(currentMap[vocabId] || {}),
      ...progress,
      updatedAt: new Date().toISOString(),
    };
    saveUserProgressMap(currentMap, userId);

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('hsk_user_activity', { detail: { userId } }));
      } catch {}
    }
  } catch (err) {
    console.error('Failed to save single progress:', err);
  }
}

export function getStoredVocab(userId?: string): VocabItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOCAB);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 11000) return [];

    const progressMap = getUserProgressMap(userId);
    const customWordsRaw = localStorage.getItem(`${STORAGE_KEY_CUSTOM_WORDS_PREFIX}${userId || 'guest'}`);
    const customWords: VocabItem[] = customWordsRaw ? JSON.parse(customWordsRaw) : [];

    const mergedSystem = parsed
      .filter((item: VocabItem) => item.isSystem !== false)
      .map((item: VocabItem) => {
        const p = progressMap[item.id];
        if (p) {
          return {
            ...item,
            hanziPracticeInput: p.hanziPracticeInput ?? '',
            hanziStatus: p.hanziStatus ?? 'unlearned',
            translationPracticeInput: p.translationPracticeInput ?? '',
            translationStatus: p.translationStatus ?? 'unanswered',
            favorite: typeof p.favorite === 'boolean' ? p.favorite : false,
            notes: p.notes ?? '',
            srs: p.srs ?? item.srs,
            updatedAt: p.updatedAt || item.updatedAt,
          };
        }
        return {
          ...item,
          hanziPracticeInput: '',
          hanziStatus: 'unlearned' as const,
          translationPracticeInput: '',
          translationStatus: 'unanswered' as const,
          favorite: false,
          notes: '',
        };
      });

    return [...customWords, ...mergedSystem];
  } catch (e) {
    console.error('Failed to parse stored vocab:', e);
    return [];
  }
}

export function saveStoredVocab(items: VocabItem[], userId?: string): void {
  if (typeof window === 'undefined' || !items || items.length === 0) return;
  try {
    // 1. Extract and save user progress map (lightweight, zero quota risk)
    const progressMap = getUserProgressMap(userId);
    let changed = false;
    for (const item of items) {
      const hasInput = !!item.hanziPracticeInput && item.hanziPracticeInput.trim().length > 0;
      const hasStatus = item.hanziStatus && item.hanziStatus !== 'unlearned';
      const hasTranslation = !!item.translationPracticeInput && item.translationPracticeInput.trim().length > 0;
      const hasFav = !!item.favorite;
      const hasNotes = !!item.notes && item.notes.trim().length > 0;
      if (hasInput || hasStatus || hasTranslation || hasFav || hasNotes) {
        progressMap[item.id] = {
          hanziPracticeInput: item.hanziPracticeInput || '',
          hanziStatus: item.hanziStatus || 'unlearned',
          translationPracticeInput: item.translationPracticeInput || '',
          translationStatus: item.translationStatus || 'unanswered',
          favorite: !!item.favorite,
          notes: item.notes || '',
          srs: item.srs,
          updatedAt: item.updatedAt || new Date().toISOString(),
        };
        changed = true;
      }
    }
    if (changed) {
      saveUserProgressMap(progressMap, userId);
    }

    // 2. Save any custom words
    const customWords = items.filter((item) => item.isSystem === false);
    if (customWords.length > 0) {
      try {
        localStorage.setItem(`${STORAGE_KEY_CUSTOM_WORDS_PREFIX}${userId || 'guest'}`, JSON.stringify(customWords));
      } catch {}
    }

    // 3. Keep base clean system vocab in general cache
    if (!localStorage.getItem(STORAGE_KEY_VOCAB)) {
      const cleanSystemWordsOnly = items
        .filter((item: VocabItem) => item.isSystem !== false)
        .map((item: VocabItem) => ({
          ...item,
          hanziPracticeInput: '',
          hanziStatus: 'unlearned' as const,
          translationPracticeInput: '',
          translationStatus: 'unanswered' as const,
          favorite: false,
          notes: '',
        }));
      if (cleanSystemWordsOnly.length > 0) {
        localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(cleanSystemWordsOnly));
      }
    }
  } catch (e) {
    console.error('Failed to save vocab to localStorage:', e);
  }
}

export function getStoredDecks(userId?: string): Deck[] {
  if (typeof window === 'undefined') return INITIAL_DECKS;
  try {
    // Purge legacy shared key to prevent custom decks from leaking across guest/accounts
    if (localStorage.getItem(STORAGE_KEY_DECKS_LEGACY)) {
      localStorage.removeItem(STORAGE_KEY_DECKS_LEGACY);
    }

    // 1. Load any system decks created by admin
    const systemDecks: Deck[] = [];
    const rawSys = localStorage.getItem('hsk_system_decks');
    if (rawSys) {
      try {
        const parsedSys = JSON.parse(rawSys);
        if (Array.isArray(parsedSys)) {
          parsedSys.forEach((d: Deck) => {
            if (!isProtectedDeck(d.id) && (d.scope === 'system' || d.ownerId === 'system' || d.userId === 'system')) {
              systemDecks.push({ ...d, scope: 'system' });
            }
          });
        }
      } catch {}
    }

    // 2. Load user personal decks
    const userCustomDecks: Deck[] = [];
    if (userId) {
      const key = `hsk_decks_user_${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((d: Deck) => {
              if (!isProtectedDeck(d.id) && d.id !== 'deck-business') {
                if (d.scope === 'system' || d.ownerId === 'system' || d.userId === 'system') {
                  systemDecks.push({ ...d, scope: 'system' });
                } else if (d.ownerId === userId || d.userId === userId) {
                  userCustomDecks.push({ ...d, ownerId: userId, userId, scope: 'user' });
                }
              }
            });
          }
        } catch {}
      }
    }

    const map = new Map<string, Deck>();
    INITIAL_DECKS.forEach((d) => map.set(d.id, d));
    systemDecks.forEach((d) => map.set(d.id, d));
    userCustomDecks.forEach((d) => map.set(d.id, d));

    return Array.from(map.values());
  } catch (e) {
    console.error('Failed to parse stored decks:', e);
    return INITIAL_DECKS;
  }
}

export function saveStoredDecks(decks: Deck[], userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    // Purge legacy key
    localStorage.removeItem(STORAGE_KEY_DECKS_LEGACY);

    // Save system decks to shared key so all users and guests can view admin-created folders
    const systemDecks = decks.filter(
      (d) => isProtectedDeck(d.id) || d.scope === 'system' || d.ownerId === 'system' || d.userId === 'system'
    );
    localStorage.setItem('hsk_system_decks', JSON.stringify(systemDecks));

    if (userId) {
      const key = `hsk_decks_user_${userId}`;
      const sanitized = decks.filter(
        (d) =>
          isProtectedDeck(d.id) ||
          d.id === 'deck-business' ||
          d.scope === 'system' ||
          d.ownerId === 'system' ||
          d.userId === 'system' ||
          d.ownerId === userId ||
          d.userId === userId
      );
      localStorage.setItem(key, JSON.stringify(sanitized));
    }

    // Broadcast update to all components in current page & other tabs
    window.dispatchEvent(new CustomEvent('hsk_decks_updated', { detail: decks }));
  } catch (e) {
    console.error('Failed to save decks to localStorage:', e);
  }
}


export function getStoredColumns(): ColumnConfig[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNS);
    if (!raw) return DEFAULT_COLUMNS;
    const parsed: ColumnConfig[] = JSON.parse(raw);
    // Ensure all default columns are present in case schema was updated
    const existingMap = new Map(parsed.map((c) => [c.id, c]));
    return DEFAULT_COLUMNS.map((col) => {
      const saved = existingMap.get(col.id);
      return saved ? { ...col, ...saved } : col;
    });
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export function saveStoredColumns(cols: ColumnConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(cols));
  } catch (e) {
    console.error('Failed to save column settings:', e);
  }
}

export function exportBackupJSON(items: VocabItem[], decks: Deck[]): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    decks,
    items,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `HSK_Vocabulary_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
