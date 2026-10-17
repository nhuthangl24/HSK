'use client';

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { VocabItem, ReviewResult } from '@/types/vocabulary';
import { calculateNextSrs } from '@/lib/srs';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { tts } from '@/lib/tts';
import { useToast } from '@/context/ToastContext';

interface SmartReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VocabItem[];
  onBatchUpdate: (updatedItems: VocabItem[]) => void;
}

export function SmartReviewModal({
  isOpen,
  onClose,
  items,
  onBatchUpdate,
}: SmartReviewModalProps) {
  const toast = useToast();
  const [sessionCount, setSessionCount] = useState<number>(10);
  const [sessionFilter, setSessionFilter] = useState<'due' | 'wrong' | 'unlearned' | 'all'>('due');
  const [reviewQueue, setReviewQueue] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Per-card state
  const [userInput, setUserInput] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);

  // Session summary stats
  const [resultsMap, setResultsMap] = useState<
    Record<string, { item: VocabItem; result: ReviewResult }>
  >({});

  // Prepare review queue
  const startSession = () => {
    const today = new Date().toISOString().split('T')[0];

    let filtered = [...items];
    if (sessionFilter === 'due') {
      filtered = filtered.filter(
        (i) =>
          i.hanziStatus === 'wrong' ||
          i.hanziStatus === 'unlearned' ||
          !i.srs.dueDate ||
          i.srs.dueDate <= today
      );
    } else if (sessionFilter === 'wrong') {
      filtered = filtered.filter((i) => i.hanziStatus === 'wrong');
    } else if (sessionFilter === 'unlearned') {
      filtered = filtered.filter((i) => i.hanziStatus === 'unlearned');
    }

    // Sort by priority: wrong first, then unlearned, then due dates
    filtered.sort((a, b) => {
      const order = { wrong: 0, unlearned: 1, uncertain: 2, correct: 3 };
      return (order[a.hanziStatus] || 3) - (order[b.hanziStatus] || 3);
    });

    const selectedQueue = filtered.slice(0, sessionCount);

    if (selectedQueue.length === 0) {
      toast.warning('Không có từ nào phù hợp với điều kiện ôn tập này! Hãy thử chọn nguồn từ khác.', 'Chưa có từ ôn tập');
      return;
    }

    setReviewQueue(selectedQueue);
    setCurrentIndex(0);
    setUserInput('');
    setIsRevealed(false);
    setResultsMap({});
    setIsSessionStarted(true);
    setIsFinished(false);
  };

  const currentItem = reviewQueue[currentIndex];

  const handleReveal = () => {
    setIsRevealed(true);
    if (currentItem) {
      tts.speak(currentItem.hanzi);
    }
  };

  const handleRate = (rating: ReviewResult) => {
    if (!currentItem) return;

    const newSrs = calculateNextSrs(currentItem.srs, rating, 'smart', userInput);
    const updated: VocabItem = {
      ...currentItem,
      hanziPracticeInput: userInput || currentItem.hanziPracticeInput,
      hanziStatus: rating,
      srs: newSrs,
      updatedAt: new Date().toISOString(),
    };

    setResultsMap((prev) => ({
      ...prev,
      [currentItem.id]: { item: updated, result: rating },
    }));

    if (currentIndex + 1 < reviewQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setIsRevealed(false);
    } else {
      // Completed session!
      setIsFinished(true);
    }
  };

  const handleSaveAndClose = () => {
    const updatedList = Object.values(resultsMap).map((r) => r.item);
    if (updatedList.length > 0) {
      onBatchUpdate(updatedList);
    }
    onClose();
    setIsSessionStarted(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col border border-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <RotateCcw size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ôn Tập Thông Minh (SRS)
              </h2>
              <p className="text-xs text-slate-500">
                Thuật toán SuperMemo SM-2 tự động lên lịch dựa trên kết quả ghi nhớ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {!isSessionStarted ? (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nguồn từ cần ôn
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSessionFilter('due')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    sessionFilter === 'due'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">Đến hạn ôn hôm nay</div>
                  <div className="text-[11px] text-slate-500">
                    Ưu tiên từ sai và từ đến ngày ôn tập
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionFilter('wrong')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    sessionFilter === 'wrong'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-rose-700">Từ sai cần sửa</div>
                  <div className="text-[11px] text-slate-500">
                    Chỉ ôn lại các từ vừa làm sai
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionFilter('unlearned')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    sessionFilter === 'unlearned'
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">Từ mới chưa học</div>
                  <div className="text-[11px] text-slate-500">
                    Học các từ vựng chưa bắt đầu
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionFilter('all')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    sessionFilter === 'all'
                      ? 'border-slate-700 bg-slate-100 text-slate-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">Tất cả trong bộ từ</div>
                  <div className="text-[11px] text-slate-500">
                    Ôn tập tổng hợp ngẫu nhiên
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Số lượng từ cho phiên này
              </label>
              <div className="flex items-center gap-2">
                {[5, 10, 20, 30, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSessionCount(num)}
                    className={`flex-1 py-2 text-xs rounded-lg border font-medium cursor-pointer transition-all ${
                      sessionCount === num
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {num} từ
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={startSession}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Bắt đầu phiên ôn tập
              </button>
            </div>
          </div>
        ) : isFinished ? (
          /* Finished summary view */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Trophy size={30} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Hoàn thành phiên ôn tập!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bạn đã ôn luyện xong {reviewQueue.length} từ. Lịch ôn tập đã được cập
              nhật tự động vào hệ thống.
            </p>

            {/* Results breakdown */}
            <div className="grid grid-cols-3 gap-2 py-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Đúng (Thuộc)</span>
                <span className="text-base font-bold text-emerald-600">
                  {
                    Object.values(resultsMap).filter((r) => r.result === 'correct')
                      .length
                  }
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Chưa chắc</span>
                <span className="text-base font-bold text-amber-600">
                  {
                    Object.values(resultsMap).filter((r) => r.result === 'uncertain')
                      .length
                  }
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Sai (Cần ôn lại)</span>
                <span className="text-base font-bold text-rose-600">
                  {
                    Object.values(resultsMap).filter((r) => r.result === 'wrong')
                      .length
                  }
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Lưu kết quả và quay lại bảng
            </button>
          </div>
        ) : (
          /* Active Review Flashcard Tester */
          <div className="p-6 flex flex-col gap-4">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Từ {currentIndex + 1} / {reviewQueue.length}
                </span>
                <span className="font-semibold text-emerald-700">
                  HSK {currentItem.hskLevel}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / reviewQueue.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nghĩa tiếng Việt
              </span>
              <div className="text-xl font-bold text-slate-900 mb-1">
                {currentItem.meaning}
              </div>

              {/* Context example */}
              {currentItem.exampleMeaning && (
                <div className="text-xs text-slate-500 italic mt-2 max-w-sm">
                  Ví dụ: &ldquo;{currentItem.exampleMeaning}&rdquo;
                </div>
              )}

              {/* Reveal answer section */}
              {isRevealed ? (
                <div className="mt-5 flex flex-col items-center gap-1 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="font-hanzi text-3xl font-bold text-emerald-800">
                      {currentItem.hanzi}
                    </span>
                    <SpeakButton text={currentItem.hanzi} size="md" />
                  </div>
                  <div className="font-pinyin text-slate-600 font-medium text-sm">
                    {currentItem.pinyin}
                  </div>
                  {currentItem.example && (
                    <div className="mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-left max-w-sm">
                      <div className="font-hanzi font-medium text-slate-900">
                        {currentItem.example}
                      </div>
                      <div className="font-pinyin text-slate-500 text-[11px]">
                        {currentItem.examplePinyin}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 w-full max-w-xs">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleReveal();
                      }
                    }}
                    placeholder="Nhập chữ Hán để thử nhớ..."
                    className="w-full px-3 py-2 text-center text-sm font-hanzi border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleReveal}
                    className="mt-2 text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer flex items-center justify-center gap-1 mx-auto"
                  >
                    <Eye size={13} />
                    Hiện đáp án đối chiếu
                  </button>
                </div>
              )}
            </div>

            {/* Assessment Buttons */}
            {isRevealed ? (
              <div className="grid grid-cols-3 gap-2 pt-2 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => handleRate('correct')}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <CheckCircle2 size={15} />
                  Nhớ đúng
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('uncertain')}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <HelpCircle size={15} />
                  Chưa chắc
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('wrong')}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <XCircle size={15} />
                  Nhớ sai
                </button>
              </div>
            ) : (
              <div className="text-center text-[11px] text-slate-400">
                Nhập chữ Hán rồi bấm Enter hoặc &ldquo;Hiện đáp án đối chiếu&rdquo; để tự đánh giá
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
