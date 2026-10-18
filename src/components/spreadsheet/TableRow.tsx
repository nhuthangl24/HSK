'use client';

import React, { useState } from 'react';
import { Star, Edit2, Trash2, Eye, EyeOff, PenLine } from 'lucide-react';
import { VocabItem, ColumnConfig, StudyMode } from '@/types/vocabulary';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { tts } from '@/lib/tts';
import { HanziStatusBadge, TranslationStatusBadge } from '@/components/ui/StatusBadge';
import { CellHanziPractice } from './CellHanziPractice';
import { CellTranslatePractice } from './CellTranslatePractice';

interface TableRowProps {
  item: VocabItem;
  rowIndex: number;
  columns: ColumnConfig[];
  studyMode: StudyMode;
  onUpdate: (updatedItem: VocabItem) => void;
  onDeleteRequest: (item: VocabItem) => void;
  onEditRequest: (item: VocabItem) => void;
  onOpenStrokeOrder?: (item: VocabItem) => void;
  isGuest?: boolean;
  onRequireAuth?: () => void;
}

function TableRowComponent({
  item,
  rowIndex,
  columns,
  studyMode,
  onUpdate,
  onDeleteRequest,
  onEditRequest,
  onOpenStrokeOrder,
  isGuest,
  onRequireAuth,
}: TableRowProps) {
  const [isRevealedInRecall, setIsRevealedInRecall] = useState(false);
  const [editingField, setEditingField] = useState<keyof VocabItem | null>(null);
  const [fieldTempVal, setFieldTempVal] = useState<string>('');

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      onRequireAuth?.();
      return;
    }
    onUpdate({
      ...item,
      favorite: !item.favorite,
      updatedAt: new Date().toISOString(),
    });
  };

  const startInlineEdit = (field: keyof VocabItem, currentVal: string) => {
    if (isGuest) {
      onRequireAuth?.();
      return;
    }
    setEditingField(field);
    setFieldTempVal(currentVal);
  };

  const commitInlineEdit = (field: keyof VocabItem) => {
    if (editingField) {
      onUpdate({
        ...item,
        [field]: fieldTempVal.trim(),
        updatedAt: new Date().toISOString(),
      });
      setEditingField(null);
    }
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent, field: keyof VocabItem) => {
    if (e.key === 'Enter') {
      commitInlineEdit(field);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  // Determine if Hanzi should be hidden in Hanzi Recall Mode
  const isHanziHidden = studyMode === 'hanzi_recall' && !isRevealedInRecall;

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/60 transition-colors duration-150 ease-out border-b border-slate-200 dark:border-zinc-800/80 text-slate-800 dark:text-zinc-100 text-sm group">
      {columns
        .filter((col) => col.visible)
        .map((col) => {
          switch (col.id) {
            case 'index':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-2 text-center text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-white dark:bg-black group-hover:bg-slate-50/80 dark:group-hover:bg-zinc-900/60 sticky left-0 z-10 border-r border-slate-300 dark:border-zinc-800 align-middle transition-colors duration-150 ease-out"
                >
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      title={item.favorite ? 'Bỏ đánh dấu sao' : 'Đánh dấu từ quan trọng'}
                      className="cursor-pointer text-slate-300 hover:text-amber-400 p-0.5"
                    >
                      <Star
                        size={12}
                        className={
                          item.favorite ? 'text-amber-400 fill-amber-400' : ''
                        }
                      />
                    </button>
                    <span>{rowIndex + 1}</span>
                  </div>
                </td>
              );

            case 'hanzi':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-3 py-2 text-center border-r border-slate-300 dark:border-slate-800 align-middle"
                  onDoubleClick={() => startInlineEdit('hanzi', item.hanzi)}
                >
                  {editingField === 'hanzi' ? (
                    <input
                      type="text"
                      autoFocus
                      value={fieldTempVal}
                      onChange={(e) => setFieldTempVal(e.target.value)}
                      onBlur={() => commitInlineEdit('hanzi')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'hanzi')}
                      style={{ fontSize: 'var(--hanzi-size, 1.125rem)' }}
                      className="w-full text-center font-hanzi border border-blue-500 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white"
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      {isHanziHidden ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                            ***
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsRevealedInRecall(true)}
                            title="Hiện chữ Hán"
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              tts.speak(item.hanzi);
                            }}
                            style={{ fontSize: 'var(--hanzi-size, 1.125rem)' }}
                            className="font-hanzi font-medium text-slate-900 dark:text-white tracking-wide cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title="Bấm để nghe phát âm"
                          >
                            {item.hanzi}
                          </span>
                          <SpeakButton text={item.hanzi} size="sm" />
                          {item.isSystem === false && (
                            <span
                              className="text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 px-1 py-0.2 rounded font-sans font-semibold shrink-0"
                              title="Từ vựng cá nhân bạn tự thêm"
                            >
                              Cá nhân
                            </span>
                          )}
                          {studyMode === 'hanzi_recall' && isRevealedInRecall && (
                            <button
                              type="button"
                              onClick={() => setIsRevealedInRecall(false)}
                              title="Ẩn chữ Hán lại"
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                            >
                              <EyeOff size={12} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </td>
              );

            case 'pinyin':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-3 py-2 text-center font-pinyin text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-800 align-middle"
                  onDoubleClick={() => startInlineEdit('pinyin', item.pinyin)}
                >
                  {editingField === 'pinyin' ? (
                    <input
                      type="text"
                      autoFocus
                      value={fieldTempVal}
                      onChange={(e) => setFieldTempVal(e.target.value)}
                      onBlur={() => commitInlineEdit('pinyin')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'pinyin')}
                      style={{ fontSize: 'var(--pinyin-size, 0.875rem)' }}
                      className="w-full text-center font-pinyin border border-blue-500 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white"
                    />
                  ) : (
                    <span
                      style={{ fontSize: 'var(--pinyin-size, 0.875rem)' }}
                      className="text-emerald-800 dark:text-emerald-400 font-medium"
                    >
                      {item.pinyin}
                    </span>
                  )}
                </td>
              );

            case 'meaning':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-3 py-2 text-left border-r border-slate-300 dark:border-slate-800 align-middle"
                  onDoubleClick={() => startInlineEdit('meaning', item.meaning)}
                >
                  {editingField === 'meaning' ? (
                    <input
                      type="text"
                      autoFocus
                      value={fieldTempVal}
                      onChange={(e) => setFieldTempVal(e.target.value)}
                      onBlur={() => commitInlineEdit('meaning')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'meaning')}
                      style={{ fontSize: 'var(--meaning-size, 0.875rem)' }}
                      className="w-full text-left border border-blue-500 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white"
                    />
                  ) : (
                    <div className="flex flex-col">
                      <span
                        style={{ fontSize: 'var(--meaning-size, 0.875rem)' }}
                        className="font-normal text-slate-800 dark:text-slate-100 leading-snug"
                      >
                        {item.meaning}
                      </span>
                      {item.partOfSpeech && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          ({item.partOfSpeech})
                        </span>
                      )}
                    </div>
                  )}
                </td>
              );

            case 'stroke_order':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-1.5 text-center border-r border-slate-300 dark:border-slate-800 align-middle"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStrokeOrder?.(item);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition-all shadow-2xs hover:scale-102 cursor-pointer group"
                    title={`Xem cách viết & thứ tự nét chữ Hán: ${item.hanzi}`}
                  >
                    <PenLine size={12} className="text-emerald-600 dark:text-emerald-400 group-hover:rotate-12 transition-transform" />
                    <span>Cách viết</span>
                  </button>
                </td>
              );

            case 'hanzi_practice':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 align-middle"
                >
                  <CellHanziPractice
                    item={item}
                    onUpdate={onUpdate}
                    isRecallMode={studyMode === 'hanzi_recall'}
                    isGuest={isGuest}
                    onRequireAuth={onRequireAuth}
                  />
                </td>
              );

            case 'hanzi_status': {
              const hasTypedHanzi = !!item.hanziPracticeInput && item.hanziPracticeInput.trim().length > 0;
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-800 align-middle"
                >
                  {hasTypedHanzi ? (
                    <HanziStatusBadge status={item.hanziStatus} interactive={false} />
                  ) : (
                    <span
                      className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none"
                      title="Gõ chữ Hán vào ô luyện tập để hệ thống tự chấm kết quả"
                    >
                      —
                    </span>
                  )}
                </td>
              );
            }

            case 'example':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-3 py-2 text-left border-r border-slate-300 dark:border-slate-800 align-middle"
                  onDoubleClick={() => startInlineEdit('example', item.example)}
                >
                  {editingField === 'example' ? (
                    <input
                      type="text"
                      autoFocus
                      value={fieldTempVal}
                      onChange={(e) => setFieldTempVal(e.target.value)}
                      onBlur={() => commitInlineEdit('example')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'example')}
                      style={{ fontSize: 'var(--example-size, 0.8125rem)' }}
                      className="w-full text-left font-hanzi border border-blue-500 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white"
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <span
                        style={{ fontSize: 'var(--example-size, 0.8125rem)' }}
                        className="font-hanzi text-slate-900 dark:text-slate-100 leading-relaxed"
                      >
                        {item.example}
                      </span>
                      {item.example && <SpeakButton text={item.example} size="sm" />}
                    </div>
                  )}
                </td>
              );

            case 'example_pinyin':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-3 py-2 text-left font-pinyin text-slate-600 dark:text-slate-400 border-r border-slate-300 dark:border-slate-800 leading-relaxed align-middle"
                  onDoubleClick={() =>
                    startInlineEdit('examplePinyin', item.examplePinyin)
                  }
                >
                  {editingField === 'examplePinyin' ? (
                    <input
                      type="text"
                      autoFocus
                      value={fieldTempVal}
                      onChange={(e) => setFieldTempVal(e.target.value)}
                      onBlur={() => commitInlineEdit('examplePinyin')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'examplePinyin')}
                      style={{ fontSize: 'calc(var(--example-size, 0.8125rem) * 0.9)' }}
                      className="w-full text-left font-pinyin border border-blue-500 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white"
                    />
                  ) : (
                    <span style={{ fontSize: 'calc(var(--example-size, 0.8125rem) * 0.9)' }}>
                      {item.examplePinyin}
                    </span>
                  )}
                </td>
              );

            case 'example_meaning':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-3 py-2 text-left text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-800 leading-relaxed align-middle"
                  onDoubleClick={() =>
                    startInlineEdit('exampleMeaning', item.exampleMeaning)
                  }
                >
                  {editingField === 'exampleMeaning' ? (
                    <input
                      type="text"
                      autoFocus
                      value={fieldTempVal}
                      onChange={(e) => setFieldTempVal(e.target.value)}
                      onBlur={() => commitInlineEdit('exampleMeaning')}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'exampleMeaning')}
                      style={{ fontSize: 'var(--example-size, 0.8125rem)' }}
                      className="w-full text-left border border-blue-500 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white"
                    />
                  ) : (
                    <span style={{ fontSize: 'var(--example-size, 0.8125rem)' }}>
                      {item.exampleMeaning}
                    </span>
                  )}
                </td>
              );

            case 'translation_practice':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 align-middle"
                >
                  <CellTranslatePractice
                    item={item}
                    onUpdate={onUpdate}
                    isGuest={isGuest}
                    onRequireAuth={onRequireAuth}
                  />
                </td>
              );

            case 'translation_status': {
              const hasTypedTranslation = !!item.translationPracticeInput && item.translationPracticeInput.trim().length > 0;
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-800 align-middle"
                >
                  {hasTypedTranslation ? (
                    <TranslationStatusBadge
                      status={item.translationStatus}
                      interactive={false}
                    />
                  ) : (
                    <span
                      className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none"
                      title="Gõ câu dịch vào ô luyện tập để hệ thống tự chấm kết quả"
                    >
                      —
                    </span>
                  )}
                </td>
              );
            }

            case 'actions':
              return (
                <td
                  key={col.id}
                  style={{ width: `${col.width}px` }}
                  className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-800 align-middle"
                >
                  <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (isGuest) {
                          onRequireAuth?.();
                          return;
                        }
                        onEditRequest(item);
                      }}
                      title="Chỉnh sửa từ"
                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isGuest) {
                          onRequireAuth?.();
                          return;
                        }
                        onDeleteRequest(item);
                      }}
                      title="Xóa từ"
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              );

            default:
              return null;
          }
        })}
    </tr>
  );
}

export const TableRow = React.memo(TableRowComponent);
