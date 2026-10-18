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
  BookOpen,
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

export function HanziWorksheetModal({
  isOpen,
  onClose,
  filteredItems,
  allDeckItems,
  currentDeck,
  preselectedItem,
}: HanziWorksheetModalProps) {
  const toast = useToast();

  // 1. Scope & Quantity Settings
  const [scope, setScope] = useState<'filtered' | 'all' | 'favorites' | 'single'>(
    preselectedItem ? 'single' : 'filtered'
  );
  const [maxWords, setMaxWords] = useState<number>(10);
  const [practiceMode, setPracticeMode] = useState<'character' | 'word'>('character');

  // 2. Grid & Styling Settings
  const [gridStyle, setGridStyle] = useState<'mi' | 'tian'>('mi'); // 'mi' = 米字格, 'tian' = 田字格
  const [gridColorTheme, setGridColorTheme] = useState<'red' | 'gray' | 'emerald'>('red');
  const [traceCount, setTraceCount] = useState<number>(2); // 1, 2, or 3 faint trace cells
  const [cellsPerRow, setCellsPerRow] = useState<number>(10); // 8, 10, or 12 practice cells per line

  // 3. Header & Content Elements Toggle
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showHskLevel, setShowHskLevel] = useState(true);
  const [showStrokeOrderGuide, setShowStrokeOrderGuide] = useState(true);

  // 4. Custom Header Text
  const [worksheetTitle, setWorksheetTitle] = useState(
    currentDeck ? `PHIẾU TẬP VIẾT CHỮ HÁN — ${currentDeck.name.toUpperCase()}` : 'PHIẾU TẬP VIẾT CHỮ HÁN'
  );
  const [worksheetSubtitle, setWorksheetSubtitle] = useState(
    'Luyện viết theo chuẩn ô Mễ điền (米字格) • Nét Khải thư tiêu chuẩn'
  );

  // Color Definitions
  const colorConfig = useMemo(() => {
    switch (gridColorTheme) {
      case 'red':
        return {
          main: '#ef4444',
          sub: '#fca5a5',
          bg: '#fef2f2',
          border: '#f87171',
          name: 'Đỏ son truyền thống',
        };
      case 'gray':
        return {
          main: '#64748b',
          sub: '#cbd5e1',
          bg: '#f8fafc',
          border: '#94a3b8',
          name: 'Xám tiết kiệm mực',
        };
      case 'emerald':
        return {
          main: '#059669',
          sub: '#a7f3d0',
          bg: '#ecfdf5',
          border: '#34d399',
          name: 'Xanh ngọc trang nhã',
        };
    }
  }, [gridColorTheme]);

  // Filter items based on selected scope
  const targetWords = useMemo(() => {
    if (scope === 'single' && preselectedItem) {
      return [preselectedItem];
    }
    let sourceList: VocabItem[] = [];
    if (scope === 'filtered') sourceList = filteredItems;
    else if (scope === 'favorites') sourceList = allDeckItems.filter((i) => i.favorite);
    else sourceList = allDeckItems;

    return sourceList.slice(0, maxWords);
  }, [scope, preselectedItem, filteredItems, allDeckItems, maxWords]);

  // Expand into practice entries (each Hanzi character gets a row)
  const practiceRows = useMemo(() => {
    interface PracticeRow {
      id: string;
      hanzi: string;
      wordHanzi: string;
      pinyin: string;
      meaning: string;
      hskLevel: number;
    }

    const rows: PracticeRow[] = [];

    targetWords.forEach((item) => {
      if (practiceMode === 'word') {
        // Full compound word mode
        rows.push({
          id: item.id,
          hanzi: item.hanzi,
          wordHanzi: item.hanzi,
          pinyin: item.pinyin,
          meaning: item.meaning,
          hskLevel: item.hskLevel,
        });
      } else {
        // Character by character mode (pure Hanzi characters)
        const chars = Array.from(item.hanzi).filter((c) =>
          /[\u4e00-\u9fa5\u3400-\u4dbf]/.test(c)
        );
        if (chars.length === 0) {
          rows.push({
            id: item.id,
            hanzi: item.hanzi,
            wordHanzi: item.hanzi,
            pinyin: item.pinyin,
            meaning: item.meaning,
            hskLevel: item.hskLevel,
          });
        } else {
          chars.forEach((char, idx) => {
            rows.push({
              id: `${item.id}-char-${idx}`,
              hanzi: char,
              wordHanzi: item.hanzi,
              pinyin: item.pinyin,
              meaning: item.meaning,
              hskLevel: item.hskLevel,
            });
          });
        }
      }
    });

    return rows;
  }, [targetWords, practiceMode]);

  // Paginate into pages (approx 8 rows per A4 page to fit header, footer, and margins)
  const ROWS_PER_PAGE = 8;
  const pages = useMemo(() => {
    const p: (typeof practiceRows)[] = [];
    for (let i = 0; i < practiceRows.length; i += ROWS_PER_PAGE) {
      p.push(practiceRows.slice(i, i + ROWS_PER_PAGE));
    }
    return p.length > 0 ? p : [[]];
  }, [practiceRows]);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn no-print">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 max-w-6xl w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col animate-scaleIn">
          
          {/* TOP HEADER */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Xuất Phiếu Tập Viết Chữ Hán Khổ A4</span>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                    PDF Chuẩn In Ấn
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tạo tài liệu tập viết theo lưới Mễ điền (米字格) chuẩn vở thư pháp, có chữ mẫu, pinyin, nghĩa và ô đồ nét mờ.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-rose-600/25 btn-press"
              >
                <Printer size={15} />
                <span>In ngay / Lưu PDF</span>
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
            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 p-5 overflow-y-auto space-y-5 shrink-0">
              
              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Danh sách từ vựng đưa vào phiếu:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('filtered')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all ${
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
                    onClick={() => setScope('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all ${
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
                    onClick={() => setScope('favorites')}
                    className={`col-span-2 px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                      scope === 'favorites'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>⭐ Chỉ các từ yêu thích đã đánh dấu</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantity Limit */}
              {scope !== 'single' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span>Số lượng từ xuất:</span>
                    <span className="text-rose-600 dark:text-rose-400">{maxWords} từ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMaxWords(num)}
                        className={`py-1.5 text-center rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          maxWords === num
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {num} từ
                      </button>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 italic">
                    Mỗi trang A4 chứa ~8 dòng chữ để đảm bảo ô viết to rõ, thoáng mắt.
                  </p>
                </div>
              )}

              {/* Grid Style & Color Selection */}
              <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Grid size={13} className="text-rose-600" />
                  Kiểu lưới & Màu sắc vở viết
                </div>

                {/* Grid Type: Mi vs Tian */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGridStyle('mi')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      gridStyle === 'mi'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">Ô Mễ Điền (米字格)</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">Kẻ chéo + chữ thập chuẩn</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGridStyle('tian')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      gridStyle === 'tian'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">Ô Điền Tự (田字格)</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">Kẻ chữ thập vuông vức</div>
                  </button>
                </div>

                {/* Color Theme */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Màu mực in đường kẻ:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'red' as const, label: 'Đỏ son truyền thống', hex: '#ef4444' },
                      { id: 'gray' as const, label: 'Xám tiết kiệm mực', hex: '#64748b' },
                      { id: 'emerald' as const, label: 'Xanh ngọc', hex: '#059669' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setGridColorTheme(c.id)}
                        className={`p-2 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1 ${
                          gridColorTheme === c.id
                            ? 'border-slate-900 dark:border-white ring-2 ring-slate-400 bg-white dark:bg-slate-900 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full shadow-2xs" style={{ backgroundColor: c.hex }} />
                        <span className="text-[10px] truncate">{c.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Practice Options: Trace Cells & Practice Cells */}
              <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers size={13} className="text-rose-600" />
                  Quy cách dòng luyện viết
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span>Số ô nét mờ để đồ theo:</span>
                    <span className="text-rose-600 font-bold">{traceCount} ô mờ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setTraceCount(cnt)}
                        className={`py-1 text-center rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          traceCount === cnt
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cnt === 0 ? 'Không' : `${cnt} ô`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Toggles */}
                <div className="space-y-2 pt-1">
                  <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Thông tin hiển thị trên phiếu:
                  </span>
                  <div className="space-y-1.5">
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
                  </div>
                </div>
              </div>

              {/* Title Customization */}
              <div className="space-y-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Tiêu đề phiếu in:
                </label>
                <input
                  type="text"
                  value={worksheetTitle}
                  onChange={(e) => setWorksheetTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: SCALED A4 PAPER PREVIEW */}
            <div className="flex-1 bg-slate-200/70 dark:bg-slate-950 p-4 sm:p-8 overflow-y-auto flex flex-col items-center">
              
              <div className="mb-3 flex items-center justify-between w-full max-w-[620px] text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Xem trước bản in A4 ({pages.length} trang)</span>
                <span>Khổ A4 • Sẵn sàng in</span>
              </div>

              {/* Simulated A4 Paper Sheets Container */}
              <div className="space-y-6 flex flex-col items-center w-full max-w-[620px]">
                {pages.map((pageRows, pageIdx) => (
                  <div
                    key={`page-${pageIdx}`}
                    className="w-full bg-white text-slate-900 shadow-xl border border-slate-200 p-6 sm:p-8 rounded-sm relative aspect-[1/1.414] overflow-hidden flex flex-col justify-between"
                    style={{ minHeight: '800px' }}
                  >
                    {/* Header of Worksheet */}
                    <div>
                      {/* Top Title & Subtitle */}
                      <div className="text-center pb-3 border-b-2 border-slate-900/80 mb-3">
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
                        <div className="flex items-center justify-between text-[11px] font-serif text-slate-700 pb-2.5 mb-2 border-b border-dashed border-slate-300">
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
                      <div className="space-y-2 mt-1">
                        {pageRows.map((row, rIdx) => (
                          <div
                            key={row.id}
                            className="flex items-center gap-2 pb-1.5 border-b border-slate-100 last:border-b-0"
                          >
                            {/* Word Meta Info Box */}
                            <div className="w-20 shrink-0 text-left">
                              {showPinyin && (
                                <div className="font-pinyin font-bold text-xs text-rose-700 leading-none">
                                  {row.pinyin}
                                </div>
                              )}
                              {showMeaning && (
                                <div className="text-[10px] text-slate-600 leading-tight line-clamp-1 mt-0.5">
                                  {row.meaning}
                                </div>
                              )}
                              {showHskLevel && (
                                <div className="text-[8.5px] font-bold text-slate-400 mt-0.5">
                                  HSK {row.hskLevel}
                                </div>
                              )}
                            </div>

                            {/* Practice Grid Cells */}
                            <div className="flex items-center gap-0.5 overflow-hidden">
                              {/* 1. Model Bold Hanzi Cell */}
                              <div
                                style={{ width: '42px', height: '42px' }}
                                className="relative shrink-0 flex items-center justify-center bg-white"
                              >
                                {/* SVG Grid */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                                  <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke={colorConfig.border} strokeWidth="1.2" />
                                  <line x1="0" y1="50" x2="100" y2="50" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                  <line x1="50" y1="0" x2="50" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                  {gridStyle === 'mi' && (
                                    <>
                                      <line x1="0" y1="0" x2="100" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                      <line x1="100" y1="0" x2="0" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                    </>
                                  )}
                                </svg>
                                <span className="relative z-10 font-hanzi font-bold text-2xl text-slate-950 leading-none">
                                  {row.hanzi}
                                </span>
                              </div>

                              {/* 2. Faint Trace Cells (For tracing over) */}
                              {Array.from({ length: traceCount }).map((_, tIdx) => (
                                <div
                                  key={`trace-${tIdx}`}
                                  style={{ width: '42px', height: '42px' }}
                                  className="relative shrink-0 flex items-center justify-center bg-white"
                                >
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                                    <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke={colorConfig.border} strokeWidth="1.2" />
                                    <line x1="0" y1="50" x2="100" y2="50" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                    <line x1="50" y1="0" x2="50" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                    {gridStyle === 'mi' && (
                                      <>
                                        <line x1="0" y1="0" x2="100" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                        <line x1="100" y1="0" x2="0" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                      </>
                                    )}
                                  </svg>
                                  <span
                                    className="relative z-10 font-hanzi text-2xl select-none leading-none"
                                    style={{ color: tIdx === 0 ? '#94a3b8' : '#cbd5e1' }}
                                  >
                                    {row.hanzi}
                                  </span>
                                </div>
                              ))}

                              {/* 3. Empty Practice Cells for Free Writing */}
                              {Array.from({ length: Math.max(2, cellsPerRow - 1 - traceCount) }).map((_, eIdx) => (
                                <div
                                  key={`empty-${eIdx}`}
                                  style={{ width: '42px', height: '42px' }}
                                  className="relative shrink-0 flex items-center justify-center bg-white"
                                >
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                                    <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke={colorConfig.border} strokeWidth="1.2" />
                                    <line x1="0" y1="50" x2="100" y2="50" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                    <line x1="50" y1="0" x2="50" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                    {gridStyle === 'mi' && (
                                      <>
                                        <line x1="0" y1="0" x2="100" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                        <line x1="100" y1="0" x2="0" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                      </>
                                    )}
                                  </svg>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Page Footer */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9.5px] text-slate-400 font-sans">
                      <span>HSK Master • Nền tảng học tiếng Trung tương tác</span>
                      <span>Trang {pageIdx + 1} / {pages.length}</span>
                    </div>
                  </div>
                ))}
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
            className="w-full bg-white text-slate-900 p-8 relative flex flex-col justify-between hanzi-print-page"
            style={{
              minHeight: '287mm',
              pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'avoid',
              breakAfter: pageIdx < pages.length - 1 ? 'page' : 'avoid',
            }}
          >
            <div>
              {/* Top Title & Subtitle */}
              <div className="text-center pb-3 border-b-2 border-slate-900 mb-4">
                <h2 className="text-lg font-black tracking-wider uppercase text-slate-950 font-serif">
                  {worksheetTitle}
                </h2>
                {worksheetSubtitle && (
                  <p className="text-xs text-slate-600 mt-1 tracking-wide">
                    {worksheetSubtitle}
                  </p>
                )}
              </div>

              {/* Student Info Bar */}
              {showStudentInfo && (
                <div className="flex items-center justify-between text-xs font-serif text-slate-700 pb-3 mb-3 border-b border-dashed border-slate-400">
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
              <div className="space-y-3 mt-2">
                {pageRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 pb-2 border-b border-slate-200 last:border-b-0"
                  >
                    {/* Word Meta Info Box */}
                    <div className="w-24 shrink-0 text-left">
                      {showPinyin && (
                        <div className="font-pinyin font-bold text-sm text-rose-800 leading-none">
                          {row.pinyin}
                        </div>
                      )}
                      {showMeaning && (
                        <div className="text-xs text-slate-700 leading-tight line-clamp-1 mt-1">
                          {row.meaning}
                        </div>
                      )}
                      {showHskLevel && (
                        <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                          HSK {row.hskLevel}
                        </div>
                      )}
                    </div>

                    {/* Practice Grid Cells */}
                    <div className="flex items-center gap-1 overflow-hidden">
                      {/* 1. Model Bold Hanzi Cell */}
                      <div
                        style={{ width: '48px', height: '48px' }}
                        className="relative shrink-0 flex items-center justify-center bg-white"
                      >
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                          <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke={colorConfig.border} strokeWidth="1.2" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                          <line x1="50" y1="0" x2="50" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                          {gridStyle === 'mi' && (
                            <>
                              <line x1="0" y1="0" x2="100" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                              <line x1="100" y1="0" x2="0" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                            </>
                          )}
                        </svg>
                        <span className="relative z-10 font-hanzi font-bold text-3xl text-slate-950 leading-none">
                          {row.hanzi}
                        </span>
                      </div>

                      {/* 2. Faint Trace Cells */}
                      {Array.from({ length: traceCount }).map((_, tIdx) => (
                        <div
                          key={`print-trace-${tIdx}`}
                          style={{ width: '48px', height: '48px' }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                            <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke={colorConfig.border} strokeWidth="1.2" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                            <line x1="50" y1="0" x2="50" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                            {gridStyle === 'mi' && (
                              <>
                                <line x1="0" y1="0" x2="100" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                <line x1="100" y1="0" x2="0" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                              </>
                            )}
                          </svg>
                          <span
                            className="relative z-10 font-hanzi text-3xl select-none leading-none"
                            style={{ color: tIdx === 0 ? '#94a3b8' : '#cbd5e1' }}
                          >
                            {row.hanzi}
                          </span>
                        </div>
                      ))}

                      {/* 3. Empty Practice Cells */}
                      {Array.from({ length: Math.max(2, cellsPerRow - 1 - traceCount) }).map((_, eIdx) => (
                        <div
                          key={`print-empty-${eIdx}`}
                          style={{ width: '48px', height: '48px' }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                            <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke={colorConfig.border} strokeWidth="1.2" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                            <line x1="50" y1="0" x2="50" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                            {gridStyle === 'mi' && (
                              <>
                                <line x1="0" y1="0" x2="100" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                                <line x1="100" y1="0" x2="0" y2="100" stroke={colorConfig.sub} strokeWidth="0.8" strokeDasharray="3 3" />
                              </>
                            )}
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Footer */}
            <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-sans">
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
