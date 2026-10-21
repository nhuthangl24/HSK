import { SrsData, ReviewResult, VocabItem, DeckStatistics } from '@/types/vocabulary';

export function getTodayDateString(): string {
  if (typeof window === 'undefined') {
    return '2026-10-16';
  }
  return new Date().toISOString().split('T')[0];
}

export function createInitialSrs(): SrsData {
  const today = getTodayDateString();
  return {
    repetition: 0,
    interval: 0,
    easeFactor: 2.5,
    dueDate: today,
    totalReviews: 0,
    correctCount: 0,
    wrongCount: 0,
    history: [],
  };
}

export type AnkiRating = 'again' | 'hard' | 'good' | 'easy';

export interface AnkiIntervalPreview {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

export function getAnkiIntervalPreview(srs: SrsData): AnkiIntervalPreview {
  const { repetition, interval, easeFactor } = srs;

  // Again is always < 10m in session, or 1d next day
  const againText = '< 10 phút';

  // Hard
  const hardInterval = Math.max(1, Math.round((interval || 1) * 1.2));
  const hardText = `${hardInterval} ngày`;

  // Good
  let goodInterval: number;
  if (repetition === 0) goodInterval = 1;
  else if (repetition === 1) goodInterval = 3;
  else goodInterval = Math.max(1, Math.round((interval || 1) * (easeFactor || 2.5)));
  const goodText = `${goodInterval} ngày`;

  // Easy
  let easyInterval: number;
  if (repetition === 0) easyInterval = 4;
  else if (repetition === 1) easyInterval = 7;
  else easyInterval = Math.max(2, Math.round((interval || 1) * (easeFactor || 2.5) * 1.3));
  const easyText = `${easyInterval} ngày`;

  return {
    again: againText,
    hard: hardText,
    good: goodText,
    easy: easyText,
  };
}

export function calculateAnkiSrs(
  currentSrs: SrsData,
  rating: AnkiRating
): { nextSrs: SrsData; intervalDays: number; hanziStatus: ReviewResult } {
  let { repetition, easeFactor } = currentSrs;
  const { interval } = currentSrs;
  let intervalDays = 1;
  let hanziStatus: ReviewResult = 'correct';
  let isCorrect = true;

  if (rating === 'again') {
    repetition = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    hanziStatus = 'wrong';
    isCorrect = false;
  } else if (rating === 'hard') {
    repetition = Math.max(1, repetition);
    intervalDays = Math.max(1, Math.round((interval || 1) * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    hanziStatus = 'uncertain';
    isCorrect = true;
  } else if (rating === 'good') {
    if (repetition === 0) intervalDays = 1;
    else if (repetition === 1) intervalDays = 3;
    else intervalDays = Math.max(1, Math.round((interval || 1) * easeFactor));
    repetition += 1;
    hanziStatus = 'correct';
    isCorrect = true;
  } else if (rating === 'easy') {
    if (repetition === 0) intervalDays = 4;
    else if (repetition === 1) intervalDays = 7;
    else intervalDays = Math.max(2, Math.round((interval || 1) * easeFactor * 1.3));
    repetition += 1;
    easeFactor = Math.min(3.0, easeFactor + 0.15);
    hanziStatus = 'correct';
    isCorrect = true;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  const dueDate = nextDate.toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  const newHistory = [
    {
      date: nowIso,
      mode: 'smart' as const,
      result: hanziStatus,
      userAnswer: rating,
    },
    ...currentSrs.history.slice(0, 19),
  ];

  const nextSrs: SrsData = {
    repetition,
    interval: intervalDays,
    easeFactor: Number(easeFactor.toFixed(2)),
    dueDate,
    lastReviewedAt: nowIso,
    totalReviews: currentSrs.totalReviews + 1,
    correctCount: currentSrs.correctCount + (isCorrect ? 1 : 0),
    wrongCount: currentSrs.wrongCount + (!isCorrect ? 1 : 0),
    history: newHistory,
  };

  return { nextSrs, intervalDays, hanziStatus };
}

/**
 * SuperMemo SM-2 algorithm implementation
 * quality:
 * 5 = correct, effortless
 * 3 = correct, with hesitation / uncertain
 * 1 = incorrect / failed recall
 */
export function calculateNextSrs(
  currentSrs: SrsData,
  result: ReviewResult,
  mode: 'hanzi' | 'meaning' | 'translate' | 'smart',
  userAnswer?: string
): SrsData {
  let quality: number;
  if (result === 'correct') {
    quality = 5;
  } else if (result === 'uncertain') {
    quality = 3;
  } else {
    quality = 1;
  }

  let { repetition, interval, easeFactor } = currentSrs;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  // Calculate new Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calculate new dueDate
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const dueDate = nextDate.toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  const newHistory = [
    {
      date: nowIso,
      mode,
      result,
      userAnswer,
    },
    ...currentSrs.history.slice(0, 19), // Keep latest 20 records
  ];

  return {
    repetition,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    dueDate,
    lastReviewedAt: nowIso,
    totalReviews: currentSrs.totalReviews + 1,
    correctCount: currentSrs.correctCount + (result === 'correct' ? 1 : 0),
    wrongCount: currentSrs.wrongCount + (result === 'wrong' ? 1 : 0),
    history: newHistory,
  };
}

export function isItemDueForReview(item: VocabItem): boolean {
  if (item.hanziStatus === 'unlearned') return false;
  if (item.hanziStatus === 'wrong') return true;
  const today = getTodayDateString();
  return !!item.srs.dueDate && item.srs.dueDate <= today;
}

export function calculateDeckStats(items: VocabItem[]): DeckStatistics {
  const total = items.length;
  if (total === 0) {
    return {
      total: 0,
      unlearned: 0,
      learning: 0,
      mastered: 0,
      needsReview: 0,
      retentionRate: 0,
      dueTodayCount: 0,
    };
  }

  let unlearned = 0;
  let learning = 0;
  let mastered = 0;
  let needsReview = 0;
  let dueTodayCount = 0;
  let totalReviews = 0;
  let totalCorrect = 0;

  const today = getTodayDateString();

  for (const item of items) {
    totalReviews += item.srs.totalReviews;
    totalCorrect += item.srs.correctCount;

    const isDue =
      item.hanziStatus !== 'unlearned' &&
      (item.hanziStatus === 'wrong' || (!!item.srs.dueDate && item.srs.dueDate <= today));
    if (isDue) {
      dueTodayCount++;
    }

    if (item.hanziStatus === 'unlearned') {
      unlearned++;
    } else if (item.hanziStatus === 'wrong') {
      needsReview++;
    } else if (item.hanziStatus === 'uncertain') {
      learning++;
    } else if (item.hanziStatus === 'correct') {
      if (item.srs.repetition >= 2) {
        mastered++;
      } else {
        learning++;
      }
    }
  }

  const retentionRate =
    totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

  return {
    total,
    unlearned,
    learning,
    mastered,
    needsReview,
    retentionRate,
    dueTodayCount,
  };
}
