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
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamItem, ExamHskLevel } from '@/types/exam';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NotificationBell } from '@/components/layout/NotificationBell';

const LEVEL_THEMES: Record<
  string,
  {
    badge: string;
    pillActive: string;
    border: string;
    bgSoft: string;
    accent: string;
    label: string;
    words: string;
    desc: string;
  }
> = {
  '1': {
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    pillActive: 'bg-emerald-600 text-white shadow-emerald-600/30 shadow-sm ring-2 ring-emerald-500/20',
    border: 'hover:border-emerald-400 dark:hover:border-emerald-700',
    bgSoft: 'bg-emerald-500/5',
    accent: 'text-emerald-600 dark:text-emerald-400',
    label: 'HSK 1',
    words: '300 từ',
    desc: 'Cơ bản khởi đầu',
  },
  '2': {
    badge: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    pillActive: 'bg-cyan-600 text-white shadow-cyan-600/30 shadow-sm ring-2 ring-cyan-500/20',
    border: 'hover:border-cyan-400 dark:hover:border-cyan-700',
    bgSoft: 'bg-cyan-500/5',
    accent: 'text-cyan-600 dark:text-cyan-400',
    label: 'HSK 2',
    words: '600 từ',
    desc: 'Giao tiếp thông dụng',
  },
  '3': {
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    pillActive: 'bg-amber-600 text-white shadow-amber-600/30 shadow-sm ring-2 ring-amber-500/20',
    border: 'hover:border-amber-400 dark:hover:border-amber-700',
    bgSoft: 'bg-amber-500/5',
    accent: 'text-amber-600 dark:text-amber-400',
    label: 'HSK 3',
    words: '1.000 từ',
    desc: 'Trung cấp nền tảng',
  },
  '4': {
    badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    pillActive: 'bg-blue-600 text-white shadow-blue-600/30 shadow-sm ring-2 ring-blue-500/20',
    border: 'hover:border-blue-400 dark:hover:border-blue-700',
    bgSoft: 'bg-blue-500/5',
    accent: 'text-blue-600 dark:text-blue-400',
    label: 'HSK 4',
    words: '1.200 từ',
    desc: 'Du học & Công việc',
  },
  '5': {
    badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    pillActive: 'bg-purple-600 text-white shadow-purple-600/30 shadow-sm ring-2 ring-purple-500/20',
    border: 'hover:border-purple-400 dark:hover:border-purple-700',
    bgSoft: 'bg-purple-500/5',
    accent: 'text-purple-600 dark:text-purple-400',
    label: 'HSK 5',
    words: '2.500 từ',
    desc: 'Đọc báo, xem phim',
  },
  '6': {
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    pillActive: 'bg-rose-600 text-white shadow-rose-600/30 shadow-sm ring-2 ring-rose-500/20',
    border: 'hover:border-rose-400 dark:hover:border-rose-700',
    bgSoft: 'bg-rose-500/5',
    accent: 'text-rose-600 dark:text-rose-400',
    label: 'HSK 6',
    words: '5.000 từ',
    desc: 'Học thuật đỉnh cao',
  },
  HSKK: {
    badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    pillActive: 'bg-indigo-600 text-white shadow-indigo-600/30 shadow-sm ring-2 ring-indigo-500/20',
    border: 'hover:border-indigo-400 dark:hover:border-indigo-700',
    bgSoft: 'bg-indigo-500/5',
    accent: 'text-indigo-600 dark:text-indigo-400',
    label: 'HSKK',
    words: 'Khẩu ngữ',
    desc: 'Kỳ thi nói chuẩn hóa',
  },
};

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
      fetch('/api/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exam.id, action: 'increment', type: 'view' }),
      }).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const handleSpeedChange = () => {
    const rates = [0.8, 1.0, 1.2, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Open resource (PDF, answer)
  const handleOpenResource = (exam: ExamItem, url?: string, label?: string) => {
    if (!url) {
      toast.warning(`Tài liệu ${label || ''} đang được cập nhật.`);
      return;
    }
    fetch('/api/exams', {
      method: 'PATCH',
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
    const copyText = `📚 Luyện Thi HSK: ${exam.title} (HSK ${exam.hskLevel} • Kèm file nghe MP3 & Đáp án chi tiết) 👉 ${shareUrl}`;
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
        const la = typeof a.hskLevel === 'number' ? a.hskLevel : 7;
        const lb = typeof b.hskLevel === 'number' ? b.hskLevel : 7;
        return la - lb;
      }
      if (sortBy === 'level_desc') {
        const la = typeof a.hskLevel === 'number' ? a.hskLevel : 7;
        const lb = typeof b.hskLevel === 'number' ? b.hskLevel : 7;
        return lb - la;
      }
      if (sortBy === 'views') {
        return (b.viewsCount || 0) + (b.downloadsCount || 0) - ((a.viewsCount || 0) + (a.downloadsCount || 0));
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res;
  }, [exams, selectedLevel, selectedCategory, search, sortBy]);

  // Level statistics
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: exams.length };
    exams.forEach((e) => {
      const key = String(e.hskLevel);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [exams]);

  const totalAudioCount = useMemo(() => exams.filter((e) => e.audioUrl).length, [exams]);
  const totalOfficialCount = useMemo(() => exams.filter((e) => e.category === 'official').length, [exams]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 flex flex-col selection:bg-emerald-500/20">
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-8 py-3 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Back button & Brand */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all btn-press shadow-2xs"
            >
              <ArrowLeft size={15} />
              <span>Bàn học</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 dark:border-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <GraduationCap size={18} />
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                  HSK Master
                </span>
                <span className="text-xs text-slate-400 font-medium ml-2">
                  / Kho Đề Thi Tuyển Chọn
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Dạng thẻ lưới"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
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
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Chuyển chế độ Sáng / Tối"
            >
              {effectiveTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Admin shortcut if admin */}
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

      {/* 2. Hero Header Section */}
      <section className="bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-black border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-8 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          {/* Headline & Badges */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold mb-4">
              <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Kho Tài Liệu Luyện Thi HSK Chuẩn Quốc Tế</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Kho Đề Thi HSK Tuyển Chọn & Đề Thử BLCU
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
              Tuyển tập các bộ đề thi thật HSK 1 – 6 chính thức (Hanban / CTI) cùng các bộ đề mô phỏng chuẩn ma trận đề thi mới từ Đại học Ngôn ngữ Bắc Kinh (BLCU). Đầy đủ file nghe Audio MP3 tốc độ chuẩn và bảng đáp án giải thích chi tiết.
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 mt-5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
                <BookOpen size={14} className="text-emerald-600" />
                <span>{exams.length} bộ đề trong kho</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
                <Award size={14} className="text-blue-600" />
                <span>{totalOfficialCount} đề thi thật chính thức</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
                <Headphones size={14} className="text-amber-600" />
                <span>{totalAudioCount} đề kèm Audio MP3 trực tiếp</span>
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="mt-8 max-w-2xl relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đề thi theo cấp độ HSK, năm phát hành, đơn vị ra đề (vd: HSK 4, BLCU 2024)..."
              className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Level Tabs (HSK 1 - 6 & HSKK) */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedLevel('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                selectedLevel === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span>Tất cả cấp độ</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-slate-200/60 dark:bg-zinc-700">
                {exams.length}
              </span>
            </button>

            {[
              { id: '1', label: 'HSK 1', sub: '300 từ' },
              { id: '2', label: 'HSK 2', sub: '600 từ' },
              { id: '3', label: 'HSK 3', sub: '1.000 từ' },
              { id: '4', label: 'HSK 4', sub: '1.200 từ' },
              { id: '5', label: 'HSK 5', sub: '2.500 từ' },
              { id: '6', label: 'HSK 6', sub: '5.000 từ' },
              { id: 'HSKK', label: 'HSKK', sub: 'Khẩu ngữ' },
            ].map((lvl) => {
              const isActive = selectedLevel === lvl.id;
              const count = levelCounts[lvl.id] || 0;
              const theme = LEVEL_THEMES[lvl.id];

              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border btn-press ${
                    isActive
                      ? theme?.pillActive || 'bg-slate-900 text-white'
                      : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-left">
                    <span className="font-bold">{lvl.label}</span>
                  </div>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-white/20 text-white'
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
        </div>
      </section>

      {/* 3. Filter Toolbar & Results */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex-1">
        {/* Sub-toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6 border-b border-slate-200/80 dark:border-zinc-800/80">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả tài liệu' },
              { id: 'official', label: 'Đề thi thật (Hanban/CTI)', icon: Award },
              { id: 'mock', label: 'Đề thi thử (BLCU)', icon: BookOpen },
              { id: 'audio', label: `Kèm Audio MP3 (${totalAudioCount})`, icon: Headphones },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sorter */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
              Sắp xếp theo:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs outline-none"
            >
              <option value="newest">Mới cập nhật</option>
              <option value="level_asc">Cấp độ HSK: 1 → 6</option>
              <option value="level_desc">Cấp độ HSK: 6 → 1</option>
              <option value="views">Lượt xem & tải nhiều</option>
            </select>
          </div>
        </div>

        {/* Exam Cards Grid or List */}
        <div className="pt-6">
          {loading && exams.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw size={28} className="animate-spin text-emerald-600 mb-3" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Đang nạp kho tài liệu đề thi HSK...
              </p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center mb-4">
                <BookOpen size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {exams.length === 0 ? 'Kho đề thi hiện đang trống' : 'Chưa tìm thấy đề thi phù hợp'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {exams.length === 0
                  ? 'Toàn bộ đề thi đã được xóa sạch. Admin có thể vào trang Quản trị để đăng tải các bộ đề thi mới hoặc nạp lại bộ đề mẫu khi cần.'
                  : 'Không có bộ đề nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại của bạn.'}
              </p>
              {exams.length === 0 && user?.role === 'admin' ? (
                <Link
                  href="/admin"
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer btn-press"
                >
                  <Shield size={14} />
                  <span>Đi đến Quản lý đề thi (Admin)</span>
                </Link>
              ) : (selectedLevel !== 'all' || selectedCategory !== 'all' || search) && (
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
            /* GRID VIEW (3 Columns on large screens) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-28">
              {filteredExams.map((exam) => {
                const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
                const theme = LEVEL_THEMES[String(exam.hskLevel)] || LEVEL_THEMES['1'];

                return (
                  <div
                    key={exam.id}
                    className={`bg-white dark:bg-zinc-900 rounded-3xl border transition-all duration-300 flex flex-col justify-between group shadow-2xs hover:shadow-lg relative overflow-hidden ${
                      exam.isPinned
                        ? 'border-amber-300 dark:border-amber-700/80 ring-1 ring-amber-300/40 dark:ring-amber-800/30'
                        : 'border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Top Tint Bar */}
                    <div className={`h-1.5 w-full ${exam.isPinned ? 'bg-amber-400' : 'bg-transparent'}`} />

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      {/* Top Meta Header */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Level Badge */}
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-xl border tracking-wide shadow-2xs ${theme.badge}`}
                            >
                              HSK {exam.hskLevel}
                            </span>

                            {/* Category Badge */}
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-zinc-700">
                              {exam.category === 'official' ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Đề thi thật</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>Đề thi thử</span>
                                </>
                              )}
                            </span>

                            {/* Year */}
                            {exam.year && (
                              <span className="text-[10.5px] font-bold text-slate-400 font-mono">
                                {exam.year}
                              </span>
                            )}

                            {/* Featured Pin */}
                            {exam.isPinned && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                <Sparkles size={11} className="fill-amber-500 text-amber-500" /> Tuyển chọn
                              </span>
                            )}
                          </div>

                          {/* Share button */}
                          <button
                            type="button"
                            onClick={() => handleOpenShare(exam)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                            title="Chia sẻ link & Mã QR"
                          >
                            <Share2 size={15} />
                          </button>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {exam.title}
                        </h3>

                        {/* Specs Chips */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80">
                          {exam.durationMinutes && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <Clock size={12} className="text-slate-400" />
                              <span>{exam.durationMinutes} phút</span>
                            </span>
                          )}
                          {exam.questionCount && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <FileText size={12} className="text-slate-400" />
                              <span>{exam.questionCount} câu</span>
                            </span>
                          )}
                          {exam.source && (
                            <span className="text-slate-400 truncate max-w-[160px]" title={exam.source}>
                              🏛️ {exam.source}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {exam.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                            {exam.description}
                          </p>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                        {/* Audio Button */}
                        {exam.audioUrl ? (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(exam)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs btn-press ${
                              isCurrentPlaying
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
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
                                <Headphones size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Nghe Audio</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa có file nghe</span>
                        )}

                        {/* Documents */}
                        <div className="flex items-center gap-1.5">
                          {exam.pdfUrl && (
                            <button
                              type="button"
                              onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                              className="flex items-center gap-1 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs btn-press"
                              title="Tải file đề thi PDF A4 chuẩn"
                            >
                              <Download size={13} />
                              <span>Đề PDF</span>
                            </button>
                          )}

                          {exam.answerUrl && (
                            <button
                              type="button"
                              onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                              className="flex items-center gap-1 px-2.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-zinc-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors btn-press"
                              title="Xem đáp án và giải thích"
                            >
                              <KeyRound size={13} />
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
            /* COMPACT LIST VIEW */
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80 shadow-2xs overflow-hidden pb-24">
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
                        className={`text-xs font-black px-3 py-1.5 rounded-xl border shrink-0 text-center min-w-[64px] ${theme.badge}`}
                      >
                        HSK {exam.hskLevel}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                            {exam.title}
                          </h4>
                          {exam.isPinned && (
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 shrink-0">
                              Nổi bật
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {exam.category === 'official' ? 'Đề thi thật Hanban' : 'Đề thi thử BLCU'}
                          </span>
                          {exam.year && <span>• Năm {exam.year}</span>}
                          {exam.durationMinutes && <span>• {exam.durationMinutes} phút</span>}
                          {exam.questionCount && <span>• {exam.questionCount} câu</span>}
                          {exam.source && <span className="truncate max-w-[180px]">• {exam.source}</span>}
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
                          {isCurrentPlaying ? <Pause size={13} /> : <Headphones size={13} />}
                          <span>{isCurrentPlaying ? 'Tạm dừng' : 'Nghe MP3'}</span>
                        </button>
                      )}

                      {exam.pdfUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
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

      {/* 4. Sticky Floating Audio Player Bar */}
      {activeAudioExam && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 dark:bg-black/95 backdrop-blur-md text-white border-t border-slate-800/80 px-4 sm:px-8 py-3.5 shadow-2xl animate-slideUp">
          <audio ref={audioRef} />

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Track Info */}
            <div className="flex items-center gap-3 min-w-0 w-full md:w-auto md:max-w-sm">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Headphones size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold truncate text-white">
                  {activeAudioExam.title}
                </div>
                <div className="text-[11px] text-emerald-400/90 flex items-center gap-1.5 font-mono">
                  <span>HSK {activeAudioExam.hskLevel} (Phần nghe)</span>
                  <span>•</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
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
                className="w-28 sm:w-64 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
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

      {/* 5. Share Modal with QR Code */}
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
                HSK {shareModalExam.hskLevel}
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
