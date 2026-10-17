import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import {
  getCustomHskGroups,
  createCustomHskGroup,
  updateCustomHskGroup,
  deleteCustomHskGroup,
  getUserRecordById,
} from '@/lib/server-db';
import { CustomHskGroup } from '@/types/vocabulary';

export async function GET(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload?.userId;

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');

  const caller = userId ? getUserRecordById(userId) : null;
  const isCallerAdmin = caller ? caller.role === 'admin' && !caller.isLocked : payload?.role === 'admin';

  let targetUserId = userId;
  if (scope === 'all' && isCallerAdmin) {
    targetUserId = 'all';
  }

  if (!targetUserId) {
    return NextResponse.json({ success: true, groups: [] });
  }

  const groups = getCustomHskGroups(targetUserId);
  return NextResponse.json({ success: true, groups });
}

export async function POST(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<CustomHskGroup>;
    const group = createCustomHskGroup(payload.userId, body);
    return NextResponse.json({ success: true, group });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi tạo nhóm học HSK.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID nhóm học.' }, { status: 400 });
    }
    const updated = updateCustomHskGroup(payload.userId, id, data);
    return NextResponse.json({ success: true, group: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi cập nhật nhóm học.';
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
      return NextResponse.json({ success: false, message: 'Thiếu ID nhóm học.' }, { status: 400 });
    }
    const result = deleteCustomHskGroup(payload.userId, id);
    return NextResponse.json({
      success: true,
      message: `Đã xóa nhóm học thành công. ${result.affectedWords} từ vựng đã được chuyển về kho chung.`,
      affectedWords: result.affectedWords,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xóa nhóm học.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
