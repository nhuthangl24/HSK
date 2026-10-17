import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getAllUserWorkspacesSummary, getUserRecordById } from '@/lib/server-db';

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
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const summaries = getAllUserWorkspacesSummary();
  return NextResponse.json({ success: true, workspaces: summaries });
}
