'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Tag,
  Calendar,
  UserCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
  Database,
  FileCheck,
  X,
  Eye,
  Code,
} from 'lucide-react';
import { AdminGuide } from '@/types/auth';
import { useToast } from '@/context/ToastContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  'getting-started': { label: 'Bắt đầu & Tổng quan', icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  'user-management': { label: 'Quản lý người dùng', icon: UserCheck, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
  'content': { label: 'Từ vựng & Nội dung HSK', icon: Layers, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  'exams': { label: 'Thư viện Đề thi', icon: FileCheck, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  'operations': { label: 'Hạ tầng & Vận hành', icon: Database, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' },
  'security': { label: 'Bảo mật & Kiểm toán', icon: Shield, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
  'general': { label: 'Chung & Tiện ích', icon: FileText, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/40' },
};

export default function AdminGuidesTab() {
  const toast = useToast();

  const [guides, setGuides] = useState<AdminGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);

  // Edit / Create Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Partial<AdminGuide> | null>(null);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [savingGuide, setSavingGuide] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  const fetchGuides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/guides', {
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.guides)) {
        setGuides(data.guides);
        if (data.guides.length > 0) {
          setActiveGuideId((prev) => prev || data.guides[0].id);
        }
      }
    } catch {
      console.warn('Guides fetch warning');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  const filteredGuides = useMemo(() => {
    return guides.filter((g) => {
      const matchCat = selectedCategory === 'all' || g.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        g.title.toLowerCase().includes(q) ||
        (g.summary && g.summary.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        g.content.toLowerCase().includes(q) ||
        (g.tags && g.tags.some((t: string) => t.toLowerCase().includes(q)));
      return matchCat && matchSearch;
    });
  }, [guides, selectedCategory, searchQuery]);

  const activeGuide = useMemo(() => {
    return guides.find((g) => g.id === activeGuideId) || filteredGuides[0] || null;
  }, [guides, activeGuideId, filteredGuides]);

  const handleCopyMarkdown = () => {
    if (!activeGuide) return;
    navigator.clipboard.writeText(activeGuide.content);
    setCopied(true);
    toast.success('Đã sao chép nội dung tài liệu!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenCreate = () => {
    setEditingGuide({
      title: '',
      slug: '',
      category: 'general',
      summary: '',
      content: '## Giới thiệu\n\nNội dung hướng dẫn chi tiết tại đây...\n',
      tags: ['hsk', 'huong-dan'],
      order: guides.length + 1,
    });
    setEditorTab('write');
    setEditorOpen(true);
  };

  const handleOpenEdit = (guide: AdminGuide) => {
    setEditingGuide({ ...guide });
    setEditorTab('write');
    setEditorOpen(true);
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuide?.title || !editingGuide?.slug || !editingGuide?.content) {
      toast.error('Vui lòng điền đầy đủ tiêu đề, slug và nội dung.');
      return;
    }

    setSavingGuide(true);
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify(editingGuide),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Lưu tài liệu thành công!');
        setEditorOpen(false);
        setEditingGuide(null);
        await fetchGuides();
        if (data.guide?.id) {
          setActiveGuideId(data.guide.id);
        }
      } else {
        toast.error(data.message || 'Lỗi khi lưu tài liệu.');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối đến máy chủ.');
    } finally {
      setSavingGuide(false);
    }
  };

  const handleDeleteGuide = async (guide: AdminGuide) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài liệu "${guide.title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/guides?id=${guide.id}`, {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã xóa tài liệu.');
        await fetchGuides();
      } else {
        toast.error(data.message || 'Lỗi xóa tài liệu.');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối đến máy chủ.');
    }
  };

  const handleResetStarterGuides = async () => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn KHÔI PHỤC toàn bộ 12 tài liệu quản trị tiêu chuẩn của HSK Exam Suite?\nThao tác này sẽ ghi đè và cập nhật các tài liệu chuẩn.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/guides?reset=true', {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Đã khôi phục 12 tài liệu chuẩn.');
        await fetchGuides();
      } else {
        toast.error(data.message || 'Lỗi khôi phục tài liệu.');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối đến máy chủ.');
    }
  };

  // Markdown text renderer with support for images, headers, lists, code, and bold
  const renderFormattedText = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3 font-sans text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Image rendering ![alt](url)
          const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
          if (imgMatch) {
            return (
              <div key={idx} className="my-5 rounded-xl overflow-hidden border border-[#e2e8f0] dark:border-[#1e293b] shadow-xs bg-slate-50 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto object-contain max-h-[500px]" />
                {imgMatch[1] && (
                  <div className="px-3.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border-t border-[#e2e8f0] dark:border-[#1e293b] text-center font-medium">
                    📸 {imgMatch[1]}
                  </div>
                )}
              </div>
            );
          }

          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-2xl font-bold text-slate-900 dark:text-white pt-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                {renderFormattedText(line.replace('# ', ''))}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-xl font-bold text-slate-900 dark:text-white pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/60">
                {renderFormattedText(line.replace('## ', ''))}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-semibold text-slate-900 dark:text-white pt-2">
                {renderFormattedText(line.replace('### ', ''))}
              </h3>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <span>{renderFormattedText(line.replace('- ', ''))}</span>
              </div>
            );
          }
          if (line.startsWith('|')) {
            return (
              <div key={idx} className="font-mono text-xs overflow-x-auto py-1 px-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
                {line}
              </div>
            );
          }
          if (trimmed === '---') {
            return <hr key={idx} className="my-4 border-slate-200 dark:border-slate-800" />;
          }
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }
          return <p key={idx} className="text-slate-700 dark:text-slate-300">{renderFormattedText(line)}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Trung tâm Tài liệu & Hướng dẫn Quản trị (Admin Handbook)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                12 tài liệu thực chiến chuẩn hóa toàn bộ quy trình vận hành, quản trị người dùng, nội dung HSK, đề thi và bảo mật.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetStarterGuides}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Khôi phục 12 hướng dẫn chuẩn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục chuẩn
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm tài liệu mới
          </button>
        </div>
      </div>

      {/* Main 2-Column Documentation Reader Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Categories & Guide List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu, từ khóa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Tất cả ({guides.length})
            </button>
            {Object.entries(CATEGORY_MAP).map(([key, item]) => {
              const count = guides.filter((g) => g.category === key).length;
              if (count === 0 && selectedCategory !== key) return null;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                    selectedCategory === key
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Guide Items List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800 max-h-[640px] overflow-y-auto">
            {filteredGuides.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không tìm thấy tài liệu phù hợp.
              </div>
            ) : (
              filteredGuides.map((guide) => {
                const isActive = activeGuide?.id === guide.id;
                const cat = CATEGORY_MAP[guide.category] || CATEGORY_MAP.general;
                const CatIcon = cat.icon;

                return (
                  <button
                    key={guide.id}
                    onClick={() => setActiveGuideId(guide.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      isActive
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${cat.color}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-slate-400">#{guide.order}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(guide.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <h4
                        className={`text-xs font-semibold truncate ${
                          isActive
                            ? 'text-emerald-900 dark:text-emerald-300'
                            : 'text-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {guide.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {guide.summary}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Reader Panel (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[640px]">
          {activeGuide ? (
            <>
              {/* Reader Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {CATEGORY_MAP[activeGuide.category]?.label || activeGuide.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      /{activeGuide.slug}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyMarkdown}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Sao chép Markdown"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Đã chép' : 'Copy'}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(activeGuide)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </button>

                    <button
                      onClick={() => handleDeleteGuide(activeGuide)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Xóa tài liệu này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {activeGuide.title}
                </h1>

                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeGuide.summary}
                </p>

                {activeGuide.tags && activeGuide.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {activeGuide.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Reader Body */}
              <div className="p-6 overflow-y-auto max-h-[700px]">
                {renderMarkdown(activeGuide.content)}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="font-semibold text-sm">Chọn một tài liệu để đọc</p>
              <p className="text-xs text-slate-500 mt-1">
                Hoặc nhấn "Thêm tài liệu mới" để soạn thảo tài liệu hướng dẫn bổ sung.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Guide Modal */}
      {editorOpen && editingGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-500" />
                {editingGuide.id ? 'Chỉnh sửa tài liệu quản trị' : 'Tạo mới tài liệu hướng dẫn'}
              </h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveGuide} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tiêu đề tài liệu *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGuide.title || ''}
                    onChange={(e) => setEditingGuide({ ...editingGuide, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="VD: Quy trình xử lý vi phạm tài khoản"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đường dẫn (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGuide.slug || ''}
                    onChange={(e) => setEditingGuide({ ...editingGuide, slug: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    placeholder="quy-trinh-xu-ly-vi-pham"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chuyên mục
                  </label>
                  <select
                    value={editingGuide.category || 'general'}
                    onChange={(e) => setEditingGuide({ ...editingGuide, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                      <option key={key} value={key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Thứ tự sắp xếp
                  </label>
                  <input
                    type="number"
                    value={editingGuide.order ?? 10}
                    onChange={(e) => setEditingGuide({ ...editingGuide, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tóm tắt ngắn (Summary)
                </label>
                <textarea
                  rows={2}
                  value={editingGuide.summary || ''}
                  onChange={(e) => setEditingGuide({ ...editingGuide, summary: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Mô tả 1-2 câu về nội dung chính của tài liệu..."
                />
              </div>

              {/* Markdown Content Editor with Preview Switch */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nội dung Markdown *
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 text-xs bg-slate-100 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                        editorTab === 'write' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" /> Soạn thảo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                        editorTab === 'preview' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem trước
                    </button>
                  </div>
                </div>

                {editorTab === 'write' ? (
                  <textarea
                    rows={14}
                    required
                    value={editingGuide.content || ''}
                    onChange={(e) => setEditingGuide({ ...editingGuide, content: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono leading-relaxed"
                    placeholder="Viết nội dung bài viết theo định dạng Markdown..."
                  />
                ) : (
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/40 max-h-80 overflow-y-auto">
                    {renderMarkdown(editingGuide.content || '')}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingGuide}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {savingGuide ? 'Đang lưu...' : 'Lưu tài liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
