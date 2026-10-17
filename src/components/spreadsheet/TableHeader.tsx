'use client';

import React, { useState, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ColumnConfig, TableColumnId, FilterOptions } from '@/types/vocabulary';

interface TableHeaderProps {
  columns: ColumnConfig[];
  onColumnResize: (columnId: TableColumnId, newWidth: number) => void;
  filterOptions: FilterOptions;
  onSortChange: (sortBy: FilterOptions['sortBy']) => void;
}

export function TableHeader({
  columns,
  onColumnResize,
  filterOptions,
  onSortChange,
}: TableHeaderProps) {
  const [resizingCol, setResizingCol] = useState<TableColumnId | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent, column: ColumnConfig) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(column.id);
    startXRef.current = e.clientX;
    startWidthRef.current = column.width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(column.minWidth, startWidthRef.current + deltaX);
      onColumnResize(column.id, newWidth);
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getSortField = (colId: TableColumnId): FilterOptions['sortBy'] | null => {
    switch (colId) {
      case 'index':
        return 'index';
      case 'hanzi':
        return 'hanzi';
      case 'pinyin':
        return 'pinyin';
      case 'hanzi_status':
        return 'status';
      default:
        return null;
    }
  };

  return (
    <thead className="sticky top-0 z-20 bg-[#e2f0d9] dark:bg-zinc-950 select-none text-slate-800 dark:text-zinc-100 text-xs font-bold uppercase tracking-wider shadow-xs transition-colors">
      <tr>
        {columns
          .filter((col) => col.visible)
          .map((col) => {
            const sortField = getSortField(col.id);
            const isSorted = sortField && filterOptions.sortBy === sortField;

            return (
              <th
                key={col.id}
                style={{ width: `${col.width}px`, minWidth: `${col.minWidth}px` }}
                className={`relative px-3 py-2.5 text-${
                  col.align || 'left'
                } border-r border-b border-slate-300 dark:border-zinc-800 font-semibold text-slate-800 dark:text-zinc-100 ${
                  col.sticky ? 'sticky left-0 z-30 bg-[#e2f0d9] dark:bg-zinc-950' : ''
                }`}
              >
                <div
                  className={`flex items-center gap-1 ${
                    col.align === 'center'
                      ? 'justify-center'
                      : col.align === 'right'
                      ? 'justify-end'
                      : 'justify-start'
                  } ${sortField ? 'cursor-pointer hover:text-emerald-900' : ''}`}
                  onClick={() => sortField && onSortChange(sortField)}
                >
                  <span className="truncate">{col.label}</span>
                  {sortField && (
                    <span className="shrink-0 text-slate-500">
                      {isSorted ? (
                        filterOptions.sortOrder === 'asc' ? (
                          <ArrowUp size={12} className="text-emerald-700 font-bold" />
                        ) : (
                          <ArrowDown size={12} className="text-emerald-700 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown size={11} className="opacity-40 hover:opacity-100" />
                      )}
                    </span>
                  )}
                </div>

                {/* Resizing handle */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, col)}
                  className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-500 transition-colors ${
                    resizingCol === col.id ? 'bg-emerald-600 w-1.5' : ''
                  }`}
                  title="Kéo để chỉnh độ rộng cột"
                />
              </th>
            );
          })}
      </tr>
    </thead>
  );
}
