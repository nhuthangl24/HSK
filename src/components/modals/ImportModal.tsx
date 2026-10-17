'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Download,
} from 'lucide-react';
import {
  VocabItem,
  Deck,
  HskLevel,
} from '@/types/vocabulary';
import {
  parseImportFile,
  downloadSampleTemplate,
  ImportPreviewResult,
  DuplicateHandling,
} from '@/lib/excel-io';
import { createInitialSrs } from '@/lib/srs';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (newItems: VocabItem[], updatedItems: VocabItem[]) => void;
  existingItems: VocabItem[];
  currentDeckId: string;
  decks: Deck[];
}

export function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
  existingItems,
  currentDeckId,
  decks,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [targetDeckId, setTargetDeckId] = useState(
    currentDeckId === 'deck-all' ? 'deck-hsk1' : currentDeckId
  );
  const [targetHsk, setTargetHsk] = useState<HskLevel>(1);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<DuplicateHandling>('skip');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg('');
    setIsProcessing(true);

    try {
      const res = await parseImportFile(
        selectedFile,
        existingItems,
        targetDeckId,
        targetHsk
      );
      setPreview(res);
      if (res.errors.length > 0) {
        setErrorMsg(res.errors.join('; '));
      }
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg('Không thể đọc tệp này. Vui lòng kiểm tra định dạng CSV hoặc Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!preview || preview.validItems.length === 0) return;

    const toAdd: VocabItem[] = [];
    const toUpdate: VocabItem[] = [];

    // Duplicate lookup map
    const existingMap = new Map(existingItems.map((i) => [i.hanzi.trim(), i]));

    for (const item of preview.validItems) {
      if (!item.hanzi) continue;
      const hanziKey = item.hanzi.trim();
      const existing = existingMap.get(hanziKey);

      if (existing) {
        if (duplicateAction === 'skip') {
          // Skip
          continue;
        } else if (duplicateAction === 'overwrite') {
          toUpdate.push({
            ...existing,
            pinyin: item.pinyin || existing.pinyin,
            meaning: item.meaning || existing.meaning,
            example: item.example || existing.example,
            examplePinyin: item.examplePinyin || existing.examplePinyin,
            exampleMeaning: item.exampleMeaning || existing.exampleMeaning,
            notes: item.notes || existing.notes,
            hskLevel: item.hskLevel || existing.hskLevel,
            deckId: targetDeckId,
            updatedAt: new Date().toISOString(),
          });
        } else if (duplicateAction === 'keep_both') {
          toAdd.push({
            id: `vocab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            deckId: targetDeckId,
            hskLevel: item.hskLevel || targetHsk,
            hanzi: item.hanzi,
            pinyin: item.pinyin || '',
            meaning: item.meaning || '',
            example: item.example || '',
            examplePinyin: item.examplePinyin || '',
            exampleMeaning: item.exampleMeaning || '',
            notes: item.notes || '',
            hanziStatus: 'unlearned',
            translationStatus: 'unanswered',
            srs: createInitialSrs(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        // Brand new item
        toAdd.push({
          id: `vocab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          deckId: targetDeckId,
          hskLevel: item.hskLevel || targetHsk,
          hanzi: item.hanzi,
          pinyin: item.pinyin || '',
          meaning: item.meaning || '',
          example: item.example || '',
          examplePinyin: item.examplePinyin || '',
          exampleMeaning: item.exampleMeaning || '',
          notes: item.notes || '',
          hanziStatus: 'unlearned',
          translationStatus: 'unanswered',
          srs: createInitialSrs(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    onImportComplete(toAdd, toUpdate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-scaleIn">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-700 flex items-center justify-center text-white">
              <Upload size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Nhập Từ Vựng Hàng Loạt (Excel / CSV)
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

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Target Deck selector */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lưu vào bộ từ
              </label>
              <select
                value={targetDeckId}
                onChange={(e) => setTargetDeckId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800"
              >
                {decks
                  .filter((d) => d.id !== 'deck-all')
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cấp HSK mặc định
              </label>
              <select
                value={targetHsk}
                onChange={(e) => setTargetHsk(Number(e.target.value) as HskLevel)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    HSK {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample Template Download Card */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Download size={14} className="text-emerald-700" />
                <span>Tải file mẫu để nhập liệu chuẩn 100%:</span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Các cột chuẩn khớp bảng từ vựng:{' '}
              <span className="font-semibold text-emerald-950">
                STT | Cấp HSK | Từ mới (Chữ Hán) | Phiên âm | Nghĩa tiếng Việt | Ví dụ (Chữ Hán) | Phiên âm ví dụ | Dịch câu ví dụ
              </span>
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => downloadSampleTemplate('xlsx')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Download size={13} />
                <span>Tải file mẫu Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadSampleTemplate('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Download size={13} />
                <span>Tải file mẫu CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
            <FileSpreadsheet size={32} className="mx-auto text-emerald-600 mb-2" />
            <div className="text-xs font-semibold text-slate-800">
              {isProcessing
                ? 'Đang phân tích tệp dữ liệu...'
                : file
                ? file.name
                : 'Nhấn để chọn tệp hoặc kéo thả file vào đây'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Hỗ trợ định dạng Excel (.xlsx, .xls) và CSV UTF-8
            </div>
          </div>

          {/* Preview Analysis */}
          {preview && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                <div>
                  <span className="font-semibold text-slate-700">Tổng số dòng đọc được: </span>
                  <span className="font-bold text-slate-900">{preview.totalRows}</span>
                </div>
                <div>
                  <span className="font-semibold text-emerald-700">Hợp lệ: </span>
                  <span className="font-bold text-emerald-800">{preview.validItems.length}</span>
                </div>
                <div>
                  <span className="font-semibold text-amber-700">Trùng lặp: </span>
                  <span className="font-bold text-amber-800">{preview.duplicates.length}</span>
                </div>
              </div>

              {/* Duplicate Handling radio group */}
              {preview.duplicates.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>
                      Phát hiện {preview.duplicates.length} từ đã có trong kho từ:
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-800 italic">
                    Ví dụ: {preview.duplicates.slice(0, 5).map(d => d.existing.hanzi).join(', ')}...
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAction"
                        checked={duplicateAction === 'skip'}
                        onChange={() => setDuplicateAction('skip')}
                        className="text-emerald-600"
                      />
                      <span>Bỏ qua từ trùng (Chỉ nhập {preview.newItems.length} từ mới)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAction"
                        checked={duplicateAction === 'overwrite'}
                        onChange={() => setDuplicateAction('overwrite')}
                        className="text-emerald-600"
                      />
                      <span>Ghi đè / Cập nhật nội dung cho từ trùng</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAction"
                        checked={duplicateAction === 'keep_both'}
                        onChange={() => setDuplicateAction('keep_both')}
                        className="text-emerald-600"
                      />
                      <span>Thêm tất cả (Bao gồm cả từ trùng)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

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
              disabled={!preview || preview.validItems.length === 0}
              onClick={handleConfirmImport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              Tiến hành nhập dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
