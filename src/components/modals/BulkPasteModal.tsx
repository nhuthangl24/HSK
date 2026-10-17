'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  Edit2,
  Trash2,
  ChevronDown,
  Copy,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { VocabItem, Deck, Topic, CustomHskGroup } from '@/types/vocabulary';
import { downloadSampleTemplate } from '@/lib/excel-io';
import { getClientAuthHeaders } from '@/lib/client-auth';
import { batchSaveWordsToFirestore } from '@/lib/firebase-db';
import { getFirebaseServices } from '@/lib/firebase';

export interface ParsedPasteLine {
  id: string;
  lineNum: number;
  selected: boolean;
  hskLevel?: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  examplePinyin: string;
  exampleMeaning: string;
  partOfSpeech?: string;
  notes?: string;
  status: 'valid' | 'invalid' | 'duplicate';
  statusMsg?: string;
}

import { INITIAL_DECKS } from '@/data/initial-decks';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onImportSuccess?: (newWords?: VocabItem[]) => void;
  targetScope?: 'system' | 'user' | 'personal';
  decks?: Deck[];
  topics?: Topic[];
  customGroups?: CustomHskGroup[];
  adminUserList?: Array<{ id: string; name: string; email: string }>;
}

const SAMPLE_TEMPLATE = `爱 | ài | Yêu, thương | 爸爸爱妈妈。 | Bàba ài māma. | Bố yêu mẹ.
八 | bā | Số tám (8) | 他买了八个苹果。 | Tā mǎile bā gè píngguǒ. | Anh ấy đã mua 8 quả táo.
白天 | báitiān | Ban ngày | 你白天还要去上课。 | Nǐ báitiān hái yào qù shàngkè. | Ban ngày bạn còn phải đi học.
安排 | ānpái | Sắp xếp, bố trí | 我已经安排好了明天的会议。 | Wǒ yǐjīng ānpái hǎole míngtiān de huìyì. | Tôi đã sắp xếp xong cuộc họp ngày mai.`;

export function BulkPasteModal({
  isOpen,
  onClose,
  onSuccess,
  onImportSuccess,
  targetScope: initialTargetScope,
  decks = INITIAL_DECKS,
  topics = [],
  customGroups = [],
  adminUserList = [],
}: BulkPasteModalProps) {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedLines, setParsedLines] = useState<ParsedPasteLine[]>([]);

  // AI Prompt Box State
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiPromptTopic, setAiPromptTopic] = useState('20 từ vựng HSK 3 thông dụng nhất kèm ví dụ thực tế');

  const generatedAiPrompt = useMemo(() => {
    return `Hãy đóng vai một chuyên gia giáo dục tiếng Trung Quốc. Hãy tạo cho tôi danh sách từ vựng theo định dạng phân tách bằng dấu gạch đứng " | " để nhập trực tiếp vào hệ thống học từ vựng HSK.

Yêu cầu định dạng bắt buộc:
1. Mỗi từ vựng nằm trên ĐÚNG 1 dòng riêng biệt.
2. Mỗi dòng gồm đúng 6 trường thông tin, ngăn cách bằng ký tự " | " (dấu cách - gạch đứng - dấu cách):
Từ mới (Chữ Hán) | Phiên âm Pinyin (có dấu thanh điệu chuẩn) | Nghĩa tiếng Việt | Câu ví dụ (Chữ Hán) | Phiên âm câu ví dụ | Dịch câu ví dụ tiếng Việt

3. QUY TẮC CẦN TUÂN THỦ NGHIÊM NGẶT:
- KHÔNG đánh số thứ tự đầu dòng (không dùng 1., 2., 3., - hoặc *).
- KHÔNG tạo bảng markdown (|---|---|), KHÔNG dùng code block phức tạp.
- KHÔNG viết lời chào, lời mở đầu hoặc kết luận. CHỈ XUẤT RA CÁC DÒNG DỮ LIỆU THÔ.

Ví dụ mẫu chuẩn:
爱 | ài | Yêu, thương | 爸爸爱妈妈。 | Bàba ài māma. | Bố yêu mẹ.
八 | bā | Số tám (8) | 他买了八个苹果。 | Tā mǎile bā gè píngguǒ. | Anh ấy đã mua 8 quả táo.
白天 | báitiān | Ban ngày | 你白天还要去上课。 | Nǐ báitiān hái yào qù shàngkè. | Ban ngày bạn còn phải đi học.
安排 | ānpái | Sắp xếp, bố trí | 我已经安排好了明天的会议。 | Wǒ yǐjīng ānpái hǎole míngtiān de huìyì. | Tôi đã sắp xếp xong cuộc họp ngày mai.

Chủ đề / Yêu cầu cụ thể của tôi:
${aiPromptTopic.trim() || '20 từ vựng tiếng Trung thông dụng kèm câu ví dụ thực tế'}`;
  }, [aiPromptTopic]);

  const handleCopyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedAiPrompt);
      setCopiedPrompt(true);
      toast.success('Đã sao chép Prompt! Hãy dán vào ChatGPT / Claude / Gemini / DeepSeek.');
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      toast.error('Không thể sao chép tự động. Vui lòng chọn văn bản và copy thủ công.');
    }
  };

  // Target Destination
  const [targetScope, setTargetScope] = useState<'personal' | 'system' | 'user_workspace'>(
    initialTargetScope === 'system' ? 'system' : initialTargetScope === 'user' ? 'personal' : (isAdmin ? 'system' : 'personal')
  );
  const [targetDeckId, setTargetDeckId] = useState<string>('deck-hsk1');
  const [targetTopicId, setTargetTopicId] = useState<string>('');
  const [targetUserId, setTargetUserId] = useState<string>('');

  // Execution state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalLines: number;
    addedCount: number;
    skippedCount: number;
    failedCount: number;
    skippedDetails: Array<{ line: number; hanzi: string; reason: string }>;
    errors: Array<{ line: number; raw: string; error: string }>;
  } | null>(null);

  if (!isOpen) return null;

  // Step 1: Parse Text
  const handleParseText = () => {
    if (!rawText.trim()) {
      toast.warning('Vui lòng dán nội dung từ vựng vào ô nhập.');
      return;
    }

    const lines = rawText.split(/\r?\n/);
    const results: ParsedPasteLine[] = [];
    const seenHanzi = new Set<string>();

    lines.forEach((lineStr, idx) => {
      const lineNum = idx + 1;
      const clean = lineStr.trim();
      if (!clean) return; // skip empty lines

      // Delimiter detection: Tab or Pipe '|'
      const delimiter = clean.includes('\t') ? '\t' : '|';
      const rawParts = clean.split(delimiter).map((s) => s.trim());

      // If user copied header row (e.g. STT, Cấp HSK, Từ mới...), skip it
      const headerStr = rawParts.join(' ').toLowerCase();
      if (
        (headerStr.includes('tu moi') || headerStr.includes('hanzi') || headerStr.includes('chu han') || headerStr.includes('tu vung')) &&
        (headerStr.includes('phien am') || headerStr.includes('pinyin')) &&
        (headerStr.includes('nghia') || headerStr.includes('meaning'))
      ) {
        return;
      }

      const parts = [...rawParts];
      let hskLevel: number | undefined = undefined;

      // Check if first column is STT (pure number) when >= 5 columns
      if (parts.length >= 5 && /^\d+$/.test(parts[0]) && !/[\u4e00-\u9fa5]/.test(parts[0])) {
        parts.shift();
      }

      // Check if first column is HSK level (e.g. "HSK 1", "HSK1", "1", "2")
      if (
        parts.length >= 4 &&
        /^(hsk\s*[1-9]|[1-9])$/i.test(parts[0]) &&
        !/[\u4e00-\u9fa5]/.test(parts[0])
      ) {
        const num = parseInt(parts[0].replace(/\D/g, ''), 10);
        if (num >= 1 && num <= 9) {
          hskLevel = num;
        }
        parts.shift();
      }

      let hanzi = '';
      let pinyin = '';
      let meaning = '';
      let example = '';
      let examplePinyin = '';
      let exampleMeaning = '';
      let partOfSpeech = '';
      let notes = '';

      // Backward compatibility check for legacy format:
      // hanzi | pinyin | partOfSpeech | meaning | example | notes
      const isLegacySix =
        parts.length >= 6 &&
        (
          /^(động từ|danh từ|tính từ|phó từ|số từ|lượng từ|đại từ|giới từ|liên từ|trợ từ|thán từ|v|n|adj|adv)$/i.test(parts[2]) ||
          /[\u4e00-\u9fa5]/.test(parts[4])
        );

      if (isLegacySix) {
        hanzi = parts[0] || '';
        pinyin = parts[1] || '';
        partOfSpeech = parts[2] || '';
        meaning = parts[3] || '';
        example = parts[4] || '';
        notes = parts[5] || '';
      } else {
        // Standard Web Table columns:
        // [0] hanzi (Từ mới)
        // [1] pinyin (Phiên âm)
        // [2] meaning (Nghĩa tiếng Việt)
        // [3] example (Ví dụ Chữ Hán)
        // [4] examplePinyin (Phiên âm ví dụ)
        // [5] exampleMeaning (Dịch câu ví dụ)
        // [6] notes (Ghi chú - nếu có)
        hanzi = parts[0] || '';
        pinyin = parts[1] || '';
        meaning = parts[2] || '';
        example = parts[3] || '';
        examplePinyin = parts[4] || '';
        exampleMeaning = parts[5] || '';
        notes = parts[6] || '';
      }

      let status: 'valid' | 'invalid' | 'duplicate' = 'valid';
      let statusMsg = '';

      if (!hanzi || !pinyin || !meaning) {
        status = 'invalid';
        statusMsg = 'Thiếu trường bắt buộc (Cần tối thiểu: Chữ Hán | Pinyin | Nghĩa)';
      } else if (seenHanzi.has(hanzi)) {
        status = 'duplicate';
        statusMsg = 'Trùng lặp với dòng trước trong danh sách dán';
      } else {
        seenHanzi.add(hanzi);
      }

      results.push({
        id: `line-${lineNum}-${Date.now()}-${idx}`,
        lineNum,
        selected: status === 'valid',
        hskLevel,
        hanzi,
        pinyin,
        partOfSpeech,
        meaning,
        example,
        examplePinyin,
        exampleMeaning,
        notes,
        status,
        statusMsg,
      });
    });

    if (results.length === 0) {
      toast.warning('Không tìm thấy dòng dữ liệu nào.');
      return;
    }

    setParsedLines(results);
    setStep('preview');
  };

  // Step 2: Update row inline
  const handleRowChange = (id: string, field: keyof ParsedPasteLine, value: unknown) => {
    setParsedLines((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Re-validate if core fields edited
          if (field === 'hanzi' || field === 'pinyin' || field === 'meaning') {
            if (updated.hanzi.trim() && updated.pinyin.trim() && updated.meaning.trim()) {
              updated.status = 'valid';
              updated.statusMsg = undefined;
            } else {
              updated.status = 'invalid';
              updated.statusMsg = 'Thiếu trường bắt buộc (Chữ Hán, Phiên âm, Nghĩa)';
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setParsedLines((prev) =>
      prev.map((line) => ({
        ...line,
        selected: checked && line.status !== 'invalid',
      }))
    );
  };

  // Counts
  const validCount = parsedLines.filter((l) => l.status === 'valid').length;
  const invalidCount = parsedLines.filter((l) => l.status === 'invalid').length;
  const duplicateCount = parsedLines.filter((l) => l.status === 'duplicate').length;
  const selectedCount = parsedLines.filter((l) => l.selected).length;

  // Step 3: Execute Import
  const handleExecuteImport = async () => {
    const selectedItems = parsedLines.filter((l) => l.selected && l.status !== 'invalid');
    if (selectedItems.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một dòng hợp lệ để nhập.');
      return;
    }

    setImporting(true);
    try {
      const payload = {
        items: selectedItems.map((item) => ({
          hanzi: item.hanzi,
          pinyin: item.pinyin,
          meaning: item.meaning,
          example: item.example,
          examplePinyin: item.examplePinyin,
          exampleMeaning: item.exampleMeaning,
          partOfSpeech: item.partOfSpeech,
          notes: item.notes,
          hskLevel: item.hskLevel,
          deckId: targetDeckId || undefined,
          topicId: targetTopicId || undefined,
        })),
        targetScope,
        targetDeckId,
        targetTopicId,
        targetUserId: targetScope === 'user_workspace' ? targetUserId : undefined,
      };

      const authHeaders = getClientAuthHeaders(user);

      const res = await fetch('/api/vocab/paste', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setImportResult(data);
        setStep('result');
        toast.success(`Đã nhập thành công ${data.addedCount} từ vựng!`, 'Hoàn thành nhập');

        // Sync added items to Firestore so they are persistently loaded on user reload
        if (getFirebaseServices().isConfigured && data.items && data.items.length > 0 && user) {
          const syncUserId = targetScope === 'system' ? 'system' : user.id;
          batchSaveWordsToFirestore(data.items, syncUserId).catch((err) =>
            console.error('Auto-sync paste to Firestore notice:', err)
          );
        }

        if (onSuccess) onSuccess();
        if (onImportSuccess) onImportSuccess(data.items);
      } else {
        toast.error(data.message || 'Nhập từ vựng thất bại.');
      }
    } catch {
      toast.error('Có lỗi kết nối đến máy chủ khi lưu từ vựng.');
    } finally {
      setImporting(false);
    }
  };

  // Download error report
  const handleDownloadReport = () => {
    if (!importResult) return;
    const lines = [
      'BÁO CÁO KẾT QUẢ NHẬP TỪ VỰNG HÀNG LOẠT',
      `Thời gian: ${new Date().toLocaleString('vi-VN')}`,
      `Tổng số dòng: ${importResult.totalLines}`,
      `Thành công: ${importResult.addedCount}`,
      `Bỏ qua (Trùng lặp): ${importResult.skippedCount}`,
      `Lỗi cú pháp: ${importResult.failedCount}`,
      '----------------------------------------',
      'CHI TIẾT DÒNG BỎ QUA:',
      ...importResult.skippedDetails.map((s) => `Dòng ${s.line}: [${s.hanzi}] - ${s.reason}`),
      '----------------------------------------',
      'CHI TIẾT DÒNG LỖI:',
      ...importResult.errors.map((e) => `Dòng ${e.line}: [${e.raw}] - ${e.error}`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao_cao_nhap_tu_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Clipboard size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Nhập Từ Vựng Hàng Loạt (Paste Engine)
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Khớp bảng từ vựng
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dán văn bản phân tách bằng dấu gạch đứng <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">|</code> hoặc sao chép trực tiếp từ Excel / Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'input'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              1
            </span>
            <span className={step === 'input' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}>
              Dán dữ liệu
            </span>
            <ArrowRight size={13} className="text-slate-300 mx-1" />
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'preview'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={step === 'preview' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}>
              Xem trước & Chọn đích lưu
            </span>
            <ArrowRight size={13} className="text-slate-300 mx-1" />
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'result'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={step === 'result' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}>
              Kết quả & Báo cáo
            </span>
          </div>

          {step === 'input' && (
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_TEMPLATE)}
              className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
            >
              <Sparkles size={12} />
              Dán mẫu thử nghiệm
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: RAW INPUT */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info size={14} className="text-emerald-700 dark:text-emerald-400" />
                    <span>Quy ước định dạng chuẩn (Khớp 100% cột web):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate('xlsx')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs cursor-pointer transition-colors"
                    >
                      <Download size={11} />
                      Tải mẫu Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate('csv')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-[11px] shadow-2xs cursor-pointer transition-colors"
                    >
                      <Download size={11} />
                      Tải mẫu CSV (.csv)
                    </button>
                  </div>
                </div>
                <code className="block bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl font-mono text-[11px] border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 overflow-x-auto whitespace-nowrap">
                  Từ mới (Chữ Hán) | Phiên âm | Nghĩa tiếng Việt | Ví dụ (Chữ Hán) | Phiên âm ví dụ | Dịch câu ví dụ
                </code>
                <div className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
                  • <strong>Bắt buộc tối thiểu 3 trường:</strong> Chữ Hán | Phiên âm | Nghĩa tiếng Việt.<br />
                  • <strong>Hỗ trợ sao chép từ Excel:</strong> Tự động nhận diện Tab hoặc dấu gạch đứng <code className="bg-emerald-100/60 dark:bg-emerald-900/60 px-1 rounded">|</code>. Có thể dán thêm cột Cấp HSK ở đầu nếu muốn.
                </div>
              </div>

              {/* COLLAPSIBLE AI PROMPT BOX */}
              <div className="border border-purple-200 dark:border-purple-800/70 rounded-2xl overflow-hidden bg-purple-50/40 dark:bg-purple-950/20 shadow-2xs transition-all">
                <button
                  type="button"
                  onClick={() => setShowAiPrompt((prev) => !prev)}
                  className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                      <Bot size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                          Sao chép câu lệnh Prompt gửi AI (ChatGPT, Claude, Gemini, DeepSeek...)
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-purple-200/80 dark:bg-purple-800/80 text-purple-800 dark:text-purple-200">
                          Tiện ích
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-700/80 dark:text-purple-400 mt-0.5">
                        Dùng câu lệnh này để AI tự tạo danh sách từ vựng chuẩn 100% định dạng, chỉ cần sao chép kết quả và dán vào ô bên dưới.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                      {showAiPrompt ? 'Thu gọn' : 'Mở xem prompt'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-purple-700 dark:text-purple-300 transition-transform duration-300 ease-in-out ${
                        showAiPrompt ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    showAiPrompt
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-4 pt-1 border-t border-purple-200/70 dark:border-purple-800/60 space-y-3">
                      {/* Topic Customizer */}
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                          Chủ đề hoặc số lượng từ bạn muốn AI tạo:
                        </label>
                        <input
                          type="text"
                          value={aiPromptTopic}
                          onChange={(e) => setAiPromptTopic(e.target.value)}
                          placeholder="Ví dụ: 30 từ HSK 3 chủ đề đi du lịch, 50 từ vựng kinh doanh..."
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-200 font-medium"
                        />
                        {/* Quick Preset Pills */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                          <span className="text-purple-700 dark:text-purple-400 font-semibold">Gợi ý nhanh:</span>
                          {[
                            '20 từ HSK 1-2 cơ bản hàng ngày',
                            '30 từ HSK 3 chủ đề Du lịch & Khách sạn',
                            '30 từ HSK 4 chủ đề Ẩm thực & Mua sắm',
                            '25 từ chủ đề Phỏng vấn & Công sở',
                            '20 từ chủ đề Sức khỏe & Y tế',
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setAiPromptTopic(preset)}
                              className="px-2 py-0.5 rounded-lg bg-purple-100/70 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-800 dark:text-purple-300 cursor-pointer transition-colors"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Prompt Box */}
                      <div className="relative">
                        <pre className="p-3 bg-slate-900 text-slate-100 dark:bg-black/80 rounded-xl text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border border-purple-900/30">
                          {generatedAiPrompt}
                        </pre>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                        <div className="text-[11px] text-purple-700 dark:text-purple-400">
                          Sau khi AI trả lời, chỉ cần <strong>sao chép toàn bộ kết quả</strong> và dán vào ô nhập bên dưới.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyAiPrompt}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${
                              copiedPrompt
                                ? 'bg-emerald-600 text-white'
                                : 'bg-purple-700 hover:bg-purple-800 text-white'
                            }`}
                          >
                            {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedPrompt ? 'Đã sao chép prompt!' : 'Sao chép Prompt gửi AI'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Nội dung văn bản cần nhập:
                </label>
                <textarea
                  rows={10}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Dán các dòng từ vựng vào đây...&#10;爱 | ài | Yêu, thương | 爸爸爱妈妈。 | Bàba ài māma. | Bố yêu mẹ.&#10;八 | bā | Số tám (8) | 他买了八个苹果。 | Tā mǎile bā gè píngguǒ. | Anh ấy đã mua 8 quả táo.`}
                  className="w-full p-4 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 leading-relaxed resize-y"
                />
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & TARGET SELECTION */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* Summary Stats Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Tổng cộng: <strong>{parsedLines.length} dòng</strong>
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> {validCount} hợp lệ
                  </span>
                  {duplicateCount > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle size={13} /> {duplicateCount} trùng lặp
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle size={13} /> {invalidCount} thiếu thông tin
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
                  >
                    Chọn tất cả hợp lệ
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] text-slate-500 hover:underline cursor-pointer font-medium"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              {/* Destination Selector */}
              <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Chọn nơi lưu dữ liệu:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Scope Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Phạm vi lưu trữ *
                    </label>
                    <select
                      value={targetScope}
                      onChange={(e) => setTargetScope(e.target.value as typeof targetScope)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer font-medium text-slate-800 dark:text-slate-200"
                    >
                      {isAdmin && (
                        <option value="system">Kho từ vựng chuẩn Hệ Thống (Dùng chung toàn bộ học viên)</option>
                      )}
                      <option value="personal">Kho từ vựng Cá Nhân của tôi (Độc lập, riêng tư)</option>
                      {isAdmin && adminUserList.length > 0 && (
                        <option value="user_workspace">Nhập vào không gian của học viên cụ thể</option>
                      )}
                    </select>
                  </div>

                  {/* Target HSK Deck */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Bộ từ vựng / Cấp HSK đích
                    </label>
                    <select
                      value={targetDeckId}
                      onChange={(e) => setTargetDeckId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="deck-all">Tất cả từ vựng (Chung)</option>
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                      {customGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          [Nhóm riêng] {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Topic */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Gắn chủ đề (Tùy chọn)
                    </label>
                    <select
                      value={targetTopicId}
                      onChange={(e) => setTargetTopicId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="">Không phân chủ đề</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.scope === 'system' ? 'Hệ thống' : 'Cá nhân'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* If Admin importing into specific user */}
                {isAdmin && targetScope === 'user_workspace' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Chọn tài khoản học viên đích *
                    </label>
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Chọn học viên --</option>
                      {adminUserList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Editable Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCount > 0 && selectedCount === validCount}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="rounded text-emerald-600 cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2.5 w-12 text-center">STT</th>
                        <th className="px-3 py-2.5 min-w-[120px]">Từ mới (Chữ Hán) *</th>
                        <th className="px-3 py-2.5 min-w-[130px]">Phiên âm *</th>
                        <th className="px-3 py-2.5 min-w-[170px]">Nghĩa tiếng Việt *</th>
                        <th className="px-3 py-2.5 min-w-[180px]">Ví dụ (Chữ Hán)</th>
                        <th className="px-3 py-2.5 min-w-[180px]">Phiên âm ví dụ</th>
                        <th className="px-3 py-2.5 min-w-[180px]">Dịch câu ví dụ</th>
                        <th className="px-3 py-2.5 w-24 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {parsedLines.map((line) => (
                        <tr
                          key={line.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            line.status === 'invalid'
                              ? 'bg-rose-50/30 dark:bg-rose-950/20'
                              : line.status === 'duplicate'
                              ? 'bg-amber-50/30 dark:bg-amber-950/20'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={line.selected}
                              disabled={line.status === 'invalid'}
                              onChange={(e) => handleRowChange(line.id, 'selected', e.target.checked)}
                              className="rounded text-emerald-600 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-slate-400">
                            {line.lineNum}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.hanzi}
                              onChange={(e) => handleRowChange(line.id, 'hanzi', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg font-hanzi font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 text-xs"
                              placeholder="Chữ Hán"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.pinyin}
                              onChange={(e) => handleRowChange(line.id, 'pinyin', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 text-xs"
                              placeholder="Pinyin"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.meaning}
                              onChange={(e) => handleRowChange(line.id, 'meaning', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white bg-white dark:bg-slate-800 text-xs font-medium"
                              placeholder="Nghĩa"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.example}
                              onChange={(e) => handleRowChange(line.id, 'example', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 text-xs font-hanzi"
                              placeholder="Ví dụ chữ Hán"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.examplePinyin}
                              onChange={(e) => handleRowChange(line.id, 'examplePinyin', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 text-xs"
                              placeholder="Phiên âm ví dụ"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.exampleMeaning}
                              onChange={(e) => handleRowChange(line.id, 'exampleMeaning', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 text-xs"
                              placeholder="Dịch câu ví dụ"
                            />
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {line.status === 'valid' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Hợp lệ
                              </span>
                            )}
                            {line.status === 'duplicate' && (
                              <span
                                title={line.statusMsg}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 cursor-help"
                              >
                                Trùng lặp
                              </span>
                            )}
                            {line.status === 'invalid' && (
                              <span
                                title={line.statusMsg}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 cursor-help"
                              >
                                Lỗi dữ liệu
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT & REPORT */}
          {step === 'result' && importResult && (
            <div className="space-y-5">
              <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Đã hoàn tất xử lý nhập dữ liệu
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Dữ liệu đã được kiểm tra, chuẩn hóa và ghi thành công vào cơ sở dữ liệu.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Tổng dòng</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {importResult.totalLines}
                  </div>
                </div>
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Đã thêm</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {importResult.addedCount}
                  </div>
                </div>
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xs">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase">Bỏ qua</div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                    {importResult.skippedCount}
                  </div>
                </div>
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-2xs">
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase">Lỗi dòng</div>
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                    {importResult.failedCount}
                  </div>
                </div>
              </div>

              {/* Detailed Lists if any skipped or failed */}
              {(importResult.skippedDetails.length > 0 || importResult.errors.length > 0) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Chi tiết dòng không thể nhập:
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      <Download size={13} />
                      Tải báo cáo chi tiết (.txt)
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono">
                    {importResult.skippedDetails.map((s, i) => (
                      <div key={i} className="text-amber-700 dark:text-amber-300">
                        • Dòng {s.line} [{s.hanzi}]: {s.reason}
                      </div>
                    ))}
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="text-rose-600 dark:text-rose-400">
                        • Dòng {e.line}: {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleParseText}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <Sparkles size={14} />
                <span>Phân tích dữ liệu & Xem trước</span>
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Quay lại sửa văn bản
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || selectedCount === 0}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                <Upload size={14} />
                <span>
                  {importing
                    ? 'Đang nạp vào cơ sở dữ liệu...'
                    : `Xác nhận nhập ${selectedCount} từ đã chọn`}
                </span>
              </button>
            </>
          )}

          {step === 'result' && (
            <div className="flex justify-end w-full gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setRawText('');
                  setParsedLines([]);
                  setImportResult(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Nhập danh sách khác
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Đóng & Xem từ vựng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkPasteModal;

