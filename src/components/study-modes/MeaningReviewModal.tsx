'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
} from 'lucide-react';
import { VocabItem } from '@/types/vocabulary';
import { normalizeVietnamese } from '@/lib/pinyin-utils';
import { SpeakButton } from '@/components/ui/SpeakButton';

interface MeaningReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VocabItem[];
}

export function MeaningReviewModal({
  isOpen,
  onClose,
  items,
}: MeaningReviewModalProps) {
  // Direction: 'hanzi_to_vi' (Show Hanzi -> guess Vietnamese) OR 'vi_to_hanzi' (Show Vietnamese -> guess Hanzi)
  const [direction, setDirection] = useState<'hanzi_to_vi' | 'vi_to_hanzi'>('hanzi_to_vi');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'close' | 'wrong' | null>(null);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex % items.length];

  const handleToggleDirection = () => {
    setDirection((prev) => (prev === 'hanzi_to_vi' ? 'vi_to_hanzi' : 'hanzi_to_vi'));
    setUserInput('');
    setIsRevealed(false);
    setFeedback(null);
  };

  const handleCheck = () => {
    if (!userInput.trim()) return;

    if (direction === 'hanzi_to_vi') {
      const userNorm = normalizeVietnamese(userInput.trim().toLowerCase());
      const meanNorm = normalizeVietnamese(currentItem.meaning.toLowerCase());

      // Check if user answer is contained or exact
      if (meanNorm === userNorm) {
        setFeedback('correct');
      } else {
        const parts = meanNorm.split(/[,;\/]/).map((p) => p.trim());
        const isMatch = parts.some((p) => p.includes(userNorm) || userNorm.includes(p));
        if (isMatch) {
          setFeedback('close');
        } else {
          setFeedback('wrong');
        }
      }
    } else {
      // Vietnamese to Hanzi
      if (userInput.trim() === currentItem.hanzi.trim()) {
        setFeedback('correct');
      } else {
        setFeedback('wrong');
      }
    }
    setIsRevealed(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setUserInput('');
    setIsRevealed(false);
    setFeedback(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleDirection}
              title="Đổi chiều kiểm tra"
              className="p-1.5 bg-white border border-slate-300 rounded-md text-emerald-700 hover:bg-emerald-50 cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowRightLeft size={13} />
              {direction === 'hanzi_to_vi' ? 'Trung → Việt' : 'Việt → Trung'}
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Từ {currentIndex + 1} / {items.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center gap-4">
          {direction === 'hanzi_to_vi' ? (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Hãy nhập nghĩa tiếng Việt
              </span>
              <div className="flex items-center gap-2">
                <span className="font-hanzi text-4xl font-bold text-slate-900">
                  {currentItem.hanzi}
                </span>
                <SpeakButton text={currentItem.hanzi} size="md" />
              </div>
              <div className="font-pinyin text-slate-500 text-sm mt-1">
                {currentItem.pinyin}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Hãy nhập chữ Hán tương ứng
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {currentItem.meaning}
              </div>
              <div className="font-pinyin text-slate-500 text-sm mt-1">
                Phiên âm: {currentItem.pinyin}
              </div>
            </div>
          )}

          {/* User Answer Input */}
          <div className="w-full">
            <input
              type="text"
              autoFocus
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (isRevealed) {
                    handleNext();
                  } else {
                    handleCheck();
                  }
                }
              }}
              placeholder={
                direction === 'hanzi_to_vi'
                  ? 'Gõ nghĩa tiếng Việt...'
                  : 'Gõ chữ Hán...'
              }
              className="w-full px-3 py-2 text-center text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Answer Reveal & Feedback */}
          {isRevealed && (
            <div
              className={`w-full p-3 rounded-lg text-xs flex flex-col gap-1 border animate-fadeIn ${
                feedback === 'correct'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : feedback === 'close'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="font-bold">
                {feedback === 'correct'
                  ? 'Chính xác!'
                  : feedback === 'close'
                  ? 'Đúng ý!'
                  : 'Chưa chính xác'}
              </div>
              <div>
                <span className="font-semibold text-slate-600">Đáp án chuẩn: </span>
                <span className="font-bold">
                  {direction === 'hanzi_to_vi'
                    ? currentItem.meaning
                    : `${currentItem.hanzi} (${currentItem.pinyin})`}
                </span>
              </div>
              {currentItem.example && (
                <div className="text-[11px] text-slate-600 italic mt-1 pt-1 border-t border-slate-200/60 text-left">
                  Ví dụ: {currentItem.example} ({currentItem.exampleMeaning})
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="w-full flex items-center justify-between gap-2 pt-2">
            {!isRevealed ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsRevealed(true)}
                  className="px-3 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Xem đáp án
                </button>
                <button
                  type="button"
                  onClick={handleCheck}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Kiểm tra
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Từ tiếp theo (Enter) →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
