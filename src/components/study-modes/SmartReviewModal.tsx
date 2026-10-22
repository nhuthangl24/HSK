'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Volume2,
  Trophy,
  Flame,
  X,
  RotateCw,
  Gauge,
  SlidersHorizontal,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { VocabItem, ReviewResult } from '@/types/vocabulary';
import { calculateNextSrs } from '@/lib/srs';
import { tts } from '@/lib/tts';
import { getHanziFontById } from '@/lib/hanzi-fonts';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { recordStudyActivity } from '@/lib/streak';

interface SmartReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VocabItem[];
  onBatchUpdate: (updatedItems: VocabItem[]) => void;
}

type SessionFilter = 'due' | 'new' | 'wrong' | 'all';

export function SmartReviewModal({
  isOpen,
  onClose,
  items,
  onBatchUpdate,
}: SmartReviewModalProps) {
  const toast = useToast();
  const { hanziFont, autoPronounce } = useTheme();

  // Settings
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('due');
  const [batchSize, setBatchSize] = useState<number>(15);
  const [showConfig, setShowConfig] = useState(false);

  // Active TTS Rate & Voice from localStorage
  const [currentRate, setCurrentRate] = useState<number>(0.85);
  const [currentVoiceName, setCurrentVoiceName] = useState<string>('');

  // Queue state
  const [reviewQueue, setReviewQueue] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Tracking
  const [failedCardIds, setFailedCardIds] = useState<string[]>([]);
  const [resultsMap, setResultsMap] = useState<
    Record<string, { item: VocabItem; result: ReviewResult }>
  >({});

  // Stats
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [sessionAgainCount, setSessionAgainCount] = useState(0);
  const [streak, setStreak] = useState(0);

  // Sync TTS settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRate = localStorage.getItem('hsk_tts_rate');
      if (savedRate) {
        const parsed = parseFloat(savedRate);
        if (!isNaN(parsed)) setCurrentRate(parsed);
      }
      const savedVoice = localStorage.getItem('hsk_tts_voice_name');
      if (savedVoice) {
        setCurrentVoiceName(savedVoice);
      } else {
        setCurrentVoiceName(tts.getCurrentVoiceName() || 'Mặc định');
      }
    }
  }, [isOpen]);

  // Speak word respecting user's voice and rate 100%
  const speakWord = useCallback(
    (text: string) => {
      if (typeof window === 'undefined') return;
      const savedRateStr = localStorage.getItem('hsk_tts_rate');
      const savedVoiceName = localStorage.getItem('hsk_tts_voice_name');
      const rate = savedRateStr ? parseFloat(savedRateStr) : currentRate;

      tts.speak(text, {
        rate: !isNaN(rate) ? rate : 0.85,
        voiceName: savedVoiceName || currentVoiceName || undefined,
      });
    },
    [currentRate, currentVoiceName]
  );

  // Cycle speed
  const handleCycleSpeed = () => {
    const speeds = [0.75, 0.85, 1.0, 1.25];
    const nextIdx = (speeds.indexOf(currentRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setCurrentRate(nextSpeed);
    tts.setRate(nextSpeed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hsk_tts_rate', String(nextSpeed));
    }
    toast.success(`Tốc độ giọng đọc: ${nextSpeed}x`);
  };

  // Due count
  const dueTodayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return items.filter(
      (i) =>
        i.hanziStatus === 'wrong' ||
        i.hanziStatus === 'unlearned' ||
        !i.srs?.dueDate ||
        i.srs.dueDate <= today
    ).length;
  }, [items]);

  // Selected Hanzi Font
  const hanziFontDef = useMemo(() => {
    return getHanziFontById(hanziFont);
  }, [hanziFont]);

  // Init Queue
  const initQueue = useCallback(
    (customFilter?: SessionFilter, customSize?: number) => {
      const activeFilter = customFilter || sessionFilter;
      const activeSize = customSize || batchSize;
      const today = new Date().toISOString().split('T')[0];

      let pool: VocabItem[] = [];

      if (activeFilter === 'due') {
        pool = items.filter(
          (i) =>
            i.hanziStatus === 'wrong' ||
            i.hanziStatus === 'unlearned' ||
            !i.srs?.dueDate ||
            i.srs.dueDate <= today
        );
        if (pool.length === 0) {
          pool = items.filter((i) => i.hanziStatus === 'unlearned');
          if (pool.length === 0) pool = items;
        }
      } else if (activeFilter === 'new') {
        pool = items.filter(
          (i) => i.hanziStatus === 'unlearned' || (!i.srs?.totalReviews || i.srs.totalReviews === 0)
        );
        if (pool.length === 0) pool = items;
      } else if (activeFilter === 'wrong') {
        pool = items.filter((i) => i.hanziStatus === 'wrong');
        if (pool.length === 0) pool = items;
      } else {
        pool = [...items];
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const queue = shuffled.slice(0, activeSize);

      setReviewQueue(queue);
      setCurrentIndex(0);
      setIsRevealed(false);
      setIsFinished(false);
      setFailedCardIds([]);
      setResultsMap({});
      setSessionCorrectCount(0);
      setSessionAgainCount(0);
      setStreak(0);
    },
    [items, sessionFilter, batchSize]
  );

  useEffect(() => {
    if (isOpen) {
      initQueue();
    }
  }, [isOpen, initQueue]);

  const currentItem = reviewQueue[currentIndex] || null;

  // Auto pronounce
  useEffect(() => {
    if (isOpen && currentItem && !isFinished) {
      if (autoPronounce) {
        speakWord(currentItem.hanzi);
      }
    }
  }, [isOpen, currentItem, isFinished, autoPronounce, speakWord]);

  // Reveal
  const handleReveal = () => {
    if (!isRevealed) {
      setIsRevealed(true);
      if (currentItem) {
        speakWord(currentItem.hanzi);
      }
    }
  };

  // Rate
  const handleRate = (rating: ReviewResult, ratingName: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentItem) return;

    const newSrs = calculateNextSrs(currentItem.srs, rating, 'smart');
    const updated: VocabItem = {
      ...currentItem,
      hanziStatus: rating,
      srs: newSrs,
      updatedAt: new Date().toISOString(),
    };

    setResultsMap((prev) => ({
      ...prev,
      [currentItem.id]: { item: updated, result: rating },
    }));

    if (ratingName === 'again') {
      setSessionAgainCount((prev) => prev + 1);
      setStreak(0);
      setFailedCardIds((prev) => (prev.includes(currentItem.id) ? prev : [...prev, currentItem.id]));
      setReviewQueue((prev) => [...prev, currentItem]);
      toast.info(`"${currentItem.hanzi}" sẽ lặp lại vào cuối hiệp.`);
    } else {
      setSessionCorrectCount((prev) => prev + 1);
      setStreak((prev) => prev + 1);
    }

    recordStudyActivity();

    if (currentIndex + 1 < reviewQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
    } else {
      setIsFinished(true);
      const allUpdated = [
        ...Object.values(resultsMap).map((r) => r.item),
        updated,
      ];
      onBatchUpdate(allUpdated);
    }
  };

  const handleSaveAndClose = () => {
    const updatedList = Object.values(resultsMap).map((r) => r.item);
    if (updatedList.length > 0) {
      onBatchUpdate(updatedList);
    }
    onClose();
  };

  // Hotkeys
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSaveAndClose();
        return;
      }

      if (isFinished) {
        if (e.key === 'Enter') initQueue();
        return;
      }

      if (!isRevealed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleReveal();
        }
      } else {
        if (e.key === '1') handleRate('wrong', 'again');
        if (e.key === '2') handleRate('uncertain', 'hard');
        if (e.key === '3') handleRate('correct', 'good');
        if (e.key === '4') handleRate('correct', 'easy');
      }

      if (e.key === 'r' || e.key === 'R') {
        if (currentItem) speakWord(currentItem.hanzi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRevealed, isFinished, currentItem, speakWord]);

  if (!isOpen) return null;

  const totalCards = reviewQueue.length;
  const remainingCards = Math.max(0, totalCards - currentIndex);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0c10] text-slate-100 select-none animate-fadeIn overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* =====================================================================
          1. MINIMALIST TOP NAV BAR (Zero clutter)
         ===================================================================== */}
      <header className="h-16 px-4 sm:px-8 border-b border-white/10 flex items-center justify-between shrink-0 z-20 bg-[#0b0c10]/80 backdrop-blur-md">
        {/* Left: Back to table */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-white/10"
            title="Thoát và quay lại bảng từ vựng (Esc)"
          >
            <ArrowLeft size={14} />
            <span>Bảng từ</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Cards remaining badge */}
          {!isFinished && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-slate-400">
                Thẻ {currentIndex + 1} / {totalCards}
              </span>
            </div>
          )}
        </div>

        {/* Center: Subtle session mode indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
          <span className="text-emerald-400">SRS Anki</span>
          <span>•</span>
          <span>{sessionFilter === 'due' ? 'Đến hạn hôm nay' : sessionFilter === 'new' ? 'Từ mới' : sessionFilter === 'wrong' ? 'Hay quên' : 'Ngẫu nhiên'}</span>
        </div>

        {/* Right: Sound speed & Custom setup */}
        <div className="flex items-center gap-2">
          {/* Quick Speed Button */}
          <button
            type="button"
            onClick={handleCycleSpeed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold border border-white/10 cursor-pointer transition-all"
            title="Nhấn để đổi tốc độ phát âm"
          >
            <Gauge size={13} className="text-emerald-400" />
            <span>{currentRate}x</span>
          </button>

          {/* Custom Study Button */}
          {!isFinished && (
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                showConfig
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title="Tùy chỉnh số lượng & bộ lọc ôn tập"
            >
              <SlidersHorizontal size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAndClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Progress Track */}
      {!isFinished && totalCards > 0 && (
        <div className="w-full h-1 bg-white/5 z-20">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
            style={{
              width: `${Math.round(((currentIndex + (isRevealed ? 0.5 : 0)) / totalCards) * 100)}%`,
            }}
          />
        </div>
      )}

      {/* Custom Study Floating Drawer */}
      {showConfig && !isFinished && (
        <div className="bg-[#14161f] border-b border-white/10 p-4 text-xs z-30 animate-slideDown shadow-2xl">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Nguồn từ:</span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { key: 'due', label: `Đến hạn (${dueTodayCount})` },
                    { key: 'new', label: 'Từ mới' },
                    { key: 'wrong', label: 'Hay quên' },
                    { key: 'all', label: 'Tất cả' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setSessionFilter(tab.key);
                      initQueue(tab.key, batchSize);
                      setShowConfig(false);
                    }}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      sessionFilter === tab.key
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Số lượng thẻ:</span>
              <div className="flex items-center gap-1.5">
                {[10, 15, 25, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setBatchSize(size);
                      initQueue(sessionFilter, size);
                      setShowConfig(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      batchSize === size
                        ? 'bg-white text-slate-950 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. THE 3D FLIPPABLE FLASHCARD ARENA
         ===================================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 z-10">
        {isFinished ? (
          /* Victory screen */
          <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#161822] border border-white/10 shadow-2xl text-center animate-scaleIn">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
              <Trophy size={42} />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Hoàn Thành Hiệp Ôn! 🎉</h2>
            <p className="text-xs text-slate-400 mb-6">
              Thuật toán Anki SuperMemo SM-2 đã cập nhật lịch lặp lại cho {totalCards} từ vựng.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                <div className="text-2xl font-black text-emerald-400 font-mono">{sessionCorrectCount}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">Đã nhớ tốt</div>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                <div className="text-2xl font-black text-rose-400 font-mono">{sessionAgainCount}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">Đã lặp lại</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => initQueue('new', 15)}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer transition-all border border-white/10"
              >
                + Học thêm 15 từ mới
              </button>
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer transition-all shadow-md"
              >
                Quay lại bảng từ
              </button>
            </div>
          </div>
        ) : currentItem ? (
          /* THE CARD CONTAINER WITH 3D FLIP */
          <div
            className="w-full max-w-2xl"
            style={{ perspective: '1200px' }}
          >
            {/* The 3D Flipping Card */}
            <div
              onClick={() => {
                if (!isRevealed) handleReveal();
              }}
              className={`w-full rounded-[32px] cursor-pointer transition-transform duration-500 relative ${
                !isRevealed ? 'hover:scale-[1.01]' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                minHeight: '440px',
              }}
            >
              {/* =============================================================
                  CARD FRONT (Chữ Hán khổng lồ, nghệ thuật, âm thanh)
                 ============================================================= */}
              <div
                className="w-full h-full min-h-[440px] rounded-[32px] p-8 sm:p-12 flex flex-col justify-between items-center bg-gradient-to-b from-[#1c1e2a] via-[#161822] to-[#12131b] border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center relative"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                {/* Card Top Meta */}
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    HSK {currentItem.hskLevel}
                  </span>
                  {currentItem.partOfSpeech && (
                    <span className="text-xs text-slate-400 italic">
                      [{currentItem.partOfSpeech}]
                    </span>
                  )}
                </div>

                {/* Center: Giant Chinese Character with user's selected font */}
                <div className="my-auto py-4 flex flex-col items-center">
                  <h1
                    className="text-8xl sm:text-9xl font-bold tracking-widest text-white drop-shadow-[0_4px_20px_rgba(255,255,255,0.15)] leading-tight select-text"
                    style={{
                      fontFamily:
                        hanziFontDef?.fontFamily ||
                        '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
                    }}
                  >
                    {currentItem.hanzi}
                  </h1>

                  {/* Audio button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(currentItem.hanzi);
                    }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-white/15 transition-all text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                    title="Nghe phát âm chuẩn (Phím R)"
                  >
                    <Volume2 size={16} className="text-emerald-400" />
                    <span>Phát âm (R)</span>
                  </button>
                </div>

                {/* Front Footer: Hint to flip */}
                <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <RotateCw size={13} className="text-emerald-400 animate-spin-slow" />
                  <span>Chạm vào thẻ hoặc bấm phím Space để lật đáp án</span>
                </div>
              </div>

              {/* =============================================================
                  CARD BACK (Lật 180 độ: Pinyin, Nghĩa tiếng Việt, Câu ví dụ)
                 ============================================================= */}
              <div
                className="w-full h-full min-h-[440px] rounded-[32px] p-8 sm:p-10 flex flex-col justify-between items-center bg-gradient-to-b from-[#1c1e2a] via-[#161822] to-[#12131b] border border-emerald-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {/* Back Top: Hanzi (smaller) + Speak */}
                <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-bold text-white"
                      style={{
                        fontFamily:
                          hanziFontDef?.fontFamily ||
                          '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
                      }}
                    >
                      {currentItem.hanzi}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(currentItem.hanzi);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    HSK {currentItem.hskLevel}
                  </span>
                </div>

                {/* Center Content: Pinyin & Meaning */}
                <div className="my-auto py-3 flex flex-col items-center">
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 tracking-wide mb-2">
                    {currentItem.pinyin}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white leading-snug max-w-lg mb-4">
                    {currentItem.meaning}
                  </div>

                  {/* Real Example Sentence Box */}
                  {currentItem.example && (
                    <div className="w-full max-w-lg p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs shadow-inner">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Câu ví dụ:
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakWord(currentItem.example);
                          }}
                          className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <Volume2 size={13} />
                          <span>Nghe câu</span>
                        </button>
                      </div>
                      <div
                        className="text-base font-bold text-white mb-0.5"
                        style={{
                          fontFamily:
                            hanziFontDef?.fontFamily ||
                            '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
                        }}
                      >
                        {currentItem.example}
                      </div>
                      {currentItem.exampleMeaning && (
                        <div className="text-slate-300 font-medium">{currentItem.exampleMeaning}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer hint */}
                <div className="text-[11px] text-slate-400">
                  Chọn mức độ ghi nhớ bên dưới để chuyển từ tiếp theo
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* =====================================================================
          3. DOCK CONTROLS (Anki 4-Rating Dock or Show Answer Button)
         ===================================================================== */}
      <footer className="p-4 sm:p-6 bg-[#0b0c10]/90 backdrop-blur-md border-t border-white/10 shrink-0 z-20">
        <div className="max-w-2xl mx-auto w-full">
          {!isRevealed ? (
            /* Show Answer Action Bar */
            <button
              type="button"
              onClick={handleReveal}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base cursor-pointer transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              <span>Lật xem đáp án</span>
              <kbd className="px-2 py-0.5 rounded-md bg-slate-950/20 text-slate-950 text-xs font-mono font-bold tracking-wide">
                Space
              </kbd>
            </button>
          ) : (
            /* Authentic Anki 4 Rating Dock */
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {/* [1] Again */}
              <button
                type="button"
                onClick={() => handleRate('wrong', 'again')}
                className="py-3 px-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <kbd className="px-1.5 py-0.2 rounded bg-white/10 font-mono text-[10px] font-bold text-white">
                  [1]
                </kbd>
                <span className="text-sm font-black text-rose-200">Again</span>
                <span className="text-[10px] text-rose-300/80 font-normal">&lt; 10m (ôn lại)</span>
              </button>

              {/* [2] Hard */}
              <button
                type="button"
                onClick={() => handleRate('uncertain', 'hard')}
                className="py-3 px-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <kbd className="px-1.5 py-0.2 rounded bg-white/10 font-mono text-[10px] font-bold text-white">
                  [2]
                </kbd>
                <span className="text-sm font-black text-amber-200">Hard</span>
                <span className="text-[10px] text-amber-300/80 font-normal">1 ngày</span>
              </button>

              {/* [3] Good (Recommended default) */}
              <button
                type="button"
                onClick={() => handleRate('correct', 'good')}
                className="py-3 px-2 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 border-2 border-emerald-400 text-emerald-200 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <kbd className="px-1.5 py-0.2 rounded bg-white/20 font-mono text-[10px] font-bold text-white">
                  [3]
                </kbd>
                <span className="text-sm font-black text-emerald-100">Good</span>
                <span className="text-[10px] text-emerald-200 font-normal">3 ngày</span>
              </button>

              {/* [4] Easy */}
              <button
                type="button"
                onClick={() => handleRate('correct', 'easy')}
                className="py-3 px-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <kbd className="px-1.5 py-0.2 rounded bg-white/10 font-mono text-[10px] font-bold text-white">
                  [4]
                </kbd>
                <span className="text-sm font-black text-sky-200">Easy</span>
                <span className="text-[10px] text-sky-300/80 font-normal">7 ngày</span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
