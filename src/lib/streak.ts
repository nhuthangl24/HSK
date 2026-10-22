'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserProgressMap } from './storage';

export interface StreakRecord {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  activeDates: string[];  // distinct sorted YYYY-MM-DD strings
}

const STREAK_KEY_PREFIX = 'hsk_streak_data_v2_';

const EMPTY_STREAK: StreakRecord = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  activeDates: [],
};

/**
 * Returns the local date string in YYYY-MM-DD format based on local client time.
 */
export function getLocalDateString(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's local date string in YYYY-MM-DD format.
 */
export function getYesterdayDateString(today?: Date): string {
  const t = today || new Date();
  const y = new Date(t);
  y.setDate(y.getDate() - 1);
  return getLocalDateString(y);
}

/**
 * Calculates calendar day difference between dateStr1 and dateStr2 (dateStr2 - dateStr1).
 */
export function daysBetweenDates(dateStr1: string, dateStr2: string): number {
  try {
    const d1 = new Date(`${dateStr1}T00:00:00`);
    const d2 = new Date(`${dateStr2}T00:00:00`);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
  } catch {
    return 0;
  }
}

/**
 * Recovers or seeds streak data from existing user word progress if no streak record exists yet.
 */
function seedStreakFromProgress(userId?: string): StreakRecord {
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  try {
    const progressMap = getUserProgressMap(userId);
    const dateSet = new Set<string>();

    for (const item of Object.values(progressMap)) {
      if (item && item.updatedAt) {
        try {
          const dateStr = getLocalDateString(new Date(item.updatedAt));
          dateSet.add(dateStr);
        } catch {}
      }
    }

    const sortedDates = Array.from(dateSet).sort();
    if (sortedDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
        activeDates: [],
      };
    }

    const lastActive = sortedDates[sortedDates.length - 1];
    const diffToToday = daysBetweenDates(lastActive, today);

    // If last activity was today or yesterday, compute consecutive streak backwards
    let streak = 0;
    if (diffToToday <= 1) {
      let checkDate = lastActive;
      while (dateSet.has(checkDate)) {
        streak++;
        const prev = new Date(`${checkDate}T00:00:00`);
        prev.setDate(prev.getDate() - 1);
        checkDate = getLocalDateString(prev);
      }
    }

    return {
      currentStreak: streak,
      longestStreak: Math.max(streak, sortedDates.length > 0 ? 1 : 0),
      lastActiveDate: lastActive,
      activeDates: sortedDates.slice(-90),
    };
  } catch {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      activeDates: [],
    };
  }
}

/**
 * Retrieves the current streak record for a given user or guest.
 * Verifies if streak was broken (missed yesterday) and updates state if needed.
 */
export function getStreak(userId?: string): StreakRecord {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', activeDates: [] };
  }

  const key = `${STREAK_KEY_PREFIX}${userId || 'guest'}`;
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  try {
    const raw = localStorage.getItem(key);
    let record: StreakRecord | null = raw ? JSON.parse(raw) : null;

    if (!record || typeof record.currentStreak !== 'number') {
      record = seedStreakFromProgress(userId);
      try {
        localStorage.setItem(key, JSON.stringify(record));
      } catch {}
      return record;
    }

    // Check if streak was broken (last active date is older than yesterday)
    if (record.lastActiveDate) {
      const diff = daysBetweenDates(record.lastActiveDate, today);
      if (diff > 1 && record.currentStreak > 0) {
        // More than 1 day passed without studying -> streak reset to 0 until active today
        record = {
          ...record,
          currentStreak: 0,
        };
        try {
          localStorage.setItem(key, JSON.stringify(record));
        } catch {}
      }
    }

    return record;
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', activeDates: [] };
  }
}

/**
 * Records a study action (answering cards, practicing Hanzi, doing quizzes, finishing grammar).
 * Extends or starts streak and notifies subscribers via DOM events.
 */
export function recordStudyActivity(userId?: string): StreakRecord {
  if (typeof window === 'undefined') {
    return { currentStreak: 1, longestStreak: 1, lastActiveDate: getLocalDateString(), activeDates: [] };
  }

  const key = `${STREAK_KEY_PREFIX}${userId || 'guest'}`;
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();
  const current = getStreak(userId);

  let newStreak = current.currentStreak;

  if (current.lastActiveDate === today) {
    // Already studied today
    newStreak = Math.max(1, current.currentStreak);
  } else if (current.lastActiveDate === yesterday) {
    // Consecutive day
    newStreak = (current.currentStreak || 0) + 1;
  } else {
    // Brand new streak or restarted after gap
    newStreak = 1;
  }

  const longestStreak = Math.max(current.longestStreak || 0, newStreak);
  const activeDatesSet = new Set(current.activeDates || []);
  activeDatesSet.add(today);
  const activeDates = Array.from(activeDatesSet).sort().slice(-90);

  const updated: StreakRecord = {
    currentStreak: newStreak,
    longestStreak,
    lastActiveDate: today,
    activeDates,
  };

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  // Sync to auth user cache if logged in
  try {
    const authRaw = localStorage.getItem('hsk_auth_user_cache_v2');
    if (authRaw) {
      const authUser = JSON.parse(authRaw);
      if (authUser && (!userId || authUser.id === userId)) {
        authUser.streakDays = newStreak;
        localStorage.setItem('hsk_auth_user_cache_v2', JSON.stringify(authUser));
      }
    }
  } catch {}

  // Broadcast event across components in the current tab
  try {
    window.dispatchEvent(
      new CustomEvent('hsk_streak_updated', {
        detail: { userId: userId || 'guest', streak: updated },
      })
    );
  } catch {}

  return updated;
}

/**
 * React hook to reactively subscribe to the user's streak.
 */
export function useStreak(userId?: string) {
  const [streak, setStreak] = useState<StreakRecord>(EMPTY_STREAK);
  const [isActiveToday, setIsActiveToday] = useState(false);

  const refreshStreak = useCallback(() => {
    if (typeof window === 'undefined') return;
    const s = getStreak(userId);
    setStreak(s);
    const today = getLocalDateString();
    setIsActiveToday(s.lastActiveDate === today && s.currentStreak > 0);
  }, [userId]);

  useEffect(() => {
    refreshStreak();

    const handleStreakEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; streak: StreakRecord }>;
      if (!customEvent.detail || !customEvent.detail.userId || customEvent.detail.userId === (userId || 'guest')) {
        refreshStreak();
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(STREAK_KEY_PREFIX)) {
        refreshStreak();
      }
    };

    const handleActivityEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string }>;
      if (!customEvent.detail || !customEvent.detail.userId || customEvent.detail.userId === (userId || 'guest')) {
        recordStudyActivity(userId);
      }
    };

    window.addEventListener('hsk_streak_updated', handleStreakEvent);
    window.addEventListener('hsk_user_activity', handleActivityEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('hsk_streak_updated', handleStreakEvent);
      window.removeEventListener('hsk_user_activity', handleActivityEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [userId, refreshStreak]);

  return {
    streak,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActiveDate: streak.lastActiveDate,
    isActiveToday,
    recordActivity: () => recordStudyActivity(userId),
  };
}
