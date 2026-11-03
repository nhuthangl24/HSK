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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Quản Trị Thư Viện Đề Thi HSK
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                {totalCount} bộ đề
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Quản lý tệp đề thi PDF, bản ghi âm MP3 nghe hiểu, đáp án mẫu và chỉ số cấp độ từ HSK 1 đến HSK 7-9 & HSKK.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchExams}
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
            <span>Thêm đề thi mới</span>
          </button>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Tổng đề thi
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-zinc-100 mt-1">
            {totalCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Đầy đủ dữ liệu học thuật
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Đề thật Hanban
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {officialCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Đề thi chính thức
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Đề thử nghiệm BLCU
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {mockCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Tuyển tập đại học Bắc Kinh
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Bản ghi Audio MP3
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {audioCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Sẵn sàng nghe trực tuyến
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đề thi, nhà xuất bản, mã đề..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Phân loại:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'official', label: 'Hanban Official' },
              { id: 'mock', label: 'BLCU Mock' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1">Cấp độ:</span>
          {['all', '1', '2', '3', '4', '5', '6', '7', 'HSKK'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                levelFilter === lvl
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60'
              }`}
            >
              {lvl === 'all' ? 'Tất cả cấp độ' : lvl === '7' ? 'HSK 7–9' : lvl === 'HSKK' ? 'Khẩu ngữ HSKK' : `HSK ${lvl}`}
            </button>
          ))}
          {filteredExams.length !== totalCount && (
            <span className="ml-auto text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Hiển thị {filteredExams.length} / {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-xs">
        {loading && exams.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-zinc-400">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-emerald-500" />
            Đang tải danh mục đề thi...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              Không tìm thấy đề thi phù hợp
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc cấp độ.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
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
                  className="p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Metadata & Title */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Level Badge */}
                      <div className="w-14 h-11 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-extrabold leading-tight uppercase">{levelLabel}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                            {e.category === 'official' ? 'Hanban Official' : 'BLCU Mock'}
                          </span>
                          {e.year && (
                            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                              Năm {e.year}
                            </span>
                          )}
                          {e.isPinned && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              <Pin size={11} />
                              Ghim
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {e.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-1 flex-wrap">
                          <span>Nguồn: {e.source || 'Hanban'}</span>
                          <span>•</span>
                          <span>{e.durationMinutes || 90} phút</span>
                          <span>•</span>
                          <span>{e.questionCount || 80} câu hỏi</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Headphones size={13} className={e.audioUrl ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                            {e.audioUrl ? 'Có Audio MP3' : 'Chưa có Audio'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {e.pdfUrl && (
                        <a
                          href={e.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl border border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Xem tệp PDF đề thi"
                        >
                          <FileText size={14} />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTogglePin(e)}
                        title={e.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          e.isPinned
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {e.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(e)}
                        title="Chỉnh sửa thông tin đề thi"
                        className="p-2 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === e.id}
                        onClick={() => handleDeleteExam(e.id)}
                        title="Xóa đề thi này"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
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

      {/* Create / Edit Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/90 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <BookOpen size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {editingExam ? 'Chỉnh Sửa Bộ Đề Thi' : 'Thêm Bộ Đề Thi Mới'}
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

            <form onSubmit={handleSaveExam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Tên bộ đề thi *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Đề Thi Thật HSK 5 Năm 2024 - Mã H51001"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Cấp độ HSK
                  </label>
                  <select
                    value={formHskLevel}
                    onChange={(e) => setFormHskLevel((isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) as ExamHskLevel)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Phân loại
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExamCategory)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="official">Đề thi thật Hanban</option>
                    <option value="mock">Đề thử nghiệm BLCU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Năm phát hành
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Thời lượng thi (phút)
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Tổng số câu hỏi
                  </label>
                  <input
                    type="number"
                    value={formQuestions}
                    onChange={(e) => setFormQuestions(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Đường dẫn tệp PDF Đề thi
                </label>
                <input
                  type="text"
                  value={formPdfUrl}
                  onChange={(e) => setFormPdfUrl(e.target.value)}
                  placeholder="/exams/pdf/hsk5_exam_2024.pdf hoặc link trực tiếp"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Đường dẫn tệp Audio MP3 Nghe hiểu
                </label>
                <input
                  type="text"
                  value={formAudioUrl}
                  onChange={(e) => setFormAudioUrl(e.target.value)}
                  placeholder="/exams/audio/hsk5_audio_2024.mp3 hoặc link trực tiếp"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Mô tả & Hướng dẫn làm bài
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ghi chú về nguồn đề, cấu trúc các phần Nghe - Đọc - Viết..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
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
                    Ghim đề thi này lên đầu danh sách học viên
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
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
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
