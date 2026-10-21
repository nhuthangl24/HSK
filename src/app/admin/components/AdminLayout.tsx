'use client';

import React, { useState } from 'react';
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

const TAB_TITLES: Record<AdminTabId, string> = {
  overview: 'Bảng Điều Khiển & Vận Hành',
  health: 'Giám Sát Sức Khỏe & Sự Cố',
  guides: 'Sổ Tay Quản Trị & SOPs',
  users: 'Quản Trị Người Dùng',
  workspaces: 'Không Gian Học Viên',
  vocab: 'Kho Từ Vựng Chuẩn HSK',
  quality: 'Kiểm Định Chất Lượng',
  hsk: 'Cấp Độ HSK & Thư Mục',
  topics: 'Quản Lý Chủ Đề',
  paste: 'Nhập Từ Hàng Loạt',
  io: 'Nhập & Xuất Dữ Liệu',
  exams: 'Thư Viện Đề Thi HSK',
  notifications: 'Thông Báo & Phát Tin',
  feedback: 'Hòm Thư Góp Ý & Báo Lỗi',
  logs: 'Nhật Ký Kiểm Toán',
  settings: 'Cài Đặt Hệ Thống',
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

  const navGroups = [
    {
      group: 'Tổng quan & Sức khỏe',
      items: [
        { id: 'overview' as const, label: 'Bảng điều khiển', icon: Award },
        { id: 'health' as const, label: 'Giám sát sức khỏe', icon: Activity, badge: 'Live' },
        { id: 'guides' as const, label: 'Sổ tay quản trị', icon: BookOpen, badge: '12' },
      ],
    },
    {
      group: 'Người dùng & Không gian',
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
      group: 'Nội dung HSK & Đề thi',
      items: [
        {
          id: 'vocab' as const,
          label: 'Từ vựng chuẩn HSK',
          icon: BookOpen,
          count: stats?.totalSystemWords,
        },
        { id: 'quality' as const, label: 'Kiểm định chất lượng', icon: ShieldCheck, badge: 'Audit' },
        { id: 'hsk' as const, label: 'Cấp độ & Thư mục', icon: Layers },
        { id: 'topics' as const, label: 'Chủ đề từ vựng', icon: Tag },
        { id: 'paste' as const, label: 'Nhập hàng loạt', icon: ClipboardPaste },
        { id: 'io' as const, label: 'Nhập & Xuất tệp', icon: FileSpreadsheet },
        { id: 'exams' as const, label: 'Thư viện Đề thi', icon: BookOpen, badge: '65 đề' },
      ],
    },
    {
      group: 'Vận hành & Hỗ trợ',
      items: [
        { id: 'notifications' as const, label: 'Thông báo hệ thống', icon: Bell },
        { id: 'feedback' as const, label: 'Hòm thư góp ý', icon: MessageSquare },
        { id: 'logs' as const, label: 'Nhật ký kiểm toán', icon: History },
        { id: 'settings' as const, label: 'Cài đặt hệ thống', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#0b0f19] text-[#0f172a] dark:text-[#f8fafc] flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#fcfbf9]/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-[#e2e8f0] dark:border-[#1e293b] px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
        {/* Left: Mobile Toggle + Return + Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
            title="Quay lại bảng từ vựng học viên"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Bảng từ</span>
          </Link>

          <span className="text-[#cbd5e1] dark:text-[#334155] select-none hidden sm:inline">/</span>

          {/* Brand Identity */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#047857] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
              <Shield size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-[#0f172a] dark:text-white tracking-tight shrink-0">
                HSK Admin
              </span>
              <span className="hidden lg:inline text-xs text-[#94a3b8] select-none">•</span>
              <span className="hidden lg:inline text-xs text-[#64748b] dark:text-[#94a3b8] font-medium truncate">
                {TAB_TITLES[activeTab]}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Health pill, Theme toggle, Notification, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Health Diagnostic Pill */}
          <button
            type="button"
            onClick={() => onSelectTab('health')}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              activeTab === 'health'
                ? 'bg-[#ecfdf5] dark:bg-[#064e3b]/40 text-[#047857] dark:text-[#34d399] border-[#a7f3d0] dark:border-[#065f46]'
                : 'bg-white dark:bg-[#1e293b] text-[#475569] dark:text-[#cbd5e1] border-[#e2e8f0] dark:border-[#334155] hover:bg-[#f8fafc]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-pulse" />
            <span>Hệ thống: Tốt</span>
          </button>

          {/* Quick Handbook */}
          <button
            type="button"
            onClick={() => onSelectTab('guides')}
            className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              activeTab === 'guides'
                ? 'bg-[#eef2ff] dark:bg-[#1e1b4b]/60 text-[#4338ca] dark:text-[#a5b4fc] border-[#c7d2fe] dark:border-[#3730a3]'
                : 'bg-white dark:bg-[#1e293b] text-[#475569] dark:text-[#cbd5e1] border-[#e2e8f0] dark:border-[#334155] hover:bg-[#f8fafc]'
            }`}
          >
            <BookOpen size={12} className="text-[#4338ca] dark:text-[#a5b4fc]" />
            <span>Sổ tay (12)</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#475569] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#334155]/60 transition-colors cursor-pointer"
            title="Đổi giao diện Sáng / Tối"
          >
            {effectiveTheme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
          </button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Pill */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#e2e8f0] dark:border-[#1e293b]">
            <div className="w-6 h-6 rounded-full bg-[#047857] text-white font-bold flex items-center justify-center text-[10.5px] shadow-2xs shrink-0">
              {(currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-[11px] font-bold text-[#0f172a] dark:text-white leading-tight truncate max-w-[110px]">
                {currentUser?.name || 'Quản trị viên'}
              </div>
              <div className="text-[9.5px] text-[#94a3b8] font-mono leading-tight truncate max-w-[120px]">
                {currentUser?.email || 'admin@hsk.com'}
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-[#94a3b8] hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Đăng xuất khỏi Admin"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-2xs md:hidden"
          />
        )}

        {/* Navigation Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 ${
            sidebarCollapsed ? 'md:w-16' : 'md:w-60'
          } w-60 bg-white dark:bg-[#0f172a] border-r border-[#e2e8f0] dark:border-[#1e293b] transform transition-all duration-200 md:translate-x-0 md:static shrink-0 select-none overflow-y-auto ${
            mobileMenuOpen ? 'translate-x-0 top-[49px]' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Collapse Toggle Bar */}
          <div className="hidden md:flex items-center justify-between p-2.5 border-b border-[#f1f5f9] dark:border-[#1e293b]">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider pl-1">
                Menu Quản Trị
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-1 text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white rounded-md hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors cursor-pointer ${
                sidebarCollapsed ? 'mx-auto' : ''
              }`}
              title={sidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Nav Items List */}
          <div className="p-2 space-y-3.5">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-0.5">
                {!sidebarCollapsed && (
                  <div className="text-[9.5px] font-bold text-[#94a3b8] dark:text-[#64748b] uppercase tracking-wider px-2.5 py-1">
                    {group.group}
                  </div>
                )}
                {sidebarCollapsed && gIdx > 0 && (
                  <div className="w-5 h-px bg-[#e2e8f0] dark:bg-[#1e293b] mx-auto my-2" />
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
                      className={`flex items-center justify-between rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        sidebarCollapsed
                          ? `w-9 h-9 mx-auto justify-center ${
                              isActive
                                ? 'bg-[#047857] text-white shadow-2xs'
                                : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b]'
                            }`
                          : `w-full px-2.5 py-1.5 ${
                              isActive
                                ? 'bg-[#047857] text-white shadow-2xs font-bold'
                                : 'text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b]'
                            }`
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={14} className="shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!sidebarCollapsed && (
                        <>
                          {'badge' in item && item.badge && (
                            <span
                              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                                isActive
                                  ? 'bg-[#065f46] text-white'
                                  : 'bg-[#ecfdf5] dark:bg-[#064e3b]/40 text-[#047857] dark:text-[#34d399]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {'count' in item && typeof item.count === 'number' && item.count > 0 && (
                            <span
                              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono ${
                                isActive
                                  ? 'bg-[#065f46] text-white font-bold'
                                  : 'bg-[#f1f5f9] dark:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8]'
                              }`}
                            >
                              {item.count > 999 ? `${Math.round(item.count / 1000)}k` : item.count}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 animate-fadeIn" key={activeTab}>
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
