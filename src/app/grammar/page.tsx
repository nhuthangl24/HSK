'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Home,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
  Calendar,
  Check,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Flame,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Clock,
  FileText,
  BarChart2,
  Play,
  Lightbulb,
  FileCheck,
  Download,
  Share2,
  Menu,
  X,
  Circle,
  HelpCircle,
  Bell,
  CheckCheck,
  LogOut,
  Shield,
  Settings,
  User,
} from 'lucide-react';

import {
  GrammarPoint,
  HskGrammarLevel,
  GrammarCoreStructure,
  GrammarVocabItem,
} from '@/types/grammar';
import {
  HSK_GRAMMAR_DATABASE,
  HSK_LEVEL_METAS,
} from '@/data/hsk-grammar-data';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { tts } from '@/lib/tts';
import { quizSound } from '@/lib/quiz-sound';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { AuthModal } from '@/components/modals/AuthModal';
import { useStreak, recordStudyActivity } from '@/lib/streak';

// Storage keys
const STORAGE_COMPLETED_KEY = 'hsk_lms_completed_lessons_v2';
const STORAGE_BOOKMARKS_KEY = 'hsk_lms_bookmarks_v2';
const STORAGE_LAST_LESSON_KEY = 'hsk_lms_last_lesson_v3';
const STORAGE_VIEWED_TABS_KEY = 'hsk_lms_viewed_tabs_v2';

type ContentTab = 'theory' | 'examples' | 'vocab' | 'quiz' | 'docs';

export default function GrammarLmsPage() {
  const { user, logout } = useAuth();
  const { currentStreak } = useStreak(user?.id);
  const effectiveStreakDays = Math.max(user?.streakDays || 0, currentStreak);
  const { effectiveTheme, setTheme } = useTheme();

  // Active Lesson selection: Default to HSK 1 Bài 1 (Strictly HSK 1 only!)
  const [selectedLessonId, setSelectedLessonId] = useState<string>('hsk1-01-一01');

  // Active Content Tab
  const [activeTab, setActiveTab] = useState<ContentTab>('theory');

  // Accordion open levels in left sidebar: ONLY HSK 1 open by default (never auto-open multiple levels!)
  const [openLevels, setOpenLevels] = useState<Record<number, boolean>>({
    1: true,
  });

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // User avatar dropdown menu
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Completed lessons and Bookmarks in localStorage (Clean zero fake initial state!)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [viewedTabsByLesson, setViewedTabsByLesson] = useState<Record<string, string[]>>({});

  // Sound & Audio
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // In-lesson Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | string>>({});
  const [quizScore, setQuizScore] = useState(0);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Lịch học Popup Modal (Replaces browser alert completely!)
  const [isSchedulePopupOpen, setIsSchedulePopupOpen] = useState(false);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load persistence
  useEffect(() => {
    try {
      const savedCompleted = localStorage.getItem(STORAGE_COMPLETED_KEY);
      if (savedCompleted) setCompletedLessonIds(JSON.parse(savedCompleted));
      const savedBookmarks = localStorage.getItem(STORAGE_BOOKMARKS_KEY);
      if (savedBookmarks) setBookmarkedIds(JSON.parse(savedBookmarks));
      const savedTabs = localStorage.getItem(STORAGE_VIEWED_TABS_KEY);
      if (savedTabs) setViewedTabsByLesson(JSON.parse(savedTabs));

      // Clean up legacy storage keys that had stale HSK 9 test data
      try {
        localStorage.removeItem('hsk_lms_last_lesson_v2');
        localStorage.removeItem('hsk_lms_last_lesson_v1');
      } catch {}

      // Restore user's last selected lesson if available, else strictly default to HSK 1
      const savedLast = localStorage.getItem(STORAGE_LAST_LESSON_KEY);
      if (savedLast && HSK_GRAMMAR_DATABASE.some((p) => p.id === savedLast)) {
        const l = HSK_GRAMMAR_DATABASE.find((p) => p.id === savedLast);
        if (l) {
          setSelectedLessonId(l.id);
          // Only open this specific level (never keep both HSK 1 and HSK 9 open!)
          setOpenLevels({ [l.level]: true });
        }
      } else {
        setSelectedLessonId('hsk1-01-一01');
        setOpenLevels({ 1: true });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Current Lesson Data
  const currentLesson: GrammarPoint = useMemo(() => {
    return (
      HSK_GRAMMAR_DATABASE.find((p) => p.id === selectedLessonId) ||
      HSK_GRAMMAR_DATABASE.find((p) => p.id === 'hsk1-01-一01') ||
      HSK_GRAMMAR_DATABASE[0]
    );
  }, [selectedLessonId]);

  // Lessons grouped by level: 1 through 9
  const lessonsByLevel = useMemo(() => {
    const map: Record<number, GrammarPoint[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };
    HSK_GRAMMAR_DATABASE.forEach((p) => {
      if (map[p.level]) {
        map[p.level].push(p);
      }
    });
    return map;
  }, []);

  // Overall course progress percentage
  const totalLessonsCount = HSK_GRAMMAR_DATABASE.length;
  const completedCount = completedLessonIds.length;
  const overallProgressPercent = Math.min(
    100,
    Math.round((completedCount / Math.max(1, totalLessonsCount)) * 100)
  );

  // Toggle Level Accordion (Clean single accordion: only 1 level open at a time!)
  const toggleLevelAccordion = (lvl: number) => {
    quizSound.playTap();
    setOpenLevels((prev) => {
      const isCurrentlyOpen = !!prev[lvl];
      return isCurrentlyOpen ? {} : { [lvl]: true };
    });
  };

  // Select a lesson
  const handleSelectLesson = (lesson: GrammarPoint) => {
    quizSound.playTap();
    setSelectedLessonId(lesson.id);
    setActiveTab('theory');
    setIsMobileSidebarOpen(false);
    // Ensure ONLY the selected lesson's level is open
    setOpenLevels({ [lesson.level]: true });
    try {
      localStorage.setItem(STORAGE_LAST_LESSON_KEY, lesson.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle bookmark for current lesson
  const toggleBookmark = () => {
    quizSound.playTap();
    setBookmarkedIds((prev) => {
      const next = prev.includes(currentLesson.id)
        ? prev.filter((id) => id !== currentLesson.id)
        : [...prev, currentLesson.id];
      try {
        localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Toggle lesson completed status
  const toggleCompleteLesson = () => {
    quizSound.playCorrect();
    setCompletedLessonIds((prev) => {
      const isCompleting = !prev.includes(currentLesson.id);
      const next = isCompleting
        ? [...prev, currentLesson.id]
        : prev.filter((id) => id !== currentLesson.id);
      try {
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(next));
        if (isCompleting) {
          recordStudyActivity(user?.id);
        }
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Play audio TTS
  const handlePlayTTS = useCallback((text: string) => {
    setPlayingAudio(text);
    tts.speak(text);
    setTimeout(() => {
      setPlayingAudio((cur) => (cur === text ? null : cur));
    }, 2800);
  }, []);

  // Navigation: Next & Previous Lesson
  const currentIndex = HSK_GRAMMAR_DATABASE.findIndex((p) => p.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? HSK_GRAMMAR_DATABASE[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < HSK_GRAMMAR_DATABASE.length - 1
      ? HSK_GRAMMAR_DATABASE[currentIndex + 1]
      : null;

  // Level labels
  const getLevelDisplayName = (lvl: number) => {
    return `HSK ${lvl}`;
  };

  const isCurrentBookmarked = bookmarkedIds.includes(currentLesson.id);
  const isCurrentCompleted = completedLessonIds.includes(currentLesson.id);

  // Track tab exploration per lesson (Real dynamic progress tracking!)
  useEffect(() => {
    if (!currentLesson?.id) return;
    setViewedTabsByLesson((prev) => {
      const cur = prev[currentLesson.id] || [];
      if (cur.includes(activeTab)) return prev;
      const updated = { ...prev, [currentLesson.id]: [...cur, activeTab] };
      try {
        localStorage.setItem(STORAGE_VIEWED_TABS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, [currentLesson?.id, activeTab]);

  const currentLessonViewedCount = useMemo(() => {
    if (isCurrentCompleted) return 5;
    const tabs = viewedTabsByLesson[currentLesson.id] || ['theory'];
    return Math.min(5, Math.max(1, tabs.length));
  }, [isCurrentCompleted, viewedTabsByLesson, currentLesson.id]);

  const currentLessonProgressPercent = isCurrentCompleted
    ? 100
    : Math.round((currentLessonViewedCount / 5) * 100);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#07090e] text-slate-800 dark:text-slate-100 flex font-sans antialiased">
      {/* =========================================================================
          LEFT SIDEBAR: CURRICULUM TREE & NAVIGATION
          ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-[#0c1017] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1b7a4b] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                HSK Master
              </div>
              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Lộ trình học tiếng Trung
              </div>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Navigation Menu - Styled perfectly to fit the HSK Master platform */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-1 text-xs font-bold shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors"
          >
            <FileSpreadsheet size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Từ vựng</span>
          </Link>

          <Link
            href="/study"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors"
          >
            <RotateCcw size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Thẻ ghi nhớ</span>
          </Link>

          {/* Active Ngữ pháp item: exact rounded green pill from design */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#0e2a1d] dark:bg-[#0e2a1d] text-[#10b981] dark:text-[#10b981] font-extrabold shadow-2xs">
            <BookOpen size={16} className="text-[#10b981] dark:text-[#10b981] shrink-0" />
            <span>Ngữ pháp</span>
          </div>

          <Link
            href="/practice"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors"
          >
            <Sparkles size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Luyện tập</span>
          </Link>

          <Link
            href="/exams"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors"
          >
            <GraduationCap size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Đề thi thử</span>
          </Link>

          {/* Lịch học Popup Modal Button */}
          <button
            type="button"
            onClick={() => {
              quizSound.playTap();
              setIsSchedulePopupOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors text-left cursor-pointer"
          >
            <Calendar size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Lịch học</span>
          </button>
        </div>

        {/* Course Progress Widget */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <span>Tiến độ khóa học</span>
            <span className="text-[#1b7a4b] dark:text-emerald-400 font-extrabold">
              {overallProgressPercent}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1b7a4b] rounded-full transition-all duration-500"
              style={{ width: `${overallProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Curriculum Tree Accordion by Level: 1 through 9 individually! */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 sleek-scroll">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
            const lessons = lessonsByLevel[lvl] || [];
            const isOpen = !!openLevels[lvl];
            const levelLabel = getLevelDisplayName(lvl);
            const isLevelCompleted = lessons.length > 0 && lessons.every((l) => completedLessonIds.includes(l.id));

            return (
              <div key={lvl} className="rounded-xl overflow-hidden">
                {/* Level Header Button */}
                <button
                  type="button"
                  onClick={() => toggleLevelAccordion(lvl)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isOpen
                      ? 'bg-slate-100/80 dark:bg-slate-900/80 text-slate-900 dark:text-white'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span>
                      {levelLabel} ({lessons.length} bài)
                    </span>
                  </div>

                  {/* Level status checkmark or circle */}
                  {isLevelCompleted ? (
                    <Check size={14} className="text-[#1b7a4b] dark:text-emerald-400 font-bold" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 inline-block" />
                  )}
                </button>

                {/* Sub-lessons list */}
                {isOpen && (
                  <div className="pl-6 pr-1 py-1 space-y-0.5">
                    {lessons.map((lesson, lIdx) => {
                      const isSelected = lesson.id === currentLesson.id;
                      const isCompleted = completedLessonIds.includes(lesson.id);
                      const lessonTitle = lesson.lessonTitleChinese || `Bài ${lIdx + 1}`;

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleSelectLesson(lesson)}
                          title={lesson.title || lessonTitle}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-[#1b7a4b] dark:text-emerald-400 font-extrabold shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-slate-400 text-[10px]">›</span>
                            <span className="truncate">{lessonTitle}</span>
                          </div>

                          {isCompleted ? (
                            <Check
                              size={12}
                              className="text-[#1b7a4b] dark:text-emerald-400 shrink-0 ml-1.5"
                            />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <button
            type="button"
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {effectiveTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{effectiveTheme === 'dark' ? 'Sáng' : 'Tối'}</span>
          </button>
          <NotificationBell />
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE: PINNED HEADER + SCROLLABLE LESSON BODY
          ========================================================================= */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[#f8fafc] dark:bg-[#07090e]">
        {/* Top Navbar */}
        <div className="shrink-0 z-30 bg-[#f8fafc] dark:bg-[#07090e] border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 lg:hidden cursor-pointer"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb: Khóa học > HSK X > Bài Y */}
            <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              <Link href="/" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
                <Home size={13} />
                <span>Khóa học</span>
              </Link>
              <span>›</span>
              <span className="hover:text-slate-900 dark:hover:text-white font-medium">
                {getLevelDisplayName(currentLesson.level)}
              </span>
              <span>›</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold truncate">
                {currentLesson.lessonTitleChinese || `Bài ${currentLesson.lessonIndex || 1}`}
              </span>
            </nav>
          </div>

          {/* Quick Sound & Profile */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(quizSound.toggle())}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
              title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-2 sm:px-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-all text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  title="Tài khoản cá nhân"
                >
                  {effectiveStreakDays > 0 && (
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-bold text-[10px] sm:text-[11px] shrink-0 whitespace-nowrap">
                      <Flame size={12} className="fill-amber-500 text-amber-500" />
                      <span>{effectiveStreakDays}d</span>
                    </div>
                  )}
                  <span className="hidden sm:inline font-bold max-w-[100px] truncate">
                    {user.name || user.email?.split('@')[0]}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-[#1b7a4b] text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={13} className="text-slate-400 hidden sm:block shrink-0" />
                </button>

                {/* Dropdown User Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#0c1017] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 text-xs z-50 animate-scaleIn origin-top-right">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800/80 mb-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {user.name || 'Học viên'}
                        </span>
                        {user.targetHsk && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-md">
                            HSK {user.targetHsk}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                        {user.email}
                      </div>
                    </div>

                    <div className="px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 rounded-xl mb-1.5">
                      <span>Chuỗi ngày học:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Flame size={12} className="fill-amber-500 text-amber-500" />
                        {effectiveStreakDays} ngày liên tiếp
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        href="/"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet size={14} className="text-slate-400" />
                        <span>Bảng từ vựng (HSK Sheet)</span>
                      </Link>
                      <Link
                        href="/study"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <RotateCcw size={14} className="text-slate-400" />
                        <span>Thẻ ghi nhớ Flashcards</span>
                      </Link>
                      <Link
                        href="/practice"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Sparkles size={14} className="text-slate-400" />
                        <span>Luyện tập trắc nghiệm</span>
                      </Link>
                    </div>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full mt-1.5 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 flex items-center gap-2 cursor-pointer transition-colors font-semibold border border-purple-200 dark:border-purple-800"
                      >
                        <Shield size={14} className="text-purple-700 dark:text-purple-400" />
                        <span>Trang Quản Trị (Admin)</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800/80 mt-1.5 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <LogOut size={14} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {effectiveStreakDays > 0 && (
                  <div
                    className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-xl border border-amber-200 dark:border-amber-800 font-bold text-xs shrink-0 whitespace-nowrap shadow-2xs"
                    title={`Chuỗi học tập liên tục: ${effectiveStreakDays} ngày`}
                  >
                    <Flame size={12} className="fill-amber-500 text-amber-500" />
                    <span>{effectiveStreakDays}d</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#1b7a4b] text-white text-xs font-bold shadow-2xs hover:bg-[#15663d] cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <span>Đăng nhập</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =======================================================================
            PINNED / FIXED TOP HEADER (PHẦN NÀY ĐỨNG YÊN HOÀN TOÀN, KHÔNG CUỘN THEO!)
            ======================================================================= */}
        <div className="shrink-0 z-20 bg-[#f8fafc] dark:bg-[#07090e] border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 pt-3 pb-0">
          <div className="max-w-7xl mx-auto space-y-3">
            {/* Header Card (Exact visual from user screenshot) */}
            <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-xs font-black tracking-wide bg-[#1b7a4b] text-white shadow-2xs">
                    {getLevelDisplayName(currentLesson.level)}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {currentLesson.title}
                </h1>

                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                  {currentLesson.chineseTitle}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    <span>{currentLesson.durationMinutes || 10} phút học</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText size={13} className="text-slate-400" />
                    <span>{currentLesson.contentItemCount || 5} mục nội dung</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BarChart2 size={13} className="text-slate-400" />
                    <span>{currentLesson.difficultyLevel || 'Trung cấp - Nâng cao'}</span>
                  </div>
                </div>
              </div>

              {/* Right Action Widgets (Dynamic Progress Ring & Interactive Buttons) */}
              <div className="flex items-center gap-3 md:flex-col md:items-end shrink-0">
                <div
                  onClick={toggleCompleteLesson}
                  className="flex items-center gap-3 cursor-pointer group"
                  title={isCurrentCompleted ? "Bấm để bỏ đánh dấu hoàn thành" : "Bấm để đánh dấu hoàn thành bài học"}
                >
                  <div className="relative w-11 h-11 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100 dark:text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#1b7a4b] dark:text-emerald-400 transition-all duration-500"
                        strokeDasharray={`${currentLessonProgressPercent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {isCurrentCompleted ? '5/5' : `${currentLessonViewedCount}/5`}
                    </span>
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {isCurrentCompleted && <CheckCircle2 size={13} className="text-[#1b7a4b] dark:text-emerald-400" />}
                      <span>{isCurrentCompleted ? 'Đã hoàn thành' : `${currentLessonViewedCount}/5 Hoàn thành`}</span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                      {isCurrentCompleted ? '100% mục bài học' : `${currentLessonProgressPercent}% tiến độ`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      quizSound.playTap();
                      setActiveTab('quiz');
                    }}
                    className="px-3 sm:px-4 py-2 rounded-xl bg-[#1b7a4b] hover:bg-[#15663d] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Luyện tập</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleBookmark}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrentBookmarked
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Bookmark
                      size={13}
                      fill={isCurrentBookmarked ? 'currentColor' : 'none'}
                      className={isCurrentBookmarked ? 'text-amber-600' : ''}
                    />
                    <span>{isCurrentBookmarked ? 'Đã lưu' : 'Đánh dấu'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCompleteLesson}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrentCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-800 text-[#1b7a4b] dark:text-emerald-300 font-extrabold'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={isCurrentCompleted ? "Bấm để bỏ đánh dấu hoàn thành" : "Đánh dấu hoàn thành bài học"}
                  >
                    {isCurrentCompleted ? (
                      <CheckCircle2 size={13} className="text-[#1b7a4b] dark:text-emerald-400" />
                    ) : (
                      <Circle size={13} className="text-slate-400" />
                    )}
                    <span>{isCurrentCompleted ? 'Đã xong' : 'Xong bài'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Tabs (Pinned with Header!) */}
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold -mb-px">
              {[
                { id: 'theory', label: 'Lý thuyết' },
                { id: 'examples', label: 'Ví dụ minh họa' },
                { id: 'vocab', label: 'Từ vựng' },
                { id: 'quiz', label: 'Bài tập' },
                { id: 'docs', label: 'Tài liệu' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    quizSound.playTap();
                    setActiveTab(tab.id as ContentTab);
                  }}
                  className={`pb-2.5 transition-colors cursor-pointer relative ${
                    activeTab === tab.id
                      ? 'text-[#1b7a4b] dark:text-emerald-400 font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b7a4b] dark:bg-emerald-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =======================================================================
            SCROLLABLE CONTENT AREA (CHỈ PHẦN DƯỚI NÀY MỚI CUỘN!)
            ======================================================================= */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-5 sleek-scroll bg-[#f8fafc] dark:bg-[#07090e]">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
            {/* Main Content Column */}
            <div className="flex-1 min-w-0 space-y-6 w-full">
              {/* TAB 1: LÝ THUYẾT */}
              {activeTab === 'theory' && (
                <div className="space-y-6">
                  {/* Section 1: Cấu trúc câu và cách dùng */}
                  <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-[#1b7a4b] dark:text-emerald-400 flex items-center justify-center font-bold">
                        <FileText size={16} />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        1. Cấu trúc câu và cách dùng
                      </h2>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {currentLesson.summary}
                    </p>

                    {/* Green-tinted Box: Cấu trúc chính */}
                    <div className="bg-[#f2f9f4] dark:bg-[#091811] border border-[#d2edd9] dark:border-[#133621] rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black text-[#1b7a4b] dark:text-emerald-400 uppercase tracking-wider">
                        <Lightbulb size={15} />
                        <span>Cấu trúc chính</span>
                      </div>

                      {/* Numbered Items List (NO FAKE DATA!) */}
                      <div className="space-y-4">
                        {currentLesson.coreStructures.map((item) => (
                          <div key={item.num} className="flex items-start gap-3 sm:gap-4">
                            <div className="w-6 h-6 rounded-full bg-[#c8ecd2] dark:bg-[#133d23] text-[#1b7a4b] dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {item.num}
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {item.pattern}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {item.description}
                              </div>

                              {item.example && (
                                <div className="mt-2 p-2.5 rounded-xl bg-white/90 dark:bg-[#0d1f16] border border-slate-200/80 dark:border-[#1b4329] text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                                  <div className="space-x-1.5 leading-snug">
                                    <span className="font-bold text-[#1b7a4b] dark:text-emerald-400">
                                      {item.example}
                                    </span>
                                    {item.exampleMeaning && (
                                      <span className="font-sans text-slate-500 dark:text-slate-400">
                                        {item.exampleMeaning}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handlePlayTTS(item.example.replace('例: ', ''))}
                                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 shrink-0 cursor-pointer"
                                    title="Nghe câu ví dụ"
                                  >
                                    <Volume2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Ví dụ minh họa chi tiết */}
                  <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-[#1b7a4b] dark:text-emerald-400 flex items-center justify-center font-bold">
                        <BookOpen size={16} />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        2. Ví dụ minh họa chi tiết
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {currentLesson.examples.map((ex, exIdx) => {
                        const isPlaying = playingAudio === ex.chinese;
                        return (
                          <div
                            key={exIdx}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 flex items-start justify-between gap-3 group hover:border-[#1b7a4b] transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">
                                {ex.chinese}
                              </div>
                              <div className="text-xs font-semibold text-[#1b7a4b] dark:text-emerald-400">
                                {ex.pinyin}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                {ex.meaning}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handlePlayTTS(ex.chinese)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                                isPlaying
                                  ? 'bg-[#1b7a4b] text-white border-[#1b7a4b] animate-pulse'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600'
                              }`}
                              title="Nghe phát âm"
                            >
                              <Volume2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Bẫy thi thường gặp ❌ vs ✅ */}
                  {currentLesson.commonMistakes && currentLesson.commonMistakes.length > 0 && (
                    <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-3">
                      <h2 className="text-xs font-extrabold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle size={15} />
                        Bẫy ngữ pháp thường gặp trong bài thi
                      </h2>
                      {currentLesson.commonMistakes.map((m, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1.5 text-xs sm:text-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                              <XCircle size={14} className="shrink-0" />
                              <span>Sai: {m.wrong}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                              <CheckCircle2 size={14} className="shrink-0" />
                              <span>Đúng: {m.correct}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 pl-5">
                            💡 <strong>Phân tích: </strong>
                            {m.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom Navigation Buttons */}
                  <div className="pt-2 flex items-center justify-between gap-4">
                    {prevLesson ? (
                      <button
                        type="button"
                        onClick={() => handleSelectLesson(prevLesson)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <ArrowLeft size={14} />
                        <span>‹ Bài trước</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {nextLesson && (
                      <button
                        type="button"
                        onClick={() => handleSelectLesson(nextLesson)}
                        className="px-5 py-2.5 rounded-xl bg-[#1b7a4b] hover:bg-[#15663d] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <span>Bài tiếp theo ›</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: VÍ DỤ MINH HỌA */}
              {activeTab === 'examples' && (
                <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-[#1b7a4b]" />
                    Tổng hợp câu ví dụ mẫu bản xứ ({currentLesson.examples.length} câu)
                  </h2>

                  <div className="space-y-3">
                    {currentLesson.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                            {ex.chinese}
                          </div>
                          <div className="text-xs font-semibold text-[#1b7a4b] dark:text-emerald-400">
                            {ex.pinyin}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            {ex.meaning}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePlayTTS(ex.chinese)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-[#1b7a4b] cursor-pointer"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: TỪ VỰNG TRỌNG ĐIỂM (100% AUTHENTIC!) */}
              {activeTab === 'vocab' && (
                <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText size={18} className="text-[#1b7a4b]" />
                    Bảng từ vựng trọng điểm của bài học ({currentLesson.keyVocab.length} từ)
                  </h2>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-900/80 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Từ vựng</th>
                          <th className="p-3">Pinyin</th>
                          <th className="p-3">Nghĩa</th>
                          <th className="p-3 text-right">Phát âm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {currentLesson.keyVocab.map((w, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="p-3 font-bold text-slate-900 dark:text-white font-serif">
                              {w.word}
                            </td>
                            <td className="p-3 text-[#1b7a4b] dark:text-emerald-400 font-medium">
                              {w.pinyin}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{w.meaning}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handlePlayTTS(w.word)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-[#1b7a4b] cursor-pointer"
                              >
                                <Volume2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: BÀI TẬP CỦNG CỐ */}
              {activeTab === 'quiz' && (
                <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles size={18} className="text-[#1b7a4b]" />
                      Bài tập trắc nghiệm củng cố ({currentLesson.quiz.length} câu)
                    </h2>
                    <div className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <Trophy size={14} />
                      <span>Điểm: {quizScore}</span>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {currentLesson.quiz.map((q, qIdx) => {
                      const chosen = quizAnswers[q.id];
                      const isAnswered = chosen !== undefined;

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3"
                        >
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            Câu {qIdx + 1}: {q.question}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === q.correctAnswer;
                              const isSelected = chosen === optIdx;

                              let btnStyle =
                                'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500';

                              if (isAnswered) {
                                if (isCorrect) {
                                  btnStyle =
                                    'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold';
                                } else if (isSelected) {
                                  btnStyle =
                                    'bg-rose-100 dark:bg-rose-950 border-rose-500 text-rose-900 dark:text-rose-100 font-bold';
                                } else {
                                  btnStyle = 'opacity-50 border-slate-200 dark:border-slate-800';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={isAnswered}
                                  onClick={() => {
                                    if (optIdx === q.correctAnswer) {
                                      quizSound.playCorrect();
                                      setQuizScore((s) => s + 10);
                                    } else {
                                      quizSound.playWrong();
                                    }
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                                  }}
                                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                                >
                                  <span>{opt}</span>
                                  {isAnswered && isCorrect && (
                                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                  )}
                                  {isAnswered && isSelected && !isCorrect && (
                                    <XCircle size={15} className="text-rose-600 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {isAnswered && (
                            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                              💡 <strong>Giải thích: </strong>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={toggleCompleteLesson}
                      className="px-4 py-2 rounded-xl bg-[#1b7a4b] hover:bg-[#15663d] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check size={14} />
                      <span>{isCurrentCompleted ? 'Đã hoàn thành bài học' : 'Đánh dấu hoàn thành bài học'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: TÀI LIỆU ÔN TẬP */}
              {activeTab === 'docs' && (
                <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xs space-y-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download size={18} className="text-[#1b7a4b]" />
                    Tài liệu tóm tắt & Giáo trình ôn tập
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Tài liệu giảng dạy tiêu chuẩn được biên soạn bám sát đề thi thật và định dạng kiểm tra năng lực HSK 3.0 GF 0025-2021.
                  </p>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {currentLesson.title} - Tóm tắt ngữ pháp PDF
                      </div>
                      <div className="text-[11px] text-slate-400">Định dạng PDF • Đầy đủ công thức & bẫy thi</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>In / Tải PDF</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ===================================================================
                RIGHT SIDEBAR WIDGETS: STICKY & 100% AUTHENTIC DATA
                =================================================================== */}
            <div className="w-full lg:w-80 space-y-5 shrink-0 sticky top-0">
              {/* Widget 1: Từ vựng quan trọng (Exact authentic data for this lesson!) */}
              <div className="bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                  <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#1b7a4b] dark:text-emerald-400 flex items-center justify-center font-bold">
                    <BookOpen size={12} />
                  </div>
                  <span>Từ vựng quan trọng</span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-2.5">Từ vựng</th>
                        <th className="py-2 px-2.5">Pinyin</th>
                        <th className="py-2 px-2.5">Nghĩa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {currentLesson.keyVocab.map((w, idx) => (
                        <tr
                          key={idx}
                          onClick={() => handlePlayTTS(w.word)}
                          className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 cursor-pointer transition-colors group"
                          title="Bấm để nghe phát âm"
                        >
                          <td className="py-2 px-2.5 font-bold font-serif text-slate-800 dark:text-slate-200 group-hover:text-[#1b7a4b]">
                            {w.word}
                          </td>
                          <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {w.pinyin}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                            {w.meaning}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Widget 2: Mẹo ghi nhớ */}
              <div className="bg-[#f2f9f4] dark:bg-[#091811] border border-[#d2edd9] dark:border-[#133621] rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#1b7a4b] dark:text-emerald-400">
                  <Lightbulb size={15} />
                  <span>Mẹo ghi nhớ</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {currentLesson.tips ||
                    'Các cấu trúc này thường đi kèm với danh từ, cụm danh từ hoặc mệnh đề, dùng để tăng tính học thuật và thuyết phục trong bài viết nghị luận.'}
                </p>
              </div>

              {/* Quick Navigation Footer in Sidebar */}
              <div className="flex items-center gap-2 pt-1">
                {prevLesson && (
                  <button
                    type="button"
                    onClick={() => handleSelectLesson(prevLesson)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowLeft size={13} />
                    <span>‹ Bài trước</span>
                  </button>
                )}

                {nextLesson && (
                  <button
                    type="button"
                    onClick={() => handleSelectLesson(nextLesson)}
                    className="flex-1 py-2.5 rounded-xl bg-[#1b7a4b] hover:bg-[#15663d] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <span>Bài tiếp theo ›</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          POPUP MODAL: KẾ HOẠCH & LỊCH HỌC (THAY THẾ HOÀN TOÀN ALERT BROWSER!)
          ========================================================================= */}
      {isSchedulePopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0e1420] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5 animate-scaleUp">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsSchedulePopupOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-[#1b7a4b] dark:text-emerald-400 flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Kế Hoạch & Lịch Học HSK
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lộ trình học chuẩn hóa theo từng ngày
                </p>
              </div>
            </div>

            {/* Schedule Body */}
            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  <span>Mục tiêu khuyến nghị hôm nay</span>
                </div>
                <p>
                  Hoàn thành <strong>1 bài ngữ pháp</strong> (10-15 phút) và làm trọn bộ <strong>5 câu trắc nghiệm</strong> củng cố.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Flame size={14} className="text-rose-500" />
                  <span>Duy trì chuỗi ngày học liên tục</span>
                </div>
                <p className="text-[11px]">
                  Hệ thống tự động lưu trữ tiến độ hoàn thành các bài học vào bộ nhớ trình duyệt để bạn không bị ngắt quãng.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSchedulePopupOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1b7a4b] hover:bg-[#15663d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Đã hiểu, tiếp tục học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal if triggered */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode="login"
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
