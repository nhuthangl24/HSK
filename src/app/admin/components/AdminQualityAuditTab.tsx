'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Copy,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Layers,
  X,
  Save,
} from 'lucide-react';
import { VocabItem, HskLevel } from '@/types/vocabulary';
import { useToast } from '@/context/ToastContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

interface Props {
  words: VocabItem[];
  onRefreshWords?: () => void;
  onEditWord?: (word: VocabItem) => void;
  onDeleteWord?: (id: string) => void;
}

export default function AdminQualityAuditTab({
  words,
  onRefreshWords,
  onEditWord,
  onDeleteWord,
}: Props) {
  const toast = useToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'duplicates' | 'missing-pinyin' | 'missing-meaning' | 'no-example'>('duplicates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWordToFix, setSelectedWordToFix] = useState<VocabItem | null>(null);
  const [savingFix, setSavingFix] = useState(false);

  // Group Hanzi to detect duplicates
  const hanziMap = useMemo(() => {
    const map = new Map<string, VocabItem[]>();
    words.forEach((w) => {
      const hz = (w.hanzi || '').trim();
      if (!hz) return;
      const existing = map.get(hz) || [];
      existing.push(w);
      map.set(hz, existing);
    });
    return map;
  }, [words]);

  const duplicateGroups = useMemo(() => {
    const groups: { hanzi: string; items: VocabItem[] }[] = [];
    hanziMap.forEach((items, hanzi) => {
      if (items.length > 1) {
        groups.push({ hanzi, items });
      }
    });
    return groups;
  }, [hanziMap]);

  const duplicateWordsCount = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [duplicateGroups]);

  const missingPinyinList = useMemo(() => {
    return words.filter((w) => !w.pinyin || !w.pinyin.trim());
  }, [words]);

  const missingMeaningList = useMemo(() => {
    return words.filter((w) => !w.meaning || !w.meaning.trim());
  }, [words]);

  const noExampleList = useMemo(() => {
    return words.filter((w) => !w.example || !w.example.trim());
  }, [words]);

  // Overall Quality Score Calculation
  const qualityScore = useMemo(() => {
    if (words.length === 0) return 100;
    const issues =
      duplicateWordsCount +
      missingPinyinList.length * 2 +
      missingMeaningList.length * 2 +
      Math.floor(noExampleList.length * 0.2);
    const score = Math.max(0, 100 - (issues / (words.length * 2)) * 100);
    return Math.round(score * 10) / 10;
  }, [words.length, duplicateWordsCount, missingPinyinList, missingMeaningList, noExampleList]);

  // Handle Quick Save Word Fix
  const handleSaveFix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWordToFix) return;

    setSavingFix(true);
    try {
      const res = await fetch('/api/admin/vocab', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify(selectedWordToFix),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã sửa từ "${selectedWordToFix.hanzi}" thành công!`);
        setSelectedWordToFix(null);
        if (onRefreshWords) onRefreshWords();
      } else {
        toast.error(data.message || 'Lỗi cập nhật từ');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối máy chủ.');
    } finally {
      setSavingFix(false);
    }
  };

  // Handle Delete Duplicate
  const handleDeleteItem = async (item: VocabItem) => {
    if (!confirm(`Xóa bản sao từ vựng "${item.hanzi}" (ID: ${item.id})?`)) return;
    try {
      const res = await fetch(`/api/admin/vocab?id=${item.id}`, {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa bản sao "${item.hanzi}"`);
        if (onRefreshWords) onRefreshWords();
      } else {
        toast.error(data.message || 'Lỗi xóa từ vựng');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối máy chủ.');
    }
  };

  // Export Audit Report
  const handleExportAuditReport = () => {
    const reportData = {
      scannedAt: new Date().toISOString(),
      totalWords: words.length,
      qualityScore,
      duplicates: duplicateGroups.map((g) => ({
        hanzi: g.hanzi,
        count: g.items.length,
        items: g.items.map((i) => ({ id: i.id, level: i.hskLevel, pinyin: i.pinyin, meaning: i.meaning })),
      })),
      missingPinyin: missingPinyinList.map((i) => ({ id: i.id, hanzi: i.hanzi, level: i.hskLevel })),
      missingMeaning: missingMeaningList.map((i) => ({ id: i.id, hanzi: i.hanzi, level: i.hskLevel })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hsk-vocab-quality-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất báo cáo chất lượng từ vựng!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Kiểm định & Rà soát Chất lượng Từ vựng HSK
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động quét trùng lặp Hanzi giữa các cấp độ, phát hiện từ thiếu Pinyin, thiếu nghĩa Tiếng Việt hoặc thiếu câu ví dụ.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefreshWords}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Quét lại
          </button>

          <button
            onClick={handleExportAuditReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Quality Score */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Điểm chất lượng dữ liệu</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {qualityScore}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dựa trên {words.length} từ vựng hệ thống</p>
        </div>

        {/* Duplicate Hanzi */}
        <div
          onClick={() => setActiveFilter('duplicates')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'duplicates'
              ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Từ trùng lặp (Hanzi)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {duplicateGroups.length} <span className="text-xs font-normal text-slate-500">nhóm</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{duplicateWordsCount} bản ghi bị trùng</p>
        </div>

        {/* Missing Pinyin */}
        <div
          onClick={() => setActiveFilter('missing-pinyin')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'missing-pinyin'
              ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/30 dark:border-rose-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Thiếu Pinyin</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {missingPinyinList.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cần bổ sung phiên âm</p>
        </div>

        {/* Missing Meaning */}
        <div
          onClick={() => setActiveFilter('missing-meaning')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'missing-meaning'
              ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Thiếu nghĩa Việt</span>
            <Info className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {missingMeaningList.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cần cập nhật nghĩa</p>
        </div>
      </div>

      {/* Main Inspection View */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('duplicates')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeFilter === 'duplicates'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Trùng lặp ({duplicateGroups.length} nhóm)
            </button>
            <button
              onClick={() => setActiveFilter('missing-pinyin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeFilter === 'missing-pinyin'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Thiếu Pinyin ({missingPinyinList.length})
            </button>
            <button
              onClick={() => setActiveFilter('missing-meaning')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeFilter === 'missing-meaning'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Thiếu Nghĩa ({missingMeaningList.length})
            </button>
            <button
              onClick={() => setActiveFilter('no-example')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeFilter === 'no-example'
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Chưa có ví dụ ({noExampleList.length})
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Lọc từ chữ Hán..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          {/* VIEW: DUPLICATES */}
          {activeFilter === 'duplicates' && (
            <div className="space-y-4">
              {duplicateGroups.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Tuyệt vời! Không phát hiện từ trùng lặp nào.
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Tất cả Hanzi trong hệ thống đều là duy nhất.</p>
                </div>
              ) : (
                duplicateGroups
                  .filter((g) => !searchQuery || g.hanzi.includes(searchQuery))
                  .map((group) => (
                    <div
                      key={group.hanzi}
                      className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 bg-amber-50/20 dark:bg-amber-950/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                            {group.hanzi}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {group.items.length} bản ghi trùng lặp
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.items.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  HSK {item.hskLevel}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">#{item.id.slice(0, 8)}</span>
                              </div>
                              <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                                {item.pinyin || '<chưa có pinyin>'}
                              </div>
                              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {item.meaning || '<chưa có nghĩa>'}
                              </div>
                              {item.example && (
                                <div className="text-[11px] text-slate-500 italic line-clamp-1">
                                  VD: {item.example}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedWordToFix(item)}
                                className="px-2 py-1 text-[11px] font-medium rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="px-2 py-1 text-[11px] font-medium rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                              >
                                Xóa bản này
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* VIEW: MISSING PINYIN OR MEANING */}
          {(activeFilter === 'missing-pinyin' || activeFilter === 'missing-meaning' || activeFilter === 'no-example') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Cấp độ</th>
                    <th className="py-2.5 px-3">Chữ Hán</th>
                    <th className="py-2.5 px-3">Pinyin</th>
                    <th className="py-2.5 px-3">Nghĩa tiếng Việt</th>
                    <th className="py-2.5 px-3">Ví dụ</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(activeFilter === 'missing-pinyin'
                    ? missingPinyinList
                    : activeFilter === 'missing-meaning'
                    ? missingMeaningList
                    : noExampleList
                  )
                    .filter((w) => !searchQuery || w.hanzi.includes(searchQuery) || (w.meaning && w.meaning.includes(searchQuery)))
                    .slice(0, 50)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            HSK {item.hskLevel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-base font-serif font-bold text-slate-900 dark:text-white">
                          {item.hanzi}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.pinyin ? (
                            <span className="text-slate-700 dark:text-slate-300">{item.pinyin}</span>
                          ) : (
                            <span className="text-rose-500 font-bold italic">Thiếu pinyin</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.meaning ? (
                            <span className="text-slate-700 dark:text-slate-300">{item.meaning}</span>
                          ) : (
                            <span className="text-rose-500 font-bold italic">Thiếu nghĩa</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {item.example || <span className="text-slate-400 italic">Chưa có</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedWordToFix(item)}
                            className="px-2 py-1 text-xs font-medium rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                          >
                            Bổ sung
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Word Fix Modal */}
      {selectedWordToFix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-500" /> Sửa thông tin từ vựng
              </h3>
              <button
                onClick={() => setSelectedWordToFix(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFix} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chữ Hán *
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedWordToFix.hanzi}
                    onChange={(e) => setSelectedWordToFix({ ...selectedWordToFix, hanzi: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-bold font-serif rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cấp độ HSK
                  </label>
                  <select
                    value={selectedWordToFix.hskLevel}
                    onChange={(e) => setSelectedWordToFix({ ...selectedWordToFix, hskLevel: Number(e.target.value) as HskLevel })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        HSK {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pinyin *
                </label>
                <input
                  type="text"
                  required
                  value={selectedWordToFix.pinyin || ''}
                  onChange={(e) => setSelectedWordToFix({ ...selectedWordToFix, pinyin: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="VD: nǐ hǎo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={selectedWordToFix.meaning || ''}
                  onChange={(e) => setSelectedWordToFix({ ...selectedWordToFix, meaning: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="VD: Xin chào"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Câu ví dụ (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={selectedWordToFix.example || ''}
                  onChange={(e) => setSelectedWordToFix({ ...selectedWordToFix, example: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="VD: 你好！很高兴认识你。"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedWordToFix(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingFix}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {savingFix ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
