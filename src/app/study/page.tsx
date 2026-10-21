'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  Sparkles,
  Volume2,
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Layers,
  Settings2,
  Play,
  Shuffle,
  ChevronRight,
  Trophy,
  BarChart3,
  Star,
  Brain,
  Zap,
  CornerDownLeft,
  X,
  PenTool,
  GraduationCap,
  Sun,
  Moon,
  Bookmark,
  Calendar,
  Compass,
  TrendingUp,
  Lock,
  LogIn,
} from 'lucide-react';

import { VocabItem, DeckStatistics, ReviewResult } from '@/types/vocabulary';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { getStoredVocab, saveStoredVocab } from '@/lib/storage';
import { tts, AvailableVoice } from '@/lib/tts';
import { getHanziFontById, TOP_10_HANZI_FONTS } from '@/lib/hanzi-fonts';
import {
  calculateAnkiSrs,
  getAnkiIntervalPreview,
  isItemDueForReview,
  calculateDeckStats,
  AnkiRating,
  getTodayDateString,
} from '@/lib/srs';
import { StrokeOrderModal } from '@/components/modals/StrokeOrderModal';
import { batchSaveUserProgressToFirestore } from '@/lib/firebase-db';
import { getFirebaseServices } from '@/lib/firebase';
import { AuthModal } from '@/components/modals/AuthModal';

// -------------------------------------------------------------
// Type Definitions
// -------------------------------------------------------------
type StudyViewMode = 'dashboard' | 'session' | 'finished';
type StudyQueueFilter = 'due' | 'new' | 'wrong' | 'all';
type SessionLimit = 10 | 20 | 50 | 100 | 'all';

interface SessionRatingRecord {
  item: VocabItem;
  rating: AnkiRating;
  timestamp: number;
}

export default function StudyPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { effectiveTheme, setTheme, hanziFont, setHanziFont } = useTheme();
  const toast = useToast();

  // Auth Modal for Require Login
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // -------------------------------------------------------------
  // State: Vocabulary & Views
  // -------------------------------------------------------------
  const [items, setItems] = useState<VocabItem[]>([]);
  const [isLoadingVocab, setIsLoadingVocab] = useState(true);
  const [view, setView] = useState<StudyViewMode>('dashboard');

  // Study Setup Controls
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [queueFilter, setQueueFilter] = useState<StudyQueueFilter>('due');
  const [sessionLimit, setSessionLimit] = useState<SessionLimit>(20);

  // Active Session State
  const [sessionQueue, setSessionQueue] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Analytics State
  const [sessionHistory, setSessionHistory] = useState<SessionRatingRecord[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionDurationSec, setSessionDurationSec] = useState<number>(0);
  const [againCount, setAgainCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [easyCount, setEasyCount] = useState(0);

  // TTS & Font Settings (100% compliant with user's settings)
  const [ttsSpeed, setTtsSpeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.85;
    const saved = localStorage.getItem('hsk_tts_rate');
    return saved ? parseFloat(saved) || 0.85 : 0.85;
  });

  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('hsk_tts_voice_name') || '';
  });

  const [autoPronounceFront, setAutoPronounceFront] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('hsk_study_auto_pronounce');
    return saved !== null ? saved === 'true' : true;
  });

  const [availableVoices, setAvailableVoices] = useState<AvailableVoice[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [strokeModalItem, setStrokeModalItem] = useState<VocabItem | null>(null);

  // Active Calligraphy Font
  const activeHanziFontDef = useMemo(() => {
    return getHanziFontById(hanziFont);
  }, [hanziFont]);

  // -------------------------------------------------------------
  // Data Loading: Storage or API
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    setIsLoadingVocab(true);

    const localItems = getStoredVocab(user?.id);
    if (localItems && localItems.length >= 1000) {
      if (isMounted) {
        setItems(localItems);
        setIsLoadingVocab(false);
      }
      return;
    }

    fetch('/api/vocab')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.items && Array.isArray(data.items)) {
          setItems(data.items);
          saveStoredVocab(data.items, user?.id);
        }
      })
      .catch((err) => {
        console.error('Failed to load vocab:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingVocab(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const voices = tts.getAvailableVoices();
    setAvailableVoices(voices);

    const cleanup = tts.onVoicesChanged((updatedVoices) => {
      setAvailableVoices(updatedVoices);
    });

    return cleanup;
  }, []);

  const handleUpdateTtsRate = (rate: number) => {
    setTtsSpeed(rate);
    tts.setRate(rate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hsk_tts_rate', String(rate));
    }
  };

  const handleUpdateVoice = (voiceName: string) => {
    setSelectedVoice(voiceName);
    tts.setVoiceByName(voiceName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hsk_tts_voice_name', voiceName);
    }
  };

  const handleToggleAutoPronounce = () => {
    setAutoPronounceFront((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_study_auto_pronounce', String(next));
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // Play Audio with saved settings
  // -------------------------------------------------------------
  const playAudio = useCallback(
    (text: string, customRate?: number) => {
      if (!text || typeof window === 'undefined') return;
      setIsSpeaking(true);

      const savedRateStr = localStorage.getItem('hsk_tts_rate');
      const savedVoiceName = localStorage.getItem('hsk_tts_voice_name');
      const rate = customRate ?? (savedRateStr ? parseFloat(savedRateStr) || ttsSpeed : ttsSpeed);

      tts.speak(text, {
        rate: Math.min(Math.max(rate, 0.5), 2.0),
        voiceName: savedVoiceName || selectedVoice || undefined,
      });

      const estimatedDuration = Math.max(700, (text.length * 320) / rate);
      setTimeout(() => {
        setIsSpeaking(false);
      }, estimatedDuration);
    },
    [ttsSpeed, selectedVoice]
  );

  // -------------------------------------------------------------
  // Compute Deck Metrics
  // -------------------------------------------------------------
  const overallStats = useMemo(() => {
    return calculateDeckStats(items);
  }, [items]);

  const deckCardsInfo = useMemo(() => {
    const today = getTodayDateString();

    const getDeckMetrics = (filterFn: (item: VocabItem) => boolean) => {
      const deckWords = items.filter(filterFn);
      const total = deckWords.length;
      let newCount = 0;
      let learnCount = 0;
      let dueCount = 0;
      let masteredCount = 0;

      for (const item of deckWords) {
        const isDue =
          item.hanziStatus !== 'unlearned' &&
          (item.hanziStatus === 'wrong' || (!!item.srs.dueDate && item.srs.dueDate <= today));

        if (isDue) {
          dueCount++;
        }

        if (item.hanziStatus === 'unlearned' || item.srs.totalReviews === 0) {
          newCount++;
        } else if (item.hanziStatus === 'uncertain' || (item.hanziStatus === 'correct' && item.srs.repetition < 2)) {
          learnCount++;
        } else if (item.hanziStatus === 'correct' && item.srs.repetition >= 2) {
          masteredCount++;
        }
      }

      return { total, newCount, learnCount, dueCount, masteredCount };
    };

    return [
      {
        id: 'all',
        title: 'Toàn bộ từ vựng',
        subtitle: 'Kho 11,000+ từ HSK 1 - 9 & từ cá nhân',
        badge: 'Tổng thể',
        badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        accentBar: 'from-emerald-500 to-teal-500',
        metrics: getDeckMetrics(() => true),
      },
      {
        id: '1',
        title: 'HSK 1',
        subtitle: 'Cấp độ Nhập môn chuẩn HSK 3.0',
        badge: 'HSK 1',
        badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        accentBar: 'from-sky-500 to-blue-500',
        metrics: getDeckMetrics((i) => i.hskLevel === 1),
      },
      {
        id: '2',
        title: 'HSK 2',
        subtitle: 'Cấp độ Sơ cấp giao tiếp thường nhật',
        badge: 'HSK 2',
        badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        accentBar: 'from-teal-500 to-emerald-500',
        metrics: getDeckMetrics((i) => i.hskLevel === 2),
      },
      {
        id: '3',
        title: 'HSK 3',
        subtitle: 'Cấp độ Tiền Trung cấp thông dụng',
        badge: 'HSK 3',
        badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        accentBar: 'from-emerald-500 to-green-500',
        metrics: getDeckMetrics((i) => i.hskLevel === 3),
      },
      {
        id: '4',
        title: 'HSK 4',
        subtitle: 'Cấp độ Trung cấp thảo luận chủ đề',
        badge: 'HSK 4',
        badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        accentBar: 'from-amber-500 to-yellow-500',
        metrics: getDeckMetrics((i) => i.hskLevel === 4),
      },
      {
        id: '5',
        title: 'HSK 5',
        subtitle: 'Cấp độ Cao cấp đọc báo và bài viết',
        badge: 'HSK 5',
        badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        accentBar: 'from-orange-500 to-rose-500',
        metrics: getDeckMetrics((i) => i.hskLevel === 5),
      },
      {
        id: '6',
        title: 'HSK 6',
        subtitle: 'Cấp độ Điêu luyện diễn đạt tự nhiên',
        badge: 'HSK 6',
        badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        accentBar: 'from-rose-500 to-red-500',
        metrics: getDeckMetrics((i) => i.hskLevel === 6),
      },
      {
        id: '7',
        title: 'HSK 7 - 9',
        subtitle: 'Cấp độ Chuyên gia bản ngữ học thuật',
        badge: 'HSK 7-9',
        badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        accentBar: 'from-purple-500 to-indigo-500',
        metrics: getDeckMetrics((i) => i.hskLevel === 7 || i.hskLevel > 6),
      },
      {
        id: 'starred',
        title: 'Từ đánh dấu sao',
        subtitle: 'Danh sách từ vựng trọng tâm của bạn',
        badge: 'Yêu thích',
        badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        accentBar: 'from-yellow-400 to-amber-500',
        metrics: getDeckMetrics((i) => Boolean(i.favorite)),
      },
    ];
  }, [items]);

  // -------------------------------------------------------------
  // Session Launching
  // -------------------------------------------------------------
  const startStudySession = (targetDeckId?: string, overrideFilter?: StudyQueueFilter) => {
    const deckId = targetDeckId || selectedDeckId;
    const filter = overrideFilter || queueFilter;

    let candidateWords = items.filter((item) => {
      if (deckId === 'all') return true;
      if (deckId === 'starred') return Boolean(item.favorite);
      const lvl = parseInt(deckId, 10);
      return !isNaN(lvl) && item.hskLevel === lvl;
    });

    if (candidateWords.length === 0) {
      toast.warning('Bộ từ vựng này hiện chưa có từ nào!');
      return;
    }

    let filteredQueue: VocabItem[] = [];

    if (filter === 'due') {
      filteredQueue = candidateWords.filter((i) => isItemDueForReview(i));
      if (filteredQueue.length === 0) {
        toast.info('Hiện chưa có từ nào đến hạn ôn hôm nay! Đang lấy từ mới cho bạn.');
        filteredQueue = candidateWords.filter((i) => i.hanziStatus === 'unlearned');
        if (filteredQueue.length === 0) {
          filteredQueue = [...candidateWords].sort(() => Math.random() - 0.5);
        }
      }
    } else if (filter === 'new') {
      filteredQueue = candidateWords.filter((i) => i.hanziStatus === 'unlearned' || i.srs.totalReviews === 0);
      if (filteredQueue.length === 0) {
        toast.info('Bạn đã học hết từ mới trong bộ này! Đang chuyển sang chế độ ôn tập.');
        filteredQueue = candidateWords;
      }
    } else if (filter === 'wrong') {
      filteredQueue = candidateWords.filter(
        (i) => i.hanziStatus === 'wrong' || i.hanziStatus === 'uncertain' || i.srs.wrongCount > 0
      );
      if (filteredQueue.length === 0) {
        toast.info('Không có từ nào bị đánh dấu sai! Đang mở ôn tập tổng thể.');
        filteredQueue = candidateWords;
      }
    } else {
      filteredQueue = candidateWords;
    }

    // Sort: Due first, then leeches, then new
    filteredQueue.sort((a, b) => {
      const aDue = isItemDueForReview(a);
      const bDue = isItemDueForReview(b);
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return (b.srs?.wrongCount || 0) - (a.srs?.wrongCount || 0);
    });

    const limit = sessionLimit === 'all' ? filteredQueue.length : Math.min(sessionLimit, filteredQueue.length);
    const finalQueue = filteredQueue.slice(0, limit);

    if (finalQueue.length === 0) {
      toast.warning('Không tìm thấy từ vựng nào phù hợp.');
      return;
    }

    setSessionQueue(finalQueue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionHistory([]);
    setAgainCount(0);
    setHardCount(0);
    setGoodCount(0);
    setEasyCount(0);
    setSessionStartTime(Date.now());
    setView('session');

    if (autoPronounceFront && finalQueue[0]?.hanzi) {
      setTimeout(() => {
        playAudio(finalQueue[0].hanzi);
      }, 350);
    }
  };

  const currentCard = sessionQueue[currentIndex] as VocabItem | undefined;

  const intervalPreview = useMemo(() => {
    if (!currentCard) return { again: '< 10m', hard: '1 ngày', good: '3 ngày', easy: '7 ngày' };
    return getAnkiIntervalPreview(currentCard.srs);
  }, [currentCard]);

  const handleFlipCard = useCallback(() => {
    if (!currentCard) return;
    setIsFlipped((prev) => !prev);
  }, [currentCard]);

  // -------------------------------------------------------------
  // Anki Grade Handler (Again, Hard, Good, Easy)
  // -------------------------------------------------------------
  const handleGradeCard = useCallback(
    (rating: AnkiRating) => {
      if (!currentCard) return;

      const { nextSrs, hanziStatus } = calculateAnkiSrs(currentCard.srs, rating);

      const updatedCard: VocabItem = {
        ...currentCard,
        srs: nextSrs,
        hanziStatus,
      };

      setSessionHistory((prev) => [...prev, { item: updatedCard, rating, timestamp: Date.now() }]);

      if (rating === 'again') setAgainCount((c) => c + 1);
      else if (rating === 'hard') setHardCount((c) => c + 1);
      else if (rating === 'good') setGoodCount((c) => c + 1);
      else if (rating === 'easy') setEasyCount((c) => c + 1);

      setItems((prevItems) => {
        const nextItems = prevItems.map((item) => (item.id === updatedCard.id ? updatedCard : item));
        saveStoredVocab(nextItems, user?.id);
        return nextItems;
      });

      if (getFirebaseServices().isConfigured && user) {
        batchSaveUserProgressToFirestore(user.id, [
          {
            vocabId: updatedCard.id,
            hanziPracticeInput: updatedCard.hanziPracticeInput,
            hanziStatus: updatedCard.hanziStatus,
            translationPracticeInput: updatedCard.translationPracticeInput,
            translationStatus: updatedCard.translationStatus,
            favorite: updatedCard.favorite,
            notes: updatedCard.notes,
            srs: updatedCard.srs,
          },
        ]).catch((err) => console.warn('Background sync notice:', err));
      }

      // Re-queue card if Again
      let nextQueue = [...sessionQueue];
      if (rating === 'again') {
        nextQueue.push(updatedCard);
      } else {
        nextQueue[currentIndex] = updatedCard;
      }

      const nextIndex = currentIndex + 1;

      if (nextIndex < nextQueue.length) {
        setSessionQueue(nextQueue);
        setCurrentIndex(nextIndex);
        setIsFlipped(false);

        if (autoPronounceFront && nextQueue[nextIndex]?.hanzi) {
          setTimeout(() => {
            playAudio(nextQueue[nextIndex].hanzi);
          }, 350);
        }
      } else {
        const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
        setSessionDurationSec(durationSec);
        setView('finished');
      }
    },
    [currentCard, sessionQueue, currentIndex, user, sessionStartTime, autoPronounceFront, playAudio]
  );

  const handleToggleFavorite = () => {
    if (!currentCard) return;
    const nextFavorite = !currentCard.favorite;
    const updated = { ...currentCard, favorite: nextFavorite };

    setItems((prev) => {
      const next = prev.map((item) => (item.id === updated.id ? updated : item));
      saveStoredVocab(next, user?.id);
      return next;
    });

    setSessionQueue((prev) => {
      const next = [...prev];
      next[currentIndex] = updated;
      return next;
    });

    toast.info(nextFavorite ? 'Đã thêm từ vào Yêu thích ⭐' : 'Đã bỏ đánh dấu sao');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (view !== 'session') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || showSettingsModal || strokeModalItem) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isFlipped) {
          handleFlipCard();
        } else {
          handleGradeCard('good');
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (currentCard?.hanzi) {
          playAudio(currentCard.hanzi);
        }
      } else if (e.code === 'Digit1' || e.key === '1') {
        if (isFlipped) {
          e.preventDefault();
          handleGradeCard('again');
        }
      } else if (e.code === 'Digit2' || e.key === '2') {
        if (isFlipped) {
          e.preventDefault();
          handleGradeCard('hard');
        }
      } else if (e.code === 'Digit3' || e.key === '3') {
        if (isFlipped) {
          e.preventDefault();
          handleGradeCard('good');
        }
      } else if (e.code === 'Digit4' || e.key === '4') {
        if (isFlipped) {
          e.preventDefault();
          handleGradeCard('easy');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setView('dashboard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isFlipped, currentCard, showSettingsModal, strokeModalItem, handleFlipCard, handleGradeCard, playAudio]);

  // Auth Guard — require login before allowing access
  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col antialiased transition-colors">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-6 py-2.5 transition-colors">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Quay lại Bảng Từ Vựng"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Brain size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Thẻ Ghi Nhớ HSK
                  </h1>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Ghi nhớ thông minh
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Đổi giao diện Sáng / Tối"
              >
                {effectiveTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              </button>
              <button
                type="button"
                onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <LogIn size={13} />
                <span>Đăng nhập</span>
              </button>
            </div>
          </div>
        </header>

        {/* Lock Gate */}
        <div className="flex-1 flex items-center justify-center py-10 px-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xl p-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <Lock size={30} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Yêu Cầu Đăng Nhập Để Ôn Tập
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                Đăng nhập để truy cập hệ thống thẻ ghi nhớ SRS, theo dõi tiến độ và đồng bộ dữ liệu của bạn.
              </p>
            </div>

            {/* Benefits */}
            <ul className="w-full space-y-2.5 text-left">
              {[
                { icon: <Brain size={15} className="text-emerald-500 shrink-0" />, text: 'Thuật toán SRS Anki tự động lên lịch ôn tập tối ưu' },
                { icon: <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />, text: 'Lưu tiến độ & lịch sử ôn tập trên đám mây' },
                { icon: <Flame size={15} className="text-emerald-500 shrink-0" />, text: 'Theo dõi streak và thống kê học tập của bạn' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl px-3 py-2.5">
                  {item.icon}
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="w-full space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <LogIn size={16} />
                Đăng Nhập Ngay
              </button>
              <button
                type="button"
                onClick={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[.98] text-slate-700 dark:text-zinc-200 font-bold text-sm transition-all cursor-pointer"
              >
                Tạo tài khoản mới miễn phí
              </button>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
        />
      </div>
    );
  }

  // Loading State
  if (isLoadingVocab) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg animate-pulse mb-3">
          <Brain size={28} />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Đang chuẩn bị thẻ ghi nhớ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col antialiased transition-colors">
      {/* -------------------------------------------------------------
          TOP APP HEADER
      ------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Back */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Quay lại Bảng Từ Vựng"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shadow-xs shrink-0">
                <Brain size={18} />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Thẻ Ghi Nhớ HSK
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Ghi nhớ thông minh
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Audio Speed, Font Settings, Theme */}
          <div className="flex items-center gap-2">
            {/* Speed pills */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-[11px] font-bold">
              {[0.75, 0.85, 1.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleUpdateTtsRate(rate)}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    Math.abs(ttsSpeed - rate) < 0.04
                      ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-2xs font-extrabold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Cài đặt giọng đọc & phông chữ Hán"
            >
              <Settings2 size={16} />
            </button>

            {/* Dark/Light mode toggle */}
            <button
              type="button"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Đổi giao diện Sáng / Tối"
            >
              {effectiveTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>

            {/* User Profile or Login button */}
            {user ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline truncate max-w-[100px]">{user.name || user.email?.split('@')[0]}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <LogIn size={13} />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          VIEW 1: MODERN ANKI DASHBOARD
      ------------------------------------------------------------- */}
      {view === 'dashboard' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">
          {/* BENTO STATS GRID */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Due Today */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Cần ôn hôm nay
                </span>
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    overallStats.dueTodayCount > 0
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Clock size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {overallStats.dueTodayCount}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  {overallStats.dueTodayCount > 0 ? 'Đến hạn ôn lại hôm nay' : 'Đã hoàn thành ôn tập hôm nay ✨'}
                </p>
              </div>
            </div>

            {/* Card 2: Mastered */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Đã thuộc lòng
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {overallStats.mastered}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${overallStats.total > 0 ? (overallStats.mastered / overallStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    {overallStats.retentionRate}% nhớ
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: New Cards */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Từ mới chờ học
                </span>
                <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Sparkles size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                  {overallStats.unlearned}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Trong tổng số {overallStats.total} từ HSK
                </p>
              </div>
            </div>

            {/* Card 4: Daily Streak */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Chuỗi ngày học
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
                  <Flame size={15} className="fill-amber-500 text-amber-500" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 tracking-tight">
                  {user?.streakDays ?? 0} ngày
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Học 15 phút mỗi ngày với SM-2</p>
              </div>
            </div>
          </section>

          {/* STREAMLINED QUICK LAUNCH BAR */}
          <section className="bg-white dark:bg-zinc-900/90 rounded-2xl p-3 sm:p-4 border border-slate-200/90 dark:border-zinc-800 shadow-xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Filter Mode Selector Pills */}
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-zinc-950 p-1 rounded-xl overflow-x-auto scrollbar-none">
                {[
                  { id: 'due' as StudyQueueFilter, label: 'Cần ôn hôm nay', icon: <Clock size={13} /> },
                  { id: 'new' as StudyQueueFilter, label: 'Từ mới', icon: <Sparkles size={13} /> },
                  { id: 'wrong' as StudyQueueFilter, label: 'Từ hay quên', icon: <AlertCircle size={13} /> },
                  { id: 'all' as StudyQueueFilter, label: 'Tất cả', icon: <Shuffle size={13} /> },
                ].map((tab) => {
                  const isActive = queueFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setQueueFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Options: Limit & Primary Launch CTA */}
              <div className="flex items-center gap-3 justify-between md:justify-end">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  <span>Số thẻ:</span>
                  <div className="flex items-center bg-slate-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200/60 dark:border-zinc-800">
                    {([10, 20, 50, 'all'] as SessionLimit[]).map((limit) => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => setSessionLimit(limit)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                          sessionLimit === limit
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {limit === 'all' ? 'Hết' : limit}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startStudySession('all')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                >
                  <Play size={14} className="fill-current" />
                  <span>Bắt đầu ôn tập</span>
                </button>
              </div>
            </div>
          </section>

          {/* DECK GRID: HSK 1 TO 6 & CUSTOM */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>Danh mục bộ thẻ (Decks)</span>
              </h2>

              <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  <span>Mới</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>Đang học</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Đến hạn</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {deckCardsInfo.map((deck) => {
                const { total, newCount, learnCount, dueCount, masteredCount } = deck.metrics;
                const masteredPercent = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

                return (
                  <div
                    key={deck.id}
                    onClick={() => startStudySession(deck.id)}
                    className="group relative bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-zinc-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Header row: badge & word count */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${deck.badgeColor}`}
                        >
                          {deck.badge}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">{total} từ</span>
                      </div>

                      {/* Title & Subtitle */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {deck.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3.5 line-clamp-1">{deck.subtitle}</p>

                      {/* Anki 3-Pill Indicators */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-950/70 p-2 rounded-xl border border-slate-100 dark:border-zinc-850 mb-3 text-center text-xs">
                        <div className="flex-1">
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">MỚI</div>
                          <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">{newCount}</div>
                        </div>
                        <div className="flex-1 border-x border-slate-200/80 dark:border-zinc-800">
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">ĐANG HỌC</div>
                          <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">{learnCount}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ĐẾN HẠN</div>
                          <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            {dueCount}
                          </div>
                        </div>
                      </div>

                      {/* Mini Mastery Bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                          <span>Đã thuộc lòng</span>
                          <span className="font-bold text-slate-700 dark:text-zinc-300">{masteredPercent}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${masteredPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Start Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startStudySession(deck.id);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white text-slate-700 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Play size={13} className="fill-current" />
                      <span>Ôn bộ này</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* -------------------------------------------------------------
          VIEW 2: IMMERSIVE ANKI STUDY ARENA
      ------------------------------------------------------------- */}
      {view === 'session' && currentCard && (
        <main className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto p-4 sm:p-6 animate-fadeIn">
          {/* Top Progress & Controls */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Dừng phiên học [Esc]"
              >
                <ArrowLeft size={14} />
                <span>Thoát [Esc]</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
                <span>
                  Thẻ {currentIndex + 1} / {sessionQueue.length}
                </span>

                <div className="hidden sm:flex items-center gap-1.5 text-[11px] ml-1">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    🔵 {sessionQueue.slice(currentIndex).filter((i) => i.hanziStatus === 'unlearned').length}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    🟢 {sessionQueue.slice(currentIndex).filter((i) => isItemDueForReview(i)).length}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => playAudio(currentCard.hanzi)}
                  className={`p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-emerald-600 transition-colors cursor-pointer ${
                    isSpeaking ? 'ring-2 ring-emerald-500 scale-105' : ''
                  }`}
                  title="Nghe lại phát âm [R]"
                >
                  <Volume2 size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors cursor-pointer ${
                    currentCard.favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-amber-500'
                  }`}
                  title="Đánh dấu sao"
                >
                  <Star size={15} className={currentCard.favorite ? 'fill-amber-500' : ''} />
                </button>

                <button
                  type="button"
                  onClick={() => setStrokeModalItem(currentCard)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-emerald-600 transition-colors cursor-pointer"
                  title="Xem nét bút chữ Hán"
                >
                  <PenTool size={15} />
                </button>
              </div>
            </div>

            {/* Slender progress bar */}
            <div className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / sessionQueue.length) * 100}%` }}
              />
            </div>
          </div>

          {/* ---------------------------------------------------------
              3D FLIP CARD
          --------------------------------------------------------- */}
          <div className="my-auto py-4 sm:py-6 flex justify-center">
            <div
              onClick={handleFlipCard}
              className="relative w-full max-w-xl min-h-[380px] sm:min-h-[440px] cursor-pointer select-none rounded-3xl transition-transform duration-500 ease-out preserve-3d"
              style={{
                perspective: '1200px',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* FRONT FACE */}
              <div
                className={`absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-zinc-900 border-2 border-slate-200/90 dark:border-zinc-800 shadow-xl transition-all backface-hidden ${
                  !isFlipped ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                }`}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    HSK {currentCard.hskLevel}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">Mặt trước [Space]</span>
                </div>

                <div className="my-auto text-center space-y-4">
                  <div
                    className="text-7xl sm:text-8xl md:text-9xl font-bold text-slate-900 dark:text-white transition-all tracking-wide select-text"
                    style={{ fontFamily: activeHanziFontDef?.fontFamily || 'inherit' }}
                  >
                    {currentCard.hanzi}
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 text-xs">
                    <Volume2 size={13} className={isSpeaking ? 'text-emerald-500 animate-pulse' : ''} />
                    <span>Bấm [R] để nghe âm thanh</span>
                  </div>
                </div>

                <div className="text-center pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <CornerDownLeft size={13} />
                    <span>Lật thẻ xem đáp án [Space]</span>
                  </div>
                </div>
              </div>

              {/* BACK FACE */}
              <div
                className={`absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-zinc-900 border-2 border-emerald-500/50 dark:border-emerald-500/40 shadow-2xl transition-all backface-hidden ${
                  isFlipped ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                }`}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      HSK {currentCard.hskLevel}
                    </span>
                    <span className="text-xs text-slate-400">Đáp án</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(currentCard.hanzi);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Volume2 size={13} />
                    <span>Nghe</span>
                  </button>
                </div>

                <div className="my-auto space-y-3.5 text-center">
                  <div
                    className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white"
                    style={{ fontFamily: activeHanziFontDef?.fontFamily || 'inherit' }}
                  >
                    {currentCard.hanzi}
                  </div>

                  <div className="text-2xl sm:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {currentCard.pinyin}
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100 max-w-md mx-auto">
                    {currentCard.meaning}
                  </div>

                  {currentCard.example && (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 text-left space-y-1 text-xs max-w-md mx-auto">
                      <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-[11px] font-semibold">
                        <span>Ví dụ ngữ cảnh:</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(currentCard.example || '');
                          }}
                          className="hover:text-emerald-600 flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Volume2 size={12} />
                          <span>Đọc câu</span>
                        </button>
                      </div>

                      <div
                        className="font-medium text-slate-900 dark:text-zinc-100"
                        style={{ fontFamily: activeHanziFontDef?.fontFamily || 'inherit' }}
                      >
                        {currentCard.example}
                      </div>

                      {currentCard.examplePinyin && (
                        <div className="text-emerald-700 dark:text-emerald-400 font-mono">
                          {currentCard.examplePinyin}
                        </div>
                      )}

                      {currentCard.exampleMeaning && (
                        <div className="text-slate-600 dark:text-zinc-300 italic">{currentCard.exampleMeaning}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-slate-400">
                  <span>Chọn 1 trong 4 mức đánh giá bên dưới</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------
              BOTTOM DOCK: ANKI 4 BUTTONS
          --------------------------------------------------------- */}
          <div className="space-y-2.5 pt-1">
            {!isFlipped ? (
              <button
                type="button"
                onClick={handleFlipCard}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <CornerDownLeft size={18} />
                <span>Lật thẻ xem đáp án [Space]</span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => handleGradeCard('again')}
                  className="py-2.5 px-2 rounded-2xl border border-rose-300 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-xs sm:text-sm">[1] Quên</span>
                  <span className="text-[10px] font-normal opacity-75">{intervalPreview.again}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGradeCard('hard')}
                  className="py-2.5 px-2 rounded-2xl border border-amber-300 dark:border-amber-900/80 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 text-amber-700 dark:text-amber-300 font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-xs sm:text-sm">[2] Khó</span>
                  <span className="text-[10px] font-normal opacity-75">{intervalPreview.hard}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGradeCard('good')}
                  className="py-2.5 px-2 rounded-2xl border border-emerald-400 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-xs sm:text-sm">[3] Tốt</span>
                  <span className="text-[10px] font-normal opacity-75">{intervalPreview.good}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGradeCard('easy')}
                  className="py-2.5 px-2 rounded-2xl border border-sky-300 dark:border-sky-900/80 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 text-sky-700 dark:text-sky-300 font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-xs sm:text-sm">[4] Dễ</span>
                  <span className="text-[10px] font-normal opacity-75">{intervalPreview.easy}</span>
                </button>
              </div>
            )}

            <div className="text-center text-[11px] text-slate-400 select-none">
              Phím tắt: <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded">Space</kbd> Lật •{' '}
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded">1</kbd> Quên •{' '}
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded">2</kbd> Khó •{' '}
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded">3</kbd> Tốt •{' '}
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded">4</kbd> Dễ •{' '}
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded">R</kbd> Nghe
            </div>
          </div>
        </main>
      )}

      {/* -------------------------------------------------------------
          VIEW 3: SESSION COMPLETED CELEBRATION
      ------------------------------------------------------------- */}
      {view === 'finished' && (
        <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-3xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
            <Trophy size={40} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Hoàn thành phiên ôn tập!</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Tiến độ và lịch ôn lặp lại ngắt quãng đã được cập nhật tự động.
            </p>
          </div>

          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">TỔNG ĐÃ ÔN</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {sessionHistory.length}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] text-emerald-600 uppercase font-semibold">TỐT & DỄ</div>
              <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{goodCount + easyCount}</div>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] text-rose-600 uppercase font-semibold">CẦN ÔN LẠI</div>
              <div className="text-xl font-extrabold text-rose-600 mt-0.5">{againCount}</div>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] text-blue-600 uppercase font-semibold">THỜI GIAN</div>
              <div className="text-xl font-extrabold text-blue-600 mt-0.5">
                {Math.max(1, Math.round(sessionDurationSec / 60))}p
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => startStudySession(selectedDeckId, 'due')}
              className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw size={15} />
              <span>Ôn tiếp 20 từ</span>
            </button>

            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="w-full sm:flex-1 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Về Hub Anki</span>
            </button>
          </div>
        </main>
      )}

      {/* -------------------------------------------------------------
          MODAL: SETTINGS
      ------------------------------------------------------------- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cài đặt Ôn tập & Giọng đọc</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-800 dark:text-zinc-200 block mb-1">
                  Phông chữ Hán thư pháp
                </label>
                <select
                  value={hanziFont}
                  onChange={(e) => setHanziFont(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="system">Mặc định hệ điều hành</option>
                  {TOP_10_HANZI_FONTS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-zinc-200 block mb-1">
                  Giọng đọc phát âm (TTS)
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => handleUpdateVoice(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="">Tự động chọn giọng tiếng Trung chuẩn</option>
                  {availableVoices
                    .filter((v) => v.isChinese)
                    .map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.gender === 'female' ? 'Nữ' : 'Nam'} - {voice.lang})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-zinc-200 mb-1">
                  <span>Tốc độ đọc: {ttsSpeed}x</span>
                  <span className="text-slate-400 font-normal">0.5x - 1.5x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={ttsSpeed}
                  onChange={(e) => handleUpdateTtsRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800">
                <div>
                  <div className="font-bold text-slate-800 dark:text-zinc-200">Tự động phát âm thanh</div>
                  <div className="text-[11px] text-slate-400">Phát âm ngay khi thẻ mới xuất hiện</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoPronounce}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                    autoPronounceFront ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      autoPronounceFront ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Lưu & Đóng
            </button>
          </div>
        </div>
      )}

      {/* STROKE MODAL */}
      {strokeModalItem && (
        <StrokeOrderModal
          isOpen={Boolean(strokeModalItem)}
          onClose={() => setStrokeModalItem(null)}
          item={strokeModalItem}
        />
      )}

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}
