import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getAdminMetrics, getUserRecordById } from '@/lib/server-db';

export async function GET(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập.' }, { status: 401 });
  }

  const caller = getUserRecordById(payload.userId);
  const isCallerAdmin = caller ? caller.role === 'admin' && !caller.isLocked : payload.role === 'admin';
  if (!isCallerAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const timeWindow = (url.searchParams.get('timeWindow') as 'all' | '30d' | '7d' | 'today') || 'all';

  const stats = getAdminMetrics(timeWindow);
  return NextResponse.json({ success: true, stats });
}
