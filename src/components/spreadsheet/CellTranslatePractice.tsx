'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { VocabItem } from '@/types/vocabulary';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { compareChineseTranslation } from '@/lib/text-comparison';

interface CellTranslatePracticeProps {
  item: VocabItem;
  onUpdate: (updatedItem: VocabItem) => void;
  isGuest?: boolean;
  onRequireAuth?: () => void;
}

export function CellTranslatePractice({
  item,
  onUpdate,
  isGuest,
  onRequireAuth,
}: CellTranslatePracticeProps) {
  const [prevInputProp, setPrevInputProp] = useState(item.translationPracticeInput);
  const [inputVal, setInputVal] = useState(item.translationPracticeInput || '');
  const [showRef, setShowRef] = useState(false);

  if (item.translationPracticeInput !== prevInputProp) {
    setPrevInputProp(item.translationPracticeInput);
    setInputVal(item.translationPracticeInput || '');
  }

  // Derive smart evaluation result cleanly
  const evalResult = useMemo(() => {
    if (isGuest) return null;
    if (inputVal.trim() && item.example) {
      return compareChineseTranslation(inputVal, item.example);
    }
    return null;
  }, [inputVal, item.example, isGuest]);

  const handleAutoEvaluate = useCallback((typed: string) => {
    if (isGuest) return;
    const trimmed = typed.trim();
    if (!trimmed) {
      onUpdate({
        ...item,
        translationPracticeInput: '',
        translationStatus: 'unanswered',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (!item.example) {
      onUpdate({
        ...item,
        translationPracticeInput: trimmed,
        translationStatus: 'correct',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const res = compareChineseTranslation(trimmed, item.example);
    const newStatus = res.status === 'perfect' || res.status === 'close' ? 'correct' : 'review';

    onUpdate({
      ...item,
      translationPracticeInput: trimmed,
      translationStatus: newStatus,
      updatedAt: new Date().toISOString(),
    });
  }, [item, onUpdate, isGuest]);

  // Debounced auto-save so translation exercises are never lost
  useEffect(() => {
    if (isGuest) return;
    if (inputVal === (item.translationPracticeInput || '')) return;
    const timer = setTimeout(() => {
      handleAutoEvaluate(inputVal);
    }, 700);
    return () => clearTimeout(timer);
  }, [inputVal, item.translationPracticeInput, handleAutoEvaluate, isGuest]);

  if (isGuest) {
    return (
      <div
        onClick={onRequireAuth}
        className="w-full flex items-center justify-between px-2.5 py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs text-slate-400 dark:text-slate-500 select-none group"
        title="Đăng nhập để luyện dịch câu"
      >
        <span className="truncate">Tập dịch sang chữ Hán...</span>
        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
          Đăng nhập
        </span>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAutoEvaluate(inputVal);
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    if (inputVal !== (item.translationPracticeInput || '')) {
      handleAutoEvaluate(inputVal);
    }
  };

  const isAnswered = !!item.translationPracticeInput && item.translationPracticeInput.trim().length > 0;
  const isCorrect = isAnswered && item.translationStatus === 'correct';
  const isReview = isAnswered && item.translationStatus === 'review';

  return (
    <div className="flex flex-col gap-1 w-full group">
      <div className="relative flex items-center w-full">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Dịch sang tiếng Trung..."
          className={`w-full pl-2 pr-7 py-1.5 text-sm border rounded-lg font-hanzi transition-all duration-200 ${
            isCorrect
              ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-medium'
              : isReview
              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-medium'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-400/30`}
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {isAnswered && (
            <span
              title={
                evalResult
                  ? `Độ chính xác: ${evalResult.score}% - ${evalResult.feedback}`
                  : isCorrect
                  ? 'Dịch sát đáp án!'
                  : 'Cần xem lại câu mẫu'
              }
              className="flex items-center cursor-help"
            >
              {isCorrect ? (
                <Check size={14} className="text-emerald-600 font-bold" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 font-bold" />
              )}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowRef(!showRef)}
            title={showRef ? 'Ẩn câu mẫu' : 'Xem câu mẫu'}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
          >
            {showRef ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      {/* Reference sentence drawer */}
      {showRef && (
        <div className="text-xs bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2 space-y-1 animate-fadeIn shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-800 dark:text-emerald-400 text-[11px]">Câu mẫu chuẩn:</span>
            <SpeakButton text={item.example} size="sm" />
          </div>
          <div className="font-hanzi text-emerald-950 dark:text-emerald-200 font-medium">{item.example}</div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px] font-pinyin">{item.examplePinyin}</div>
        </div>
      )}
    </div>
  );
}
