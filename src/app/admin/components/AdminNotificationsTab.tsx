'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Layers,
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
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  system: {
    label: 'Hệ thống',
    icon: Bell,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  feature: {
    label: 'Tính năng mới',
    icon: Sparkles,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  exam: {
    label: 'Đề thi & Tài liệu',
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    border: 'border-purple-200 dark:border-purple-800',
  },
  update: {
    label: 'Bản cập nhật',
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    border: 'border-blue-200 dark:border-blue-800',
  },
  maintenance: {
    label: 'Bảo trì hệ thống',
    icon: Wrench,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800',
  },
  reminder: {
    label: 'Nhắc học tập',
    icon: Calendar,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    border: 'border-rose-200 dark:border-rose-800',
  },
  achievement: {
    label: 'Thành tích & Chuỗi',
    icon: Sparkles,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

export default function AdminNotificationsTab() {
  const toast = useToast();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Edit / Create modal state
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

  // Delete modal state
  const [deletingNotification, setDeletingNotification] = useState<AppNotification | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load notifications from server
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        toast.error('Không thể tải danh sách thông báo');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Open modal for Create
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

  // Open modal for Edit
  const handleOpenEdit = (notif: AppNotification) => {
    setEditingNotification(notif);
    setFormTitle(notif.title);
    setFormMessage(notif.message);
    setFormType(notif.type);
    setFormPriority(notif.priority);
    setFormIsPinned(!!notif.isPinned);
    setFormActionLabel(notif.actionLabel || '');
    setFormActionLink(notif.actionLink || '');
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề thông báo');
      return;
    }
    if (!formMessage.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo');
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
        // PATCH
        const res = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ id: editingNotification.id, ...payload }),
        });
        if (res.ok) {
          toast.success('Cập nhật thông báo thành công');
          setIsModalOpen(false);
          fetchNotifications();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Cập nhật thất bại');
        }
      } else {
        // POST
        const res = await fetch('/api/notifications', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success('Phát thông báo hệ thống mới thành công!');
          setIsModalOpen(false);
          fetchNotifications();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Phát thông báo thất bại');
        }
      }
    } catch {
      toast.error('Đã xảy ra lỗi kết nối');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle pin
  const handleTogglePin = async (notif: AppNotification) => {
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ id: notif.id, isPinned: !notif.isPinned }),
      });
      if (res.ok) {
        toast.success(notif.isPinned ? 'Đã gỡ ghim thông báo' : 'Đã ghim thông báo lên đầu');
        fetchNotifications();
      } else {
        toast.error('Không thể cập nhật trạng thái ghim');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deletingNotification) return;
    setIsDeleting(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/notifications?id=${encodeURIComponent(deletingNotification.id)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        toast.success('Đã xóa thông báo thành công');
        setDeletingNotification(null);
        fetchNotifications();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Xóa thông báo thất bại');
      }
    } catch {
      toast.error('Lỗi máy chủ khi xóa thông báo');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list
  const filteredNotifications = notifications.filter((notif) => {
    if (typeFilter !== 'all' && notif.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        notif.title.toLowerCase().includes(q) ||
        notif.message.toLowerCase().includes(q) ||
        (notif.actionLabel && notif.actionLabel.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pinnedCount = notifications.filter((n) => n.isPinned).length;
  const highPriorityCount = notifications.filter((n) => n.priority === 'high' || n.priority === 'urgent').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <Megaphone size={20} />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Thông Báo & Phát Tin Hệ Thống
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gửi tin nhắn phát sóng, thông báo đề thi mới, tính năng mới hoặc lịch bảo trì tới chuông thông báo của toàn bộ học viên.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchNotifications}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs btn-press"
          >
            <Plus size={16} />
            <span>Phát thông báo mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Tổng thông báo</span>
            <Bell size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {notifications.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tất cả thông điệp phát sóng</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase">Đang ghim ưu tiên</span>
            <Pin size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {pinnedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Luôn hiển thị trên đầu chuông</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase">Mức khẩn cấp (High)</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
            {highPriorityCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Gây chú ý cao với chấm đỏ</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung thông báo..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              typeFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((typeKey) => {
            const cfg = TYPE_CONFIG[typeKey];
            const count = notifications.filter((n) => n.type === typeKey).length;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setTypeFilter(typeKey)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                  typeFilter === typeKey
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{cfg.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-xs">Đang tải danh sách thông báo...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <Bell size={32} className="mx-auto mb-2 text-slate-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Không tìm thấy thông báo nào
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Thử thay đổi bộ lọc hoặc bấm &quot;Phát thông báo mới&quot; ở góc trên.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
            const IconComponent = cfg.icon;

            return (
              <div
                key={notif.id}
                className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs hover:shadow-xs ${
                  notif.isPinned
                    ? 'border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-900/50'
                    : 'border-slate-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2.5 rounded-xl shrink-0 ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                      <IconComponent size={18} />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {notif.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                            <Pin size={10} className="fill-amber-600" /> Ghim trên đầu
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        {(notif.priority === 'high' || notif.priority === 'urgent') && (
                          <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                            Quan trọng
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar size={11} />
                          {new Date(notif.createdAt).toLocaleDateString('vi-VN')} {new Date(notif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {notif.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.actionLabel && (
                        <div className="pt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-zinc-700">
                            <ExternalLink size={12} className="text-slate-400" />
                            <span>Hành động: {notif.actionLabel}</span>
                            {notif.actionLink && (
                              <span className="text-[10px] text-slate-400 font-mono">({notif.actionLink})</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex sm:flex-col items-center gap-1.5 self-end sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(notif)}
                      className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        notif.isPinned
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500'
                      }`}
                      title={notif.isPinned ? 'Bỏ ghim thông báo' : 'Ghim thông báo lên đầu chuông'}
                    >
                      {notif.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      <span className="sm:hidden text-xs">{notif.isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(notif)}
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                      title="Chỉnh sửa thông báo"
                    >
                      <Edit2 size={14} />
                      <span className="sm:hidden text-xs">Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingNotification(notif)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center gap-1"
                      title="Xóa thông báo này"
                    >
                      <Trash2 size={14} />
                      <span className="sm:hidden text-xs">Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-zinc-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  {editingNotification ? <Edit2 size={18} /> : <Megaphone size={18} />}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingNotification ? 'Chỉnh Sửa Thông Báo' : 'Phát Thông Báo Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Vd: 🚀 Đã cập nhật 12 đề thi HSK 5 mới nhất 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Mô tả thông tin chi tiết, lời nhắn nhủ gửi tới các bạn học viên..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Loại thông báo
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as NotificationType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="system">Hệ thống (System)</option>
                    <option value="feature">Tính năng mới (Feature)</option>
                    <option value="exam">Kho đề thi (Exam)</option>
                    <option value="update">Bản cập nhật (Update)</option>
                    <option value="maintenance">Bảo trì (Maintenance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as NotificationPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="normal">Bình thường (Normal)</option>
                    <option value="high">Quan trọng / Khẩn (High)</option>
                    <option value="low">Thông tin phụ (Low)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Nút hành động nhanh (Tùy chọn)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Học viên bấm vào chuông để mở nhanh</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nhãn nút bấm (Label)
                    </label>
                    <input
                      type="text"
                      value={formActionLabel}
                      onChange={(e) => setFormActionLabel(e.target.value)}
                      placeholder="Vd: Mở kho đề thi, In phiếu..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Liên kết hành động (Link / Action)
                    </label>
                    <input
                      type="text"
                      value={formActionLink}
                      onChange={(e) => setFormActionLink(e.target.value)}
                      placeholder="Vd: /exams, /worksheet, hoặc https://..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Ghim thông báo này lên trên đầu chuông
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Thông báo được ghim sẽ luôn đứng ở vị trí ưu tiên cao nhất trong thông báo của học viên.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>{editingNotification ? 'Lưu thay đổi' : 'Phát thông báo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100 dark:border-zinc-800 p-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Xóa thông báo hệ thống?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Bạn có chắc chắn muốn xóa vĩnh viễn thông báo &quot;
              <strong className="text-slate-900 dark:text-white">{deletingNotification.title}</strong>
              &quot;? Thao tác này sẽ gỡ thông báo khỏi toàn bộ học viên.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingNotification(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : null}
                <span>Xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
