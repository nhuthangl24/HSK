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
  Eye,
  Download,
  Share2,
  QrCode,
  FileText,
  Volume2,
  KeyRound,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  Layers,
  GraduationCap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamItem, ExamHskLevel, ExamCategory } from '@/types/exam';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // QR Modal
  const [qrModalExam, setQrModalExam] = useState<ExamItem | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Delete Confirm Modal
  const [deletingExam, setDeletingExam] = useState<ExamItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete All Modal
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formHskLevel, setFormHskLevel] = useState<ExamHskLevel>(1);
  const [formCategory, setFormCategory] = useState<ExamCategory>('official');
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formSource, setFormSource] = useState('');
  const [formDuration, setFormDuration] = useState<number | ''>(40);
  const [formQuestions, setFormQuestions] = useState<number | ''>(40);
  const [formDescription, setFormDescription] = useState('');
  const [formPdfUrl, setFormPdfUrl] = useState('');
  const [formAudioUrl, setFormAudioUrl] = useState('');
  const [formAnswerUrl, setFormAnswerUrl] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formStatus, setFormStatus] = useState<'published' | 'draft'>('published');

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/exams?t=${Date.now()}`, {
        cache: 'no-store',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setExams(data.exams);
        }
      } else {
        toast.error('Không thể tải danh sách đề thi.');
      }
    } catch (err) {
      console.error('Fetch exams error:', err);
      toast.error('Lỗi khi tải danh sách đề thi.');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setFormTitle('');
    setFormHskLevel(1);
    setFormCategory('official');
    setFormYear(new Date().getFullYear());
    setFormSource('Biên soạn bởi HSK Master');
    setFormDuration(40);
    setFormQuestions(40);
    setFormDescription('');
    setFormPdfUrl('');
    setFormAudioUrl('');
    setFormAnswerUrl('');
    setFormIsPinned(false);
    setFormStatus('published');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (exam: ExamItem) => {
    setEditingExam(exam);
    setFormTitle(exam.title);
    setFormHskLevel(exam.hskLevel);
    setFormCategory(exam.category);
    setFormYear(exam.year || new Date().getFullYear());
    setFormSource(exam.source || '');
    setFormDuration(exam.durationMinutes || '');
    setFormQuestions(exam.questionCount || '');
    setFormDescription(exam.description || '');
    setFormPdfUrl(exam.pdfUrl || '');
    setFormAudioUrl(exam.audioUrl || '');
    setFormAnswerUrl(exam.answerUrl || '');
    setFormIsPinned(Boolean(exam.isPinned));
    setFormStatus(exam.status);
    setIsEditModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.warning('Vui lòng nhập tiêu đề bộ đề thi.');
      return;
    }

    setFormSubmitting(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const payload = {
        title: formTitle.trim(),
        hskLevel: formHskLevel,
        category: formCategory,
        year: formYear ? Number(formYear) : undefined,
        source: formSource.trim(),
        durationMinutes: formDuration ? Number(formDuration) : undefined,
        questionCount: formQuestions ? Number(formQuestions) : undefined,
        description: formDescription.trim(),
        pdfUrl: formPdfUrl.trim(),
        audioUrl: formAudioUrl.trim(),
        answerUrl: formAnswerUrl.trim(),
        isPinned: formIsPinned,
        status: formStatus,
      };

      if (editingExam) {
        // Update existing
        const res = await fetch('/api/exams', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ id: editingExam.id, ...payload }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Cập nhật đề thi thành công!');
          setIsEditModalOpen(false);
          fetchExams();
        } else {
          toast.error(data.message || 'Không thể cập nhật đề thi.');
        }
      } else {
        // Create new
        const res = await fetch('/api/exams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Tạo bộ đề thi mới thành công!');
          setIsEditModalOpen(false);
          fetchExams();
        } else {
          toast.error(data.message || 'Không thể tạo đề thi.');
        }
      }
    } catch (err) {
      console.error('Save exam error:', err);
      toast.error('Lỗi khi lưu đề thi.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTogglePinned = async (exam: ExamItem) => {
    try {
      const authHeaders = getClientAuthHeaders(user);
      const nextPinned = !exam.isPinned;
      const res = await fetch('/api/exams', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ id: exam.id, isPinned: nextPinned }),
      });
      if (res.ok) {
        toast.success(nextPinned ? 'Đã ghim đề thi lên đầu trang!' : 'Đã bỏ ghim đề thi.');
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, isPinned: nextPinned } : e))
        );
      }
    } catch {
      toast.error('Lỗi khi thay đổi trạng thái ghim.');
    }
  };

  const handleToggleStatus = async (exam: ExamItem) => {
    try {
      const authHeaders = getClientAuthHeaders(user);
      const nextStatus = exam.status === 'published' ? 'draft' : 'published';
      const res = await fetch('/api/exams', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ id: exam.id, status: nextStatus }),
      });
      if (res.ok) {
        toast.success(nextStatus === 'published' ? 'Đã công khai đề thi!' : 'Đã chuyển thành bản nháp.');
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, status: nextStatus } : e))
        );
      }
    } catch {
      toast.error('Lỗi khi thay đổi trạng thái.');
    }
  };

  const handleDeleteExam = async () => {
    if (!deletingExam) return;
    setIsDeleting(true);
    const targetId = deletingExam.id;
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch(`/api/exams?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        toast.success('Đã xóa bộ đề thi.');
        setDeletingExam(null);
        setExams((prev) => prev.filter((e) => e.id !== targetId));
        fetchExams();
      } else {
        toast.error('Không thể xóa đề thi.');
      }
    } catch {
      toast.error('Lỗi khi xóa đề thi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllExams = async () => {
    setIsDeletingAll(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/exams?all=true', {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        toast.success('Đã xóa toàn bộ đề thi thành công!');
        setExams([]);
        setIsDeleteAllModalOpen(false);
        fetchExams();
      } else {
        toast.error('Không thể xóa toàn bộ đề thi.');
      }
    } catch {
      toast.error('Lỗi khi xóa đề thi.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleResetStarterExams = async () => {
    setLoading(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'reset_starter' }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Đã nạp lại các bộ đề thi mẫu thành công!');
        if (data.exams && Array.isArray(data.exams)) {
          setExams(data.exams);
        } else {
          fetchExams();
        }
      } else {
        toast.error('Không thể nạp đề mẫu.');
      }
    } catch {
      toast.error('Lỗi khi nạp đề thi mẫu.');
    } finally {
      setLoading(false);
    }
  };

  // Open QR Share Modal
  const handleOpenQrModal = async (exam: ExamItem) => {
    setQrModalExam(exam);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?examId=${encodeURIComponent(exam.id)}`;
    try {
      const qr = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qr);
    } catch (err) {
      console.error('Generate QR error:', err);
    }
  };

  const handleCopyShareLink = (exam: ExamItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?examId=${encodeURIComponent(exam.id)}`;
    const copyText = `📚 Luyện Đề Thi HSK: ${exam.title} (HSK ${exam.hskLevel} • Kèm file nghe MP3 & Đáp án chi tiết) 👉 ${shareUrl}`;
    navigator.clipboard.writeText(copyText);
    toast.success('Đã sao chép link chia sẻ đề thi vào bộ nhớ tạm!');
  };

  // Filtered list
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (levelFilter !== 'all') {
        if (levelFilter === 'HSKK' && e.hskLevel !== 'HSKK') return false;
        if (String(e.hskLevel) !== levelFilter) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'pinned' && !e.isPinned) return false;
        if (statusFilter === 'published' && e.status !== 'published') return false;
        if (statusFilter === 'draft' && e.status !== 'draft') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchSource = (e.source || '').toLowerCase().includes(q);
        const matchDesc = (e.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSource && !matchDesc) return false;
      }
      return true;
    });
  }, [exams, levelFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const total = exams.length;
    const published = exams.filter((e) => e.status === 'published').length;
    const drafts = exams.filter((e) => e.status === 'draft').length;
    const views = exams.reduce((acc, cur) => acc + (cur.viewsCount || 0), 0);
    const downloads = exams.reduce((acc, cur) => acc + (cur.downloadsCount || 0), 0);
    return { total, published, drafts, views, downloads };
  }, [exams]);

  const getHskBadge = (level: ExamHskLevel) => {
    switch (level) {
      case 1:
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 2:
        return 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
      case 3:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 4:
        return 'bg-pink-100 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-800';
      case 5:
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 6:
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'HSKK':
      default:
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="text-emerald-600 dark:text-emerald-400" size={24} />
            <span>Kho Đề Thi HSK Tuyển Chọn & Chia Sẻ</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Admin tuyển chọn, biên soạn các bộ đề thi HSK 1 - 6 chính thức kèm file Nghe MP3 & Đáp án, chia sẻ link cho toàn bộ học viên.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={fetchExams}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {exams.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press"
              title="Xóa toàn bộ đề thi hiện có trong kho"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Xóa tất cả ({exams.length})</span>
            </button>
          )}

          {exams.length === 0 && (
            <button
              type="button"
              onClick={handleResetStarterExams}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold cursor-pointer transition-all btn-press"
              title="Nạp lại 6 bộ đề thi HSK chuẩn mẫu ban đầu"
            >
              <Sparkles size={15} className="text-amber-500" />
              <span>Nạp lại 6 đề mẫu</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all btn-press"
          >
            <Plus size={16} />
            <span>Thêm Bộ Đề Thi Mới</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">TỔNG BỘ ĐỀ</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">ĐÃ CÔNG KHAI</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.published}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400">BẢN NHÁP</div>
          <div className="text-xl font-black text-slate-500 mt-0.5">{stats.drafts}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">LƯỢT XEM ĐỀ</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{stats.views}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">LƯỢT TẢI VỀ</div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.downloads}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên đề thi, nguồn đề, năm phát hành..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">Tất cả cấp độ</option>
            <option value="1">HSK 1</option>
            <option value="2">HSK 2</option>
            <option value="3">HSK 3</option>
            <option value="4">HSK 4</option>
            <option value="5">HSK 5</option>
            <option value="6">HSK 6</option>
            <option value="HSKK">HSKK</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pinned">Đang ghim đầu trang</option>
            <option value="published">Đã công khai</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
      </div>

      {/* Exams List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        {loading && exams.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs">Đang tải kho đề thi...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BookOpen size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy bộ đề thi nào.</p>
            <p className="text-xs text-slate-400 mt-1">Bấm nút "Thêm Bộ Đề Thi Mới" ở trên để đưa tài liệu lên kho.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className={`p-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  exam.isPinned ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                }`}
              >
                {/* Left: Info & Badges */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* HSK Level */}
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${getHskBadge(
                        exam.hskLevel
                      )}`}
                    >
                      HSK {exam.hskLevel}
                    </span>

                    {/* Category */}
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {exam.category === 'official' ? 'Đề thi thật' : exam.category === 'mock' ? 'Đề thi thử' : 'Chuyên đề'}
                    </span>

                    {/* Status */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(exam)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                        exam.status === 'published'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                      title="Bấm để bật/tắt trạng thái công khai"
                    >
                      {exam.status === 'published' ? '● Công khai' : '○ Bản nháp'}
                    </button>

                    {/* Pinned Indicator */}
                    <button
                      type="button"
                      onClick={() => handleTogglePinned(exam)}
                      className={`p-1 rounded-lg cursor-pointer transition-colors ${
                        exam.isPinned
                          ? 'text-amber-500 bg-amber-100 dark:bg-amber-950/60'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={exam.isPinned ? 'Đang ghim đầu trang (Bấm để bỏ ghim)' : 'Bấm để ghim đề lên đầu'}
                    >
                      <Pin size={13} className={exam.isPinned ? 'fill-amber-500' : ''} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {exam.title}
                  </h3>

                  {/* Meta: Duration, Questions, Source, Year */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {exam.durationMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{exam.durationMinutes} phút</span>
                      </span>
                    )}
                    {exam.questionCount && (
                      <span>• {exam.questionCount} câu</span>
                    )}
                    {exam.source && (
                      <span>• Nguồn: <strong className="text-slate-700 dark:text-slate-300 font-medium">{exam.source}</strong></span>
                    )}
                    {exam.year && (
                      <span>({exam.year})</span>
                    )}
                  </div>

                  {/* Resource Badges (PDF, Audio, Answer) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {exam.pdfUrl ? (
                      <a
                        href={exam.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/40 hover:underline"
                      >
                        <FileText size={12} />
                        <span>File Đề PDF</span>
                      </a>
                    ) : (
                      <span className="text-[10.5px] text-slate-400 italic">Chưa có PDF</span>
                    )}

                    {exam.audioUrl ? (
                      <a
                        href={exam.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/40 hover:underline"
                      >
                        <Volume2 size={12} />
                        <span>File Nghe MP3</span>
                      </a>
                    ) : (
                      <span className="text-[10.5px] text-slate-400 italic">Không có Audio</span>
                    )}

                    {exam.answerUrl && (
                      <a
                        href={exam.answerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40 hover:underline"
                      >
                        <KeyRound size={12} />
                        <span>File Đáp án</span>
                      </a>
                    )}

                    <span className="text-[11px] text-slate-400 ml-2">
                      👁️ {exam.viewsCount || 0} xem • 📥 {exam.downloadsCount || 0} tải
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  {/* Share QR */}
                  <button
                    type="button"
                    onClick={() => handleOpenQrModal(exam)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Mã QR chia sẻ đề thi"
                  >
                    <QrCode size={16} />
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(exam)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Sao chép link chia sẻ"
                  >
                    <Share2 size={16} />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(exam)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Chỉnh sửa bộ đề"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setDeletingExam(exam)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                    title="Xóa đề thi"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT EXAM MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingExam ? 'Chỉnh Sửa Bộ Đề Thi' : 'Thêm Bộ Đề Thi Mới'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Nhập thông tin đề thi HSK, đính kèm link PDF đề bài, file nghe audio & đáp án.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề đề thi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Đề thi thật HSK 4 — Tháng 12/2023 (Mã đề H41001)"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* HSK Level & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cấp độ HSK
                  </label>
                  <select
                    value={formHskLevel}
                    onChange={(e) => setFormHskLevel((e.target.value === 'HSKK' ? 'HSKK' : Number(e.target.value)) as ExamHskLevel)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value={1}>HSK 1</option>
                    <option value={2}>HSK 2</option>
                    <option value={3}>HSK 3</option>
                    <option value={4}>HSK 4</option>
                    <option value={5}>HSK 5</option>
                    <option value={6}>HSK 6</option>
                    <option value="HSKK">HSKK (Thi Khẩu ngữ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dạng đề
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExamCategory)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="official">Đề thi thật chính thức (Official)</option>
                    <option value="mock">Đề thi thử / Mô phỏng chuẩn (Mock)</option>
                    <option value="listening">Chuyên đề Nghe hiểu (Tingli)</option>
                    <option value="reading">Chuyên đề Đọc hiểu (Yuedu)</option>
                    <option value="writing">Chuyên đề Viết (Xiezuo)</option>
                  </select>
                </div>
              </div>

              {/* Source & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nguồn gốc / Cơ quan ra đề
                  </label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="Ví dụ: Hanban / BLCU Bắc Kinh"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Năm phát hành
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Duration & Questions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thời gian làm bài chuẩn (Phút)
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ví dụ: 105"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng câu hỏi
                  </label>
                  <input
                    type="number"
                    value={formQuestions}
                    onChange={(e) => setFormQuestions(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ví dụ: 100"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* PDF URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <FileText size={13} className="text-rose-500" />
                  <span>Link File Đề thi (PDF / Drive)</span>
                </label>
                <input
                  type="url"
                  value={formPdfUrl}
                  onChange={(e) => setFormPdfUrl(e.target.value)}
                  placeholder="https://... hoặc link Google Drive, OneDrive"
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Audio MP3 URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Volume2 size={13} className="text-blue-500" />
                  <span>Link File Nghe Audio MP3 (Cho phép nghe trực tiếp trên web)</span>
                </label>
                <input
                  type="url"
                  value={formAudioUrl}
                  onChange={(e) => setFormAudioUrl(e.target.value)}
                  placeholder="https://.../audio.mp3 (link trực tiếp file âm thanh)"
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Answer Key URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <KeyRound size={13} className="text-emerald-500" />
                  <span>Link File Đáp án & Tapescript giải thích</span>
                </label>
                <input
                  type="url"
                  value={formAnswerUrl}
                  onChange={(e) => setFormAnswerUrl(e.target.value)}
                  placeholder="https://.../dapan.pdf hoặc link tài liệu lời giải"
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Description & Tips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả ngắn & Lời dặn của Admin
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Gợi ý mẹo làm bài, lưu ý phần bẫy ngữ pháp hoặc từ vựng trọng tâm..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Toggles: Pinned & Status */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Ghim bộ đề này lên đầu trang</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formStatus === 'published'}
                    onChange={(e) => setFormStatus(e.target.checked ? 'published' : 'draft')}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Công khai cho học viên xem</span>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 btn-press"
                >
                  {formSubmitting ? 'Đang lưu...' : editingExam ? 'Lưu Thay Đổi' : 'Thêm Vào Kho Đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE SHARE MODAL */}
      {qrModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode size={18} className="text-emerald-600" />
                <span>Mã QR Chia Sẻ Đề Thi</span>
              </h3>
              <button
                type="button"
                onClick={() => setQrModalExam(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 mb-3">
              {qrModalExam.title}
            </p>

            {/* QR Code Canvas / Image */}
            {qrCodeDataUrl ? (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeDataUrl} alt="Mã QR Đề Thi" className="w-56 h-56 mx-auto rounded-lg" />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-2xl mx-auto mb-4">
                <RefreshCw size={24} className="animate-spin text-slate-400" />
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Quét bằng Camera điện thoại hoặc Zalo để mở đề thi, nghe audio và tải PDF ngay lập tức.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyShareLink(qrModalExam)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <Copy size={13} />
                <span>Sao chép link</span>
              </button>

              {qrCodeDataUrl && (
                <a
                  href={qrCodeDataUrl}
                  download={`HSK_Exam_${qrModalExam.id}.png`}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download size={13} />
                  <span>Lưu ảnh QR</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Xác nhận xóa bộ đề thi?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
              "{deletingExam.title}" sẽ bị xóa vĩnh viễn khỏi kho đề thi của hệ thống.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingExam(null)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteExam}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa Đề Thi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL CONFIRM MODAL */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Xác nhận xóa TẤT CẢ đề thi?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Toàn bộ <strong className="text-rose-600 font-bold">{exams.length} bộ đề thi</strong> hiện có sẽ bị xóa sạch khỏi kho đề. Hệ thống sẽ để trống kho và không tự động nạp lại dữ liệu giả nữa.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={handleDeleteAllExams}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeletingAll ? 'Đang xóa...' : 'Xác nhận xóa hết'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
