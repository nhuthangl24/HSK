import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getSystemConfig, saveSystemConfig, getUserRecordById } from '@/lib/server-db';
import { SystemConfig } from '@/types/auth';

function checkIsAdmin(request: Request): { isAdmin: boolean; email: string } {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return { isAdmin: false, email: '' };

  const caller = payload.userId ? getUserRecordById(payload.userId) : null;
  const isAdmin = caller ? caller.role === 'admin' && !caller.isLocked : payload.role === 'admin';
  return { isAdmin, email: caller?.email || payload.email || 'admin@system.local' };
}

export async function GET(request: Request) {
  const { isAdmin } = checkIsAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const config = getSystemConfig();
  return NextResponse.json({ success: true, config });
}

export async function PUT(request: Request) {
  const { isAdmin, email } = checkIsAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Partial<SystemConfig>;
    const updated = saveSystemConfig(email, body);
    return NextResponse.json({ success: true, config: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình hệ thống.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
