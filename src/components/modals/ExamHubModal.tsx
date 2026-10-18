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
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamItem, ExamHskLevel } from '@/types/exam';
import { useToast } from '@/context/ToastContext';

interface ExamHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedExamId?: string | null;
}

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
    const copyText = `📚 Luyện Đề Thi HSK: ${exam.title} (HSK ${exam.hskLevel} • Kèm Audio MP3 & Đáp án) 👉 ${shareUrl}`;
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
        if (selectedCategory === 'answer' && !e.answerUrl) return false;
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

  const getHskBadge = (level: ExamHskLevel) => {
    switch (level) {
      case 1:
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 2:
        return 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
      case 3:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 4:
        return 'bg-pink-100 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-800';
      case 5:
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 6:
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'HSKK':
      default:
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 sm:p-5 animate-fadeIn">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full h-[92vh] max-h-[880px] overflow-hidden flex flex-col animate-scaleIn">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                <GraduationCap size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Kho Đề Thi HSK Tuyển Chọn</span>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Chính Thức
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tổng hợp đề thi thật HSK 1 – 6 & đề thử BLCU Bắc Kinh, kèm file nghe MP3 trực tiếp và đáp án chi tiết.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Persistent Live Audio Player Bar (If an exam audio is loaded) */}
          {activeAudioExam && (
            <div className="bg-emerald-900 text-white px-5 py-3 border-b border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner shrink-0 animate-fadeIn">
              <audio ref={audioRef} />
              {/* Audio Meta */}
              <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-xs">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
                  <Volume2 size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{activeAudioExam.title}</div>
                  <div className="text-[10.5px] text-emerald-300/80 flex items-center gap-1.5">
                    <span>Phần Nghe (HSK {activeAudioExam.hskLevel})</span>
                    <span>•</span>
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSkip(-10)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors"
                  title="Lùi 10 giây"
                >
                  <RotateCcw size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => togglePlayAudio(activeAudioExam)}
                  className="w-8 h-8 rounded-full bg-white text-emerald-950 flex items-center justify-center font-bold hover:scale-105 cursor-pointer transition-transform shadow-xs"
                >
                  {isPlaying ? <Pause size={15} className="fill-emerald-950" /> : <Play size={15} className="fill-emerald-950 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(10)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-colors"
                  title="Tua tới 10 giây"
                >
                  <RotateCw size={15} />
                </button>

                {/* Progress Bar */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-28 sm:w-44 accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />

                {/* Playback speed toggle */}
                <button
                  type="button"
                  onClick={handleSpeedChange}
                  className="px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-[11px] font-bold cursor-pointer transition-colors"
                  title="Thay đổi tốc độ phát"
                >
                  {playbackRate}x
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setActiveAudioExam(null);
                    setIsPlaying(false);
                  }}
                  className="p-1 text-white/60 hover:text-white rounded-lg cursor-pointer ml-1"
                  title="Tắt trình phát"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Search & Filter Nav */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm đề thi theo cấp độ, năm phát hành, trường ra đề..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Level Quick Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: '1', label: 'HSK 1' },
                { id: '2', label: 'HSK 2' },
                { id: '3', label: 'HSK 3' },
                { id: '4', label: 'HSK 4' },
                { id: '5', label: 'HSK 5' },
                { id: '6', label: 'HSK 6' },
                { id: 'HSKK', label: 'HSKK' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                    selectedLevel === lvl.id
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            {/* Category Quick Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Tất cả định dạng</option>
                <option value="audio">Có File Nghe Audio MP3</option>
                <option value="answer">Có File Đáp án chi tiết</option>
                <option value="official">Đề thi thật chính thức</option>
                <option value="mock">Đề thi thử / Mô phỏng</option>
              </select>
            </div>
          </div>

          {/* Exam Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30 scrollbar-thin">
            {loading && exams.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs">Đang nạp kho tài liệu đề thi...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                <BookOpen size={36} className="text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy bộ đề thi phù hợp.</p>
                <p className="text-xs text-slate-400 mt-1">Thử chọn cấp độ HSK khác hoặc xóa từ khóa tìm kiếm.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExams.map((exam) => {
                  const isCurrentPlaying = activeAudioExam?.id === exam.id && isPlaying;
                  return (
                    <div
                      key={exam.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative group ${
                        exam.isPinned
                          ? 'border-amber-300/80 dark:border-amber-800/80 bg-amber-50/10 dark:bg-amber-950/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${getHskBadge(
                                exam.hskLevel
                              )}`}
                            >
                              HSK {exam.hskLevel}
                            </span>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {exam.category === 'official' ? 'Đề thi thật' : 'Đề thi thử'}
                            </span>

                            {exam.isPinned && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                                <Pin size={11} className="fill-amber-500" /> Nổi bật
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Share button */}
                            <button
                              type="button"
                              onClick={() => handleOpenShare(exam)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Chia sẻ link & Mã QR"
                            >
                              <Share2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Exam Title */}
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {exam.title}
                        </h4>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {exam.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              <span>{exam.durationMinutes} phút</span>
                            </span>
                          )}
                          {exam.questionCount && <span>• {exam.questionCount} câu hỏi</span>}
                          {exam.source && (
                            <span>• Nguồn: <span className="font-semibold text-slate-700 dark:text-slate-300">{exam.source}</span></span>
                          )}
                        </div>

                        {/* Description */}
                        {exam.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {exam.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        {/* Audio Button */}
                        {exam.audioUrl ? (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(exam)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs ${
                              isCurrentPlaying
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
                            }`}
                          >
                            {isCurrentPlaying ? (
                              <>
                                <Pause size={13} className="fill-white" />
                                <span>Tạm dừng</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={13} />
                                <span>Nghe Audio MP3</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Không có Audio</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {/* PDF Exam Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenResource(exam, exam.pdfUrl, 'Đề thi PDF')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                          >
                            <FileText size={13} />
                            <span>Tải Đề (PDF)</span>
                          </button>

                          {/* Answer Key Button */}
                          {exam.answerUrl && (
                            <button
                              type="button"
                              onClick={() => handleOpenResource(exam, exam.answerUrl, 'Đáp án')}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                              title="Xem đáp án & tapescript"
                            >
                              <KeyRound size={13} />
                              <span>Đáp án</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SHARE MODAL WITH QR CODE */}
      {shareModalExam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
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

            <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mb-3">
              {shareModalExam.title}
            </p>

            {/* QR Code Canvas */}
            {qrCodeDataUrl ? (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeDataUrl} alt="Mã QR Đề Thi" className="w-52 h-52 mx-auto rounded-lg" />
              </div>
            ) : (
              <div className="w-52 h-52 flex items-center justify-center bg-slate-100 rounded-2xl mx-auto mb-3">
                <span className="text-xs text-slate-400">Đang tạo mã QR...</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Dùng Zalo hoặc Camera điện thoại quét mã để mở đề thi, nghe audio và tải tài liệu về học ngay.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyLink(shareModalExam)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <Copy size={14} />
                <span>Sao chép link</span>
              </button>

              {qrCodeDataUrl && (
                <a
                  href={qrCodeDataUrl}
                  download={`HSK_Exam_${shareModalExam.id}.png`}
                  className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download size={14} />
                  <span>Lưu QR</span>
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
