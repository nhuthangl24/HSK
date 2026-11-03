'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Pin,
  PinOff,
  AlertCircle,
  Sparkles,
  GraduationCap,
  Wrench,
  Info,
  Calendar,
  ExternalLink,
  CheckCircle2,
  X,
  Megaphone,
} from 'lucide-react';
import { AppNotification, NotificationType, NotificationPriority } from '@/types/notification';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: React.ElementType; badgeBg: string; badgeText: string; badgeBorder: string }
> = {
  system: {
    label: 'Hệ thống',
    icon: Bell,
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800/60',
  },
  feature: {
    label: 'Tính năng mới',
    icon: Sparkles,
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
  },
  exam: {
    label: 'Đề thi & Tài liệu',
    icon: GraduationCap,
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800/60',
  },
  update: {
    label: 'Bản cập nhật',
    icon: Info,
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-200 dark:border-teal-800/60',
  },
  maintenance: {
    label: 'Bảo trì hệ thống',
    icon: Wrench,
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/60',
  },
  reminder: {
    label: 'Nhắc học tập',
    icon: Calendar,
    badgeBg: 'bg-slate-50 dark:bg-slate-800/60',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
  },
  achievement: {
    label: 'Khen thưởng & Chuỗi',
    icon: Sparkles,
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800/60',
  },
};

export default function AdminNotificationsTab() {
  const toast = useToast();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<AppNotification | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form inputs
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<NotificationType>('system');
  const [formPriority, setFormPriority] = useState<NotificationPriority>('normal');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formActionLabel, setFormActionLabel] = useState('');
  const [formActionLink, setFormActionLink] = useState('');

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn('Notifications fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenCreate = () => {
    setEditingNotification(null);
    setFormTitle('');
    setFormMessage('');
    setFormType('system');
    setFormPriority('normal');
    setFormIsPinned(false);
    setFormActionLabel('');
    setFormActionLink('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (notif: AppNotification) => {
    setEditingNotification(notif);
    setFormTitle(notif.title);
    setFormMessage(notif.message);
    setFormType(notif.type || 'system');
    setFormPriority(notif.priority || 'normal');
    setFormIsPinned(Boolean(notif.isPinned));
    setFormActionLabel(notif.actionLabel || '');
    setFormActionLink(notif.actionLink || '');
    setIsModalOpen(true);
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.warning('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo');
      return;
    }

    setFormSubmitting(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const payload: Partial<AppNotification> = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        priority: formPriority,
        isPinned: formIsPinned,
        actionLabel: formActionLabel.trim() || undefined,
        actionLink: formActionLink.trim() || undefined,
      };

      if (editingNotification) {
        // Edit
        const res = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ id: editingNotification.id, ...payload }),
        });
        if (res.ok) {
          toast.success('Đã cập nhật thông báo thành công');
          setIsModalOpen(false);
          fetchNotifications();
        } else {
          toast.error('Cập nhật thông báo thất bại');
        }
      } else {
        // Create
        const res = await fetch('/api/notifications', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success('Đã phát hành thông báo mới đến toàn hệ thống');
          setIsModalOpen(false);
          fetchNotifications();
        } else {
          toast.error('Phát hành thông báo thất bại');
        }
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu thông báo');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTogglePin = async (notif: AppNotification) => {
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          id: notif.id,
          isPinned: !notif.isPinned,
        }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isPinned: !n.isPinned } : n))
        );
        toast.success(notif.isPinned ? 'Đã bỏ ghim thông báo' : 'Đã ghim thông báo lên đầu');
      } else {
        toast.error('Không thể ghim thông báo');
      }
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái ghim');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này? Hành động không thể hoàn tác.')) return;
    setIsDeleting(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast.success(data.message || 'Đã xóa thông báo thành công');
      } else {
        toast.error(data.message || 'Xóa thông báo thất bại');
      }
    } catch {
      toast.error('Lỗi khi xóa thông báo');
    } finally {
      setIsDeleting(false);
    }
  };

  // KPIs
  const totalCount = notifications.length;
  const pinnedCount = useMemo(() => notifications.filter((n) => n.isPinned).length, [notifications]);
  const highPriorityCount = useMemo(() => notifications.filter((n) => n.priority === 'urgent' || n.priority === 'high').length, [notifications]);

  // Filtering
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const t = (n.title || '').toLowerCase();
        const m = (n.message || '').toLowerCase();
        if (!t.includes(q) && !m.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, typeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Megaphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Thông Báo & Phát Tin Hệ Thống
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                {totalCount} tin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Quản lý các bản phát tin cập nhật tính năng, đề thi mới và lịch bảo trì hiển thị trên chuông thông báo học viên.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-emerald-500' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Tạo thông báo mới</span>
          </button>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Tổng thông báo
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-zinc-100 mt-1">
            {totalCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Lưu trong cơ sở dữ liệu
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Đang ghim ưu tiên
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pinnedCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Hiển thị đầu danh sách học viên
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Mức độ quan trọng / khẩn cấp
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {highPriorityCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Bảo trì hoặc cập nhật lớn
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1">Chủ đề:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'system', label: 'Hệ thống' },
            { id: 'feature', label: 'Tính năng' },
            { id: 'exam', label: 'Đề thi' },
            { id: 'maintenance', label: 'Bảo trì' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                typeFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-xs">
        {loading && notifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-zinc-400">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-emerald-500" />
            Đang tải dữ liệu thông báo...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              Không có thông báo nào
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Không tìm thấy thông báo phù hợp hoặc hệ thống chưa phát hành bản tin nào.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {filteredNotifications.map((n) => {
              const conf = TYPE_CONFIG[n.type || 'system'] || TYPE_CONFIG.system;
              const TypeIcon = conf.icon;
              const dateStr = n.createdAt
                ? new Date(n.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Mới tạo';

              return (
                <div
                  key={n.id}
                  className="p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${conf.badgeBg} ${conf.badgeText} ${conf.badgeBorder}`}>
                        <TypeIcon size={18} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${conf.badgeBg} ${conf.badgeText} ${conf.badgeBorder}`}>
                            {conf.label}
                          </span>

                          {n.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <Pin size={11} />
                              Đang ghim
                            </span>
                          )}

                          {n.priority === 'urgent' && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              Khẩn cấp
                            </span>
                          )}

                          <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono ml-auto sm:ml-0">
                            {dateStr}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                          {n.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed whitespace-pre-wrap font-normal">
                          {n.message}
                        </p>

                        {n.actionLabel && n.actionLink && (
                          <div className="mt-2">
                            <a
                              href={n.actionLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <span>{n.actionLabel}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(n)}
                        title={n.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          n.isPinned
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {n.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(n)}
                        title="Chỉnh sửa thông báo"
                        className="p-2 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteNotification(n.id)}
                        title="Xóa thông báo này"
                        className="p-2 rounded-xl border border-transparent text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/90 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Megaphone size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {editingNotification ? 'Chỉnh Sửa Thông Báo' : 'Soạn Thông Báo Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNotification} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật tính năng luyện viết chữ Hán PDF"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Mô tả nội dung thông báo, hướng dẫn thao tác cho học viên..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Loại thông báo
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as NotificationType)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="system">Hệ thống chung</option>
                    <option value="feature">Tính năng mới</option>
                    <option value="exam">Đề thi & Tài liệu</option>
                    <option value="update">Bản cập nhật</option>
                    <option value="maintenance">Lịch bảo trì</option>
                    <option value="reminder">Nhắc học tập</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Độ ưu tiên
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as NotificationPriority)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="normal">Bình thường</option>
                    <option value="high">Quan trọng</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Nhãn nút hành động (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formActionLabel}
                    onChange={(e) => setFormActionLabel(e.target.value)}
                    placeholder="VD: Trải nghiệm ngay"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Liên kết điều hướng (URL)
                  </label>
                  <input
                    type="text"
                    value={formActionLink}
                    onChange={(e) => setFormActionLink(e.target.value)}
                    placeholder="VD: /exams hoặc /worksheet"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    Ghim thông báo này lên đầu danh sách học viên
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/90 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {formSubmitting ? 'Đang lưu...' : editingNotification ? 'Cập nhật' : 'Phát thông báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
