'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Users,
  BookOpen,
  FileSpreadsheet,
  History,
  Search,
  Lock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  Award,
  ArrowLeft,
  LogOut,
  X,
  Menu,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  Layers,
  Tag,
  ClipboardPaste,
  FolderKanban,
  Settings,
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
  batchSaveWordsToFirestore,
  loadAuditLogsFromFirestore,
  addAuditLogToFirestore,
} from '@/lib/firebase-db';

import AdminHskTab from './components/AdminHskTab';
import AdminTopicsTab from './components/AdminTopicsTab';
import AdminWorkspacesTab from './components/AdminWorkspacesTab';
import AdminSettingsTab from './components/AdminSettingsTab';
import AdminPasteTab from './components/AdminPasteTab';

export default function AdminPage() {
  const toast = useToast();
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const adminEmail = user?.email || 'admin@hsk.com';

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'vocab' | 'hsk' | 'topics' | 'paste' | 'workspaces' | 'logs' | 'settings' | 'io'
  >('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Sync admin sidebar collapsed preference with localStorage (default collapsed)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hsk_admin_sidebar_collapsed');
      if (stored !== null) {
        setAdminSidebarCollapsed(stored === 'true');
      }
    }
  }, []);

  const handleToggleAdminSidebar = () => {
    setAdminSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_admin_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [timePeriodFilter, setTimePeriodFilter] = useState<'all' | '30d' | '7d' | 'today'>('all');

  // Users Management State
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [userSortBy, setUserSortBy] = useState<'recent' | 'name' | 'targetHsk' | 'streak'>('recent');
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [userActionConfirm, setUserActionConfirm] = useState<{
    type: 'lock' | 'unlock' | 'role';
    targetUser: User;
    newRole?: UserRole;
  } | null>(null);

  // System Vocab State
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabHskFilter, setVocabHskFilter] = useState<string>('all');
  const [vocabSortBy, setVocabSortBy] = useState<'hanzi' | 'pinyin' | 'hsk' | 'recent'>('recent');
  const [vocabPage, setVocabPage] = useState(1);
  const vocabPageSize = 15;
  const [loadingVocab, setLoadingVocab] = useState(false);

  // Edit / Add Vocab state
  const [editingWord, setEditingWord] = useState<Partial<VocabItem> | null>(null);
  const [isEditingNew, setIsEditingNew] = useState(false);
  const [vocabDeleteConfirm, setVocabDeleteConfirm] = useState<VocabItem | null>(null);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logActionFilter, setLogActionFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const logPageSize = 15;
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/admin/stats?timeWindow=${timePeriodFilter}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.stats) {
          setStats(json.stats);
          setLastRefreshedAt(new Date());
          return;
        }
      }
      const data = await loadAdminStatsFromFirestore();
      setStats(data);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [timePeriodFilter]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/admin/users', {
        headers: authHeaders,
      });
      let serverUsers: User[] = [];
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          serverUsers = data.users;
        }
      }
      const firestoreUsers = await loadAllUsersFromFirestore();

      // Combine & deduplicate by user.id or email
      const userMap = new Map<string, User>();
      for (const u of serverUsers) {
        if (u.id) userMap.set(u.id, u);
      }
      for (const u of firestoreUsers) {
        if (u.id) {
          const existing = userMap.get(u.id);
          userMap.set(u.id, { ...existing, ...u });
        }
      }

      // If current admin is logged in but not in list, add admin to list
      if (user && user.id && !userMap.has(user.id)) {
        userMap.set(user.id, user);
      }

      const combined = Array.from(userMap.values()).map((u) => ({
        ...u,
        name: (u.name && u.name.trim()) ? u.name.trim() : (u.email ? u.email.split('@')[0] : 'Học viên'),
        email: u.email || '',
        role: u.role || 'user',
        isLocked: !!u.isLocked,
      }));

      setUsers(combined);
      setUserPage(1);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  const fetchVocab = useCallback(async () => {
    setLoadingVocab(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/admin/vocab', {
        headers: authHeaders,
      });
      let baseWords: VocabItem[] = [];
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.words) && data.words.length > 0) {
          baseWords = data.words;
        }
      }

      // If /api/admin/vocab didn't return, fallback to /api/vocab (which returns data.items)
      if (baseWords.length === 0) {
        const fallbackRes = await fetch('/api/vocab');
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          if (fbData.success && Array.isArray(fbData.items)) {
            baseWords = fbData.items;
          }
        }
      }

      // Merge any new dynamic system words stored in Cloud Firestore
      const firestoreWords = await loadWordsFromFirestore();
      const wordMap = new Map<string, VocabItem>();
      baseWords.forEach((w) => wordMap.set(w.id, w));
      firestoreWords
        .filter((w) => w.isSystem !== false || w.userId === 'system')
        .forEach((w) => wordMap.set(w.id, { ...wordMap.get(w.id), ...w }));

      const allSys = Array.from(wordMap.values());
      setVocabList(allSys);
      setVocabPage(1);
    } catch (err) {
      console.error('Fetch vocab error:', err);
    } finally {
      setLoadingVocab(false);
    }
  }, [user]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/admin/logs', {
        headers: authHeaders,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.logs)) {
          setLogs(json.logs);
          setLogPage(1);
          return;
        }
      }
      const logsData = await loadAuditLogsFromFirestore();
      setLogs(logsData);
      setLogPage(1);
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;
    const initData = async () => {
      if (!mounted) return;
      await fetchStats();
      if (!mounted) return;
      if (activeTab === 'users') await fetchUsers();
      if (activeTab === 'vocab' || activeTab === 'hsk') await fetchVocab();
      if (activeTab === 'logs' || activeTab === 'overview') await fetchLogs();
    };

    const timer = setTimeout(() => {
      initData();
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isAdmin, activeTab, fetchStats, fetchUsers, fetchVocab, fetchLogs]);

  // User Actions
  const executeUserAction = async () => {
    if (!userActionConfirm) return;
    const { type, targetUser, newRole } = userActionConfirm;
    const authHeaders = getClientAuthHeaders(user);

    try {
      if (type === 'lock' || type === 'unlock') {
        const newStatus = type === 'lock';
        await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ targetUserId: targetUser.id, isLocked: newStatus }),
        });
        await updateUserInFirestore(targetUser.id, { isLocked: newStatus });

        await addAuditLogToFirestore(
          newStatus ? 'KHÓA_TÀI_KHOẢN' : 'MỞ_KHÓA_TÀI_KHOẢN',
          adminEmail,
          targetUser.email,
          `Trạng thái: ${newStatus ? 'Đã khóa tài khoản' : 'Đang hoạt động'}`
        );

        toast.success(
          newStatus ? `Đã khóa tài khoản ${targetUser.email}` : `Đã mở khóa tài khoản ${targetUser.email}`,
          'Quản lý tài khoản'
        );
      } else if (type === 'role' && newRole) {
        await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ targetUserId: targetUser.id, role: newRole }),
        });
        await updateUserInFirestore(targetUser.id, { role: newRole });

        await addAuditLogToFirestore(
          'PHÂN_QUYỀN',
          adminEmail,
          targetUser.email,
          `Cập nhật quyền thành ${newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Học viên (User)'}`
        );

        toast.success(
          `Đã chuyển vai trò của ${targetUser.email} thành ${newRole === 'admin' ? 'Quản trị viên' : 'Học viên'}`,
          'Phân quyền'
        );
      }

      fetchUsers();
      fetchStats();
      if (selectedUserForModal && selectedUserForModal.id === targetUser.id) {
        setSelectedUserForModal((prev) =>
          prev
            ? {
                ...prev,
                isLocked: type === 'lock' ? true : type === 'unlock' ? false : prev.isLocked,
                role: type === 'role' && newRole ? newRole : prev.role,
              }
            : null
        );
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi thực hiện thao tác.');
    } finally {
      setUserActionConfirm(null);
    }
  };

  // Vocab Actions
  const handleSaveVocabItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord || !editingWord.hanzi || !editingWord.pinyin || !editingWord.meaning) {
      toast.error('Vui lòng điền đầy đủ Chữ Hán, Pinyin và Nghĩa.');
      return;
    }

    try {
      const itemToSave: VocabItem = {
        id: editingWord.id || `sys-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        deckId: `deck-hsk${editingWord.hskLevel || 1}`,
        hskLevel: (editingWord.hskLevel as HskLevel) || 1,
        hanzi: editingWord.hanzi.trim(),
        pinyin: editingWord.pinyin.trim(),
        meaning: editingWord.meaning.trim(),
        partOfSpeech: editingWord.partOfSpeech?.trim() || undefined,
        hanziPracticeInput: '',
        hanziStatus: 'unlearned',
        example: editingWord.example?.trim() || '',
        examplePinyin: editingWord.examplePinyin?.trim() || '',
        exampleMeaning: editingWord.exampleMeaning?.trim() || '',
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
        createdAt: editingWord.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ok = await saveWordToFirestore(itemToSave, 'system');
      if (!ok) {
        toast.error('Không thể lưu từ vào Firestore.');
        return;
      }

      // Sync to Server API
      const authHeaders = getClientAuthHeaders(user);
      fetch('/api/admin/vocab', {
        method: isEditingNew ? 'POST' : 'PUT',
        headers: authHeaders,
        body: JSON.stringify(itemToSave),
      }).catch((e) => console.warn('API vocab notice:', e));

      await addAuditLogToFirestore(
        isEditingNew ? 'THÊM_TỪ_HỆ_THỐNG' : 'SỬA_TỪ_HỆ_THỐNG',
        adminEmail,
        itemToSave.hanzi,
        `HSK ${itemToSave.hskLevel} - ${itemToSave.meaning}`
      );

      toast.success(
        isEditingNew
          ? `Đã thêm từ hệ thống: ${itemToSave.hanzi}`
          : `Đã cập nhật từ hệ thống: ${itemToSave.hanzi}`,
        'Từ vựng hệ thống'
      );

      setEditingWord(null);
      fetchVocab();
      fetchStats();
    } catch {
      toast.error('Lỗi khi lưu.');
    }
  };

  const executeDeleteVocab = async () => {
    if (!vocabDeleteConfirm) return;
    const item = vocabDeleteConfirm;

    try {
      const ok = await deleteWordFromFirestore(item.id);
      if (!ok) {
        toast.error('Không thể xóa từ trong Firestore.');
        return;
      }

      // Sync to Server API
      const authHeaders = getClientAuthHeaders(user);
      fetch(`/api/admin/vocab?id=${item.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      }).catch((e) => console.warn('API vocab delete notice:', e));

      await addAuditLogToFirestore('XÓA_TỪ_HỆ_THỐNG', adminEmail, item.hanzi, `HSK ${item.hskLevel}`);
      toast.success(`Đã xóa từ ${item.hanzi} khỏi hệ thống.`, 'Đã xóa');
      fetchVocab();
      fetchStats();
    } catch {
      toast.error('Lỗi khi xóa.');
    } finally {
      setVocabDeleteConfirm(null);
    }
  };

  // Export JSON & CSV
  const handleExportSystemVocabJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vocabList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hsk_system_vocab_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Đã xuất file JSON từ vựng hệ thống.', 'Xuất dữ liệu');
  };

  const handleExportSystemVocabCsv = () => {
    const headers = ['STT', 'Hán tự', 'Pinyin', 'Nghĩa tiếng Việt', 'Cấp HSK', 'Từ loại', 'Ví dụ', 'Pinyin ví dụ', 'Dịch ví dụ'];
    const rows = vocabList.map((item, idx) => [
      idx + 1,
      `"${(item.hanzi || '').replace(/"/g, '""')}"`,
      `"${(item.pinyin || '').replace(/"/g, '""')}"`,
      `"${(item.meaning || '').replace(/"/g, '""')}"`,
      item.hskLevel || 1,
      `"${(item.partOfSpeech || '').replace(/"/g, '""')}"`,
      `"${(item.example || '').replace(/"/g, '""')}"`,
      `"${(item.examplePinyin || '').replace(/"/g, '""')}"`,
      `"${(item.exampleMeaning || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `hsk_system_vocab_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file CSV từ vựng hệ thống.', 'Xuất dữ liệu');
  };

  // Import JSON & CSV
  const handleImportSystemVocab = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let formatted: VocabItem[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          toast.error('File JSON không hợp lệ (cần là danh sách từ vựng dạng mảng).');
          return;
        }
        formatted = parsed.map((item: Partial<VocabItem>, idx: number) => ({
          id: item.id || `sys-${Date.now()}-${idx}`,
          deckId: item.deckId || `deck-hsk${item.hskLevel || 1}`,
          hskLevel: (item.hskLevel as HskLevel) || 1,
          hanzi: (item.hanzi || '').trim(),
          pinyin: (item.pinyin || '').trim(),
          meaning: (item.meaning || '').trim(),
          partOfSpeech: item.partOfSpeech || undefined,
          hanziPracticeInput: '',
          hanziStatus: 'unlearned',
          example: item.example || '',
          examplePinyin: item.examplePinyin || '',
          exampleMeaning: item.exampleMeaning || '',
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
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      } else {
        toast.error('Vui lòng chọn định dạng file .json được hỗ trợ.');
        return;
      }

      // Filter valid items
      const validItems = formatted.filter((w) => w.hanzi && w.pinyin && w.meaning);
      if (validItems.length === 0) {
        toast.error('Không tìm thấy từ vựng hợp lệ nào trong tệp.');
        return;
      }

      const ok = await batchSaveWordsToFirestore(validItems, 'system');
      if (!ok) {
        toast.error('Lỗi lưu dữ liệu vào Firestore.');
        return;
      }

      await addAuditLogToFirestore(
        'NHẬP_TỪ_VỰNG_HỆ_THỐNG',
        adminEmail,
        'Hệ thống',
        `Nhập ${validItems.length} từ vựng từ tệp ${file.name}`
      );

      toast.success(`Đã nhập thành công ${validItems.length} từ vựng vào Firestore!`, 'Nhập hoàn tất');
      fetchVocab();
      fetchStats();
    } catch {
      toast.error('Đọc tệp thất bại. Vui lòng kiểm tra định dạng dữ liệu.');
    } finally {
      e.target.value = '';
    }
  };

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (userSearch.trim()) {
      const q = userSearch.toLowerCase().trim();
      result = result.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }

    if (userRoleFilter !== 'all') {
      result = result.filter((u) => u.role === userRoleFilter);
    }

    if (userStatusFilter === 'active') {
      result = result.filter((u) => !u.isLocked);
    } else if (userStatusFilter === 'locked') {
      result = result.filter((u) => !!u.isLocked);
    }

    result.sort((a, b) => {
      switch (userSortBy) {
        case 'name': {
          const nameA = (a.name || a.email || '').trim();
          const nameB = (b.name || b.email || '').trim();
          return nameA.localeCompare(nameB, 'vi');
        }
        case 'targetHsk':
          return (b.targetHsk || 1) - (a.targetHsk || 1);
        case 'streak':
          return (b.streakDays || 0) - (a.streakDays || 0);
        case 'recent':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return result;
  }, [users, userSearch, userRoleFilter, userStatusFilter, userSortBy]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / userPageSize) || 1;

  // Filtered and Sorted Vocab
  const filteredVocab = useMemo(() => {
    let result = [...vocabList];

    if (vocabSearch.trim()) {
      const q = vocabSearch.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.hanzi.toLowerCase().includes(q) ||
          item.pinyin.toLowerCase().includes(q) ||
          item.meaning.toLowerCase().includes(q)
      );
    }

    if (vocabHskFilter !== 'all') {
      result = result.filter((item) => item.hskLevel === Number(vocabHskFilter));
    }

    result.sort((a, b) => {
      switch (vocabSortBy) {
        case 'hanzi':
          return a.hanzi.localeCompare(b.hanzi, 'zh');
        case 'pinyin':
          return a.pinyin.localeCompare(b.pinyin);
        case 'hsk':
          return a.hskLevel - b.hskLevel;
        case 'recent':
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });

    return result;
  }, [vocabList, vocabSearch, vocabHskFilter, vocabSortBy]);

  const paginatedVocab = useMemo(() => {
    const start = (vocabPage - 1) * vocabPageSize;
    return filteredVocab.slice(start, start + vocabPageSize);
  }, [filteredVocab, vocabPage]);

  const totalVocabPages = Math.ceil(filteredVocab.length / vocabPageSize) || 1;

  // Duplicate Hanzi Detection
  const isEditingHanziDuplicate = useMemo(() => {
    if (!editingWord?.hanzi || !editingWord.hanzi.trim()) return false;
    const clean = editingWord.hanzi.trim();
    return vocabList.some((w) => w.hanzi.trim() === clean && w.id !== editingWord.id);
  }, [editingWord, vocabList]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (logActionFilter !== 'all') {
      result = result.filter((l) => l.action.toLowerCase().includes(logActionFilter.toLowerCase()));
    }

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.adminEmail.toLowerCase().includes(q) ||
          (l.target && l.target.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }

    return result;
  }, [logs, logActionFilter, logSearch]);

  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return filteredLogs.slice(start, start + logPageSize);
  }, [filteredLogs, logPage]);

  const totalLogPages = Math.ceil(filteredLogs.length / logPageSize) || 1;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Đang kiểm tra quyền quản trị...</p>
      </div>
    );
  }

  // Access Denied Screen (403)
  if (!isAuthenticated || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5 shadow-lg">
          <Shield size={32} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <AlertCircle size={13} />
          <span>403 Quyền truy cập bị từ chối</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Khu Vực Quản Trị Hệ Thống
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Trang quản trị (<code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">/admin</code>) chỉ dành riêng cho tài khoản Quản trị viên (Admin).
          {user ? (
            <> Tài khoản hiện tại của bạn (<span className="text-slate-200 font-mono font-medium">{user.email}</span>) không có quyền truy cập khu vực này.</>
          ) : (
            <> Bạn hiện chưa đăng nhập vào hệ thống.</>
          )}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Quay về bảng học từ vựng</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            type="button"
            onClick={handleToggleAdminSidebar}
            className="hidden md:flex items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors btn-press cursor-pointer"
            title={adminSidebarCollapsed ? 'Mở rộng menu bên' : 'Thu nhỏ menu bên'}
          >
            {adminSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors font-medium border border-slate-700 btn-press"
            title="Quay về bảng học từ vựng"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Quay về bảng học</span>
          </Link>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">Admin Portal</span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full hidden xs:inline-block">
                  Quản Trị Viên
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white truncate max-w-[150px]">{user.name}</div>
            <div className="text-[11px] text-slate-400 truncate max-w-[180px] font-mono">{user.email}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 ${
            adminSidebarCollapsed ? 'md:w-16' : 'md:w-64'
          } w-64 bg-slate-900 border-r border-slate-800 text-slate-300 transform transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)] md:translate-x-0 md:static shrink-0 select-none overflow-x-hidden overflow-y-auto ${
            mobileMenuOpen ? 'translate-x-0 top-[53px]' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Sidebar Header / Toggle */}
          <div className="flex items-center justify-between p-3 border-b border-slate-800/80">
            {!adminSidebarCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Menu Quản Trị
              </div>
            )}
            <button
              type="button"
              onClick={handleToggleAdminSidebar}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors btn-press ${
                adminSidebarCollapsed ? 'mx-auto' : ''
              }`}
              title={adminSidebarCollapsed ? 'Mở rộng menu bên' : 'Thu nhỏ menu bên'}
            >
              {adminSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <div className="p-2 space-y-1">
            {!adminSidebarCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                Bảng điều khiển
              </div>
            )}

            {/* TAB: Overview */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setMobileMenuOpen(false);
              }}
              title="Tổng quan hệ thống"
              className={`flex items-center gap-3 rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'overview'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'overview'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <Award size={16} className="shrink-0" />
              {!adminSidebarCollapsed && <span>Tổng quan hệ thống</span>}
            </button>

            {!adminSidebarCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">
                Quản trị dữ liệu
              </div>
            )}
            {adminSidebarCollapsed && <div className="w-8 h-px bg-slate-800 mx-auto my-1.5" />}

            {/* TAB: Users */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('users');
                fetchUsers();
                setMobileMenuOpen(false);
              }}
              title={`Quản lý người dùng (${stats?.totalUsers || 0})`}
              className={`flex items-center justify-between rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press relative ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'users'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'users'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} className="shrink-0" />
                {!adminSidebarCollapsed && <span>Quản lý người dùng</span>}
              </div>
              {!adminSidebarCollapsed && stats?.totalUsers !== undefined && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {stats.totalUsers}
                </span>
              )}
              {adminSidebarCollapsed && stats?.totalUsers !== undefined && stats.totalUsers > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* TAB: System Vocab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('vocab');
                fetchVocab();
                setMobileMenuOpen(false);
              }}
              title={`Từ vựng chuẩn HSK (${stats?.totalSystemWords || 0})`}
              className={`flex items-center justify-between rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press relative ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'vocab'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'vocab'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={16} className="shrink-0" />
                {!adminSidebarCollapsed && <span>Từ vựng chuẩn HSK</span>}
              </div>
              {!adminSidebarCollapsed && stats?.totalSystemWords !== undefined && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {stats.totalSystemWords}
                </span>
              )}
            </button>

            {/* TAB: HSK Levels */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('hsk');
                setMobileMenuOpen(false);
              }}
              title="Quản lý cấp độ HSK"
              className={`flex items-center justify-between rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'hsk'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'hsk'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers size={16} className="shrink-0" />
                {!adminSidebarCollapsed && <span>HSK & Thư mục hệ thống</span>}
              </div>
              {!adminSidebarCollapsed && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  1-9
                </span>
              )}
            </button>

            {/* TAB: Topics */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('topics');
                setMobileMenuOpen(false);
              }}
              title={`Quản lý chủ đề (${stats?.totalTopics || 0})`}
              className={`flex items-center justify-between rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'topics'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'topics'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <div className="flex items-center gap-3">
                <Tag size={16} className="shrink-0" />
                {!adminSidebarCollapsed && <span>Quản lý chủ đề</span>}
              </div>
              {!adminSidebarCollapsed && stats?.totalTopics !== undefined && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {stats.totalTopics}
                </span>
              )}
            </button>

            {/* TAB: Bulk Paste Engine */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('paste');
                setMobileMenuOpen(false);
              }}
              title="Nhập từ hàng loạt (Paste Engine)"
              className={`flex items-center gap-3 rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'paste'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'paste'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <ClipboardPaste size={16} className="shrink-0" />
              {!adminSidebarCollapsed && <span>Nhập từ hàng loạt</span>}
            </button>

            {/* TAB: Workspaces */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('workspaces');
                setMobileMenuOpen(false);
              }}
              title={`Không gian học viên (${stats?.totalCustomWords || 0} từ)`}
              className={`flex items-center justify-between rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press relative ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'workspaces'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'workspaces'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderKanban size={16} className="shrink-0" />
                {!adminSidebarCollapsed && <span>Không gian học viên</span>}
              </div>
              {!adminSidebarCollapsed && stats?.totalCustomWords !== undefined && stats.totalCustomWords > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {stats.totalCustomWords} từ
                </span>
              )}
              {adminSidebarCollapsed && stats?.totalCustomWords !== undefined && stats.totalCustomWords > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>

            {/* TAB: Import & Export */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('io');
                setMobileMenuOpen(false);
              }}
              title="Nhập & Xuất tệp (Excel / CSV / JSON)"
              className={`flex items-center gap-3 rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'io'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'io'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <FileSpreadsheet size={16} className="shrink-0" />
              {!adminSidebarCollapsed && <span>Nhập & Xuất tệp</span>}
            </button>

            {!adminSidebarCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">
                Hệ thống & Bảo mật
              </div>
            )}
            {adminSidebarCollapsed && <div className="w-8 h-px bg-slate-800 mx-auto my-1.5" />}

            {/* TAB: Logs */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('logs');
                fetchLogs();
                setMobileMenuOpen(false);
              }}
              title="Nhật ký hoạt động"
              className={`flex items-center gap-3 rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'logs'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'logs'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <History size={16} className="shrink-0" />
              {!adminSidebarCollapsed && <span>Nhật ký hoạt động</span>}
            </button>

            {/* TAB: Settings */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              title="Cài đặt hệ thống"
              className={`flex items-center gap-3 rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press ${
                adminSidebarCollapsed
                  ? `w-10 h-10 mx-auto justify-center ${
                      activeTab === 'settings'
                        ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  : `w-full px-3 py-2.5 ${
                      activeTab === 'settings'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
              }`}
            >
              <Settings size={16} className="shrink-0" />
              {!adminSidebarCollapsed && <span>Cài đặt hệ thống</span>}
            </button>

            {/* Bottom Status Indicator */}
            {adminSidebarCollapsed ? (
              <div className="pt-4 flex justify-center" title="Hệ thống: Cloud Firestore Live">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-950" />
              </div>
            ) : (
              <div className="pt-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
                  Trạng thái hệ thống
                </div>
                <div className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Cơ sở dữ liệu:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Firestore Live
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Xác thực:</span>
                    <span className="font-semibold text-slate-200">Firebase Auth</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    <span>Cập nhật:</span>
                    <span>{lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString('vi-VN') : 'Mới nhất'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Content View with Smooth Transition */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fadeIn" key={activeTab}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Header & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Tổng Quan Hệ Thống & Chỉ Số Hoạt Động
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Cập nhật thời gian thực từ Cloud Firestore ({lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString('vi-VN') : 'Đang đồng bộ...'})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white border border-slate-200 p-1 rounded-xl text-xs shadow-2xs">
                    {(['all', '30d', '7d', 'today'] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setTimePeriodFilter(period)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          timePeriodFilter === period
                            ? 'bg-slate-900 text-white font-semibold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {period === 'all'
                          ? 'Tất cả'
                          : period === '30d'
                          ? '30 ngày'
                          : period === '7d'
                          ? '7 ngày'
                          : 'Hôm nay'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={fetchStats}
                    className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold transition-all"
                  >
                    <RefreshCw size={13} className={loadingStats ? 'animate-spin' : ''} />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {/* Alert Banner if locked users exist */}
              {stats && stats.lockedUsers > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-2xs animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Cảnh báo bảo mật: Có {stats.lockedUsers} tài khoản đang bị khóa</h4>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Kiểm tra danh sách tài khoản để xác định lý do và mở khóa nếu cần thiết.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('users');
                      setUserStatusFilter('locked');
                      fetchUsers();
                    }}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  >
                    Xem tài khoản bị khóa →
                  </button>
                </div>
              )}

              {/* Interactive KPI Cards (Click to navigate & filter) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* 1. Total Users */}
                <div
                  onClick={() => {
                    setActiveTab('users');
                    setUserRoleFilter('all');
                    setUserStatusFilter('all');
                    fetchUsers();
                  }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group shadow-2xs"
                  title="Nhấn để xem danh sách toàn bộ người dùng"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng người dùng</span>
                    <Users size={16} className="text-slate-400 group-hover:text-slate-800 transition-colors" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    {stats?.totalUsers ?? '...'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Tài khoản đăng ký</span>
                    <span className="text-slate-600 font-semibold group-hover:text-slate-900 flex items-center gap-0.5">
                      Xem danh sách <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>

                {/* 2. Active Today */}
                <div
                  onClick={() => {
                    setActiveTab('users');
                    setUserSortBy('recent');
                    fetchUsers();
                  }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group shadow-2xs"
                  title="Nhấn để xem học viên đăng nhập gần nhất"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase">Hoạt động hôm nay</span>
                    <Clock size={16} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
                    {stats?.activeToday ?? '...'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Đăng nhập 24h qua</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                      Chi tiết <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>

                {/* 3. System Vocab */}
                <div
                  onClick={() => {
                    setActiveTab('vocab');
                    setVocabHskFilter('all');
                    fetchVocab();
                  }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group shadow-2xs"
                  title="Nhấn để mở kho từ vựng hệ thống"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-600 uppercase">Từ vựng chuẩn</span>
                    <BookOpen size={16} className="text-blue-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-2">
                    {stats?.totalSystemWords ?? '...'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">HSK 1 đến HSK 9</span>
                    <span className="text-blue-700 font-semibold flex items-center gap-0.5">
                      Quản lý từ <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>

                {/* 4. Custom Words */}
                <div
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-600 uppercase">Từ cá nhân thêm</span>
                    <Sparkles size={16} className="text-amber-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">
                    {stats?.totalCustomWords ?? '...'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Từ học viên tự tạo</span>
                    <span className="text-amber-700 font-semibold">Dữ liệu độc lập</span>
                  </div>
                </div>

                {/* 5. SRS Reviews Done */}
                <div
                  onClick={() => {
                    setActiveTab('logs');
                    setLogActionFilter('SRS');
                  }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-600 uppercase">Lượt ôn tập SRS</span>
                    <Award size={16} className="text-purple-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-2">
                    {stats?.totalReviewsDone ?? '...'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Bài tập hoàn thành</span>
                    <span className="text-purple-700 font-semibold flex items-center gap-0.5">
                      Xem lịch sử <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>

                {/* 6. Locked Users */}
                <div
                  onClick={() => {
                    setActiveTab('users');
                    setUserStatusFilter('locked');
                    fetchUsers();
                  }}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group shadow-2xs ${
                    stats && stats.lockedUsers > 0
                      ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  title="Nhấn để lọc các tài khoản bị khóa"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-600 uppercase">Tài khoản bị khóa</span>
                    <Lock size={16} className="text-rose-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-2">
                    {stats?.lockedUsers ?? '0'}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Đình chỉ quyền</span>
                    <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                      Xem danh sách <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Breakdown of HSK & Topics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* HSK Breakdown Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">Phân bố từ vựng theo Cấp độ HSK</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('hsk')}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                    >
                      Chi tiết HSK →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                      const count = stats?.hskBreakdown?.[lvl] || 0;
                      const totalWords = (stats?.totalSystemWords || 0) + (stats?.totalCustomWords || 0) || 1;
                      const percent = Math.round((count / totalWords) * 100);
                      return (
                        <div
                          key={lvl}
                          onClick={() => {
                            setVocabHskFilter(String(lvl));
                            setActiveTab('vocab');
                            fetchVocab();
                          }}
                          className="group cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                        >
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-slate-700 group-hover:text-emerald-700">
                              HSK {lvl}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {count.toLocaleString()} từ ({percent}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full group-hover:bg-emerald-600 transition-all"
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Topic Breakdown Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Phân bố từ vựng theo Chủ đề</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('topics')}
                      className="text-xs text-blue-700 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Quản lý chủ đề →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {stats?.topicBreakdown && Object.keys(stats.topicBreakdown).length > 0 ? (
                      Object.entries(stats.topicBreakdown).map(([tName, count]) => (
                        <div
                          key={tName}
                          onClick={() => setActiveTab('topics')}
                          className="group cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                        >
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-slate-700 group-hover:text-blue-700 truncate max-w-[200px]">
                              {tName}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {count} từ
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full group-hover:bg-blue-600 transition-all"
                              style={{ width: `${Math.min(count * 5, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Chưa có dữ liệu thống kê chủ đề.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Activity Feed on Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-slate-700" />
                      <h3 className="text-sm font-bold text-slate-900">Hoạt động quản trị gần nhất</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('logs')}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                    >
                      Xem tất cả ({logs.length}) →
                    </button>
                  </div>

                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Chưa ghi nhận thao tác quản trị nào gần đây.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logs.slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-white border border-slate-200 text-slate-800">
                                {log.action}
                              </span>
                              <span className="font-semibold text-slate-900">{log.target || 'Hệ thống'}</span>
                            </div>
                            <p className="text-slate-500 text-[11px]">{log.details || 'Không có mô tả chi tiết'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions Panel */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Lối tắt quản trị</h3>
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('vocab');
                          setIsEditingNew(true);
                          setEditingWord({
                            hskLevel: 1,
                            hanzi: '',
                            pinyin: '',
                            meaning: '',
                            example: '',
                            examplePinyin: '',
                            exampleMeaning: '',
                          });
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all cursor-pointer group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            <Plus size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Thêm từ hệ thống</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-700" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('io');
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-all cursor-pointer group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                            <Upload size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Nhập từ hàng loạt</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-700" />
                      </button>

                      <button
                        type="button"
                        onClick={handleExportSystemVocabCsv}
                        className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 text-left transition-all cursor-pointer group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                            <Download size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Sao lưu CSV</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-700" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Info size={13} className="text-slate-400 shrink-0" />
                    <span>Dữ liệu lưu tự động đồng bộ Firestore cloud.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Quản Lý Tài Khoản Học Viên & Phân Quyền
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Tìm kiếm, xem trạng thái, khóa tài khoản và phân quyền Quản trị viên
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchUsers}
                  className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
                  <div className="relative w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      placeholder="Tìm theo tên học viên hoặc email..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Filter */}
                  <select
                    value={userStatusFilter}
                    onChange={(e) => {
                      setUserStatusFilter(e.target.value as 'all' | 'active' | 'locked');
                      setUserPage(1);
                    }}
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">🟢 Đang hoạt động</option>
                    <option value="locked">🔴 Đã bị khóa</option>
                  </select>

                  {/* Role Filter */}
                  <select
                    value={userRoleFilter}
                    onChange={(e) => {
                      setUserRoleFilter(e.target.value);
                      setUserPage(1);
                    }}
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium"
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="user">Học viên (User)</option>
                  </select>

                  {/* Sort */}
                  <select
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value as typeof userSortBy)}
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium"
                  >
                    <option value="recent">Mới nhất</option>
                    <option value="name">Tên A-Z</option>
                    <option value="targetHsk">HSK cao nhất</option>
                    <option value="streak">Chuỗi ngày học</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Người dùng</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Vai trò</th>
                        <th className="px-4 py-3">Mục tiêu</th>
                        <th className="px-4 py-3">Chuỗi học</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={14} className="animate-spin text-emerald-600" />
                              <span>Đang tải danh sách người dùng...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400">
                            Không tìm thấy tài khoản người dùng nào khớp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForModal(u)}
                                className="flex items-center gap-2.5 hover:text-emerald-700 text-left cursor-pointer group"
                                title="Nhấn để xem chi tiết hồ sơ"
                              >
                                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                                  {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold underline-offset-2 group-hover:underline">{u.name || u.email || 'Học viên'}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{u.email || 'Chưa có email'}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {u.role === 'admin' ? (
                                  <>
                                    <Shield size={11} /> Quản trị viên
                                  </>
                                ) : (
                                  'Học viên'
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-emerald-700">HSK {u.targetHsk || 3}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-700">{u.streakDays || 0} ngày</span>
                            </td>
                            <td className="px-4 py-3">
                              {u.isLocked ? (
                                <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                                  <Lock size={12} /> Đã khóa
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-medium flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 size={12} /> Hoạt động
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForModal(u)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer transition-colors"
                              >
                                Chi tiết
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setUserActionConfirm({
                                    type: 'role',
                                    targetUser: u,
                                    newRole: u.role === 'admin' ? 'user' : 'admin',
                                  })
                                }
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer transition-colors"
                              >
                                {u.role === 'admin' ? 'Hạ User' : 'Nâng Admin'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setUserActionConfirm({
                                    type: u.isLocked ? 'unlock' : 'lock',
                                    targetUser: u,
                                  })
                                }
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                                  u.isLocked
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                }`}
                              >
                                {u.isLocked ? 'Mở khóa' : 'Khóa'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredUsers.length > 0 && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Hiển thị {(userPage - 1) * userPageSize + 1} -{' '}
                      {Math.min(userPage * userPageSize, filteredUsers.length)} trên tổng số {filteredUsers.length} tài khoản
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => Math.max(p - 1, 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span className="px-2 font-semibold text-slate-700">
                        {userPage} / {totalUserPages}
                      </span>
                      <button
                        type="button"
                        disabled={userPage >= totalUserPages}
                        onClick={() => setUserPage((p) => Math.min(p + 1, totalUserPages))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM VOCABULARY */}
          {activeTab === 'vocab' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Kho Từ Vựng Hệ Thống Chuẩn HSK 1 - 9
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Thêm, sửa, xóa từ vựng chính thức dùng chung cho toàn bộ học viên ({filteredVocab.length} từ)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingNew(true);
                      setEditingWord({
                        hskLevel: 1,
                        hanzi: '',
                        pinyin: '',
                        meaning: '',
                        example: '',
                        examplePinyin: '',
                        exampleMeaning: '',
                      });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus size={14} />
                    <span>Thêm từ chuẩn</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSystemVocabCsv}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
                    title="Xuất file CSV"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Xuất CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchVocab}
                    className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold"
                  >
                    <RefreshCw size={14} className={loadingVocab ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
                  <div className="relative w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={vocabSearch}
                      onChange={(e) => {
                        setVocabSearch(e.target.value);
                        setVocabPage(1);
                      }}
                      placeholder="Tìm theo chữ Hán, Pinyin hoặc nghĩa tiếng Việt..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={vocabHskFilter}
                    onChange={(e) => {
                      setVocabHskFilter(e.target.value);
                      setVocabPage(1);
                    }}
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium"
                  >
                    <option value="all">Tất cả cấp độ HSK</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        HSK {lvl}
                      </option>
                    ))}
                  </select>

                  <select
                    value={vocabSortBy}
                    onChange={(e) => setVocabSortBy(e.target.value as typeof vocabSortBy)}
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium"
                  >
                    <option value="recent">Mới cập nhật</option>
                    <option value="hsk">Theo cấp HSK</option>
                    <option value="hanzi">Chữ Hán</option>
                    <option value="pinyin">Pinyin</option>
                  </select>
                </div>
              </div>

              {/* Vocab Form Modal when editingWord is open */}
              {editingWord && (
                <form
                  onSubmit={handleSaveVocabItem}
                  className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-4 animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <Edit2 size={14} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {isEditingNew ? 'Thêm từ mới vào kho từ vựng hệ thống' : `Chỉnh sửa từ: ${editingWord.hanzi}`}
                        </h4>
                        {isEditingHanziDuplicate && (
                          <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={12} /> Cảnh báo: Chữ Hán này đã có trong từ điển hệ thống
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingWord(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Chữ Hán *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingWord.hanzi || ''}
                        onChange={(e) => setEditingWord({ ...editingWord, hanzi: e.target.value })}
                        placeholder="VD: 学习"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-hanzi text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pinyin *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingWord.pinyin || ''}
                        onChange={(e) => setEditingWord({ ...editingWord, pinyin: e.target.value })}
                        placeholder="VD: xuéxí"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nghĩa tiếng Việt *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingWord.meaning || ''}
                        onChange={(e) => setEditingWord({ ...editingWord, meaning: e.target.value })}
                        placeholder="VD: học tập, nghiên cứu"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cấp HSK
                      </label>
                      <select
                        value={editingWord.hskLevel || 1}
                        onChange={(e) => setEditingWord({ ...editingWord, hskLevel: Number(e.target.value) as HskLevel })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            HSK {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Câu ví dụ (Chữ Hán)
                      </label>
                      <input
                        type="text"
                        value={editingWord.example || ''}
                        onChange={(e) => setEditingWord({ ...editingWord, example: e.target.value })}
                        placeholder="VD: 我喜欢学习汉语。"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-hanzi text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pinyin câu ví dụ
                      </label>
                      <input
                        type="text"
                        value={editingWord.examplePinyin || ''}
                        onChange={(e) => setEditingWord({ ...editingWord, examplePinyin: e.target.value })}
                        placeholder="VD: Wǒ xǐhuan xuéxí hànyǔ."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dịch nghĩa câu ví dụ
                      </label>
                      <input
                        type="text"
                        value={editingWord.exampleMeaning || ''}
                        onChange={(e) => setEditingWord({ ...editingWord, exampleMeaning: e.target.value })}
                        placeholder="VD: Tôi thích học tiếng Trung."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingWord(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors"
                    >
                      Lưu từ vựng hệ thống
                    </button>
                  </div>
                </form>
              )}

              {/* Vocab List Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">STT</th>
                        <th className="px-4 py-3 w-28 text-center">Chữ Hán</th>
                        <th className="px-4 py-3 w-32 text-center">Pinyin</th>
                        <th className="px-4 py-3">Nghĩa tiếng Việt</th>
                        <th className="px-4 py-3 w-24 text-center">Cấp độ</th>
                        <th className="px-4 py-3 text-right w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingVocab ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={14} className="animate-spin text-emerald-600" />
                              <span>Đang tải danh sách từ vựng...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedVocab.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            Chưa có từ vựng hệ thống nào. Hãy nhấn &quot;+ Thêm từ chuẩn&quot; hoặc &quot;Nhập file&quot; để thêm dữ liệu.
                          </td>
                        </tr>
                      ) : (
                        paginatedVocab.map((w, idx) => (
                          <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 text-center text-slate-400">
                              {(vocabPage - 1) * vocabPageSize + idx + 1}
                            </td>
                            <td className="px-4 py-2.5 text-center font-hanzi font-bold text-base text-slate-900">
                              {w.hanzi}
                            </td>
                            <td className="px-4 py-2.5 text-center text-emerald-800 font-medium">{w.pinyin}</td>
                            <td className="px-4 py-2.5 text-slate-700">{w.meaning}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-slate-700">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                                HSK {w.hskLevel}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingNew(false);
                                  setEditingWord(w);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                                title="Sửa từ"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setVocabDeleteConfirm(w)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Xóa từ"
                              >
                                <Trash2 size={13} />
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
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Hiển thị {(vocabPage - 1) * vocabPageSize + 1} -{' '}
                      {Math.min(vocabPage * vocabPageSize, filteredVocab.length)} trên tổng số {filteredVocab.length} từ vựng
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={vocabPage <= 1}
                        onClick={() => setVocabPage((p) => Math.max(p - 1, 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span className="px-2 font-semibold text-slate-700">
                        {vocabPage} / {totalVocabPages}
                      </span>
                      <button
                        type="button"
                        disabled={vocabPage >= totalVocabPages}
                        onClick={() => setVocabPage((p) => Math.min(p + 1, totalVocabPages))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BATCH IMPORT / EXPORT */}
          {activeTab === 'io' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Nhập & Xuất Dữ Liệu Từ Vựng Hàng Loạt
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Đẩy hàng loạt từ vựng chuẩn vào hệ thống hoặc tải xuống sao lưu định dạng JSON / CSV
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <Download size={24} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Xuất toàn bộ kho từ vựng hệ thống</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Tải về toàn bộ danh sách {vocabList.length} từ vựng chuẩn HSK đang lưu trên Cloud Firestore để sao lưu hoặc chỉnh sửa ngoại tuyến.
                    </p>
                  </div>
                  <div className="mt-6 space-y-2">
                    <button
                      type="button"
                      onClick={handleExportSystemVocabJson}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <Download size={14} />
                      <span>Xuất định dạng JSON ({vocabList.length} từ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSystemVocabCsv}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Xuất định dạng CSV (Excel tương thích)</span>
                    </button>
                  </div>
                </div>

                {/* Import Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                      <Upload size={24} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Nhập từ vựng hệ thống hàng loạt</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Tải lên tệp JSON chứa danh sách từ vựng chuẩn để lưu trực tiếp vào cơ sở dữ liệu chính thức cho toàn bộ học viên.
                    </p>
                  </div>
                  <div className="mt-6">
                    <label className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors text-center shadow-xs">
                      <Upload size={15} />
                      <span>Chọn file JSON để tải lên</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportSystemVocab}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Nhật Ký Thao Tác Quản Trị & Sự Kiện Bảo Mật
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Ghi lại mọi hoạt động thay đổi vai trò, khóa tài khoản và chỉnh sửa kho dữ liệu ({filteredLogs.length} bản ghi)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchLogs}
                  className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Log Filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
                  <div className="relative w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => {
                        setLogSearch(e.target.value);
                        setLogPage(1);
                      }}
                      placeholder="Tìm nhật ký theo email, từ hoặc đối tượng..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <select
                  value={logActionFilter}
                  onChange={(e) => {
                    setLogActionFilter(e.target.value);
                    setLogPage(1);
                  }}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium"
                >
                  <option value="all">Tất cả hành động</option>
                  <option value="KHÓA">Khóa tài khoản</option>
                  <option value="MỞ_KHÓA">Mở khóa tài khoản</option>
                  <option value="PHÂN_QUYỀN">Phân quyền</option>
                  <option value="THÊM">Thêm từ mới</option>
                  <option value="SỬA">Sửa từ vựng</option>
                  <option value="XÓA">Xóa từ vựng</option>
                  <option value="NHẬP">Nhập dữ liệu</option>
                </select>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-40">Thời gian</th>
                        <th className="px-4 py-3 w-44">Hành động</th>
                        <th className="px-4 py-3 w-48">Người thực hiện</th>
                        <th className="px-4 py-3 w-44">Đối tượng</th>
                        <th className="px-4 py-3">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {loadingLogs ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400">
                            <div className="flex items-center justify-center gap-2 font-sans text-xs">
                              <RefreshCw size={14} className="animate-spin text-emerald-600" />
                              <span>Đang tải nhật ký...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400 font-sans text-xs">
                            Chưa có nhật ký hoạt động nào được ghi lại khớp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-800 font-sans">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[10px]">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-emerald-700">{log.adminEmail}</td>
                            <td className="px-4 py-2.5 text-slate-600">{log.target || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-sans text-xs truncate max-w-xs">
                              {log.details || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredLogs.length > 0 && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Hiển thị {(logPage - 1) * logPageSize + 1} -{' '}
                      {Math.min(logPage * logPageSize, filteredLogs.length)} trên tổng số {filteredLogs.length} bản ghi
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={logPage <= 1}
                        onClick={() => setLogPage((p) => Math.max(p - 1, 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span className="px-2 font-semibold text-slate-700">
                        {logPage} / {totalLogPages}
                      </span>
                      <button
                        type="button"
                        disabled={logPage >= totalLogPages}
                        onClick={() => setLogPage((p) => Math.min(p + 1, totalLogPages))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HSK LEVELS */}
          {activeTab === 'hsk' && (
            <AdminHskTab
              stats={stats}
              vocabList={vocabList}
              onSelectHskLevel={(level) => {
                setVocabHskFilter(String(level));
                setActiveTab('vocab');
                fetchVocab();
              }}
            />
          )}

          {/* TAB 5: TOPICS */}
          {activeTab === 'topics' && <AdminTopicsTab />}

          {/* TAB 6: BULK PASTE */}
          {activeTab === 'paste' && (
            <AdminPasteTab
              onImportComplete={() => {
                fetchVocab();
                fetchStats();
              }}
            />
          )}

          {/* TAB 7: USER WORKSPACES EXPLORER */}
          {activeTab === 'workspaces' && <AdminWorkspacesTab />}

          {/* TAB 9: SYSTEM SETTINGS */}
          {activeTab === 'settings' && <AdminSettingsTab />}
        </main>
      </div>

      {/* User Detail Modal */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedUserForModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-base">
                {(selectedUserForModal.name || selectedUserForModal.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedUserForModal.name || selectedUserForModal.email || 'Học viên'}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedUserForModal.email}</p>
              </div>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-5">
              <div className="flex justify-between">
                <span>Mã học viên (UID):</span>
                <span className="font-mono text-slate-900 truncate max-w-[180px]">{selectedUserForModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Vai trò:</span>
                <span className="font-bold text-purple-700">
                  {selectedUserForModal.role === 'admin' ? 'Quản trị viên (Admin)' : 'Học viên (User)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mục tiêu HSK:</span>
                <span className="font-bold text-emerald-700">HSK {selectedUserForModal.targetHsk || 3}</span>
              </div>
              <div className="flex justify-between">
                <span>Chuỗi ngày học liên tục:</span>
                <span className="font-bold text-amber-700">{selectedUserForModal.streakDays || 0} ngày</span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái tài khoản:</span>
                <span className={selectedUserForModal.isLocked ? 'font-bold text-rose-600' : 'font-bold text-emerald-600'}>
                  {selectedUserForModal.isLocked ? '🔴 Đã bị khóa' : '🟢 Đang hoạt động'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ngày tạo tài khoản:</span>
                <span className="font-medium text-slate-700">
                  {selectedUserForModal.createdAt ? new Date(selectedUserForModal.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedUserForModal(null);
                setActiveTab('workspaces');
              }}
              className="w-full mb-3 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 border border-emerald-200"
            >
              <FolderKanban size={14} />
              <span>Mở không gian dữ liệu riêng của học viên này</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const u = selectedUserForModal;
                  setSelectedUserForModal(null);
                  setUserActionConfirm({
                    type: 'role',
                    targetUser: u,
                    newRole: u.role === 'admin' ? 'user' : 'admin',
                  });
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center"
              >
                {selectedUserForModal.role === 'admin' ? 'Hạ quyền User' : 'Nâng quyền Admin'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const u = selectedUserForModal;
                  setSelectedUserForModal(null);
                  setUserActionConfirm({
                    type: u.isLocked ? 'unlock' : 'lock',
                    targetUser: u,
                  });
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors text-center ${
                  selectedUserForModal.isLocked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {selectedUserForModal.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for User Action */}
      {userActionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100 p-6 relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Xác nhận thao tác</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              {userActionConfirm.type === 'lock'
                ? `Bạn có chắc chắn muốn KHÓA tài khoản "${userActionConfirm.targetUser.email}"? Học viên này sẽ không thể đăng nhập vào ứng dụng.`
                : userActionConfirm.type === 'unlock'
                ? `Bạn có muốn MỞ KHÓA tài khoản "${userActionConfirm.targetUser.email}" để học viên này tiếp tục học tập?`
                : `Bạn có chắc chắn muốn thay đổi vai trò của "${userActionConfirm.targetUser.email}" thành ${
                    userActionConfirm.newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Học viên (User)'
                  }?`}
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setUserActionConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={executeUserAction}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Vocab Deletion */}
      {vocabDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100 p-6 relative">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Xác nhận xóa từ hệ thống</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Bạn có chắc chắn muốn xóa từ <strong className="text-slate-900 font-bold font-hanzi text-sm">{vocabDeleteConfirm.hanzi}</strong> (
              {vocabDeleteConfirm.pinyin} - {vocabDeleteConfirm.meaning}) khỏi cơ sở dữ liệu hệ thống? Thao tác này sẽ cập nhật ngay lập tức trên Firestore.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setVocabDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={executeDeleteVocab}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
