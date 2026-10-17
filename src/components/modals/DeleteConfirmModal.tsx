'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { VocabItem } from '@/types/vocabulary';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: VocabItem | null;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  item,
}: DeleteConfirmModalProps) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-scaleIn">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900">
              Xác nhận xóa từ vựng?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có chắc chắn muốn xóa từ{' '}
              <span className="font-hanzi font-bold text-slate-800">
                &ldquo;{item.hanzi}&rdquo;
              </span>{' '}
              ({item.meaning})? Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold cursor-pointer shadow-xs"
          >
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  );
}
