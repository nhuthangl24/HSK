'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Columns,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Languages,
  AlertTriangle,
  Star,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  ClipboardPaste,
  PenTool,
  Printer,
  GraduationCap,
} from 'lucide-react';
import {
  StudyMode,
  FilterOptions,
  ColumnConfig,
  TableColumnId,
  HskLevel,
  ReviewResult,
} from '@/types/vocabulary';

interface TableToolbarProps {
  studyMode: StudyMode;
  onStudyModeChange: (mode: StudyMode) => void;
  filterOptions: FilterOptions;
  onFilterChange: (updates: Partial<FilterOptions>) => void;
  columns: ColumnConfig[];
  onToggleColumn: (columnId: TableColumnId) => void;
  onResetColumns: () => void;
  onAddNewWord?: () => void;
  onStartSmartReview: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenWorksheet?: () => void;
  onOpenBulkPaste?: () => void;
  onOpenStrokePractice?: () => void;
  onOpenExams?: () => void;
  dueTodayCount: number;
}

export function TableToolbar({
  studyMode,
  onStudyModeChange,
  filterOptions,
  onFilterChange,
  columns,
  onToggleColumn,
  onResetColumns,
  onAddNewWord,
  onStartSmartReview,
  onOpenImport,
  onOpenExport,
  onOpenWorksheet,
  onOpenBulkPaste,
  onOpenStrokePractice,
  onOpenExams,
  dueTodayCount,
}: TableToolbarProps) {
  const [showColMenu, setShowColMenu] = useState(false);

  const studyModes: { id: StudyMode; label: string; icon: React.ReactNode }[] = [
    {
      id: 'full_table',
      label: 'Bảng đầy đủ',
      icon: <FileSpreadsheet size={15} />,
    },
    {
      id: 'hanzi_recall',
      label: 'Ôn chữ Hán',
      icon: <BookOpen size={15} />,
    },
    {
      id: 'meaning_recall',
      label: 'Nhớ nghĩa',
      icon: <Languages size={15} />,
    },
    {
      id: 'sentence_translation',
      label: 'Luyện dịch câu',
      icon: <Sparkles size={15} />,
    },
    {
      id: 'smart_srs',
      label: 'Ôn thông minh (SRS)',
      icon: <RotateCcw size={15} />,
    },
  ];

  return (
    <div className="bg-white dark:bg-black border-b border-slate-200 dark:border-zinc-800 px-4 py-2.5 flex flex-col gap-2.5 shadow-2xs transition-colors">
      {/* Top row: Study modes tabs & primary study action */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-zinc-800 overflow-x-auto max-w-full scrollbar-none">
          {studyModes.map((m) => {
            const isActive = studyMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onStudyModeChange(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-zinc-950 text-emerald-800 dark:text-emerald-300 shadow-2xs font-semibold border border-slate-200/80 dark:border-zinc-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
                {m.id === 'smart_srs' && dueTodayCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                    {dueTodayCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>


        {dueTodayCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStartSmartReview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Play size={13} className="fill-white" />
              Ôn ngay {dueTodayCount} từ đến hạn
            </button>
          </div>
        )}
      </div>

      {/* Bottom row: Search query, Quick filters, Column visibility & Data actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-0 sm:min-w-[200px] max-w-md">
          <div className="relative w-full">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              value={filterOptions.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              placeholder="Tìm theo chữ Hán, pinyin (vd: nihao), nghĩa tiếng Việt..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {filterOptions.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Quick filters & Column visibility */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* HSK Level Filter */}
          <select
            value={filterOptions.hskLevel || 'all'}
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange({
                hskLevel: val === 'all' ? 'all' : (Number(val) as HskLevel),
              });
            }}
            className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer focus:outline-none"
          >
            <option value="all">Tất cả cấp độ</option>
            <option value="1">HSK 1</option>
            <option value="2">HSK 2</option>
            <option value="3">HSK 3</option>
            <option value="4">HSK 4</option>
            <option value="5">HSK 5</option>
            <option value="6">HSK 6</option>
            <option value="7">HSK 7-9</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterOptions.hanziStatus || 'all'}
            onChange={(e) => {
              onFilterChange({
                hanziStatus: e.target.value as ReviewResult | 'all',
              });
            }}
            className="px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="unlearned">Chưa học</option>
            <option value="correct">Đã thuộc (Đúng)</option>
            <option value="uncertain">Chưa chắc</option>
            <option value="wrong">Cần học lại (Sai)</option>
          </select>

          {/* Completed toggle */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({ completedOnly: !filterOptions.completedOnly })
            }
            className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
              filterOptions.completedOnly
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 size={13} className={filterOptions.completedOnly ? 'text-blue-600 dark:text-blue-400' : ''} />
            Đã xong
          </button>

          {/* Due for review toggle */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({ onlyDueForReview: !filterOptions.onlyDueForReview })
            }
            className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
              filterOptions.onlyDueForReview
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle size={13} />
            Đến hạn ôn
          </button>

          {/* Starred toggle */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({ favoriteOnly: !filterOptions.favoriteOnly })
            }
            className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
              filterOptions.favoriteOnly
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Star size={13} className={filterOptions.favoriteOnly ? 'fill-amber-500' : ''} />
            Yêu thích
          </button>

          {/* Column Visibility Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColMenu(!showColMenu)}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Columns size={13} />
              Cột hiển thị
            </button>

            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-2 text-xs animate-scaleIn origin-top-right">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-zinc-800 font-semibold text-slate-700 dark:text-slate-200">
                  <span>Ẩn/Hiện cột</span>
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Mặc định
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                  {columns.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer select-none text-slate-700 dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={c.visible}
                        onChange={() => onToggleColumn(c.id)}
                        disabled={c.id === 'index' || c.id === 'hanzi'}
                        className="rounded text-emerald-600 cursor-pointer"
                      />
                      <span className="truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Kho Đề Thi Button (Replaces Tập viết chữ next to Thêm từ) */}
          <Link
            href="/exams"
            onClick={() => onOpenExams?.()}
            title="Kho Đề Thi HSK Tuyển Chọn (Đề thi thật, đề thử BLCU, kèm file nghe MP3 & đáp án)"
            className="px-2.5 py-1.5 rounded-md border border-emerald-400 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 cursor-pointer font-semibold shadow-2xs transition-all btn-press"
          >
            <GraduationCap size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Kho đề thi</span>
            <span className="text-[9.5px] font-extrabold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-1 py-0.2 rounded">
              Mới
            </span>
          </Link>

          {/* Add Word Button */}
          {onOpenBulkPaste && (
            <button
              type="button"
              onClick={onOpenBulkPaste}
              title="Thêm từ vựng mới"
              className="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer font-semibold shadow-xs transition-colors"
            >
              <Plus size={14} />
              Thêm từ
            </button>
          )}

          {/* Import / Export Buttons */}
          <button
            type="button"
            onClick={onOpenImport}
            title="Nhập từ vựng từ file CSV/Excel"
            className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
          >
            <Upload size={13} />
            Nhập file
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            title="Xuất bảng từ vựng ra CSV/Excel"
            className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
          >
            <Download size={13} />
            Xuất file
          </button>

          {/* Printable Hanzi Writing Worksheet Button */}
          {onOpenWorksheet && (
            <button
              type="button"
              onClick={onOpenWorksheet}
              title="Xuất phiếu tập viết chữ Hán ra PDF (Khổ A4, ô Mễ điền/Điền tự cách)"
              className="px-2.5 py-1.5 rounded-md border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center gap-1.5 cursor-pointer font-semibold shadow-2xs transition-colors"
            >
              <Printer size={13} className="text-rose-600 dark:text-rose-400" />
              <span>Phiếu viết PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
