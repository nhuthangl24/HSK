'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Lock,
  CheckCircle2,
  Trash2,
  Shield,
  UserCheck,
  AlertCircle,
  FolderKanban,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Award,
  Clock,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '@/types/auth';

interface Props {
  users: User[];
  loadingUsers: boolean;
  currentUser: User | null;
  onRefreshUsers: () => void;
  onUpdateUserRole: (user: User, newRole: UserRole) => Promise<void>;
  onToggleLockUser: (user: User) => Promise<void>;
  onDeleteUser: (user: User) => Promise<void>;
  onOpenWorkspace?: (userId: string) => void;
}

export default function AdminUsersTab({
  users,
  loadingUsers,
  currentUser,
  onRefreshUsers,
  onUpdateUserRole,
  onToggleLockUser,
  onDeleteUser,
  onOpenWorkspace,
}: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'targetHsk' | 'streak'>('recent');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Selected User For Profile Modal
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  // Deletion Safeguard Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Role Action Confirmation Modal State
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: User;
    newRole: UserRole;
  } | null>(null);

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.id && u.id.toLowerCase().includes(q))
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (statusFilter === 'active') {
      result = result.filter((u) => !u.isLocked);
    } else if (statusFilter === 'locked') {
      result = result.filter((u) => u.isLocked);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': {
          const nameA = a.name || a.email || '';
          const nameB = b.name || b.email || '';
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
  }, [users, search, roleFilter, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;
    setIsDeleting(true);
    try {
      await onDeleteUser(deleteTargetUser);
      setDeleteTargetUser(null);
      setDeleteConfirmInput('');
      if (inspectUser?.id === deleteTargetUser.id) {
        setInspectUser(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeTarget) return;
    await onUpdateUserRole(roleChangeTarget.user, roleChangeTarget.newRole);
    setRoleChangeTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Quản Trị Người Dùng & Học Viên
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản lý tài khoản, điều chỉnh phân quyền, giám sát tiến trình học tập và an toàn dữ liệu.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshUsers}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors self-start sm:self-center"
        >
          <RefreshCw size={13} className={loadingUsers ? 'animate-spin text-emerald-600' : ''} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên học viên, email hoặc ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="user">Học viên (User)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khóa tạm thời</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="recent">Mới nhất trước</option>
            <option value="name">Tên (A-Z)</option>
            <option value="targetHsk">Mục tiêu HSK cao</option>
            <option value="streak">Chuỗi ngày học cao</option>
          </select>
        </div>
      </div>

      {/* Modern High-Density Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Học viên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Mục tiêu</th>
                <th className="py-3 px-4">Chuỗi Streak</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {loadingUsers ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-emerald-600" />
                      <span>Đang tải danh sách học viên...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy học viên nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isCurrentAdmin = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name with initial avatar */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setInspectUser(u)}
                          className="flex items-center gap-2.5 text-left group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-300 transition-colors">
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {u.name || u.email?.split('@')[0] || 'Học viên'}
                            </span>
                            {isCurrentAdmin && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                Bạn
                              </span>
                            )}
                          </div>
                        </button>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {u.email || '—'}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            u.role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <Shield size={10} /> Quản trị viên
                            </>
                          ) : (
                            'Học viên'
                          )}
                        </span>
                      </td>

                      {/* Target HSK */}
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        HSK {u.targetHsk || 3}
                      </td>

                      {/* Streak */}
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {u.streakDays || 0} ngày
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {u.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <Lock size={12} /> Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} /> Bình thường
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectUser(u)}
                          className="px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Chi tiết
                        </button>

                        {!isCurrentAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setRoleChangeTarget({
                                  user: u,
                                  newRole: u.role === 'admin' ? 'user' : 'admin',
                                })
                              }
                              className="px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                            >
                              {u.role === 'admin' ? 'Hạ User' : 'Nâng Admin'}
                            </button>

                            <button
                              type="button"
                              onClick={() => onToggleLockUser(u)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                u.isLocked
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {u.isLocked ? 'Mở khóa' : 'Khóa'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTargetUser(u);
                                setDeleteConfirmInput('');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition-colors"
                              title="Xóa vĩnh viễn tài khoản"
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {filteredUsers.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Hiển thị {(page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, filteredUsers.length)} trên tổng số {filteredUsers.length} tài khoản
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

      {/* User Detail & Profile Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              type="button"
              onClick={() => setInspectUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-lg">
                {(inspectUser.name || inspectUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {inspectUser.name || inspectUser.email?.split('@')[0] || 'Học viên'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{inspectUser.email}</p>
              </div>
            </div>

            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 mb-5">
              <div className="flex justify-between">
                <span>UID Định danh:</span>
                <span className="font-mono text-slate-900 dark:text-white truncate max-w-[180px]">
                  {inspectUser.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vai trò:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {inspectUser.role === 'admin' ? 'Quản trị viên (Admin)' : 'Học viên (User)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mục tiêu HSK:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  HSK {inspectUser.targetHsk || 3}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chuỗi ngày học liên tục:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {inspectUser.streakDays || 0} ngày
                </span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái tài khoản:</span>
                <span className={inspectUser.isLocked ? 'font-bold text-rose-600' : 'font-semibold text-emerald-600'}>
                  {inspectUser.isLocked ? 'Đã bị khóa' : 'Đang hoạt động'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Đăng nhập gần nhất:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {inspectUser.lastLoginAt ? new Date(inspectUser.lastLoginAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ngày tạo tài khoản:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {inspectUser.createdAt ? new Date(inspectUser.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
            </div>

            {onOpenWorkspace && (
              <button
                type="button"
                onClick={() => {
                  onOpenWorkspace(inspectUser.id);
                  setInspectUser(null);
                }}
                className="w-full mb-4 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
              >
                <FolderKanban size={14} />
                <span>Mở không gian dữ liệu riêng của học viên này</span>
              </button>
            )}

            {inspectUser.id !== currentUser?.id && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const u = inspectUser;
                    setInspectUser(null);
                    setDeleteTargetUser(u);
                    setDeleteConfirmInput('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1 p-1"
                >
                  <Trash2 size={13} />
                  <span>Xóa vĩnh viễn tài khoản</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleLockUser(inspectUser);
                      setInspectUser((prev) => (prev ? { ...prev, isLocked: !prev.isLocked } : null));
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {inspectUser.isLocked ? 'Mở khóa' : 'Khóa'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deletion Safeguard Modal */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-rose-200 dark:border-rose-900 p-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Cảnh Báo: Xóa Vĩnh Viễn Người Dùng
            </h3>

            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 leading-relaxed mb-4">
              <p className="font-semibold mb-1">Hành động này là KHÔNG THỂ HOÀN TÁC!</p>
              <p>
                Khi xóa tài khoản <strong className="font-mono text-rose-950 dark:text-rose-100">{deleteTargetUser.email}</strong>,
                hệ thống sẽ dọn dẹp liên hoàn (**cascade cleanup**) toàn bộ dữ liệu:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                <li>Sổ từ vựng cá nhân đã tạo</li>
                <li>Tiến trình ôn tập thẻ ghi nhớ SRS SM-2</li>
                <li>Lịch sử chuỗi học streak</li>
              </ul>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nhập chính xác email hoặc <code className="text-rose-600 font-bold">XÓA</code> để xác nhận:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteTargetUser.email}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTargetUser(null);
                  setDeleteConfirmInput('');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={
                  isDeleting ||
                  (deleteConfirmInput.trim().toLowerCase() !== deleteTargetUser.email.toLowerCase() &&
                    deleteConfirmInput.trim() !== 'XÓA')
                }
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-6 relative">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-3">
              <Shield size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Xác nhận thay đổi phân quyền
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Bạn có chắc chắn muốn đổi vai trò của tài khoản <strong className="text-slate-800 dark:text-slate-200">{roleChangeTarget.user.email}</strong> thành{' '}
              <strong className="text-purple-600 dark:text-purple-400 font-bold">
                {roleChangeTarget.newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Học viên (User)'}
              </strong>?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
