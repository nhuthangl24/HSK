'use client';

import React from 'react';
import {
  Users,
  BookOpen,
  Award,
  Sparkles,
  Layers,
  History,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  FolderKanban,
  FileText,
} from 'lucide-react';
import { AdminStats, AuditLog } from '@/types/auth';

interface Props {
  stats: AdminStats | null;
  logs: AuditLog[];
  loadingStats: boolean;
  timePeriodFilter: 'all' | '30d' | '7d' | 'today';
  setTimePeriodFilter: (p: 'all' | '30d' | '7d' | 'today') => void;
  onRefresh: () => void;
  onNavigateTab: (tab: any) => void;
  onFilterHskLevel?: (level: number) => void;
  lastRefreshedAt: Date | null;
}

export default function AdminOverviewTab({
  stats,
  logs,
  loadingStats,
  timePeriodFilter,
  setTimePeriodFilter,
  onRefresh,
  onNavigateTab,
  onFilterHskLevel,
  lastRefreshedAt,
}: Props) {
  const totalWords = (stats?.totalSystemWords || 0) + (stats?.totalCustomWords || 0) || 1;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* TOP WELCOME & TIMEFRAME CONTROLS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Trung Tâm Điều Hành & Vận Hành HSK Master</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Bảng Điều Khiển Hệ Thống
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Đồng bộ dữ liệu hai chiều Cloud Firestore & Local Engine • Cập nhật lần cuối:{' '}
            <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
              {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString('vi-VN') : 'Đang đồng bộ...'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Timeframe Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs">
            {(['all', '30d', '7d', 'today'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setTimePeriodFilter(period)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  timePeriodFilter === period
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {period === 'all'
                  ? 'Toàn bộ'
                  : period === '30d'
                  ? '30 ngày'
                  : period === '7d'
                  ? '7 ngày'
                  : 'Hôm nay'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs"
            title="Làm mới số liệu thống kê"
          >
            <RefreshCw size={14} className={loadingStats ? 'animate-spin text-emerald-600' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECURITY BANNER IF LOCKED ACCOUNTS EXIST */}
      {/* ------------------------------------------------------------- */}
      {stats && stats.lockedUsers > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold">
                Cảnh báo an toàn: Có {stats.lockedUsers} tài khoản đang bị tạm khóa truy cập
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Kiểm tra hồ sơ học viên để xác minh lý do vi phạm hoặc mở khóa quyền truy cập học tập.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 shadow-xs"
          >
            Xử lý ngay →
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EXECUTIVE KPI METRIC CARDS (4 TILES) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer group shadow-xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs">
            <span className="font-bold uppercase tracking-wider">Tổng người dùng</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={17} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-3 font-mono">
            {stats?.totalUsers ?? '--'}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
            <span className="text-slate-500 dark:text-zinc-400 font-medium">
              Hoạt động 24h:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                {stats?.activeToday ?? 0}
              </strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Chi tiết <ArrowUpRight size={13} />
            </span>
          </div>
        </div>

        {/* 2. System Vocab */}
        <div
          onClick={() => onNavigateTab('vocab')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group shadow-xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs">
            <span className="font-bold uppercase tracking-wider">Từ vựng chuẩn HSK</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={17} />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-3 font-mono">
            {stats?.totalSystemWords ? stats.totalSystemWords.toLocaleString() : '--'}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
            <span className="text-slate-500 dark:text-zinc-400 font-medium">Chuẩn HSK 1 đến HSK 9</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Kho từ <ArrowUpRight size={13} />
            </span>
          </div>
        </div>

        {/* 3. SRS Reviews Done */}
        <div
          onClick={() => onNavigateTab('logs')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer group shadow-xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs">
            <span className="font-bold uppercase tracking-wider">Lượt ôn tập SRS</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award size={17} />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-3 font-mono">
            {stats?.totalReviewsDone ? stats.totalReviewsDone.toLocaleString() : '--'}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
            <span className="text-slate-500 dark:text-zinc-400 font-medium">Thuật toán SM-2</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Nhật ký <ArrowUpRight size={13} />
            </span>
          </div>
        </div>

        {/* 4. Custom Words Added */}
        <div
          onClick={() => onNavigateTab('workspaces')}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all cursor-pointer group shadow-xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs">
            <span className="font-bold uppercase tracking-wider">Sổ từ cá nhân</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles size={17} />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-3 font-mono">
            {stats?.totalCustomWords ? stats.totalCustomWords.toLocaleString() : '--'}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
            <span className="text-slate-500 dark:text-zinc-400 font-medium">Workspaces học viên</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Quản lý <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* OPERATIONAL COMMAND HUBS (3 MAJOR PILLARS) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hub 1: Live Health Probe */}
        <div
          onClick={() => onNavigateTab('health')}
          className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer group hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Probe
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            Giám Sát Sức Khỏe & Sự Cố
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            Kiểm tra bộ nhớ RAM Node.js, độ trễ truy xuất Firestore/JSON DB và theo dõi sự cố tập trung.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>Chẩn đoán thời gian thực</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Hub 2: 12 SOPs Admin Handbook */}
        <div
          onClick={() => onNavigateTab('guides')}
          className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer group hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/80">
              12 SOPs Chuẩn
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            Sổ Tay Quản Trị Hệ Thống
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            Quy trình chuẩn hóa quản lý học viên, thuật toán SRS SM-2, ngân hàng đề thi và hướng dẫn sao lưu.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>Mở sổ tay hướng dẫn</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Hub 3: Quality & Duplicate Audit */}
        <div
          onClick={() => onNavigateTab('quality')}
          className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:border-amber-500 dark:hover:border-amber-500 transition-all cursor-pointer group hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/80">
              Quality Audit
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            Kiểm Định Chất Lượng Từ Vựng
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            Tự động quét trùng lặp Hanzi giữa các cấp độ, phát hiện từ thiếu Pinyin, nghĩa Việt và tính toán Quality Score.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Rà soát dữ liệu chuẩn</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TWO-COLUMN SECTION: HSK BREAKDOWN & RECENT LOGS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: HSK 1–9 Distribution (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Phân Bố Từ Vựng Theo Cấp Độ HSK
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('hsk')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
            >
              Xem cấp độ →
            </button>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
              const count = stats?.hskBreakdown?.[lvl] || 0;
              const percent = Math.round((count / totalWords) * 100);
              return (
                <div
                  key={lvl}
                  onClick={() => {
                    if (onFilterHskLevel) onFilterHskLevel(lvl);
                    onNavigateTab('vocab');
                  }}
                  className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 p-2.5 rounded-xl transition-colors"
                >
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      HSK {lvl}
                    </span>
                    <span className="text-slate-500 dark:text-zinc-400 font-mono font-medium">
                      {count.toLocaleString()} từ ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full group-hover:bg-emerald-600 transition-all duration-300"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Activity Logs (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-slate-600 dark:text-zinc-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Nhật Ký Hoạt Động Quản Trị
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
            >
              Xem toàn bộ ({logs.length}) →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {logs.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-400 dark:text-zinc-500">
                Chưa có thao tác quản trị nào được ghi nhận gần đây.
              </div>
            ) : (
              logs.slice(0, 6).map((log) => (
                <div key={log.id} className="py-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {log.target || 'Hệ thống'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {log.details || 'Thao tác cập nhật cơ sở dữ liệu'}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-zinc-500 font-mono shrink-0 pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
