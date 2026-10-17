'use client';

import React from 'react';
import { DeckStatistics } from '@/types/vocabulary';
import { Keyboard, CheckCircle, AlertTriangle, BookCheck } from 'lucide-react';

interface StatusBarProps {
  stats: DeckStatistics;
  filteredCount: number;
  totalInDeck: number;
}

export function StatusBar({ stats, filteredCount, totalInDeck }: StatusBarProps) {
  return (
    <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 px-3 sm:px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 select-none z-20 overflow-x-auto scrollbar-none transition-colors">
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-slate-400">Hiển thị:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {filteredCount} / {totalInDeck} từ
          </span>
        </div>

        <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700" />

        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
          <CheckCircle size={12} />
          <span>Đã thuộc:</span>
          <span className="font-bold">{stats.mastered}</span>
        </div>

        <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700" />

        <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
          <AlertTriangle size={12} />
          <span>Cần ôn lại:</span>
          <span className="font-bold">{stats.needsReview}</span>
        </div>

        <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700" />

        <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
          <BookCheck size={12} />
          <span>Tỷ lệ nhớ:</span>
          <span className="font-bold">{stats.retentionRate}%</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[10px]">
        <div className="flex items-center gap-1">
          <Keyboard size={12} />
          <span>Phím tắt:</span>
        </div>
        <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300">
          Nháy đúp: Sửa ô
        </span>
        <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300">
          Enter: Lưu / Chấm
        </span>
        <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300">
          Tab: Chuyển ô
        </span>
      </div>
    </footer>
  );
}
