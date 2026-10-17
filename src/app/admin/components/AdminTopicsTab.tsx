'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Trash2, Edit2, RefreshCw, Sparkles, Filter, Search } from 'lucide-react';
import { Topic } from '@/types/vocabulary';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

export default function AdminTopicsTab() {
  const toast = useToast();
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'system' | 'user'>('all');
  const [search, setSearch] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Partial<Topic> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Topic | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/topics?scope=all', {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.topics)) {
          setTopics(data.topics);
        }
      }
    } catch (err) {
      console.error('Fetch topics error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleOpenCreate = () => {
    setEditingTopic({
      name: '',
      description: '',
      color: '#10b981',
      scope: 'system',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (topic: Topic) => {
    setEditingTopic({ ...topic });
    setIsModalOpen(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !editingTopic.name?.trim()) {
      toast.error('Vui lòng nhập tên chủ đề.');
      return;
    }

    setSaving(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const isNew = !editingTopic.id;
      const url = '/api/topics';
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(editingTopic),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(isNew ? `Đã tạo chủ đề: ${editingTopic.name}` : `Đã cập nhật chủ đề: ${editingTopic.name}`);
        setIsModalOpen(false);
        setEditingTopic(null);
        fetchTopics();
      } else {
        toast.error(data.message || 'Lỗi khi lưu chủ đề.');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu lưu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!deleteConfirm) return;
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/topics?id=${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa chủ đề ${deleteConfirm.name}. Hủy liên kết ${data.affectedWords || 0} từ vựng.`);
        fetchTopics();
      } else {
        toast.error(data.message || 'Không thể xóa chủ đề.');
      }
    } catch {
      toast.error('Lỗi khi xóa chủ đề.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filteredTopics = topics.filter((t) => {
    if (scopeFilter !== 'all' && t.scope !== scopeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return t.name.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
    }
    return true;
  });

  const PRESET_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="text-emerald-600" size={22} />
            Quản Lý Chủ Đề Học Tập (Topics)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chủ đề hệ thống dùng chung cho toàn bộ học viên và các chủ đề do từng học viên tự định nghĩa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTopics}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl shadow-xs font-semibold cursor-pointer transition-all"
          >
            <Plus size={14} />
            <span>Tạo chủ đề mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả chủ đề..."
            className="w-full text-xs border-none focus:outline-hidden text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs">
            {(['all', 'system', 'user'] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScopeFilter(sc)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  scopeFilter === sc ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {sc === 'all' ? 'Tất cả' : sc === 'system' ? 'Hệ thống' : 'Học viên'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Topics Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Đang tải danh sách chủ đề...
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="bg-white py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          Không tìm thấy chủ đề nào phù hợp. Nhấn &quot;Tạo chủ đề mới&quot; để thêm.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: topic.color || '#10b981' }}
                    />
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-[160px]">
                      {topic.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      topic.scope === 'system'
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
                        : 'bg-amber-500/10 text-amber-700 border-amber-200'
                    }`}
                  >
                    {topic.scope === 'system' ? 'Hệ thống' : 'Cá nhân'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                  {topic.description || 'Chưa có mô tả cho chủ đề này.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="text-base text-slate-900">{topic.wordCount || 0}</span>
                  <span className="text-[11px] text-slate-400 font-normal">từ vựng</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(topic)}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Chỉnh sửa chủ đề"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(topic)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Xóa chủ đề"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create / Edit */}
      {isModalOpen && editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingTopic.id ? 'Chỉnh sửa chủ đề' : 'Tạo chủ đề mới'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chủ đề giúp phân loại từ vựng thành các lĩnh vực trong cuộc sống.
            </p>

            <form onSubmit={handleSaveTopic} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên chủ đề *</label>
                <input
                  type="text"
                  required
                  value={editingTopic.name || ''}
                  onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                  placeholder="Ví dụ: Du lịch, Ẩm thực, Công nghệ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  value={editingTopic.description || ''}
                  onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                  placeholder="Mô tả phạm vi từ vựng của chủ đề này..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Màu nhận diện</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditingTopic({ ...editingTopic, color: col })}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        editingTopic.color === col ? 'scale-125 ring-2 ring-emerald-500 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editingTopic.color || '#10b981'}
                    onChange={(e) => setEditingTopic({ ...editingTopic, color: e.target.value })}
                    className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0 ml-1"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phạm vi áp dụng</label>
                <select
                  value={editingTopic.scope || 'system'}
                  onChange={(e) => setEditingTopic({ ...editingTopic, scope: e.target.value as 'system' | 'user' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden bg-white"
                >
                  <option value="system">Chủ đề chuẩn Hệ thống (Dành cho toàn bộ người dùng)</option>
                  <option value="user">Chủ đề Cá nhân</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu chủ đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal Delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100 p-6 relative">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Xác nhận xóa chủ đề</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Bạn có chắc chắn muốn xóa chủ đề <strong className="text-slate-900 font-bold">{deleteConfirm.name}</strong>?
              Các từ vựng hiện đang gắn chủ đề này sẽ được hủy liên kết an toàn mà không bị mất từ.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteTopic}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Xóa chủ đề
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
