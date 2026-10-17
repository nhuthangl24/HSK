import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getAllUsers, getUserRecordById, updateUser, addAuditLog } from '@/lib/server-db';
import { UserRole } from '@/types/auth';

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

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const role = searchParams.get('role');

  let users = getAllUsers();

  // If local list is empty on serverless cold start, ensure caller admin is present
  if (users.length === 0 && payload.role === 'admin') {
    users = [
      {
        id: payload.userId,
        email: payload.email,
        name: payload.email.split('@')[0] || 'Quản trị viên',
        role: 'admin',
        streakDays: 1,
        totalMastered: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  if (q) {
    users = users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
    );
  }

  if (role && role !== 'all') {
    users = users.filter((u) => u.role === role);
  }

  return NextResponse.json({ success: true, users });
}

export async function PATCH(request: Request) {
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

  try {
    const body = await request.json();
    const { targetUserId, isLocked, role } = body as {
      targetUserId: string;
      isLocked?: boolean;
      role?: UserRole;
    };

    if (!targetUserId) {
      return NextResponse.json({ success: false, message: 'Thiếu ID người dùng.' }, { status: 400 });
    }

    const callerId = caller?.id || payload.userId;
    const callerEmail = caller?.email || payload.email;

    // Safety: Admin cannot lock their own account
    if (targetUserId === callerId && isLocked === true) {
      return NextResponse.json(
        { success: false, message: 'Bạn không thể tự khóa tài khoản của chính mình.' },
        { status: 400 }
      );
    }

    const updates: Partial<{ isLocked: boolean; role: UserRole }> = {};
    if (typeof isLocked === 'boolean') updates.isLocked = isLocked;
    if (role && ['user', 'admin', 'student', 'teacher'].includes(role)) updates.role = role;

    const updatedUser = updateUser(targetUserId, updates);

    // Audit log
    addAuditLog(
      isLocked !== undefined
        ? isLocked
          ? 'KHÓA_TÀI_KHOẢN'
          : 'MỞ_KHÓA_TÀI_KHOẢN'
        : 'CẬP_NHẬT_QUYỀN',
      callerEmail,
      updatedUser.email,
      `Cập nhật: ${JSON.stringify(updates)}`
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Thao tác không thành công.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
