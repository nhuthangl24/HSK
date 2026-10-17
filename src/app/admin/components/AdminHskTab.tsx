'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  BookOpen,
  Sparkles,
  Filter,
  RefreshCw,
  FolderPlus,
  Edit2,
  ShieldCheck,
  CheckCircle2,
  Folder,
} from 'lucide-react';
import { Deck, VocabItem, HskLevel } from '@/types/vocabulary';
import { AdminStats } from '@/types/auth';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  loadDecksForUser,
  saveDeckToFirestore,
  deleteDeckFromFirestore,
} from '@/lib/firebase-db';
import { getFirebaseServices } from '@/lib/firebase';
import { INITIAL_DECKS, isProtectedDeck } from '@/data/initial-decks';

interface AdminHskTabProps {
  stats: AdminStats | null;
  vocabList: VocabItem[];
  onSelectHskLevel: (level: number) => void;
  onSelectDeck?: (deckId: string) => void;
}

export default function AdminHskTab({
  stats,
  vocabList,
  onSelectHskLevel,
  onSelectDeck,
}: AdminHskTabProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>(INITIAL_DECKS);
  const [loading, setLoading] = useState(false);
  const [filterHsk, setFilterHsk] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'system' | 'user'>('all');

  // Modal create/edit deck
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckLevel, setDeckLevel] = useState<HskLevel | 'custom' | 'all'>('custom');
  const [deckScope, setDeckScope] = useState<'system' | 'user'>('system');
  const [deckColor, setDeckColor] = useState('#10b981');
  const [saving, setSaving] = useState(false);

  // Compute exact system count per level from vocabList
  const levelCounts: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };
  vocabList.forEach((w) => {
    if (w.hskLevel && levelCounts[w.hskLevel] !== undefined) {
      levelCounts[w.hskLevel]++;
    }
  });

  // Calculate word count per deck from current vocabList
  const getDeckWordCount = (deckId: string, deckHsk?: HskLevel | 'custom' | 'all') => {
    if (deckId === 'deck-all') return vocabList.length;
    const directMatches = vocabList.filter((w) => w.deckId === deckId).length;
    if (directMatches > 0) return directMatches;
    if (typeof deckHsk === 'number') {
      return vocabList.filter((w) => w.hskLevel === deckHsk).length;
    }
    return 0;
  };

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    try {
      if (getFirebaseServices().isConfigured) {
        const remoteDecks = await loadDecksForUser(user?.id || 'admin');
        if (remoteDecks && remoteDecks.length > 0) {
          setDecks(remoteDecks);
          return;
        }
      }
      setDecks(INITIAL_DECKS);
    } catch (err) {
      console.error('Fetch decks error:', err);
      toast.error('Không thể tải danh sách thư mục.');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const handleOpenCreate = () => {
    setEditingDeck(null);
    setDeckName('');
    setDeckDesc('');
    setDeckLevel('custom');
    setDeckScope('system');
    setDeckColor('#10b981');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: Deck) => {
    if (isProtectedDeck(d.id)) {
      toast.info('Các cấp độ HSK 1 - HSK 6 mặc định được bảo vệ, không thể chỉnh sửa.');
      return;
    }
    setEditingDeck(d);
    setDeckName(d.name);
    setDeckDesc(d.description || '');
    setDeckLevel(d.hskLevel || 'custom');
    setDeckScope(d.scope === 'user' ? 'user' : 'system');
    setDeckColor(d.color || '#10b981');
    setIsModalOpen(true);
  };

  const handleSaveDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName.trim()) {
      toast.error('Vui lòng nhập tên thư mục / bộ từ.');
      return;
    }

    setSaving(true);
    try {
      const isSystem = deckScope === 'system';
      const deckToSave: Deck = {
        id: editingDeck ? editingDeck.id : `deck-${Date.now()}`,
        name: deckName.trim(),
        description: deckDesc.trim() || undefined,
        hskLevel: deckLevel,
        scope: isSystem ? 'system' : 'user',
        ownerId: isSystem ? 'system' : (editingDeck?.ownerId || user?.id || 'admin'),
        userId: isSystem ? 'system' : (editingDeck?.userId || user?.id || 'admin'),
        color: deckColor,
        isBuiltIn: false,
        createdAt: editingDeck ? editingDeck.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (getFirebaseServices().isConfigured) {
        await saveDeckToFirestore(deckToSave, deckToSave.userId);
      }

      setDecks((prev) => {
        const exists = prev.some((d) => d.id === deckToSave.id);
        if (exists) {
          return prev.map((d) => (d.id === deckToSave.id ? deckToSave : d));
        }
        return [...prev, deckToSave];
      });

      toast.success(
        editingDeck
          ? `Đã cập nhật thư mục: "${deckToSave.name}"`
          : `Đã tạo thư mục ${isSystem ? 'Hệ Thống' : 'Cá Nhân'}: "${deckToSave.name}" (Đã lưu & đồng bộ)!`
      );

      setIsModalOpen(false);
      setEditingDeck(null);
    } catch (err) {
      console.error('Save deck error:', err);
      toast.error('Lỗi khi lưu thư mục.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeck = async (id: string, name: string) => {
    if (isProtectedDeck(id)) {
      toast.error('Không thể xóa các cấp độ HSK mặc định của hệ thống.');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa thư mục "${name}"? Các từ thuộc thư mục này sẽ trở về kho chung.`)) {
      return;
    }

    try {
      if (getFirebaseServices().isConfigured) {
        await deleteDeckFromFirestore(id);
      }
      setDecks((prev) => prev.filter((d) => d.id !== id));
      toast.success(`Đã xóa thư mục "${name}" thành công.`);
    } catch (err) {
      console.error('Delete deck error:', err);
      toast.error('Không thể xóa thư mục.');
    }
  };

  const HSK_LEVEL_META = [
    { level: 1, title: 'HSK 1 (Sơ cấp 1)', color: 'from-blue-500 to-indigo-600', badge: 'bg-blue-500/10 text-blue-700 border-blue-200' },
    { level: 2, title: 'HSK 2 (Sơ cấp 2)', color: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
    { level: 3, title: 'HSK 3 (Trung cấp 1)', color: 'from-amber-500 to-yellow-600', badge: 'bg-amber-500/10 text-amber-700 border-amber-200' },
    { level: 4, title: 'HSK 4 (Trung cấp 2)', color: 'from-orange-500 to-red-500', badge: 'bg-orange-500/10 text-orange-700 border-orange-200' },
    { level: 5, title: 'HSK 5 (Cao cấp 1)', color: 'from-rose-500 to-pink-600', badge: 'bg-rose-500/10 text-rose-700 border-rose-200' },
    { level: 6, title: 'HSK 6 (Cao cấp 2)', color: 'from-purple-500 to-violet-600', badge: 'bg-purple-500/10 text-purple-700 border-purple-200' },
    { level: 7, title: 'HSK 7 (Chuyên sâu)', color: 'from-indigo-600 to-slate-800', badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
    { level: 8, title: 'HSK 8 (Nâng cao)', color: 'from-slate-700 to-slate-900', badge: 'bg-slate-500/10 text-slate-700 border-slate-200' },
    { level: 9, title: 'HSK 9 (Bậc thầy)', color: 'from-amber-600 to-red-800', badge: 'bg-red-500/10 text-red-700 border-red-200' },
  ];

  const customDecks = decks.filter((d) => !isProtectedDeck(d.id));

  const filteredCustomDecks = customDecks.filter((d) => {
    if (scopeFilter !== 'all' && (d.scope || 'user') !== scopeFilter) return false;
    if (filterHsk !== 'all' && d.hskLevel !== (filterHsk === 'custom' ? 'custom' : Number(filterHsk))) return false;
    return true;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="text-emerald-600" size={22} />
            Quản Lý Cấp Độ HSK & Thư Mục Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý và đồng bộ toàn diện giữa 9 cấp độ HSK 3.0 và các Thư mục / Bộ từ vựng trên toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDecks}
            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-semibold transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Đồng bộ lại</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl shadow-xs font-semibold cursor-pointer transition-all"
          >
            <FolderPlus size={14} />
            <span>Tạo thư mục hệ thống</span>
          </button>
        </div>
      </div>

      {/* Section 1: HSK System Levels 1 - 9 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            9 Cấp Độ Chuẩn HSK 3.0 Của Hệ Thống
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tổng cộng {vocabList.length.toLocaleString()} từ chuẩn
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HSK_LEVEL_META.map((meta) => {
            const count = levelCounts[meta.level] || 0;
            const percentage = vocabList.length > 0 ? Math.round((count / vocabList.length) * 100) : 0;
            return (
              <div
                key={meta.level}
                onClick={() => onSelectHskLevel(meta.level)}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                    HSK {meta.level}
                  </span>
                  <BookOpen size={15} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {meta.title}
                  </h4>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{count.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">từ vựng</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Chiếm {percentage}% kho từ</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline">
                    Xem danh sách →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Custom / System Decks (Folders) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Thư Mục & Bộ Từ Vựng Hệ Thống
                <span className="text-xs font-mono font-normal text-slate-400">({customDecks.length})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thư mục được gắn thẻ &quot;Hệ thống&quot; sẽ lập tức hiển thị và đồng bộ cho tất cả học viên ôn luyện.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  scopeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tất cả ({customDecks.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('system')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  scopeFilter === 'system'
                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldCheck size={12} />
                Hệ thống ({customDecks.filter((d) => d.scope === 'system' || d.ownerId === 'system').length})
              </button>
            </div>

            <select
              value={filterHsk}
              onChange={(e) => setFilterHsk(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="all">Tất cả cấp độ</option>
              <option value="custom">Chủ đề tự do</option>
              {[1, 2, 3, 4, 5, 6].map((lvl) => (
                <option key={lvl} value={lvl}>Quy chiếu HSK {lvl}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang đồng bộ danh sách thư mục từ đám mây...
          </div>
        ) : filteredCustomDecks.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <Folder size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p>Chưa có thư mục nào khớp bộ lọc.</p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              + Tạo thư mục hệ thống đầu tiên ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Tên Thư Mục</th>
                  <th className="py-2.5 px-3">Phạm vi</th>
                  <th className="py-2.5 px-3">Cấp quy chiếu</th>
                  <th className="py-2.5 px-3">Mô tả</th>
                  <th className="py-2.5 px-3 text-center">Số từ</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomDecks.map((deck) => {
                  const isSys = deck.scope === 'system' || deck.ownerId === 'system';
                  const wordCount = getDeckWordCount(deck.id, deck.hskLevel);

                  return (
                    <tr key={deck.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-md shrink-0"
                            style={{ backgroundColor: deck.color || (isSys ? '#10b981' : '#3b82f6') }}
                          />
                          <span className="font-semibold text-sm">{deck.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isSys ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold text-[10px]">
                            <ShieldCheck size={11} />
                            Hệ Thống (Toàn bộ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                            Cá nhân ({deck.ownerId || 'user'})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          {deck.hskLevel && typeof deck.hskLevel === 'number'
                            ? `HSK ${deck.hskLevel}`
                            : 'Tự do'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {deck.description || '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono">
                          {wordCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(deck)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa thư mục"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeck(deck.id, deck.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Xóa thư mục"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create/Edit Deck */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <FolderPlus className="text-emerald-600" size={18} />
              {editingDeck ? 'Chỉnh Sửa Thư Mục Hệ Thống' : 'Tạo Thư Mục / Bộ Từ Mới'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Thư mục hệ thống sẽ được lưu trực tiếp trên Cloud và hiển thị ngay trên thanh điều hướng cho tất cả học viên.
            </p>

            <form onSubmit={handleSaveDeck} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên thư mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Ví dụ: Từ vựng Du lịch, Thương mại, HSK 3..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phạm vi phát hành
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeckScope('system')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                      deckScope === 'system'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <ShieldCheck size={16} />
                    <div>
                      <div className="font-semibold text-xs">Toàn Hệ Thống</div>
                      <div className="text-[10px] opacity-80">Mọi học viên đều thấy</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeckScope('user')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                      deckScope === 'user'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Folder size={16} />
                    <div>
                      <div className="font-semibold text-xs">Cá Nhân Admin</div>
                      <div className="text-[10px] opacity-80">Chỉ riêng admin</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cấp độ quy chiếu
                </label>
                <select
                  value={deckLevel}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDeckLevel(v === 'custom' ? 'custom' : (Number(v) as HskLevel));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="custom">Chủ đề tự do (Custom)</option>
                  {[1, 2, 3, 4, 5, 6].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Quy chiếu HSK {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mô tả thư mục</label>
                <textarea
                  value={deckDesc}
                  onChange={(e) => setDeckDesc(e.target.value)}
                  placeholder="Ghi chú nội dung trọng tâm của bộ từ này..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-hidden resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingDeck(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : editingDeck ? 'Lưu thay đổi' : 'Tạo thư mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
