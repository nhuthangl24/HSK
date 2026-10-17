import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { updateUser, addAuditLog } from '@/lib/server-db';

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập trước khi thiết lập quyền quản trị.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { setupKey } = body;

    const envSecret = process.env.ADMIN_BOOTSTRAP_KEY;

    // Strictly require matching ADMIN_BOOTSTRAP_KEY - never allow auto-claim
    if (!envSecret || setupKey !== envSecret) {
      return NextResponse.json(
        {
          success: false,
          message: 'Khóa bảo mật quản trị viên không chính xác hoặc chưa được cấu hình.',
        },
        { status: 403 }
      );
    }

    const updated = updateUser(payload.userId, { role: 'admin' });
    addAuditLog('KHỞI_TẠO_ADMIN', updated.email, updated.email, 'Cấp quyền Quản trị viên đầu tiên an toàn');

    return NextResponse.json({
      success: true,
      message: 'Chúc mừng bạn! Tài khoản đã được nâng cấp thành Quản trị viên (Admin).',
      user: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Thiết lập thất bại.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
