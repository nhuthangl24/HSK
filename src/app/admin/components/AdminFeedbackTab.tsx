'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Check,
  Eye,
  Filter,
  Monitor,
  User,
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
        toast.error('Không thể tải danh sách phản hồi.');
      }
    } catch (err) {
      console.error('Fetch feedbacks error:', err);
      toast.error('Lỗi khi tải danh sách phản hồi.');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

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
        toast.success(
          status === 'resolved'
            ? 'Đã đánh dấu xử lý xong phản hồi.'
            : status === 'reviewed'
            ? 'Đã đánh dấu đã xem.'
            : 'Đã chuyển về trạng thái mới.'
        );
      } else {
        toast.error('Cập nhật trạng thái thất bại.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return;
    setActionLoadingId(id);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/feedback?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id));
        toast.success('Đã xóa phản hồi thành công.');
      } else {
        toast.error('Xóa phản hồi thất bại.');
      }
    } catch {
      toast.error('Lỗi kết nối khi xóa phản hồi.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered List
  const filteredFeedbacks = feedbacks.filter((f) => {
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && (f.status || 'new') !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchMsg = f.message?.toLowerCase().includes(q);
      const matchEmail = f.userEmail?.toLowerCase().includes(q);
      const matchName = f.userName?.toLowerCase().includes(q);
      if (!matchMsg && !matchEmail && !matchName) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalCount = feedbacks.length;
  const bugCount = feedbacks.filter((f) => f.category === 'bug').length;
  const featureCount = feedbacks.filter((f) => f.category === 'feature').length;
  const avgRating =
    totalCount > 0
      ? (feedbacks.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalCount).toFixed(1)
      : '5.0';

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Lightbulb size={12} className="text-amber-500" />
            Góp ý tính năng
          </span>
        );
      case 'bug':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Bug size={12} className="text-rose-500" />
            Báo lỗi hệ thống
          </span>
        );
      case 'voice':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Volume2 size={12} className="text-blue-500" />
            Giọng đọc / TTS
          </span>
        );
      case 'content':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileText size={12} className="text-emerald-500" />
            Sai sót từ vựng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle size={12} className="text-purple-500" />
            Ý kiến khác
          </span>
        );
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={11} />
            Đã xử lý
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Eye size={11} />
            Đã xem
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock size={11} />
            Chờ xử lý
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={22} />
            Hòm Thư Góp Ý & Phản Hồi Từ Học Viên
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi, xử lý và tiếp thu các đề xuất tính năng, báo lỗi và phản hồi chất lượng từ người dùng.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchFeedbacks}
          className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới ({feedbacks.length})</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Tổng phản hồi</span>
            <MessageSquare size={14} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <span className="text-[10px] text-slate-400">Từ học viên và khách</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Đánh giá trung bình</span>
            <Star size={14} className="text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{avgRating} / 5.0</div>
          <span className="text-[10px] text-slate-400">Độ hài lòng nền tảng</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Báo lỗi hệ thống</span>
            <Bug size={14} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{bugCount}</div>
          <span className="text-[10px] text-slate-400">Cần kiểm tra kỹ thuật</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Góp ý tính năng</span>
            <Lightbulb size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{featureCount}</div>
          <span className="text-[10px] text-slate-400">Ý tưởng cải tiến</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo nội dung, email, tên người gửi..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Filter size={13} className="text-slate-400 mr-1" />
            {['all', 'new', 'reviewed', 'resolved'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'Tất cả trạng thái' : st === 'new' ? 'Chờ xử lý' : st === 'reviewed' ? 'Đã xem' : 'Đã giải quyết'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Chủ đề:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'feature', label: '💡 Tính năng' },
            { id: 'bug', label: '🐛 Báo lỗi' },
            { id: 'voice', label: '🔊 Giọng đọc' },
            { id: 'content', label: '📝 Từ vựng' },
            { id: 'other', label: '💬 Khác' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Items List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang tải dữ liệu hòm thư góp ý...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
            <MessageSquare size={36} className="mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-800">Chưa có phản hồi nào phù hợp</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Khi học viên gửi góp ý hoặc báo lỗi từ form Cài đặt cá nhân, dữ liệu sẽ hiển thị đầy đủ tại đây.
            </p>
          </div>
        ) : (
          filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {fb.userName ? fb.userName.charAt(0).toUpperCase() : <User size={15} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {fb.userName || 'Học viên ẩn danh'}
                      </span>
                      {getCategoryBadge(fb.category)}
                      {getStatusBadge(fb.status)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {fb.userEmail ? (
                        <a href={`mailto:${fb.userEmail}`} className="hover:underline text-blue-600">
                          {fb.userEmail}
                        </a>
                      ) : (
                        'Không có email'
                      )}{' '}
                      •{' '}
                      {new Date(fb.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={13}
                      className={
                        star <= (fb.rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }
                    />
                  ))}
                  <span className="text-xs font-bold text-amber-700 ml-1">
                    {fb.rating || 5}/5
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                {fb.message}
              </div>

              {/* Device & Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 truncate max-w-md font-mono text-[10.5px]">
                  <Monitor size={12} className="shrink-0 text-slate-400" />
                  <span className="truncate" title={fb.deviceInfo || 'Thiết bị không xác định'}>
                    {fb.deviceInfo ? fb.deviceInfo.slice(0, 60) + '...' : 'Không rõ thiết bị'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {fb.status !== 'reviewed' && (
                    <button
                      type="button"
                      disabled={actionLoadingId === fb.id}
                      onClick={() => handleUpdateStatus(fb.id, 'reviewed')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-colors"
                    >
                      Đánh dấu đã xem
                    </button>
                  )}

                  {fb.status !== 'resolved' && (
                    <button
                      type="button"
                      disabled={actionLoadingId === fb.id}
                      onClick={() => handleUpdateStatus(fb.id, 'resolved')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Check size={12} />
                      Đã giải quyết
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionLoadingId === fb.id}
                    onClick={() => handleDeleteFeedback(fb.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    title="Xóa phản hồi này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
