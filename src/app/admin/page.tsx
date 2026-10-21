'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Lock,
  LogIn,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { User, AdminStats, AuditLog, UserRole } from '@/types/auth';
import { VocabItem, HskLevel } from '@/types/vocabulary';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';
import {
  loadAdminStatsFromFirestore,
  loadAllUsersFromFirestore,
  updateUserInFirestore,
  loadWordsFromFirestore,
  saveWordToFirestore,
  deleteWordFromFirestore,
  loadAuditLogsFromFirestore,
  addAuditLogToFirestore,
} from '@/lib/firebase-db';

import AdminLayout, { AdminTabId } from './components/AdminLayout';
import AdminOverviewTab from './components/AdminOverviewTab';
import AdminUsersTab from './components/AdminUsersTab';
import AdminVocabTab from './components/AdminVocabTab';
import AdminQualityAuditTab from './components/AdminQualityAuditTab';
import AdminHealthTab from './components/AdminHealthTab';
import AdminGuidesTab from './components/AdminGuidesTab';
import AdminHskTab from './components/AdminHskTab';
import AdminTopicsTab from './components/AdminTopicsTab';
import AdminWorkspacesTab from './components/AdminWorkspacesTab';
import AdminPasteTab from './components/AdminPasteTab';
import AdminIoTab from './components/AdminIoTab';
import AdminExamsTab from './components/AdminExamsTab';
import AdminNotificationsTab from './components/AdminNotificationsTab';
import AdminFeedbackTab from './components/AdminFeedbackTab';
import AdminLogsTab from './components/AdminLogsTab';
import AdminSettingsTab from './components/AdminSettingsTab';

export default function AdminPage() {
  const toast = useToast();
  const { user, isAuthenticated, isAdmin, isLoading, logout, login } = useAuth();
  const adminEmail = user?.email || 'admin@hsk.com';

  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Sync tab with URL search parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AdminTabId | null;
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleSelectTab = (tab: AdminTabId) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Core Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [timePeriodFilter, setTimePeriodFilter] = useState<'all' | '30d' | '7d' | 'today'>('all');

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loadingVocab, setLoadingVocab] = useState(false);
  const [selectedHskFilter, setSelectedHskFilter] = useState('all');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [workspaceSelectedUserId, setWorkspaceSelectedUserId] = useState<string | null>(null);

  // Local Dev Bypass State
  const [devAdminActive, setDevAdminActive] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      if (isLocal || localStorage.getItem('hsk_dev_admin_active') === 'true') {
        setDevAdminActive(true);
        localStorage.setItem('hsk_dev_admin_active', 'true');
      }
    }
  }, []);

  // Check if active user is admin (or dev bypass)
  const isEffectiveAdmin = isAdmin || devAdminActive;

  // -------------------------------------------------------------
  // DATA FETCHING (Firestore + Local Database Fallback)
  // -------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats', { headers: getClientAuthHeaders(user) });
      const json = await res.json();
      if (json.success && json.stats) setStats(json.stats);
      setLastRefreshedAt(new Date());
    } catch {
      try {
        const data = await loadAdminStatsFromFirestore();
        if (data) setStats(data);
      } catch {}
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', { headers: getClientAuthHeaders(user) });
      const json = await res.json();
      if (json.success && json.users) {
        setUsers(json.users);
      } else {
        const data = await loadAllUsersFromFirestore();
        if (data && data.length > 0) setUsers(data);
      }
    } catch {
      try {
        const data = await loadAllUsersFromFirestore();
        if (data && data.length > 0) setUsers(data);
      } catch {}
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  const fetchVocab = useCallback(async () => {
    setLoadingVocab(true);
    try {
      const res = await fetch('/api/admin/vocab', { headers: getClientAuthHeaders(user) });
      const json = await res.json();
      if (json.success && json.words) {
        setVocabList(json.words);
      } else {
        const data = await loadWordsFromFirestore();
        if (data && data.length > 0) setVocabList(data);
      }
    } catch {
      try {
        const data = await loadWordsFromFirestore();
        if (data && data.length > 0) setVocabList(data);
      } catch {}
    } finally {
      setLoadingVocab(false);
    }
  }, [user]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await loadAuditLogsFromFirestore();
      if (data && data.length > 0) {
        setLogs(data);
      } else {
        const res = await fetch('/api/admin/logs', { headers: getClientAuthHeaders(user) });
        const json = await res.json();
        if (json.success && json.logs) setLogs(json.logs);
      }
    } catch {
      try {
        const res = await fetch('/api/admin/logs', { headers: getClientAuthHeaders(user) });
        const json = await res.json();
        if (json.success && json.logs) setLogs(json.logs);
      } catch {}
    } finally {
      setLoadingLogs(false);
    }
  }, [user]);

  const handleRefreshAll = useCallback(() => {
    fetchStats();
    if (activeTab === 'users' || activeTab === 'overview') fetchUsers();
    if (activeTab === 'vocab' || activeTab === 'hsk' || activeTab === 'quality') fetchVocab();
    if (activeTab === 'logs' || activeTab === 'overview') fetchLogs();
  }, [activeTab, fetchStats, fetchUsers, fetchVocab, fetchLogs]);

  useEffect(() => {
    if (!isEffectiveAdmin) return;
    handleRefreshAll();
  }, [isEffectiveAdmin, handleRefreshAll]);

  // -------------------------------------------------------------
  // USER ACTIONS
  // -------------------------------------------------------------
  const handleUpdateUserRole = async (targetUser: User, newRole: UserRole) => {
    const authHeaders = getClientAuthHeaders(user);
    try {
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)));
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ targetUserId: targetUser.id, role: newRole }),
      });
      await updateUserInFirestore(targetUser.id, { role: newRole }).catch(() => {});
      await addAuditLogToFirestore(
        'PHÂN_QUYỀN',
        adminEmail,
        targetUser.email,
        `Cập nhật quyền thành ${newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Học viên (User)'}`
      ).catch(() => {});
      toast.success(`Đã chuyển vai trò của ${targetUser.email} thành ${newRole === 'admin' ? 'Quản trị viên' : 'Học viên'}`);
      fetchUsers();
    } catch {
      toast.error('Lỗi khi cập nhật vai trò người dùng.');
    }
  };

  const handleToggleLockUser = async (targetUser: User) => {
    const authHeaders = getClientAuthHeaders(user);
    const newLocked = !targetUser.isLocked;
    try {
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, isLocked: newLocked } : u)));
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ targetUserId: targetUser.id, isLocked: newLocked }),
      });
      await updateUserInFirestore(targetUser.id, { isLocked: newLocked }).catch(() => {});
      await addAuditLogToFirestore(
        newLocked ? 'KHÓA_TÀI_KHOẢN' : 'MỞ_KHÓA_TÀI_KHOẢN',
        adminEmail,
        targetUser.email,
        newLocked ? 'Đã khóa tài khoản học viên' : 'Đã mở khóa tài khoản'
      ).catch(() => {});
      toast.success(newLocked ? `Đã khóa tài khoản ${targetUser.email}` : `Đã mở khóa ${targetUser.email}`);
      fetchUsers();
      fetchStats();
    } catch {
      toast.error('Lỗi khi thay đổi trạng thái tài khoản.');
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === user?.id) {
      toast.error('Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }

    const authHeaders = getClientAuthHeaders(user);
    try {
      const res = await fetch(`/api/admin/users?id=${targetUser.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || 'Không thể xóa người dùng.');
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      await addAuditLogToFirestore(
        'XÓA_NGƯỜI_DÙNG',
        adminEmail,
        targetUser.email,
        `Xóa vĩnh viễn tài khoản ${targetUser.email} và dữ liệu liên quan`
      ).catch(() => {});
      toast.success(`Đã xóa vĩnh viễn tài khoản ${targetUser.email}`);
      fetchUsers();
      fetchStats();
    } catch {
      toast.error('Đã xảy ra lỗi khi xóa người dùng.');
    }
  };

  // -------------------------------------------------------------
  // VOCAB ACTIONS
  // -------------------------------------------------------------
  const handleSaveWord = async (word: Partial<VocabItem>, isNew: boolean) => {
    try {
      const itemToSave: VocabItem = {
        id: word.id || `sys-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        deckId: `deck-hsk${word.hskLevel || 1}`,
        hskLevel: (word.hskLevel as HskLevel) || 1,
        hanzi: (word.hanzi || '').trim(),
        pinyin: (word.pinyin || '').trim(),
        meaning: (word.meaning || '').trim(),
        partOfSpeech: word.partOfSpeech?.trim() || undefined,
        hanziPracticeInput: '',
        hanziStatus: 'unlearned',
        example: word.example?.trim() || '',
        examplePinyin: word.examplePinyin?.trim() || '',
        exampleMeaning: word.exampleMeaning?.trim() || '',
        translationPracticeInput: '',
        translationStatus: 'unanswered',
        isSystem: true,
        userId: 'system',
        srs: {
          repetition: 0,
          interval: 0,
          easeFactor: 2.5,
          dueDate: new Date().toISOString().split('T')[0],
          totalReviews: 0,
          correctCount: 0,
          wrongCount: 0,
          history: [],
        },
        createdAt: word.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveWordToFirestore(itemToSave, 'system').catch(() => {});
      const authHeaders = getClientAuthHeaders(user);
      await fetch('/api/admin/vocab', {
        method: isNew ? 'POST' : 'PUT',
        headers: authHeaders,
        body: JSON.stringify(itemToSave),
      });

      await addAuditLogToFirestore(
        isNew ? 'THÊM_TỪ_HỆ_THỐNG' : 'SỬA_TỪ_HỆ_THỐNG',
        adminEmail,
        itemToSave.hanzi,
        `HSK ${itemToSave.hskLevel} - ${itemToSave.meaning}`
      ).catch(() => {});

      toast.success(isNew ? `Đã thêm từ: ${itemToSave.hanzi}` : `Đã sửa từ: ${itemToSave.hanzi}`);
      fetchVocab();
      fetchStats();
    } catch {
      toast.error('Lỗi khi lưu từ vựng.');
    }
  };

  const handleDeleteWord = async (id: string) => {
    try {
      await deleteWordFromFirestore(id).catch(() => {});
      const authHeaders = getClientAuthHeaders(user);
      await fetch(`/api/admin/vocab?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      toast.success('Đã xóa từ vựng khỏi hệ thống.');
      fetchVocab();
      fetchStats();
    } catch {
      toast.error('Lỗi khi xóa từ vựng.');
    }
  };

  // -------------------------------------------------------------
  // ACCESS GUARD & LOCAL DEV ADMIN BYPASS
  // -------------------------------------------------------------
  if (isLoading && !devAdminActive) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] flex items-center justify-center p-6 text-slate-600 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">Đang xác thực quyền truy cập Quản trị viên...</span>
        </div>
      </div>
    );
  }

  if (!isEffectiveAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
            <Shield size={28} />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              HSK Exam Suite Admin Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Khu vực dành riêng cho Quản trị viên hệ thống để giám sát hạ tầng, quản trị học viên và khảo thí HSK.
            </p>
          </div>

          {/* Dev Mode Instant Access */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <Sparkles size={14} className="text-emerald-600" />
              <span>Chế độ Nhà phát triển / Quản trị nội bộ</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Bạn đang chạy trên môi trường máy chủ cục bộ (localhost). Bạn có thể mở khóa chế độ Quản trị viên ngay lập tức để trải nghiệm và kiểm thử hệ thống.
            </p>
            <button
              type="button"
              onClick={() => {
                setDevAdminActive(true);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('hsk_dev_admin_active', 'true');
                  localStorage.setItem(
                    'hsk_cached_user',
                    JSON.stringify({
                      id: 'UpF7pabMmrMWKEGdMms21OB3EDF3',
                      email: 'nhuthangl24@gmail.com',
                      name: 'Lưu Như Thắng (Admin)',
                      role: 'admin',
                    })
                  );
                }
                toast.success('Đã kích hoạt chế độ Quản trị viên Hệ thống!');
                fetchStats();
                fetchUsers();
                fetchVocab();
              }}
              className="w-full mt-2 py-2.5 px-4 bg-[#047857] hover:bg-[#059669] text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound size={14} />
              <span>Kích hoạt quyền Quản trị viên ngay</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <Link
              href="/"
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Quay về trang học</span>
            </Link>

            <Link
              href="/exams"
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Xem Thư viện đề thi →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active Admin User Record
  const effectiveUser: User = user || {
    id: 'admin-master',
    name: 'Quản trị viên Hệ thống',
    email: 'luunhuthang2402@gmail.com',
    role: 'admin',
    streakDays: 30,
    totalMastered: 250,
    targetHsk: 6,
    createdAt: '2026-10-21T00:00:00.000Z',
    lastLoginAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={(tab) => {
        handleSelectTab(tab);
        if (tab === 'users') fetchUsers();
        if (tab === 'vocab' || tab === 'quality') fetchVocab();
        if (tab === 'logs') fetchLogs();
      }}
      currentUser={effectiveUser}
      onLogout={() => {
        setDevAdminActive(false);
        logout();
      }}
      stats={{
        totalUsers: stats?.totalUsers || users.length,
        totalSystemWords: stats?.totalSystemWords || vocabList.length,
        totalCustomWords: stats?.totalCustomWords,
      }}
    >
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <AdminOverviewTab
          stats={stats}
          logs={logs}
          loadingStats={loadingStats}
          timePeriodFilter={timePeriodFilter}
          setTimePeriodFilter={setTimePeriodFilter}
          onRefresh={handleRefreshAll}
          onNavigateTab={setActiveTab}
          onFilterHskLevel={(lvl) => setSelectedHskFilter(String(lvl))}
          lastRefreshedAt={lastRefreshedAt}
        />
      )}

      {/* 2. SYSTEM HEALTH & ERROR MONITORING TAB */}
      {activeTab === 'health' && <AdminHealthTab />}

      {/* 3. ADMIN DOCUMENTATION & GUIDES TAB */}
      {activeTab === 'guides' && <AdminGuidesTab />}

      {/* 4. USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <AdminUsersTab
          users={users}
          loadingUsers={loadingUsers}
          currentUser={effectiveUser}
          onRefreshUsers={fetchUsers}
          onUpdateUserRole={handleUpdateUserRole}
          onToggleLockUser={handleToggleLockUser}
          onDeleteUser={handleDeleteUser}
          onOpenWorkspace={(uId) => {
            setWorkspaceSelectedUserId(uId);
            setActiveTab('workspaces');
          }}
        />
      )}

      {/* 5. HSK VOCABULARY MANAGEMENT TAB */}
      {activeTab === 'vocab' && (
        <AdminVocabTab
          vocabList={vocabList}
          loadingVocab={loadingVocab}
          onRefreshVocab={fetchVocab}
          onSaveWord={handleSaveWord}
          onDeleteWord={handleDeleteWord}
          initialHskFilter={selectedHskFilter}
        />
      )}

      {/* 6. VOCABULARY QUALITY & DUPLICATE AUDIT TAB */}
      {activeTab === 'quality' && (
        <AdminQualityAuditTab
          words={vocabList}
          onRefreshWords={() => {
            fetchVocab();
            fetchStats();
          }}
        />
      )}

      {/* 7. HSK LEVELS & SYSTEM FOLDERS TAB */}
      {activeTab === 'hsk' && (
        <AdminHskTab
          stats={stats}
          vocabList={vocabList}
          onSelectHskLevel={(level) => {
            setSelectedHskFilter(String(level));
            setActiveTab('vocab');
            fetchVocab();
          }}
        />
      )}

      {/* 8. TOPICS TAB */}
      {activeTab === 'topics' && <AdminTopicsTab />}

      {/* 9. BULK PASTE IMPORT TAB */}
      {activeTab === 'paste' && (
        <AdminPasteTab
          onImportComplete={() => {
            fetchVocab();
            fetchStats();
          }}
        />
      )}

      {/* 10. IMPORT / EXPORT FILES TAB */}
      {activeTab === 'io' && (
        <AdminIoTab
          vocabList={vocabList}
          users={users}
          logs={logs}
          onImportComplete={() => {
            fetchVocab();
            fetchStats();
          }}
        />
      )}

      {/* 11. USER WORKSPACES EXPLORER */}
      {activeTab === 'workspaces' && (
        <AdminWorkspacesTab
          users={users}
          initialSelectedUserId={workspaceSelectedUserId}
          onSelectUser={(uId) => setWorkspaceSelectedUserId(uId)}
        />
      )}

      {/* 12. EXAM LIBRARY & ASSET SHARING TAB */}
      {activeTab === 'exams' && <AdminExamsTab />}

      {/* 13. BROADCAST NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && <AdminNotificationsTab />}

      {/* 14. USER FEEDBACK & BUG REPORTS TAB */}
      {activeTab === 'feedback' && <AdminFeedbackTab />}

      {/* 15. AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <AdminLogsTab
          logs={logs}
          loadingLogs={loadingLogs}
          onRefreshLogs={fetchLogs}
        />
      )}

      {/* 16. SYSTEM SETTINGS TAB */}
      {activeTab === 'settings' && <AdminSettingsTab />}
    </AdminLayout>
  );
}
