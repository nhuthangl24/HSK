'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  HelpCircle,
  FileText,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  Volume2,
  GraduationCap,
  Printer,
  UserCheck,
  Sparkles,
  ExternalLink,
  Sun,
  Moon,
  Copy,
  Check,
  BookOpen,
  MessageSquare,
  Shield,
  Layers,
  CheckCircle2,
  X,
  Share2,
} from 'lucide-react';
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  FaqItem,
} from '@/data/faq-data';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { ZaloIcon } from '@/components/ui/ZaloIcon';

type ActiveTab = 'faq' | 'terms' | 'privacy' | 'support';

function FaqContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { effectiveTheme, setTheme } = useTheme();

  // Tab State: default to 'faq' or check search params
  const tabParam = (searchParams.get('tab') as ActiveTab) || 'faq';
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    ['faq', 'terms', 'privacy', 'support'].includes(tabParam) ? tabParam : 'faq'
  );

  // Search & Filter State for FAQ
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('srs-how-it-works');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    router.replace(`/faq?tab=${tab}`, { scroll: false });
  };

  // Filtered FAQ Items
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchAnswer = item.answer.toLowerCase().includes(q);
      const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(q));

      return matchQuestion || matchAnswer || matchTags;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyQuestionLink = (faq: FaqItem) => {
    const url = `${window.location.origin}/faq?tab=faq&q=${encodeURIComponent(faq.question)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(faq.id);
    toast.success('Đã sao chép liên kết câu hỏi vào bộ nhớ tạm');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getCategoryIcon = (iconName: string, size = 16) => {
    switch (iconName) {
      case 'RotateCcw':
        return <RotateCcw size={size} />;
      case 'Volume2':
        return <Volume2 size={size} />;
      case 'GraduationCap':
        return <GraduationCap size={size} />;
      case 'Printer':
        return <Printer size={size} />;
      case 'UserCheck':
        return <UserCheck size={size} />;
      case 'Sparkles':
        return <Sparkles size={size} />;
      default:
        return <HelpCircle size={size} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-100 transition-colors">
      {/* 1. TOP STICKY NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 py-3 transition-colors shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all text-slate-600 dark:text-slate-300 btn-press cursor-pointer"
              title="Quay lại Bảng từ vựng chính"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  <HelpCircle size={14} />
                </div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Trung Tâm Trợ Giúp & Pháp Lý
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Giải đáp thắc mắc, hướng dẫn học tập và chính sách người dùng HSK Master
              </p>
            </div>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <BookOpen size={14} />
              <span>Bảng từ vựng</span>
            </Link>

            <button
              type="button"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={effectiveTheme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            >
              {effectiveTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* Tab switcher bar */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-100 dark:border-zinc-900 pt-2.5">
          <button
            type="button"
            onClick={() => handleTabChange('faq')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer btn-press ${
              activeTab === 'faq'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <HelpCircle size={14} />
            <span>Câu hỏi thường gặp (FAQ)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'faq' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {FAQ_ITEMS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('terms')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer btn-press ${
              activeTab === 'terms'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <FileText size={14} />
            <span>Điều khoản sử dụng</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('privacy')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer btn-press ${
              activeTab === 'privacy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Chính sách bảo mật</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('support')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer btn-press ${
              activeTab === 'support'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <MessageSquare size={14} />
            <span>Cộng đồng & Hỗ trợ</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ============================================================== */}
        {/* TAB 1: FAQ (CÂU HỎI THƯỜNG GẶP)                                */}
        {/* ============================================================== */}
        {activeTab === 'faq' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Hero Search Box */}
            <div className="relative rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 sm:p-8 shadow-sm overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full mb-2">
                  Trung tâm trợ giúp học viên
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Bạn cần giúp đỡ điều gì?
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-emerald-50 leading-relaxed">
                  Tìm kiếm câu trả lời nhanh chóng về phương pháp ghi nhớ SRS, cách luyện nghe phát âm, làm đề thi HSK hoặc quản lý tài khoản.
                </p>

                {/* Search Bar inside Hero */}
                <div className="mt-5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm câu hỏi, từ khóa (ví dụ: SRS, phát âm, in PDF, mất dữ liệu, miễn phí)..."
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-400/40 shadow-md font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Decorative background shapes */}
              <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute right-20 top-4 w-32 h-32 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {FAQ_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer btn-press border ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {getCategoryIcon(cat.iconName, 14)}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Result Stats */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Hiển thị <strong>{filteredFaqs.length}</strong> câu hỏi phù hợp
                {searchQuery ? ` cho từ khóa "${searchQuery}"` : ''}
              </span>
              {(searchQuery || selectedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
                >
                  Đặt lại bộ lọc
                </button>
              )}
            </div>

            {/* FAQ Accordion List */}
            {filteredFaqs.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <Search size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Không tìm thấy câu trả lời phù hợp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Bạn có thể thử tìm kiếm với từ khóa khác hoặc tham gia Nhóm Zalo cộng đồng HSK Master để được ban quản trị và các bạn học viên trợ giúp trực tiếp.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Xem tất cả câu hỏi
                  </button>
                  <a
                    href="https://zalo.me/g/sgr73nkz8q6pnhjwfehz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ZaloIcon className="w-4 h-4" />
                    <span>Hỏi trên Zalo</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-white dark:bg-zinc-900 border-emerald-400/80 dark:border-emerald-700 shadow-sm'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                              isExpanded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            Q
                          </span>
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                            {faq.question}
                          </span>
                        </div>
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                          }`}
                        >
                          <ChevronDown size={18} />
                        </div>
                      </button>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-zinc-800/80 animate-fadeIn">
                          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-10 pr-2">
                            {faq.answer}
                          </div>

                          {/* Footer with tags and copy question link */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 pl-10">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {faq.tags.map((tag) => (
                                <span
                                  key={tag}
                                  onClick={() => setSearchQuery(tag)}
                                  className="text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyQuestionLink(faq)}
                              className="text-xs text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Sao chép liên kết câu hỏi"
                            >
                              {copiedId === faq.id ? (
                                <>
                                  <Check size={13} className="text-emerald-600" />
                                  <span className="text-emerald-600 font-semibold">Đã chép link</span>
                                </>
                              ) : (
                                <>
                                  <Share2 size={13} />
                                  <span>Chia sẻ</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ĐIỀU KHOẢN SỬ DỤNG (TERMS OF SERVICE)                   */}
        {/* ============================================================== */}
        {activeTab === 'terms' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs">
              <div className="border-b border-slate-200 dark:border-zinc-800 pb-5 mb-6">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <FileText size={15} />
                  <span>Văn bản pháp lý</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Điều Khoản Sử Dụng Dịch Vụ
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span>Phiên bản: <strong>{TERMS_OF_SERVICE.version}</strong></span>
                  <span>•</span>
                  <span>Cập nhật lần cuối: <strong>{TERMS_OF_SERVICE.lastUpdated}</strong></span>
                </div>
              </div>

              <div className="space-y-6">
                {TERMS_OF_SERVICE.sections.map((section, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {section.title}
                    </h3>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50/60 dark:bg-zinc-950/40 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CHÍNH SÁCH BẢO MẬT (PRIVACY POLICY)                     */}
        {/* ============================================================== */}
        {activeTab === 'privacy' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs">
              <div className="border-b border-slate-200 dark:border-zinc-800 pb-5 mb-6">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck size={15} />
                  <span>Bảo vệ quyền riêng tư</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Chính Sách Bảo Mật Quyền Riêng Tư
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span>Phiên bản: <strong>{PRIVACY_POLICY.version}</strong></span>
                  <span>•</span>
                  <span>Cập nhật lần cuối: <strong>{PRIVACY_POLICY.lastUpdated}</strong></span>
                </div>
              </div>

              {/* Quick Commitment Box */}
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>Cam kết cốt lõi:</strong> HSK Master được xây dựng trên nguyên tắc tôn trọng quyền riêng tư tuyệt đối. Chúng tôi không thu thập thông tin thẻ thanh toán, không bán dữ liệu cho bên thứ ba, và toàn bộ dữ liệu tiến độ của bạn có thể xuất ra file Excel bất kỳ lúc nào.
                </div>
              </div>

              <div className="space-y-6">
                {PRIVACY_POLICY.sections.map((section, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {section.title}
                    </h3>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50/60 dark:bg-zinc-950/40 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CỘNG ĐỒNG & HỖ TRỢ (SUPPORT & COMMUNITY)                */}
        {/* ============================================================== */}
        {activeTab === 'support' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            {/* Zalo Community Card */}
            <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-2 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                    <ZaloIcon className="w-4 h-4" />
                    <span>Cộng đồng chính thức</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Nhóm Zalo Học Viên HSK Master
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-50 leading-relaxed">
                    Tham gia nhóm Zalo để trao đổi bài tập tiếng Trung, hỏi đáp thắc mắc ngữ pháp, nhận thông báo đề thi mới và được hỗ trợ kỹ thuật trực tiếp từ ban quản trị.
                  </p>
                </div>

                <a
                  href="https://zalo.me/g/sgr73nkz8q6pnhjwfehz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer btn-press"
                >
                  <ZaloIcon className="w-5 h-5" />
                  <span>Vào nhóm Zalo ngay</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Form Góp ý */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare size={18} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Hòm Thư Góp Ý & Báo Lỗi
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bạn phát hiện sai sót về từ vựng, ngữ pháp hoặc muốn đề xuất thêm tính năng mới? Hãy gửi ý kiến để ban quản trị tiếp nhận ngay.
                </p>
                <Link
                  href="/?feedback=true"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1 cursor-pointer"
                >
                  <span>Mở Form Góp ý</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Lời Tri Ân Tài Liệu */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Sparkles size={18} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Đóng Góp Tài Liệu & Đồng Hành
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Cảm ơn sự chung tay của quý thầy cô, fanpage tiếng Trung và các bạn học viên đã tận tình chia sẻ đề thi, câu ví dụ để xây dựng kho học liệu phong phú.
                </p>
                <a
                  href="https://www.facebook.com/profile.php?id=61569089072523"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-1 cursor-pointer"
                >
                  <span>Ghé thăm trang đối tác</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              H
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              HSK Master • Nền Tảng Học Tiếng Trung Tương Tác
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={() => handleTabChange('faq')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleTabChange('terms')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Điều khoản
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleTabChange('privacy')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Bảo mật
            </button>
            <span>•</span>
            <a
              href="https://zalo.me/g/sgr73nkz8q6pnhjwfehz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>Zalo</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function FaqPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FaqContent />
    </Suspense>
  );
}
