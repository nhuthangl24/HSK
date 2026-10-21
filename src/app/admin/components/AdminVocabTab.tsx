'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit2,
  Volume2,
  CheckCircle2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VocabItem, HskLevel } from '@/types/vocabulary';
import { tts } from '@/lib/tts';

interface Props {
  vocabList: VocabItem[];
  loadingVocab: boolean;
  onRefreshVocab: () => void;
  onSaveWord: (word: Partial<VocabItem>, isNew: boolean) => Promise<void>;
  onDeleteWord: (id: string) => Promise<void>;
  initialHskFilter?: string;
}

export default function AdminVocabTab({
  vocabList,
  loadingVocab,
  onRefreshVocab,
  onSaveWord,
  onDeleteWord,
  initialHskFilter = 'all',
}: Props) {
  const [search, setSearch] = useState('');
  const [hskFilter, setHskFilter] = useState<string>(initialHskFilter);
  const [sortBy, setSortBy] = useState<'recent' | 'hanzi' | 'pinyin' | 'hsk'>('recent');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Edit / Create Word Modal
  const [editingWord, setEditingWord] = useState<Partial<VocabItem> | null>(null);
  const [isEditingNew, setIsEditingNew] = useState(false);
  const [savingWord, setSavingWord] = useState(false);

  // Delete Confirm
  const [deleteConfirmWord, setDeleteConfirmWord] = useState<VocabItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter & Sort
  const filteredVocab = useMemo(() => {
    let result = [...vocabList];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.hanzi.toLowerCase().includes(q) ||
          v.pinyin.toLowerCase().includes(q) ||
          v.meaning.toLowerCase().includes(q) ||
          (v.example && v.example.toLowerCase().includes(q))
      );
    }

    if (hskFilter !== 'all') {
      const targetLvl = Number(hskFilter);
      result = result.filter((v) => v.hskLevel === targetLvl);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'hanzi':
          return a.hanzi.localeCompare(b.hanzi, 'zh-Hans-CN');
        case 'pinyin':
          return a.pinyin.localeCompare(b.pinyin);
        case 'hsk':
          return (a.hskLevel || 1) - (b.hskLevel || 1);
        case 'recent':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return result;
  }, [vocabList, search, hskFilter, sortBy]);

  const totalPages = Math.ceil(filteredVocab.length / pageSize) || 1;
  const paginatedVocab = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVocab.slice(start, start + pageSize);
  }, [filteredVocab, page, pageSize]);

  const handleOpenCreate = () => {
    setIsEditingNew(true);
    setEditingWord({
      hanzi: '',
      pinyin: '',
      meaning: '',
      hskLevel: hskFilter !== 'all' ? (Number(hskFilter) as HskLevel) : 1,
      example: '',
      examplePinyin: '',
      exampleMeaning: '',
    });
  };

  const handleOpenEdit = (item: VocabItem) => {
    setIsEditingNew(false);
    setEditingWord({ ...item });
  };

  const handleSubmitSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord?.hanzi || !editingWord?.pinyin || !editingWord?.meaning) return;
    setSavingWord(true);
    try {
      await onSaveWord(editingWord, isEditingNew);
      setEditingWord(null);
    } finally {
      setSavingWord(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmWord) return;
    setIsDeleting(true);
    try {
      await onDeleteWord(deleteConfirmWord.id);
      setDeleteConfirmWord(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Kho Từ Vựng Chuẩn HSK 1 – 9
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản lý {vocabList.length.toLocaleString()} mục từ vựng chính quy theo chuẩn Hanban và khung khảo thí quốc tế mới.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs self-start sm:self-center"
        >
          <Plus size={14} />
          <span>Thêm từ vựng mới</span>
        </button>
      </div>

      {/* Level Filter Bar & Search */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
        {/* HSK Level Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1">Cấp độ:</span>
          {['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setHskFilter(lvl);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs rounded-lg transition-colors font-semibold ${
                hskFilter === lvl
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {lvl === 'all' ? 'Tất cả' : `HSK ${lvl}`}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo chữ Hán, phiên âm pinyin hoặc nghĩa tiếng Việt..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="recent">Mới thêm trước</option>
            <option value="hsk">Theo cấp HSK (1-9)</option>
            <option value="hanzi">Chữ Hán (A-Z)</option>
            <option value="pinyin">Pinyin (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Vocabulary Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Cấp độ</th>
                <th className="py-3 px-4">Chữ Hán</th>
                <th className="py-3 px-4">Phiên âm Pinyin</th>
                <th className="py-3 px-4">Nghĩa tiếng Việt</th>
                <th className="py-3 px-4">Câu ví dụ</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {loadingVocab ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Đang tải danh sách từ vựng...
                  </td>
                </tr>
              ) : paginatedVocab.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy từ vựng nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedVocab.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        HSK {item.hskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-serif text-slate-900 dark:text-white">
                          {item.hanzi}
                        </span>
                        <button
                          type="button"
                          onClick={() => tts.speak(item.hanzi)}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Phát âm chuẩn"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                      {item.pinyin}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                      {item.meaning}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {item.example || '—'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmWord(item)}
                        className="px-2.5 py-1 text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredVocab.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Hiển thị {(page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, filteredVocab.length)} trên tổng số {filteredVocab.length.toLocaleString()} từ
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit / Add Word Modal */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              type="button"
              onClick={() => setEditingWord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Edit2 size={16} className="text-emerald-500" />
              {isEditingNew ? 'Thêm từ vựng mới vào hệ thống' : `Chỉnh sửa từ: ${editingWord.hanzi}`}
            </h3>

            <form onSubmit={handleSubmitSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chữ Hán *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingWord.hanzi || ''}
                    onChange={(e) => setEditingWord({ ...editingWord, hanzi: e.target.value })}
                    className="w-full px-3 py-2 text-base font-bold font-serif rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cấp độ HSK
                  </label>
                  <select
                    value={editingWord.hskLevel || 1}
                    onChange={(e) => setEditingWord({ ...editingWord, hskLevel: Number(e.target.value) as HskLevel })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                      <option key={l} value={l}>
                        HSK {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phiên âm Pinyin *
                </label>
                <input
                  type="text"
                  required
                  value={editingWord.pinyin || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, pinyin: e.target.value })}
                  placeholder="VD: nǐ hǎo"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={editingWord.meaning || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, meaning: e.target.value })}
                  placeholder="VD: Xin chào"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Câu ví dụ (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={editingWord.example || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, example: e.target.value })}
                  placeholder="VD: 你好！很高兴认识你。"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingWord(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingWord}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  {savingWord ? 'Đang lưu...' : 'Lưu từ vựng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-6 relative">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Xóa từ vựng khỏi hệ thống
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Bạn có chắc chắn muốn xóa từ <strong className="text-slate-900 dark:text-white font-bold">{deleteConfirmWord.hanzi}</strong> (
              {deleteConfirmWord.pinyin} - {deleteConfirmWord.meaning}) khỏi cơ sở dữ liệu?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmWord(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
