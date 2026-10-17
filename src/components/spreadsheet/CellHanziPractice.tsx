'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { VocabItem } from '@/types/vocabulary';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { calculateNextSrs } from '@/lib/srs';

interface CellHanziPracticeProps {
  item: VocabItem;
  onUpdate: (updatedItem: VocabItem) => void;
  isRecallMode?: boolean;
  isGuest?: boolean;
  onRequireAuth?: () => void;
}

export function CellHanziPractice({
  item,
  onUpdate,
  isGuest,
  onRequireAuth,
}: CellHanziPracticeProps) {
  const [prevInputProp, setPrevInputProp] = useState(item.hanziPracticeInput);
  const [inputVal, setInputVal] = useState(item.hanziPracticeInput || '');
  const [showAnswer, setShowAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (item.hanziPracticeInput !== prevInputProp) {
    setPrevInputProp(item.hanziPracticeInput);
    setInputVal(item.hanziPracticeInput || '');
  }

  // Automatic evaluation: System checks whether typed text matches Hanzi
  const handleAutoCheck = useCallback((typed: string) => {
    if (isGuest) return;
    const trimmed = typed.trim();
    if (!trimmed) {
      // Empty input -> unlearned
      onUpdate({
        ...item,
        hanziPracticeInput: '',
        hanziStatus: 'unlearned',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const isMatch = trimmed === item.hanzi.trim();
    const result = isMatch ? 'correct' : 'wrong';
    const newSrs = calculateNextSrs(item.srs, result, 'hanzi', trimmed);

    onUpdate({
      ...item,
      hanziPracticeInput: trimmed,
      hanziStatus: result,
      srs: newSrs,
      updatedAt: new Date().toISOString(),
    });
  }, [item, onUpdate, isGuest]);

  // Debounced auto-save so user progress is never lost even if they don't press Enter
  useEffect(() => {
    if (isGuest) return;
    if (inputVal === (item.hanziPracticeInput || '')) return;
    const timer = setTimeout(() => {
      handleAutoCheck(inputVal);
    }, 700);
    return () => clearTimeout(timer);
  }, [inputVal, item.hanziPracticeInput, handleAutoCheck, isGuest]);

  if (isGuest) {
    return (
      <div
        onClick={onRequireAuth}
        className="w-full flex items-center justify-between px-2.5 py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs text-slate-400 dark:text-slate-500 select-none group"
        title="Đăng nhập để luyện viết chữ Hán"
      >
        <span className="truncate">Nhập chữ Hán...</span>
        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
          Đăng nhập
        </span>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAutoCheck(inputVal);
      // Optional: blur to commit
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (inputVal !== (item.hanziPracticeInput || '')) {
      handleAutoCheck(inputVal);
    }
  };

  const isAnswered = !!item.hanziPracticeInput && item.hanziPracticeInput.trim().length > 0;
  const isCorrect = isAnswered && item.hanziStatus === 'correct';
  const isWrong = isAnswered && item.hanziStatus === 'wrong';

  return (
    <div className="flex flex-col gap-1 w-full group">
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => {
            const val = e.target.value;
            setInputVal(val);
            // Instant auto-check when exact match typed
            if (val.trim() === item.hanzi.trim()) {
              handleAutoCheck(val);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Nhập chữ Hán..."
          className={`w-full pl-2 pr-7 py-1.5 text-sm border rounded-lg font-hanzi transition-all duration-200 ${
            isCorrect
              ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-medium'
              : isWrong
              ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-medium'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-400/30`}
        />

        {/* Right action inside input: Status icon or Eye peek */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {isAnswered && (
            <span title={isCorrect ? 'Đúng!' : 'Sai! Nhấn mắt để xem đáp án'}>
              {isCorrect ? (
                <Check size={14} className="text-emerald-600 font-bold" />
              ) : (
                <X size={14} className="text-rose-500 font-bold" />
              )}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            title={showAnswer ? 'Ẩn đáp án' : 'Xem đáp án mẫu'}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
          >
            {showAnswer ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      {/* Answer peek popover */}
      {showAnswer && (
        <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">Đáp án:</span>
            <span className="font-hanzi text-sm font-bold text-emerald-800 dark:text-emerald-400">
              {item.hanzi}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-pinyin text-[11px]">({item.pinyin})</span>
          </div>
          <SpeakButton text={item.hanzi} size="sm" />
        </div>
      )}
    </div>
  );
}
