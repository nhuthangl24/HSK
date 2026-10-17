'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  Search,
  BookOpen,
  Layers,
  Tag,
  Award,
  Settings,
  RefreshCw,
  Shield,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { UserWorkspaceData } from '@/lib/server-db';

interface WorkspaceUserSummary {
  userId: string;
  name: string;
  email: string;
  customWordsCount: number;
  customHskCount: number;
  customTopicsCount: number;
  masteredCount: number;
  streakDays: number;
  isLocked: boolean;
  createdAt: string;
}

export default function AdminWorkspacesTab() {
  const toast = useToast();
  const [summaries, setSummaries] = useState<WorkspaceUserSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Detail
  const [workspaceData, setWorkspaceData] = useState<UserWorkspaceData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'words' | 'hsk' | 'topics' | 'settings'>('words');
  const [wordSearch, setWordSearch] = useState('');

  const fetchSummaries = useCallback(async () => {
    setLoadingList(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hsk_auth_token') || '' : '';
      const res = await fetch('/api/admin/workspaces', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.workspaces)) {
          setSummaries(data.workspaces);
          if (data.workspaces.length > 0 && !selectedUserId) {
            setSelectedUserId(data.workspaces[0].userId);
          }
        }
      }
    } catch (err) {
      console.error('Fetch workspaces error:', err);
    } finally {
      setLoadingList(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const fetchDetail = useCallback(async (userId: string) => {
    setLoadingDetail(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hsk_auth_token') || '' : '';
      const res = await fetch(`/api/admin/workspaces/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.workspace) {
          setWorkspaceData(data.workspace);
        }
      } else {
        toast.error('Không thể tải chi tiết không gian người dùng.');
      }
    } catch {
      toast.error('Lỗi khi tải chi tiết không gian.');
    } finally {
      setLoadingDetail(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedUserId) {
      fetchDetail(selectedUserId);
    }
  }, [selectedUserId, fetchDetail]);

  const filteredSummaries = summaries.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.userId.includes(q);
  });

  const filteredWords = workspaceData?.customWords.filter((w) => {
    if (!wordSearch.trim()) return true;
    const q = wordSearch.toLowerCase().trim();
    return (
      w.hanzi.toLowerCase().includes(q) ||
      w.pinyin.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="text-emerald-600" size={22} />
            Không Gian Dữ Liệu Cá Nhân Của Học Viên (User Workspaces)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Khám phá và kiểm tra kho từ vựng cá nhân, nhóm học tùy chỉnh và tiến độ học tập độc lập của từng tài khoản.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchSummaries();
            if (selectedUserId) fetchDetail(selectedUserId);
          }}
          className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold transition-all"
        >
          <RefreshCw size={13} className={loadingList || loadingDetail ? 'animate-spin' : ''} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: User List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách học viên ({filteredSummaries.length})
            </h3>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* User List Scrollable */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {loadingList ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Đang tải danh sách học viên...
              </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không tìm thấy học viên nào.
              </div>
            ) : (
              filteredSummaries.map((u) => {
                const isSelected = selectedUserId === u.userId;
                return (
                  <div
                    key={u.userId}
                    onClick={() => setSelectedUserId(u.userId)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 truncate max-w-[150px]">
                        {u.name}
                      </span>
                      {u.isLocked && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold">
                          Đã khóa
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mb-2 font-mono">
                      {u.email}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1.5 border-t border-slate-100/80">
                      <span className="font-semibold text-emerald-700">
                        {u.customWordsCount} từ riêng
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{u.customHskCount} nhóm HSK</span>
                      <span className="text-slate-300">•</span>
                      <span>{u.customTopicsCount} chủ đề</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detail Inspector (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          {!selectedUserId ? (
            <div className="py-24 text-center text-xs text-slate-400">
              <FolderKanban size={36} className="mx-auto text-slate-300 mb-2" />
              Chọn một học viên từ danh sách bên trái để kiểm tra không gian làm việc.
            </div>
          ) : loadingDetail ? (
            <div className="py-24 text-center text-xs text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Đang tải dữ liệu không gian của học viên...
            </div>
          ) : workspaceData ? (
            <>
              {/* Alert Header */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Shield size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        Không gian làm việc: {workspaceData.user.name}
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-bold">
                        Dữ liệu độc lập
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {workspaceData.user.email} (Mã UID: {workspaceData.user.id})
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Từ vựng riêng</span>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {workspaceData.customWords.length}
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Nhóm HSK riêng</span>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {workspaceData.customHskGroups.length}
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Chủ đề riêng</span>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {workspaceData.customTopics.length}
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Từ đã thuộc</span>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {workspaceData.masteredCount}
                  </div>
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex border-b border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setWorkspaceSubTab('words')}
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer ${
                    workspaceSubTab === 'words'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Từ vựng cá nhân ({workspaceData.customWords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceSubTab('hsk')}
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer ${
                    workspaceSubTab === 'hsk'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Nhóm HSK riêng ({workspaceData.customHskGroups.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceSubTab('topics')}
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer ${
                    workspaceSubTab === 'topics'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Chủ đề riêng ({workspaceData.customTopics.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceSubTab('settings')}
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer ${
                    workspaceSubTab === 'settings'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Thiết lập cá nhân
                </button>
              </div>

              {/* Sub-tab 1: Words */}
              {workspaceSubTab === 'words' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={wordSearch}
                        onChange={(e) => setWordSearch(e.target.value)}
                        placeholder="Tìm từ của học viên này..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      Hiển thị {filteredWords.length} từ
                    </span>
                  </div>

                  {filteredWords.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Học viên chưa thêm từ vựng cá nhân nào.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 bg-white">
                            <th className="py-2 px-3">Hán tự</th>
                            <th className="py-2 px-3">Pinyin</th>
                            <th className="py-2 px-3">Nghĩa tiếng Việt</th>
                            <th className="py-2 px-3">Cấp HSK</th>
                            <th className="py-2 px-3">Chủ đề</th>
                            <th className="py-2 px-3 text-right">Lượt ôn tập</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredWords.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-900 font-hanzi text-sm">
                                {w.hanzi}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-600">
                                {w.pinyin}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                                {w.meaning}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                  HSK {w.hskLevel || 1}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">
                                {w.topicName || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                                {w.srs?.totalReviews || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Custom HSK */}
              {workspaceSubTab === 'hsk' && (
                <div className="space-y-3">
                  {workspaceData.customHskGroups.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Học viên này chưa tạo nhóm HSK tùy chỉnh nào.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {workspaceData.customHskGroups.map((g) => (
                        <div key={g.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color || '#f59e0b' }} />
                              {g.name}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                              HSK {g.levelNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {g.description || 'Chưa có mô tả.'}
                          </p>
                          <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-semibold">
                            {g.wordCount || 0} từ trong nhóm
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: Custom Topics */}
              {workspaceSubTab === 'topics' && (
                <div className="space-y-3">
                  {workspaceData.customTopics.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Học viên này chưa tạo chủ đề riêng nào.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {workspaceData.customTopics.map((t) => (
                        <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#10b981' }} />
                              {t.name}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {t.description || 'Chưa có mô tả.'}
                          </p>
                          <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-semibold">
                            {t.wordCount || 0} từ trong chủ đề
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 4: Personal Settings */}
              {workspaceSubTab === 'settings' && (
                <div className="space-y-4 max-w-md">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Chế độ giao diện:</span>
                      <span className="font-bold text-slate-800 capitalize">
                        {workspaceData.settings?.theme || 'system'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Giọng đọc TTS:</span>
                      <span className="font-bold text-slate-800 font-mono text-[11px]">
                        {workspaceData.settings?.ttsVoiceURI || 'Mặc định hệ điều hành'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tốc độ đọc (Rate):</span>
                      <span className="font-bold text-slate-800">
                        {workspaceData.settings?.ttsRate || 0.85}x
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tự động phát âm:</span>
                      <span className={workspaceData.settings?.autoPronounce ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                        {workspaceData.settings?.autoPronounce ? 'Bật' : 'Tắt'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Cỡ chữ Hán:</span>
                      <span className="font-bold text-slate-800 capitalize">
                        {workspaceData.settings?.fontSize || 'normal'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
