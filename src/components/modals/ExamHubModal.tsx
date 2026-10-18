'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
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
  Radio,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamItem, ExamHskLevel } from '@/types/exam';
import { useToast } from '@/context/ToastContext';

interface ExamHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedExamId?: string | null;
}

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
  }
> = {
  '1': {
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    pillActive: 'bg-emerald-600 text-white shadow-emerald-600/30 shadow-sm',
    border: 'hover:border-emerald-300 dark:hover:border-emerald-800',
    bgSoft: 'bg-emerald-500/5',
    accent: 'text-emerald-600 dark:text-emerald-400',
    label: 'HSK 1',
    words: '300 từ',
  },
  '2': {
    badge: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    pillActive: 'bg-cyan-600 text-white shadow-cyan-600/30 shadow-sm',
    border: 'hover:border-cyan-300 dark:hover:border-cyan-800',
    bgSoft: 'bg-cyan-500/5',
    accent: 'text-cyan-600 dark:text-cyan-400',
    label: 'HSK 2',
    words: '600 từ',
  },
  '3': {
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    pillActive: 'bg-amber-600 text-white shadow-amber-600/30 shadow-sm',
    border: 'hover:border-amber-300 dark:hover:border-amber-800',
    bgSoft: 'bg-amber-500/5',
    accent: 'text-amber-600 dark:text-amber-400',
    label: 'HSK 3',
    words: '1.000 từ',
  },
  '4': {
    badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    pillActive: 'bg-blue-600 text-white shadow-blue-600/30 shadow-sm',
    border: 'hover:border-blue-300 dark:hover:border-blue-800',
    bgSoft: 'bg-blue-500/5',
    accent: 'text-blue-600 dark:text-blue-400',
    label: 'HSK 4',
    words: '1.200 từ',
  },
  '5': {
    badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    pillActive: 'bg-purple-600 text-white shadow-purple-600/30 shadow-sm',
    border: 'hover:border-purple-300 dark:hover:border-purple-800',
    bgSoft: 'bg-purple-500/5',
    accent: 'text-purple-600 dark:text-purple-400',
    label: 'HSK 5',
    words: '2.500 từ',
  },
  '6': {
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    pillActive: 'bg-rose-600 text-white shadow-rose-600/30 shadow-sm',
    border: 'hover:border-rose-300 dark:hover:border-rose-800',
    bgSoft: 'bg-rose-500/5',
    accent: 'text-rose-600 dark:text-rose-400',
    label: 'HSK 6',
    words: '5.000 từ',
  },
  HSKK: {
    badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    pillActive: 'bg-indigo-600 text-white shadow-indigo-600/30 shadow-sm',
    border: 'hover:border-indigo-300 dark:hover:border-indigo-800',
    bgSoft: 'bg-indigo-500/5',
    accent: 'text-indigo-600 dark:text-indigo-400',
    label: 'HSKK',
    words: 'Khẩu ngữ',
  },
};

export function ExamHubModal({
  isOpen,
  onClose,
  initialSelectedExamId,
}: ExamHubModalProps) {
  const toast = useToast();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Active playing audio state
  const [activeAudioExam, setActiveAudioExam] = useState<ExamItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active Share / QR Modal
  const [shareModalExam, setShareModalExam] = useState<ExamItem | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Fetch published exams
  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setExams(data.exams);
        }
      }
    } catch (err) {
      console.error('Fetch exams error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchExams();
    }
  }, [isOpen, fetchExams]);

  // Audio time update handler
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

  // Handle Play/Pause
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
      // Record view stat
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

  // Open resource (increment download count)
  const handleOpenResource = (exam: ExamItem, url?: string, label?: string) => {
    if (!url) {
      toast.warning(`Tài liệu ${label || ''} đang được cập nhật.`);
      return;
    }
    // Record download stat
    fetch('/api/exams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: exam.id, action: 'increment', type: 'download' }),
    }).catch(() => {});

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Share Modal
  const handleOpenShare = async (exam: ExamItem) => {
    setShareModalExam(exam);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?examId=${encodeURIComponent(exam.id)}`;
    try {
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qr);
    } catch (err) {
      console.error('QR code generation error:', err);
    }
  };

  const handleCopyLink = (exam: ExamItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?examId=${encodeURIComponent(exam.id)}`;
    const copyText = `📚 Đề Thi HSK Tuyển Chọn: ${exam.title} (HSK ${exam.hskLevel} • Kèm Audio MP3 & Đáp án) 👉 ${shareUrl}`;
    navigator.clipboard.writeText(copyText);
    toast.success('Đã sao chép link chia sẻ đề thi vào bộ nhớ tạm!');
  };

  // Filtered list
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
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
  }, [exams, selectedLevel, selectedCategory, search]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: exams.length };
    exams.forEach((e) => {
      const key = String(e.hskLevel);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [exams]);

  const totalAudioCount = useMemo(() => exams.filter((e) => e.audioUrl).length, [exams]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-fadeIn">
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-zinc-800/90 max-w-5xl w-full h-[94vh] max-h-[920px] overflow-hidden flex flex-col animate-scaleIn relative">
          {/* Top Brand Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0">
                <GraduationCap size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Kho Đề Thi HSK Tuyển Chọn
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Sparkles size={10} /> Chuẩn hóa
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate hidden sm:block">
                  Đề thi thật & đề mô phỏng chuẩn BLCU, tích hợp file nghe MP3 trực tiếp và bảng đáp án chi tiết.
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-zinc-800 text-xs">
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

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/40 space-y-3 shrink-0">
            {/* Row 1: Search & Category tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm đề theo cấp độ, năm, trường ra đề (vd: BLCU, 2024)..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all shadow-2xs placeholder:text-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Quick Filter */}
              <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs shrink-0 shadow-2xs overflow-x-auto scrollbar-none">
                {[
                  { id: 'all', label: 'Tất cả đề' },
                  { id: 'official', label: 'Đề thi thật', icon: Award },
                  { id: 'mock', label: 'Đề thi thử', icon: BookOpen },
                  { id: 'audio', label: `Audio (${totalAudioCount})`, icon: Headphones },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {Icon && <Icon size={12} />}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Level Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                Cấp độ:
              </span>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: '1', label: 'HSK 1' },
                { id: '2', label: 'HSK 2' },
                { id: '3', label: 'HSK 3' },
                { id: '4', label: 'HSK 4' },
                { id: '5', label: 'HSK 5' },
                { id: '6', label: 'HSK 6' },
                { id: 'HSKK', label: 'HSKK' },
              ].map((lvl) => {
                const isActive = selectedLevel === lvl.id;
                const count = levelCounts[lvl.id] || 0;
                const theme = LEVEL_THEMES[lvl.id];

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 border btn-press ${
                      isActive
                        ? theme?.pillActive || 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs'
                        : 'bg-white dark:bg-zinc-950 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <span>{lvl.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {(selectedLevel !== 'all' || selectedCategory !== 'all' || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLevel('all');
                    setSelectedCategory('all');
                    setSearch('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors whitespace-nowrap ml-auto"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Cards & Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-950/40 scrollbar-thin">
            {loading && exams.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Đang nạp kho tài liệu đề thi...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-center max-w-sm mx-auto p-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center mb-3 text-slate-400 dark:text-zinc-600">
                  <BookOpen size={28} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Không tìm thấy bộ đề thi phù hợp
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {exams.length === 0
                    ? 'Kho đề hiện đang trống. Admin chưa đăng tải bộ đề nào hoặc đang biên soạn.'
                    : 'Thử đổi cấp độ HSK khác hoặc xóa từ khóa tìm kiếm để xem tất cả đề thi.'}
                </p>
                {(selectedLevel !== 'all' || selectedCategory !== 'all' || search) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLevel('all');
                      setSelectedCategory('all');
                      setSearch('');
                    }}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Xem toàn bộ đề thi
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {filteredExams.map((exam) => {
                  const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
                  const theme = LEVEL_THEMES[String(exam.hskLevel)] || LEVEL_THEMES['1'];

                  return (
                    <div
                      key={exam.id}
                      className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between group shadow-2xs hover:shadow-md relative overflow-hidden ${
                        exam.isPinned
                          ? 'border-amber-300/80 dark:border-amber-700/60 ring-1 ring-amber-300/40 dark:ring-amber-800/30'
                          : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {/* Top Soft Tint Band */}
                      <div className={`h-1.5 w-full ${exam.isPinned ? 'bg-amber-400' : 'bg-transparent'}`} />

                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        {/* Header Row: Level + Category + Badges + Share */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* HSK Level Chip */}
                              <span
                                className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border tracking-wide ${theme.badge}`}
                              >
                                HSK {exam.hskLevel}
                              </span>

                              {/* Category Pill */}
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-zinc-700">
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
                                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono">
                                  {exam.year}
                                </span>
                              )}

                              {/* Featured Pin */}
                              {exam.isPinned && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  <Sparkles size={10} className="fill-amber-500 text-amber-500" /> Tuyển chọn
                                </span>
                              )}
                            </div>

                            {/* Share button */}
                            <button
                              type="button"
                              onClick={() => handleOpenShare(exam)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                              title="Chia sẻ link & Mã QR"
                            >
                              <Share2 size={15} />
                            </button>
                          </div>

                          {/* Exam Title */}
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {exam.title}
                          </h4>

                          {/* Specs Badge Line */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                            {exam.durationMinutes && (
                              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                <Clock size={12} className="text-slate-400" />
                                <span>{exam.durationMinutes} phút</span>
                              </span>
                            )}
                            {exam.questionCount && (
                              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                <FileText size={12} className="text-slate-400" />
                                <span>{exam.questionCount} câu hỏi</span>
                              </span>
                            )}
                            {exam.source && (
                              <span className="text-slate-400 truncate max-w-[180px]" title={exam.source}>
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

                        {/* Bottom Action Strip */}
                        <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                          {/* Audio Action (Primary) */}
                          {exam.audioUrl ? (
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(exam)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs btn-press ${
                                isCurrentPlaying
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30 animate-pulse'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/70'
                              }`}
                            >
                              {isCurrentPlaying ? (
                                <>
                                  <div className="flex items-center gap-0.5 h-3">
                                    <span className="w-0.5 h-full bg-white animate-bounce" />
                                    <span className="w-0.5 h-2/3 bg-white animate-bounce delay-75" />
                                    <span className="w-0.5 h-full bg-white animate-bounce delay-150" />
                                  </div>
                                  <span>Đang phát...</span>
                                </>
                              ) : (
                                <>
                                  <Headphones size={13} className="text-emerald-600 dark:text-emerald-400" />
                                  <span>Nghe MP3</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa có Audio</span>
                          )}

                          {/* PDF & Answer Buttons */}
                          <div className="flex items-center gap-1.5">
                            {exam.pdfUrl && (
                              <button
                                type="button"
                                onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs btn-press"
                                title="Tải file đề thi PDF A4"
                              >
                                <Download size={13} />
                                <span>Tải Đề (PDF)</span>
                              </button>
                            )}

                            {exam.answerUrl && (
                              <button
                                type="button"
                                onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-zinc-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors btn-press"
                                title="Xem đáp án & tapescript"
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
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80 shadow-2xs pb-20">
                {filteredExams.map((exam) => {
                  const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
                  const theme = LEVEL_THEMES[String(exam.hskLevel)] || LEVEL_THEMES['1'];

                  return (
                    <div
                      key={exam.id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 text-center min-w-[58px] ${theme.badge}`}
                        >
                          HSK {exam.hskLevel}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                              {exam.title}
                            </h4>
                            {exam.isPinned && (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 shrink-0">
                                Nổi bật
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                            <span>{exam.category === 'official' ? 'Đề thi thật' : 'Đề thi thử'}</span>
                            {exam.year && <span>• Năm {exam.year}</span>}
                            {exam.durationMinutes && <span>• {exam.durationMinutes} phút</span>}
                            {exam.questionCount && <span>• {exam.questionCount} câu</span>}
                            {exam.source && <span className="truncate max-w-[150px]">• {exam.source}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {exam.audioUrl && (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(exam)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              isCurrentPlaying
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60'
                            }`}
                          >
                            {isCurrentPlaying ? <Pause size={13} /> : <Headphones size={13} />}
                            <span className="hidden sm:inline">{isCurrentPlaying ? 'Tạm dừng' : 'Nghe MP3'}</span>
                          </button>
                        )}

                        {exam.pdfUrl && (
                          <button
                            type="button"
                            onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                            title="Tải PDF"
                          >
                            <Download size={13} />
                            <span className="hidden sm:inline">PDF</span>
                          </button>
                        )}

                        {exam.answerUrl && (
                          <button
                            type="button"
                            onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                            title="Xem đáp án"
                          >
                            <KeyRound size={13} />
                            <span className="hidden sm:inline">Đáp án</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenShare(exam)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                          title="Chia sẻ"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FLOATING AUDIO PLAYER BAR (Attached to bottom when playing) */}
          {activeAudioExam && (
            <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 dark:bg-black/95 backdrop-blur-md text-white border-t border-slate-800 px-4 sm:px-6 py-3 shadow-2xl z-30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-slideUp">
              <audio ref={audioRef} />

              {/* Track Info */}
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto sm:max-w-xs">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm animate-spin-slow">
                  <Headphones size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate text-white">{activeAudioExam.title}</div>
                  <div className="text-[10.5px] text-emerald-400/90 flex items-center gap-1.5 font-mono">
                    <span>HSK {activeAudioExam.hskLevel}</span>
                    <span>•</span>
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Central Player Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSkip(-10)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors"
                  title="Lùi 10 giây"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => togglePlayAudio(activeAudioExam)}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold hover:scale-105 cursor-pointer transition-transform shadow-lg shadow-emerald-500/30"
                >
                  {isPlaying ? (
                    <Pause size={17} className="fill-slate-950" />
                  ) : (
                    <Play size={17} className="fill-slate-950 ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(10)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors"
                  title="Tua tới 10 giây"
                >
                  <RotateCw size={16} />
                </button>

                {/* Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-32 sm:w-56 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />

                {/* Speed Toggle */}
                <button
                  type="button"
                  onClick={handleSpeedChange}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer transition-colors"
                  title="Tốc độ phát"
                >
                  {playbackRate}x
                </button>

                {/* Close player */}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setActiveAudioExam(null);
                    setIsPlaying(false);
                  }}
                  className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer ml-1"
                  title="Đóng trình phát"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SHARE MODAL WITH QR CODE */}
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
    </>
  );
}

export default ExamHubModal;
