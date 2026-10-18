'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Grid,
  Volume2,
  Sparkles,
  PenTool,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Layers,
  HelpCircle,
  Printer,
} from 'lucide-react';
import { VocabItem } from '@/types/vocabulary';
import { useTheme } from '@/context/ThemeContext';
import { tts } from '@/lib/tts';

interface StrokeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VocabItem | null;
  onPrevWord?: () => void;
  onNextWord?: () => void;
  hasPrevWord?: boolean;
  hasNextWord?: boolean;
  onOpenWorksheet?: (item: VocabItem) => void;
}

interface CharData {
  strokes: string[];
  medians: number[][][];
  radStrokes?: number[];
}

export function StrokeOrderModal({
  isOpen,
  onClose,
  item,
  onPrevWord,
  onNextWord,
  hasPrevWord = false,
  hasNextWord = false,
  onOpenWorksheet,
}: StrokeOrderModalProps) {
  const { effectiveTheme } = useTheme();

  // Extract individual Chinese characters from the word
  const characters = React.useMemo(() => {
    if (!item?.hanzi) return [];
    // Filter to Hanzi / CJK characters only (skip punctuation, latin, etc.)
    return Array.from(item.hanzi).filter((char) =>
      /[\u4e00-\u9fa5\u3400-\u4dbf]/.test(char)
    );
  }, [item?.hanzi]);

  const [selectedCharIndex, setSelectedCharIndex] = useState(0);
  const currentChar = characters[selectedCharIndex] || characters[0] || '';

  // Mode: 'animate' (guide) | 'quiz' (interactive practice)
  const [activeMode, setActiveMode] = useState<'animate' | 'quiz'>('animate');

  // Animation Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1.0);
  const [showOutline, setShowOutline] = useState(true);
  const [highlightRadical, setHighlightRadical] = useState(true);
  const [gridStyle, setGridStyle] = useState<'mi' | 'tian' | 'none'>('mi');

  // Quiz State
  const [quizComplete, setQuizComplete] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [currentStrokeNum, setCurrentStrokeNum] = useState(0);

  // Data & Error State
  const [charData, setCharData] = useState<CharData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<any>(null);

  // Reset selected character when word changes
  useEffect(() => {
    setSelectedCharIndex(0);
    setQuizComplete(false);
    setMistakeCount(0);
  }, [item?.id]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrevWord && !e.altKey && !e.metaKey) onPrevWord?.();
      if (e.key === 'ArrowRight' && hasNextWord && !e.altKey && !e.metaKey) onNextWord?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hasPrevWord, hasNextWord, onPrevWord, onNextWord]);

  // Fetch character stroke data
  useEffect(() => {
    if (!currentChar) return;
    setLoadingData(true);
    setDataError(null);

    fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(currentChar)}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Không có sẵn dữ liệu nét cho chữ này');
        return res.json();
      })
      .then((data: CharData) => {
        setCharData(data);
        setLoadingData(false);
      })
      .catch((err) => {
        setDataError(err.message || 'Lỗi tải nét chữ');
        setCharData(null);
        setLoadingData(false);
      });
  }, [currentChar]);

  // Create & mount HanziWriter instance
  useEffect(() => {
    if (!isOpen || !containerRef.current || !currentChar) return;

    // Clean container before creating writer
    containerRef.current.innerHTML = '';

    const isDark = effectiveTheme === 'dark';
    const strokeColor = isDark ? '#f4f4f5' : '#0f172a';
    const outlineColor = isDark ? '#3f3f46' : '#cbd5e1';
    const radicalColor = '#10b981'; // Emerald radical highlight
    const highlightColor = '#f59e0b'; // Amber

    try {
      const writer = HanziWriter.create(containerRef.current, currentChar, {
        width: 250,
        height: 250,
        padding: 16,
        showOutline: showOutline,
        strokeAnimationSpeed: animationSpeed,
        delayBetweenStrokes: 180,
        strokeColor: strokeColor,
        radicalColor: highlightRadical ? radicalColor : strokeColor,
        outlineColor: outlineColor,
        highlightColor: highlightColor,
        showCharacter: activeMode === 'animate',
        showHintAfterMisses: 2,
        highlightOnComplete: true,
        charDataLoader: (char, onComplete, onError) => {
          fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`)
            .then((r) => {
              if (!r.ok) throw new Error('Not found');
              return r.json();
            })
            .then((d) => onComplete(d))
            .catch((e) => onError(e));
        },
      });

      writerRef.current = writer;

      if (activeMode === 'animate') {
        setIsPlaying(true);
        writer.animateCharacter({
          onComplete: () => {
            setIsPlaying(false);
            if (isLooping) {
              setTimeout(() => {
                writerRef.current?.animateCharacter();
              }, 800);
            }
          },
        });
      } else {
        // Quiz mode
        setQuizComplete(false);
        setMistakeCount(0);
        setCurrentStrokeNum(1);

        writer.quiz({
          onMistake: () => {
            setMistakeCount((c) => c + 1);
          },
          onCorrectStroke: (data: any) => {
            setCurrentStrokeNum(data.strokeNum + 2);
          },
          onComplete: () => {
            setQuizComplete(true);
          },
        });
      }
    } catch (e) {
      console.error('HanziWriter init error:', e);
    }

    return () => {
      if (writerRef.current) {
        try {
          writerRef.current.cancelQuiz();
        } catch {}
      }
    };
  }, [
    isOpen,
    currentChar,
    activeMode,
    effectiveTheme,
    animationSpeed,
    showOutline,
    highlightRadical,
    isLooping,
  ]);

  // Animation Controls Handlers
  const handlePlayPause = useCallback(() => {
    if (!writerRef.current) return;
    if (isPlaying) {
      writerRef.current.pauseAnimation();
      setIsPlaying(false);
    } else {
      writerRef.current.resumeAnimation();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleReplay = useCallback(() => {
    if (!writerRef.current) return;
    setIsPlaying(true);
    writerRef.current.animateCharacter({
      onComplete: () => setIsPlaying(false),
    });
  }, []);

  const handleRestartQuiz = useCallback(() => {
    if (!writerRef.current) return;
    setQuizComplete(false);
    setMistakeCount(0);
    setCurrentStrokeNum(1);
    try {
      writerRef.current.cancelQuiz();
    } catch {}
    writerRef.current.quiz({
      onMistake: () => {
        setMistakeCount((c) => c + 1);
      },
      onCorrectStroke: (data: any) => {
        setCurrentStrokeNum(data.strokeNum + 2);
      },
      onComplete: () => {
        setQuizComplete(true);
      },
    });
  }, []);

  if (!isOpen || !item) return null;

  const totalStrokes = charData?.strokes?.length || 0;
  const radicalStrokes = charData?.radStrokes || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-scaleIn ring-1 ring-black/5 dark:ring-white/10">
        
        {/* TOP HEADER: Word Title, Pinyin, Meaning & Controls */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
              <PenTool size={18} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-hanzi text-xl font-bold text-slate-900 dark:text-white leading-none">
                  {item.hanzi}
                </span>
                <span className="font-pinyin text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {item.pinyin}
                </span>
                <button
                  type="button"
                  onClick={() => tts.speak(item.hanzi)}
                  className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
                  title="Nghe phát âm"
                >
                  <Volume2 size={14} />
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">
                {item.meaning}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Printable Worksheet Shortcut Button */}
            <a
              href={`/worksheet?word=${encodeURIComponent(item.hanzi)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Mở Xưởng Phiếu Viết Chữ Hán A4 cho từ này (Mở tab mới)"
            >
              <Printer size={13} className="text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">Tạo phiếu viết</span>
            </a>

            {/* HSK Level Badge */}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              HSK {item.hskLevel}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CHARACTER TABS (If word has multiple characters, e.g. 学习 -> [学] [习]) */}
        {characters.length > 1 && (
          <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
              Chọn chữ để xem:
            </span>
            {characters.map((char, idx) => {
              const isSelected = idx === selectedCharIndex;
              return (
                <button
                  key={`${char}-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedCharIndex(idx);
                    setQuizComplete(false);
                    setMistakeCount(0);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold font-hanzi flex items-center gap-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs scale-102 ring-2 ring-emerald-300 dark:ring-emerald-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{char}</span>
                  <span className="text-[10px] opacity-75 font-sans font-normal">
                    (Chữ {idx + 1})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* MAIN BODY: Writing Canvas & Interactive Controls */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveMode('animate')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  activeMode === 'animate'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Play size={13} />
                <span>Xem thứ tự bút thuận</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('quiz')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  activeMode === 'quiz'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PenTool size={13} />
                <span>Tự luyện viết (Chấm điểm)</span>
              </button>
            </div>

            {/* Quick Stats: Total strokes and radical */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                Tổng số: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{totalStrokes}</strong> nét
              </span>
              {radicalStrokes.length > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 font-medium text-emerald-700 dark:text-emerald-300">
                  Bộ thủ: <strong className="font-bold">{radicalStrokes.length}</strong> nét
                </span>
              )}
            </div>
          </div>

          {/* MAIN WRITING CANVAS SECTION */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* The Grid Box (Mễ Điền Cách / Rice Grid Canvas) */}
            <div className="relative w-[260px] h-[260px] rounded-2xl bg-white dark:bg-slate-950 border-2 border-rose-300/80 dark:border-rose-900/60 shadow-lg flex items-center justify-center overflow-hidden shrink-0 group">
              {/* Rice Grid (米字格) SVG Overlay */}
              {gridStyle === 'mi' && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                  <line x1="0" y1="0" x2="100" y2="100" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="100" y1="0" x2="0" y2="100" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                  <rect x="0" y="0" width="100" height="100" fill="none" stroke="#f87171" strokeWidth="1.2" opacity="0.5" />
                </svg>
              )}

              {/* Field Grid (田字格) SVG Overlay */}
              {gridStyle === 'tian' && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                  <rect x="0" y="0" width="100" height="100" fill="none" stroke="#f87171" strokeWidth="1.2" opacity="0.5" />
                </svg>
              )}

              {/* HanziWriter Root DOM Mounting Point */}
              <div
                ref={containerRef}
                className={`relative z-10 ${
                  activeMode === 'quiz' ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />

              {/* Loading State */}
              {loadingData && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                  <RefreshCw size={24} className="animate-spin text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Đang tải nét chữ {currentChar}...
                  </span>
                </div>
              )}

              {/* Error State */}
              {dataError && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center z-20">
                  <span className="font-hanzi text-5xl font-bold text-slate-900 dark:text-white mb-2">
                    {currentChar}
                  </span>
                  <span className="text-xs text-slate-500">
                    Chữ Hán chuẩn Unicode (chưa có vector bút thuận)
                  </span>
                </div>
              )}

              {/* Quiz Completion Overlay */}
              {activeMode === 'quiz' && quizComplete && (
                <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-20 animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-lg">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="text-base font-bold text-white mb-0.5">
                    Xuất sắc!
                  </h4>
                  <p className="text-xs text-emerald-200 mb-3">
                    Đã hoàn thành chữ <strong className="font-hanzi text-sm">{currentChar}</strong> ({totalStrokes} nét)
                    {mistakeCount === 0 ? ' • 0 lỗi sai!' : ` • ${mistakeCount} lần sửa`}
                  </p>
                  <button
                    type="button"
                    onClick={handleRestartQuiz}
                    className="px-4 py-1.5 bg-white text-emerald-900 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md hover:bg-emerald-50"
                  >
                    Viết lại lần nữa
                  </button>
                </div>
              )}
            </div>

            {/* SIDE CONTROLS & SETTINGS */}
            <div className="flex-1 w-full space-y-3.5">
              {/* Animation Mode Controls */}
              {activeMode === 'animate' ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sliders size={13} className="text-emerald-600" />
                    Điều khiển diễn họa
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handlePlayPause}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm shadow-emerald-600/20"
                    >
                      {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                      <span>{isPlaying ? 'Tạm dừng' : 'Phát nét viết'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReplay}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      <RotateCcw size={13} />
                      <span>Viết lại từ đầu</span>
                    </button>
                  </div>

                  {/* Speed Controls */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <span>Tốc độ nét bút:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{animationSpeed}x</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { val: 0.5, label: '0.5x (Chậm)' },
                        { val: 1.0, label: '1.0x (Chuẩn)' },
                        { val: 1.5, label: '1.5x (Nhanh)' },
                      ].map((spd) => (
                        <button
                          key={spd.val}
                          type="button"
                          onClick={() => setAnimationSpeed(spd.val)}
                          className={`py-1 text-center rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                            animationSpeed === spd.val
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {spd.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Options: Outline, Radical, Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowOutline(!showOutline)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1 ${
                        showOutline
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      {showOutline ? <Eye size={14} /> : <EyeOff size={14} />}
                      <span className="text-[10px] font-semibold">Nét mờ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHighlightRadical(!highlightRadical)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1 ${
                        highlightRadical
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span className="text-[10px] font-semibold">Bộ thủ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGridStyle(gridStyle === 'mi' ? 'tian' : gridStyle === 'tian' ? 'none' : 'mi')}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1 ${
                        gridStyle !== 'none'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <Grid size={14} />
                      <span className="text-[10px] font-semibold">
                        {gridStyle === 'mi' ? 'Ô Mễ (米)' : gridStyle === 'tian' ? 'Ô Điền (田)' : 'Không lưới'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Quiz Mode Instructions & State */
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <PenTool size={13} className="text-emerald-600" />
                    Chế độ tự luyện viết
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <HelpCircle size={13} />
                      Hướng dẫn luyện viết:
                    </p>
                    <ul className="text-[11px] list-disc list-inside space-y-0.5 text-emerald-800/90 dark:text-emerald-300/90">
                      <li>Dùng chuột hoặc ngón tay để vẽ từng nét vào ô Mễ điền.</li>
                      <li>Vẽ đúng nét $\rightarrow$ tự động chuyển nét tiếp theo.</li>
                      <li>Hệ thống sẽ gợi ý nhấp nháy nét nếu vẽ sai 2 lần.</li>
                    </ul>
                  </div>

                  {/* Quiz Live Stats */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70">
                      <div className="text-[10.5px] text-slate-400">Tiến trình nét</div>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {currentStrokeNum} / {totalStrokes}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70">
                      <div className="text-[10.5px] text-slate-400">Số lần viết sai</div>
                      <div className={`text-base font-bold mt-0.5 ${mistakeCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {mistakeCount}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRestartQuiz}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Xóa bảng & Viết lại từ đầu</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STEP-BY-STEP STROKE BREAKDOWN (Dải phân giải từng nét một) */}
          {charData?.strokes && charData.strokes.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-emerald-600" />
                  Bảng phân giải thứ tự từng nét ({charData.strokes.length} bước)
                </span>
                <span className="text-[10.5px] text-slate-400 font-normal">
                  Từ nét 1 đến hoàn chỉnh
                </span>
              </div>

              {/* Progressive stroke SVG cards row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
                {charData.strokes.map((_, strokeIdx) => {
                  const isCurrent = currentStrokeNum === strokeIdx + 1;
                  return (
                    <div
                      key={`step-${strokeIdx}`}
                      className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl border bg-white dark:bg-slate-950 transition-all ${
                        isCurrent
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Mini Rice Grid SVG */}
                      <div className="relative w-12 h-12 bg-rose-50/40 dark:bg-rose-950/20 rounded-lg overflow-hidden flex items-center justify-center border border-rose-200/50 dark:border-rose-900/30">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                          <line x1="0" y1="0" x2="100" y2="100" stroke="#fca5a5" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5" />
                          <line x1="100" y1="0" x2="0" y2="100" stroke="#fca5a5" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5" />
                          <line x1="50" y1="0" x2="50" y2="100" stroke="#fca5a5" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="#fca5a5" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5" />
                        </svg>

                        {/* Render progressive strokes up to strokeIdx */}
                        <svg className="w-10 h-10 transform scale-y-[-1] translate-y-[-100%]" viewBox="0 0 1024 1024">
                          {charData.strokes.slice(0, strokeIdx + 1).map((pathD, pIdx) => {
                            const isLatestStroke = pIdx === strokeIdx;
                            const isRadical = radicalStrokes.includes(pIdx);
                            return (
                              <path
                                key={`path-${pIdx}`}
                                d={pathD}
                                fill={
                                  isLatestStroke
                                    ? '#ef4444' // Latest stroke in vibrant red
                                    : isRadical
                                    ? '#10b981' // Radical in emerald
                                    : effectiveTheme === 'dark'
                                    ? '#f4f4f5'
                                    : '#1e293b'
                                }
                              />
                            );
                          })}
                        </svg>
                      </div>

                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        Nét {strokeIdx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR: Word Navigation & Close */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasPrevWord}
              onClick={onPrevWord}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs"
            >
              <ChevronLeft size={14} />
              <span>Từ trước</span>
            </button>

            <button
              type="button"
              disabled={!hasNextWord}
              onClick={onNextWord}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs"
            >
              <span>Từ tiếp theo</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default StrokeOrderModal;
