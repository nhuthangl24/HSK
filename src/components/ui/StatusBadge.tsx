'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, CircleDot, HelpCircle } from 'lucide-react';
import { ReviewResult, TranslationResult } from '@/types/vocabulary';

interface HanziStatusBadgeProps {
  status: ReviewResult;
  onChange?: (newStatus: ReviewResult) => void;
  interactive?: boolean;
}

export function HanziStatusBadge({
  status,
  onChange,
  interactive = false,
}: HanziStatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'correct':
        return {
          label: 'Đúng',
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
          icon: <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 mr-1" />,
        };
      case 'wrong':
        return {
          label: 'Sai',
          bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60',
          icon: <XCircle size={13} className="text-rose-600 dark:text-rose-400 mr-1" />,
        };
      case 'uncertain':
        return {
          label: 'Chưa chắc',
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60',
          icon: <AlertCircle size={13} className="text-amber-600 dark:text-amber-400 mr-1" />,
        };
      case 'unlearned':
      default:
        return {
          label: 'Chưa học',
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
          icon: <CircleDot size={13} className="text-slate-400 dark:text-slate-500 mr-1" />,
        };
    }
  };

  const config = getBadgeConfig();

  if (!interactive || !onChange) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} select-none`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  }

  // Next status rotation on click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cycle: ReviewResult[] = ['unlearned', 'correct', 'uncertain', 'wrong'];
    const nextIdx = (cycle.indexOf(status) + 1) % cycle.length;
    onChange(cycle[nextIdx]);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Bấm để đổi trạng thái"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors shadow-2xs ${config.bg}`}
    >
      {config.icon}
      {config.label}
    </button>
  );
}

interface TranslationStatusBadgeProps {
  status: TranslationResult;
  onChange?: (newStatus: TranslationResult) => void;
  interactive?: boolean;
}

export function TranslationStatusBadge({
  status,
  onChange,
  interactive = false,
}: TranslationStatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'correct':
        return {
          label: 'Đúng câu',
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
          icon: <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 mr-1" />,
        };
      case 'review':
        return {
          label: 'Cần xem lại',
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60',
          icon: <AlertCircle size={13} className="text-amber-600 dark:text-amber-400 mr-1" />,
        };
      case 'unanswered':
      default:
        return {
          label: 'Chưa làm',
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
          icon: <HelpCircle size={13} className="text-slate-400 dark:text-slate-500 mr-1" />,
        };
    }
  };

  const config = getBadgeConfig();

  if (!interactive || !onChange) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} select-none`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cycle: TranslationResult[] = ['unanswered', 'correct', 'review'];
    const nextIdx = (cycle.indexOf(status) + 1) % cycle.length;
    onChange(cycle[nextIdx]);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Bấm để đổi kết quả dịch"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors shadow-2xs ${config.bg}`}
    >
      {config.icon}
      {config.label}
    </button>
  );
}
