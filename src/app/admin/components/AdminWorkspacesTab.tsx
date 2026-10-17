'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  Search,
  BookOpen,
  Layers,
  Tag,
  Settings,
  RefreshCw,
  Shield,
  Trash2,
  Lock,
  CheckCircle2,
  Flame,
  GraduationCap,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';
import {
  loadAllUsersFromFirestore,
  loadWordsFromFirestore,
  loadDecksForUser,
  loadUserProgressFromFirestore,
  deleteWordFromFirestore,
} from '@/lib/firebase-db';
import { User, UserSettings } from '@/types/auth';
import { VocabItem, Deck, CustomHskGroup } from '@/types/vocabulary';
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

interface AdminWorkspacesTabProps {
  users?: User[];
  initialSelectedUserId?: string | null;
  onSelectUser?: (userId: string) => void;
}

export default function AdminWorkspacesTab({
  users: propUsers,
  initialSelectedUserId,
  onSelectUser,
}: AdminWorkspacesTabProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<WorkspaceUserSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null);

  // Detail
  const [workspaceData, setWorkspaceData] = useState<UserWorkspaceData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'words' | 'hsk' | 'topics' | 'settings'>('words');
  const [wordSearch, setWordSearch] = useState('');
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);

  // Synchronize when initialSelectedUserId changes
  useEffect(() => {
    if (initialSelectedUserId) {
      setSelectedUserId(initialSelectedUserId);
    }
  }, [initialSelectedUserId]);

  const fetchSummaries = useCallback(async () => {
    setLoadingList(true);
    try {
      // 1. Gather all known users from props, cache, or Firestore
      let knownUsers: User[] = propUsers && propUsers.length > 0 ? propUsers : [];
      if (knownUsers.length === 0 && typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('hsk_admin_users_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              knownUsers = parsed;
            }
          }
        } catch {}
      }

      if (knownUsers.length === 0) {
        try {
          const fsUsers = await loadAllUsersFromFirestore();
          if (fsUsers.length > 0) {
            knownUsers = fsUsers;
          }
        } catch {}
      }

      const authHeaders = getClientAuthHeaders(user);
      let serverWorkspaces: WorkspaceUserSummary[] = [];

      // If we have users, sync them to server
      if (knownUsers.length > 0) {
        try {
          const res = await fetch('/api/admin/workspaces', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ users: knownUsers }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.workspaces)) {
              serverWorkspaces = data.workspaces;
            }
          }
        } catch {}
      } else {
        try {
          const res = await fetch('/api/admin/workspaces', {
            headers: authHeaders,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.workspaces)) {
              serverWorkspaces = data.workspaces;
            }
          }
        } catch {}
      }

      // Merge knownUsers and serverWorkspaces
      const summaryMap = new Map<string, WorkspaceUserSummary>();
      for (const sw of serverWorkspaces) {
        summaryMap.set(sw.userId, sw);
      }

      for (const u of knownUsers) {
        if (!u.id) continue;
        const existing = summaryMap.get(u.id);
        summaryMap.set(u.id, {
          userId: u.id,
          name: u.name || u.email?.split('@')[0] || 'Học viên',
          email: u.email || '',
          customWordsCount: existing?.customWordsCount || 0,
          customHskCount: existing?.customHskCount || 0,
          customTopicsCount: existing?.customTopicsCount || 0,
          masteredCount: existing?.masteredCount ?? (u.totalMastered || 0),
          streakDays: existing?.streakDays ?? (u.streakDays || 0),
          isLocked: existing?.isLocked ?? (!!u.isLocked),
          createdAt: existing?.createdAt || u.createdAt || new Date().toISOString(),
        });
      }

      const mergedList = Array.from(summaryMap.values());
      setSummaries(mergedList);

      if (mergedList.length > 0) {
        setSelectedUserId((prev) => {
          if (prev && mergedList.some((m) => m.userId === prev)) {
            return prev;
          }
          if (initialSelectedUserId && mergedList.some((m) => m.userId === initialSelectedUserId)) {
            return initialSelectedUserId;
          }
          return mergedList[0].userId;
        });
      }
    } catch (err) {
      console.error('Fetch workspaces error:', err);
    } finally {
      setLoadingList(false);
    }
  }, [user, propUsers, initialSelectedUserId]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const fetchDetail = useCallback(async (userId: string) => {
    setLoadingDetail(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      let srvData: UserWorkspaceData | null = null;
      try {
        const res = await fetch(`/api/admin/workspaces/${userId}`, {
          headers: authHeaders,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.workspace) {
            srvData = data.workspace;
          }
        }
      } catch {}

      // 2. Fetch directly from Firestore (live cloud data)
      let firestoreWords: VocabItem[] = [];
      let firestoreDecks: Deck[] = [];
      let firestoreProgress: Record<string, Record<string, unknown>> = {};

      try {
        const allWords = await loadWordsFromFirestore();
        firestoreWords = allWords.filter((w) => w.userId === userId && !w.isSystem);
      } catch {}

      try {
        const decks = await loadDecksForUser(userId);
        firestoreDecks = decks.filter(
          (d) => (d.ownerId === userId || d.userId === userId) && !d.isBuiltIn && d.scope !== 'system'
        );
      } catch {}

      try {
        firestoreProgress = await loadUserProgressFromFirestore(userId);
      } catch {}

      // 3. LocalStorage fallback
      let localWords: VocabItem[] = [];
      let localDecks: Deck[] = [];
      if (typeof window !== 'undefined') {
        try {
          const wRaw = localStorage.getItem(`hsk_vocab_${userId}`);
          if (wRaw) {
            const parsed = JSON.parse(wRaw);
            if (Array.isArray(parsed)) {
              localWords = parsed.filter((w: VocabItem) => w.userId === userId && !w.isSystem);
            }
          }
        } catch {}

        try {
          const dRaw = localStorage.getItem(`hsk_decks_${userId}`);
          if (dRaw) {
            const parsed = JSON.parse(dRaw);
            if (Array.isArray(parsed)) {
              localDecks = parsed.filter(
                (d: Deck) => (d.ownerId === userId || d.userId === userId) && !d.isBuiltIn
              );
            }
          }
        } catch {}
      }

      // Merge Custom Words (dedup by ID)
      const wordMap = new Map<string, VocabItem>();
      for (const w of srvData?.customWords || []) {
        if (w.id) wordMap.set(w.id, w);
      }
      for (const w of firestoreWords) {
        if (w.id) wordMap.set(w.id, { ...wordMap.get(w.id), ...w });
      }
      for (const w of localWords) {
        if (w.id && !wordMap.has(w.id)) wordMap.set(w.id, w);
      }
      const combinedWords = Array.from(wordMap.values());

      // Merge Custom Decks / HSK Groups
      const groupMap = new Map<string, CustomHskGroup>();
      for (const g of srvData?.customHskGroups || []) {
        if (g.id) groupMap.set(g.id, g);
      }
      for (const d of firestoreDecks) {
        if (d.id) {
          groupMap.set(d.id, {
            id: d.id,
            name: d.name,
            levelNumber: typeof d.hskLevel === 'number' ? d.hskLevel : 1,
            description: d.description || '',
            scope: 'user',
            color: d.color || '#10b981',
            icon: d.icon || 'layers',
            wordCount: d.wordCount || 0,
            ownerId: d.ownerId || userId,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          });
        }
      }
      for (const d of localDecks) {
        if (d.id && !groupMap.has(d.id)) {
          groupMap.set(d.id, {
            id: d.id,
            name: d.name,
            levelNumber: typeof d.hskLevel === 'number' ? d.hskLevel : 1,
            description: d.description || '',
            scope: 'user',
            color: d.color || '#10b981',
            icon: d.icon || 'layers',
            wordCount: d.wordCount || 0,
            ownerId: d.ownerId || userId,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          });
        }
      }
      const combinedHskGroups = Array.from(groupMap.values());

      // Find user profile
      const foundSummary = summaries.find((s) => s.userId === userId);
      const foundPropUser = propUsers?.find((u) => u.id === userId);
      const finalUser: User = srvData?.user || foundPropUser || {
        id: userId,
        name: foundSummary?.name || 'Học viên',
        email: foundSummary?.email || '',
        role: 'user',
        streakDays: foundSummary?.streakDays || 0,
        totalMastered: foundSummary?.masteredCount || 0,
        isLocked: !!foundSummary?.isLocked,
        createdAt: foundSummary?.createdAt || new Date().toISOString(),
      };

      // Calculate progress stats
      const firestoreProgressKeys = Object.keys(firestoreProgress);
      let masteredCount = srvData?.masteredCount || finalUser.totalMastered || 0;
      let totalReviews = srvData?.totalReviews || 0;
      let progressCount = srvData?.progressCount || 0;

      if (firestoreProgressKeys.length > 0) {
        progressCount = Math.max(progressCount, firestoreProgressKeys.length);
        let fsMastered = 0;
        let fsReviews = 0;
        for (const k of firestoreProgressKeys) {
          const p = firestoreProgress[k] as { hanziStatus?: string; srs?: { repetition?: number; totalReviews?: number } };
          if (p.hanziStatus === 'correct' || (p.srs && (p.srs.repetition || 0) >= 2)) {
            fsMastered++;
          }
          fsReviews += p.srs?.totalReviews || 0;
        }
        masteredCount = Math.max(masteredCount, fsMastered);
        totalReviews = Math.max(totalReviews, fsReviews);
      }

      const finalWorkspace: UserWorkspaceData = {
        user: finalUser,
        customWords: combinedWords,
        customHskGroups: combinedHskGroups,
        customTopics: srvData?.customTopics || [],
        progressCount,
        masteredCount,
        totalReviews,
        settings: srvData?.settings || {
          userId,
          theme: 'system',
          ttsVoiceURI: '',
          ttsRate: 0.85,
          autoPronounce: true,
          fontSize: 'normal',
        },
      };

      setWorkspaceData(finalWorkspace);

      // Update counters in summaries list
      setSummaries((prev) =>
        prev.map((s) =>
          s.userId === userId
            ? {
                ...s,
                customWordsCount: combinedWords.length,
                customHskCount: combinedHskGroups.length,
                masteredCount,
              }
            : s
        )
      );
    } catch (err) {
      console.error('Fetch detail error:', err);
      toast.error('Lỗi khi tải chi tiết không gian học viên.');
    } finally {
      setLoadingDetail(false);
    }
  }, [user, summaries, propUsers, toast]);

  useEffect(() => {
    if (selectedUserId) {
      fetchDetail(selectedUserId);
    }
  }, [selectedUserId, fetchDetail]);

  const handleSelectUser = (uId: string) => {
    setSelectedUserId(uId);
    if (onSelectUser) onSelectUser(uId);
  };

  const handleDeleteCustomWord = async (wordId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa từ vựng này khỏi không gian của học viên?')) return;
    setDeletingWordId(wordId);
    try {
      await deleteWordFromFirestore(wordId);
      const authHeaders = getClientAuthHeaders(user);
      await fetch(`/api/vocab?id=${wordId}`, {
        method: 'DELETE',
        headers: authHeaders,
      }).catch(() => {});

      setWorkspaceData((prev) => {
        if (!prev) return null;
        const nextWords = prev.customWords.filter((w) => w.id !== wordId);
        return { ...prev, customWords: nextWords };
      });

      setSummaries((prev) =>
        prev.map((s) =>
          s.userId === selectedUserId
            ? { ...s, customWordsCount: Math.max(0, s.customWordsCount - 1) }
            : s
        )
      );

      toast.success('Đã xóa từ vựng cá nhân thành công.');
    } catch {
      toast.error('Lỗi khi xóa từ vựng.');
    } finally {
      setDeletingWordId(null);
    }
  };

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
          <RefreshCw size={13} className={loadingList || loadingDetail ? 'animate-spin text-emerald-600' : ''} />
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
            {loadingList && summaries.length === 0 ? (
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
                    onClick={() => handleSelectUser(u.userId)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 truncate max-w-[170px]">
                        {u.name}
                      </span>
                      {u.isLocked ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center gap-0.5">
                          <Lock size={10} /> Đã khóa
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          Bình thường
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mb-2 font-mono">
                      {u.email || u.userId}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-100/80 flex-wrap">
                      <span className="font-semibold text-emerald-700">
                        {u.customWordsCount} từ riêng
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{u.customHskCount} nhóm HSK</span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                        <Flame size={11} /> {u.streakDays}d
                      </span>
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
          ) : loadingDetail && !workspaceData ? (
            <div className="py-24 text-center text-xs text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Đang tải dữ liệu không gian của học viên...
            </div>
          ) : workspaceData ? (
            <>
              {/* Alert Header */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">
                        Không gian làm việc: {workspaceData.user.name}
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-bold">
                        Dữ liệu độc lập
                      </span>
                      {workspaceData.user.isLocked && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Tài khoản đã khóa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {workspaceData.user.email || 'Chưa liên kết email'} • UID: {workspaceData.user.id}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Mục tiêu</span>
                  <span className="text-xs font-bold text-emerald-400">HSK {workspaceData.user.targetHsk || 3}</span>
                </div>
              </div>

              {/* Stats KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase">Từ vựng riêng</span>
                    <BookOpen size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {workspaceData.customWords.length}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase">Nhóm HSK riêng</span>
                    <Layers size={14} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {workspaceData.customHskGroups.length}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase">Từ đã thuộc</span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {workspaceData.masteredCount}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase">Lượt ôn tập</span>
                    <GraduationCap size={14} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {workspaceData.totalReviews}
                  </div>
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex border-b border-slate-200 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setWorkspaceSubTab('words')}
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
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
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
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
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
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
                  className={`px-4 py-2.5 font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
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
                      Hiển thị {filteredWords.length} / {workspaceData.customWords.length} từ
                    </span>
                  </div>

                  {filteredWords.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      {workspaceData.customWords.length === 0
                        ? 'Học viên này chưa tạo từ vựng cá nhân nào.'
                        : 'Không tìm thấy từ vựng nào khớp với bộ lọc tìm kiếm.'}
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
                            <th className="py-2 px-3 text-center">Lượt ôn</th>
                            <th className="py-2 px-3 text-right">Xóa</th>
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
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                {w.srs?.totalReviews || 0}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomWord(w.id)}
                                  disabled={deletingWordId === w.id}
                                  title="Xóa từ vựng này"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                >
                                  <Trash2 size={13} className={deletingWordId === w.id ? 'animate-spin' : ''} />
                                </button>
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
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
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
                        {workspaceData.settings?.theme || 'Mặc định'}
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
                        {workspaceData.settings?.fontSize || 'Bình thường'}
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
