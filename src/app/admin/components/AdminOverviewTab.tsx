'use client';

import React from 'react';
import {
  Users,
  BookOpen,
  Award,
  Clock,
  Sparkles,
  Lock,
  Layers,
  History,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
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
      {/* Top Welcome & Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hệ thống Khảo thí & Quản trị HSK Master</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Bảng Điều Khiển & Vận Hành Hệ Thống
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đồng bộ thời gian thực từ Cloud Firestore & JSON DB Engine • Lần cập nhật cuối:{' '}
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString('vi-VN') : 'Đang tải...'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {(['all', '30d', '7d', 'today'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setTimePeriodFilter(period)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  timePeriodFilter === period
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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

          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <RefreshCw size={13} className={loadingStats ? 'animate-spin text-emerald-600' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Security Alert if locked users exist */}
      {stats && stats.lockedUsers > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold">Cảnh báo: Có {stats.lockedUsers} tài khoản đang bị khóa tạm thời</h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Kiểm tra hồ sơ học viên để xác minh lý do vi phạm hoặc mở khóa quyền học tập.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-950 dark:text-amber-100 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
          >
            Xem danh sách bị khóa →
          </button>
        </div>
      )}

      {/* Executive KPI Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all cursor-pointer group shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Tổng người dùng</span>
            <Users size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {stats?.totalUsers ?? '--'}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              Đăng nhập 24h:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                {stats?.activeToday ?? 0}
              </strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
              Chi tiết <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* 2. System Vocab */}
        <div
          onClick={() => onNavigateTab('vocab')}
          className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all cursor-pointer group shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Từ vựng chuẩn HSK</span>
            <BookOpen size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 font-mono">
            {stats?.totalSystemWords ? stats.totalSystemWords.toLocaleString() : '--'}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">HSK 1 đến HSK 9</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
              Kho từ <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* 3. SRS Reviews Done */}
        <div
          onClick={() => onNavigateTab('logs')}
          className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition-all cursor-pointer group shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Lượt ôn tập SRS</span>
            <Award size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2 font-mono">
            {stats?.totalReviewsDone ? stats.totalReviewsDone.toLocaleString() : '--'}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Thuật toán SM-2</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
              Nhật ký <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* 4. Custom Words Added */}
        <div
          onClick={() => onNavigateTab('workspaces')}
          className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all cursor-pointer group shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Sổ từ cá nhân</span>
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {stats?.totalCustomWords ? stats.totalCustomWords.toLocaleString() : '--'}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Dữ liệu độc lập</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
              Workspaces <ArrowUpRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Operational Launchpad (3 Major Systems) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hub 1: Live Health Probe */}
        <div
          onClick={() => onNavigateTab('health')}
          className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white border border-emerald-800/60 shadow-md cursor-pointer hover:border-emerald-600 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Activity size={20} />
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Probe
            </span>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
            Giám Sát Sức Khỏe & Sự Cố
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Kiểm tra bộ nhớ RAM Node.js, độ trễ truy xuất cơ sở dữ liệu, 122 file PDF, 57 tệp MP3 và ghi nhận sự cố tập trung.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span>Mở chẩn đoán thời gian thực</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* Hub 2: 12 SOP Admin Handbook */}
        <div
          onClick={() => onNavigateTab('guides')}
          className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white border border-indigo-800/60 shadow-md cursor-pointer hover:border-indigo-600 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <BookOpen size={20} />
            </div>
            <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-700/60">
              12 SOPs Chuẩn
            </span>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
            Sổ Tay Quản Trị Hệ Thống
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Tài liệu hướng dẫn thực chiến chuẩn hóa quy trình quản lý học viên, cơ chế SRS SM-2, đề thi, khắc phục lỗi và sao lưu.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-400">
            <span>Đọc sổ tay hướng dẫn</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* Hub 3: Quality & Duplicate Audit */}
        <div
          onClick={() => onNavigateTab('quality')}
          className="p-5 rounded-2xl bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 text-white border border-amber-800/60 shadow-md cursor-pointer hover:border-amber-600 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-700/60">
              Quality Audit
            </span>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
            Kiểm Định Chất Lượng Từ Vựng
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Tự động quét trùng lặp Hanzi giữa các cấp độ, phát hiện từ thiếu Pinyin, thiếu nghĩa Việt và tính toán Quality Score.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-400">
            <span>Mở bảng rà soát dữ liệu</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Two-Column Section: HSK Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: HSK 1–9 Distribution (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111827] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={17} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Phân Bố Từ Vựng Theo Cấp Độ HSK
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('hsk')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Xem cấp độ →
            </button>
          </div>

          <div className="space-y-2.5">
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
                  className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-colors"
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      HSK {lvl}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {count.toLocaleString()} từ ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full group-hover:bg-emerald-600 transition-all"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Activity Logs (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111827] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={17} className="text-slate-600 dark:text-slate-300" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nhật Ký Hoạt Động Quản Trị
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Xem toàn bộ ({logs.length}) →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa ghi nhận hoạt động nào gần đây.
              </div>
            ) : (
              logs.slice(0, 6).map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {log.target || 'Hệ thống'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {log.details || 'Thao tác cập nhật'}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono shrink-0">
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
