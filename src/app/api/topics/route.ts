import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import {
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
} from '@/lib/server-db';
import { Topic } from '@/types/vocabulary';

export async function GET(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload?.userId;

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');

  let targetUserId = userId;
  if (scope === 'all' && payload?.role === 'admin') {
    targetUserId = 'all';
  } else if (scope === 'system') {
    targetUserId = undefined;
  }

  const topics = getTopics(targetUserId);
  return NextResponse.json({ success: true, topics });
}

export async function POST(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<Topic>;
    const asAdmin = payload.role === 'admin';
    const topic = createTopic(payload.userId, body, asAdmin);
    return NextResponse.json({ success: true, topic });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi tạo chủ đề.';
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
      return NextResponse.json({ success: false, message: 'Thiếu topic ID.' }, { status: 400 });
    }
    const asAdmin = payload.role === 'admin';
    const updated = updateTopic(payload.userId, id, data, asAdmin);
    return NextResponse.json({ success: true, topic: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi cập nhật chủ đề.';
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
      return NextResponse.json({ success: false, message: 'Thiếu topic ID.' }, { status: 400 });
    }
    const asAdmin = payload.role === 'admin';
    const result = deleteTopic(payload.userId, id, asAdmin);
    return NextResponse.json({
      success: true,
      message: `Đã xóa chủ đề thành công. ${result.affectedWords} từ vựng đã được gỡ khỏi chủ đề này.`,
      affectedWords: result.affectedWords,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi xóa chủ đề.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
