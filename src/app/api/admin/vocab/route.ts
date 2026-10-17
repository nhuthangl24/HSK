import { NextResponse } from 'next/server';
import {
  getSystemVocabulary,
  saveSystemVocabularyItem,
  deleteSystemVocabularyItem,
  batchSaveSystemVocabulary,
  addAuditLog,
  authenticateAdmin,
} from '@/lib/server-db';
import { VocabItem } from '@/types/vocabulary';

export async function GET(request: Request) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' }, { status: 403 });
  }

  const words = getSystemVocabulary();
  return NextResponse.json({ success: true, words });
}

export async function POST(request: Request) {
  const { isAdmin, email: callerEmail } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { item, batch } = body;

    // Handle batch import for admin
    if (Array.isArray(batch) && batch.length > 0) {
      const count = batchSaveSystemVocabulary(batch);
      addAuditLog('NHẬP_TỪ_VỰNG_HỆ_THỐNG', callerEmail, 'Hệ thống', `Nhập ${count} từ vựng mới.`);
      return NextResponse.json({ success: true, count, message: `Đã nhập ${count} từ hệ thống.` });
    }

    // Handle single item add/edit
    if (!item?.hanzi || !item?.pinyin || !item?.meaning) {
      return NextResponse.json({ success: false, message: 'Dữ liệu không đầy đủ.' }, { status: 400 });
    }

    const saved = saveSystemVocabularyItem(item);
    addAuditLog('THÊM_TỪ_HỆ_THỐNG', callerEmail, saved.hanzi, `HSK ${saved.hskLevel} - ${saved.meaning}`);

    return NextResponse.json({ success: true, item: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Thao tác không thành công.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const { isAdmin, email: callerEmail } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' }, { status: 403 });
  }

  try {
    const item = (await request.json()) as VocabItem;
    if (!item.id || !item.hanzi) {
      return NextResponse.json({ success: false, message: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    const saved = saveSystemVocabularyItem(item);
    addAuditLog('SỬA_TỪ_HỆ_THỐNG', callerEmail, saved.hanzi, `ID: ${saved.id}`);

    return NextResponse.json({ success: true, item: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi cập nhật từ hệ thống.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { isAdmin, email: callerEmail } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID từ vựng.' }, { status: 400 });
    }

    deleteSystemVocabularyItem(id);
    addAuditLog('XÓA_TỪ_HỆ_THỐNG', callerEmail, id, 'Đã xóa khỏi hệ thống');

    return NextResponse.json({ success: true, message: 'Đã xóa từ vựng hệ thống.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xóa từ vựng hệ thống.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
