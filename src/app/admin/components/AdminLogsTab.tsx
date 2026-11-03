'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { AuditLog } from '@/types/auth';

interface Props {
  logs: AuditLog[];
  loadingLogs: boolean;
  onRefreshLogs: () => void;
}

export default function AdminLogsTab({ logs, loadingLogs, onRefreshLogs }: Props) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (actionFilter !== 'all') {
      result = result.filter((l) => (l.action || '').toUpperCase().includes(actionFilter.toUpperCase()));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          ((l.adminEmail || l.admin || '').toLowerCase().includes(q)) ||
          (l.target && l.target.toLowerCase().includes(q)) ||
          (l.action && l.action.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }

    return result;
  }, [logs, actionFilter, search]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-500/10 text-slate-700 dark:text-zinc-300 rounded-xl border border-slate-500/20">
            <History size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              Nhật Ký Kiểm Toán Hoạt Động (Audit Trail)
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Lưu vết toàn bộ thao tác thêm, sửa, xóa, phân quyền, khóa tài khoản và biến động dữ liệu.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshLogs}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200/60 dark:border-zinc-700/60 cursor-pointer self-start sm:self-center"
        >
          <RefreshCw size={13} className={loadingLogs ? 'animate-spin text-emerald-500' : ''} />
          <span>Làm mới nhật ký</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Tìm theo quản trị viên, đối tượng, mô tả hành động..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-200 font-medium cursor-pointer"
        >
          <option value="all">Tất cả hành động</option>
          <option value="KHÓA">Khóa / Mở khóa</option>
          <option value="PHÂN_QUYỀN">Phân quyền</option>
          <option value="XÓA">Xóa tài khoản / Dữ liệu</option>
          <option value="THÊM">Thêm từ vựng</option>
          <option value="SỬA">Sửa từ vựng</option>
          <option value="NHẬP">Nhập dữ liệu</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-zinc-950/80 text-slate-500 dark:text-zinc-400 border-b border-slate-200/90 dark:border-zinc-800 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Thời gian</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Hành động</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Người thực hiện</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Đối tượng tác động</th>
                <th className="py-3.5 px-4 min-w-[200px]">Chi tiết thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-slate-700 dark:text-zinc-300">
              {loadingLogs ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-emerald-500" />
                      <span>Đang tải nhật ký kiểm toán...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                    Không có nhật ký nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                      {log.adminEmail || log.admin || 'System'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                      {log.target || 'Hệ thống'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400 max-w-md truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-950/80 border-t border-slate-200/90 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>
              Hiển thị {(page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, filteredLogs.length)} trên tổng số {filteredLogs.length} bản ghi
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="px-2 font-semibold text-slate-800 dark:text-zinc-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
