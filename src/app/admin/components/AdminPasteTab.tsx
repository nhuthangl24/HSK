'use client';

import React, { useState } from 'react';
import { ClipboardPaste, Sparkles, CheckCircle2, AlertCircle, FileText, Download, ArrowRight, Shield } from 'lucide-react';
import BulkPasteModal from '@/components/modals/BulkPasteModal';

import { downloadSampleTemplate } from '@/lib/excel-io';

interface AdminPasteTabProps {
  onImportComplete?: () => void;
}

export default function AdminPasteTab({ onImportComplete }: AdminPasteTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const SAMPLE_DATA = `你好 | nǐ hǎo | Xin chào | 你好，很高兴认识你！ | Nǐ hǎo, hěn gāoxìng rènshí nǐ! | Xin chào, rất vui được gặp bạn!
谢谢 | xièxie | Cảm ơn | 谢谢你的帮助。 | Xièxie nǐ de bāngzhù. | Cảm ơn sự giúp đỡ của bạn.
再见 | zàijiàn | Tạm biệt | 明天见，再见！ | Míngtiān jiàn, zàijiàn! | Hẹn ngày mai gặp lại, tạm biệt!`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardPaste className="text-emerald-600 dark:text-emerald-400" size={22} />
            Công Cụ Nhập Liệu Hàng Loạt Bằng Paste (Bulk Paste Engine)
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Quy trình chuẩn hóa 10 bước: Tách cột thông minh, kiểm tra trùng lặp thời gian thực, bảng xem trước tương tác và phân phối vào đích lưu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadSampleTemplate('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
          >
            <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Mẫu Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => downloadSampleTemplate('csv')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
          >
            <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Mẫu CSV (.csv)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            <ClipboardPaste size={15} />
            <span>Mở giao diện Paste chuyên sâu</span>
          </button>
        </div>
      </div>

      {/* Feature Highlight Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-emerald-200">
            <Sparkles size={13} />
            <span>Được tối ưu cho dữ liệu lớn lên tới 500 từ/lần</span>
          </div>

          <h3 className="text-2xl font-black tracking-tight leading-snug">
            Nhập hàng trăm từ vựng tiếng Trung chỉ trong 3 giây
          </h3>

          <p className="text-xs text-emerald-100 leading-relaxed">
            Hỗ trợ sao chép trực tiếp từ Excel, Google Sheets, tệp văn bản hoặc từ điển trực tuyến. Hệ thống tự động phân tích cấu trúc, chuẩn hóa Pinyin và loại bỏ khoảng trắng thừa.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-white text-slate-900 hover:bg-emerald-50 rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs flex items-center gap-2"
            >
              <span>Bắt đầu dán từ ngay</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 10-Step Workflow Explanation Grid */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          Tiêu chuẩn định dạng &amp; Quy trình xử lý 10 bước (Khớp 100% cột web)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 space-y-2">
            <span className="font-bold text-slate-800 dark:text-zinc-200 block">Định dạng phân tách chuẩn (`|` hoặc Tab)</span>
            <code className="block p-3 rounded-lg bg-zinc-900 dark:bg-black text-emerald-300 font-mono text-xs overflow-x-auto whitespace-nowrap">
              Từ mới (Chữ Hán) | Phiên âm | Nghĩa tiếng Việt | Ví dụ (Chữ Hán) | Phiên âm ví dụ | Dịch câu ví dụ
            </code>
            <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed">
              Trong đó <strong>Từ mới, Phiên âm, Nghĩa tiếng Việt</strong> là 3 trường bắt buộc. Các cột câu ví dụ, phiên âm ví dụ và dịch nghĩa có thể bổ sung sau hoặc sao chép nguyên cột từ Excel.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 space-y-2">
            <span className="font-bold text-slate-800 dark:text-zinc-200 block">Dữ liệu mẫu thực tế</span>
            <pre className="p-3 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
              {SAMPLE_DATA}
            </pre>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
            <div className="font-bold text-slate-800 dark:text-zinc-200 mb-1">1. Lọc dòng trống &amp; Khoảng trắng</div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs">Tự động dọn dẹp các dòng trống hoặc khoảng cách thừa giữa các ký tự.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
            <div className="font-bold text-slate-800 dark:text-zinc-200 mb-1">2. Phát hiện từ trùng lặp</div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs">Kiểm tra so với cơ sở dữ liệu hiện tại để cảnh báo các chữ Hán đã có sẵn.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
            <div className="font-bold text-slate-800 dark:text-zinc-200 mb-1">3. Chỉnh sửa tương tác</div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs">Cho phép chỉnh sửa từng ô trực tiếp trên bảng xem trước trước khi bấm Nhập.</p>
          </div>
        </div>
      </div>

      {/* Render the Bulk Paste Engine Modal */}
      <BulkPasteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetScope="system"
        onImportSuccess={() => {
          setIsModalOpen(false);
          if (onImportComplete) onImportComplete();
        }}
      />
    </div>
  );
}
