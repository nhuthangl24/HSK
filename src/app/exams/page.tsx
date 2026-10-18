'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  BookOpen,
  GraduationCap,
  Download,
  Share2,
  QrCode,
  FileText,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  KeyRound,
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Headphones,
  Award,
  Layers,
  LayoutGrid,
  List,
  Sun,
  Moon,
  Shield,
  Eye,
  RefreshCw,
  X,
  SlidersHorizontal,
  Bookmark,
  Check,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Sliders,
  Printer,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamItem, ExamHskLevel } from '@/types/exam';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NotificationBell } from '@/components/layout/NotificationBell';

// -------------------------------------------------------------
// Refined Minimalist Level Design Config
// -------------------------------------------------------------
interface LevelBadgeStyle {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentColor: string;
  dotColor: string;
}

const LEVEL_BADGES: Record<string, LevelBadgeStyle> = {
  '1': {
    label: 'HSK 1',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200/80 dark:border-emerald-800/60',
    accentColor: '#059669',
    dotColor: 'bg-emerald-500',
  },
  '2': {
    label: 'HSK 2',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/50',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-200/80 dark:border-teal-800/60',
    accentColor: '#0d9488',
    dotColor: 'bg-teal-500',
  },
  '3': {
    label: 'HSK 3',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/50',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeBorder: 'border-sky-200/80 dark:border-sky-800/60',
    accentColor: '#0284c7',
    dotColor: 'bg-sky-500',
  },
  '4': {
    label: 'HSK 4',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200/80 dark:border-blue-800/60',
    accentColor: '#2563eb',
    dotColor: 'bg-blue-500',
  },
  '5': {
    label: 'HSK 5',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200/80 dark:border-indigo-800/60',
    accentColor: '#4f46e5',
    dotColor: 'bg-indigo-500',
  },
  '6': {
    label: 'HSK 6',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-200/80 dark:border-purple-800/60',
    accentColor: '#7c3aed',
    dotColor: 'bg-purple-500',
  },
  '7': {
    label: 'HSK 7–9',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-200/80 dark:border-amber-800/60',
    accentColor: '#d97706',
    dotColor: 'bg-amber-500',
  },
  '7-9': {
    label: 'HSK 7–9',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-200/80 dark:border-amber-800/60',
    accentColor: '#d97706',
    dotColor: 'bg-amber-500',
  },
  HSKK: {
    label: 'HSKK',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200/80 dark:border-rose-800/60',
    accentColor: '#e11d48',
    dotColor: 'bg-rose-500',
  },
};

function formatLevelLabel(lvl: ExamHskLevel | string | number | undefined): string {
  if (!lvl) return '';
  if (lvl === 'HSKK') return 'HSKK';
  if (lvl === 7 || lvl === '7' || lvl === '7-9') return 'HSK 7–9';
  return `HSK ${lvl}`;
}

export default function ExamsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'level_asc' | 'level_desc' | 'views'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Audio Player State
  const [activeAudioExam, setActiveAudioExam] = useState<ExamItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Virtual Exam Simulator Modal State (Phòng thi trực tuyến)
  const [simulatorExam, setSimulatorExam] = useState<ExamItem | null>(null);
  const [showAnswerInSimulator, setShowAnswerInSimulator] = useState(false);

  // Share QR Modal State
  const [shareModalExam, setShareModalExam] = useState<ExamItem | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Fetch Exams from API
  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setExams(data.exams);
        }
      } else {
        toast.error('Không thể tải kho đề thi.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tải danh sách đề thi.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Handle URL Query (?id=xxx to open specific exam share)
  useEffect(() => {
    if (typeof window !== 'undefined' && exams.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id');
      if (targetId) {
        const found = exams.find((e) => e.id === targetId);
        if (found) {
          setSimulatorExam(found);
        }
      }
    }
  }, [exams]);

  // Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [activeAudioExam]);

  // Play / Pause Audio
  const togglePlayAudio = (exam: ExamItem) => {
    if (activeAudioExam?.id === exam.id) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } else {
      setActiveAudioExam(exam);
      setIsPlaying(true);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.src = exam.audioUrl || '';
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(duration, audioRef.current.currentTime + seconds)
      );
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Open PDF / Answer Resource
  const handleOpenResource = (exam: ExamItem, url?: string, label = 'Tài liệu') => {
    if (!url) {
      toast.error(`Chưa có file ${label} cho đề thi này.`);
      return;
    }

    // Increment download/view count
    fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: exam.id, action: 'increment', type: 'download' }),
    }).catch(() => {});

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open Interactive Virtual Exam Room Simulator
  const handleOpenSimulator = (exam: ExamItem) => {
    setSimulatorExam(exam);
    setShowAnswerInSimulator(false);
    // Auto-start audio if available
    if (exam.audioUrl) {
      togglePlayAudio(exam);
    }
  };

  // Share Modal & QR Code
  const handleOpenShare = async (exam: ExamItem) => {
    setShareModalExam(exam);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/exams?id=${encodeURIComponent(exam.id)}`;
    try {
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qr);
    } catch {
      toast.error('Lỗi khi tạo mã QR.');
    }
  };

  const handleCopyLink = (exam: ExamItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/exams?id=${encodeURIComponent(exam.id)}`;
    const copyText = `📚 Luyện Thi HSK: ${exam.title} (${formatLevelLabel(exam.hskLevel)} • Kèm file nghe MP3 & Đáp án chi tiết) 👉 ${shareUrl}`;
    navigator.clipboard.writeText(copyText);
    toast.success('Đã sao chép link đề thi vào bộ nhớ tạm!');
  };

  // Filter & Sort
  const filteredExams = useMemo(() => {
    const res = exams.filter((e) => {
      if (selectedLevel !== 'all') {
        if (selectedLevel === 'HSKK' && e.hskLevel !== 'HSKK') return false;
        if (String(e.hskLevel) !== selectedLevel) return false;
      }
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'audio' && !e.audioUrl) return false;
        if (selectedCategory === 'official' && e.category !== 'official') return false;
        if (selectedCategory === 'mock' && e.category !== 'mock') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchSource = (e.source || '').toLowerCase().includes(q);
        const matchDesc = (e.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSource && !matchDesc) return false;
      }
      return true;
    });

    res.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'level_asc') {
        const la = typeof a.hskLevel === 'number' ? a.hskLevel : 99;
        const lb = typeof b.hskLevel === 'number' ? b.hskLevel : 99;
        return la - lb;
      }
      if (sortBy === 'level_desc') {
        const la = typeof a.hskLevel === 'number' ? a.hskLevel : 99;
        const lb = typeof b.hskLevel === 'number' ? b.hskLevel : 99;
        return lb - la;
      }
      if (sortBy === 'views') {
        return b.viewsCount + b.downloadsCount - (a.viewsCount + a.downloadsCount);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return res;
  }, [exams, selectedLevel, selectedCategory, search, sortBy]);

  // Statistics
  const levelCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of exams) {
      const key = String(e.hskLevel);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [exams]);

  const totalAudioCount = useMemo(() => exams.filter((e) => Boolean(e.audioUrl)).length, [exams]);
  const totalOfficialCount = useMemo(() => exams.filter((e) => e.category === 'official').length, [exams]);
  const totalMockCount = useMemo(() => exams.filter((e) => e.category === 'mock').length, [exams]);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* =========================================================================
          1. MINIMALIST TOP APP BAR
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
          {/* Left: Back & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Quay lại bàn học từ vựng"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Bàn học</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-tight text-slate-950 dark:text-white">
                HSK EXAM SUITE
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                Official & BLCU
              </span>
            </div>
          </div>

          {/* Right: Quick Tools */}
          <div className="flex items-center gap-2">

            {/* View Mode (Grid vs List) */}
            <div className="hidden sm:flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dạng lưới thẻ"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'list'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dạng danh sách gọn"
              >
                <List size={14} />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer border border-slate-200/80 dark:border-zinc-800 transition-colors"
              title="Đổi giao diện Sáng / Tối"
            >
              {effectiveTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Admin Badge */}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold"
              >
                <Shield size={12} />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. EDITORIAL HERO & HEADLINE SECTION
         ========================================================================= */}
      <section className="border-b border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#09090b] px-4 sm:px-6 pt-10 pb-8 transition-colors">
        <div className="max-w-7xl mx-auto">
          {/* Main Headline */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 text-xs font-semibold mb-3 border border-slate-200 dark:border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Kho Đề Thi Chuẩn Hóa Quốc Tế</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
              Kho Đề Thi HSK Tuyển Chọn & Đề Thử BLCU
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed font-normal">
              Tuyển tập trọn bộ đề thi thật CTI / Hanban và chuỗi đề mô phỏng chuẩn ma trận từ Đại học Ngôn ngữ Bắc Kinh (BLCU). Đầy đủ bản in A4 PDF sắc nét, file nghe Audio MP3 phòng thi và đáp án chi tiết.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Tổng số:</span>
              <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {exams.length} bộ đề
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Đề thi thật Hanban:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/50">
                {totalOfficialCount} đề
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Đề thử BLCU:</span>
              <span className="font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/50">
                {totalMockCount} đề
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Kèm Audio MP3:</span>
              <span className="font-extrabold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/50">
                {totalAudioCount} file nghe
              </span>
            </div>
          </div>

          {/* Modern Search & Level Tabs */}
          <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mã đề (vd: H31001, H51001), BLCUP, HSK 5..."
                className="w-full pl-9.5 pr-8 py-2.5 bg-slate-50 dark:bg-zinc-900/90 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/20 transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Pills & Sort */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-zinc-900 p-1 border border-slate-200 dark:border-zinc-800 text-xs">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'official', label: '🏛️ Đề thật' },
                  { id: 'mock', label: '📘 Đề thử' },
                  { id: 'audio', label: '🎧 Có Audio' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
              >
                <option value="newest">Mới cập nhật</option>
                <option value="level_asc">Cấp HSK: 1 → 6</option>
                <option value="level_desc">Cấp HSK: 6 → 1</option>
                <option value="views">Lượt xem & tải nhiều</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. HSK LEVEL SEGMENTED TABS (Clean horizontal row)
         ========================================================================= */}
      <section className="bg-white dark:bg-[#09090b] border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* All Levels */}
            <button
              type="button"
              onClick={() => setSelectedLevel('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                selectedLevel === 'all'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span>Tất cả</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 dark:bg-black/20">
                {exams.length}
              </span>
            </button>

            {/* Individual HSK Levels */}
            {[
              { id: '1', label: 'HSK 1' },
              { id: '2', label: 'HSK 2' },
              { id: '3', label: 'HSK 3' },
              { id: '4', label: 'HSK 4' },
              { id: '5', label: 'HSK 5' },
              { id: '6', label: 'HSK 6' },
              { id: '7', label: 'HSK 7–9' },
              { id: 'HSKK', label: 'HSKK' },
            ].map((lvl) => {
              const isActive = selectedLevel === lvl.id;
              const count = levelCounts[lvl.id] || 0;
              const badgeStyle = LEVEL_BADGES[lvl.id] || LEVEL_BADGES['1'];

              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-black border-slate-950 dark:border-white shadow-xs'
                      : 'border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-white dark:bg-black' : badgeStyle.dotColor
                    }`}
                  />
                  <span>{lvl.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 font-medium whitespace-nowrap hidden lg:block shrink-0">
            Hiển thị <strong>{filteredExams.length}</strong> bộ đề
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. MAIN EXAM CARDS GRID & LIST
         ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {loading && exams.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw size={24} className="animate-spin text-slate-600 mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Đang đồng bộ kho tài liệu đề thi HSK...
            </p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mb-3">
              <BookOpen size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Chưa tìm thấy đề thi phù hợp
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Không có bộ đề nào khớp với từ khóa tìm kiếm hoặc cấp độ bạn đã chọn.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedLevel('all');
                setSelectedCategory('all');
                setSearch('');
              }}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xem tất cả các đề thi
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* =========================================================================
             CLEAN MODERN GRID CARDS (MINIMALIST & SOPHISTICATED)
             ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExams.map((exam) => {
              const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
              const badgeStyle = LEVEL_BADGES[String(exam.hskLevel)] || LEVEL_BADGES['1'];

              return (
                <div
                  key={exam.id}
                  className="group bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between p-5"
                >
                  <div>
                    {/* Top Row: Level Badge & Meta Tags */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* HSK Level Pill */}
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.badgeBorder}`}
                        >
                          {formatLevelLabel(exam.hskLevel)}
                        </span>

                        {/* Category Label */}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                          {exam.category === 'official' ? '🏛️ Hanban' : '📘 BLCU'}
                        </span>

                        {/* Year */}
                        {exam.year && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {exam.year}
                          </span>
                        )}
                      </div>

                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenShare(exam)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                        title="Chia sẻ link & Mã QR"
                      >
                        <Share2 size={13} />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {exam.title}
                    </h3>

                    {/* Specs Row */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                      {exam.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          <span>{exam.durationMinutes} phút</span>
                        </span>
                      )}
                      {exam.questionCount && (
                        <span className="flex items-center gap-1">
                          <FileText size={12} className="text-slate-400" />
                          <span>{exam.questionCount} câu</span>
                        </span>
                      )}
                      {exam.audioUrl && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Headphones size={12} />
                          <span>Audio MP3</span>
                        </span>
                      )}
                    </div>

                    {/* Source */}
                    {exam.source && (
                      <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2 truncate">
                        Nguồn: {exam.source}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    {/* Audio Play Button */}
                    {exam.audioUrl ? (
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(exam)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          isCurrentPlaying
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}
                        title="Nghe file Audio MP3 phòng thi"
                      >
                        {isCurrentPlaying ? (
                          <>
                            <Pause size={12} />
                            <span>Tạm dừng</span>
                          </>
                        ) : (
                          <>
                            <Play size={12} className="fill-current" />
                            <span>Nghe MP3</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Chỉ có đề đọc</span>
                    )}

                    {/* Action Buttons: PDF, Answer, Simulator */}
                    <div className="flex items-center gap-1.5">
                      {/* Interactive Simulator / Practice Room Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenSimulator(exam)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
                        title="Vào phòng luyện thi trực tuyến (Vừa nghe Audio vừa xem đề PDF)"
                      >
                        <Maximize2 size={12} />
                        <span>Làm bài</span>
                      </button>

                      {/* Direct PDF View / Download */}
                      {exam.pdfUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer border border-slate-200 dark:border-zinc-700"
                          title="Tải đề thi PDF (Khổ A4)"
                        >
                          <Download size={13} />
                        </button>
                      )}

                      {/* Answer Key */}
                      {exam.answerUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer border border-slate-200 dark:border-zinc-700"
                          title="Xem bảng đáp án chi tiết"
                        >
                          <KeyRound size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* =========================================================================
             CLEAN HIGH-DENSITY TABLE LIST VIEW
             ========================================================================= */
          <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/90 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
            {filteredExams.map((exam) => {
              const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
              const badgeStyle = LEVEL_BADGES[String(exam.hskLevel)] || LEVEL_BADGES['1'];

              return (
                <div
                  key={exam.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border shrink-0 text-center min-w-[65px] ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.badgeBorder}`}
                    >
                      {formatLevelLabel(exam.hskLevel)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                          {exam.title}
                        </h4>
                        {exam.isPinned && (
                          <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 shrink-0">
                            Tuyển chọn
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{exam.category === 'official' ? '🏛️ Hanban' : '📘 BLCU'}</span>
                        {exam.year && <span>• Năm {exam.year}</span>}
                        {exam.durationMinutes && <span>• {exam.durationMinutes} phút</span>}
                        {exam.questionCount && <span>• {exam.questionCount} câu</span>}
                        {exam.source && <span className="truncate max-w-[200px]">• {exam.source}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {exam.audioUrl && (
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(exam)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          isCurrentPlaying
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}
                      >
                        {isCurrentPlaying ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
                        <span>{isCurrentPlaying ? 'Tạm dừng' : 'Nghe MP3'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenSimulator(exam)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                      title="Vào phòng thi trực tuyến"
                    >
                      <Maximize2 size={12} />
                      <span>Làm bài</span>
                    </button>

                    {exam.pdfUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer border border-slate-200 dark:border-zinc-700"
                        title="Tải PDF"
                      >
                        <Download size={13} />
                      </button>
                    )}

                    {exam.answerUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer border border-slate-200 dark:border-zinc-700"
                        title="Xem đáp án"
                      >
                        <KeyRound size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenShare(exam)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl cursor-pointer"
                      title="Chia sẻ"
                    >
                      <Share2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================================
          5. VIRTUAL EXAM SIMULATOR ROOM (Full-Featured In-Browser Practice Room)
         ========================================================================= */}
      {simulatorExam && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fadeIn">
          {/* Simulator Top Control Bar */}
          <div className="h-14 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-500 text-slate-950 shrink-0">
                {formatLevelLabel(simulatorExam.hskLevel)}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xl">
                {simulatorExam.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Answer Key Toggle */}
              {simulatorExam.answerUrl && (
                <button
                  type="button"
                  onClick={() => setShowAnswerInSimulator(!showAnswerInSimulator)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    showAnswerInSimulator
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <KeyRound size={13} />
                  <span>{showAnswerInSimulator ? 'Ẩn đáp án' : 'Bật đáp án'}</span>
                </button>
              )}

              {/* Direct Open in New Tab */}
              <button
                type="button"
                onClick={() => handleOpenResource(simulatorExam, simulatorExam.pdfUrl, 'Đề thi PDF')}
                className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
                title="Mở đề thi tab mới"
              >
                <ExternalLink size={15} />
              </button>

              {/* Exit Simulator */}
              <button
                type="button"
                onClick={() => setSimulatorExam(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
                title="Thoát phòng thi"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Simulator Body: Dual View (Audio Player Header + PDF Frame) */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Main Test Paper Iframe */}
            <div className="flex-1 bg-slate-900 relative flex flex-col">
              {simulatorExam.pdfUrl ? (
                <iframe
                  src={`${simulatorExam.pdfUrl}#toolbar=1`}
                  className="w-full h-full border-0 bg-white"
                  title={simulatorExam.title}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <AlertCircle size={32} className="mb-2 text-amber-400" />
                  <p className="text-sm font-semibold">Tệp PDF đang được cập nhật</p>
                </div>
              )}
            </div>

            {/* Answer Sheet Side Panel (When Toggled) */}
            {showAnswerInSimulator && simulatorExam.answerUrl && (
              <div className="w-full md:w-[480px] border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950 flex flex-col animate-slideInRight">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={14} />
                    <span>Bảng Đáp Án Đối Chiếu</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAnswerInSimulator(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                <iframe
                  src={`${simulatorExam.answerUrl}#toolbar=0`}
                  className="flex-1 w-full bg-white border-0"
                  title="Đáp án"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          6. REFINED STICKY FLOATING AUDIO PLAYER (Apple/Spotify Quality)
         ========================================================================= */}
      {activeAudioExam && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 md:left-auto md:right-8 md:max-w-2xl z-40 bg-[#0f172a]/95 dark:bg-[#121215]/95 backdrop-blur-xl text-white border border-white/10 rounded-2xl px-4 py-3 shadow-2xl animate-slideUp">
          <audio ref={audioRef} />

          <div className="flex items-center justify-between gap-3">
            {/* Track Info */}
            <div className="flex items-center gap-2.5 min-w-0 max-w-[180px] sm:max-w-[240px]">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                <Headphones size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {activeAudioExam.title}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>

            {/* Central Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSkip(-10)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                title="Lùi 10s"
              >
                <RotateCcw size={14} />
              </button>

              <button
                type="button"
                onClick={() => togglePlayAudio(activeAudioExam)}
                className="w-8 h-8 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold hover:scale-105 cursor-pointer shadow-md"
              >
                {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(10)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                title="Tua 10s"
              >
                <RotateCw size={14} />
              </button>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-20 sm:w-32 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg hidden sm:block"
              />

              {/* Speed Button */}
              <button
                type="button"
                onClick={handleSpeedChange}
                className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer"
                title="Tốc độ nghe"
              >
                {playbackRate}x
              </button>

              {/* Close Audio Player */}
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setActiveAudioExam(null);
                  setIsPlaying(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer ml-1"
                title="Đóng trình phát"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MINIMALIST SHARE & QR CODE MODAL
         ========================================================================= */}
      {shareModalExam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 max-w-sm w-full p-6 text-center animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 size={14} className="text-emerald-600" />
                <span>Chia Sẻ Bộ Đề Thi HSK</span>
              </h3>
              <button
                type="button"
                onClick={() => setShareModalExam(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 mb-4">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                {formatLevelLabel(shareModalExam.hskLevel)}
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-2">
                {shareModalExam.title}
              </h4>
            </div>

            {qrCodeDataUrl ? (
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto mb-3">
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code ${shareModalExam.title}`}
                  className="w-44 h-44 mx-auto"
                />
              </div>
            ) : (
              <div className="w-44 h-44 bg-slate-100 animate-pulse rounded-2xl mx-auto mb-3 flex items-center justify-center text-slate-400">
                <QrCode size={28} />
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Quét bằng Camera điện thoại hoặc Zalo để mở đề thi, nghe file Audio MP3 và làm bài lập tức.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyLink(shareModalExam)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Copy size={13} />
                <span>Sao chép link</span>
              </button>

              {qrCodeDataUrl && (
                <a
                  href={qrCodeDataUrl}
                  download={`HSK_Exam_${shareModalExam.id}.png`}
                  className="px-3 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download size={13} />
                  <span>Tải ảnh</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
