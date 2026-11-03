'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Users,
  BookOpen,
  FileSpreadsheet,
  History,
  Layers,
  Tag,
  ClipboardPaste,
  FolderKanban,
  Settings,
  MessageSquare,
  Bell,
  Activity,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  ArrowLeft,
  Award,
  Menu,
  X,
  Sparkles,
  FileText,
} from 'lucide-react';
import { User } from '@/types/auth';
import { useTheme } from '@/context/ThemeContext';
import { NotificationBell } from '@/components/layout/NotificationBell';

export type AdminTabId =
  | 'overview'
  | 'health'
  | 'guides'
  | 'users'
  | 'workspaces'
  | 'vocab'
  | 'quality'
  | 'hsk'
  | 'topics'
  | 'paste'
  | 'io'
  | 'exams'
  | 'notifications'
  | 'feedback'
  | 'logs'
  | 'settings';

interface Props {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  currentUser: User | null;
  onLogout: () => void;
  children: React.ReactNode;
  stats?: {
    totalUsers?: number;
    totalSystemWords?: number;
    totalCustomWords?: number;
  } | null;
}

const TAB_TITLES: Record<AdminTabId, { title: string; subtitle: string; category: string }> = {
  overview: {
    title: 'Bảng Điều Khiển & Vận Hành',
    subtitle: 'Tổng hợp chỉ số KPI, tiến độ học tập và kiểm toán thời gian thực',
    category: 'Tổng quan & Hệ thống',
  },
  health: {
    title: 'Giám Sát Sức Khỏe & Sự Cố',
    subtitle: 'Theo dõi tài nguyên server, độ trễ cơ sở dữ liệu và ghi nhận sự cố',
    category: 'Tổng quan & Hệ thống',
  },
  guides: {
    title: 'Sổ Tay Quản Trị & SOPs',
    subtitle: '12 tài liệu quy trình vận hành chuẩn cho ban quản trị',
    category: 'Tổng quan & Hệ thống',
  },
  settings: {
    title: 'Cài Đặt Hệ Thống',
    subtitle: 'Cấu hình tham số vận hành, bảo trì và tích hợp dịch vụ',
    category: 'Tổng quan & Hệ thống',
  },
  users: {
    title: 'Quản Trị Người Dùng & Học Viên',
    subtitle: 'Quản lý tài khoản, phân quyền quản trị, cấp tín chỉ và kiểm soát bảo mật',
    category: 'Người dùng & Học tập',
  },
  workspaces: {
    title: 'Không Gian Học Viên & Sổ Từ',
    subtitle: 'Quản lý kho từ vựng cá nhân và tiến độ SRS của từng học viên',
    category: 'Người dùng & Học tập',
  },
  vocab: {
    title: 'Kho Từ Vựng Chuẩn HSK 1 - 9',
    subtitle: 'Tra cứu, biên tập và chuẩn hóa từ vựng HSK 3.0 toàn diện',
    category: 'Kho Nội Dung & Đề Thi',
  },
  quality: {
    title: 'Kiểm Định Chất Lượng Từ Vựng',
    subtitle: 'Quét trùng lặp Hanzi, kiểm tra phiên âm Pinyin và tính điểm chất lượng',
    category: 'Kho Nội Dung & Đề Thi',
  },
  exams: {
    title: 'Thư Viện Đề Thi HSK / YCT / BCT / TOCFL',
    subtitle: 'Kho tài nguyên 65 bộ đề thi kèm audio nghe chuẩn kỳ thi quốc tế',
    category: 'Kho Nội Dung & Đề Thi',
  },
  hsk: {
    title: 'Cấp Độ HSK & Thư Mục',
    subtitle: 'Cấu trúc thư mục phân cấp và quy định độ khó từng cấp độ',
    category: 'Kho Nội Dung & Đề Thi',
  },
  topics: {
    title: 'Quản Lý Chủ Đề Từ Vựng',
    subtitle: 'Phân loại từ vựng theo chủ đề giao tiếp, đời sống và chuyên ngành',
    category: 'Kho Nội Dung & Đề Thi',
  },
  paste: {
    title: 'Nhập Từ Hàng Loạt (Smart Paste)',
    subtitle: 'Trình phân tích thông minh nhận diện hàng loạt Hanzi, Pinyin và Dịch nghĩa',
    category: 'Kho Nội Dung & Đề Thi',
  },
  io: {
    title: 'Nhập & Xuất Dữ Liệu Tệp',
    subtitle: 'Sao lưu và đồng bộ hai chiều với Excel (.xlsx) và JSON tiêu chuẩn',
    category: 'Kho Nội Dung & Đề Thi',
  },
  notifications: {
    title: 'Quản Lý & Phát Thông Báo',
    subtitle: 'Gửi tin tức, sự kiện và thông báo khẩn đến chuông học viên',
    category: 'Vận Hành & Bảo Mật',
  },
  feedback: {
    title: 'Hòm Thư Góp Ý & Báo Lỗi',
    subtitle: 'Tiếp nhận và xử lý ý kiến đóng góp, phản hồi trải nghiệm từ người học',
    category: 'Vận Hành & Bảo Mật',
  },
  logs: {
    title: 'Nhật Ký Kiểm Toán Bảo Mật',
    subtitle: 'Lưu vết lịch sử thao tác quản trị và truy vết hành vi bảo mật',
    category: 'Vận Hành & Bảo Mật',
  },
};

export default function AdminLayout({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  children,
  stats,
}: Props) {
  const { effectiveTheme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navGroups = [
    {
      group: 'Tổng quan & Hệ thống',
      items: [
        { id: 'overview' as const, label: 'Bảng điều khiển', icon: Award },
        { id: 'health' as const, label: 'Giám sát sức khỏe', icon: Activity, badge: 'Live' },
        { id: 'guides' as const, label: 'Sổ tay SOPs', icon: BookOpen, badge: '12 SOPs' },
        { id: 'settings' as const, label: 'Cài đặt hệ thống', icon: Settings },
      ],
    },
    {
      group: 'Người dùng & Học tập',
      items: [
        {
          id: 'users' as const,
          label: 'Quản trị người dùng',
          icon: Users,
          count: stats?.totalUsers,
        },
        {
          id: 'workspaces' as const,
          label: 'Không gian học viên',
          icon: FolderKanban,
          count: stats?.totalCustomWords,
        },
      ],
    },
    {
      group: 'Kho Nội Dung & Đề thi',
      items: [
        {
          id: 'vocab' as const,
          label: 'Từ vựng HSK 1 - 9',
          icon: BookOpen,
          count: stats?.totalSystemWords,
        },
        { id: 'quality' as const, label: 'Kiểm định chất lượng', icon: ShieldCheck, badge: 'Audit' },
        { id: 'exams' as const, label: 'Thư viện Đề thi', icon: FileText, badge: '65 đề' },
        { id: 'hsk' as const, label: 'Cấp độ & Thư mục', icon: Layers },
        { id: 'topics' as const, label: 'Chủ đề từ vựng', icon: Tag },
        { id: 'paste' as const, label: 'Nhập thông minh', icon: ClipboardPaste },
        { id: 'io' as const, label: 'Nhập & Xuất tệp', icon: FileSpreadsheet },
      ],
    },
    {
      group: 'Vận hành & Bảo mật',
      items: [
        { id: 'notifications' as const, label: 'Thông báo hệ thống', icon: Bell },
        { id: 'feedback' as const, label: 'Hòm thư góp ý', icon: MessageSquare },
        { id: 'logs' as const, label: 'Nhật ký kiểm toán', icon: History },
      ],
    },
  ];

  const currentTabMeta = TAB_TITLES[activeTab] || {
    title: 'Quản Trị Hệ Thống',
    subtitle: 'Bảng điều khiển quản trị trung tâm HSK Master',
    category: 'Quản trị',
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-black text-slate-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER (STICKY & BLURRED) */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/90 dark:border-zinc-800 px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        {/* Left: Mobile Toggle + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            title="Quay lại Bảng từ vựng học viên"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline font-medium">Bảng từ vựng</span>
          </Link>

          <span className="text-slate-300 dark:text-zinc-700 select-none hidden sm:inline">/</span>

          {/* Brand Identity */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Shield size={16} />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight shrink-0">
                HSK Admin
              </span>
              <span className="hidden lg:inline text-xs text-slate-300 dark:text-zinc-700 select-none">•</span>
              <span className="hidden lg:inline text-xs font-semibold text-slate-500 dark:text-zinc-400 truncate">
                {currentTabMeta.title}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick actions, Live health pill, Theme toggle, Notification, User */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live System Health Pill */}
          <button
            type="button"
            onClick={() => onSelectTab('health')}
            className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              activeTab === 'health'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-zinc-700'
            }`}
            title="Xem bảng giám sát sức khỏe máy chủ"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Hệ thống: Khỏe mạnh</span>
          </button>

          {/* Quick Handbook Link */}
          <button
            type="button"
            onClick={() => onSelectTab('guides')}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              activeTab === 'guides'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-zinc-700'
            }`}
            title="Mở 12 quy trình vận hành chuẩn SOPs"
          >
            <BookOpen size={13} className="text-indigo-500" />
            <span>Sổ tay SOP (12)</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors cursor-pointer shadow-2xs"
            title="Đổi giao diện Sáng / Tối"
          >
            {effectiveTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-800">
            <div
              suppressHydrationWarning
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0"
            >
              {((mounted ? currentUser?.name || currentUser?.email : '') || 'A').charAt(0).toUpperCase()}
            </div>

            <div className="hidden xl:block text-left">
              <div
                suppressHydrationWarning
                className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[130px]"
              >
                {mounted ? currentUser?.name || 'Quản trị viên' : 'Quản trị viên'}
              </div>
              <div
                suppressHydrationWarning
                className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono leading-tight truncate max-w-[130px]"
              >
                {mounted ? currentUser?.email || 'admin@hsk.com' : 'admin@hsk.com'}
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Đăng xuất khỏi bảng quản trị"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN LAYOUT BODY */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Navigation Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 ${
            sidebarCollapsed ? 'md:w-18' : 'md:w-68'
          } w-68 bg-white dark:bg-zinc-950 border-r border-slate-200/90 dark:border-zinc-850 transform transition-all duration-200 md:translate-x-0 md:static shrink-0 select-none overflow-y-auto ${
            mobileMenuOpen ? 'translate-x-0 top-[53px]' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Collapse Toggle Header */}
          <div className="hidden md:flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-900">
            {!sidebarCollapsed && (
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Menu Quản Trị
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-1.5 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer outline-none ${
                sidebarCollapsed ? 'mx-auto' : ''
              }`}
              title={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-3 space-y-4">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-3 pt-2 pb-1">
                    {group.group}
                  </div>
                )}

                {sidebarCollapsed && gIdx > 0 && (
                  <div className="w-8 h-px bg-slate-200 dark:bg-zinc-850 mx-auto my-2" />
                )}

                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      title={item.label}
                      className={`group relative flex items-center justify-between rounded-xl text-xs font-semibold cursor-pointer transition-all outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 select-none ${
                        sidebarCollapsed
                          ? `w-11 h-11 mx-auto justify-center ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900'
                            }`
                          : `w-full px-3 py-2.5 min-h-[42px] ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900'
                            }`
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          size={17}
                          className={`shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
                          }`}
                        />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!sidebarCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {'badge' in item && item.badge && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {'count' in item && typeof item.count === 'number' && item.count > 0 && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-mono transition-colors ${
                                isActive
                                  ? 'bg-white/20 text-white font-bold'
                                  : 'bg-slate-100 dark:bg-zinc-850 text-slate-600 dark:text-zinc-400 font-semibold group-hover:bg-slate-200 dark:group-hover:bg-zinc-800'
                              }`}
                            >
                              {item.count > 999 ? `${Math.round(item.count / 1000)}k` : item.count}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fadeIn" key={activeTab}>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Context Breadcrumb / Category Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-zinc-850 text-xs">
              <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 font-medium">
                <span>{currentTabMeta.category}</span>
                <span>/</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{currentTabMeta.title}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Trực tiếp từ Cloud Database Engine</span>
              </div>
            </div>

            {/* Active Tab Screen */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
