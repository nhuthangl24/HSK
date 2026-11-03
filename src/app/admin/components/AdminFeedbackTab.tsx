'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Star,
  CheckCircle2,
  Clock,
  Bug,
  Lightbulb,
  Volume2,
  FileText,
  HelpCircle,
  Trash2,
  Eye,
  Check,
  User,
  Smartphone,
  ExternalLink,
  ChevronDown,
  X,
  Send,
  Filter,
} from 'lucide-react';
import { UserFeedback } from '@/types/auth';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

export default function AdminFeedbackTab() {
  const toast = useToast();
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/feedback', {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.feedbacks)) {
          setFeedbacks(data.feedbacks);
        }
      } else {
        console.warn('API /api/feedback responded with status:', res.status);
      }
    } catch (err) {
      console.error('Fetch feedbacks network error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleUpdateStatus = async (id: string, status: 'new' | 'reviewed' | 'resolved') => {
    setActionLoadingId(id);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status } : f))
        );
        if (selectedFeedback && selectedFeedback.id === id) {
          setSelectedFeedback((prev) => (prev ? { ...prev, status } : null));
        }
        toast.success(
          status === 'resolved'
            ? 'Đã đánh dấu hoàn tất xử lý phản hồi'
            : status === 'reviewed'
            ? 'Đã chuyển sang trạng thái đã tiếp nhận'
            : 'Đã đưa về hàng đợi chờ xử lý'
        );
      } else {
        toast.error('Cập nhật trạng thái thất bại');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật trạng thái');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn phản hồi này khỏi hệ thống?')) return;
    setActionLoadingId(id);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/feedback?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id));
        if (selectedFeedback?.id === id) setSelectedFeedback(null);
        toast.success('Đã xóa phản hồi thành công');
      } else {
        toast.error('Không thể xóa phản hồi này');
      }
    } catch {
      toast.error('Lỗi kết nối khi xóa phản hồi');
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPIs
  const totalCount = feedbacks.length;
  const pendingCount = useMemo(() => feedbacks.filter((f) => !f.status || f.status === 'new').length, [feedbacks]);
  const resolvedCount = useMemo(() => feedbacks.filter((f) => f.status === 'resolved').length, [feedbacks]);
  const bugCount = useMemo(() => feedbacks.filter((f) => f.category === 'bug').length, [feedbacks]);
  const avgRating = useMemo(() => {
    if (!totalCount) return '5.0';
    const sum = feedbacks.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    return (sum / totalCount).toFixed(1);
  }, [feedbacks, totalCount]);

  // Filtering
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && (f.status || 'new') !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const msg = (f.message || '').toLowerCase();
        const email = (f.userEmail || '').toLowerCase();
        const name = (f.userName || '').toLowerCase();
        if (!msg.includes(q) && !email.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [feedbacks, categoryFilter, statusFilter, search]);

  const renderCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'bug':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
            <Bug size={12} />
            Báo lỗi
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
            <Lightbulb size={12} />
            Tính năng
          </span>
        );
      case 'voice':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-900/60">
            <Volume2 size={12} />
            Phát âm TTS
          </span>
        );
      case 'content':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
            <FileText size={12} />
            Từ vựng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
            <HelpCircle size={12} />
            Khác
          </span>
        );
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 size={12} />
            Đã xử lý
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50">
            <Eye size={12} />
            Đã tiếp nhận
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <Clock size={12} />
            Chờ xử lý
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Hòm Thư Góp Ý & Phản Hồi Học Viên
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                {totalCount} tin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Theo dõi, phân loại và phản hồi các đóng góp trải nghiệm, báo lỗi kỹ thuật và góp ý từ người học.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchFeedbacks}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-emerald-500' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Academic Metadata Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Tổng tiếp nhận
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-zinc-100 mt-1">
            {totalCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Từ học viên toàn hệ thống
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Chờ giải quyết
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Cần quản trị viên kiểm tra
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Báo lỗi kỹ thuật
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {bugCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Sự cố phát âm & giao diện
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Điểm hài lòng trung bình
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <span>{avgRating}</span>
            <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">/ 5.0</span>
            <Star size={16} className="fill-amber-400 text-amber-400 ml-1" />
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Dựa trên {totalCount} lượt đánh giá
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo nội dung, email hoặc tên học viên..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1">Trạng thái:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'new', label: 'Chờ xử lý' },
              { id: 'reviewed', label: 'Đã xem' },
              { id: 'resolved', label: 'Đã giải quyết' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1">Phân loại:</span>
          {[
            { id: 'all', label: 'Tất cả loại' },
            { id: 'bug', label: 'Báo lỗi hệ thống' },
            { id: 'feature', label: 'Góp ý tính năng' },
            { id: 'voice', label: 'Phát âm TTS' },
            { id: 'content', label: 'Nội dung từ vựng' },
            { id: 'other', label: 'Ý kiến khác' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
          {filteredFeedbacks.length !== totalCount && (
            <span className="ml-auto text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Hiển thị {filteredFeedbacks.length} / {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Main Feedback List / Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-xs">
        {loading && feedbacks.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-zinc-400">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-emerald-500" />
            Đang tải dữ liệu hòm thư...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              Không tìm thấy phản hồi nào
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Không có ý kiến hoặc đóng góp nào phù hợp với bộ lọc hiện tại. Thử thay đổi tiêu chí tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {filteredFeedbacks.map((f) => {
              const isSelected = selectedFeedback?.id === f.id;
              const dateStr = f.createdAt
                ? new Date(f.createdAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Mới gửi';

              return (
                <div
                  key={f.id}
                  className={`p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 ${
                    isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: User metadata & Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {renderCategoryBadge(f.category)}
                        {renderStatusBadge(f.status)}

                        {/* Star Rating */}
                        <div className="flex items-center gap-0.5 ml-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                s <= (f.rating || 5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300 dark:text-zinc-700'
                              }
                            />
                          ))}
                        </div>

                        <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono ml-auto sm:ml-0">
                          {dateStr}
                        </span>
                      </div>

                      {/* Feedback Text */}
                      <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-normal">
                        {f.message}
                      </p>

                      {/* Author / Device info strip */}
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-zinc-100">
                          <User size={13} className="text-emerald-600 dark:text-emerald-400" />
                          {f.userName || 'Học viên ẩn danh'}
                        </span>
                        {f.userEmail && (
                          <span className="font-mono text-slate-600 dark:text-zinc-400">
                            &lt;{f.userEmail}&gt;
                          </span>
                        )}
                        {f.deviceInfo && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 truncate max-w-xs" title={f.deviceInfo}>
                            <Smartphone size={12} />
                            {f.deviceInfo.includes('Mobile') ? 'Thiết bị di động' : 'Máy tính để bàn'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {f.status !== 'resolved' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === f.id}
                          onClick={() => handleUpdateStatus(f.id, 'resolved')}
                          title="Đánh dấu hoàn thành giải quyết"
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Check size={13} />
                          <span>Xong</span>
                        </button>
                      )}

                      {f.status === 'new' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === f.id}
                          onClick={() => handleUpdateStatus(f.id, 'reviewed')}
                          title="Đã tiếp nhận phản hồi"
                          className="px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 border border-sky-200 dark:border-sky-800/80 rounded-xl transition-colors cursor-pointer"
                        >
                          Tiếp nhận
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={actionLoadingId === f.id}
                        onClick={() => handleDeleteFeedback(f.id)}
                        title="Xóa phản hồi này"
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
    </div>
  );
}
