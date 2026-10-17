export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ReviewResult = 'correct' | 'wrong' | 'uncertain' | 'unlearned';
export type TranslationResult = 'correct' | 'review' | 'unanswered';

export interface SrsReviewRecord {
  date: string;
  mode: 'hanzi' | 'meaning' | 'translate' | 'smart';
  result: ReviewResult;
  userAnswer?: string;
}

export interface SrsData {
  repetition: number;
  interval: number; // in days
  easeFactor: number; // default 2.5 (SM-2)
  dueDate: string; // ISO date string YYYY-MM-DD
  lastReviewedAt?: string;
  totalReviews: number;
  correctCount: number;
  wrongCount: number;
  history: SrsReviewRecord[];
}

export interface VocabItem {
  id: string;
  deckId: string;
  hskLevel: HskLevel;
  hanzi: string;
  pinyin: string;
  meaning: string;
  partOfSpeech?: string;
  
  // Practice fields
  hanziPracticeInput?: string;
  hanziStatus: ReviewResult;
  
  // Example sentence fields
  example: string;
  examplePinyin: string;
  exampleMeaning: string;
  
  // Translation practice fields
  translationPracticeInput?: string;
  translationStatus: TranslationResult;
  
  // Meta and SRS
  notes?: string;
  favorite?: boolean;
  isSystem?: boolean;
  userId?: string;
  topicId?: string;
  topicName?: string;
  scope?: 'system' | 'user';
  srs: SrsData;
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  hskLevel?: HskLevel | 'all' | 'custom';
  isBuiltIn?: boolean;
  scope?: 'system' | 'user';
  ownerId?: string;
  userId?: string;
  color?: string;
  icon?: string;
  wordCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  scope: 'system' | 'user';
  ownerId?: string; // 'system' or user id
  color?: string;
  icon?: string;
  wordCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomHskGroup {
  id: string;
  name: string;
  levelNumber?: number;
  description?: string;
  scope: 'system' | 'user';
  ownerId?: string;
  color?: string;
  icon?: string;
  wordCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type StudyMode =
  | 'full_table'            // A. Chế độ bảng đầy đủ
  | 'hanzi_recall'          // B. Chế độ ôn chữ Hán (ẩn chữ Hán, nhập chữ Hán)
  | 'meaning_recall'        // C. Chế độ nhớ nghĩa (Hanzi <-> Việt)
  | 'sentence_translation'  // D. Chế độ luyện dịch câu (Việt -> Trung)
  | 'smart_srs';            // E. Chế độ ôn tập thông minh (ưu tiên sai, chưa học, quá hạn)

export type TableColumnId =
  | 'index'
  | 'hanzi'
  | 'pinyin'
  | 'meaning'
  | 'hanzi_practice'
  | 'hanzi_status'
  | 'example'
  | 'example_pinyin'
  | 'example_meaning'
  | 'translation_practice'
  | 'translation_status'
  | 'actions';

export interface ColumnConfig {
  id: TableColumnId;
  label: string;
  width: number;
  minWidth: number;
  visible: boolean;
  sticky?: boolean;
  resizable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface FilterOptions {
  searchQuery: string;
  hskLevel?: HskLevel | 'all';
  hanziStatus?: ReviewResult | 'all';
  translationStatus?: TranslationResult | 'all';
  favoriteOnly: boolean;
  onlyDueForReview: boolean;
  wordSource?: 'all' | 'system' | 'custom';
  completedOnly?: boolean;
  sortBy: 'index' | 'hanzi' | 'pinyin' | 'status' | 'hsk' | 'dueDate';
  sortOrder: 'asc' | 'desc';
}

export interface StudySessionConfig {
  deckId: string;
  mode: StudyMode;
  targetCount: number; // 10, 20, 50, all
  filterType: 'all' | 'wrong_only' | 'unlearned_only' | 'due_only';
}

export interface StudySummary {
  totalStudied: number;
  correctCount: number;
  wrongCount: number;
  uncertainCount: number;
  startTime: string;
  endTime: string;
}

export interface DeckStatistics {
  total: number;
  unlearned: number;
  learning: number; // uncertain or in-progress
  mastered: number; // correct with repetition >= 2
  needsReview: number; // wrong or due today
  retentionRate: number; // percentage of correct reviews overall
  dueTodayCount: number;
}
