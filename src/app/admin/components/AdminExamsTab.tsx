'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Pin,
  PinOff,
  Headphones,
  FileText,
  Clock,
  Layers,
  Award,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  Download,
} from 'lucide-react';
import { ExamItem, ExamCategory, ExamHskLevel } from '@/types/exam';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

export default function AdminExamsTab() {
  const toast = useToast();
  const { user } = useAuth();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formHskLevel, setFormHskLevel] = useState<ExamHskLevel>(1);
  const [formCategory, setFormCategory] = useState<ExamCategory>('official');
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formSource, setFormSource] = useState('Đề thi chuẩn Hanban');
  const [formDuration, setFormDuration] = useState<number>(90);
  const [formQuestions, setFormQuestions] = useState<number>(85);
  const [formPdfUrl, setFormPdfUrl] = useState('');
  const [formAudioUrl, setFormAudioUrl] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/exams?t=${Date.now()}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setExams(data.exams);
        }
      }
    } catch (err) {
      console.warn('Exams fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleOpenCreate = () => {
    setEditingExam(null);
    setFormTitle('');
    setFormHskLevel(3);
    setFormCategory('official');
    setFormYear(new Date().getFullYear());
    setFormSource('Hanban Official');
    setFormDuration(90);
    setFormQuestions(80);
    setFormPdfUrl('');
    setFormAudioUrl('');
    setFormDesc('');
    setFormIsPinned(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam: ExamItem) => {
    setEditingExam(exam);
    setFormTitle(exam.title);
    setFormHskLevel(exam.hskLevel);
    setFormCategory(exam.category);
    setFormYear(exam.year || new Date().getFullYear());
    setFormSource(exam.source || 'Hanban');
    setFormDuration(exam.durationMinutes || 90);
    setFormQuestions(exam.questionCount || 80);
    setFormPdfUrl(exam.pdfUrl || '');
    setFormAudioUrl(exam.audioUrl || '');
    setFormDesc(exam.description || '');
    setFormIsPinned(Boolean(exam.isPinned));
    setIsModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.warning('Vui lòng nhập tên đề thi');
      return;
    }

    setFormSubmitting(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const payload: Partial<ExamItem> = {
        title: formTitle.trim(),
        hskLevel: formHskLevel,
        category: formCategory,
        year: formYear,
        source: formSource.trim(),
        durationMinutes: formDuration,
        questionCount: formQuestions,
        pdfUrl: formPdfUrl.trim() || undefined,
        audioUrl: formAudioUrl.trim() || undefined,
        description: formDesc.trim() || undefined,
        isPinned: formIsPinned,
      };

      if (editingExam) {
        const res = await fetch('/api/exams', {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ id: editingExam.id, ...payload }),
        });
        if (res.ok) {
          toast.success('Đã cập nhật bộ đề thi thành công');
          setIsModalOpen(false);
          fetchExams();
        } else {
          toast.error('Cập nhật đề thi thất bại');
        }
      } else {
        const res = await fetch('/api/exams', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success('Đã thêm đề thi mới vào thư viện');
          setIsModalOpen(false);
          fetchExams();
        } else {
          toast.error('Không thể tạo đề thi mới');
        }
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu đề thi');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTogglePin = async (exam: ExamItem) => {
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/exams', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          id: exam.id,
          isPinned: !exam.isPinned,
        }),
      });
      if (res.ok) {
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, isPinned: !e.isPinned } : e))
        );
        toast.success(exam.isPinned ? 'Đã bỏ ghim đề thi' : 'Đã ghim đề thi lên đầu');
      }
    } catch {
      toast.error('Lỗi khi thay đổi trạng thái ghim');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bộ đề này khỏi Thư viện?')) return;
    setDeletingId(id);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/exams?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setExams((prev) => prev.filter((e) => e.id !== id));
        toast.success('Đã xóa bộ đề thi thành công');
      } else {
        toast.error('Xóa bộ đề thi thất bại');
      }
    } catch {
      toast.error('Lỗi kết nối khi xóa đề thi');
    } finally {
      setDeletingId(null);
    }
  };

  // KPIs
  const totalCount = exams.length;
  const officialCount = useMemo(() => exams.filter((e) => e.category === 'official').length, [exams]);
  const mockCount = useMemo(() => exams.filter((e) => e.category === 'mock').length, [exams]);
  const audioCount = useMemo(() => exams.filter((e) => Boolean(e.audioUrl)).length, [exams]);

  // Filtering
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (levelFilter !== 'all' && String(e.hskLevel) !== levelFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const t = e.title.toLowerCase();
        const s = (e.source || '').toLowerCase();
        if (!t.includes(q) && !s.includes(q)) return false;
      }
      return true;
    });
  }, [exams, levelFilter, categoryFilter, search]);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#e2e8f0] dark:border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0f172a] dark:text-white">
              Quản Trị Thư Viện Đề Thi HSK
            </h1>
            <span className="px-2 py-0.5 text-[10.5px] font-bold text-[#047857] dark:text-[#34d399] bg-[#ecfdf5] dark:bg-[#064e3b]/40 rounded border border-[#a7f3d0] dark:border-[#065f46]">
              {totalCount} bộ đề
            </span>
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
            Quản lý tệp đề thi PDF, bản ghi âm MP3 nghe hiểu, đáp án mẫu và chỉ số cấp độ từ HSK 1 đến HSK 7-9 & HSKK.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchExams}
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
            <span>Thêm đề thi mới</span>
          </button>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="text-[10.5px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
            Tổng đề thi
          </div>
          <div className="text-xl font-black text-[#0f172a] dark:text-white mt-1">
            {totalCount}
          </div>
          <div className="text-[10px] text-[#94a3b8] dark:text-[#64748b] mt-0.5">
            Đầy đủ dữ liệu học thuật
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="text-[10.5px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
            Đề thật Hanban
          </div>
          <div className="text-xl font-black text-[#047857] dark:text-[#34d399] mt-1">
            {officialCount}
          </div>
          <div className="text-[10px] text-[#94a3b8] dark:text-[#64748b] mt-0.5">
            Đề thi chính thức
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="text-[10.5px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
            Đề thử nghiệm BLCU
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {mockCount}
          </div>
          <div className="text-[10px] text-[#94a3b8] dark:text-[#64748b] mt-0.5">
            Tuyển tập đại học Bắc Kinh
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="text-[10.5px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
            Bản ghi Audio MP3
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {audioCount}
          </div>
          <div className="text-[10px] text-[#94a3b8] dark:text-[#64748b] mt-0.5">
            Sẵn sàng nghe trực tuyến
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đề thi, nhà xuất bản, mã đề..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg placeholder-[#94a3b8] focus:outline-hidden focus:border-[#047857]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8]">Phân loại:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'official', label: 'Hanban Official' },
              { id: 'mock', label: 'BLCU Mock' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-[#047857] text-white'
                    : 'bg-[#f1f5f9] dark:bg-[#1e293b] text-[#475569] dark:text-[#94a3b8] hover:bg-[#e2e8f0] dark:hover:bg-[#334155]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#f1f5f9] dark:border-[#1e293b]/80 text-xs">
          <span className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mr-1">Cấp độ:</span>
          {['all', '1', '2', '3', '4', '5', '6', '7', 'HSKK'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                levelFilter === lvl
                  ? 'bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a] font-semibold'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b]'
              }`}
            >
              {lvl === 'all' ? 'Tất cả cấp độ' : lvl === '7' ? 'HSK 7–9' : lvl === 'HSKK' ? 'Khẩu ngữ HSKK' : `HSK ${lvl}`}
            </button>
          ))}
          {filteredExams.length !== totalCount && (
            <span className="ml-auto text-[11px] text-[#64748b] dark:text-[#94a3b8]">
              Hiển thị {filteredExams.length} / {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] overflow-hidden">
        {loading && exams.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748b] dark:text-[#94a3b8]">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[#047857]" />
            Đang tải danh mục đề thi...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen size={32} className="mx-auto text-[#cbd5e1] dark:text-[#334155] mb-2" />
            <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
              Không tìm thấy đề thi phù hợp
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 max-w-sm mx-auto">
              Thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc cấp độ.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9] dark:divide-[#1e293b]">
            {filteredExams.map((e) => {
              const levelLabel =
                e.hskLevel === 'HSKK'
                  ? 'HSKK'
                  : typeof e.hskLevel === 'number' && e.hskLevel >= 7
                  ? 'HSK 7–9'
                  : `HSK ${e.hskLevel}`;

              return (
                <div
                  key={e.id}
                  className="p-3.5 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#131c2e]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Metadata & Title */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Level Badge */}
                      <div className="w-12 h-10 rounded-lg bg-[#047857]/10 dark:bg-[#064e3b]/30 text-[#047857] dark:text-[#34d399] border border-[#a7f3d0] dark:border-[#065f46] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold leading-tight uppercase">{levelLabel}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[10.5px] font-semibold text-[#047857] dark:text-[#34d399] bg-[#ecfdf5] dark:bg-[#064e3b]/30 px-1.5 py-0.2 rounded border border-[#a7f3d0] dark:border-[#065f46]">
                            {e.category === 'official' ? 'Hanban Official' : 'BLCU Mock'}
                          </span>
                          {e.year && (
                            <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] font-mono">
                              Năm {e.year}
                            </span>
                          )}
                          {e.isPinned && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                              <Pin size={9} />
                              Ghim
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs font-bold text-[#0f172a] dark:text-white truncate">
                          {e.title}
                        </h3>

                        <div className="flex items-center gap-3 text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1 flex-wrap">
                          <span>Nguồn: {e.source || 'Hanban'}</span>
                          <span>•</span>
                          <span>{e.durationMinutes || 90} phút</span>
                          <span>•</span>
                          <span>{e.questionCount || 80} câu hỏi</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Headphones size={11} className={e.audioUrl ? 'text-[#047857]' : 'text-slate-400'} />
                            {e.audioUrl ? 'Có Audio MP3' : 'Chưa có Audio'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {e.pdfUrl && (
                        <a
                          href={e.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-[#64748b] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#1e293b]"
                          title="Xem tệp PDF đề thi"
                        >
                          <FileText size={13} />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTogglePin(e)}
                        title={e.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          e.isPinned
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] text-[#64748b] hover:text-[#0f172a] dark:hover:text-white'
                        }`}
                      >
                        {e.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(e)}
                        title="Chỉnh sửa thông tin đề thi"
                        className="p-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#64748b] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === e.id}
                        onClick={() => handleDeleteExam(e.id)}
                        title="Xóa đề thi này"
                        className="p-1.5 rounded-lg text-[#94a3b8] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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

      {/* Create / Edit Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#e2e8f0] dark:border-[#1e293b] max-w-xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-[#1e293b]">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#047857]" />
                <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
                  {editingExam ? 'Chỉnh Sửa Bộ Đề Thi' : 'Thêm Bộ Đề Thi Mới'}
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

            <form onSubmit={handleSaveExam} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                  Tên bộ đề thi *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Đề Thi Thật HSK 5 Năm 2024 - Mã H51001"
                  className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Cấp độ HSK
                  </label>
                  <select
                    value={formHskLevel}
                    onChange={(e) => setFormHskLevel((isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) as ExamHskLevel)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl === 7 ? 'HSK 7–9' : `HSK ${lvl}`}
                      </option>
                    ))}
                    <option value="HSKK">Khẩu ngữ HSKK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Phân loại
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExamCategory)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  >
                    <option value="official">Đề thi thật Hanban</option>
                    <option value="mock">Đề thử nghiệm BLCU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Năm phát hành
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Thời lượng thi (phút)
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                    Tổng số câu hỏi
                  </label>
                  <input
                    type="number"
                    value={formQuestions}
                    onChange={(e) => setFormQuestions(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                  Đường dẫn tệp PDF Đề thi
                </label>
                <input
                  type="text"
                  value={formPdfUrl}
                  onChange={(e) => setFormPdfUrl(e.target.value)}
                  placeholder="/exams/pdf/hsk5_exam_2024.pdf hoặc link trực tiếp"
                  className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                  Đường dẫn tệp Audio MP3 Nghe hiểu
                </label>
                <input
                  type="text"
                  value={formAudioUrl}
                  onChange={(e) => setFormAudioUrl(e.target.value)}
                  placeholder="/exams/audio/hsk5_audio_2024.mp3 hoặc link trực tiếp"
                  className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                  Mô tả & Hướng dẫn làm bài
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ghi chú về nguồn đề, cấu trúc các phần Nghe - Đọc - Viết..."
                  className="w-full px-3 py-2 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
                />
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
                    Ghim đề thi này lên đầu danh sách học viên
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
                  {formSubmitting ? 'Đang lưu...' : editingExam ? 'Cập nhật đề thi' : 'Thêm vào thư viện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
