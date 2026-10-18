'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Settings2,
  Check,
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  Grid,
  Palette,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Maximize2,
  Sliders,
  AlignJustify,
  PenTool,
  Plus,
  Trash2,
} from 'lucide-react';
import { VocabItem, Deck } from '@/types/vocabulary';
import { useToast } from '@/context/ToastContext';

interface HanziWorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredItems: VocabItem[];
  allDeckItems: VocabItem[];
  currentDeck: Deck;
  preselectedItem?: VocabItem | null;
}

export interface WorksheetWordItem {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  hskLevel: number;
}

interface PracticeRow {
  id: string;
  hanzi: string;
  wordHanzi: string;
  pinyin: string;
  meaning: string;
  hskLevel: number;
  lineIndex: number;
  totalLines: number;
  isFollowUpLine: boolean;
  isBlank: boolean;
}

type GridStyleType = 'mi' | 'tian' | 'hui' | 'kou';
type GridColorType = 'red' | 'gray' | 'emerald' | 'blue';

interface GridColorConfig {
  main: string;
  border: string;
  cross: string;
  sub: string;
  bg: string;
  pinyinColor: string;
  name: string;
}

/**
 * Reusable Vector Hanzi Grid Component (米字格, 田字格, 回字格, 方格)
 * Uses vectorEffect="non-scaling-stroke" to ensure sharp, crisp lines regardless of scale
 */
const HanziGridSvg = React.memo(function HanziGridSvg({
  style,
  colorConfig,
}: {
  style: GridStyleType;
  colorConfig: GridColorConfig;
}) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Outer Square Border */}
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        fill="none"
        stroke={colorConfig.border}
        strokeWidth="2.2"
        vectorEffect="non-scaling-stroke"
      />

      {/* Cross Center Lines (+) for 'mi' and 'tian' */}
      {(style === 'mi' || style === 'tian') && (
        <>
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke={colorConfig.cross}
            strokeWidth="1.3"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="50"
            y1="0"
            x2="50"
            y2="100"
            stroke={colorConfig.cross}
            strokeWidth="1.3"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* Diagonal Lines (X) ONLY for 'mi' (米字格) */}
      {style === 'mi' && (
        <>
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            stroke={colorConfig.sub}
            strokeWidth="1.2"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke={colorConfig.sub}
            strokeWidth="1.2"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* Inner Concentric Square for 'hui' (回字格) */}
      {style === 'hui' && (
        <rect
          x="26"
          y="26"
          width="48"
          height="48"
          fill="none"
          stroke={colorConfig.cross}
          strokeWidth="1.4"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
});

export function HanziWorksheetModal({
  isOpen,
  onClose,
  filteredItems,
  allDeckItems,
  currentDeck,
  preselectedItem,
}: HanziWorksheetModalProps) {
  const toast = useToast();

  // 1. Scope & Custom Input Settings
  const [scope, setScope] = useState<'filtered' | 'all' | 'favorites' | 'custom' | 'single'>(
    preselectedItem ? 'single' : 'filtered'
  );
  const [customRawInput, setCustomRawInput] = useState<string>(
    '你好 | nǐhǎo | Xin chào\n谢谢 | xièxie | Cảm ơn\n再见 | zàijiàn | Tạm biệt\n学习 | xuéxí | Học tập'
  );

  const [maxWords, setMaxWords] = useState<number>(24);
  const [isAllWords, setIsAllWords] = useState<boolean>(false);
  const [customWordCount, setCustomWordCount] = useState<string>('24');
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(0);
  const [practiceMode, setPracticeMode] = useState<'character' | 'word'>('character');

  // 2. Page Density & Rows Configuration
  const [rowsPerPage, setRowsPerPage] = useState<number>(12); // 10, 12 (default standard), 14, 16
  const [rowsPerChar, setRowsPerChar] = useState<number | 'full_page'>(1); // 1, 2, 3, or 'full_page'
  const [fillBlankRows, setFillBlankRows] = useState<boolean>(true); // Auto-fill last page with blank grids to prevent empty bottom void

  // 3. Grid & Styling Settings
  const [gridStyle, setGridStyle] = useState<GridStyleType>('mi');
  const [gridColorTheme, setGridColorTheme] = useState<GridColorType>('red');
  const [traceCount, setTraceCount] = useState<number>(2); // 0, 1, 2, or 3 faint trace cells
  const [cellsPerRow, setCellsPerRow] = useState<number>(12); // 10, 12 (standard A4), or 14 practice cells

  // 4. Header & Content Elements Toggle
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showHskLevel, setShowHskLevel] = useState(true);

  // 5. Custom Header Text
  const [worksheetTitle, setWorksheetTitle] = useState(
    currentDeck ? `PHIẾU TẬP VIẾT CHỮ HÁN — ${currentDeck.name.toUpperCase()}` : 'PHIẾU TẬP VIẾT CHỮ HÁN'
  );
  const [worksheetSubtitle, setWorksheetSubtitle] = useState(
    'Luyện viết theo chuẩn ô Mễ điền (米字格) • Nét Khải thư tiêu chuẩn'
  );

  // Sync preselectedItem when it changes
  useEffect(() => {
    if (preselectedItem) {
      setScope('single');
    }
  }, [preselectedItem]);

  // Dynamic Color Definitions (High-contrast, saturated borders and distinct inner lines)
  const colorConfig: GridColorConfig = useMemo(() => {
    switch (gridColorTheme) {
      case 'gray':
        return {
          main: '#334155',
          border: '#475569',
          cross: '#64748b',
          sub: '#94a3b8',
          bg: '#f8fafc',
          pinyinColor: '#334155',
          name: 'Xám tiết kiệm mực',
        };
      case 'emerald':
        return {
          main: '#047857',
          border: '#059669',
          cross: '#10b981',
          sub: '#34d399',
          bg: '#ecfdf5',
          pinyinColor: '#047857',
          name: 'Xanh ngọc trang nhã',
        };
      case 'blue':
        return {
          main: '#1d4ed8',
          border: '#2563eb',
          cross: '#3b82f6',
          sub: '#60a5fa',
          bg: '#eff6ff',
          pinyinColor: '#1d4ed8',
          name: 'Xanh mực bút máy',
        };
      case 'red':
      default:
        return {
          main: '#b91c1c',
          border: '#dc2626',
          cross: '#ef4444',
          sub: '#f87171',
          bg: '#fef2f2',
          pinyinColor: '#b91c1c',
          name: 'Đỏ son truyền thống',
        };
    }
  }, [gridColorTheme]);

  // Dimensions & Scale Config based on rowsPerPage
  const sizeConfig = useMemo(() => {
    switch (rowsPerPage) {
      case 10:
        return {
          previewCellPx: 44,
          previewFontClass: 'text-2xl',
          printCellPx: 48,
          printFontClass: 'text-3xl',
          previewRowGapClass: 'gap-2',
          printRowGapClass: 'gap-2.5',
          previewMetaWidth: 'w-24',
          printMetaWidth: 'w-28',
          previewCellPadding: 'pb-1.5',
          printCellPadding: 'pb-2',
        };
      case 14:
        return {
          previewCellPx: 33,
          previewFontClass: 'text-lg',
          printCellPx: 38,
          printFontClass: 'text-xl',
          previewRowGapClass: 'gap-1',
          printRowGapClass: 'gap-1.5',
          previewMetaWidth: 'w-20',
          printMetaWidth: 'w-24',
          previewCellPadding: 'pb-1',
          printCellPadding: 'pb-1.5',
        };
      case 16:
        return {
          previewCellPx: 29,
          previewFontClass: 'text-base',
          printCellPx: 34,
          printFontClass: 'text-lg',
          previewRowGapClass: 'gap-0.5',
          printRowGapClass: 'gap-1',
          previewMetaWidth: 'w-20',
          printMetaWidth: 'w-22',
          previewCellPadding: 'pb-0.5',
          printCellPadding: 'pb-1',
        };
      case 12:
      default:
        return {
          previewCellPx: 38,
          previewFontClass: 'text-xl',
          printCellPx: 42,
          printFontClass: 'text-2xl',
          previewRowGapClass: 'gap-1.5',
          printRowGapClass: 'gap-2',
          previewMetaWidth: 'w-22',
          printMetaWidth: 'w-26',
          previewCellPadding: 'pb-1.5',
          printCellPadding: 'pb-2',
        };
    }
  }, [rowsPerPage]);

  // Maximum safe words per export to ensure instantaneous rendering and prevent browser freeze
  const MAX_SAFE_WORKSHEET_WORDS = 60; // ~5-6 pages A4

  // Quick lookup dictionary only when in custom scope to auto-enrich Pinyin & Meaning
  const deckLookupMap = useMemo(() => {
    if (scope !== 'custom') return new Map<string, VocabItem>();
    const map = new Map<string, VocabItem>();
    allDeckItems.forEach((item) => {
      if (item.hanzi) {
        map.set(item.hanzi.trim(), item);
      }
    });
    return map;
  }, [scope, allDeckItems]);

  // Parse custom raw input text into WorksheetWordItems
  const customParsedItems = useMemo<WorksheetWordItem[]>(() => {
    if (!customRawInput || !customRawInput.trim()) return [];

    const lines = customRawInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: WorksheetWordItem[] = [];

    lines.forEach((line, lineIdx) => {
      // 1. If line has delimiter (|, tab, ;, or -)
      if (line.includes('|') || line.includes('\t') || line.includes(';') || line.includes(' - ')) {
        const parts = line.split(/[|\t;]|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
        const hanzi = parts[0] || '';
        let pinyin = parts[1] || '';
        let meaning = parts[2] || '';

        // Auto-lookup if pinyin/meaning not provided
        if (hanzi && (!pinyin || !meaning)) {
          const match = deckLookupMap.get(hanzi);
          if (match) {
            if (!pinyin) pinyin = match.pinyin;
            if (!meaning) meaning = match.meaning;
          }
        }

        if (hanzi) {
          parsed.push({
            id: `custom-${lineIdx}-${hanzi}`,
            hanzi,
            pinyin,
            meaning,
            hskLevel: 1,
          });
        }
      } else {
        // 2. Line might be space-separated words, or comma-separated, or single word/sentence
        const tokens = line.split(/[\s,，、]+/).map((t) => t.trim()).filter(Boolean);

        tokens.forEach((token, tIdx) => {
          let pinyin = '';
          let meaning = '';
          const match = deckLookupMap.get(token);
          if (match) {
            pinyin = match.pinyin;
            meaning = match.meaning;
          }

          parsed.push({
            id: `custom-${lineIdx}-${tIdx}-${token}`,
            hanzi: token,
            pinyin,
            meaning,
            hskLevel: match?.hskLevel || 1,
          });
        });
      }
    });

    return parsed;
  }, [customRawInput, deckLookupMap]);

  // Total count of source items before slicing
  const totalSourceCount = useMemo(() => {
    if (scope === 'single') return 1;
    if (scope === 'custom') return customParsedItems.length;
    if (scope === 'filtered') return filteredItems.length;
    if (scope === 'favorites') return allDeckItems.filter((i) => i.favorite).length;
    return allDeckItems.length;
  }, [scope, customParsedItems, filteredItems, allDeckItems]);

  // Filter items based on selected scope with safe limit
  const targetWords = useMemo<WorksheetWordItem[]>(() => {
    if (scope === 'single' && preselectedItem) {
      return [preselectedItem];
    }
    if (scope === 'custom') {
      return isAllWords
        ? customParsedItems.slice(0, MAX_SAFE_WORKSHEET_WORDS)
        : customParsedItems.slice(0, Math.min(maxWords, MAX_SAFE_WORKSHEET_WORDS));
    }
    let sourceList: VocabItem[] = [];
    if (scope === 'filtered') sourceList = filteredItems;
    else if (scope === 'favorites') sourceList = allDeckItems.filter((i) => i.favorite);
    else sourceList = allDeckItems;

    if (isAllWords) {
      return sourceList.slice(0, MAX_SAFE_WORKSHEET_WORDS);
    }
    return sourceList.slice(0, Math.min(maxWords, MAX_SAFE_WORKSHEET_WORDS));
  }, [scope, preselectedItem, filteredItems, allDeckItems, maxWords, isAllWords, customParsedItems]);

  // Expand into practice entries (each Hanzi character gets a row, supporting multiple rows per char)
  const practiceRows = useMemo(() => {
    const rows: PracticeRow[] = [];

    targetWords.forEach((item) => {
      let chars: string[] = [];
      if (practiceMode === 'word') {
        chars = [item.hanzi];
      } else {
        const extracted = Array.from(item.hanzi).filter((c) =>
          /[\u4e00-\u9fa5\u3400-\u4dbf]/.test(c)
        );
        chars = extracted.length > 0 ? extracted : [item.hanzi];
      }

      chars.forEach((char, charIdx) => {
        const repeatCount = rowsPerChar === 'full_page' ? rowsPerPage : Number(rowsPerChar);

        for (let line = 1; line <= repeatCount; line++) {
          rows.push({
            id: `${item.id}-char-${charIdx}-line-${line}`,
            hanzi: char,
            wordHanzi: item.hanzi,
            pinyin: item.pinyin,
            meaning: item.meaning,
            hskLevel: item.hskLevel,
            lineIndex: line,
            totalLines: repeatCount,
            isFollowUpLine: line > 1,
            isBlank: false,
          });
        }
      });
    });

    return rows;
  }, [targetWords, practiceMode, rowsPerChar, rowsPerPage]);

  // Paginate into pages (based on rowsPerPage, and auto-fill last page if enabled)
  const pages = useMemo(() => {
    const p: PracticeRow[][] = [];
    for (let i = 0; i < practiceRows.length; i += rowsPerPage) {
      const pageSlice = practiceRows.slice(i, i + rowsPerPage);

      // If fillBlankRows is active and the last page has empty lines, fill them up with blank grids
      if (fillBlankRows && pageSlice.length < rowsPerPage) {
        const missingCount = rowsPerPage - pageSlice.length;
        const filled = [...pageSlice];
        for (let k = 0; k < missingCount; k++) {
          filled.push({
            id: `blank-row-${i}-${k}`,
            hanzi: '',
            wordHanzi: '',
            pinyin: '',
            meaning: '',
            hskLevel: 0,
            lineIndex: 1,
            totalLines: 1,
            isFollowUpLine: false,
            isBlank: true,
          });
        }
        p.push(filled);
      } else {
        p.push(pageSlice);
      }
    }
    return p.length > 0 ? p : [[]];
  }, [practiceRows, rowsPerPage, fillBlankRows]);

  // Safe page index clamped between 0 and pages.length - 1
  const safePageIndex = Math.min(Math.max(0, previewPageIndex), Math.max(0, pages.length - 1));

  // Reset or adjust preview page index when pages count changes
  useEffect(() => {
    if (previewPageIndex >= pages.length && pages.length > 0) {
      setPreviewPageIndex(pages.length - 1);
    }
  }, [pages.length, previewPageIndex]);

  // Listen for browser print events (Ctrl+P / Cmd+P or print dialog)
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforePrint = () => {
      document.body.classList.add('worksheet-printing');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('worksheet-printing');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('worksheet-printing');
    };
  }, [isOpen]);

  // Trigger high-res browser print / Save to PDF
  const handlePrint = () => {
    if (practiceRows.length === 0) {
      toast.warning('Không có từ vựng nào để in phiếu!');
      return;
    }
    document.body.classList.add('worksheet-printing');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('worksheet-printing');
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. INTERACTIVE CONFIGURATION & PREVIEW MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 sm:p-5 animate-fadeIn no-print">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 max-w-7xl w-full h-[94vh] max-h-[960px] overflow-hidden flex flex-col animate-scaleIn">
          
          {/* TOP HEADER */}
          <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: `${colorConfig.border}15`, color: colorConfig.border }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs shrink-0 transition-colors"
              >
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Xuất Phiếu Tập Viết Chữ Hán Khổ A4</span>
                  <span
                    style={{
                      backgroundColor: `${colorConfig.border}20`,
                      color: colorConfig.border,
                    }}
                    className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full transition-colors"
                  >
                    PDF Chuẩn In Ấn
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lưới {gridStyle === 'mi' ? 'Mễ điền (米字格)' : gridStyle === 'tian' ? 'Điền tự (田字格)' : gridStyle === 'hui' ? 'Hồi tự (回字格)' : 'Ô vuông (方格)'} • Màu {colorConfig.name} • {rowsPerPage} dòng/trang.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                style={{ backgroundColor: colorConfig.border }}
                className="flex items-center gap-2 px-5 py-2.5 hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md btn-press"
              >
                <Printer size={15} />
                <span>In ngay / Lưu PDF ({pages.length} trang)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MAIN TWO-COLUMN WORKSPACE: LEFT CONTROLS, RIGHT A4 PREVIEW */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT COLUMN: CUSTOMIZATION SETTINGS PANEL */}
            <div className="w-full md:w-88 lg:w-98 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 p-5 overflow-y-auto space-y-5 shrink-0 scrollbar-thin">
              
              {/* SECTION 1: Scope Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Nguồn từ vựng đưa vào phiếu:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScope('filtered');
                      setIsAllWords(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                      scope === 'filtered'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Đang lọc trên bảng</div>
                    <div className="text-[10.5px] opacity-75">{filteredItems.length} từ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScope('all');
                      setIsAllWords(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                      scope === 'all'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Toàn bộ bài học</div>
                    <div className="text-[10.5px] opacity-75">{allDeckItems.length} từ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScope('favorites');
                      setIsAllWords(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                      scope === 'favorites'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold">⭐ Từ yêu thích</div>
                    <div className="text-[10.5px] opacity-75">{allDeckItems.filter((i) => i.favorite).length} từ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScope('custom');
                      setIsAllWords(true);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                      scope === 'custom'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>✍️ Tự nhập từ ngoài</span>
                    </div>
                    <div className="text-[10.5px] opacity-75">
                      {customParsedItems.length > 0 ? `${customParsedItems.length} từ nhận diện` : 'Dán chữ Hán tùy ý'}
                    </div>
                  </button>
                </div>

                {/* DEDICATED CUSTOM INPUT TEXTAREA (When scope === 'custom') */}
                {scope === 'custom' && (
                  <div className="mt-3 p-3.5 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                        <PenTool size={13} />
                        Nhập hoặc dán chữ Hán / từ vựng:
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200">
                        {customParsedItems.length} từ
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      value={customRawInput}
                      onChange={(e) => setCustomRawInput(e.target.value)}
                      placeholder={`Dán chữ Hán vào đây, ví dụ:\n你好 谢谢 再见 老师 苹果\nHoặc định dạng: Chữ | Pinyin | Nghĩa\n学习 | xuéxí | Học tập\n朋友 | péngyou | Bạn bè`}
                      className="w-full p-2.5 text-xs font-sans bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none leading-relaxed"
                    />

                    {/* Quick Sample Presets Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">Mẫu nhanh:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomRawInput(
                            '你好 | nǐhǎo | Xin chào\n谢谢 | xièxie | Cảm ơn\n再见 | zàijiàn | Tạm biệt\n对不起 | duìbuqǐ | Xin lỗi\n没关系 | méiguānxi | Không sao\n早上好 | zǎoshang hǎo | Chào buổi sáng'
                          )
                        }
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        Giao tiếp
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCustomRawInput(
                            '一 | yī | Số 1\n二 | èr | Số 2\n三 | sān | Số 3\n四 | sì | Số 4\n五 | wǔ | Số 5\n六 | liù | Số 6\n七 | qī | Số 7\n八 | bā | Số 8\n九 | jiǔ | Số 9\n十 | shí | Số 10'
                          )
                        }
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        Số đếm (1-10)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCustomRawInput(
                            '爸爸 | bàba | Bố\n妈妈 | māma | Mẹ\n哥哥 | gēge | Anh trai\n姐姐 | jiějie | Chị gái\n弟弟 | dìdi | Em trai\n妹妹 | mèimei | Em gái'
                          )
                        }
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        Gia đình
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCustomRawInput(
                            '一心一意 | yī xīn yī yì | Toàn tâm toàn ý\n万事如意 | wàn shì rú yì | Vạn sự như ý\n马到成功 | mǎ dào chéng gōng | Mã đáo thành công\n自强不息 | zì qiáng bù xī | Tự lực tự cường'
                          )
                        }
                        className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        Thành ngữ 4 chữ
                      </button>

                      {customRawInput && (
                        <button
                          type="button"
                          onClick={() => setCustomRawInput('')}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-auto"
                        >
                          Xóa hết
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      💡 Mẹo: Hệ thống tự động tra cứu từ điển HSK để điền Pinyin & Nghĩa nếu bạn chỉ dán chữ Hán!
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 2: Quantity Selection & Custom Word Count */}
              {scope !== 'single' && (
                <div className="space-y-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span>Số lượng từ xuất:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {isAllWords
                        ? `Tất cả (${targetWords.length} từ${totalSourceCount > MAX_SAFE_WORKSHEET_WORDS ? ` / tối đa ${MAX_SAFE_WORKSHEET_WORDS}` : ''})`
                        : `${targetWords.length} từ`}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-1.5">
                    {[12, 24, 36, 48].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setMaxWords(num);
                          setIsAllWords(false);
                          setCustomWordCount(String(num));
                        }}
                        className={`py-1.5 text-center rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          !isAllWords && maxWords === num
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsAllWords(true)}
                      className={`py-1.5 text-center rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        isAllWords
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title={`Xuất tất cả (Tối đa ${MAX_SAFE_WORKSHEET_WORDS} từ / ~5 trang A4 để tránh đơ máy)`}
                    >
                      Tất cả
                    </button>
                  </div>

                  {/* Custom Numeric Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">Hoặc nhập số từ:</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={customWordCount}
                      onChange={(e) => {
                        setCustomWordCount(e.target.value);
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                          setMaxWords(Math.min(val, MAX_SAFE_WORKSHEET_WORDS));
                          setIsAllWords(false);
                        }
                      }}
                      className="w-20 px-2 py-1 text-xs text-center font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
                    />
                    <span className="text-[11px] text-slate-400">từ (tối đa {MAX_SAFE_WORKSHEET_WORDS})</span>
                  </div>

                  {totalSourceCount > MAX_SAFE_WORKSHEET_WORDS && isAllWords && (
                    <div className="text-[10.5px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2 rounded-xl leading-relaxed">
                      ⚡ Nguồn hiện có {totalSourceCount} từ. Hệ thống tự động giới hạn 60 từ đầu tiên (~5 trang A4) để đảm bảo in ấn mượt mà và không làm đơ trình duyệt.
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: Practice Mode (Single Chars vs Compound Words) */}
              <div className="space-y-1.5 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>Chế độ phân tách từ vựng:</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPracticeMode('character')}
                    className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                      practiceMode === 'character'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Từng chữ đơn</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Tách từng chữ Hán để rèn nét</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPracticeMode('word')}
                    className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                      practiceMode === 'word'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Cả từ ghép</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Giữ nguyên từ ghép 2-4 chữ</div>
                  </button>
                </div>
              </div>

              {/* SECTION 4: Rows Density & Layout */}
              <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlignJustify size={14} className="text-rose-600" />
                  <span>Mật độ & Số dòng trên 1 trang A4</span>
                </div>

                {/* Rows per page selector */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { count: 10, label: '10 dòng', desc: 'Ô lớn' },
                    { count: 12, label: '12 dòng', desc: 'Chuẩn A4' },
                    { count: 14, label: '14 dòng', desc: 'Dày/Tiết kiệm' },
                    { count: 16, label: '16 dòng', desc: 'Siêu dày' },
                  ].map((item) => (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => setRowsPerPage(item.count)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                        rowsPerPage === item.count
                          ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[9.5px] opacity-70 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Rows per Hanzi (Lặp lại dòng cho 1 chữ) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <span>Số dòng luyện cho mỗi chữ:</span>
                    <span className="text-rose-600 font-bold">
                      {rowsPerChar === 'full_page' ? 'Cả trang A4' : `${rowsPerChar} dòng`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 1, label: '1 dòng' },
                      { val: 2, label: '2 dòng' },
                      { val: 3, label: '3 dòng' },
                      { val: 'full_page', label: 'Cả trang' },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => setRowsPerChar(opt.val as any)}
                        className={`py-1.5 text-center rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          rowsPerChar === opt.val
                            ? 'bg-rose-600 text-white shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cells per row (Số ô trên 1 hàng) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <span>Số ô viết trên mỗi hàng:</span>
                    <span className="text-rose-600 font-bold">{cellsPerRow} ô/hàng</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: 10, label: '10 ô (Thoáng)' },
                      { val: 12, label: '12 ô (Chuẩn A4)' },
                      { val: 14, label: '14 ô (Nhiều ô)' },
                    ].map((c) => (
                      <button
                        key={c.val}
                        type="button"
                        onClick={() => setCellsPerRow(c.val)}
                        className={`py-1.5 text-center rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          cellsPerRow === c.val
                            ? 'bg-rose-600 text-white shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-fill blank rows toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={fillBlankRows}
                      onChange={(e) => setFillBlankRows(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Tự động điền đầy trang cuối
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Thêm các dòng ô trống cho đủ {rowsPerPage} dòng, không để trắng nửa dưới trang giấy.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 5: Grid Style & Color Theme (Real-time Interactive Swatches) */}
              <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Grid size={14} style={{ color: colorConfig.border }} />
                    <span>Kiểu lưới & Màu sắc vở viết</span>
                  </span>
                  <span
                    style={{ color: colorConfig.border }}
                    className="text-[10.5px] font-bold"
                  >
                    {colorConfig.name}
                  </span>
                </div>

                {/* Grid Type: Mi (米), Tian (田), Hui (回), Kou (口) with Live Mini Icons */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'mi' as const, name: 'Ô Mễ Điền (米字格)', desc: 'Kẻ chéo + chữ thập' },
                    { id: 'tian' as const, name: 'Ô Điền Tự (田字格)', desc: 'Kẻ chữ thập' },
                    { id: 'hui' as const, name: 'Ô Hồi Tự (回字格)', desc: 'Khung vuông lồng' },
                    { id: 'kou' as const, name: 'Ô Vuông (方格)', desc: 'Không đường kẻ phụ' },
                  ].map((g) => {
                    const isSelected = gridStyle === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGridStyle(g.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'ring-2 bg-white dark:bg-slate-900 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                        style={{
                          borderColor: isSelected ? colorConfig.border : undefined,
                          boxShadow: isSelected ? `0 0 0 2px ${colorConfig.border}30` : undefined,
                        }}
                      >
                        {/* Mini Live Preview Icon */}
                        <div className="w-8 h-8 relative shrink-0 bg-white dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                          <HanziGridSvg style={g.id} colorConfig={colorConfig} />
                        </div>
                        <div className="min-w-0">
                          <div
                            className="text-xs font-bold truncate"
                            style={{ color: isSelected ? colorConfig.border : undefined }}
                          >
                            {g.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {g.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Color Theme Selector with vibrant swatches */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Màu mực in đường kẻ & Phiên âm:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'red' as const, label: 'Đỏ son', hex: '#dc2626', desc: 'Thư pháp truyền thống' },
                      { id: 'gray' as const, label: 'Xám', hex: '#475569', desc: 'Tiết kiệm mực in' },
                      { id: 'emerald' as const, label: 'Xanh ngọc', hex: '#059669', desc: 'Trang nhã, dịu mắt' },
                      { id: 'blue' as const, label: 'Xanh lam', hex: '#2563eb', desc: 'Mực bút máy' },
                    ].map((c) => {
                      const isSelected = gridColorTheme === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setGridColorTheme(c.id)}
                          className={`p-2 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 ${
                            isSelected
                              ? 'border-slate-900 dark:border-white ring-2 ring-slate-400 bg-white dark:bg-slate-900 font-bold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full shadow-xs border-2 border-white dark:border-slate-900 transition-transform hover:scale-110"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[10.5px] truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trace Cells Count */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span>Số ô nét mờ để đồ theo:</span>
                    <span style={{ color: colorConfig.border }} className="font-bold">
                      {traceCount} ô mờ
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setTraceCount(cnt)}
                        style={{
                          backgroundColor: traceCount === cnt ? colorConfig.border : undefined,
                        }}
                        className={`py-1 text-center rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          traceCount === cnt
                            ? 'text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cnt === 0 ? 'Không' : `${cnt} ô`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 6: Content Display Toggles */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  Thông tin hiển thị trên phiếu:
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPinyin}
                      onChange={(e) => setShowPinyin(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Hiện phiên âm Pinyin</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMeaning}
                      onChange={(e) => setShowMeaning(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Hiện nghĩa tiếng Việt</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStudentInfo}
                      onChange={(e) => setShowStudentInfo(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Hiện khung Họ tên / Lớp / Ngày học</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHskLevel}
                      onChange={(e) => setShowHskLevel(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Hiện cấp độ HSK</span>
                  </label>
                </div>
              </div>

              {/* SECTION 7: Title Customization */}
              <div className="space-y-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Tiêu đề phiếu in:
                </label>
                <input
                  type="text"
                  value={worksheetTitle}
                  onChange={(e) => setWorksheetTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: SCALED A4 PAPER PREVIEW */}
            <div className="flex-1 bg-slate-200/70 dark:bg-slate-950 p-4 sm:p-7 overflow-y-auto flex flex-col items-center scrollbar-thin">
              
              <div className="mb-3 flex items-center justify-between w-full max-w-[680px] text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Xem trước bản in A4 ({pages.length} trang)</span>
                  <span
                    style={{
                      borderColor: `${colorConfig.border}50`,
                      backgroundColor: `${colorConfig.border}10`,
                      color: colorConfig.border,
                    }}
                    className="px-2 py-0.5 rounded-md border text-[11px] font-bold"
                  >
                    {gridStyle === 'mi' ? 'Lưới Mễ (米)' : gridStyle === 'tian' ? 'Lưới Điền (田)' : gridStyle === 'hui' ? 'Lưới Hồi (回)' : 'Ô Vuông (口)'} • {colorConfig.name.split(' ')[0]}
                  </span>
                </div>
                <span style={{ color: colorConfig.border }} className="font-bold">
                  {targetWords.length} từ vựng ({practiceRows.length} dòng bài tập)
                </span>
              </div>

              {/* Preview Pagination Toolbar (Shown when multiple pages exist) */}
              {pages.length > 1 && (
                <div className="mb-3 flex items-center justify-between w-full max-w-[680px] bg-white dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                      disabled={safePageIndex === 0}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
                      title="Xem trang trước"
                    >
                      <ChevronLeft size={14} /> Trang trước
                    </button>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-1">
                      Trang <span style={{ color: colorConfig.border }}>{safePageIndex + 1}</span> / {pages.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewPageIndex((p) => Math.min(pages.length - 1, p + 1))}
                      disabled={safePageIndex >= pages.length - 1}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
                      title="Xem trang sau"
                    >
                      Trang sau <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                    In / Lưu PDF sẽ in đủ cả {pages.length} trang
                  </div>
                </div>
              )}

              {/* Simulated A4 Paper Sheet Container (Single Active Page for 60fps instant preview) */}
              <div className="space-y-6 flex flex-col items-center w-full max-w-[680px]">
                {(() => {
                  const activePageRows = pages[safePageIndex] || [];
                  return (
                    <div
                      key={`page-${safePageIndex}`}
                      className="w-full bg-white text-slate-900 shadow-xl border border-slate-200 p-5 sm:p-6 rounded-sm relative aspect-[1/1.414] overflow-hidden flex flex-col justify-between"
                      style={{ minHeight: '840px' }}
                    >
                      {/* Header of Worksheet */}
                      <div>
                        {/* Top Title & Subtitle */}
                        <div className="text-center pb-2.5 border-b-2 border-slate-900/80 mb-2.5">
                          <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-950 font-serif">
                            {worksheetTitle}
                          </h2>
                          {worksheetSubtitle && (
                            <p className="text-[10px] text-slate-600 mt-0.5 tracking-wide">
                              {worksheetSubtitle}
                            </p>
                          )}
                        </div>

                        {/* Student Info Bar */}
                        {showStudentInfo && (
                          <div className="flex items-center justify-between text-[10.5px] font-serif text-slate-700 pb-2 mb-2 border-b border-dashed border-slate-300">
                            <div>
                              <span>Học viên: </span>
                              <span className="font-semibold text-slate-900">...................................................</span>
                            </div>
                            <div>
                              <span>Lớp / Ngày: </span>
                              <span className="font-semibold text-slate-900">..../..../202...</span>
                            </div>
                            <div>
                              <span>Điểm: </span>
                              <span className="font-semibold text-slate-900">........</span>
                            </div>
                          </div>
                        )}

                        {/* Character Rows Table */}
                        <div className="space-y-1 mt-1 flex flex-col justify-between">
                          {activePageRows.map((row) => (
                            <div
                              key={row.id}
                              className={`flex items-center gap-1.5 ${sizeConfig.previewCellPadding} border-b border-slate-100 last:border-b-0`}
                            >
                              {/* Word Meta Info Box */}
                              <div className={`${sizeConfig.previewMetaWidth} shrink-0 text-left`}>
                                {row.isBlank ? (
                                  <div className="text-[9.5px] text-slate-300 dark:text-slate-400 italic">
                                    Tự luyện
                                  </div>
                                ) : row.isFollowUpLine ? (
                                  <div className="text-[9.5px] text-slate-400 font-medium italic">
                                    Dòng {row.lineIndex}
                                  </div>
                                ) : (
                                  <>
                                    {showPinyin && (
                                      <div
                                        style={{ color: colorConfig.pinyinColor }}
                                        className="font-pinyin font-bold text-xs leading-none truncate transition-colors"
                                      >
                                        {row.pinyin}
                                      </div>
                                    )}
                                    {showMeaning && (
                                      <div className="text-[9.5px] text-slate-600 leading-tight line-clamp-1 mt-0.5">
                                        {row.meaning}
                                      </div>
                                    )}
                                    {showHskLevel && (
                                      <div className="text-[8px] font-bold text-slate-400 mt-0.5">
                                        HSK {row.hskLevel}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Practice Grid Cells */}
                              <div className="flex items-center gap-0.5 overflow-hidden">
                                {/* 1. Model Bold Hanzi Cell (Only if not blank) */}
                                {!row.isBlank ? (
                                  <div
                                    style={{
                                      width: `${sizeConfig.previewCellPx}px`,
                                      height: `${sizeConfig.previewCellPx}px`,
                                    }}
                                    className="relative shrink-0 flex items-center justify-center bg-white"
                                  >
                                    {/* Dynamic Vector SVG Grid */}
                                    <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                                    <span
                                      className={`relative z-10 font-hanzi font-bold ${sizeConfig.previewFontClass} text-slate-950 leading-none`}
                                    >
                                      {row.hanzi}
                                    </span>
                                  </div>
                                ) : (
                                  /* Blank practice cell in place of model */
                                  <div
                                    style={{
                                      width: `${sizeConfig.previewCellPx}px`,
                                      height: `${sizeConfig.previewCellPx}px`,
                                    }}
                                    className="relative shrink-0 flex items-center justify-center bg-white"
                                  >
                                    <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                                  </div>
                                )}

                                {/* 2. Faint Trace Cells (For tracing over) */}
                                {!row.isBlank && Array.from({ length: traceCount }).map((_, tIdx) => (
                                  <div
                                    key={`trace-${tIdx}`}
                                    style={{
                                      width: `${sizeConfig.previewCellPx}px`,
                                      height: `${sizeConfig.previewCellPx}px`,
                                    }}
                                    className="relative shrink-0 flex items-center justify-center bg-white"
                                  >
                                    <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                                    <span
                                      className={`relative z-10 font-hanzi ${sizeConfig.previewFontClass} select-none leading-none`}
                                      style={{ color: tIdx === 0 ? '#94a3b8' : '#cbd5e1' }}
                                    >
                                      {row.hanzi}
                                    </span>
                                  </div>
                                ))}

                                {/* 3. Empty Practice Cells for Free Writing */}
                                {Array.from({
                                  length: row.isBlank
                                    ? cellsPerRow - 1
                                    : Math.max(2, cellsPerRow - 1 - traceCount),
                                }).map((_, eIdx) => (
                                  <div
                                    key={`empty-${eIdx}`}
                                    style={{
                                      width: `${sizeConfig.previewCellPx}px`,
                                      height: `${sizeConfig.previewCellPx}px`,
                                    }}
                                    className="relative shrink-0 flex items-center justify-center bg-white"
                                  >
                                    <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Page Footer */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-sans">
                        <span>HSK Master • Nền tảng học tiếng Trung ({gridStyle.toUpperCase()} • {colorConfig.name})</span>
                        <span>Trang {safePageIndex + 1} / {pages.length}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED PRINT DOM TREE (Rendered exclusively by @media print) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] m-0 p-0 text-slate-900 font-sans hanzi-worksheet-printable">
        {pages.map((pageRows, pageIdx) => (
          <div
            key={`print-page-${pageIdx}`}
            className="w-full bg-white text-slate-900 p-7 relative flex flex-col justify-between hanzi-print-page"
            style={{
              minHeight: '282mm',
              pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'avoid',
              breakAfter: pageIdx < pages.length - 1 ? 'page' : 'avoid',
            }}
          >
            <div>
              {/* Top Title & Subtitle */}
              <div className="text-center pb-2.5 border-b-2 border-slate-900 mb-3">
                <h2 className="text-base font-black tracking-wider uppercase text-slate-950 font-serif">
                  {worksheetTitle}
                </h2>
                {worksheetSubtitle && (
                  <p className="text-[11px] text-slate-600 mt-0.5 tracking-wide">
                    {worksheetSubtitle}
                  </p>
                )}
              </div>

              {/* Student Info Bar */}
              {showStudentInfo && (
                <div className="flex items-center justify-between text-xs font-serif text-slate-700 pb-2 mb-2.5 border-b border-dashed border-slate-400">
                  <div>
                    <span>Học viên: </span>
                    <span className="font-semibold text-slate-900">...........................................................................</span>
                  </div>
                  <div>
                    <span>Lớp / Ngày: </span>
                    <span className="font-semibold text-slate-900">..../..../202...</span>
                  </div>
                  <div>
                    <span>Điểm: </span>
                    <span className="font-semibold text-slate-900">........</span>
                  </div>
                </div>
              )}

              {/* Character Rows Table */}
              <div className="space-y-1.5 mt-1">
                {pageRows.map((row) => (
                  <div
                    key={row.id}
                    className={`flex items-center gap-2 ${sizeConfig.printCellPadding} border-b border-slate-200 last:border-b-0`}
                  >
                    {/* Word Meta Info Box */}
                    <div className={`${sizeConfig.printMetaWidth} shrink-0 text-left`}>
                      {row.isBlank ? (
                        <div className="text-[10px] text-slate-400 italic">
                          Tự luyện
                        </div>
                      ) : row.isFollowUpLine ? (
                        <div className="text-[10px] text-slate-400 font-medium italic">
                          Dòng {row.lineIndex}
                        </div>
                      ) : (
                        <>
                          {showPinyin && (
                            <div
                              style={{ color: colorConfig.pinyinColor }}
                              className="font-pinyin font-bold text-xs leading-none truncate"
                            >
                              {row.pinyin}
                            </div>
                          )}
                          {showMeaning && (
                            <div className="text-[10.5px] text-slate-700 leading-tight line-clamp-1 mt-0.5">
                              {row.meaning}
                            </div>
                          )}
                          {showHskLevel && (
                            <div className="text-[9px] font-bold text-slate-500 mt-0.5">
                              HSK {row.hskLevel}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Practice Grid Cells */}
                    <div className="flex items-center gap-1 overflow-hidden">
                      {/* 1. Model Bold Hanzi Cell */}
                      {!row.isBlank ? (
                        <div
                          style={{
                            width: `${sizeConfig.printCellPx}px`,
                            height: `${sizeConfig.printCellPx}px`,
                          }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                          <span
                            className={`relative z-10 font-hanzi font-bold ${sizeConfig.printFontClass} text-slate-950 leading-none`}
                          >
                            {row.hanzi}
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: `${sizeConfig.printCellPx}px`,
                            height: `${sizeConfig.printCellPx}px`,
                          }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                        </div>
                      )}

                      {/* 2. Faint Trace Cells */}
                      {!row.isBlank && Array.from({ length: traceCount }).map((_, tIdx) => (
                        <div
                          key={`print-trace-${tIdx}`}
                          style={{
                            width: `${sizeConfig.printCellPx}px`,
                            height: `${sizeConfig.printCellPx}px`,
                          }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                          <span
                            className={`relative z-10 font-hanzi ${sizeConfig.printFontClass} select-none leading-none`}
                            style={{ color: tIdx === 0 ? '#94a3b8' : '#cbd5e1' }}
                          >
                            {row.hanzi}
                          </span>
                        </div>
                      ))}

                      {/* 3. Empty Practice Cells */}
                      {Array.from({
                        length: row.isBlank
                          ? cellsPerRow - 1
                          : Math.max(2, cellsPerRow - 1 - traceCount),
                      }).map((_, eIdx) => (
                        <div
                          key={`print-empty-${eIdx}`}
                          style={{
                            width: `${sizeConfig.printCellPx}px`,
                            height: `${sizeConfig.printCellPx}px`,
                          }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <HanziGridSvg style={gridStyle} colorConfig={colorConfig} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Footer */}
            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-sans">
              <span>HSK Master • Nền tảng học tiếng Trung tương tác thông minh</span>
              <span>Trang {pageIdx + 1} / {pages.length}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default HanziWorksheetModal;
