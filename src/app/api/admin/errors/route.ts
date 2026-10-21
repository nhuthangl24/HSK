import { NextResponse } from 'next/server';
import {
  getAllSystemErrorLogs,
  addSystemErrorLog,
  updateSystemErrorLogStatus,
  deleteSystemErrorLog,
  purgeResolvedSystemErrorLogs,
  authenticateAdmin,
  addAuditLog,
} from '@/lib/server-db';

export async function GET(request: Request) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const moduleParam = searchParams.get('module');
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  let logs = getAllSystemErrorLogs();

  if (status && status !== 'all') {
    logs = logs.filter((l) => l.status === status);
  }

  if (severity && severity !== 'all') {
    logs = logs.filter((l) => l.severity === severity);
  }

  if (moduleParam && moduleParam !== 'all') {
    logs = logs.filter((l) => l.module === moduleParam);
  }

  if (q) {
    logs = logs.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        (l.stack && l.stack.toLowerCase().includes(q))
    );
  }

  const stats = {
    total: logs.length,
    open: logs.filter((l) => l.status === 'open').length,
    critical: logs.filter((l) => l.severity === 'critical' && l.status === 'open').length,
    acknowledged: logs.filter((l) => l.status === 'acknowledged').length,
    resolved: logs.filter((l) => l.status === 'resolved').length,
  };

  return NextResponse.json({
    success: true,
    stats,
    logs,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { module: modName, message, stack, severity, path, userId } = body;

    if (!message) {
      return NextResponse.json({ success: false, message: 'Thiếu thông điệp lỗi.' }, { status: 400 });
    }

    const created = addSystemErrorLog({
      module: modName || 'client',
      message: String(message).slice(0, 500),
      stack: stack ? String(stack).slice(0, 3000) : undefined,
      severity: ['critical', 'error', 'warning', 'info'].includes(severity) ? severity : 'error',
      path: path ? String(path).slice(0, 200) : undefined,
      userId: userId ? String(userId).slice(0, 100) : undefined,
    });

    return NextResponse.json({
      success: true,
      log: created,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Ghi nhận lỗi thất bại.';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { isAdmin, email: callerEmail } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !['open', 'acknowledged', 'resolved'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'ID và trạng thái hợp lệ (open, acknowledged, resolved) là bắt buộc.' },
        { status: 400 }
      );
    }

    const updated = updateSystemErrorLogStatus(id, status, callerEmail);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhật ký lỗi.' }, { status: 404 });
    }

    addAuditLog(
      'CẬP_NHẬT_LỖI_HỆ_THỐNG',
      callerEmail,
      id,
      `Đổi trạng thái thành: ${status}`
    );

    return NextResponse.json({
      success: true,
      log: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cập nhật trạng thái lỗi thất bại.';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { isAdmin, email: callerEmail } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const purgeResolved = searchParams.get('purgeResolved') === 'true';

    if (purgeResolved) {
      const removedCount = purgeResolvedSystemErrorLogs();
      addAuditLog('DỌN_DẸP_LỖI_ĐÃ_XỬ_LÝ', callerEmail, 'error_logs', `Đã dọn dẹp ${removedCount} lỗi đã giải quyết`);

      return NextResponse.json({
        success: true,
        message: `Đã dọn dẹp ${removedCount} sự cố đã giải quyết.`,
      });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID sự cố cần xóa.' }, { status: 400 });
    }

    const ok = deleteSystemErrorLog(id);
    if (!ok) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy sự cố cần xóa.' }, { status: 404 });
    }

    addAuditLog('XÓA_NHẬT_KÝ_LỖI', callerEmail, id, `Đã xóa nhật ký lỗi ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa bản ghi lỗi thành công.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Xóa sự cố thất bại.';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
