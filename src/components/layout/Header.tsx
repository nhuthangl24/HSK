'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  LogIn,
  LogOut,
  Flame,
  ChevronDown,
  Shield,
  Menu,
  Settings,
  Sun,
  Moon,
  Sparkles,
  ClipboardPaste,
} from 'lucide-react';

import Link from 'next/link';
import { Deck, DeckStatistics } from '@/types/vocabulary';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

interface HeaderProps {
  currentDeck: Deck;
  stats: DeckStatistics;
  onOpenDeckSelect?: () => void;
  onOpenAuthModal?: () => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenBulkPaste?: () => void;
  isFirebaseConnected?: boolean;
}

export function Header({
  currentDeck,
  stats,
  onOpenAuthModal,
  onToggleSidebar,
  onOpenSettings,
  onOpenBulkPaste,
}: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white dark:bg-black border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between shadow-2xs z-30 transition-colors">
      {/* Brand logo & Deck Info */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0 transition-colors btn-press"
            title="Bật/Thu nhỏ menu danh mục bên"
          >
            <Menu size={19} />
          </button>
        )}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs shrink-0">
          <FileSpreadsheet size={18} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap select-none shrink-0">
            <span className="hidden lg:inline">HSK Interactive Sheet</span>
            <span className="lg:hidden">HSK Sheet</span>
          </h1>
        </div>
      </div>

      {/* Live Retention & Deck Stats in Header (Only on large screens) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden xl:flex items-center gap-5 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 bg-slate-50/80 dark:bg-slate-800/60 text-xs shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">TỔNG TỪ</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{stats.total}</span>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">ĐÃ THUỘC</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.mastered}</span>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">CẦN ÔN</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{stats.dueTodayCount}</span>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">TỶ LỆ GHI NHỚ</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{stats.retentionRate}%</span>
          </div>
        </div>

        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          title={effectiveTheme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {effectiveTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
        </button>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Cài đặt học tập & Giọng đọc TTS"
          >
            <Settings size={15} />
          </button>
        )}

        {/* User Account / Auth Section */}
        {isAuthenticated && user ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all text-xs shrink-0 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              {user.streakDays > 0 && (
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-bold text-[10px] sm:text-[11px] shrink-0 whitespace-nowrap">
                  <Flame size={12} className="fill-amber-500 text-amber-500" />
                  <span>{user.streakDays}d</span>
                </div>
              )}
              <span className="hidden md:inline font-semibold max-w-[100px] truncate whitespace-nowrap">
                {user.name}
              </span>
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={13} className="text-slate-400 hidden sm:block shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-black rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 p-2.5 text-xs z-50 animate-scaleIn origin-top-right">
                <div className="p-2 border-b border-slate-100 dark:border-zinc-800 mb-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
                    {user.targetHsk && (
                      <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-md">
                        HSK {user.targetHsk}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate font-mono">{user.email}</div>
                </div>

                <div className="px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>Chuỗi ngày học:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Flame size={12} className="fill-amber-500" /> {user.streakDays} ngày liên tiếp
                  </span>
                </div>

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full mt-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <Settings size={14} className="text-slate-400" />
                    <span>Cài đặt cá nhân & TTS</span>
                  </button>
                )}

                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full mt-1.5 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 flex items-center gap-2 cursor-pointer transition-colors font-semibold border border-purple-200 dark:border-purple-800"
                  >
                    <Shield size={14} className="text-purple-700 dark:text-purple-400" />
                    <span>Trang Quản Trị (Admin)</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full mt-2 p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors font-medium border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                >
                  <LogOut size={14} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <LogIn size={14} />
            <span>Đăng nhập</span>
          </button>
        )}
      </div>
    </header>
  );
}
