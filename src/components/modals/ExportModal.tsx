'use client';

import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { VocabItem, Deck } from '@/types/vocabulary';
import { exportVocabulary } from '@/lib/excel-io';
import { useToast } from '@/context/ToastContext';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredItems: VocabItem[];
  allDeckItems: VocabItem[];
  currentDeck: Deck;
}

export function ExportModal({
  isOpen,
  onClose,
  filteredItems,
  allDeckItems,
  currentDeck,
}: ExportModalProps) {
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const toast = useToast();

  if (!isOpen) return null;

  const targetItems = scope === 'filtered' ? filteredItems : allDeckItems;

  const handleExport = () => {
    if (targetItems.length === 0) {
      toast.warning('Không có từ vựng nào để xuất!', 'Danh sách rỗng');
      return;
    }
    exportVocabulary(targetItems, currentDeck.name, format);
    toast.success(`Đã xuất ${targetItems.length} từ sang định dạng .${format}`, 'Xuất file thành công');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scaleIn">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-700 flex items-center justify-center text-white">
              <Download size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Xuất Bảng Từ Vựng
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Format selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[11px]">
              Định dạng tệp
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-all ${
                  format === 'xlsx'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileSpreadsheet size={20} className="text-emerald-700" />
                <div className="text-left">
                  <div>Excel Workbook</div>
                  <div className="text-[10px] text-slate-500">.xlsx (chuẩn bảng tính)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-all ${
                  format === 'csv'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileText size={20} className="text-blue-700" />
                <div className="text-left">
                  <div>CSV (UTF-8 BOM)</div>
                  <div className="text-[10px] text-slate-500">.csv (mở được tiếng Việt)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Scope selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[11px]">
              Phạm vi xuất
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                  className="text-emerald-600"
                />
                <span className="text-slate-800">
                  Chỉ các từ đang hiển thị theo bộ lọc ({filteredItems.length} từ)
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="text-emerald-600"
                />
                <span className="text-slate-800">
                  Toàn bộ từ trong bộ &ldquo;{currentDeck.name}&rdquo; ({allDeckItems.length} từ)
                </span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Download size={14} />
              Tải tệp xuống ({targetItems.length} từ)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
