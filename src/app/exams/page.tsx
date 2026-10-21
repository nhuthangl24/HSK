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
  FileSpreadsheet,
  Compass,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamItem, ExamHskLevel } from '@/types/exam';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NotificationBell } from '@/components/layout/NotificationBell';

// -------------------------------------------------------------
// Academic Level System Badges
// -------------------------------------------------------------
interface AcademicLevelBadge {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

const ACADEMIC_LEVEL_CONFIG: Record<string, AcademicLevelBadge> = {
  '1': {
    label: 'HSK 1',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60',
    badgeText: 'text-sky-800 dark:text-sky-300',
    badgeBorder: 'border-sky-200 dark:border-sky-800/80',
    dotColor: 'bg-sky-600 dark:bg-sky-400',
  },
  '2': {
    label: 'HSK 2',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/60',
    badgeText: 'text-teal-800 dark:text-teal-300',
    badgeBorder: 'border-teal-200 dark:border-teal-800/80',
    dotColor: 'bg-teal-600 dark:bg-teal-400',
  },
  '3': {
    label: 'HSK 3',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/80',
    dotColor: 'bg-emerald-600 dark:bg-emerald-400',
  },
  '4': {
    label: 'HSK 4',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-800 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800/80',
    dotColor: 'bg-blue-600 dark:bg-blue-400',
  },
  '5': {
    label: 'HSK 5',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800/80',
    dotColor: 'bg-indigo-600 dark:bg-indigo-400',
  },
  '6': {
    label: 'HSK 6',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800/80',
    dotColor: 'bg-purple-600 dark:bg-purple-400',
  },
  '7': {
    label: 'HSK 7–9',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/80',
    dotColor: 'bg-amber-600 dark:bg-amber-400',
  },
  '7-9': {
    label: 'HSK 7–9',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/80',
    dotColor: 'bg-amber-600 dark:bg-amber-400',
  },
  HSKK: {
    label: 'HSKK',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800/80',
    dotColor: 'bg-rose-600 dark:bg-rose-400',
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

  // -------------------------------------------------------------
  // Application Data State
  // -------------------------------------------------------------
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filtering States
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'official' | 'mock'>('all');
  const [onlyAudio, setOnlyAudio] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'level_asc' | 'level_desc' | 'duration' | 'views'>('newest');
  const [viewMode, setViewMode] = useState<'catalog' | 'cards'>('catalog');

  // Audio Player State
  const [activeAudioExam, setActiveAudioExam] = useState<ExamItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Focused Exam Reading Room / Detail State
  const [activeExamDetail, setActiveExamDetail] = useState<{
    exam: ExamItem;
    activeTab: 'pdf' | 'answer';
  } | null>(null);

  // Share QR Modal State
  const [shareModalExam, setShareModalExam] = useState<ExamItem | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
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
        toast.error('Không thể nạp dữ liệu đề thi từ máy chủ.');
      }
    } catch {
      toast.error('Lỗi mạng khi tải kho đề thi.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Handle URL Query (?id=xxx to auto-open specific exam)
  useEffect(() => {
    if (typeof window !== 'undefined' && exams.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id');
      if (targetId) {
        const found = exams.find((e) => e.id === targetId);
        if (found) {
          setActiveExamDetail({
            exam: found,
            activeTab: 'pdf',
          });
        }
      }
    }
  }, [exams]);

  // -------------------------------------------------------------
  // Audio Player Engine
  // -------------------------------------------------------------
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

  const handleSpeedCycle = () => {
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

  // Direct Download Engine
  const handleDownloadFile = (exam: ExamItem, url?: string, customFilename?: string) => {
    if (!url) {
      toast.error('Tài liệu này hiện chưa có file đính kèm.');
      return;
    }

    fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: exam.id, action: 'increment', type: 'download' }),
    }).catch(() => {});

    const a = document.createElement('a');
    a.href = url;
    a.download = customFilename || url.split('/').pop() || 'HSK_Document.pdf';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Đang bắt đầu tải tệp về máy...');
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
      toast.error('Lỗi khi khởi tạo mã QR.');
    }
  };

  const handleCopyShareLink = (exam: ExamItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/exams?id=${encodeURIComponent(exam.id)}`;
    const copyText = `📚 Đề thi HSK: ${exam.title} (${formatLevelLabel(exam.hskLevel)} • Đầy đủ PDF & Audio MP3) 👉 ${shareUrl}`;
    navigator.clipboard.writeText(copyText);
    toast.success('Đã sao chép liên kết đề thi vào bộ nhớ tạm!');
  };

  // -------------------------------------------------------------
  // Data Filtering & Statistics Computations
  // -------------------------------------------------------------
  const totalSetsCount = exams.length;
  const hanbanOfficialCount = useMemo(() => exams.filter((e) => e.category === 'official').length, [exams]);
  const blcuMockCount = useMemo(() => exams.filter((e) => e.category === 'mock').length, [exams]);
  const audioFilesCount = useMemo(() => exams.filter((e) => Boolean(e.audioUrl)).length, [exams]);

  const levelCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of exams) {
      const key = String(e.hskLevel);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [exams]);

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim().length > 0 ||
      selectedLevel !== 'all' ||
      selectedCategory !== 'all' ||
      onlyAudio ||
      sortBy !== 'newest'
    );
  }, [search, selectedLevel, selectedCategory, onlyAudio, sortBy]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedLevel('all');
    setSelectedCategory('all');
    setOnlyAudio(false);
    setSortBy('newest');
    toast.info('Đã xóa tất cả bộ lọc');
  };

  const filteredExams = useMemo(() => {
    const result = exams.filter((e) => {
      // Level filter
      if (selectedLevel !== 'all') {
        if (selectedLevel === 'HSKK' && e.hskLevel !== 'HSKK') return false;
        if (String(e.hskLevel) !== selectedLevel) return false;
      }

      // Category filter
      if (selectedCategory === 'official' && e.category !== 'official') return false;
      if (selectedCategory === 'mock' && e.category !== 'mock') return false;

      // Audio filter
      if (onlyAudio && !e.audioUrl) return false;

      // Search query (code, title, source, description)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchSource = (e.source || '').toLowerCase().includes(q);
        const matchDesc = (e.description || '').toLowerCase().includes(q);
        const matchId = (e.id || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSource && !matchDesc && !matchId) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'newest') {
        return (b.year || 0) - (a.year || 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'oldest') {
        return (a.year || 9999) - (b.year || 9999) || new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
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
      if (sortBy === 'duration') {
        return (b.durationMinutes || 0) - (a.durationMinutes || 0);
      }
      if (sortBy === 'views') {
        return b.viewsCount + b.downloadsCount - (a.viewsCount + a.downloadsCount);
      }
      return 0;
    });

    return result;
  }, [exams, selectedLevel, selectedCategory, onlyAudio, search, sortBy]);

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#0b0f19] text-[#0f172a] dark:text-[#f8fafc] font-sans transition-colors">
      <audio ref={audioRef} />

      {/* =========================================================================
          1. COMPACT ACADEMIC NAVIGATION HEADER
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#fcfbf9]/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-[#e2e8f0] dark:border-[#1e293b] px-4 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
              title="Quay lại Bảng Từ Vựng"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Bảng từ</span>
            </Link>

            <span className="text-[#cbd5e1] dark:text-[#334155] select-none">/</span>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#047857] flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0">
                <GraduationCap size={15} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#0f172a] dark:text-white tracking-tight">
                  HSK Exam Suite
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold text-[#047857] dark:text-[#34d399] bg-[#ecfdf5] dark:bg-[#064e3b]/40 px-2 py-0.5 rounded border border-[#a7f3d0] dark:border-[#065f46]">
                  Thư Viện Học Thuật
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Switching Controls & Actions */}
          <div className="flex items-center gap-2">
            {/* Catalog vs Cards Mode Switcher */}
            <div className="flex items-center bg-[#f1f5f9] dark:bg-[#1e293b] p-0.5 rounded-lg border border-[#e2e8f0] dark:border-[#334155] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  viewMode === 'catalog'
                    ? 'bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white shadow-2xs font-bold'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                }`}
                title="Chế độ Mục lục tra cứu (Catalog)"
              >
                <List size={14} />
                <span className="hidden md:inline">Mục lục</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white shadow-2xs font-bold'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                }`}
                title="Chế độ Xem Thẻ (Cards)"
              >
                <LayoutGrid size={14} />
                <span className="hidden md:inline">Thẻ đề thi</span>
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#111827] text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
              title={effectiveTheme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            >
              {effectiveTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Admin Badge */}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition-colors"
              >
                <Shield size={12} />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. EDITORIAL PAGE INTRODUCTION & EXAM STATISTICS STRIP
      ========================================================================= */}
      <section className="border-b border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#0e1424] px-4 sm:px-6 pt-7 pb-6 transition-colors">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Editorial Headline */}
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[#047857] dark:text-[#34d399] uppercase select-none">
              <span>Hệ thống khảo thí Hán ngữ Quốc tế</span>
              <span>•</span>
              <span>Tài nguyên học thuật</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] dark:text-white tracking-tight">
              Thư viện đề thi HSK
            </h1>

            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
              Kho tài liệu 65 bộ khảo thí chuẩn hóa quốc tế bao gồm đề thi thật từ Hanban / CTI và các bộ đề thử nghiệm từ NXB Đại học Ngôn ngữ Bắc Kinh (BLCU), kèm tệp nghe audio phòng thi và đáp án chi tiết.
            </p>
          </div>

          {/* Compact Academic Statistics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 p-3 bg-[#f8fafc] dark:bg-[#111827] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] text-xs">
            <div className="flex flex-col p-2">
              <span className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Tổng số bộ đề thi:</span>
              <div className="text-lg font-bold text-[#0f172a] dark:text-white mt-0.5">
                {totalSetsCount} bộ đề
              </div>
            </div>

            <div className="flex flex-col p-2 border-l border-[#e2e8f0] dark:border-[#1e293b]">
              <span className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Đề thi thật Hanban:</span>
              <div className="text-lg font-bold text-[#047857] dark:text-[#34d399] mt-0.5">
                {hanbanOfficialCount} đề
              </div>
            </div>

            <div className="flex flex-col p-2 border-l border-[#e2e8f0] dark:border-[#1e293b]">
              <span className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Đề mô phỏng BLCU:</span>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                {blcuMockCount} đề
              </div>
            </div>

            <div className="flex flex-col p-2 border-l border-[#e2e8f0] dark:border-[#1e293b]">
              <span className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Tệp âm thanh MP3:</span>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-0.5">
                {audioFilesCount} file nghe
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. DEDICATED SEARCH & FILTERING SYSTEM
      ========================================================================= */}
      <section className="border-b border-[#e2e8f0] dark:border-[#1e293b] bg-[#fcfbf9] dark:bg-[#0b0f19] px-4 sm:px-6 py-4 transition-colors">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Primary Filter Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã đề (vd: H31001), cấp độ HSK, BLCU..."
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#111827] text-xs sm:text-sm font-medium rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] text-[#0f172a] dark:text-white placeholder:text-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#047857] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Exam Category, Audio Toggle, Sort & Clear Action */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Category Segmented Control */}
              <div className="flex items-center bg-white dark:bg-[#111827] p-0.5 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b]">
                {[
                  { id: 'all' as const, label: 'Tất cả' },
                  { id: 'official' as const, label: 'Đề thật' },
                  { id: 'mock' as const, label: 'Đề thử' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] font-bold shadow-2xs'
                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Audio Filter Pill */}
              <button
                type="button"
                onClick={() => setOnlyAudio(!onlyAudio)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  onlyAudio
                    ? 'bg-[#ecfdf5] dark:bg-[#064e3b]/40 text-[#047857] dark:text-[#34d399] border-[#a7f3d0] dark:border-[#065f46] font-bold'
                    : 'bg-white dark:bg-[#111827] text-[#64748b] dark:text-[#94a3b8] border-[#e2e8f0] dark:border-[#1e293b] hover:text-[#0f172a] dark:hover:text-white'
                }`}
                title="Chỉ lọc các bộ đề có kèm file âm thanh MP3"
              >
                <Headphones size={13} className={onlyAudio ? 'text-[#047857]' : ''} />
                <span>Có Audio</span>
              </button>

              {/* Sorting Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1e293b] rounded-lg text-xs font-semibold text-[#0f172a] dark:text-white cursor-pointer outline-none"
              >
                <option value="newest">Sắp xếp: Mới nhất</option>
                <option value="oldest">Sắp xếp: Cũ nhất</option>
                <option value="level_asc">Cấp độ: HSK 1 → 9</option>
                <option value="level_desc">Cấp độ: HSK 9 → 1</option>
                <option value="duration">Thời lượng làm bài</option>
                <option value="views">Lượt xem & tải nhiều</option>
              </select>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-colors"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Compact Level Navigation Row */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#f1f5f9] dark:border-[#1e293b]/50 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0 py-1">
              <button
                type="button"
                onClick={() => setSelectedLevel('all')}
                className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                  selectedLevel === 'all'
                    ? 'bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] shadow-2xs'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] hover:text-[#0f172a] dark:hover:text-white'
                }`}
              >
                Tất cả ({totalSetsCount})
              </button>

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
                const config = ACADEMIC_LEVEL_CONFIG[lvl.id] || ACADEMIC_LEVEL_CONFIG['1'];

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                      isActive
                        ? 'bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] border-[#0f172a] dark:border-white font-bold shadow-2xs'
                        : 'bg-white dark:bg-[#111827] text-[#475569] dark:text-[#cbd5e1] border-[#e2e8f0] dark:border-[#1e293b] hover:border-[#cbd5e1] dark:hover:border-[#334155]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white dark:bg-[#0f172a]' : config.dotColor}`} />
                    <span>{lvl.label}</span>
                    <span className={`text-[10px] font-mono ${isActive ? 'opacity-80' : 'text-[#94a3b8]'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Results count indicator */}
            <div className="text-xs text-[#64748b] dark:text-[#94a3b8] font-medium whitespace-nowrap shrink-0 hidden md:block">
              Hiển thị <strong className="text-[#0f172a] dark:text-white">{filteredExams.length}</strong> / {totalSetsCount} bộ đề
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. MAIN BROWSING INTERFACE: CATALOG (TABLE) & CARDS
      ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28">
        {loading && exams.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-[#64748b]">
            <RefreshCw size={22} className="animate-spin text-[#047857] mb-2.5" />
            <p className="text-xs font-semibold">Đang nạp danh mục đề thi học thuật...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-[#111827] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
            <BookOpen size={28} className="text-[#94a3b8] mb-2" />
            <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">Không tìm thấy bộ đề phù hợp</h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 max-w-sm">
              Không có tài liệu nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-3 px-3 py-1.5 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] rounded-lg text-xs font-bold cursor-pointer"
            >
              Hiển thị tất cả đề thi
            </button>
          </div>
        ) : viewMode === 'catalog' ? (
          /* =======================================================================
             MODE A: STRUCTURED ACADEMIC CATALOG LAYOUT
             ======================================================================= */
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#0e1424] text-[#64748b] dark:text-[#94a3b8] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-24">Cấp độ</th>
                    <th className="py-3 px-4 min-w-[280px]">Bộ đề thi & Nguồn phát hành</th>
                    <th className="py-3 px-4 w-32 hidden md:table-cell">Phân loại</th>
                    <th className="py-3 px-4 w-32 hidden lg:table-cell">Thông số</th>
                    <th className="py-3 px-4 w-36">Audio MP3</th>
                    <th className="py-3 px-4 w-44 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] dark:divide-[#1e293b]">
                  {filteredExams.map((exam) => {
                    const isAudioPlaying = activeAudioExam?.id === exam.id && isPlaying;
                    const config = ACADEMIC_LEVEL_CONFIG[String(exam.hskLevel)] || ACADEMIC_LEVEL_CONFIG['1'];

                    return (
                      <tr
                        key={exam.id}
                        className="hover:bg-[#fcfbf9] dark:hover:bg-[#131b2e] transition-colors group cursor-pointer"
                        onClick={() => setActiveExamDetail({ exam, activeTab: 'pdf' })}
                      >
                        {/* Level badge */}
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-block text-xs font-bold px-2 py-0.5 rounded border text-center ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                          >
                            {formatLevelLabel(exam.hskLevel)}
                          </span>
                        </td>

                        {/* Title & Metadata */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#0f172a] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#34d399] transition-colors line-clamp-1">
                                {exam.title}
                              </span>
                              {exam.isPinned && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                                  Tuyển chọn
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] flex items-center gap-2 truncate">
                              {exam.source && <span className="truncate">{exam.source}</span>}
                              {exam.year && <span>• Năm {exam.year}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 align-top hidden md:table-cell">
                          <span
                            className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                              exam.category === 'official'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {exam.category === 'official' ? '🏛️ Hanban' : '📘 BLCU'}
                          </span>
                        </td>

                        {/* Specs */}
                        <td className="py-3.5 px-4 align-top hidden lg:table-cell text-[#64748b] dark:text-[#94a3b8]">
                          <div>{exam.durationMinutes ? `${exam.durationMinutes} phút` : 'Theo chuẩn'}</div>
                          {exam.questionCount && (
                            <div className="text-[11px] text-[#94a3b8]">{exam.questionCount} câu hỏi</div>
                          )}
                        </td>

                        {/* Audio Status & Play */}
                        <td
                          className="py-3.5 px-4 align-top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {exam.audioUrl ? (
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(exam)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all border ${
                                isAudioPlaying
                                  ? 'bg-[#047857] text-white border-[#047857]'
                                  : 'bg-emerald-50 text-[#047857] border-emerald-200 dark:bg-[#064e3b]/30 dark:text-[#34d399] dark:border-[#065f46] hover:bg-emerald-100'
                              }`}
                              title="Nghe file Audio MP3 phòng thi"
                            >
                              {isAudioPlaying ? (
                                <>
                                  <Pause size={12} />
                                  <span>Dừng</span>
                                </>
                              ) : (
                                <>
                                  <Play size={12} className="fill-current" />
                                  <span>Nghe MP3</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[#94a3b8] text-[11px] italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 align-top text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveExamDetail({ exam, activeTab: 'pdf' })}
                              className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-[#0f172a] text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                              title="Mở tài liệu đọc chi tiết"
                            >
                              Xem đề
                            </button>

                            {exam.answerUrl && (
                              <button
                                type="button"
                                onClick={() => setActiveExamDetail({ exam, activeTab: 'answer' })}
                                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold cursor-pointer transition-colors"
                                title="Xem đáp án"
                              >
                                Đáp án
                              </button>
                            )}

                            {exam.pdfUrl && (
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(exam, exam.pdfUrl, `${exam.title}.pdf`)}
                                className="p-1.5 text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer transition-colors"
                                title="Tải file PDF"
                              >
                                <Download size={13} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenShare(exam)}
                              className="p-1.5 text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer transition-colors"
                              title="Chia sẻ & Mã QR"
                            >
                              <Share2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* =======================================================================
             MODE B: REFINED EDITORIAL EXAM CARDS LAYOUT
             ======================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => {
              const isAudioPlaying = activeAudioExam?.id === exam.id && isPlaying;
              const config = ACADEMIC_LEVEL_CONFIG[String(exam.hskLevel)] || ACADEMIC_LEVEL_CONFIG['1'];

              return (
                <div
                  key={exam.id}
                  className="bg-white dark:bg-[#111827] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] p-4 flex flex-col justify-between hover:border-[#cbd5e1] dark:hover:border-[#334155] shadow-2xs hover:shadow-sm transition-all group"
                >
                  <div>
                    {/* Header: Level & Category & Year */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                        >
                          {formatLevelLabel(exam.hskLevel)}
                        </span>
                        <span className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] bg-[#f1f5f9] dark:bg-[#1e293b] px-1.5 py-0.5 rounded">
                          {exam.category === 'official' ? '🏛️ Hanban' : '📘 BLCU'}
                        </span>
                      </div>

                      {exam.year && (
                        <span className="text-[11px] font-mono text-[#94a3b8]">
                          {exam.year}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => setActiveExamDetail({ exam, activeTab: 'pdf' })}
                      className="text-sm font-bold text-[#0f172a] dark:text-white leading-snug line-clamp-2 group-hover:text-[#047857] dark:group-hover:text-[#34d399] transition-colors cursor-pointer mb-2"
                    >
                      {exam.title}
                    </h3>

                    {/* Specs Row */}
                    <div className="flex items-center gap-3 text-xs text-[#64748b] dark:text-[#94a3b8] mb-3">
                      {exam.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-[#94a3b8]" />
                          <span>{exam.durationMinutes}p</span>
                        </span>
                      )}
                      {exam.questionCount && (
                        <span className="flex items-center gap-1">
                          <FileText size={12} className="text-[#94a3b8]" />
                          <span>{exam.questionCount} câu</span>
                        </span>
                      )}
                      {exam.source && (
                        <span className="truncate max-w-[140px] text-[11px] text-[#94a3b8]">
                          • {exam.source}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="pt-3 border-t border-[#f1f5f9] dark:border-[#1e293b] flex items-center justify-between gap-2">
                    {/* Audio play button */}
                    {exam.audioUrl ? (
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(exam)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all border ${
                          isAudioPlaying
                            ? 'bg-[#047857] text-white border-[#047857]'
                            : 'bg-emerald-50 text-[#047857] border-emerald-200 dark:bg-[#064e3b]/30 dark:text-[#34d399] dark:border-[#065f46] hover:bg-emerald-100'
                        }`}
                      >
                        {isAudioPlaying ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
                        <span>{isAudioPlaying ? 'Dừng' : 'Audio MP3'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#94a3b8] italic">Đề đọc viết</span>
                    )}

                    {/* Primary actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveExamDetail({ exam, activeTab: 'pdf' })}
                        className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-[#0f172a] text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        Xem đề
                      </button>

                      {exam.pdfUrl && (
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(exam, exam.pdfUrl, `${exam.title}.pdf`)}
                          className="p-1 text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
                          title="Tải PDF"
                        >
                          <Download size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenShare(exam)}
                        className="p-1 text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
                        title="Chia sẻ"
                      >
                        <Share2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================================
          5. POLISHED EXAM DETAIL & READING ROOM EXPERIENCE
      ========================================================================= */}
      {activeExamDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-[#cbd5e1] dark:border-[#1e293b] w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Top Reading Room Header */}
            <div className="h-14 px-4 sm:px-6 bg-[#f8fafc] dark:bg-[#0b0f19] border-b border-[#e2e8f0] dark:border-[#1e293b] flex items-center justify-between gap-3 shrink-0">
              {/* Title & Level Badge */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#047857] text-white shrink-0">
                  {formatLevelLabel(activeExamDetail.exam.hskLevel)}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0f172a] dark:text-white truncate">
                    {activeExamDetail.exam.title}
                  </h3>
                  <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate hidden sm:block">
                    {activeExamDetail.exam.source} {activeExamDetail.exam.year ? `• Năm ${activeExamDetail.exam.year}` : ''}
                  </div>
                </div>
              </div>

              {/* Central Switcher: Exam PDF vs Answer Key */}
              <div className="flex items-center bg-[#f1f5f9] dark:bg-[#1e293b] p-0.5 rounded-lg border border-[#e2e8f0] dark:border-[#334155] text-xs">
                <button
                  type="button"
                  onClick={() => setActiveExamDetail({ ...activeExamDetail, activeTab: 'pdf' })}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                    activeExamDetail.activeTab === 'pdf'
                      ? 'bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white font-bold shadow-2xs'
                      : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                  }`}
                >
                  Đề thi PDF
                </button>
                {activeExamDetail.exam.answerUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveExamDetail({ ...activeExamDetail, activeTab: 'answer' })}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                      activeExamDetail.activeTab === 'answer'
                        ? 'bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white font-bold shadow-2xs'
                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white'
                    }`}
                  >
                    Bảng đáp án
                  </button>
                )}
              </div>

              {/* Right Tools: Audio, Download, External Link & Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                {activeExamDetail.exam.audioUrl && (
                  <button
                    type="button"
                    onClick={() => togglePlayAudio(activeExamDetail.exam)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-[#047857] border border-emerald-200 dark:bg-[#064e3b]/40 dark:text-[#34d399] dark:border-[#065f46] hover:bg-emerald-100 cursor-pointer"
                  >
                    {activeAudioExam?.id === activeExamDetail.exam.id && isPlaying ? (
                      <>
                        <Pause size={12} />
                        <span className="hidden sm:inline">Dừng</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-current" />
                        <span className="hidden sm:inline">Phát Audio</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(
                      activeExamDetail.exam,
                      activeExamDetail.activeTab === 'pdf'
                        ? activeExamDetail.exam.pdfUrl
                        : activeExamDetail.exam.answerUrl,
                      `${activeExamDetail.exam.title}_${activeExamDetail.activeTab}.pdf`
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] rounded text-xs font-bold hover:bg-[#1e293b] cursor-pointer shadow-2xs"
                  title="Tải tệp đang xem về máy"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Tải về</span>
                </button>

                <a
                  href={
                    activeExamDetail.activeTab === 'pdf'
                      ? activeExamDetail.exam.pdfUrl
                      : activeExamDetail.exam.answerUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
                  title="Mở tài liệu trong tab mới"
                >
                  <ExternalLink size={15} />
                </a>

                <button
                  type="button"
                  onClick={() => setActiveExamDetail(null)}
                  className="p-1.5 text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer ml-1"
                  title="Đóng xem chi tiết [Esc]"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Reading Room Body: Full-scale PDF Frame */}
            <div className="flex-1 bg-[#f1f5f9] dark:bg-[#0b0f19] relative overflow-hidden">
              <iframe
                src={`${
                  activeExamDetail.activeTab === 'pdf'
                    ? activeExamDetail.exam.pdfUrl
                    : activeExamDetail.exam.answerUrl
                }#toolbar=1`}
                className="w-full h-full border-0 bg-white"
                title={activeExamDetail.exam.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. FLOATING AUDIO PLAYER DOCK (Restrained, Professional)
      ========================================================================= */}
      {activeAudioExam && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-[500px] z-40 bg-[#0f172a]/95 dark:bg-[#111827]/95 backdrop-blur-md text-white border border-[#334155] rounded-xl px-4 py-2.5 shadow-xl animate-slideUp">
          <div className="flex items-center justify-between gap-3">
            {/* Title & Timing */}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {activeAudioExam.title}
              </div>
              <div className="text-[11px] text-[#34d399] font-mono mt-0.5">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSkip(-10)}
                className="p-1 text-[#94a3b8] hover:text-white rounded cursor-pointer"
                title="Lùi 10 giây"
              >
                <RotateCcw size={13} />
              </button>

              <button
                type="button"
                onClick={() => togglePlayAudio(activeAudioExam)}
                className="w-7 h-7 rounded-full bg-white text-[#0f172a] flex items-center justify-center font-bold hover:bg-[#f1f5f9] cursor-pointer shadow-xs"
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} className="fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(10)}
                className="p-1 text-[#94a3b8] hover:text-white rounded cursor-pointer"
                title="Tua 10 giây"
              >
                <RotateCw size={13} />
              </button>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-16 sm:w-24 accent-[#34d399] cursor-pointer h-1 bg-[#334155] rounded-lg hidden sm:block"
              />

              {/* Speed Cycle */}
              <button
                type="button"
                onClick={handleSpeedCycle}
                className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-[#cbd5e1] hover:text-white cursor-pointer"
                title="Tốc độ nghe"
              >
                {playbackRate}x
              </button>

              {/* Download MP3 */}
              <button
                type="button"
                onClick={() => handleDownloadFile(activeAudioExam, activeAudioExam.audioUrl, `${activeAudioExam.title}_Audio.mp3`)}
                className="p-1 text-[#94a3b8] hover:text-white rounded cursor-pointer"
                title="Tải tệp MP3"
              >
                <Download size={13} />
              </button>

              {/* Close Audio Player */}
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setActiveAudioExam(null);
                  setIsPlaying(false);
                }}
                className="p-1 text-[#64748b] hover:text-white rounded cursor-pointer ml-1"
                title="Đóng trình phát âm thanh"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. ACADEMIC SHARE & QR CODE MODAL
      ========================================================================= */}
      {shareModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-[#cbd5e1] dark:border-[#1e293b] max-w-sm w-full p-5 text-center animate-scaleIn">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#f1f5f9] dark:border-[#1e293b] mb-3">
              <h3 className="text-xs font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                <Share2 size={13} className="text-[#047857]" />
                <span>Chia sẻ bộ đề thi HSK</span>
              </h3>
              <button
                type="button"
                onClick={() => setShareModalExam(null)}
                className="p-1 text-[#94a3b8] hover:text-[#0f172a] rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="bg-[#f8fafc] dark:bg-[#0b0f19] p-2.5 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] mb-3">
              <span className="text-[10px] font-bold text-[#047857] dark:text-[#34d399] bg-[#ecfdf5] dark:bg-[#064e3b]/40 px-1.5 py-0.2 rounded border border-[#a7f3d0] dark:border-[#065f46]">
                {formatLevelLabel(shareModalExam.hskLevel)}
              </span>
              <h4 className="text-xs font-bold text-[#0f172a] dark:text-white mt-1 line-clamp-2">
                {shareModalExam.title}
              </h4>
            </div>

            {qrCodeDataUrl ? (
              <div className="bg-white p-2 rounded-lg border border-[#e2e8f0] shadow-2xs inline-block mx-auto mb-2.5">
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code ${shareModalExam.title}`}
                  className="w-40 h-40 mx-auto"
                />
              </div>
            ) : (
              <div className="w-40 h-40 bg-[#f1f5f9] animate-pulse rounded-lg mx-auto mb-2.5 flex items-center justify-center text-[#94a3b8]">
                <QrCode size={26} />
              </div>
            )}

            <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mb-3">
              Quét mã để truy cập đề thi PDF, nghe audio MP3 và tải tài liệu.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyShareLink(shareModalExam)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-[#0f172a] rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <Copy size={12} />
                <span>Sao chép link</span>
              </button>

              {qrCodeDataUrl && (
                <a
                  href={qrCodeDataUrl}
                  download={`HSK_Exam_${shareModalExam.id}.png`}
                  className="px-2.5 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg text-xs font-bold text-[#475569] dark:text-[#cbd5e1] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download size={12} />
                  <span>Ảnh QR</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
