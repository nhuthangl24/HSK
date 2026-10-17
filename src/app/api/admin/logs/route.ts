import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getAuditLogs, getUserRecordById } from '@/lib/server-db';

export async function GET(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Yêu cầu đăng nhập.' }, { status: 401 });
  }

  const caller = getUserRecordById(payload.userId);
  if (!caller || caller.role !== 'admin' || caller.isLocked) {
    return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
  }

  const logs = getAuditLogs();
  return NextResponse.json({ success: true, logs });
}
