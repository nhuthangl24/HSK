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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#e2e8f0] dark:border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0f172a] dark:text-white">
              Thông Báo & Phát Tin Hệ Thống
            </h1>
            <span className="px-2 py-0.5 text-[10.5px] font-bold text-[#047857] dark:text-[#34d399] bg-[#ecfdf5] dark:bg-[#064e3b]/40 rounded border border-[#a7f3d0] dark:border-[#065f46]">
              {totalCount} tin
            </span>
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
            Quản lý các bản phát tin cập nhật tính năng, đề thi mới và lịch bảo trì hiển thị trên chuông thông báo học viên.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#334155] dark:text-[#cbd5e1] bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-lg hover:bg-[#f8fafc] dark:hover:bg-[#334155]/60 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#059669] rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Tạo thông báo mới</span>
          </button>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="text-[10.5px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
            Tổng thông báo
          </div>
          <div className="text-xl font-black text-[#0f172a] dark:text-white mt-1">
            {totalCount}
          </div>
          <div className="text-[10px] text-[#94a3b8] dark:text-[#64748b] mt-0.5">
            Lưu trong cơ sở dữ liệu
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="text-[10.5px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
            Đang ghim ưu tiên
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pinnedCount}
          </div>
          <div className="text-[10px] text-[#94a3b8] dark:text-[#64748b] mt-0.5">
            Hiển thị đầu danh sách học viên
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="text-[10.5px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
            Mức độ quan trọng / khẩn cấp
          </div>
          <div className="text-xl font-black text-[#047857] dark:text-[#34d399] mt-1">
            {highPriorityCount}
          </div>
          <div className="text-[10px] text-[#94a3b8] dark:text-[#64748b] mt-0.5">
            Bảo trì hoặc cập nhật lớn
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg placeholder-[#94a3b8] focus:outline-hidden focus:border-[#047857]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mr-1">Chủ đề:</span>
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
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                typeFilter === tab.id
                  ? 'bg-[#047857] text-white'
                  : 'bg-[#f1f5f9] dark:bg-[#1e293b] text-[#475569] dark:text-[#94a3b8] hover:bg-[#e2e8f0] dark:hover:bg-[#334155]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748b] dark:text-[#94a3b8]">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[#047857]" />
            Đang tải dữ liệu thông báo...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto text-[#cbd5e1] dark:text-[#334155] mb-2" />
            <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
              Không có thông báo nào
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 max-w-sm mx-auto">
              Không tìm thấy thông báo phù hợp hoặc hệ thống chưa phát hành bản tin nào.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9] dark:divide-[#1e293b]">
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
                  className="p-4 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#131c2e]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${conf.badgeBg} ${conf.badgeText} ${conf.badgeBorder}`}>
                        <TypeIcon size={16} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border ${conf.badgeBg} ${conf.badgeText} ${conf.badgeBorder}`}>
                            {conf.label}
                          </span>

                          {n.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <Pin size={10} />
                              Đang ghim
                            </span>
                          )}

                          {n.priority === 'urgent' && (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              Khẩn cấp
                            </span>
                          )}

                          <span className="text-[11px] text-[#94a3b8] font-mono ml-auto sm:ml-0">
                            {dateStr}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-[#0f172a] dark:text-white tracking-tight">
                          {n.title}
                        </h3>

                        <p className="text-xs text-[#475569] dark:text-[#94a3b8] mt-1 leading-relaxed whitespace-pre-wrap font-normal">
                          {n.message}
                        </p>

                        {n.actionLabel && n.actionLink && (
                          <div className="mt-2">
                            <a
                              href={n.actionLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857] dark:text-[#34d399] hover:underline"
                            >
                              <span>{n.actionLabel}</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(n)}
                        title={n.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          n.isPinned
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] text-[#64748b] hover:text-[#0f172a] dark:hover:text-white'
                        }`}
                      >
                        {n.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(n)}
                        title="Chỉnh sửa thông báo"
                        className="p-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#64748b] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteNotification(n.id)}
                        title="Xóa thông báo này"
                        className="p-1.5 rounded-lg border border-transparent text-[#94a3b8] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#e2e8f0] dark:border-[#1e293b] max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-[#047857]" />
                <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
                  {editingNotification ? 'Chỉnh Sửa Thông Báo' : 'Soạn Thông Báo Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNotification} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật tính năng luyện viết chữ Hán PDF"
                  className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Mô tả nội dung thông báo, hướng dẫn thao tác cho học viên..."
                  className="w-full px-3 py-2 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Loại thông báo
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as NotificationType)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
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
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Độ ưu tiên
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as NotificationPriority)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  >
                    <option value="normal">Bình thường</option>
                    <option value="high">Quan trọng</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Nhãn nút hành động (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formActionLabel}
                    onChange={(e) => setFormActionLabel(e.target.value)}
                    placeholder="VD: Trải nghiệm ngay"
                    className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Liên kết điều hướng (URL)
                  </label>
                  <input
                    type="text"
                    value={formActionLink}
                    onChange={(e) => setFormActionLink(e.target.value)}
                    placeholder="VD: /exams hoặc /worksheet"
                    className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-[#047857] focus:ring-[#047857]"
                  />
                  <span className="text-xs font-semibold text-[#0f172a] dark:text-white">
                    Ghim thông báo này lên đầu danh sách học viên
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0] dark:border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#475569] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
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
