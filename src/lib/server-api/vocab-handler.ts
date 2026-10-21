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
  batchSaveSystemVocabulary,
  getSystemConfig,
  getUserRecordById,
  addAuditLog,
} from '@/lib/server-db';
import { VocabItem, HskLevel } from '@/types/vocabulary';

interface PasteItemInput {
  hanzi: string;
  pinyin: string;
  partOfSpeech?: string;
  meaning: string;
  example?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
  notes?: string;
  hskLevel?: number;
  deckId?: string;
  topicId?: string;
}

export async function handleVocab(request: Request, subSlug: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  const isPaste = subSlug[0] === 'paste';

  // GET: /api/vocab
  if (method === 'GET') {
    const token = extractToken(request);
    const payload = token ? verifyToken(token) : null;
    const userId = payload?.userId || null;

    const systemWords = getSystemVocabulary();

    if (!userId) {
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

    const personalWords = getUserPersonalWords(userId);
    const progressMap = getUserLearningProgress(userId);

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

  // POST: /api/vocab or /api/vocab/paste
  if (method === 'POST') {
    const token = extractToken(request);
    const payload = token ? verifyToken(token) : null;
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác này.' },
        { status: 401 }
      );
    }

    if (isPaste) {
      try {
        const body = await request.json();
        const {
          items,
          targetScope: rawScope = 'personal',
          targetDeckId,
          targetTopicId,
          targetUserId,
        }: {
          items: PasteItemInput[];
          targetScope?: string;
          targetDeckId?: string;
          targetTopicId?: string;
          targetUserId?: string;
        } = body;

        const targetScope: 'personal' | 'system' | 'user_workspace' =
          rawScope === 'system'
            ? 'system'
            : rawScope === 'user_workspace'
            ? 'user_workspace'
            : 'personal';

        if (!items || !Array.isArray(items) || items.length === 0) {
          return NextResponse.json(
            { success: false, message: 'Không có dữ liệu từ vựng hợp lệ để nhập.' },
            { status: 400 }
          );
        }

        const config = getSystemConfig();
        if (items.length > config.maxImportBatchSize) {
          return NextResponse.json(
            {
              success: false,
              message: `Số lượng từ vượt quá giới hạn hệ thống (${items.length}/${config.maxImportBatchSize} dòng).`,
            },
            { status: 400 }
          );
        }

        const caller = payload.userId ? getUserRecordById(payload.userId) : null;
        const isAdmin = caller ? caller.role === 'admin' && !caller.isLocked : payload.role === 'admin';

        if (targetScope === 'system' && !isAdmin) {
          return NextResponse.json(
            { success: false, message: 'Chỉ Quản trị viên mới được nhập vào kho từ vựng chuẩn hệ thống.' },
            { status: 403 }
          );
        }

        if (targetScope === 'user_workspace' && !isAdmin) {
          return NextResponse.json(
            { success: false, message: 'Chỉ Quản trị viên mới có thể nhập vào không gian của học viên khác.' },
            { status: 403 }
          );
        }

        const effectiveUserId = targetScope === 'user_workspace' && targetUserId ? targetUserId : payload.userId;

        let existingItems: VocabItem[] = [];
        if (targetScope === 'system') {
          existingItems = getSystemVocabulary();
        } else {
          existingItems = getUserPersonalWords(effectiveUserId);
        }

        const existingHanziSet = new Set(existingItems.map((w) => w.hanzi.trim()));
        const seenInBatch = new Set<string>();

        const addedList: VocabItem[] = [];
        const skippedList: { line: number; hanzi: string; reason: string }[] = [];
        const errorList: { line: number; raw: string; error: string }[] = [];

        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        items.forEach((item, index) => {
          const lineNum = index + 1;
          const cleanHanzi = (item.hanzi || '').trim();
          const cleanPinyin = (item.pinyin || '').trim();
          const cleanMeaning = (item.meaning || '').trim();

          if (!cleanHanzi || !cleanPinyin || !cleanMeaning) {
            errorList.push({
              line: lineNum,
              raw: `${cleanHanzi} | ${cleanPinyin} | ${cleanMeaning}`,
              error: 'Thiếu trường bắt buộc (Chữ Hán, Pinyin hoặc Nghĩa tiếng Việt)',
            });
            return;
          }

          if (seenInBatch.has(cleanHanzi)) {
            skippedList.push({
              line: lineNum,
              hanzi: cleanHanzi,
              reason: 'Trùng lặp với từ khác trong cùng danh sách dán',
            });
            return;
          }
          seenInBatch.add(cleanHanzi);

          if (existingHanziSet.has(cleanHanzi)) {
            skippedList.push({
              line: lineNum,
              hanzi: cleanHanzi,
              reason:
                targetScope === 'system'
                  ? 'Đã tồn tại trong kho từ vựng chuẩn hệ thống'
                  : 'Đã tồn tại trong kho từ cá nhân của bạn',
            });
            return;
          }

          const hskLvl = ((item.hskLevel && item.hskLevel >= 1 && item.hskLevel <= 9) ? item.hskLevel : 1) as HskLevel;
          const deck = targetDeckId || (targetScope === 'system' ? `deck-hsk${hskLvl}` : 'deck-all');

          const vocab: VocabItem = {
            id: `vocab-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
            deckId: deck,
            topicId: targetTopicId || item.topicId || undefined,
            hskLevel: hskLvl,
            hanzi: cleanHanzi,
            pinyin: cleanPinyin,
            partOfSpeech: item.partOfSpeech?.trim() || undefined,
            meaning: cleanMeaning,
            example: item.example?.trim() || '',
            examplePinyin: item.examplePinyin?.trim() || '',
            exampleMeaning: item.exampleMeaning?.trim() || '',
            hanziPracticeInput: '',
            hanziStatus: 'unlearned',
            translationPracticeInput: '',
            translationStatus: 'unanswered',
            notes: item.notes?.trim() || '',
            favorite: false,
            isSystem: targetScope === 'system',
            scope: targetScope === 'system' ? 'system' : 'user',
            userId: targetScope === 'system' ? 'system' : effectiveUserId,
            srs: {
              repetition: 0,
              interval: 0,
              easeFactor: 2.5,
              dueDate: todayStr,
              totalReviews: 0,
              correctCount: 0,
              wrongCount: 0,
              history: [],
            },
            createdAt: now,
            updatedAt: now,
          };

          addedList.push(vocab);
        });

        if (addedList.length > 0) {
          if (targetScope === 'system') {
            batchSaveSystemVocabulary(addedList);
            addAuditLog(
              'NHẬP_HÀNG_LOẠT_TỪ_VỰNG_HỆ_THỐNG',
              payload.email,
              'Hệ thống',
              `Nhập thành công ${addedList.length} từ vào kho chuẩn hệ thống`
            );
          } else {
            for (const w of addedList) {
              saveUserPersonalWord(effectiveUserId, w);
            }
          }
        }

        return NextResponse.json({
          success: true,
          totalLines: items.length,
          addedCount: addedList.length,
          skippedCount: skippedList.length,
          failedCount: errorList.length,
          skippedDetails: skippedList,
          errors: errorList,
          targetScope,
          items: addedList,
          message: `Đã nhập thành công ${addedList.length}/${items.length} từ vựng.`,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Lỗi xử lý nhập hàng loạt.';
        return NextResponse.json({ success: false, message }, { status: 400 });
      }
    }

    // Single personal word save
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

  // PUT: /api/vocab
  if (method === 'PUT') {
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

      if (batchProgress && Array.isArray(batchProgress)) {
        const count = batchSaveUserProgress(payload.userId, batchProgress);
        return NextResponse.json({ success: true, count });
      }

      if (progressUpdate && progressUpdate.vocabId) {
        const savedProgress = saveUserProgress(payload.userId, progressUpdate.vocabId, progressUpdate);
        return NextResponse.json({ success: true, progress: savedProgress });
      }

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

  // DELETE: /api/vocab
  if (method === 'DELETE') {
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

  return NextResponse.json({ success: false, message: 'Method không được hỗ trợ.' }, { status: 405 });
}
