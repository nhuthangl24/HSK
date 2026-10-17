'use client';

import React, { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  VocabItem,
  Deck,
  ColumnConfig,
  TableColumnId,
  StudyMode,
  FilterOptions,
} from '@/types/vocabulary';
import {
  getStoredDecks,
  saveStoredDecks,
  getStoredColumns,
  saveStoredColumns,
  getStoredVocab,
  saveStoredVocab,
  DEFAULT_COLUMNS,
} from '@/lib/storage';
import { calculateDeckStats, isItemDueForReview } from '@/lib/srs';
import { matchesSearchQuery } from '@/lib/pinyin-utils';
import { INITIAL_DECKS, isProtectedDeck } from '@/data/initial-decks';

// Context Providers
import { useToast } from '@/context/ToastContext';
import { useAuth, getCachedUser } from '@/context/AuthContext';

// Layout components
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';

// Spreadsheet components
import { TableToolbar } from '@/components/spreadsheet/TableToolbar';
import { SpreadsheetTable } from '@/components/spreadsheet/SpreadsheetTable';

// Modals & Study modes
import { SmartReviewModal } from '@/components/study-modes/SmartReviewModal';
import { MeaningReviewModal } from '@/components/study-modes/MeaningReviewModal';
import { AddWordModal } from '@/components/modals/AddWordModal';
import { EditWordModal } from '@/components/modals/EditWordModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { ImportModal } from '@/components/modals/ImportModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { DeckModal } from '@/components/modals/DeckModal';
import { AuthModal } from '@/components/modals/AuthModal';
import UserSettingsModal from '@/components/modals/UserSettingsModal';
import BulkPasteModal from '@/components/modals/BulkPasteModal';
import { getClientAuthHeaders } from '@/lib/client-auth';

import { getFirebaseServices } from '@/lib/firebase';
import {
  loadVocabularyForUser,
  saveWordToFirestore,
  batchSaveWordsToFirestore,
  deleteWordFromFirestore,
  saveDeckToFirestore,
  deleteDeckFromFirestore,
  loadDecksForUser,
  saveUserProgressToFirestore,
  batchSaveUserProgressToFirestore,
} from '@/lib/firebase-db';


const emptySubscribe = () => () => {};

function MainApp() {
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const isGuest = !isAuthenticated || !user;
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [items, setItems] = useState<VocabItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const cachedUser = getCachedUser();
    return getStoredVocab(cachedUser?.id);
  });
  const [isLoadingVocab, setIsLoadingVocab] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const cachedUser = getCachedUser();
    const cached = getStoredVocab(cachedUser?.id);
    return cached.length === 0;
  });
  const [decks, setDecks] = useState<Deck[]>(() => {
    if (typeof window === 'undefined') return INITIAL_DECKS;
    const cachedUser = getCachedUser();
    return getStoredDecks(cachedUser?.id);
  });
  const [currentDeckId, setCurrentDeckId] = useState<string>('deck-all');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    return typeof window !== 'undefined' ? getStoredColumns() : DEFAULT_COLUMNS;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Load user sidebar preference (default collapsed)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hsk_sidebar_collapsed');
      if (stored !== null) {
        setSidebarCollapsed(stored === 'true');
      }
    }
  }, []);

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Study Mode
  const [studyMode, setStudyMode] = useState<StudyMode>('full_table');

  // Filters & Sorting
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    hskLevel: 'all',
    hanziStatus: 'all',
    translationStatus: 'all',
    favoriteOnly: false,
    onlyDueForReview: false,
    wordSource: 'all',
    completedOnly: false,
    sortBy: 'index',
    sortOrder: 'asc',
  });

  // Modal states
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<VocabItem | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
  const [isSmartReviewOpen, setIsSmartReviewOpen] = useState(false);
  const [isMeaningReviewOpen, setIsMeaningReviewOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);

  const currentUserId = user?.id;

  // Strictly isolate decks per user account:
  // When logged out (guest) -> only INITIAL_DECKS are shown.
  // When logged in -> INITIAL_DECKS + decks created by this user.
  useEffect(() => {
    const userDecks = getStoredDecks(currentUserId);
    setDecks(userDecks);

    // If active deck is a custom deck that doesn't belong to current user, reset to 'deck-all'
    if (!userDecks.some((d) => d.id === currentDeckId)) {
      setCurrentDeckId('deck-all');
    }

    // Sync user's custom decks from Firestore if online
    if (getFirebaseServices().isConfigured) {
      loadDecksForUser(currentUserId)
        .then((remoteDecks) => {
          if (remoteDecks && remoteDecks.length > 0) {
            setDecks(remoteDecks);
            saveStoredDecks(remoteDecks, currentUserId);
          }
        })
        .catch((err) => console.warn('Deck sync notice:', err));
    }

    const handleDecksUpdated = () => {
      const refreshed = getStoredDecks(currentUserId);
      setDecks(refreshed);
    };
    window.addEventListener('hsk_decks_updated', handleDecksUpdated);
    return () => {
      window.removeEventListener('hsk_decks_updated', handleDecksUpdated);
    };
  }, [currentUserId]);


  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  // Ultra-fast vocabulary loader: Instant display from cache + background Firestore sync (< 100ms)
  const loadVocabData = useCallback(async (uid?: string) => {
    // Strictly isolate: base system words in clean initial state (NO foreign user inputs/results)
    let currentCleanSystemWords = itemsRef.current
      .filter((w) => w.isSystem !== false)
      .map((w) => ({
        ...w,
        hanziPracticeInput: '',
        hanziStatus: 'unlearned' as const,
        translationPracticeInput: '',
        translationStatus: 'unanswered' as const,
        favorite: false,
        notes: '',
      }));

    // Step 1: If system words not in memory yet (first visit on clean browser), fetch fast system vocab
    if (currentCleanSystemWords.length === 0) {
      setIsLoadingVocab(true);
      try {
        const localRes = await fetch('/api/vocab');
        if (localRes.ok) {
          const localData = await localRes.json();
          if (localData.items && localData.items.length > 0) {
            currentCleanSystemWords = localData.items
              .filter((w: VocabItem) => w.isSystem !== false)
              .map((w: VocabItem) => ({
                ...w,
                hanziPracticeInput: '',
                hanziStatus: 'unlearned' as const,
                translationPracticeInput: '',
                translationStatus: 'unanswered' as const,
                favorite: false,
                notes: '',
              }));
            setItems(currentCleanSystemWords);
            saveStoredVocab(currentCleanSystemWords);
            setFirestoreError(null);
          }
        }
      } catch (localErr) {
        console.warn('Fast vocab fetch notice:', localErr);
      }
    }

    // If guest (logged out), strictly show ONLY clean unlearned system words
    if (!uid) {
      if (getFirebaseServices().isConfigured) {
        try {
          const res = await loadVocabularyForUser(undefined, currentCleanSystemWords);
          if (!res.error && res.items && res.items.length > 0) {
            const cleanGuests = res.items.filter((w) => w.isSystem !== false);
            setItems(cleanGuests);
            setIsLoadingVocab(false);
            return;
          }
        } catch (err) {
          console.warn('Guest Firestore sync notice:', err);
        }
      }
      setItems(currentCleanSystemWords);
      setIsLoadingVocab(false);
      return;
    }

    // Step 2: Background sync user learning progress & custom words from Firestore (< 100ms)
    if (getFirebaseServices().isConfigured) {
      try {
        const res = await loadVocabularyForUser(uid, currentCleanSystemWords);
        if (!res.error && res.items && res.items.length > 0) {
          // Strictly isolate: only system words or this user's custom words
          const sanitized = res.items.filter((w) => w.isSystem !== false || w.userId === uid);
          setFirestoreError(null);
          setItems(sanitized);
          saveStoredVocab(sanitized, uid);
        }
      } catch (err) {
        console.warn('Firestore sync notice:', err);
      }
    } else {
      // Fallback: load user personal words and progress from server DB
      try {
        const authHeaders = getClientAuthHeaders(user);
        const res = await fetch('/api/vocab', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const sanitized = data.items.filter((w: VocabItem) => w.isSystem !== false || w.userId === uid);
            setFirestoreError(null);
            setItems(sanitized);
            saveStoredVocab(sanitized, uid);
          }
        }
      } catch (err) {
        console.warn('Server vocab sync notice:', err);
      }
    }

    setIsLoadingVocab(false);
  }, [user]);

  // Immediately switch client state whenever logged in user changes
  useEffect(() => {
    const userCached = getStoredVocab(currentUserId);
    if (userCached.length > 0) {
      setItems(userCached);
    } else {
      // If no cache, keep only system words in clean unlearned state
      setItems((prev) =>
        prev
          .filter((w) => w.isSystem !== false)
          .map((w) => ({
            ...w,
            hanziPracticeInput: '',
            hanziStatus: 'unlearned',
            translationPracticeInput: '',
            translationStatus: 'unanswered',
            favorite: false,
            notes: '',
          }))
      );
    }
    loadVocabData(currentUserId);
  }, [currentUserId, loadVocabData]);

  const loadVocabFromFirebase = useCallback(() => {
    return loadVocabData(currentUserId);
  }, [currentUserId, loadVocabData]);

  const handleUpdateItem = useCallback(
    (updated: VocabItem) => {
      if (isGuest) {
        setIsAuthModalOpen(true);
        return;
      }
      setItems((prev) => {
        const next = prev.map((i) => (i.id === updated.id ? updated : i));
        saveStoredVocab(next, user?.id);
        return next;
      });

      if (getFirebaseServices().isConfigured) {
        // Save vocabulary document if custom or if user is admin
        if (updated.isSystem === false || (user?.role === 'admin' && updated.isSystem)) {
          saveWordToFirestore(updated, user?.id).catch((err) =>
            console.error('Auto-sync word to Firestore failed:', err)
          );
        }

        // Save user personal progress to Firestore
        if (user) {
          saveUserProgressToFirestore(user.id, updated.id, {
            hanziPracticeInput: updated.hanziPracticeInput,
            hanziStatus: updated.hanziStatus,
            translationPracticeInput: updated.translationPracticeInput,
            translationStatus: updated.translationStatus,
            favorite: updated.favorite,
            notes: updated.notes,
            srs: updated.srs,
          }).catch((err) => console.error('Auto-sync progress to Firestore failed:', err));
        }
      }
    },
    [isGuest, user]
  );

  const handleBatchUpdate = (updatedList: VocabItem[]) => {
    if (isGuest) {
      setIsAuthModalOpen(true);
      return;
    }
    const updatedMap = new Map(updatedList.map((i) => [i.id, i]));
    const next = items.map((i) => (updatedMap.has(i.id) ? updatedMap.get(i.id)! : i));
    setItems(next);
    saveStoredVocab(next, user?.id);
    toast.success(`Đã cập nhật tiến độ ôn tập cho ${updatedList.length} từ!`, 'Lưu phiên ôn tập');

    if (getFirebaseServices().isConfigured && user) {
      const records = updatedList.map((item) => ({
        vocabId: item.id,
        hanziPracticeInput: item.hanziPracticeInput,
        hanziStatus: item.hanziStatus,
        translationPracticeInput: item.translationPracticeInput,
        translationStatus: item.translationStatus,
        favorite: item.favorite,
        notes: item.notes,
        srs: item.srs,
      }));
      batchSaveUserProgressToFirestore(user.id, records).catch((err) =>
        console.error('Auto-sync batch progress to Firestore failed:', err)
      );
    }
  };

  const handleAddItem = (newItem: VocabItem) => {
    if (isGuest || !user) {
      setIsAuthModalOpen(true);
      return;
    }
    const itemWithUser: VocabItem = {
      ...newItem,
      isSystem: user.role === 'admin' ? (newItem.isSystem ?? false) : false,
      userId: user.role === 'admin' && newItem.isSystem ? 'system' : user.id,
    };
    const next = [itemWithUser, ...items];
    setItems(next);
    saveStoredVocab(next, user.id);

    if (getFirebaseServices().isConfigured) {
      saveWordToFirestore(itemWithUser, user.id)
        .then(() => {
          toast.success(`Đã lưu "${newItem.hanzi}" vào Firestore thành công!`, 'Thêm thành công');
        })
        .catch((err) => {
          console.error('Auto-sync new word to Firestore failed:', err);
          toast.error('Lưu từ vựng vào Firestore thất bại.', 'Lỗi lưu trữ');
        });
    }
  };

  const handleDeleteItem = () => {
    if (isGuest || !user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!deletingItem) return;
    const deletedId = deletingItem.id;
    const deletedWord = deletingItem.hanzi;
    const next = items.filter((i) => i.id !== deletedId);
    setItems(next);
    saveStoredVocab(next, user.id);
    setDeletingItem(null);
    toast.success(`Đã xóa từ vựng "${deletedWord}" khỏi danh sách`, 'Đã xóa');

    if (getFirebaseServices().isConfigured) {
      deleteWordFromFirestore(deletedId).catch((err) =>
        console.error('Auto-sync delete from Firestore failed:', err)
      );
    }
  };

  const handleImportComplete = (newItems: VocabItem[], updatedItems: VocabItem[]) => {
    if (isGuest || !user) {
      setIsAuthModalOpen(true);
      return;
    }
    const userNewItems = newItems.map((item) => ({
      ...item,
      isSystem: user.role === 'admin' ? (item.isSystem ?? false) : false,
      userId: user.role === 'admin' && item.isSystem ? 'system' : user.id,
    }));
    const updatedMap = new Map(updatedItems.map((i) => [i.id, i]));
    const remaining = items.map((i) => (updatedMap.has(i.id) ? updatedMap.get(i.id)! : i));
    const next = [...userNewItems, ...remaining];
    setItems(next);
    saveStoredVocab(next, user.id);
    toast.success(`Đã nhập ${userNewItems.length} từ mới và cập nhật ${updatedItems.length} từ!`, 'Nhập file hoàn tất');

    const allToSave = [...userNewItems, ...updatedItems];
    if (getFirebaseServices().isConfigured && allToSave.length > 0) {
      batchSaveWordsToFirestore(allToSave, user.id).catch((err) =>
        console.error('Auto-sync imported words to Firestore failed:', err)
      );
    }
  };

  const handleCreateDeck = (newDeck: Deck) => {
    if (isGuest || !user) {
      setIsAuthModalOpen(true);
      toast.info('Vui lòng đăng nhập để tạo và lưu bộ từ vựng cá nhân của bạn.', 'Yêu cầu đăng nhập');
      return;
    }
    const isSystemScope = (newDeck.scope === 'system' || newDeck.ownerId === 'system') && user.role === 'admin';
    const deckWithOwner: Deck = {
      ...newDeck,
      ownerId: isSystemScope ? 'system' : user.id,
      userId: isSystemScope ? 'system' : user.id,
      scope: isSystemScope ? 'system' : 'user',
      isBuiltIn: false,
    };
    const next = [...decks, deckWithOwner];
    setDecks(next);
    saveStoredDecks(next, user.id);
    setCurrentDeckId(deckWithOwner.id);
    toast.success(
      isSystemScope
        ? `Đã tạo thư mục hệ thống: "${deckWithOwner.name}" (đồng bộ toàn bộ học viên)`
        : `Đã tạo bộ từ mới: "${deckWithOwner.name}"`,
      'Tạo bộ từ'
    );
    if (getFirebaseServices().isConfigured) {
      saveDeckToFirestore(deckWithOwner, deckWithOwner.userId).catch((err) =>
        console.error('Auto-sync deck to Firestore failed:', err)
      );
    }
  };

  const handleUpdateDeck = (updatedDeck: Deck) => {
    if (isProtectedDeck(updatedDeck.id)) {
      toast.error('Các cấp độ HSK 1 - HSK 6 và Tất cả từ vựng là cố định của hệ thống, không thể chỉnh sửa.', 'Không thể sửa');
      return;
    }
    if (isGuest || !user) {
      setIsAuthModalOpen(true);
      return;
    }
    const isSystemScope = (updatedDeck.scope === 'system' || updatedDeck.ownerId === 'system') && user.role === 'admin';
    const deckWithOwner: Deck = {
      ...updatedDeck,
      ownerId: isSystemScope ? 'system' : (updatedDeck.ownerId || user.id),
      userId: isSystemScope ? 'system' : (updatedDeck.userId || user.id),
      scope: isSystemScope ? 'system' : 'user',
    };
    const next = decks.map((d) => (d.id === updatedDeck.id ? deckWithOwner : d));
    setDecks(next);
    saveStoredDecks(next, user.id);
    setEditingDeck(null);
    toast.success(`Đã cập nhật bộ từ "${updatedDeck.name}"!`, 'Cập nhật bộ từ');
    if (getFirebaseServices().isConfigured) {
      saveDeckToFirestore(deckWithOwner, deckWithOwner.userId).catch((err) =>
        console.warn('Auto-sync deck to Firestore notice:', err)
      );
    }
  };

  const handleConfirmDeleteDeck = () => {
    if (!deletingDeck) return;
    const targetId = deletingDeck.id;
    const targetName = deletingDeck.name;

    if (isProtectedDeck(targetId)) {
      toast.error('Các cấp độ HSK 1 - HSK 6 và Tất cả từ vựng là cố định của hệ thống, không thể xóa.', 'Không thể xóa');
      setDeletingDeck(null);
      return;
    }

    // 1. If currently on this deck, switch back to 'deck-all'
    if (currentDeckId === targetId) {
      setCurrentDeckId('deck-all');
    }

    // 2. Remove deck from state
    const nextDecks = decks.filter((d) => d.id !== targetId);
    setDecks(nextDecks);
    saveStoredDecks(nextDecks, user?.id);

    // 3. Any vocab items associated with this deck: move to 'deck-all'
    const updatedItems = items.map((item) => {
      if (item.deckId === targetId) {
        return { ...item, deckId: 'deck-all', updatedAt: new Date().toISOString() };
      }
      return item;
    });
    setItems(updatedItems);
    saveStoredVocab(updatedItems);

    // 4. If Firebase is connected, delete from Firestore
    if (getFirebaseServices().isConfigured) {
      deleteDeckFromFirestore(targetId).catch((err) =>
        console.warn('Firebase deck delete notice:', err)
      );
    }

    setDeletingDeck(null);
    toast.success(`Đã xóa bộ từ "${targetName}" thành công!`, 'Xóa bộ từ');
  };

  // Column management
  const handleColumnResize = (columnId: TableColumnId, newWidth: number) => {
    const next = columns.map((col) =>
      col.id === columnId ? { ...col, width: newWidth } : col
    );
    setColumns(next);
    saveStoredColumns(next);
  };

  const handleToggleColumn = (columnId: TableColumnId) => {
    const next = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumns(next);
    saveStoredColumns(next);
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    saveStoredColumns(DEFAULT_COLUMNS);
    toast.info('Đã khôi phục độ rộng và thứ tự cột mặc định', 'Cài đặt cột');
  };

  // Filter and sort handlers
  const handleFilterChange = (updates: Partial<FilterOptions>) => {
    setFilterOptions((prev) => ({ ...prev, ...updates }));
  };

  const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
    setFilterOptions((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleClearFilters = () => {
    setFilterOptions({
      searchQuery: '',
      hskLevel: 'all',
      hanziStatus: 'all',
      translationStatus: 'all',
      favoriteOnly: false,
      onlyDueForReview: false,
      wordSource: 'all',
      completedOnly: false,
      sortBy: 'index',
      sortOrder: 'asc',
    });
    toast.info('Đã xóa tất cả bộ lọc tìm kiếm', 'Bộ lọc');
  };

  // Study Mode trigger handler
  const handleStudyModeChange = (mode: StudyMode) => {
    if (isGuest && mode !== 'full_table') {
      setIsAuthModalOpen(true);
      return;
    }
    setStudyMode(mode);
    if (mode === 'smart_srs') {
      setIsSmartReviewOpen(true);
    } else if (mode === 'meaning_recall') {
      setIsMeaningReviewOpen(true);
    }
  };

  // Quick filter from sidebar
  const handleQuickFilter = (
    type: 'due' | 'wrong' | 'favorite' | 'system' | 'custom' | 'completed' | 'all'
  ) => {
    if (
      isGuest &&
      (type === 'due' ||
        type === 'wrong' ||
        type === 'favorite' ||
        type === 'custom' ||
        type === 'completed')
    ) {
      setIsAuthModalOpen(true);
      return;
    }

    // Switch to all decks so quick filter queries across entire vocab
    setCurrentDeckId('deck-all');

    if (type === 'due') {
      setFilterOptions((prev) => ({
        ...prev,
        onlyDueForReview: true,
        wordSource: 'all',
        completedOnly: false,
        hanziStatus: 'all',
        favoriteOnly: false,
        hskLevel: 'all',
      }));
    } else if (type === 'wrong') {
      setFilterOptions((prev) => ({
        ...prev,
        onlyDueForReview: false,
        wordSource: 'all',
        completedOnly: false,
        hanziStatus: 'wrong',
        favoriteOnly: false,
        hskLevel: 'all',
      }));
    } else if (type === 'favorite') {
      setFilterOptions((prev) => ({
        ...prev,
        onlyDueForReview: false,
        wordSource: 'all',
        completedOnly: false,
        hanziStatus: 'all',
        favoriteOnly: true,
        hskLevel: 'all',
      }));
    } else if (type === 'system') {
      setFilterOptions((prev) => ({
        ...prev,
        onlyDueForReview: false,
        wordSource: 'system',
        completedOnly: false,
        hanziStatus: 'all',
        favoriteOnly: false,
        hskLevel: 'all',
      }));
      toast.info('Đang hiển thị danh sách từ vựng hệ thống (Cộng đồng)', 'Từ hệ thống');
    } else if (type === 'custom') {
      setFilterOptions((prev) => ({
        ...prev,
        onlyDueForReview: false,
        wordSource: 'custom',
        completedOnly: false,
        hanziStatus: 'all',
        favoriteOnly: false,
        hskLevel: 'all',
      }));
      toast.info('Đang hiển thị danh sách từ cá nhân bạn tự thêm', 'Từ của bạn');
    } else if (type === 'completed') {
      setFilterOptions((prev) => ({
        ...prev,
        onlyDueForReview: false,
        wordSource: 'all',
        completedOnly: true,
        hanziStatus: 'all',
        favoriteOnly: false,
        hskLevel: 'all',
      }));
      toast.info('Đang hiển thị các từ vựng bạn đã hoàn thành', 'Tiến độ hoàn thành');
    } else {
      handleClearFilters();
    }
  };

  // Determine active quick filter in sidebar
  const activeQuickFilter = useMemo(() => {
    if (filterOptions.completedOnly) return 'completed';
    if (filterOptions.onlyDueForReview) return 'due';
    if (filterOptions.favoriteOnly) return 'favorite';
    if (filterOptions.wordSource === 'system') return 'system';
    if (filterOptions.wordSource === 'custom') return 'custom';
    if (filterOptions.hanziStatus === 'wrong') return 'wrong';
    if (
      currentDeckId === 'deck-all' &&
      (!filterOptions.searchQuery || filterOptions.searchQuery === '') &&
      (!filterOptions.hskLevel || filterOptions.hskLevel === 'all') &&
      (!filterOptions.hanziStatus || filterOptions.hanziStatus === 'all')
    ) {
      return 'all';
    }
    return null;
  }, [filterOptions, currentDeckId]);

  // Current deck object
  const currentDeck = useMemo(() => {
    return decks.find((d) => d.id === currentDeckId) || decks[0] || INITIAL_DECKS[0];
  }, [decks, currentDeckId]);

  // Deck items subset
  const currentDeckItems = useMemo(() => {
    if (currentDeckId === 'deck-all') return items;
    return items.filter((i) => i.deckId === currentDeckId);
  }, [items, currentDeckId]);

  // Deck stats calculation
  const stats = useMemo(() => {
    if (!isClient) {
      return {
        total: 0,
        unlearned: 0,
        learning: 0,
        mastered: 0,
        needsReview: 0,
        retentionRate: 0,
        dueTodayCount: 0,
      };
    }
    return calculateDeckStats(currentDeckItems);
  }, [currentDeckItems, isClient]);

  // Filtered and sorted items for display
  const displayedItems = useMemo(() => {
    if (!isClient) return [];
    let result = [...currentDeckItems];

    // 1. Search Query
    if (filterOptions.searchQuery) {
      result = result.filter((item) =>
        matchesSearchQuery(item, filterOptions.searchQuery)
      );
    }

    // 2. HSK Level
    if (filterOptions.hskLevel && filterOptions.hskLevel !== 'all') {
      result = result.filter((item) => item.hskLevel === filterOptions.hskLevel);
    }

    // 3. Status
    if (filterOptions.hanziStatus && filterOptions.hanziStatus !== 'all') {
      result = result.filter((item) => item.hanziStatus === filterOptions.hanziStatus);
    }

    // 4. Due date
    if (filterOptions.onlyDueForReview) {
      result = result.filter((item) => isItemDueForReview(item));
    }

    // 5. Starred
    if (filterOptions.favoriteOnly) {
      result = result.filter((item) => item.favorite);
    }

    // 6. Word Source (System vs Custom)
    if (filterOptions.wordSource === 'system') {
      result = result.filter((item) => item.isSystem !== false);
    } else if (filterOptions.wordSource === 'custom') {
      result = result.filter((item) => item.isSystem === false);
    }

    // 7. Completed words
    if (filterOptions.completedOnly) {
      result = result.filter(
        (item) =>
          item.hanziStatus === 'correct' ||
          item.translationStatus === 'correct' ||
          !!(item.hanziPracticeInput && item.hanziPracticeInput.trim()) ||
          !!(item.translationPracticeInput && item.translationPracticeInput.trim())
      );
    }

    // 6. Sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (filterOptions.sortBy) {
        case 'hanzi':
          cmp = a.hanzi.localeCompare(b.hanzi, 'zh');
          break;
        case 'pinyin':
          cmp = a.pinyin.localeCompare(b.pinyin);
          break;
        case 'hsk':
          cmp = a.hskLevel - b.hskLevel;
          break;
        case 'status': {
          const rank = { wrong: 0, unlearned: 1, uncertain: 2, correct: 3 };
          cmp = (rank[a.hanziStatus] || 0) - (rank[b.hanziStatus] || 0);
          break;
        }
        case 'dueDate':
          cmp = (a.srs.dueDate || '').localeCompare(b.srs.dueDate || '');
          break;
        case 'index':
        default:
          cmp = 0;
      }
      return filterOptions.sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [currentDeckItems, filterOptions, isClient]);

  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-sans text-sm">
        Đang tải bảng từ vựng tương tác...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-black text-slate-900 dark:text-zinc-100 select-text">
      {/* 1. Top Global Header */}
      <Header
        currentDeck={currentDeck}
        stats={stats}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onToggleSidebar={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileSidebarOpen((prev) => !prev);
          } else {
            handleToggleSidebarCollapse();
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBulkPaste={() => {
          if (isGuest) {
            setIsAuthModalOpen(true);
            return;
          }
          setIsBulkPasteOpen(true);
        }}
        isFirebaseConnected={isClient ? getFirebaseServices().isConfigured : false}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          decks={decks}
          currentDeckId={currentDeckId}
          activeQuickFilter={activeQuickFilter}
          onSelectDeck={(deckId) => {
            setCurrentDeckId(deckId);
            handleClearFilters();
            setMobileSidebarOpen(false);
          }}
          onOpenCreateDeck={() => {
            if (isGuest) {
              setIsAuthModalOpen(true);
              setMobileSidebarOpen(false);
              return;
            }
            setIsDeckModalOpen(true);
            setMobileSidebarOpen(false);
          }}
          onEditDeck={(deck) => {
            if (isGuest) {
              setIsAuthModalOpen(true);
              return;
            }
            setEditingDeck(deck);
          }}
          onDeleteDeck={(deck) => {
            if (isGuest) {
              setIsAuthModalOpen(true);
              return;
            }
            setDeletingDeck(deck);
          }}
          items={items}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onFilterQuick={(type) => {
            handleQuickFilter(type);
            setMobileSidebarOpen(false);
          }}
          isLoading={isLoadingVocab}
        />


        {/* Central Spreadsheet Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
          {/* Table Toolbar */}
          <TableToolbar
            studyMode={studyMode}
            onStudyModeChange={handleStudyModeChange}
            filterOptions={filterOptions}
            onFilterChange={handleFilterChange}
            columns={columns}
            onToggleColumn={handleToggleColumn}
            onResetColumns={handleResetColumns}
            onAddNewWord={() => {
              if (isGuest) {
                setIsAuthModalOpen(true);
                return;
              }
              setIsAddWordOpen(true);
            }}
            onStartSmartReview={() => {
              if (isGuest) {
                setIsAuthModalOpen(true);
                return;
              }
              setIsSmartReviewOpen(true);
            }}
            onOpenImport={() => {
              if (isGuest) {
                setIsAuthModalOpen(true);
                return;
              }
              setIsImportOpen(true);
            }}
            onOpenExport={() => {
              if (isGuest) {
                setIsAuthModalOpen(true);
                return;
              }
              setIsExportOpen(true);
            }}
            onOpenBulkPaste={() => {
              if (isGuest) {
                setIsAuthModalOpen(true);
                return;
              }
              setIsBulkPasteOpen(true);
            }}
            dueTodayCount={stats.dueTodayCount}
          />

          {/* Firestore Permission Banner */}
          {firestoreError && firestoreError.includes('permission-denied') && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold">⚠️ Firestore Rules chưa mở quyền truy cập:</span>
                <span>Vui lòng vào Firebase Console &gt; Firestore Database &gt; Rules và cập nhật quy tắc cho phép đọc/ghi.</span>
              </div>
              <button
                type="button"
                onClick={() => loadVocabFromFirebase()}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 rounded font-semibold text-amber-900 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Interactive Spreadsheet Table */}
          <SpreadsheetTable
            items={displayedItems}
            allCount={items.length}
            columns={columns}
            studyMode={studyMode}
            filterOptions={filterOptions}
            onColumnResize={handleColumnResize}
            onSortChange={handleSortChange}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={(item) => setDeletingItem(item)}
            onEditItem={(item) => setEditingItem(item)}
            onClearFilters={handleClearFilters}
            isGuest={isGuest}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            isLoading={isLoadingVocab}
          />

          {/* Status Bar */}
          <StatusBar
            stats={stats}
            filteredCount={displayedItems.length}
            totalInDeck={currentDeckItems.length}
          />
        </main>
      </div>

      {/* 3. Modals & Dialogs */}
      <AddWordModal
        isOpen={isAddWordOpen}
        onClose={() => setIsAddWordOpen(false)}
        onAdd={handleAddItem}
        decks={decks}
        currentDeckId={currentDeckId}
        existingItems={items}
      />

      <EditWordModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onUpdate={handleUpdateItem}
        item={editingItem}
        decks={decks}
      />

      <DeleteConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteItem}
        item={deletingItem}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
        existingItems={items}
        currentDeckId={currentDeckId}
        decks={decks}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        filteredItems={displayedItems}
        allDeckItems={currentDeckItems}
        currentDeck={currentDeck}
      />

      <DeckModal
        isOpen={isDeckModalOpen || !!editingDeck}
        onClose={() => {
          setIsDeckModalOpen(false);
          setEditingDeck(null);
        }}
        onCreateDeck={handleCreateDeck}
        onUpdateDeck={handleUpdateDeck}
        deckToEdit={editingDeck}
      />

      <ConfirmModal
        isOpen={!!deletingDeck}
        title="Xác nhận xóa bộ từ?"
        message={`Bạn có chắc chắn muốn xóa bộ từ "${deletingDeck?.name || ''}" không? Các từ vựng trong bộ từ này (nếu có) vẫn được lưu giữ an toàn trong "Tất cả từ vựng".`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        variant="danger"
        onConfirm={handleConfirmDeleteDeck}
        onCancel={() => setDeletingDeck(null)}
      />

      <SmartReviewModal
        isOpen={isSmartReviewOpen}
        onClose={() => {
          setIsSmartReviewOpen(false);
          setStudyMode('full_table');
        }}
        items={currentDeckItems}
        onBatchUpdate={handleBatchUpdate}
      />

      <MeaningReviewModal
        isOpen={isMeaningReviewOpen}
        onClose={() => {
          setIsMeaningReviewOpen(false);
          setStudyMode('full_table');
        }}
        items={displayedItems.length > 0 ? displayedItems : currentDeckItems}
      />

      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <BulkPasteModal
        isOpen={isBulkPasteOpen}
        onClose={() => setIsBulkPasteOpen(false)}
        targetScope={user?.role === 'admin' ? 'system' : 'personal'}
        decks={decks}
        onImportSuccess={(newWords?: VocabItem[]) => {
          if (newWords && newWords.length > 0 && user) {
            const userNewWords = newWords.map((w) => ({
              ...w,
              userId: user.role === 'admin' && w.isSystem ? 'system' : user.id,
            }));
            setItems((prev) => {
              const next = [...userNewWords, ...prev];
              saveStoredVocab(next, user.id);
              return next;
            });
          }
          loadVocabFromFirebase();
          toast.success('Đã nhập từ vựng thành công!', 'Nhập dữ liệu hoàn tất');
        }}
      />
    </div>
  );
}

export default function HomePage() {
  return <MainApp />;
}
