'use client';

import React, { useState } from 'react';
import { X, Plus, AlertCircle, Sparkles, Clipboard, Check } from 'lucide-react';
import { VocabItem, Deck, HskLevel } from '@/types/vocabulary';
import { createInitialSrs } from '@/lib/srs';
import { parseSmartPasteText } from '@/lib/chinese-dict';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newItem: VocabItem) => void;
  decks: Deck[];
  currentDeckId: string;
  existingItems: VocabItem[];
}

export function AddWordModal({
  isOpen,
  onClose,
  onAdd,
  decks,
  currentDeckId,
  existingItems,
}: AddWordModalProps) {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'smart' | 'paste'>('smart');
  const [isSystemWord, setIsSystemWord] = useState(isAdmin);
  const [hanzi, setHanzi] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [meaning, setMeaning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [hskLevel, setHskLevel] = useState<HskLevel>(1);
  const [deckId, setDeckId] = useState(
    currentDeckId === 'deck-all' ? 'deck-hsk1' : currentDeckId
  );
  const [example, setExample] = useState('');
  const [examplePinyin, setExamplePinyin] = useState('');
  const [exampleMeaning, setExampleMeaning] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Paste raw text state
  const [pasteText, setPasteText] = useState('');

  const toast = useToast();

  if (!isOpen) return null;

  // Check duplicate
  const isDuplicate = existingItems.some(
    (item) => item.hanzi.trim() === hanzi.trim() && hanzi.trim() !== ''
  );

  const handleHanziChange = (val: string) => {
    setHanzi(val);
    setError('');
  };


  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parseSmartPasteText(pasteText);

    if (parsed.hanzi) setHanzi(parsed.hanzi);
    if (parsed.pinyin) setPinyin(parsed.pinyin);
    if (parsed.meaning) setMeaning(parsed.meaning);
    if (parsed.partOfSpeech) setPartOfSpeech(parsed.partOfSpeech);
    if (parsed.hskLevel) setHskLevel(parsed.hskLevel);
    if (parsed.example) setExample(parsed.example);
    if (parsed.examplePinyin) setExamplePinyin(parsed.examplePinyin);
    if (parsed.exampleMeaning) setExampleMeaning(parsed.exampleMeaning);

    setActiveTab('smart');
    toast.success(`Đã trích xuất xong từ: ${parsed.hanzi || 'chữ Hán'}`, 'Trích xuất thành công');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hanzi.trim()) {
      setError('Vui lòng nhập chữ Hán');
      return;
    }
    if (!pinyin.trim()) {
      setError('Vui lòng nhập phiên âm Pinyin');
      return;
    }
    if (!meaning.trim()) {
      setError('Vui lòng nhập nghĩa tiếng Việt');
      return;
    }

    const newItem: VocabItem = {
      id: `vocab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      deckId,
      hskLevel,
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      meaning: meaning.trim(),
      partOfSpeech: partOfSpeech.trim() || undefined,
      hanziPracticeInput: '',
      hanziStatus: 'unlearned',
      example: example.trim(),
      examplePinyin: examplePinyin.trim(),
      exampleMeaning: exampleMeaning.trim(),
      translationPracticeInput: '',
      translationStatus: 'unanswered',
      notes: notes.trim() || undefined,
      isSystem: isAdmin ? isSystemWord : false,
      userId: isAdmin && isSystemWord ? 'system' : user?.id || 'community_user',
      srs: createInitialSrs(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAdd(newItem);
    toast.success(`Đã thêm từ "${newItem.hanzi}" vào bảng từ vựng!`, 'Thêm thành công');
    onClose();

    // Reset form
    setHanzi('');
    setPinyin('');
    setMeaning('');
    setPartOfSpeech('');
    setExample('');
    setExamplePinyin('');
    setExampleMeaning('');
    setNotes('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-scaleIn">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Thêm Từ Vựng Thông Minh
              </h3>
              <p className="text-[11px] text-slate-500">
                Nhập thông tin từ vựng hoặc dán văn bản để tự động trích xuất
              </p>

            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-2 text-xs font-semibold bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('smart')}
            className={`pb-2 px-3 border-b-2 cursor-pointer flex items-center gap-1.5 transition-colors ${
              activeTab === 'smart'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={13} className="text-emerald-600" />
            Nhập nhanh có gợi ý
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2 px-3 border-b-2 cursor-pointer flex items-center gap-1.5 transition-colors ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clipboard size={13} className="text-blue-600" />
            Dán thông minh (Smart Paste)
          </button>
        </div>

        {/* Tab 2: Smart Paste */}
        {activeTab === 'paste' ? (
          <div className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Dán một dòng từ vựng bất kỳ
              </label>
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Ví dụ: 苹果 / píngguǒ / quả táo  hoặc  学习 (xuéxí): học tập"
                className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Hệ thống tự nhận diện Chữ Hán, Pinyin và Nghĩa dù có hay không có dấu ngăn cách.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('smart')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleApplyPaste}
                disabled={!pasteText.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check size={14} />
                Trích xuất & Điền vào form
              </button>
            </div>
          </div>
        ) : (
          /* Tab 1: Smart Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isDuplicate && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                <span>
                  Từ &ldquo;{hanzi}&rdquo; đã có trong kho từ. Bạn vẫn có thể lưu nếu là từ đa nghĩa.
                </span>
              </div>
            )}

            {isAdmin && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adminSystemWordCheck"
                  checked={isSystemWord}
                  onChange={(e) => setIsSystemWord(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="adminSystemWordCheck" className="text-xs font-semibold text-emerald-900 cursor-pointer select-none">
                  Lưu vào kho từ hệ thống (Toàn bộ cộng đồng người học đều nhìn thấy)
                </label>
              </div>
            )}

            {/* Core Word Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Chữ Hán (Từ mới) <span className="text-rose-500">*</span>
                  </label>
                </div>

                <input
                  type="text"
                  required
                  autoFocus
                  value={hanzi}
                  onChange={(e) => handleHanziChange(e.target.value)}
                  placeholder="Ví dụ: 苹果, 学习..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-hanzi focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phiên âm (Pinyin) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pinyin}
                  onChange={(e) => setPinyin(e.target.value)}
                  placeholder="Ví dụ: píngguǒ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-pinyin focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nghĩa tiếng Việt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="Ví dụ: quả táo, trái táo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Từ loại
                </label>
                <input
                  type="text"
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value)}
                  placeholder="danh từ, động từ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cấp HSK
                </label>
                <select
                  value={hskLevel}
                  onChange={(e) => setHskLevel(Number(e.target.value) as HskLevel)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      HSK {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thuộc bộ từ
                </label>
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {decks
                    .filter((d) => d.id !== 'deck-all')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Example Sentence Section */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Câu ví dụ & Dịch nghĩa
                </h4>
              </div>

              <div>
                <label className="block text-slate-600 mb-0.5">
                  Ví dụ (Chữ Hán)
                </label>
                <input
                  type="text"
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  placeholder="Ví dụ: 我想买两斤红苹果。"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-hanzi focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-0.5">
                    Phiên âm câu ví dụ
                  </label>
                  <input
                    type="text"
                    value={examplePinyin}
                    onChange={(e) => setExamplePinyin(e.target.value)}
                    placeholder="Wǒ xiǎng mǎi liǎng jīn hóng píngguǒ."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-pinyin focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-0.5">
                    Dịch nghĩa câu ví dụ
                  </label>
                  <input
                    type="text"
                    value={exampleMeaning}
                    onChange={(e) => setExampleMeaning(e.target.value)}
                    placeholder="Tôi muốn mua hai cân táo đỏ."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Lưu vào bảng
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
