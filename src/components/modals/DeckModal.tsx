'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Edit2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Deck, HskLevel } from '@/types/vocabulary';
import { useAuth } from '@/context/AuthContext';

interface DeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDeck: (newDeck: Deck) => void;
  onUpdateDeck?: (updatedDeck: Deck) => void;
  deckToEdit?: Deck | null;
}

export function DeckModal({
  isOpen,
  onClose,
  onCreateDeck,
  onUpdateDeck,
  deckToEdit,
}: DeckModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isEditing = !!deckToEdit;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hskLevel, setHskLevel] = useState<HskLevel | 'custom' | 'all'>('custom');
  const [scope, setScope] = useState<'system' | 'user'>('user');

  useEffect(() => {
    if (deckToEdit) {
      setName(deckToEdit.name || '');
      setDescription(deckToEdit.description || '');
      setHskLevel(deckToEdit.hskLevel || 'custom');
      setScope(deckToEdit.scope === 'system' || deckToEdit.ownerId === 'system' ? 'system' : 'user');
    } else {
      setName('');
      setDescription('');
      setHskLevel('custom');
      setScope(isAdmin ? 'system' : 'user');
    }
  }, [deckToEdit, isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const chosenScope = isAdmin ? scope : (deckToEdit?.scope || 'user');
    const isSystemScope = chosenScope === 'system';

    if (isEditing && deckToEdit && onUpdateDeck) {
      const updated: Deck = {
        ...deckToEdit,
        name: name.trim(),
        description: description.trim() || undefined,
        hskLevel,
        scope: chosenScope,
        ownerId: isSystemScope ? 'system' : (deckToEdit.ownerId || user?.id),
        userId: isSystemScope ? 'system' : (deckToEdit.userId || user?.id),
        updatedAt: new Date().toISOString(),
      };
      onUpdateDeck(updated);
    } else {
      const newDeck: Deck = {
        id: `deck-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        hskLevel,
        scope: chosenScope,
        ownerId: isSystemScope ? 'system' : user?.id,
        userId: isSystemScope ? 'system' : user?.id,
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onCreateDeck(newDeck);
    }

    onClose();
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-scaleIn">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              {isEditing ? <Edit2 size={16} /> : <FolderPlus size={16} />}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Chỉnh Sửa Bộ Từ Vựng' : 'Tạo Bộ Từ Vựng Mới'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên bộ từ vựng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Từ vựng Du lịch, Thương mại, HSK 3..."
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mô tả ngắn
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú mục tiêu hoặc chủ đề của bộ từ này..."
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cấp độ quy chiếu
            </label>
            <select
              value={hskLevel}
              onChange={(e) => {
                const val = e.target.value;
                setHskLevel(val === 'custom' ? 'custom' : (Number(val) as HskLevel));
              }}
              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="custom">Chủ đề tự do (Custom)</option>
              {[1, 2, 3, 4, 5, 6].map((lvl) => (
                <option key={lvl} value={lvl}>
                  Quy chiếu HSK {lvl}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <label className="block font-semibold text-amber-900 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-600" />
                Phạm vi áp dụng (Quyền Quản trị viên)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('system')}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    scope === 'system'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <div>
                    <div className="font-semibold text-xs leading-tight">Toàn Hệ Thống</div>
                    <div className="text-[10px] opacity-80 leading-tight">Mọi học viên đều thấy</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('user')}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    scope === 'user'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <UserIcon size={14} />
                  <div>
                    <div className="font-semibold text-xs leading-tight">Cá Nhân Admin</div>
                    <div className="text-[10px] opacity-80 leading-tight">Chỉ mình bạn thấy</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer shadow-xs transition-colors"
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo bộ từ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
