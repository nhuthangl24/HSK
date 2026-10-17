'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Trash2, BookOpen, Sparkles, Filter, RefreshCw, CheckCircle2 } from 'lucide-react';
import { CustomHskGroup, VocabItem, HskLevel } from '@/types/vocabulary';
import { AdminStats } from '@/types/auth';
import { useToast } from '@/context/ToastContext';

interface AdminHskTabProps {
  stats: AdminStats | null;
  vocabList: VocabItem[];
  onSelectHskLevel: (level: number) => void;
}

export default function AdminHskTab({ stats, vocabList, onSelectHskLevel }: AdminHskTabProps) {
  const toast = useToast();
  const [customGroups, setCustomGroups] = useState<CustomHskGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterHsk, setFilterHsk] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLevel, setNewGroupLevel] = useState<number>(1);
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Compute exact system count per level from vocabList
  const levelCounts: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };
  vocabList.forEach((w) => {
    if (w.hskLevel && levelCounts[w.hskLevel] !== undefined) {
      levelCounts[w.hskLevel]++;
    }
  });

  const fetchCustomGroups = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hsk_auth_token') || '' : '';
      const res = await fetch('/api/custom-hsk?scope=all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.groups)) {
          setCustomGroups(data.groups);
        }
      }
    } catch (err) {
      console.error('Fetch custom HSK groups error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomGroups();
  }, [fetchCustomGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm học.');
      return;
    }
    setCreating(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hsk_auth_token') || '' : '';
      const res = await fetch('/api/custom-hsk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          levelNumber: newGroupLevel,
          description: newGroupDesc.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tạo nhóm HSK tùy chỉnh: ${newGroupName}`);
        setIsCreateModalOpen(false);
        setNewGroupName('');
        setNewGroupDesc('');
        fetchCustomGroups();
      } else {
        toast.error(data.message || 'Không thể tạo nhóm.');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu tạo nhóm.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa nhóm "${name}"? Các từ thuộc nhóm này sẽ không còn liên kết.`)) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hsk_auth_token') || '' : '';
      const res = await fetch(`/api/custom-hsk?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa nhóm ${name}`);
        fetchCustomGroups();
      } else {
        toast.error(data.message || 'Không thể xóa nhóm.');
      }
    } catch {
      toast.error('Lỗi khi xóa nhóm.');
    }
  };

  const HSK_LEVEL_META = [
    { level: 1, title: 'HSK 1 (Sơ cấp 1)', color: 'from-blue-500 to-indigo-600', badge: 'bg-blue-500/10 text-blue-700 border-blue-200' },
    { level: 2, title: 'HSK 2 (Sơ cấp 2)', color: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
    { level: 3, title: 'HSK 3 (Trung cấp 1)', color: 'from-amber-500 to-yellow-600', badge: 'bg-amber-500/10 text-amber-700 border-amber-200' },
    { level: 4, title: 'HSK 4 (Trung cấp 2)', color: 'from-orange-500 to-red-500', badge: 'bg-orange-500/10 text-orange-700 border-orange-200' },
    { level: 5, title: 'HSK 5 (Cao cấp 1)', color: 'from-rose-500 to-pink-600', badge: 'bg-rose-500/10 text-rose-700 border-rose-200' },
    { level: 6, title: 'HSK 6 (Cao cấp 2)', color: 'from-purple-500 to-violet-600', badge: 'bg-purple-500/10 text-purple-700 border-purple-200' },
    { level: 7, title: 'HSK 7 (Chuyên sâu)', color: 'from-indigo-600 to-slate-800', badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
    { level: 8, title: 'HSK 8 (Nâng cao)', color: 'from-slate-700 to-slate-900', badge: 'bg-slate-500/10 text-slate-700 border-slate-200' },
    { level: 9, title: 'HSK 9 (Bậc thầy)', color: 'from-amber-600 to-red-800', badge: 'bg-red-500/10 text-red-700 border-red-200' },
  ];

  const filteredCustom = customGroups.filter((g) => {
    if (filterHsk === 'all') return true;
    return g.levelNumber === Number(filterHsk);
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="text-emerald-600" size={22} />
            Quản Lý Cấp Độ HSK & Nhóm Học Tùy Chỉnh
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Phân định rõ ràng giữa cấp độ chuẩn HSK 3.0 của hệ thống và các nhóm học do người dùng tự tạo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCustomGroups}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl shadow-xs font-semibold cursor-pointer transition-all"
          >
            <Plus size={14} />
            <span>Tạo nhóm HSK mới</span>
          </button>
        </div>
      </div>

      {/* Section 1: HSK System Levels 1 - 9 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            9 Cấp Độ Chuẩn HSK 3.0 Của Hệ Thống
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng {vocabList.length.toLocaleString()} từ chuẩn
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HSK_LEVEL_META.map((meta) => {
            const count = levelCounts[meta.level] || 0;
            const percentage = vocabList.length > 0 ? Math.round((count / vocabList.length) * 100) : 0;
            return (
              <div
                key={meta.level}
                onClick={() => onSelectHskLevel(meta.level)}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                    HSK {meta.level}
                  </span>
                  <BookOpen size={15} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {meta.title}
                  </h4>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-slate-900">{count.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 font-medium">từ vựng</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Chiếm {percentage}% kho từ</span>
                  <span className="text-emerald-700 font-bold group-hover:underline">
                    Xem danh sách →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Custom HSK Groups */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Nhóm Cấp Độ HSK Tùy Chỉnh (Do Người Dùng Tạo)</h3>
              <p className="text-xs text-slate-500">
                Dữ liệu thuộc sở hữu riêng của học viên, độc lập với từ vựng hệ thống.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filterHsk}
              onChange={(e) => setFilterHsk(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700"
            >
              <option value="all">Tất cả cấp độ</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                <option key={lvl} value={lvl}>Cấp HSK {lvl}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tải danh sách nhóm học tùy chỉnh...
          </div>
        ) : filteredCustom.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Chưa có nhóm HSK tùy chỉnh nào. Học viên có thể tạo nhóm riêng từ trang cá nhân hoặc bạn có thể tạo nhóm mới ngay bên trên.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Tên nhóm</th>
                  <th className="py-2.5 px-3">Cấp HSK cơ sở</th>
                  <th className="py-2.5 px-3">Mô tả</th>
                  <th className="py-2.5 px-3">Mã chủ sở hữu (Owner)</th>
                  <th className="py-2.5 px-3 text-center">Số từ</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustom.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color || '#f59e0b' }} />
                      {group.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        HSK {group.levelNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {group.description || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px] truncate max-w-[140px]">
                      {group.ownerId}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {group.wordCount || 0}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa nhóm học"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create Group */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tạo nhóm cấp độ HSK tùy chỉnh</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tạo nhóm học mới cho hệ thống hoặc học viên.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên nhóm *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ví dụ: Ôn thi HSK 3 cấp tốc, Từ vựng chuyên ngành..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cấp độ HSK tương ứng</label>
                <select
                  value={newGroupLevel}
                  onChange={(e) => setNewGroupLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                    <option key={lvl} value={lvl}>HSK {lvl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả nhóm</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Mục tiêu bài học, ghi chú thêm..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
