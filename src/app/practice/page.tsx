'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Flame,
  ArrowRight,
  BookOpen,
  ArrowLeft,
  VolumeX,
  Shuffle,
  HelpCircle,
  Trash2,
  GraduationCap,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Sun,
  Moon,
  Info,
  Check,
} from 'lucide-react';

import { VocabItem } from '@/types/vocabulary';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getStoredVocab, saveStoredVocab } from '@/lib/storage';
import { tts } from '@/lib/tts';
import { quizSound } from '@/lib/quiz-sound';
import { chunkSentence, shuffleChunks, SentencePuzzle } from '@/lib/sentence-chunker';
import { NotificationBell } from '@/components/layout/NotificationBell';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
type PracticeTab = 'vocab-quiz' | 'word-order' | 'mistakes';

type VocabQuestionType =
  | 'hanzi_to_meaning'
  | 'meaning_to_hanzi'
  | 'listen_to_hanzi'
  | 'cloze';

interface VocabQuestion {
  id: string;
  type: VocabQuestionType;
  target: VocabItem;
  prompt: string;
  promptSub?: string;
  options: { label: string; sub?: string }[];
  correctIndex: number;
}

interface VocabQuizResultItem {
  question: VocabQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}

interface PracticeMistake {
  id: string;
  type: 'vocab' | 'sentence';
  vocab?: VocabItem;
  sentence?: {
    original: string;
    pinyin: string;
    meaning: string;
    hskLevel: number;
  };
  wrongCount: number;
  lastFailedAt: string;
}

const STORAGE_MISTAKES_KEY = 'hsk_practice_mistakes_v1';

export default function PracticePage() {
  const { user } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  // Navigation & Data
  const [activeTab, setActiveTab] = useState<PracticeTab>('vocab-quiz');
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [isLoadingVocab, setIsLoadingVocab] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Mistakes Storage
  const [mistakes, setMistakes] = useState<PracticeMistake[]>([]);

  // --------------------------------------------------------------------
  // Mode B: Vocab Quiz State
  // --------------------------------------------------------------------
  const [quizState, setQuizState] = useState<'setup' | 'playing' | 'result'>('setup');
  const [quizLevel, setQuizLevel] = useState<number>(0); // 0 = all
  const [quizCount, setQuizCount] = useState<number>(10);
  const [quizFormat, setQuizFormat] = useState<'mixed' | VocabQuestionType>('mixed');

  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOptIndex, setSelectedOptIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [quizHistory, setQuizHistory] = useState<VocabQuizResultItem[]>([]);

  // --------------------------------------------------------------------
  // Mode C: Word Order Challenge State
  // --------------------------------------------------------------------
  const [orderState, setOrderState] = useState<'setup' | 'playing' | 'result'>('setup');
  const [orderLevel, setOrderLevel] = useState<number>(1);
  const [orderCount, setOrderCount] = useState<number>(5);

  const [puzzles, setPuzzles] = useState<SentencePuzzle[]>([]);
  const [currentPIndex, setCurrentPIndex] = useState(0);
  const [userPlacedChunks, setUserPlacedChunks] = useState<{ id: string; text: string }[]>([]);
  const [bankChunks, setBankChunks] = useState<{ id: string; text: string }[]>([]);
  const [orderCheckStatus, setOrderCheckStatus] = useState<'correct' | 'wrong' | null>(null);
  const [orderScore, setOrderScore] = useState(0);
  const [orderStreak, setOrderStreak] = useState(0);
  const [orderHistory, setOrderHistory] = useState<{ puzzle: SentencePuzzle; isCorrect: boolean }[]>([]);

  // --------------------------------------------------------------------
  // Initial Data Loading
  // --------------------------------------------------------------------
  useEffect(() => {
    setSoundEnabled(quizSound.isEnabled());

    // Load mistakes from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_MISTAKES_KEY);
      if (stored) {
        setMistakes(JSON.parse(stored));
      }
    } catch {}

    // Load vocab list
    const cached = getStoredVocab(user?.id);
    if (cached && cached.length >= 100) {
      setVocabList(cached);
      setIsLoadingVocab(false);
    } else {
      setIsLoadingVocab(true);
      fetch('/api/vocab')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.items)) {
            setVocabList(data.items);
            saveStoredVocab(data.items, user?.id);
          }
        })
        .catch((err) => console.warn('Vocab fetch error:', err))
        .finally(() => setIsLoadingVocab(false));
    }
  }, [user]);

  // Persist mistakes
  const saveMistakes = useCallback((updated: PracticeMistake[]) => {
    setMistakes(updated);
    try {
      localStorage.setItem(STORAGE_MISTAKES_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const addVocabMistake = useCallback(
    (item: VocabItem) => {
      setMistakes((prev) => {
        const existing = prev.find((m) => m.type === 'vocab' && m.vocab?.id === item.id);
        let updated: PracticeMistake[];
        if (existing) {
          updated = prev.map((m) =>
            m.id === existing.id
              ? { ...m, wrongCount: m.wrongCount + 1, lastFailedAt: new Date().toISOString() }
              : m
          );
        } else {
          updated = [
            {
              id: `mistake-${Date.now()}-${item.id}`,
              type: 'vocab',
              vocab: item,
              wrongCount: 1,
              lastFailedAt: new Date().toISOString(),
            },
            ...prev,
          ];
        }
        try {
          localStorage.setItem(STORAGE_MISTAKES_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  const addSentenceMistake = useCallback(
    (puzzle: SentencePuzzle) => {
      setMistakes((prev) => {
        const existing = prev.find(
          (m) => m.type === 'sentence' && m.sentence?.original === puzzle.originalSentence
        );
        let updated: PracticeMistake[];
        if (existing) {
          updated = prev.map((m) =>
            m.id === existing.id
              ? { ...m, wrongCount: m.wrongCount + 1, lastFailedAt: new Date().toISOString() }
              : m
          );
        } else {
          updated = [
            {
              id: `mistake-sent-${Date.now()}-${puzzle.id}`,
              type: 'sentence',
              sentence: {
                original: puzzle.originalSentence,
                pinyin: puzzle.pinyin,
                meaning: puzzle.meaning,
                hskLevel: puzzle.hskLevel,
              },
              wrongCount: 1,
              lastFailedAt: new Date().toISOString(),
            },
            ...prev,
          ];
        }
        try {
          localStorage.setItem(STORAGE_MISTAKES_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  const removeMistake = useCallback(
    (id: string) => {
      const filtered = mistakes.filter((m) => m.id !== id);
      saveMistakes(filtered);
    },
    [mistakes, saveMistakes]
  );

  const clearAllMistakes = useCallback(() => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách câu sai đã lưu?')) {
      saveMistakes([]);
    }
  }, [saveMistakes]);

  // --------------------------------------------------------------------
  // MODE B: VOCAB QUIZ GENERATOR & LOGIC
  // --------------------------------------------------------------------
  const startVocabQuiz = useCallback(
    (customItems?: VocabItem[]) => {
      const source = customItems || vocabList;
      if (!source || source.length < 4) return;

      // Filter by level if specified
      let pool = source;
      if (!customItems && quizLevel > 0) {
        pool = source.filter((item) => Number(item.hskLevel) === quizLevel);
        if (pool.length < 4) pool = source; // fallback if level pool is too small
      }

      // Shuffle pool
      const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
      const targetItems = shuffledPool.slice(0, Math.min(quizCount, shuffledPool.length));

      // Generate question for each target item
      const typesList: VocabQuestionType[] = [
        'hanzi_to_meaning',
        'meaning_to_hanzi',
        'listen_to_hanzi',
        'cloze',
      ];

      const generated: VocabQuestion[] = targetItems.map((target, idx) => {
        // Pick question type
        let qType: VocabQuestionType =
          quizFormat === 'mixed'
            ? typesList[Math.floor(Math.random() * typesList.length)]
            : quizFormat;

        // If cloze question but word has no good example, fallback to hanzi_to_meaning
        if (qType === 'cloze' && (!target.example || target.example.length < 4 || !target.example.includes(target.hanzi))) {
          qType = 'hanzi_to_meaning';
        }

        // Pick 3 distractors from the same level pool (or overall pool)
        const distractors = source
          .filter((w) => w.id !== target.id && w.hanzi !== target.hanzi)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const allChoices = [target, ...distractors].sort(() => Math.random() - 0.5);
        const correctIndex = allChoices.findIndex((c) => c.id === target.id);

        let prompt = '';
        let promptSub: string | undefined = undefined;
        let options: { label: string; sub?: string }[] = [];

        if (qType === 'hanzi_to_meaning') {
          prompt = target.hanzi;
          promptSub = target.pinyin ? `[ ${target.pinyin} ]` : undefined;
          options = allChoices.map((c) => ({
            label: c.meaning,
            sub: c.pinyin,
          }));
        } else if (qType === 'meaning_to_hanzi') {
          prompt = target.meaning;
          promptSub = target.partOfSpeech ? `( ${target.partOfSpeech} )` : 'Chọn chữ Hán tương ứng:';
          options = allChoices.map((c) => ({
            label: c.hanzi,
            sub: c.pinyin,
          }));
        } else if (qType === 'listen_to_hanzi') {
          prompt = 'Nghe phát âm chuẩn và chọn chữ Hán:';
          options = allChoices.map((c) => ({
            label: c.hanzi,
            sub: c.meaning,
          }));
        } else if (qType === 'cloze') {
          // Replace target word in example with [ _____ ]
          prompt = target.example?.replace(target.hanzi, '【 ______ 】') || target.hanzi;
          promptSub = target.exampleMeaning || target.meaning;
          options = allChoices.map((c) => ({
            label: c.hanzi,
            sub: c.pinyin,
          }));
        }

        return {
          id: `vq-${idx}-${target.id}`,
          type: qType,
          target,
          prompt,
          promptSub,
          options,
          correctIndex,
        };
      });

      setQuestions(generated);
      setCurrentQIndex(0);
      setSelectedOptIndex(null);
      setIsAnswered(false);
      setQuizScore(0);
      setQuizStreak(0);
      setMaxStreak(0);
      setQuizHistory([]);
      setQuizState('playing');

      // If first question is listening, auto-speak
      if (generated[0]?.type === 'listen_to_hanzi') {
        setTimeout(() => {
          tts.speak(generated[0].target.hanzi);
        }, 300);
      }
    },
    [vocabList, quizLevel, quizCount, quizFormat]
  );

  const handleSelectOption = (optIndex: number) => {
    if (isAnswered) return;
    const q = questions[currentQIndex];
    if (!q) return;

    setSelectedOptIndex(optIndex);
    setIsAnswered(true);

    const isCorrect = optIndex === q.correctIndex;
    if (isCorrect) {
      quizSound.playCorrect();
      setQuizScore((prev) => prev + 1);
      setQuizStreak((prev) => {
        const next = prev + 1;
        setMaxStreak((currMax) => Math.max(currMax, next));
        return next;
      });
      // Speak the correct word
      tts.speak(q.target.hanzi);
    } else {
      quizSound.playWrong();
      setQuizStreak(0);
      addVocabMistake(q.target);
    }

    setQuizHistory((prev) => [
      ...prev,
      { question: q, selectedIndex: optIndex, isCorrect },
    ]);
  };

  const handleNextQuestion = () => {
    quizSound.playTap();
    if (currentQIndex + 1 < questions.length) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setSelectedOptIndex(null);
      setIsAnswered(false);

      const nextQ = questions[nextIdx];
      if (nextQ?.type === 'listen_to_hanzi') {
        setTimeout(() => {
          tts.speak(nextQ.target.hanzi);
        }, 200);
      }
    } else {
      quizSound.playComplete();
      setQuizState('result');
    }
  };

  // Keyboard shortcut listener for Quiz (1, 2, 3, 4, Enter)
  useEffect(() => {
    if (quizState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key) && !isAnswered) {
        const idx = parseInt(e.key, 10) - 1;
        if (questions[currentQIndex]?.options[idx]) {
          handleSelectOption(idx);
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && isAnswered) {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizState, isAnswered, currentQIndex, questions]);

  // --------------------------------------------------------------------
  // MODE C: WORD ORDER CHALLENGE GENERATOR & LOGIC
  // --------------------------------------------------------------------
  const startWordOrderChallenge = useCallback(
    (customSentences?: PracticeMistake[]) => {
      let pool = vocabList.filter(
        (w) =>
          w.example &&
          w.example.trim().length >= 6 &&
          w.example.trim().length <= 22 &&
          w.exampleMeaning
      );

      if (!customSentences && orderLevel > 0) {
        pool = pool.filter((w) => Number(w.hskLevel) === orderLevel);
      }

      if (pool.length === 0) {
        pool = vocabList.filter((w) => w.example && w.example.trim().length >= 5);
      }

      const shuffledWords = [...pool].sort(() => Math.random() - 0.5);
      const chosen = shuffledWords.slice(0, Math.min(orderCount, shuffledWords.length));

      const generatedPuzzles: SentencePuzzle[] = chosen.map((w, idx) => {
        const rawExample = w.example!.trim();
        const chunks = chunkSentence(rawExample, w.hanzi);
        const shuffled = shuffleChunks(chunks);

        return {
          id: `puzzle-${idx}-${w.id}`,
          originalSentence: rawExample,
          pinyin: w.examplePinyin || w.pinyin,
          meaning: w.exampleMeaning || w.meaning,
          targetWord: w.hanzi,
          hskLevel: Number(w.hskLevel) || 1,
          chunks,
          shuffledChunks: shuffled,
        };
      });

      setPuzzles(generatedPuzzles);
      setCurrentPIndex(0);
      setOrderScore(0);
      setOrderStreak(0);
      setOrderHistory([]);
      setOrderCheckStatus(null);

      if (generatedPuzzles[0]) {
        setBankChunks([...generatedPuzzles[0].shuffledChunks]);
        setUserPlacedChunks([]);
      }

      setOrderState('playing');
    },
    [vocabList, orderLevel, orderCount]
  );

  // Setup current puzzle tokens when moving to next puzzle
  const loadPuzzleAt = useCallback(
    (index: number) => {
      const p = puzzles[index];
      if (!p) return;
      setCurrentPIndex(index);
      setBankChunks([...p.shuffledChunks]);
      setUserPlacedChunks([]);
      setOrderCheckStatus(null);
    },
    [puzzles]
  );

  // Click chunk in bank -> move to placed
  const handlePlaceChunk = (chunk: { id: string; text: string }) => {
    if (orderCheckStatus === 'correct') return;
    quizSound.playTap();
    setOrderCheckStatus(null);
    setBankChunks((prev) => prev.filter((c) => c.id !== chunk.id));
    setUserPlacedChunks((prev) => [...prev, chunk]);
  };

  // Click chunk in placed -> return to bank
  const handleUnplaceChunk = (chunk: { id: string; text: string }) => {
    if (orderCheckStatus === 'correct') return;
    quizSound.playTap();
    setOrderCheckStatus(null);
    setUserPlacedChunks((prev) => prev.filter((c) => c.id !== chunk.id));
    setBankChunks((prev) => [...prev, chunk]);
  };

  // Reset current puzzle placed tokens
  const handleResetPuzzle = () => {
    const p = puzzles[currentPIndex];
    if (!p) return;
    quizSound.playTap();
    setBankChunks([...p.shuffledChunks]);
    setUserPlacedChunks([]);
    setOrderCheckStatus(null);
  };

  // Check assembled sentence
  const handleCheckSentence = () => {
    const p = puzzles[currentPIndex];
    if (!p || userPlacedChunks.length === 0) return;

    const userString = userPlacedChunks.map((c) => c.text).join('').replace(/\s+/g, '');
    const correctString = p.originalSentence.replace(/\s+/g, '');

    const isCorrect = userString === correctString;

    if (isCorrect) {
      quizSound.playCorrect();
      setOrderCheckStatus('correct');
      setOrderScore((prev) => prev + 1);
      setOrderStreak((prev) => prev + 1);
      setOrderHistory((prev) => [...prev, { puzzle: p, isCorrect: true }]);
      // Speak entire sentence
      tts.speak(p.originalSentence);
    } else {
      quizSound.playWrong();
      setOrderCheckStatus('wrong');
      setOrderStreak(0);
      setOrderHistory((prev) => [...prev, { puzzle: p, isCorrect: false }]);
      addSentenceMistake(p);
    }
  };

  const handleNextPuzzle = () => {
    quizSound.playTap();
    if (currentPIndex + 1 < puzzles.length) {
      loadPuzzleAt(currentPIndex + 1);
    } else {
      quizSound.playComplete();
      setOrderState('result');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07090e] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer text-slate-900 dark:text-white"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <FileSpreadsheet size={16} />
              </div>
              <span className="font-bold text-sm tracking-tight hidden sm:inline">HSK Master</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Luyện tập</span>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {activeTab === 'vocab-quiz'
                  ? 'Trắc nghiệm từ vựng'
                  : activeTab === 'word-order'
                  ? 'Ghép câu tiếng Trung'
                  : 'Sổ câu sai'}
              </span>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(quizSound.toggle())}
              className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
              title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              title="Đổi giao diện Sáng / Tối"
            >
              {effectiveTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>

            {/* Link back to Main sheet */}
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Bảng từ vựng</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Navigation Mode Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-200/60 dark:bg-slate-900/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                quizSound.playTap();
                setActiveTab('vocab-quiz');
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vocab-quiz'
                  ? 'bg-white dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles size={15} className="text-emerald-500" />
              <span>Trắc nghiệm từ vựng</span>
            </button>

            <button
              type="button"
              onClick={() => {
                quizSound.playTap();
                setActiveTab('word-order');
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'word-order'
                  ? 'bg-white dark:bg-purple-950 text-purple-800 dark:text-purple-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers size={15} className="text-purple-500" />
              <span>Luyện ghép câu</span>
            </button>

            <button
              type="button"
              onClick={() => {
                quizSound.playTap();
                setActiveTab('mistakes');
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeTab === 'mistakes'
                  ? 'bg-white dark:bg-rose-950 text-rose-800 dark:text-rose-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HelpCircle size={15} className="text-rose-500" />
              <span>Sổ câu sai</span>
              {mistakes.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {mistakes.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Kho dữ liệu: 11.000+ từ & câu mẫu</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: MODE B - VOCAB FLASH QUIZ                               */}
        {/* ============================================================== */}
        {activeTab === 'vocab-quiz' && (
          <div className="flex-1 flex flex-col">
            {/* SETUP VIEW */}
            {quizState === 'setup' && (
              <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between animate-fadeIn">
                <div>
                  <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 mb-2">
                    <Sparkles size={20} />
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                      Luyện Phản Xạ Trắc Nghiệm Từ Vựng
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                    Hệ thống sẽ tự động bốc ngẫu nhiên từ vựng chuẩn HSK để tạo đề thi phản xạ đa dạng: Nhìn chữ Hán chọn nghĩa, nhìn nghĩa chọn chữ, nghe âm thanh phát âm và điền từ vào ngữ cảnh.
                  </p>

                  {/* Level selection */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      1. Chọn Cấp Độ HSK
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {[
                        { label: 'Tất cả', val: 0 },
                        { label: 'HSK 1', val: 1 },
                        { label: 'HSK 2', val: 2 },
                        { label: 'HSK 3', val: 3 },
                        { label: 'HSK 4', val: 4 },
                        { label: 'HSK 5', val: 5 },
                        { label: 'HSK 6', val: 6 },
                        { label: '7-9', val: 7 },
                      ].map((lvl) => (
                        <button
                          key={lvl.val}
                          type="button"
                          onClick={() => setQuizLevel(lvl.val)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            quizLevel === lvl.val
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Number of questions */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      2. Số Lượng Câu Hỏi
                    </label>
                    <div className="grid grid-cols-3 gap-3 max-w-md">
                      {[
                        { count: 10, label: '10 Câu', desc: '~2 phút' },
                        { count: 20, label: '20 Câu', desc: '~5 phút' },
                        { count: 30, label: '30 Câu', desc: '~8 phút' },
                      ].map((item) => (
                        <button
                          key={item.count}
                          type="button"
                          onClick={() => setQuizCount(item.count)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            quizCount === item.count
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="font-bold text-sm">{item.label}</div>
                          <div className="text-[11px] opacity-70">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Format */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      3. Dạng Thức Câu Hỏi
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { val: 'mixed', label: 'Xen kẽ tất cả dạng (Khuyên dùng)', desc: 'Tổng hợp Hán tự, Pinyin, Nghe âm và Điền từ' },
                        { val: 'hanzi_to_meaning', label: 'Chữ Hán ➔ Nghĩa tiếng Việt', desc: 'Rèn luyện ghi nhớ mặt chữ' },
                        { val: 'meaning_to_hanzi', label: 'Nghĩa tiếng Việt ➔ Chữ Hán', desc: 'Luyện phản xạ chọn từ đúng' },
                        { val: 'listen_to_hanzi', label: 'Nghe phát âm ➔ Chọn Chữ Hán', desc: 'Luyện tai nghe phản xạ nhanh' },
                      ].map((fmt) => (
                        <button
                          key={fmt.val}
                          type="button"
                          onClick={() => setQuizFormat(fmt.val as any)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            quizFormat === fmt.val
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="font-bold text-xs sm:text-sm">{fmt.label}</div>
                          <div className="text-[11px] opacity-70 mt-0.5">{fmt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Phím tắt: bấm phím <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">1 - 4</kbd> để chọn đáp án, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">Enter</kbd> để tiếp tục.
                  </div>
                  <button
                    type="button"
                    onClick={() => startVocabQuiz()}
                    disabled={isLoadingVocab || vocabList.length === 0}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <span>Bắt Đầu Làm Bài</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE QUIZ PLAYING VIEW */}
            {quizState === 'playing' && questions[currentQIndex] && (
              <div className="flex-1 flex flex-col justify-between animate-fadeIn">
                {/* Header progress & Streak */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      Câu {currentQIndex + 1} / {questions.length}
                    </span>
                    <div className="flex items-center gap-3">
                      {quizStreak > 1 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold animate-bounce">
                          <Flame size={14} className="fill-amber-500" />
                          <span>Chuỗi x{quizStreak}</span>
                        </span>
                      )}
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Đúng: {quizScore}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Card */}
                {(() => {
                  const q = questions[currentQIndex];
                  return (
                    <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm mb-4">
                      {/* Badge question type */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {q.type === 'hanzi_to_meaning' && 'Nhìn Chữ Hán ➔ Chọn Nghĩa'}
                          {q.type === 'meaning_to_hanzi' && 'Chọn Chữ Hán Tương Ứng'}
                          {q.type === 'listen_to_hanzi' && 'Nghe Phát Âm ➔ Chọn Chữ Hán'}
                          {q.type === 'cloze' && 'Điền Từ Vào Câu Ngữ Cảnh'}
                        </span>

                        <span className="text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                          HSK {q.target.hskLevel}
                        </span>
                      </div>

                      {/* Main Prompt Presentation */}
                      <div className="text-center py-4 sm:py-6">
                        {q.type === 'listen_to_hanzi' ? (
                          <div className="flex flex-col items-center gap-3">
                            <button
                              type="button"
                              onClick={() => tts.speak(q.target.hanzi)}
                              className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border-2 border-emerald-400 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 cursor-pointer shadow-md hover:scale-105 transition-all"
                              title="Bấm để nghe lại"
                            >
                              <Volume2 size={36} />
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Bấm vào loa để nghe lại âm thanh
                            </span>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                              {q.prompt}
                            </h3>
                            {q.promptSub && (
                              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 font-medium">
                                {q.promptSub}
                              </p>
                            )}
                            {q.target.hanzi && q.type !== 'meaning_to_hanzi' && (
                              <button
                                type="button"
                                onClick={() => tts.speak(q.target.hanzi)}
                                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              >
                                <Volume2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Phát âm</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* 4 Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = selectedOptIndex === oIdx;
                          const isCorrect = oIdx === q.correctIndex;

                          let btnStyle =
                            'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-400 text-slate-800 dark:text-slate-200';

                          if (isAnswered) {
                            if (isCorrect) {
                              btnStyle =
                                'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30';
                            } else if (isSelected) {
                              btnStyle =
                                'border-rose-500 bg-rose-50 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/30';
                            } else {
                              btnStyle = 'opacity-40 border-slate-200 dark:border-slate-800 text-slate-400';
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSelectOption(oIdx)}
                              disabled={isAnswered}
                              className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between group ${btnStyle}`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-sm sm:text-base leading-snug truncate">
                                    {opt.label}
                                  </div>
                                  {opt.sub && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                      {opt.sub}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isAnswered && isCorrect && (
                                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 ml-2" />
                              )}
                              {isAnswered && isSelected && !isCorrect && (
                                <XCircle size={18} className="text-rose-600 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box after answer */}
                      {isAnswered && (
                        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 animate-fadeIn">
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Info size={14} className="text-emerald-600" />
                              <span>Giải thích từ vựng:</span>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                              {q.target.hanzi} [{q.target.pinyin}]
                            </span>
                          </div>
                          <p className="leading-relaxed">
                            <strong className="text-slate-900 dark:text-white">Nghĩa:</strong> {q.target.meaning}
                            {q.target.partOfSpeech && ` (${q.target.partOfSpeech})`}.
                          </p>
                          {q.target.example && (
                            <p className="mt-1 text-slate-500 dark:text-slate-400 italic">
                              Ví dụ: {q.target.example} — {q.target.exampleMeaning}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Footer Next Button */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Bạn có muốn dừng lượt luyện tập hiện tại?')) {
                        setQuizState('setup');
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    Dừng bài thi
                  </button>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={!isAnswered}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <span>{currentQIndex + 1 < questions.length ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* RESULTS VIEW */}
            {quizState === 'result' && (
              <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm animate-fadeIn">
                <div className="text-center py-6 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Trophy size={32} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Hoàn Thành Bài Trắc Nghiệm!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Bạn đã xuất sắc hoàn thành {questions.length} câu phản xạ từ vựng.
                  </p>

                  <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mt-6">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Math.round((quizScore / questions.length) * 100)}%
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Độ chính xác</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {quizScore}/{questions.length}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Số câu đúng</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-2xl font-extrabold text-amber-500">
                        🔥 {maxStreak}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Chuỗi cao nhất</div>
                    </div>
                  </div>
                </div>

                {/* History detailed breakdown */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Chi Tiết Từng Câu Hỏi
                </h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mb-6">
                  {quizHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        item.isCorrect
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                          : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.isCorrect ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-rose-600 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 dark:text-white mr-2">
                            {item.question.target.hanzi} [{item.question.target.pinyin}]:
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            {item.question.target.meaning}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => tts.speak(item.question.target.hanzi)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 shrink-0 cursor-pointer"
                        title="Nghe phát âm"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setQuizState('setup')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                  >
                    Về Cài Đặt
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startVocabQuiz()}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <RotateCcw size={14} />
                      <span>Luyện Lượt Mới</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MODE C - WORD ORDER CHALLENGE (连词成句)               */}
        {/* ============================================================== */}
        {activeTab === 'word-order' && (
          <div className="flex-1 flex flex-col">
            {/* SETUP VIEW */}
            {orderState === 'setup' && (
              <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2.5 text-purple-700 dark:text-purple-400 mb-2">
                  <Layers size={20} />
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                    Luyện Ghép Câu Tiếng Trung (连词成句)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  Dạng bài ăn điểm kinh điển trong đề thi HSK: Các từ trong câu mẫu chuẩn ngữ pháp bị xáo trộn vị trí. Nhiệm vụ của bạn là chạm hoặc kéo thả các khối từ theo đúng trật tự câu hoàn chỉnh.
                </p>

                {/* Level selection */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                    1. Chọn Cấp Độ HSK
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setOrderLevel(lvl)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          orderLevel === lvl
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        HSK {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of puzzles */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                    2. Số Lượng Câu Ghép
                  </label>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    {[
                      { count: 5, label: '5 Câu', desc: 'Khởi động' },
                      { count: 10, label: '10 Câu', desc: 'Tiêu chuẩn' },
                      { count: 15, label: '15 Câu', desc: 'Thử thách' },
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => setOrderCount(item.count)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          orderCount === item.count
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 dark:border-purple-700 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-sm">{item.label}</div>
                        <div className="text-[11px] opacity-70">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Mẹo: Chạm vào từ để đưa lên dòng ghép câu hoặc chạm để trả về hàng đợi.
                  </div>
                  <button
                    type="button"
                    onClick={() => startWordOrderChallenge()}
                    disabled={isLoadingVocab || vocabList.length === 0}
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <span>Bắt Đầu Ghép Câu</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE PUZZLE PLAYING VIEW */}
            {orderState === 'playing' && puzzles[currentPIndex] && (
              <div className="flex-1 flex flex-col justify-between animate-fadeIn">
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      Câu {currentPIndex + 1} / {puzzles.length}
                    </span>
                    <div className="flex items-center gap-3">
                      {orderStreak > 1 && (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold animate-bounce">
                          <Flame size={14} className="fill-purple-500" />
                          <span>Chuỗi x{orderStreak}</span>
                        </span>
                      )}
                      <span className="text-purple-600 dark:text-purple-400 font-bold">
                        Đã đúng: {orderScore}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${((currentPIndex + 1) / puzzles.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Challenge Card */}
                {(() => {
                  const p = puzzles[currentPIndex];
                  return (
                    <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm mb-4">
                      {/* Hint meaning banner */}
                      <div className="mb-6 text-center">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 inline-block mb-2">
                          HSK {p.hskLevel} • Nghĩa tiếng Việt
                        </span>
                        <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed">
                          &ldquo;{p.meaning}&rdquo;
                        </h3>
                      </div>

                      {/* Placed Words Dropzone */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                          <span>Dòng ghép câu của bạn:</span>
                          {userPlacedChunks.length > 0 && orderCheckStatus !== 'correct' && (
                            <button
                              type="button"
                              onClick={handleResetPuzzle}
                              className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={12} />
                              <span>Xếp lại</span>
                            </button>
                          )}
                        </div>

                        <div
                          className={`min-h-[72px] sm:min-h-[88px] p-3 rounded-2xl border-2 border-dashed flex flex-wrap items-center gap-2 transition-all ${
                            orderCheckStatus === 'correct'
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : orderCheckStatus === 'wrong'
                              ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40'
                          }`}
                        >
                          {userPlacedChunks.length === 0 ? (
                            <span className="text-xs text-slate-400 italic mx-auto select-none">
                              Chạm vào các khối từ bên dưới để đưa lên đây theo thứ tự câu đúng
                            </span>
                          ) : (
                            userPlacedChunks.map((chunk) => (
                              <button
                                key={chunk.id}
                                type="button"
                                onClick={() => handleUnplaceChunk(chunk)}
                                disabled={orderCheckStatus === 'correct'}
                                className={`px-4 py-2.5 rounded-xl text-base sm:text-lg font-bold border cursor-pointer transition-all animate-scaleIn ${
                                  orderCheckStatus === 'correct'
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                    : orderCheckStatus === 'wrong'
                                    ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 text-rose-900 dark:text-rose-200'
                                    : 'bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 hover:scale-95 shadow-xs'
                                }`}
                              >
                                {chunk.text}
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Word Bank */}
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-2">
                          Hàng đợi các khối từ:
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2.5 min-h-[50px] p-2">
                          {bankChunks.map((chunk) => (
                            <button
                              key={chunk.id}
                              type="button"
                              onClick={() => handlePlaceChunk(chunk)}
                              className="px-4 py-2.5 rounded-xl text-base sm:text-lg font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40 shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all"
                            >
                              {chunk.text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Check Feedback Box */}
                      {orderCheckStatus && (
                        <div
                          className={`mt-6 p-4 rounded-xl border text-xs animate-fadeIn ${
                            orderCheckStatus === 'correct'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span className="flex items-center gap-1.5 text-sm">
                              {orderCheckStatus === 'correct' ? (
                                <>
                                  <CheckCircle2 size={16} className="text-emerald-600" />
                                  <span>Chính xác tuyệt đối!</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={16} className="text-rose-600" />
                                  <span>Trật tự câu chưa chuẩn, hãy thử lại!</span>
                                </>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => tts.speak(p.originalSentence)}
                              className="inline-flex items-center gap-1 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                            >
                              <Volume2 size={14} />
                              <span>Nghe cả câu</span>
                            </button>
                          </div>

                          <div className="mt-2 font-mono text-sm font-semibold">
                            {p.originalSentence}
                          </div>
                          {p.pinyin && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                              {p.pinyin}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Footer Actions */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Bạn có muốn dừng lượt ghép câu hiện tại?')) {
                        setOrderState('setup');
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    Dừng bài thi
                  </button>

                  <div className="flex items-center gap-2">
                    {orderCheckStatus !== 'correct' ? (
                      <button
                        type="button"
                        onClick={handleCheckSentence}
                        disabled={userPlacedChunks.length === 0}
                        className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-sm flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Check size={16} />
                        <span>Kiểm Tra Đáp Án</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextPuzzle}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      >
                        <span>{currentPIndex + 1 < puzzles.length ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS VIEW */}
            {orderState === 'result' && (
              <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm animate-fadeIn">
                <div className="text-center py-6 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Trophy size={32} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Hoàn Thành Lượt Ghép Câu!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Bạn đã xuất sắc hoàn thành {puzzles.length} câu ghép tiếng Trung chuẩn ngữ pháp.
                  </p>

                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mt-6">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                        {orderScore}/{puzzles.length}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Đúng ngay lần đầu</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Math.round((orderScore / puzzles.length) * 100)}%
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Tỷ lệ chính xác</div>
                    </div>
                  </div>
                </div>

                {/* List of reviewed sentences */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Danh Sách Câu Đã Ghép
                </h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mb-6">
                  {puzzles.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.originalSentence}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.meaning}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => tts.speak(p.originalSentence)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 shrink-0 cursor-pointer"
                        title="Nghe câu"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOrderState('setup')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Về Cài Đặt
                  </button>

                  <button
                    type="button"
                    onClick={() => startWordOrderChallenge()}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <RotateCcw size={14} />
                    <span>Luyện Lượt Mới</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MISTAKE NOTEBOOK (SỔ CÂU SAI)                            */}
        {/* ============================================================== */}
        {activeTab === 'mistakes' && (
          <div className="flex-1 flex flex-col animate-fadeIn">
            <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <HelpCircle size={20} />
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                      Sổ Tay Câu Sai (错题本)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Tất cả các từ vựng và câu ghép bạn từng trả lời sai sẽ được tự động lưu tại đây để ôn tập lại.
                  </p>
                </div>

                {mistakes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearAllMistakes}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Xóa sạch</span>
                    </button>
                  </div>
                )}
              </div>

              {mistakes.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Sổ câu sai đang trống!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Tuyệt vời! Hiện tại bạn không có câu sai nào cần ôn lại. Hãy làm bài trắc nghiệm từ vựng hoặc ghép câu để củng cố kiến thức nhé.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('vocab-quiz')}
                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700"
                  >
                    Làm Bài Trắc Nghiệm Ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Tổng số: {mistakes.length} câu cần khắc phục</span>
                    {mistakes.filter((m) => m.type === 'vocab').length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const vocabItems = mistakes
                            .filter((m) => m.type === 'vocab' && m.vocab)
                            .map((m) => m.vocab!);
                          if (vocabItems.length > 0) {
                            setActiveTab('vocab-quiz');
                            startVocabQuiz(vocabItems);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-emerald-700 shadow-xs"
                      >
                        <RotateCcw size={12} />
                        <span>Ôn riêng các từ này ({mistakes.filter((m) => m.type === 'vocab').length})</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {mistakes.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          {m.type === 'vocab' && m.vocab && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                  {m.vocab.hanzi}
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                  [{m.vocab.pinyin}]
                                </span>
                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-500">
                                  HSK {m.vocab.hskLevel}
                                </span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 mt-1">
                                {m.vocab.meaning}
                              </div>
                              {m.vocab.example && (
                                <div className="text-slate-400 italic text-[11px] mt-0.5 truncate">
                                  Ví dụ: {m.vocab.example}
                                </div>
                              )}
                            </>
                          )}

                          {m.type === 'sentence' && m.sentence && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded">
                                  Ghép câu HSK {m.sentence.hskLevel}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {m.sentence.original}
                                </span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 mt-1">
                                &ldquo;{m.sentence.meaning}&rdquo;
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              tts.speak(
                                m.type === 'vocab'
                                  ? m.vocab?.hanzi || ''
                                  : m.sentence?.original || ''
                              )
                            }
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMistake(m.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa khỏi sổ câu sai"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
