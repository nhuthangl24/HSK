'use client';

import React from 'react';
import {
  Layers,
  BookOpen,
  Compass,
  Award,
  TrendingUp,
  GraduationCap,
  Sparkles,
  Briefcase,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Star,
  Bookmark,
  Globe,
  User,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Deck, VocabItem } from '@/types/vocabulary';
import { isItemDueForReview } from '@/lib/srs';
import { isProtectedDeck } from '@/data/initial-decks';

interface SidebarProps {
  decks: Deck[];
  currentDeckId: string;
  activeQuickFilter?: 'due' | 'wrong' | 'favorite' | 'system' | 'custom' | 'completed' | 'all' | null;
  onSelectDeck: (deckId: string) => void;
  onOpenCreateDeck: () => void;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deck: Deck) => void;
  items: VocabItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onFilterQuick: (
    type: 'due' | 'wrong' | 'favorite' | 'system' | 'custom' | 'completed' | 'all'
  ) => void;
  isLoading?: boolean;
}

export function Sidebar({
  decks,
  currentDeckId,
  activeQuickFilter = 'all',
  onSelectDeck,
  onOpenCreateDeck,
  onEditDeck,
  onDeleteDeck,
  items,
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  onFilterQuick,
  isLoading = false,
}: SidebarProps) {
  const getDeckIcon = (deck: Deck, isSelectedInCollapsed = false) => {
    const iconClass = isSelectedInCollapsed ? 'text-white' : undefined;
    const size = isSelectedInCollapsed ? 18 : 16;
    switch (deck.hskLevel) {
      case 1:
        return <BookOpen size={size} className={iconClass || 'text-emerald-600 dark:text-emerald-400'} />;
      case 2:
        return <Compass size={size} className={iconClass || 'text-cyan-600 dark:text-cyan-400'} />;
      case 3:
        return <Award size={size} className={iconClass || 'text-amber-600 dark:text-amber-400'} />;
      case 4:
        return <TrendingUp size={size} className={iconClass || 'text-pink-600 dark:text-pink-400'} />;
      case 5:
        return <GraduationCap size={size} className={iconClass || 'text-purple-600 dark:text-purple-400'} />;
      case 6:
        return <Sparkles size={size} className={iconClass || 'text-rose-600 dark:text-rose-400'} />;
      default:
        if (deck.id === 'deck-business') {
          return <Briefcase size={size} className={iconClass || 'text-teal-600 dark:text-teal-400'} />;
        }
        if (deck.id === 'deck-all') {
          return <Layers size={size} className={iconClass || 'text-blue-600 dark:text-blue-400'} />;
        }
        return <Bookmark size={size} className={iconClass || 'text-emerald-600 dark:text-emerald-400'} />;
    }
  };

  const getDeckCount = (deckId: string) => {
    if (deckId === 'deck-all') return items.length;
    return items.filter((item) => item.deckId === deckId).length;
  };

  const dueCount = items.filter(isItemDueForReview).length;
  const favoriteCount = items.filter((i) => i.favorite).length;
  const systemCount = items.filter((i) => i.isSystem !== false).length;
  const customCount = items.filter((i) => i.isSystem === false).length;
  const completedCount = items.filter(
    (i) =>
      i.hanziStatus === 'correct' ||
      i.translationStatus === 'correct' ||
      !!(i.hanziPracticeInput && i.hanziPracticeInput.trim())
  ).length;

  const renderCount = (count: number) => {
    if (isLoading && items.length === 0) {
      return <span className="w-4 h-2.5 rounded bg-slate-300 dark:bg-slate-700 animate-pulse inline-block align-middle" />;
    }
    return count;
  };

  const renderContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors">
      {/* Header & Collapse toggle */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          <Bookmark size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>Bộ Từ Vựng HSK</span>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            title="Đóng menu"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors btn-press"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Thu nhỏ menu bên"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors btn-press"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Quick focus lists */}
      <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-2">
          Phân loại từ vựng
        </div>
        <div className="flex flex-col gap-0.5">
          {/* 1. Tất cả từ vựng */}
          <button
            type="button"
            onClick={() => {
              onFilterQuick('all');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all btn-press select-none ${
              activeQuickFilter === 'all'
                ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs border border-slate-300 dark:border-slate-700'
                : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {activeQuickFilter === 'all' && (
                <span className="w-1.5 h-3.5 rounded-full bg-slate-700 dark:bg-slate-300 shrink-0" />
              )}
              <BookOpen
                size={13}
                className={
                  activeQuickFilter === 'all'
                    ? 'text-slate-900 dark:text-white shrink-0'
                    : 'text-slate-500 dark:text-slate-400 shrink-0'
                }
              />
              <span className="truncate">Tất cả từ vựng</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
                activeQuickFilter === 'all'
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {renderCount(items.length)}
            </span>
          </button>

          {/* 2. Từ vựng hệ thống */}
          <button
            type="button"
            onClick={() => {
              onFilterQuick('system');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all btn-press select-none ${
              activeQuickFilter === 'system'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 font-bold shadow-2xs border border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400/40'
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {activeQuickFilter === 'system' && (
                <span className="w-1.5 h-3.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
              )}
              <Globe
                size={13}
                className={
                  activeQuickFilter === 'system'
                    ? 'text-emerald-700 dark:text-emerald-300 shrink-0'
                    : 'text-emerald-600 dark:text-emerald-400 shrink-0'
                }
              />
              <span className="truncate">Từ vựng hệ thống</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
                activeQuickFilter === 'system'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {renderCount(systemCount)}
            </span>
          </button>

          {/* 3. Từ cá nhân (Tự thêm) */}
          <button
            type="button"
            onClick={() => {
              onFilterQuick('custom');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all btn-press select-none ${
              activeQuickFilter === 'custom'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100 font-bold shadow-2xs border border-amber-300 dark:border-amber-800 ring-1 ring-amber-400/40'
                : 'hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {activeQuickFilter === 'custom' && (
                <span className="w-1.5 h-3.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />
              )}
              <User
                size={13}
                className={
                  activeQuickFilter === 'custom'
                    ? 'text-amber-700 dark:text-amber-300 shrink-0'
                    : 'text-amber-600 dark:text-amber-400 shrink-0'
                }
              />
              <span className="truncate">Từ cá nhân (Tự thêm)</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
                activeQuickFilter === 'custom'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              }`}
            >
              {renderCount(customCount)}
            </span>
          </button>

          {/* 4. Đã hoàn thành */}
          <button
            type="button"
            onClick={() => {
              onFilterQuick('completed');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all btn-press select-none ${
              activeQuickFilter === 'completed'
                ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 font-bold shadow-2xs border border-blue-300 dark:border-blue-700 ring-1 ring-blue-400/40'
                : 'hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-800 dark:hover:text-blue-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {activeQuickFilter === 'completed' && (
                <span className="w-1.5 h-3.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
              )}
              <CheckCircle2
                size={13}
                className={
                  activeQuickFilter === 'completed'
                    ? 'text-blue-700 dark:text-blue-300 shrink-0'
                    : 'text-blue-600 dark:text-blue-400 shrink-0'
                }
              />
              <span className="truncate">Đã hoàn thành</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
                activeQuickFilter === 'completed'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
              }`}
            >
              {renderCount(completedCount)}
            </span>
          </button>

          {/* 5. Đến hạn ôn lại */}
          <button
            type="button"
            onClick={() => {
              onFilterQuick('due');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all btn-press select-none ${
              activeQuickFilter === 'due'
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-950 dark:text-rose-100 font-bold shadow-2xs border border-rose-300 dark:border-rose-700 ring-1 ring-rose-400/40'
                : 'hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {activeQuickFilter === 'due' && (
                <span className="w-1.5 h-3.5 rounded-full bg-rose-600 dark:bg-rose-400 shrink-0" />
              )}
              <AlertTriangle
                size={13}
                className={
                  activeQuickFilter === 'due'
                    ? 'text-rose-700 dark:text-rose-400 shrink-0'
                    : 'text-rose-500 shrink-0'
                }
              />
              <span className="truncate">Đến hạn ôn lại</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
                activeQuickFilter === 'due'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
              }`}
            >
              {renderCount(dueCount)}
            </span>
          </button>

          {/* 6. Đã đánh dấu sao */}
          <button
            type="button"
            onClick={() => {
              onFilterQuick('favorite');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all btn-press select-none ${
              activeQuickFilter === 'favorite'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100 font-bold shadow-2xs border border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/40'
                : 'hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {activeQuickFilter === 'favorite' && (
                <span className="w-1.5 h-3.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />
              )}
              <Star
                size={13}
                className={
                  activeQuickFilter === 'favorite'
                    ? 'text-amber-600 fill-amber-500 shrink-0'
                    : 'text-amber-500 fill-amber-500 shrink-0'
                }
              />
              <span className="truncate">Đã đánh dấu sao</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
                activeQuickFilter === 'favorite'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              }`}
            >
              {renderCount(favoriteCount)}
            </span>
          </button>
        </div>
      </div>

      {/* Decks & Levels list */}
      <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-2.5 pt-1">
          Cấp độ chuẩn HSK
        </div>
        {decks
          .filter((d) => d.id !== 'deck-all' && (isProtectedDeck(d.id) || d.id === 'deck-business'))
          .map((deck) => {
            const isSelected = currentDeckId === deck.id && !activeQuickFilter;
            const count = getDeckCount(deck.id);
            const isProtected = isProtectedDeck(deck.id);

            return (
              <div
                key={deck.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectDeck(deck.id);
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectDeck(deck.id);
                    if (isMobile && onCloseMobile) onCloseMobile();
                  }
                }}
                className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all select-none ${
                  isSelected
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs border border-emerald-200 dark:border-emerald-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0 pr-1">
                  {getDeckIcon(deck)}
                  <span className="truncate">{deck.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                      isSelected
                        ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {renderCount(count)}
                  </span>

                  {!isProtected && (
                    <div className={`${isMobile ? 'flex' : 'hidden group-hover:flex'} items-center gap-0.5 animate-fadeIn`}>
                      {onEditDeck && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditDeck(deck);
                          }}
                          title={`Sửa tên bộ từ "${deck.name}"`}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 cursor-pointer transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {onDeleteDeck && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDeck(deck);
                          }}
                          title={`Xóa bộ từ "${deck.name}"`}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {/* Custom Decks Section (Per-User) */}
        {decks.some((d) => !isProtectedDeck(d.id) && d.id !== 'deck-business') && (
          <div className="pt-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-2.5 pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60">
              <span>Bộ từ cá nhân</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                {decks.filter((d) => !isProtectedDeck(d.id) && d.id !== 'deck-business').length}
              </span>
            </div>
            {decks
              .filter((d) => !isProtectedDeck(d.id) && d.id !== 'deck-business')
              .map((deck) => {
                const isSelected = currentDeckId === deck.id && !activeQuickFilter;
                const count = getDeckCount(deck.id);

                return (
                  <div
                    key={deck.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onSelectDeck(deck.id);
                      if (isMobile && onCloseMobile) onCloseMobile();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectDeck(deck.id);
                        if (isMobile && onCloseMobile) onCloseMobile();
                      }
                    }}
                    className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs border border-emerald-200 dark:border-emerald-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 pr-1">
                      {getDeckIcon(deck)}
                      <span className="truncate">{deck.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                          isSelected
                            ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {renderCount(count)}
                      </span>

                      <div className={`${isMobile ? 'flex' : 'hidden group-hover:flex'} items-center gap-0.5 animate-fadeIn`}>
                        {onEditDeck && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditDeck(deck);
                            }}
                            title={`Sửa tên bộ từ "${deck.name}"`}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 cursor-pointer transition-colors"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {onDeleteDeck && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDeck(deck);
                            }}
                            title={`Xóa bộ từ "${deck.name}"`}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Add new custom deck button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            onOpenCreateDeck();
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-slate-800/80 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 cursor-pointer transition-all btn-press"
        >
          <FolderPlus size={14} />
          <span>Tạo bộ từ mới</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (Overlay with backdrop) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-50 dark:bg-slate-900 z-50 md:hidden shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 animate-slideRight">
            {renderContent(true)}
          </aside>
        </>
      )}

      {/* Desktop Persistent Sidebar with Smooth Transition */}
      <aside
        className={`hidden md:flex ${
          collapsed ? 'w-16' : 'w-64'
        } bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 h-full overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] select-none`}
      >
        {collapsed ? (
          <div className="w-16 flex flex-col items-center py-3 gap-3 h-full animate-fadeIn">
            {/* Expand Toggle */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Mở rộng menu bên"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-all btn-press"
            >
              <ChevronRight size={18} />
            </button>

            <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />

            {/* Quick Actions in Collapsed Mode */}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => onFilterQuick('all')}
                title={`Tất cả từ vựng (${items.length})`}
                className={`p-2 rounded-xl cursor-pointer transition-all btn-press relative group ${
                  activeQuickFilter === 'all'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs scale-105 ring-2 ring-slate-400 dark:ring-slate-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen size={16} />
                <span className="sr-only">Tất cả từ vựng</span>
              </button>

              <button
                type="button"
                onClick={() => onFilterQuick('completed')}
                title={`Đã hoàn thành (${completedCount})`}
                className={`p-2 rounded-xl cursor-pointer transition-all btn-press relative group ${
                  activeQuickFilter === 'completed'
                    ? 'bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-300 dark:ring-blue-700'
                    : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                }`}
              >
                <CheckCircle2 size={16} />
                {completedCount > 0 && activeQuickFilter !== 'completed' && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onFilterQuick('due')}
                title={`Đến hạn ôn lại (${dueCount})`}
                className={`p-2 rounded-xl cursor-pointer transition-all btn-press relative group ${
                  activeQuickFilter === 'due'
                    ? 'bg-rose-600 text-white shadow-xs scale-105 ring-2 ring-rose-300 dark:ring-rose-700'
                    : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <AlertTriangle size={16} />
                {dueCount > 0 && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${activeQuickFilter === 'due' ? 'bg-white' : 'bg-rose-500'} animate-pulse`} />
                )}
              </button>

              <button
                type="button"
                onClick={() => onFilterQuick('favorite')}
                title={`Đã đánh dấu sao (${favoriteCount})`}
                className={`p-2 rounded-xl cursor-pointer transition-all btn-press relative group ${
                  activeQuickFilter === 'favorite'
                    ? 'bg-amber-500 text-white shadow-xs scale-105 ring-2 ring-amber-300 dark:ring-amber-700'
                    : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <Star size={16} className={activeQuickFilter === 'favorite' ? 'fill-white' : 'fill-amber-500'} />
              </button>
            </div>

            <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />

            {/* Deck Icons List in Collapsed Mode */}
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 px-2 py-1 w-full items-center">
              {decks
                .filter((d) => d.id !== 'deck-all')
                .map((deck) => {
                  const isSelected = currentDeckId === deck.id && !activeQuickFilter;
                  const count = getDeckCount(deck.id);

                  return (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => onSelectDeck(deck.id)}
                      title={`${deck.name} (${count} từ)`}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all btn-press relative ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-300 dark:ring-emerald-700'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {getDeckIcon(deck, isSelected)}
                    </button>
                  );
                })}
            </div>

            {/* Add Deck Button in Collapsed Mode */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 w-full flex justify-center">
              <button
                type="button"
                onClick={onOpenCreateDeck}
                title="Tạo bộ từ mới"
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-all btn-press"
              >
                <FolderPlus size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-fadeIn">
            {renderContent(false)}
          </div>
        )}
      </aside>
    </>
  );
}
