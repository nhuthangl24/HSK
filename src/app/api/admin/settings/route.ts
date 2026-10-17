import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getSystemConfig, saveSystemConfig } from '@/lib/server-db';
import { SystemConfig } from '@/types/auth';

export async function GET(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const config = getSystemConfig();
  return NextResponse.json({ success: true, config });
}

export async function PUT(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Partial<SystemConfig>;
    const updated = saveSystemConfig(payload.email, body);
    return NextResponse.json({ success: true, config: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình hệ thống.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
