'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  VocabItem,
  ColumnConfig,
  TableColumnId,
  StudyMode,
  FilterOptions,
} from '@/types/vocabulary';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { FileQuestion, RotateCcw } from 'lucide-react';

interface SpreadsheetTableProps {
  items: VocabItem[];
  allCount?: number;
  columns: ColumnConfig[];
  studyMode: StudyMode;
  filterOptions: FilterOptions;
  onColumnResize: (columnId: TableColumnId, newWidth: number) => void;
  onSortChange: (sortBy: FilterOptions['sortBy']) => void;
  onUpdateItem: (item: VocabItem) => void;
  onDeleteItem: (item: VocabItem) => void;
  onEditItem: (item: VocabItem) => void;
  onClearFilters: () => void;
  isGuest?: boolean;
  onRequireAuth?: () => void;
  isLoading?: boolean;
}

const ROW_HEIGHT = 45; // Average row height in pixels for data-dense spreadsheet
const OVERSCAN = 20;   // Buffer rows rendered above and below viewport

export function SpreadsheetTable({
  items,
  allCount,
  columns,
  studyMode,
  filterOptions,
  onColumnResize,
  onSortChange,
  onUpdateItem,
  onDeleteItem,
  onEditItem,
  onClearFilters,
  isGuest,
  onRequireAuth,
  isLoading = false,
}: SpreadsheetTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  // Monitor scroll and container height with requestAnimationFrame throttle (60-120 FPS)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setViewportHeight(el.clientHeight || 800);

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (el) {
            setScrollTop(el.scrollTop);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleResize = () => {
      if (el) {
        setViewportHeight(el.clientHeight || 800);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Reset scroll to top when user searches or applies a new filter
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [
    filterOptions.searchQuery,
    filterOptions.hskLevel,
    filterOptions.hanziStatus,
    filterOptions.favoriteOnly,
    filterOptions.onlyDueForReview,
    filterOptions.wordSource,
    filterOptions.completedOnly,
    filterOptions.sortBy,
    filterOptions.sortOrder,
  ]);

  const totalCount = items.length;
  const isVirtual = totalCount > 50;

  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight, visibleItems } = useMemo(() => {
    if (!isVirtual) {
      return {
        startIndex: 0,
        endIndex: totalCount,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        visibleItems: items,
      };
    }

    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(totalCount, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);

    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: start * ROW_HEIGHT,
      bottomSpacerHeight: Math.max(0, (totalCount - end) * ROW_HEIGHT),
      visibleItems: items.slice(start, end),
    };
  }, [isVirtual, totalCount, scrollTop, viewportHeight, items]);

  const visibleColCount = useMemo(() => columns.filter((col) => col.visible).length, [columns]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 w-full overflow-auto bg-white dark:bg-black border-t border-slate-200 dark:border-zinc-800 relative select-text"
      style={{ willChange: 'scroll-position' }}
    >
      {isLoading ? (
        <div className="w-full h-full flex flex-col bg-white dark:bg-black select-none animate-fadeIn">
          {/* Subtle status loader banner */}
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Đang tải và đồng bộ danh mục từ vựng HSK...</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              Khởi tạo dữ liệu
            </span>
          </div>

          {/* Shimmer Table */}
          <div className="flex-1 overflow-hidden">
            <table className="sheet-grid-table w-full text-left border-collapse min-w-max">
              <TableHeader
                columns={columns}
                onColumnResize={onColumnResize}
                filterOptions={filterOptions}
                onSortChange={onSortChange}
              />
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 bg-white dark:bg-black">
                {Array.from({ length: 14 }).map((_, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-200 dark:border-slate-800">
                    {columns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <td
                          key={col.id}
                          style={{ width: `${col.width}px` }}
                          className="px-3 py-2.5 align-middle"
                        >
                          <div
                            className={`h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse ${
                              col.id === 'index'
                                ? 'w-6 mx-auto'
                                : col.id === 'hanzi'
                                ? 'w-12 mx-auto h-5'
                                : col.id === 'pinyin'
                                ? 'w-16 mx-auto'
                                : col.id === 'meaning'
                                ? 'w-36'
                                : col.id === 'example'
                                ? 'w-48'
                                : 'w-20'
                            }`}
                          />
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400 h-96">
          <FileQuestion size={44} className="text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
            {allCount === 0 || (!filterOptions.searchQuery && filterOptions.hskLevel === 'all' && filterOptions.hanziStatus === 'all' && filterOptions.translationStatus === 'all' && !filterOptions.favoriteOnly && !filterOptions.onlyDueForReview && filterOptions.wordSource === 'all' && !filterOptions.completedOnly)
              ? 'Chưa có từ vựng nào trong kho dữ liệu'
              : 'Không tìm thấy từ vựng phù hợp'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            {allCount === 0 || (!filterOptions.searchQuery && filterOptions.hskLevel === 'all' && filterOptions.hanziStatus === 'all' && filterOptions.translationStatus === 'all' && !filterOptions.favoriteOnly && !filterOptions.onlyDueForReview && filterOptions.wordSource === 'all' && !filterOptions.completedOnly)
              ? 'Kho từ vựng hiện đang trống. Nhấn "+ Thêm từ" hoặc "Nhập file" ở thanh công cụ để bắt đầu học.'
              : 'Không có từ vựng nào khớp với từ khóa tìm kiếm hoặc điều kiện lọc hiện tại.'}
          </p>
          {(filterOptions.searchQuery || filterOptions.hskLevel !== 'all' || filterOptions.hanziStatus !== 'all' || filterOptions.translationStatus !== 'all' || filterOptions.favoriteOnly || filterOptions.onlyDueForReview || filterOptions.wordSource !== 'all' || filterOptions.completedOnly) && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium cursor-pointer transition-colors border border-slate-300 dark:border-slate-700"
            >
              <RotateCcw size={13} />
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <table className="sheet-grid-table w-full text-left border-collapse min-w-max">
          <TableHeader
            columns={columns}
            onColumnResize={onColumnResize}
            filterOptions={filterOptions}
            onSortChange={onSortChange}
          />
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 bg-white dark:bg-black">
            {topSpacerHeight > 0 && (
              <tr style={{ height: `${topSpacerHeight}px` }} aria-hidden="true">
                <td
                  colSpan={visibleColCount}
                  style={{ height: `${topSpacerHeight}px`, padding: 0, border: 0, pointerEvents: 'none' }}
                />
              </tr>
            )}

            {visibleItems.map((item, localIdx) => {
              const rowIndex = startIndex + localIdx;
              return (
                <TableRow
                  key={item.id}
                  item={item}
                  rowIndex={rowIndex}
                  columns={columns}
                  studyMode={studyMode}
                  onUpdate={onUpdateItem}
                  onDeleteRequest={onDeleteItem}
                  onEditRequest={onEditItem}
                  isGuest={isGuest}
                  onRequireAuth={onRequireAuth}
                />
              );
            })}

            {bottomSpacerHeight > 0 && (
              <tr style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true">
                <td
                  colSpan={visibleColCount}
                  style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: 0, pointerEvents: 'none' }}
                />
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
