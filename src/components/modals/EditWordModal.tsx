'use client';

import React, { useState } from 'react';
import { X, Edit2, AlertCircle } from 'lucide-react';
import { VocabItem, Deck, HskLevel } from '@/types/vocabulary';

interface EditWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedItem: VocabItem) => void;
  item: VocabItem | null;
  decks: Deck[];
}

interface EditWordFormProps {
  item: VocabItem;
  onClose: () => void;
  onUpdate: (updatedItem: VocabItem) => void;
  decks: Deck[];
}

function EditWordForm({ item, onClose, onUpdate, decks }: EditWordFormProps) {
  const [hanzi, setHanzi] = useState(item.hanzi);
  const [pinyin, setPinyin] = useState(item.pinyin);
  const [meaning, setMeaning] = useState(item.meaning);
  const [partOfSpeech, setPartOfSpeech] = useState(item.partOfSpeech || '');
  const [hskLevel, setHskLevel] = useState<HskLevel>(item.hskLevel);
  const [deckId, setDeckId] = useState(item.deckId);
  const [example, setExample] = useState(item.example);
  const [examplePinyin, setExamplePinyin] = useState(item.examplePinyin);
  const [exampleMeaning, setExampleMeaning] = useState(item.exampleMeaning);
  const [notes, setNotes] = useState(item.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hanzi.trim()) {
      setError('Vui lòng nhập chữ Hán');
      return;
    }
    if (!meaning.trim()) {
      setError('Vui lòng nhập nghĩa tiếng Việt');
      return;
    }

    const updated: VocabItem = {
      ...item,
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      meaning: meaning.trim(),
      partOfSpeech: partOfSpeech.trim() || undefined,
      hskLevel,
      deckId,
      example: example.trim(),
      examplePinyin: examplePinyin.trim(),
      exampleMeaning: exampleMeaning.trim(),
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onUpdate(updated);
    onClose();
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-scaleIn">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
            <Edit2 size={15} />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Chỉnh Sửa Từ Vựng
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chữ Hán <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={hanzi}
              onChange={(e) => setHanzi(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm font-hanzi focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phiên âm (Pinyin)
            </label>
            <input
              type="text"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm font-pinyin focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nghĩa tiếng Việt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Từ loại
            </label>
            <input
              type="text"
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cấp HSK
            </label>
            <select
              value={hskLevel}
              onChange={(e) => setHskLevel(Number(e.target.value) as HskLevel)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                <option key={lvl} value={lvl}>
                  HSK {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bộ từ
            </label>
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none"
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

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Câu ví dụ & Dịch nghĩa
          </h4>

          <div>
            <label className="block text-xs text-slate-600 mb-0.5">
              Ví dụ (Chữ Hán)
            </label>
            <input
              type="text"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm font-hanzi focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                Phiên âm ví dụ
              </label>
              <input
                type="text"
                value={examplePinyin}
                onChange={(e) => setExamplePinyin(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm font-pinyin focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-0.5">
                Dịch nghĩa ví dụ
              </label>
              <input
                type="text"
                value={exampleMeaning}
                onChange={(e) => setExampleMeaning(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-0.5">
              Ghi chú cá nhân
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mẹo nhớ, ngữ cảnh..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Cập nhật thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}

export function EditWordModal({
  isOpen,
  onClose,
  onUpdate,
  item,
  decks,
}: EditWordModalProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <EditWordForm
        key={item.id}
        item={item}
        onClose={onClose}
        onUpdate={onUpdate}
        decks={decks}
      />
    </div>
  );
}
