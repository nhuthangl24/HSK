import { Deck } from '@/types/vocabulary';

export const PROTECTED_DECK_IDS = [
  'deck-all',
  'deck-hsk1',
  'deck-hsk2',
  'deck-hsk3',
  'deck-hsk4',
  'deck-hsk5',
  'deck-hsk6',
];

/**
 * Check if a deck is a permanent core level (H1 - H6 and All vocab).
 * Core HSK 1 - 6 cannot be deleted by users.
 * All other custom decks/topics can be freely added or deleted.
 */
export function isProtectedDeck(deckId: string): boolean {
  return PROTECTED_DECK_IDS.includes(deckId);
}

export const INITIAL_DECKS: Deck[] = [
  {
    id: 'deck-all',
    name: 'Tất cả từ vựng',
    description: 'Toàn bộ kho từ vựng từ HSK 1 đến HSK 9',
    hskLevel: 'all',
    isBuiltIn: true,
    color: '#3b82f6',
    icon: 'Layers',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deck-hsk1',
    name: 'HSK 1 - Nhập môn',
    description: '150 từ vựng căn bản nhất: chào hỏi, bản thân, gia đình, sinh hoạt thường nhật',
    hskLevel: 1,
    isBuiltIn: true,
    color: '#10b981',
    icon: 'BookOpen',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deck-hsk2',
    name: 'HSK 2 - Sơ cấp',
    description: '300 từ vựng sơ cấp: mua sắm, du lịch, hỏi đường, sức khỏe',
    hskLevel: 2,
    isBuiltIn: true,
    color: '#06b6d4',
    icon: 'Compass',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deck-hsk3',
    name: 'HSK 3 - Trung cấp 1',
    description: '600 từ vựng: công việc, học tập, diễn đạt cảm xúc và ý kiến cá nhân',
    hskLevel: 3,
    isBuiltIn: true,
    color: '#f59e0b',
    icon: 'Award',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deck-hsk4',
    name: 'HSK 4 - Trung cấp 2',
    description: '1200 từ vựng: giao tiếp lưu loát, thảo luận chủ đề xã hội, văn bản thực tế',
    hskLevel: 4,
    isBuiltIn: true,
    color: '#ec4899',
    icon: 'TrendingUp',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deck-hsk5',
    name: 'HSK 5 - Cao cấp 1',
    description: '2500 từ vựng: đọc báo, xem phim, thuyết trình học thuật và kinh tế',
    hskLevel: 5,
    isBuiltIn: true,
    color: '#8b5cf6',
    icon: 'GraduationCap',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deck-hsk6',
    name: 'HSK 6 - Cao cấp 2',
    description: '5000+ từ vựng: thành thạo diễn đạt bằng văn viết và văn nói chuyên sâu',
    hskLevel: 6,
    isBuiltIn: true,
    color: '#ef4444',
    icon: 'Sparkles',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'deck-business',
    name: 'Tiếng Trung Thương Mại',
    description: 'Giao dịch đàm phán, hợp đồng, xuất nhập khẩu và thư tín thương mại',
    hskLevel: 'custom',
    isBuiltIn: false,
    color: '#0d9488',
    icon: 'Briefcase',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
