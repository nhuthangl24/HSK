'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  GraduationCap,
  Clock,
  Sparkles,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
  Flame,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { AppNotification, NotificationType } from '@/types/notification';
import { getClientAuthHeaders } from '@/lib/client-auth';

interface NotificationBellProps {
  onOpenExams?: () => void;
  onStartSmartReview?: () => void;
  onOpenWorksheet?: () => void;
  dueTodayCount?: number;
  streakDays?: number;
}

export function NotificationBell({
  onOpenExams,
  onStartSmartReview,
  onOpenWorksheet,
  dueTodayCount = 0,
  streakDays = 0,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('hsk_read_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('hsk_dismissed_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'system' | 'study'>('all');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch server notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 5 minutes in background
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside listener to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Delete/dismiss a notification for this user
  const handleDeleteNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Locally dismiss for current user
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_dismissed_notifications', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const handleOpenClearConfirm = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowClearConfirmModal(true);
  };

  const handleConfirmClearAll = () => {
    const allIds = allCombinedNotifications.map((n) => n.id);
    setDismissedIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_dismissed_notifications', JSON.stringify(Array.from(next)));
      }
      return next;
    });
    setShowClearConfirmModal(false);
  };

  // Generate dynamic study & streak notifications (excluding dismissed ones)
  const allCombinedNotifications = useMemo(() => {
    const list: AppNotification[] = [...notifications].filter((n) => !dismissedIds.has(n.id));

    // Dynamic SRS Due reminder
    if (dueTodayCount > 0) {
      list.unshift({
        id: `dynamic-due-${new Date().toISOString().slice(0, 10)}`,
        title: `⏰ Bạn có ${dueTodayCount} từ vựng cần ôn hôm nay!`,
        message: 'Ôn tập đúng lúc bằng phương pháp lặp lại ngắt quãng sẽ giúp bạn duy trì trí nhớ dài hạn và không bị quên từ.',
        type: 'reminder',
        priority: 'urgent',
        actionLabel: 'Luyện thẻ ngay',
        actionType: 'open_srs',
        createdAt: new Date().toISOString(),
      });
    }

    // Dynamic Streak encouragement
    if (streakDays >= 3) {
      list.unshift({
        id: `dynamic-streak-${streakDays}`,
        title: `🔥 Tuyệt vời! Bạn đang duy trì chuỗi ${streakDays} ngày học!`,
        message: 'Kiên trì mỗi ngày là chìa khóa chinh phục HSK. Hãy hoàn thành mục tiêu hôm nay để không bị đứt chuỗi!',
        type: 'achievement',
        priority: 'normal',
        createdAt: new Date().toISOString(),
      });
    }

    return list;
  }, [notifications, dueTodayCount, streakDays]);

  // Save readIds to localStorage
  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_read_notifications', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = allCombinedNotifications.map((n) => n.id);
    const next = new Set(allIds);
    setReadIds(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hsk_read_notifications', JSON.stringify(allIds));
    }
  }, [allCombinedNotifications]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return allCombinedNotifications.filter((n) => !readIds.has(n.id)).length;
  }, [allCombinedNotifications, readIds]);

  // Filtered and sorted notifications
  const displayedNotifications = useMemo(() => {
    const filtered = allCombinedNotifications.filter((n) => {
      const isUnread = !readIds.has(n.id);
      if (activeTab === 'unread') return isUnread;
      if (activeTab === 'system') {
        return (
          n.type === 'system' ||
          n.type === 'update' ||
          n.type === 'exam' ||
          n.type === 'feature' ||
          n.type === 'maintenance'
        );
      }
      if (activeTab === 'study') return n.type === 'reminder' || n.type === 'achievement';
      return true;
    });

    // Pinned notifications first, then newest
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allCombinedNotifications, readIds, activeTab]);

  const handleActionClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    setIsOpen(false);

    if (notif.actionType === 'open_exams' && onOpenExams) {
      onOpenExams();
    } else if (notif.actionType === 'open_srs') {
      if (onStartSmartReview) {
        onStartSmartReview();
      } else {
        window.location.href = '/study';
      }
    } else if (notif.actionType === 'open_worksheet' && onOpenWorksheet) {
      onOpenWorksheet();
    } else if (notif.actionType === 'link' && notif.actionPayload) {
      window.open(notif.actionPayload, '_blank', 'noopener,noreferrer');
    } else if (notif.actionLink) {
      if ((notif.actionLink === '/exams' || notif.actionLink.includes('exam')) && onOpenExams) {
        onOpenExams();
      } else if ((notif.actionLink === '/worksheet' || notif.actionLink.includes('worksheet')) && onOpenWorksheet) {
        onOpenWorksheet();
      } else if ((notif.actionLink === '/review' || notif.actionLink.includes('review')) && onStartSmartReview) {
        onStartSmartReview();
      } else if (notif.actionLink.startsWith('http')) {
        window.open(notif.actionLink, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = notif.actionLink;
      }
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return new Date(isoString).toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'exam':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <GraduationCap size={16} />
          </div>
        );
      case 'reminder':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
        );
      case 'achievement':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame size={16} className="fill-amber-500" />
          </div>
        );
      case 'update':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FileText size={16} />
          </div>
        );
      case 'feature':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
        );
      case 'maintenance':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
        );
      case 'system':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Megaphone size={16} />
          </div>
        );
    }
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) fetchNotifications();
            return next;
          });
        }}
        className={`p-2 rounded-xl border transition-all cursor-pointer relative shrink-0 ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}
        title="Thông báo hệ thống & Nhắc học tập"
      >
        <Bell size={15} />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9.5px] font-black rounded-full flex items-center justify-center shadow-xs animate-scaleIn">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-scaleIn origin-top-right flex flex-col max-h-[85vh]">
          {/* Popover Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Thông Báo</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-md">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <CheckCheck size={13} />
                  <span>Đã đọc hết</span>
                </button>
              )}
              {allCombinedNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenClearConfirm}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  title="Dọn sạch toàn bộ thông báo"
                >
                  <Trash2 size={12} />
                  <span>Dọn sạch</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="px-3 pt-2 pb-1 flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold overflow-x-auto scrollbar-none shrink-0">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'unread', label: `Chưa đọc (${unreadCount})` },
              { id: 'system', label: 'Hệ thống' },
              { id: 'study', label: 'Luyện tập' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1 flex-1 scrollbar-thin">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Không có thông báo nào.</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">Bạn đã xem hết các thông báo mới nhất!</p>
                {dismissedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDismissedIds(new Set());
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('hsk_dismissed_notifications');
                      }
                      fetchNotifications();
                    }}
                    className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Khôi phục thông báo đã dọn ({dismissedIds.size})</span>
                  </button>
                )}
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const isUnread = !readIds.has(notif.id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-3 rounded-2xl transition-colors cursor-pointer flex items-start gap-3 relative ${
                      isUnread
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Icon */}
                    {getNotificationIcon(notif.type)}

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-0.5" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(notif.id, e)}
                            title="Xóa thông báo này"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Footer: relative time & optional action */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeTime(notif.createdAt)}
                        </span>

                        {notif.actionLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notif);
                            }}
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-lg shadow-2xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          >
                            <span>{notif.actionLabel}</span>
                            {notif.actionLink?.startsWith('http') || notif.actionPayload?.startsWith('http') ? (
                              <ExternalLink size={11} />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Custom In-App Confirmation Modal (No native alert/confirm) */}
      {showClearConfirmModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setShowClearConfirmModal(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dọn sạch tất cả thông báo?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Toàn bộ thông báo trong danh sách sẽ được dọn sạch. Bạn vẫn có thể khôi phục lại bất kỳ lúc nào nếu cần.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Dọn sạch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
