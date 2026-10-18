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
  Pin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  Headphones,
  Award,
  Layers,
  LayoutGrid,
  List,
  Flame,
  Sun,
  Moon,
  Shield,
  Eye,
  RefreshCw,
  X,
  SlidersHorizontal,
  Bookmark,
  Check,
  TrendingUp,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamItem, ExamHskLevel } from '@/types/exam';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NotificationBell } from '@/components/layout/NotificationBell';

// Level Theme Config with Modern Color Palettes
interface LevelTheme {
  label: string;
  sub: string;
  badge: string;
  cardBanner: string;
  pillActive: string;
  pillInactive: string;
  accentText: string;
  kanjiWatermark: string;
}

const LEVEL_THEMES: Record<string, LevelTheme> = {
  '1': {
    label: 'HSK 1',
    sub: '300 từ',
    badge: 'bg-emerald-500 text-white',
    cardBanner: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    pillActive: 'bg-emerald-600 text-white shadow-emerald-500/30 shadow-md ring-2 ring-emerald-500/30',
    pillInactive: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/80',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    kanjiWatermark: '一',
  },
  '2': {
    label: 'HSK 2',
    sub: '600 từ',
    badge: 'bg-teal-500 text-white',
    cardBanner: 'from-teal-500/20 via-teal-500/5 to-transparent',
    pillActive: 'bg-teal-600 text-white shadow-teal-500/30 shadow-md ring-2 ring-teal-500/30',
    pillInactive: 'bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80',
    accentText: 'text-teal-600 dark:text-teal-400',
    kanjiWatermark: '二',
  },
  '3': {
    label: 'HSK 3',
    sub: '1.000 từ',
    badge: 'bg-blue-500 text-white',
    cardBanner: 'from-blue-500/20 via-blue-500/5 to-transparent',
    pillActive: 'bg-blue-600 text-white shadow-blue-500/30 shadow-md ring-2 ring-blue-500/30',
    pillInactive: 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100/80',
    accentText: 'text-blue-600 dark:text-blue-400',
    kanjiWatermark: '三',
  },
  '4': {
    label: 'HSK 4',
    sub: '1.200 từ',
    badge: 'bg-indigo-500 text-white',
    cardBanner: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
    pillActive: 'bg-indigo-600 text-white shadow-indigo-500/30 shadow-md ring-2 ring-indigo-500/30',
    pillInactive: 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100/80',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    kanjiWatermark: '四',
  },
  '5': {
    label: 'HSK 5',
    sub: '2.500 từ',
    badge: 'bg-purple-500 text-white',
    cardBanner: 'from-purple-500/20 via-purple-500/5 to-transparent',
    pillActive: 'bg-purple-600 text-white shadow-purple-500/30 shadow-md ring-2 ring-purple-500/30',
    pillInactive: 'bg-purple-50/70 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-100/80',
    accentText: 'text-purple-600 dark:text-purple-400',
    kanjiWatermark: '五',
  },
  '6': {
    label: 'HSK 6',
    sub: '5.000 từ',
    badge: 'bg-rose-500 text-white',
    cardBanner: 'from-rose-500/20 via-rose-500/5 to-transparent',
    pillActive: 'bg-rose-600 text-white shadow-rose-500/30 shadow-md ring-2 ring-rose-500/30',
    pillInactive: 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-100/80',
    accentText: 'text-rose-600 dark:text-rose-400',
    kanjiWatermark: '六',
  },
  '7': {
    label: 'HSK 7-9',
    sub: 'Cao cấp',
    badge: 'bg-amber-500 text-white',
    cardBanner: 'from-amber-500/20 via-amber-500/5 to-transparent',
    pillActive: 'bg-amber-600 text-white shadow-amber-500/30 shadow-md ring-2 ring-amber-500/30',
    pillInactive: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100/80',
    accentText: 'text-amber-600 dark:text-amber-400',
    kanjiWatermark: '七',
  },
  '7-9': {
    label: 'HSK 7-9',
    sub: 'Cao cấp',
    badge: 'bg-amber-500 text-white',
    cardBanner: 'from-amber-500/20 via-amber-500/5 to-transparent',
    pillActive: 'bg-amber-600 text-white shadow-amber-500/30 shadow-md ring-2 ring-amber-500/30',
    pillInactive: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100/80',
    accentText: 'text-amber-600 dark:text-amber-400',
    kanjiWatermark: '七',
  },
  HSKK: {
    label: 'HSKK',
    sub: 'Khẩu ngữ',
    badge: 'bg-violet-600 text-white',
    cardBanner: 'from-violet-500/20 via-violet-500/5 to-transparent',
    pillActive: 'bg-violet-600 text-white shadow-violet-500/30 shadow-md ring-2 ring-violet-500/30',
    pillInactive: 'bg-violet-50/70 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/60 hover:bg-violet-100/80',
    accentText: 'text-violet-600 dark:text-violet-400',
    kanjiWatermark: '口',
  },
};

function formatLevelLabel(lvl: ExamHskLevel | string | number | undefined): string {
  if (!lvl) return '';
  if (lvl === 'HSKK') return 'HSKK';
  if (lvl === 7 || lvl === '7' || lvl === '7-9') return 'HSK 7-9';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Audio listeners
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
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
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

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Open PDF / Answer
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
          dark: '#0f172a',
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
        return (b.viewsCount + b.downloadsCount) - (a.viewsCount + a.downloadsCount);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return res;
  }, [exams, selectedLevel, selectedCategory, search, sortBy]);

  // Counts for tabs
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Sleek Floating Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs btn-press"
              title="Quay lại bàn học từ vựng"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Bàn học</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <GraduationCap size={18} />
              </div>
              <div className="leading-tight">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  HSK Master <span className="text-slate-400 font-normal text-xs hidden sm:inline">/ Kho Đề Tuyển Chọn</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dạng lưới thẻ"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dạng danh sách gọn"
              >
                <List size={15} />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 transition-all"
              title="Chuyển chế độ sáng/tối"
            >
              {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Admin Link */}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all"
              >
                <Shield size={13} />
                <span>Quản trị kho</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Modern Hero Section with Chinese Calligraphy Watermark */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-slate-100/80 dark:from-zinc-950 dark:via-zinc-950/80 dark:to-black border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-8 pt-10 pb-12">
        {/* Subtle Decorative Calligraphy Watermark */}
        <div className="absolute right-4 top-2 select-none pointer-events-none text-[120px] sm:text-[180px] font-black tracking-widest text-slate-900/[0.025] dark:text-white/[0.03] leading-none">
          汉语水平
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent dark:from-emerald-950/60 dark:via-teal-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-black mb-4 shadow-2xs">
              <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>Kho Tài Liệu Luyện Thi HSK Chuẩn Quốc Tế</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Kho Đề Thi HSK Tuyển Chọn <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                & Đề Thử Ma Trận BLCU
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-3.5 leading-relaxed font-normal">
              Tuyển tập trọn bộ các đề thi thật chính thức (CTI / Hanban) và chuỗi đề thi mô phỏng từ Đại học Ngôn ngữ Bắc Kinh (BLCU). Đầy đủ bản in A4 sắc nét, file nghe Audio MP3 phòng thi và đáp án chi tiết.
            </p>

            {/* 4 Sleek Glassmorphic Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-6">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200/90 dark:border-zinc-800/90 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-lg sm:text-xl">
                  <BookOpen size={18} />
                  <span>{exams.length}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Bộ đề trong kho</div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200/90 dark:border-zinc-800/90 shadow-2xs">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-lg sm:text-xl">
                  <Award size={18} />
                  <span>{totalOfficialCount}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Đề thi thật CTI</div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200/90 dark:border-zinc-800/90 shadow-2xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-lg sm:text-xl">
                  <Headphones size={18} />
                  <span>{totalAudioCount}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Kèm Audio MP3</div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200/90 dark:border-zinc-800/90 shadow-2xs">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-lg sm:text-xl">
                  <CheckCircle2 size={18} />
                  <span>100%</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Đề thật có đáp án</div>
              </div>
            </div>
          </div>

          {/* Elevated Search Bar */}
          <div className="mt-8 max-w-3xl">
            <div className="relative group">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm đề thi theo mã đề, cấp độ HSK, BLCU, TOCFL, Khối D4..."
                className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-zinc-900 text-sm font-semibold rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick search tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[11px]">Gợi ý tìm nhanh:</span>
              {[
                { label: 'HSK 3 BLCUP', query: 'BLCUP HSK 3' },
                { label: 'HSK 5 Hanban', query: 'HSK 5' },
                { label: 'HSK 6', query: 'HSK 6' },
                { label: 'HSK 7–9 Cao cấp', query: 'HSK 7–9' },
                { label: 'HSKK Khẩu ngữ', query: 'HSKK' },
                { label: 'THPT Khối D4', query: 'D4' },
                { label: 'BCT Thương mại', query: 'BCT' },
              ].map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => setSearch(tag.query)}
                  className="px-2.5 py-0.5 rounded-lg bg-white/70 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Level Filter Tabs (Colorful & Tactile) */}
      <section className="sticky top-16 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 py-3 px-4 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {/* All Levels */}
            <button
              type="button"
              onClick={() => setSelectedLevel('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border btn-press ${
                selectedLevel === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-transparent shadow-md'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>Tất cả</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200/70 dark:bg-zinc-700">
                {exams.length}
              </span>
            </button>

            {/* Individual HSK Levels */}
            {[
              { id: '1', label: 'HSK 1', sub: '300 từ' },
              { id: '2', label: 'HSK 2', sub: '600 từ' },
              { id: '3', label: 'HSK 3', sub: '1.000 từ' },
              { id: '4', label: 'HSK 4', sub: '1.200 từ' },
              { id: '5', label: 'HSK 5', sub: '2.500 từ' },
              { id: '6', label: 'HSK 6', sub: '5.000 từ' },
              { id: '7', label: 'HSK 7-9', sub: 'Cao cấp' },
              { id: 'HSKK', label: 'HSKK', sub: 'Khẩu ngữ' },
            ].map((lvl) => {
              const isActive = selectedLevel === lvl.id;
              const count = levelCounts[lvl.id] || 0;
              const theme = LEVEL_THEMES[lvl.id] || LEVEL_THEMES['1'];

              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border btn-press ${
                    isActive ? theme.pillActive : theme.pillInactive
                  }`}
                >
                  <span className="font-extrabold">{lvl.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Counter */}
          <div className="hidden lg:block text-xs font-semibold text-slate-400 dark:text-zinc-500 whitespace-nowrap">
            Hiển thị <span className="text-slate-800 dark:text-zinc-200 font-bold">{filteredExams.length}</span> bộ đề
          </div>
        </div>
      </section>

      {/* 4. Secondary Filter Toolbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-200/70 dark:border-zinc-800/70">
          {/* Categories Pill Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Tất cả tài liệu' },
              { id: 'official', label: '🏛️ Đề thi thật (Hanban/CTI)' },
              { id: 'mock', label: '📘 Đề thi thử (BLCU)' },
              { id: 'audio', label: `🎧 Có Audio MP3 (${totalAudioCount})` },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold hidden sm:inline">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="newest">Mới cập nhật</option>
              <option value="level_asc">Cấp độ HSK: 1 → 6</option>
              <option value="level_desc">Cấp độ HSK: 6 → 1</option>
              <option value="views">Lượt xem & tải nhiều nhất</option>
            </select>
          </div>
        </div>

        {/* 5. Exam Cards Container */}
        <div className="pt-6">
          {loading && exams.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw size={28} className="animate-spin text-emerald-600 mb-3" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Đang nạp kho tài liệu đề thi HSK...
              </p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center mb-4">
                <BookOpen size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {exams.length === 0 ? 'Kho đề thi hiện đang trống' : 'Chưa tìm thấy đề thi phù hợp'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {exams.length === 0
                  ? 'Toàn bộ đề thi đã được xóa sạch. Admin có thể nạp lại bộ đề chuẩn khi cần.'
                  : 'Không có bộ đề nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại của bạn.'}
              </p>
              {(selectedLevel !== 'all' || selectedCategory !== 'all' || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLevel('all');
                    setSelectedCategory('all');
                    setSearch('');
                  }}
                  className="mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Xóa bộ lọc & Xem tất cả đề
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ========================================================================= */
            /* REDESIGNED GRID VIEW: ELEGANT OFFICIAL EXAM TEST BOOKLETS                 */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
                const theme = LEVEL_THEMES[String(exam.hskLevel)] || LEVEL_THEMES['1'];

                return (
                  <div
                    key={exam.id}
                    className="group relative bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top Decorative Gradient Banner & Watermark */}
                    <div
                      className={`relative px-5 pt-4 pb-3 bg-gradient-to-r ${theme.cardBanner} border-b border-slate-100 dark:border-zinc-800/70 overflow-hidden`}
                    >
                      {/* Chinese Kanji Watermark in Banner */}
                      <span className="absolute -right-1 -bottom-3 select-none pointer-events-none text-6xl font-black text-slate-900/[0.04] dark:text-white/[0.05]">
                        {theme.kanjiWatermark}
                      </span>

                      {/* Top Badges Row */}
                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Level Badge */}
                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-xl tracking-wider shadow-xs ${theme.badge}`}
                          >
                            {formatLevelLabel(exam.hskLevel)}
                          </span>

                          {/* Category Tag */}
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white/90 dark:bg-zinc-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                            {exam.category === 'official' ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Chính thức</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span>Đề thử</span>
                              </>
                            )}
                          </span>

                          {/* Year */}
                          {exam.year && (
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                              {exam.year}
                            </span>
                          )}
                        </div>

                        {/* Top Right: Pinned Badge & Share */}
                        <div className="flex items-center gap-1">
                          {exam.isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              <Sparkles size={11} className="fill-amber-500 text-amber-500" />
                              <span>Tuyển chọn</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenShare(exam)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                            title="Chia sẻ link & Mã QR"
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title */}
                        <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {exam.title}
                        </h3>

                        {/* Specs Pill Row */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                          {exam.durationMinutes && (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Clock size={12} className="text-slate-400" />
                              <span>{exam.durationMinutes} phút</span>
                            </span>
                          )}

                          {exam.questionCount && (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <FileText size={12} className="text-slate-400" />
                              <span>{exam.questionCount} câu</span>
                            </span>
                          )}

                          {exam.audioUrl && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Headphones size={12} />
                              <span>Có Audio</span>
                            </span>
                          )}
                        </div>

                        {/* Source Label */}
                        {exam.source && (
                          <div className="text-[11.5px] text-slate-400 dark:text-zinc-500 mt-2 truncate">
                            🏛️ {exam.source}
                          </div>
                        )}

                        {/* Description */}
                        {exam.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                            {exam.description}
                          </p>
                        )}
                      </div>

                      {/* Card Action Bar */}
                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                        {/* Audio Button */}
                        {exam.audioUrl ? (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(exam)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs btn-press ${
                              isCurrentPlaying
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/90 border border-emerald-200 dark:border-emerald-800/60'
                            }`}
                          >
                            {isCurrentPlaying ? (
                              <>
                                <div className="flex items-center gap-0.5 h-3">
                                  <span className="w-0.5 h-full bg-white animate-bounce" />
                                  <span className="w-0.5 h-2/3 bg-white animate-bounce delay-75" />
                                  <span className="w-0.5 h-full bg-white animate-bounce delay-150" />
                                </div>
                                <span>Đang nghe</span>
                              </>
                            ) : (
                              <>
                                <Play size={12} className="fill-current" />
                                <span>Nghe Audio</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Chỉ có đề đọc</span>
                        )}

                        {/* PDF & Answer Buttons */}
                        <div className="flex items-center gap-1.5">
                          {exam.pdfUrl && (
                            <button
                              type="button"
                              onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                              className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs btn-press"
                              title="Tải hoặc xem đề thi PDF A4"
                            >
                              <Download size={12} />
                              <span>Đề PDF</span>
                            </button>
                          )}

                          {exam.answerUrl && (
                            <button
                              type="button"
                              onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                              className="inline-flex items-center gap-1 px-2.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-zinc-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors btn-press"
                              title="Xem bảng đáp án đối chiếu"
                            >
                              <KeyRound size={12} />
                              <span>Đáp án</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* REDESIGNED LIST VIEW: CLEAN & HIGH-DENSITY TABLE ROWS                     */
            /* ========================================================================= */
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80 shadow-sm overflow-hidden">
              {filteredExams.map((exam) => {
                const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
                const theme = LEVEL_THEMES[String(exam.hskLevel)] || LEVEL_THEMES['1'];

                return (
                  <div
                    key={exam.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <span
                        className={`text-xs font-black px-3 py-1.5 rounded-xl border shrink-0 text-center min-w-[70px] shadow-2xs ${theme.badge}`}
                      >
                        {formatLevelLabel(exam.hskLevel)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                            {exam.title}
                          </h4>
                          {exam.isPinned && (
                            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.2 rounded-md border border-amber-500/30 shrink-0">
                              Tuyển chọn
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {exam.category === 'official' ? '🏛️ Đề thi thật CTI' : '📘 Đề thi thử BLCU'}
                          </span>
                          {exam.year && <span>• Năm {exam.year}</span>}
                          {exam.durationMinutes && <span>• {exam.durationMinutes} phút</span>}
                          {exam.questionCount && <span>• {exam.questionCount} câu</span>}
                          {exam.source && <span className="truncate max-w-[200px]">• {exam.source}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {exam.audioUrl && (
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(exam)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            isCurrentPlaying
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60'
                          }`}
                        >
                          {isCurrentPlaying ? <Pause size={13} /> : <Play size={13} className="fill-current" />}
                          <span>{isCurrentPlaying ? 'Tạm dừng' : 'Nghe MP3'}</span>
                        </button>
                      )}

                      {exam.pdfUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                          title="Tải PDF"
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                      )}

                      {exam.answerUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                          title="Xem đáp án"
                        >
                          <KeyRound size={13} />
                          <span>Đáp án</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenShare(exam)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                        title="Chia sẻ"
                      >
                        <Share2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Sticky Floating Audio Player Bar (Glassmorphic) */}
      {activeAudioExam && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 dark:bg-black/90 backdrop-blur-xl text-white border-t border-white/10 px-4 sm:px-8 py-3.5 shadow-2xl animate-slideUp">
          <audio ref={audioRef} />

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Track Info */}
            <div className="flex items-center gap-3 min-w-0 w-full md:w-auto md:max-w-md">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shrink-0 shadow-md shadow-emerald-500/20">
                <Headphones size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold truncate text-white">
                  {activeAudioExam.title}
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-2 font-mono">
                  <span>{formatLevelLabel(activeAudioExam.hskLevel)}</span>
                  <span>•</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  {activeAudioExam.pdfUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenResource(activeAudioExam, activeAudioExam.pdfUrl, 'Đề thi PDF')}
                      className="underline text-slate-300 hover:text-white cursor-pointer ml-1"
                    >
                      Mở đề PDF
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Central Controls */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={() => handleSkip(-10)}
                className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors"
                title="Lùi 10 giây"
              >
                <RotateCcw size={17} />
              </button>

              <button
                type="button"
                onClick={() => togglePlayAudio(activeAudioExam)}
                className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold hover:scale-105 cursor-pointer transition-transform shadow-lg shadow-emerald-500/30"
              >
                {isPlaying ? (
                  <Pause size={18} className="fill-slate-950" />
                ) : (
                  <Play size={18} className="fill-slate-950 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(10)}
                className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors"
                title="Tua tới 10 giây"
              >
                <RotateCw size={17} />
              </button>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-28 sm:w-60 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              {/* Speed Selector */}
              <button
                type="button"
                onClick={handleSpeedChange}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer transition-colors"
                title="Tốc độ phát audio"
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
                className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer ml-1"
                title="Đóng trình phát"
              >
                <X size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Share Modal with QR Code */}
      {shareModalExam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 max-w-sm w-full p-6 text-center animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 size={16} className="text-emerald-600" />
                <span>Chia Sẻ Bộ Đề Thi HSK</span>
              </h3>
              <button
                type="button"
                onClick={() => setShareModalExam(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 mb-4">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                {formatLevelLabel(shareModalExam.hskLevel)}
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-2">
                {shareModalExam.title}
              </h4>
            </div>

            {qrCodeDataUrl ? (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto mb-3">
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code ${shareModalExam.title}`}
                  className="w-48 h-48 mx-auto"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-2xl mx-auto mb-3 flex items-center justify-center text-slate-400">
                <QrCode size={32} />
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Quét bằng Camera điện thoại hoặc Zalo để mở đề thi, nghe audio MP3 và tải file PDF lập tức.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyLink(shareModalExam)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs btn-press"
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
                  <span>Lưu ảnh</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
