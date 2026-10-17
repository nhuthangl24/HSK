import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getUserWorkspaceData, getUserRecordById } from '@/lib/server-db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập.' }, { status: 401 });
  }

  const caller = getUserRecordById(payload.userId);
  const isCallerAdmin = caller ? caller.role === 'admin' && !caller.isLocked : payload.role === 'admin';
  if (!isCallerAdmin) {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const { userId } = await params;
  try {
    const data = getUserWorkspaceData(userId);
    return NextResponse.json({ success: true, workspace: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi lấy không gian người dùng.';
    return NextResponse.json({ success: false, message }, { status: 404 });
  }
}
