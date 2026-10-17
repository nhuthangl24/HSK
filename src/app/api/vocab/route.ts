import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import {
  getSystemVocabulary,
  getUserPersonalWords,
  getUserLearningProgress,
  saveUserPersonalWord,
  deleteUserPersonalWord,
  saveUserProgress,
  batchSaveUserProgress,
} from '@/lib/server-db';

import { VocabItem } from '@/types/vocabulary';

export async function GET(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload?.userId || null;

  const systemWords = getSystemVocabulary();

  if (!userId) {
    // Guest view: only official community vocabulary in clean initial state
    const cleanSystemWords = systemWords.map((sys) => ({
      ...sys,
      hanziPracticeInput: '',
      hanziStatus: 'unlearned' as const,
      translationPracticeInput: '',
      translationStatus: 'unanswered' as const,
      favorite: false,
      notes: '',
    }));
    return NextResponse.json({
      success: true,
      items: cleanSystemWords,
      isGuest: true,
    });
  }

  // Authenticated user view: personal words + personalized progress on system words
  const personalWords = getUserPersonalWords(userId);
  const progressMap = getUserLearningProgress(userId);

  // Apply user's progress to system words
  const mergedSystemWords = systemWords.map((sys) => {
    const p = progressMap[sys.id];
    if (p) {
      return {
        ...sys,
        hanziPracticeInput: p.hanziPracticeInput ?? '',
        hanziStatus: p.hanziStatus ?? 'unlearned',
        translationPracticeInput: p.translationPracticeInput ?? '',
        translationStatus: p.translationStatus ?? 'unanswered',
        favorite: p.favorite ?? false,
        notes: p.notes ?? sys.notes,
        srs: p.srs ?? sys.srs,
        updatedAt: p.updatedAt || sys.updatedAt,
      };
    }
    return {
      ...sys,
      hanziPracticeInput: '',
      hanziStatus: 'unlearned' as const,
      translationPracticeInput: '',
      translationStatus: 'unanswered' as const,
      favorite: false,
      notes: '',
    };
  });

  // Apply user's progress to personal words
  const mergedPersonalWords = personalWords.map((pw) => {
    const p = progressMap[pw.id];
    if (p) {
      return {
        ...pw,
        hanziPracticeInput: p.hanziPracticeInput ?? pw.hanziPracticeInput ?? '',
        hanziStatus: p.hanziStatus ?? pw.hanziStatus ?? 'unlearned',
        translationPracticeInput: p.translationPracticeInput ?? pw.translationPracticeInput ?? '',
        translationStatus: p.translationStatus ?? pw.translationStatus ?? 'unanswered',
        favorite: p.favorite ?? pw.favorite ?? false,
        notes: p.notes ?? pw.notes,
        srs: p.srs ?? pw.srs,
        updatedAt: p.updatedAt || pw.updatedAt,
      };
    }
    return {
      ...pw,
      hanziPracticeInput: '',
      hanziStatus: 'unlearned' as const,
      translationPracticeInput: '',
      translationStatus: 'unanswered' as const,
      favorite: false,
      notes: '',
    };
  });

  const allUserItems = [...mergedPersonalWords, ...mergedSystemWords];
  return NextResponse.json({
    success: true,
    items: allUserItems,
    isGuest: false,
    personalCount: personalWords.length,
    systemCount: systemWords.length,
  });
}

export async function POST(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json(
      { success: false, message: 'Vui lòng đăng nhập để lưu từ vựng cá nhân.' },
      { status: 401 }
    );
  }

  try {
    const item = (await request.json()) as VocabItem;
    if (!item.hanzi || !item.pinyin || !item.meaning) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu từ vựng không đầy đủ.' },
        { status: 400 }
      );
    }

    const saved = saveUserPersonalWord(payload.userId, item);
    return NextResponse.json({ success: true, item: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi lưu từ vựng.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json(
      { success: false, message: 'Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { item, progressUpdate, batchProgress } = body;

    // 0. If batch progress updates
    if (batchProgress && Array.isArray(batchProgress)) {
      const count = batchSaveUserProgress(payload.userId, batchProgress);
      return NextResponse.json({ success: true, count });
    }

    // 1. If progress update on a word

    if (progressUpdate && progressUpdate.vocabId) {
      const savedProgress = saveUserProgress(payload.userId, progressUpdate.vocabId, progressUpdate);
      return NextResponse.json({ success: true, progress: savedProgress });
    }

    // 2. If editing a personal word
    if (item && item.id) {
      if (item.isSystem) {
        return NextResponse.json(
          { success: false, message: 'Không thể sửa từ vựng hệ thống ở đây.' },
          { status: 403 }
        );
      }
      const savedWord = saveUserPersonalWord(payload.userId, item);
      return NextResponse.json({ success: true, item: savedWord });
    }

    return NextResponse.json({ success: false, message: 'Dữ liệu cập nhật không hợp lệ.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID từ vựng.' }, { status: 400 });
    }

    deleteUserPersonalWord(payload.userId, id);
    return NextResponse.json({ success: true, message: 'Đã xóa từ vựng cá nhân.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi xóa từ vựng.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
