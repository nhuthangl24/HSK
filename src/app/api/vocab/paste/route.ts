import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import {
  getSystemVocabulary,
  batchSaveSystemVocabulary,
  getUserPersonalWords,
  saveUserPersonalWord,
  getSystemConfig,
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

export async function POST(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json(
      { success: false, message: 'Vui lòng đăng nhập để nhập từ vựng.' },
      { status: 401 }
    );
  }

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
          message: `Số lượng từ vượt quá giới hạn hệ thống (${items.length}/${config.maxImportBatchSize} dòng). Vui lòng chia nhỏ tệp.`,
        },
        { status: 400 }
      );
    }

    const isAdmin = payload.role === 'admin';

    // Authorization check
    if (targetScope === 'system' && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ Quản trị viên mới được nhập vào kho từ vựng chuẩn hệ thống.' },
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

    // Load existing items for duplicate detection
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

      // Check duplicate in same batch
      if (seenInBatch.has(cleanHanzi)) {
        skippedList.push({
          line: lineNum,
          hanzi: cleanHanzi,
          reason: 'Trùng lặp với từ khác trong cùng danh sách dán',
        });
        return;
      }
      seenInBatch.add(cleanHanzi);

      // Check duplicate in target database
      if (existingHanziSet.has(cleanHanzi)) {
        skippedList.push({
          line: lineNum,
          hanzi: cleanHanzi,
          reason: targetScope === 'system' ? 'Đã tồn tại trong kho từ vựng chuẩn hệ thống' : 'Đã tồn tại trong kho từ cá nhân của bạn',
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

    // Save to appropriate database
    if (addedList.length > 0) {
      if (targetScope === 'system') {
        batchSaveSystemVocabulary(addedList);
        addAuditLog(
          'NHẬP_HÀNG_LOẠT_TỪ_VỰNG_HỆ_THỐNG',
          payload.email,
          'Hệ thống',
          `Nhập thành công ${addedList.length} từ vào kho chuẩn hệ thống (Bỏ qua ${skippedList.length}, Lỗi ${errorList.length})`
        );
      } else {
        for (const w of addedList) {
          saveUserPersonalWord(effectiveUserId, w);
        }
        if (targetScope === 'user_workspace') {
          addAuditLog(
            'NHẬP_HÀNG_LOẠT_CHO_HỌC_VIÊN',
            payload.email,
            `Học viên ID: ${effectiveUserId}`,
            `Nhập ${addedList.length} từ vào kho cá nhân của học viên`
          );
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
