'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  Users,
  BookOpen,
  History,
} from 'lucide-react';
import { VocabItem } from '@/types/vocabulary';
import { User, AuditLog } from '@/types/auth';
import { useToast } from '@/context/ToastContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

interface Props {
  vocabList: VocabItem[];
  users: User[];
  logs: AuditLog[];
  onImportComplete?: () => void;
}

export default function AdminIoTab({ vocabList, users, logs, onImportComplete }: Props) {
  const toast = useToast();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Export functions
  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất tệp ${filename}!`);
  };

  const downloadCsv = (headers: string[], rows: (string | number)[][], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất tệp CSV ${filename}!`);
  };

  const exportVocabCsv = () => {
    const headers = ['ID', 'Cấp độ HSK', 'Chữ Hán', 'Pinyin', 'Nghĩa tiếng Việt', 'Từ loại', 'Ví dụ tiếng Trung', 'Ví dụ Pinyin', 'Dịch nghĩa ví dụ'];
    const rows = vocabList.map((v) => [
      v.id,
      v.hskLevel,
      v.hanzi,
      v.pinyin,
      v.meaning,
      v.partOfSpeech || '',
      v.example || '',
      v.examplePinyin || '',
      v.exampleMeaning || '',
    ]);
    downloadCsv(headers, rows, `hsk-vocabulary-${Date.now()}.csv`);
  };

  const exportUsersCsv = () => {
    const headers = ['ID', 'Họ tên', 'Email', 'Vai trò', 'Mục tiêu HSK', 'Chuỗi Streak', 'Trạng thái', 'Ngày tạo'];
    const rows = users.map((u) => [
      u.id,
      u.name || '',
      u.email,
      u.role,
      u.targetHsk || 3,
      u.streakDays || 0,
      u.isLocked ? 'Đã khóa' : 'Hoạt động',
      u.createdAt || '',
    ]);
    downloadCsv(headers, rows, `hsk-users-${Date.now()}.csv`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus('Đang đọc tệp...');

    try {
      const text = await file.text();
      let importedItems: any[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        importedItems = Array.isArray(parsed) ? parsed : parsed.words || [];
      } else {
        toast.error('Hiện chỉ hỗ trợ nhập định dạng .json');
        setImporting(false);
        return;
      }

      if (importedItems.length === 0) {
        toast.error('Tệp không chứa dữ liệu hợp lệ.');
        setImporting(false);
        return;
      }

      setImportStatus(`Đang nhập ${importedItems.length} từ vào hệ thống...`);

      const res = await fetch('/api/admin/vocab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify({ batch: importedItems }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã nhập thành công ${data.count || importedItems.length} từ vựng!`);
        if (onImportComplete) onImportComplete();
      } else {
        toast.error(data.message || 'Lỗi khi nhập dữ liệu.');
      }
    } catch (err: unknown) {
      toast.error('Lỗi khi phân tích tệp JSON.');
    } finally {
      setImporting(false);
      setImportStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Nhập & Xuất Tệp Dữ Liệu (Import / Export)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Xuất sao lưu hoặc nhập kho từ vựng, danh sách học viên định dạng CSV, Excel và JSON chuẩn.
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Export Panels & Import Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Export Data Panel */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Download size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Xuất Tệp Dữ Liệu (Export)
            </h3>
          </div>

          {/* 1. Export Vocab */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <BookOpen size={14} className="text-blue-500" />
                Kho Từ Vựng HSK 1–9 ({vocabList.length.toLocaleString()} từ)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Bao gồm HSK level, chữ Hán, pinyin, nghĩa tiếng Việt và câu ví dụ.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={exportVocabCsv}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => downloadJson(vocabList, `hsk-vocab-backup-${Date.now()}.json`)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                JSON
              </button>
            </div>
          </div>

          {/* 2. Export Users */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users size={14} className="text-indigo-500" />
                Danh Sách Học Viên ({users.length} tài khoản)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Bao gồm thông tin hồ sơ, vai trò, chuỗi streak và trạng thái tài khoản.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={exportUsersCsv}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => downloadJson(users, `hsk-users-backup-${Date.now()}.json`)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                JSON
              </button>
            </div>
          </div>

          {/* 3. Export Audit Logs */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <History size={14} className="text-slate-500" />
                Nhật Ký Kiểm Toán ({logs.length} bản ghi)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Lưu vết toàn bộ biến động dữ liệu và thao tác quản trị.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => downloadJson(logs, `hsk-audit-logs-${Date.now()}.json`)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white transition-colors"
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Import Data Panel */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Upload size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Nhập Tệp Vào Hệ Thống (Import JSON)
            </h3>
          </div>

          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Upload size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Chọn tệp JSON từ máy tính của bạn
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cấu trúc tệp chứa mảng các từ vựng với các trường hanzi, pinyin, meaning, hskLevel.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
              <Upload size={14} />
              <span>Tải lên tệp JSON</span>
              <input
                type="file"
                accept=".json"
                disabled={importing}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {importStatus && (
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse pt-2">
                {importStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
