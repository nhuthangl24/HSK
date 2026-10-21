import { NextResponse } from 'next/server';
import {
  authenticateAdmin,
  // Errors
  getAllSystemErrorLogs,
  addSystemErrorLog,
  updateSystemErrorLogStatus,
  deleteSystemErrorLog,
  purgeResolvedSystemErrorLogs,
  // Guides
  getAllAdminGuides,
  getAdminGuideById,
  getAdminGuideBySlug,
  saveAdminGuide,
  deleteAdminGuide,
  resetStarterAdminGuides,
  // Health
  checkSystemHealth,
  runDeepSystemDiagnostic,
  // Logs
  getAuditLogs,
  addAuditLog,
  // Settings
  getSystemConfig,
  saveSystemConfig,
  // Stats
  getAdminMetrics,
  // Users
  getAllUsers,
  updateUser,
  deleteUser,
  registerUser,
  // Vocab
  getSystemVocabulary,
  saveSystemVocabularyItem,
  deleteSystemVocabularyItem,
  batchSaveSystemVocabulary,
  // Workspaces
  getAllUserWorkspacesSummary,
  syncUsersToServer,
  getUserWorkspaceData,
} from '@/lib/server-db';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { SystemConfig } from '@/types/auth';

export async function handleAdmin(request: Request, subSlug: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  const section = subSlug[0];

  // -------------------------------------------------------------
  // GET DISPATCHER
  // -------------------------------------------------------------
  if (method === 'GET') {
    // 1. /api/admin/errors
    if (section === 'errors') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const severity = searchParams.get('severity');
      const moduleParam = searchParams.get('module');
      const q = (searchParams.get('q') || '').trim().toLowerCase();

      let logs = getAllSystemErrorLogs();
      if (status && status !== 'all') logs = logs.filter((l) => l.status === status);
      if (severity && severity !== 'all') logs = logs.filter((l) => l.severity === severity);
      if (moduleParam && moduleParam !== 'all') logs = logs.filter((l) => l.module === moduleParam);
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

      return NextResponse.json({ success: true, stats, logs });
    }

    // 2. /api/admin/guides
    if (section === 'guides') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const guideSlug = searchParams.get('slug');
      const category = searchParams.get('category');
      const q = (searchParams.get('q') || '').trim().toLowerCase();

      if (id) {
        const guide = getAdminGuideById(id);
        return guide
          ? NextResponse.json({ success: true, guide })
          : NextResponse.json({ success: false, message: 'Tài liệu không tồn tại.' }, { status: 404 });
      }

      if (guideSlug) {
        const guide = getAdminGuideBySlug(guideSlug);
        return guide
          ? NextResponse.json({ success: true, guide })
          : NextResponse.json({ success: false, message: 'Tài liệu không tồn tại.' }, { status: 404 });
      }

      let guides = getAllAdminGuides();
      if (category && category !== 'all') guides = guides.filter((g) => g.category === category);
      if (q) {
        guides = guides.filter(
          (g) =>
            g.title.toLowerCase().includes(q) ||
            (g.description && g.description.toLowerCase().includes(q)) ||
            g.content.toLowerCase().includes(q)
        );
      }

      return NextResponse.json({ success: true, total: guides.length, guides });
    }

    // 3. /api/admin/health
    if (section === 'health') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      if (searchParams.get('deep') === 'true') {
        const diagnostic = runDeepSystemDiagnostic();
        return NextResponse.json({ success: true, diagnostic });
      }

      const report = checkSystemHealth();
      return NextResponse.json({ success: true, report });
    }

    // 4. /api/admin/logs
    if (section === 'logs') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, logs: getAuditLogs() });
    }

    // 5. /api/admin/settings
    if (section === 'settings') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, config: getSystemConfig() });
    }

    // 6. /api/admin/stats
    if (section === 'stats') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      const url = new URL(request.url);
      const timeWindow = (url.searchParams.get('timeWindow') as 'all' | '30d' | '7d' | 'today') || 'all';
      return NextResponse.json({ success: true, stats: getAdminMetrics(timeWindow) });
    }

    // 7. /api/admin/users
    if (section === 'users') {
      const { isAdmin, userId, email, role: callerRole } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const q = (searchParams.get('q') || '').trim().toLowerCase();
      const role = searchParams.get('role');

      let users = getAllUsers();
      if (users.length === 0 && (callerRole === 'admin' || isAdmin)) {
        users = [
          {
            id: userId,
            email,
            name: email.split('@')[0] || 'Quản trị viên',
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
            (u.email && u.email.toLowerCase().includes(q))
        );
      }
      if (role && role !== 'all') users = users.filter((u) => u.role === role);

      return NextResponse.json({ success: true, users });
    }

    // 8. /api/admin/vocab
    if (section === 'vocab') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, words: getSystemVocabulary() });
    }

    // 9. /api/admin/workspaces and /api/admin/workspaces/[userId]
    if (section === 'workspaces') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      const targetUserId = subSlug[1];
      if (targetUserId) {
        try {
          const data = getUserWorkspaceData(targetUserId);
          return NextResponse.json({ success: true, workspace: data });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Lỗi lấy không gian học tập.';
          return NextResponse.json({ success: false, message: msg }, { status: 404 });
        }
      }

      const summaries = getAllUserWorkspacesSummary();
      return NextResponse.json({ success: true, workspaces: summaries });
    }

    return NextResponse.json({ success: false, message: 'Endpoint không hợp lệ.' }, { status: 404 });
  }

  // -------------------------------------------------------------
  // POST DISPATCHER
  // -------------------------------------------------------------
  if (method === 'POST') {
    // 1. /api/admin/errors
    if (section === 'errors') {
      try {
        const body = await request.json();
        const { module: modName, message, stack, severity, path: errPath, userId } = body;
        if (!message) {
          return NextResponse.json({ success: false, message: 'Thiếu thông điệp lỗi.' }, { status: 400 });
        }

        const created = addSystemErrorLog({
          module: modName || 'client',
          message: String(message).slice(0, 500),
          stack: stack ? String(stack).slice(0, 3000) : undefined,
          severity: ['critical', 'error', 'warning', 'info'].includes(severity) ? severity : 'error',
          path: errPath ? String(errPath).slice(0, 200) : undefined,
          userId: userId ? String(userId).slice(0, 100) : undefined,
        });

        return NextResponse.json({ success: true, log: created });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ghi nhận lỗi thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    // 2. /api/admin/guides
    if (section === 'guides') {
      const { isAdmin, email: callerEmail } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = await request.json();
        if (body.action === 'reset_starters') {
          const freshList = resetStarterAdminGuides();
          addAuditLog('KHÔI_PHỤC_SỔ_TAY_QUẢN_TRỊ', callerEmail, 'Guides', 'Khôi phục 12 tài liệu hướng dẫn mặc định.');
          return NextResponse.json({ success: true, total: freshList.length, guides: freshList });
        }

        const saved = saveAdminGuide(body);
        addAuditLog('LƯU_TÀI_LIỆU_QUẢN_TRỊ', callerEmail, saved.id, `Tiêu đề: ${saved.title}`);
        return NextResponse.json({ success: true, guide: saved });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi xử lý tài liệu.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    // 3. /api/admin/health (deep audit)
    if (section === 'health') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }
      const diagnostic = runDeepSystemDiagnostic();
      return NextResponse.json({ success: true, diagnostic });
    }

    // 4. /api/admin/setup
    if (section === 'setup') {
      try {
        const token = extractToken(request);
        const payload = token ? verifyToken(token) : null;
        if (!payload?.userId) {
          return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập.' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { setupKey } = body;
        const envSecret = process.env.ADMIN_BOOTSTRAP_KEY;

        if (!envSecret || setupKey !== envSecret) {
          return NextResponse.json(
            { success: false, message: 'Khóa bảo mật quản trị viên không chính xác.' },
            { status: 403 }
          );
        }

        const updated = updateUser(payload.userId, { role: 'admin' });
        addAuditLog('KHỞI_TẠO_ADMIN', updated.email, updated.email, 'Cấp quyền Quản trị viên đầu tiên');
        return NextResponse.json({ success: true, message: 'Đã nâng cấp quyền Quản trị viên!', user: updated });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Thiết lập thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
      }
    }

    // 5. /api/admin/users
    if (section === 'users') {
      const { isAdmin, email: callerEmail } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = await request.json();
        const { name, email, password, role } = body;

        if (!name || !email || !password) {
          return NextResponse.json({ success: false, message: 'Vui lòng điền đủ họ tên, email và mật khẩu.' }, { status: 400 });
        }

        const { user } = registerUser(name, email, password, role || 'user');
        addAuditLog('TẠO_NGƯỜI_DÙNG_MỚI', callerEmail, user.email, `Vai trò: ${user.role}`);
        return NextResponse.json({ success: true, user });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Tạo tài khoản thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
      }
    }

    // 6. /api/admin/vocab
    if (section === 'vocab') {
      const { isAdmin, email: callerEmail } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = await request.json();
        const { item, batch } = body;

        if (Array.isArray(batch) && batch.length > 0) {
          const count = batchSaveSystemVocabulary(batch);
          addAuditLog('NHẬP_TỪ_VỰNG_HỆ_THỐNG', callerEmail, 'Hệ thống', `Nhập ${count} từ vựng mới.`);
          return NextResponse.json({ success: true, count, message: `Đã nhập ${count} từ hệ thống.` });
        }

        if (!item?.hanzi || !item?.pinyin || !item?.meaning) {
          return NextResponse.json({ success: false, message: 'Dữ liệu không đầy đủ.' }, { status: 400 });
        }

        const saved = saveSystemVocabularyItem(item);
        addAuditLog('THÊM_TỪ_HỆ_THỐNG', callerEmail, saved.hanzi, `HSK ${saved.hskLevel} - ${saved.meaning}`);
        return NextResponse.json({ success: true, item: saved });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Thao tác không thành công.';
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
      }
    }

    // 7. /api/admin/workspaces
    if (section === 'workspaces') {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = await request.json();
        if (Array.isArray(body.users)) {
          syncUsersToServer(body.users);
        }
        return NextResponse.json({ success: true, workspaces: getAllUserWorkspacesSummary() });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi đồng bộ danh sách học viên.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, message: 'Endpoint không hợp lệ.' }, { status: 404 });
  }

  // -------------------------------------------------------------
  // PATCH DISPATCHER
  // -------------------------------------------------------------
  if (method === 'PATCH') {
    // 1. /api/admin/errors
    if (section === 'errors') {
      const { isAdmin, email: callerEmail } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !['open', 'acknowledged', 'resolved'].includes(status)) {
          return NextResponse.json({ success: false, message: 'ID và trạng thái hợp lệ là bắt buộc.' }, { status: 400 });
        }

        const updated = updateSystemErrorLogStatus(id, status, callerEmail);
        if (!updated) {
          return NextResponse.json({ success: false, message: 'Không tìm thấy nhật ký lỗi.' }, { status: 404 });
        }

        addAuditLog('CẬP_NHẬT_LỖI_HỆ_THỐNG', callerEmail, id, `Đổi trạng thái: ${status}`);
        return NextResponse.json({ success: true, log: updated });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Cập nhật lỗi thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    // 2. /api/admin/users
    if (section === 'users') {
      const { isAdmin, userId, email: callerEmail } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = await request.json();
        const { id, updates } = body;

        if (!id || !updates) {
          return NextResponse.json({ success: false, message: 'Thiếu thông tin cập nhật.' }, { status: 400 });
        }

        if (id === userId && (updates.role === 'user' || updates.isLocked === true)) {
          return NextResponse.json({ success: false, message: 'Không thể tự hạ quyền hoặc tự khóa tài khoản của chính mình.' }, { status: 400 });
        }

        const updated = updateUser(id, updates);
        addAuditLog('CẬP_NHẬT_NGƯỜI_DÙNG', callerEmail, updated.email, JSON.stringify(updates));
        return NextResponse.json({ success: true, user: updated });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Cập nhật người dùng thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, message: 'Endpoint không hợp lệ.' }, { status: 404 });
  }

  // -------------------------------------------------------------
  // PUT DISPATCHER
  // -------------------------------------------------------------
  if (method === 'PUT') {
    // 1. /api/admin/settings
    if (section === 'settings') {
      const { isAdmin, email } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = (await request.json()) as Partial<SystemConfig>;
        const updated = saveSystemConfig(email, body);
        return NextResponse.json({ success: true, config: updated });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình.';
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
      }
    }

    // 2. /api/admin/vocab
    if (section === 'vocab') {
      const { isAdmin, email: callerEmail } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
      }

      try {
        const body = await request.json();
        const saved = saveSystemVocabularyItem(body);
        addAuditLog('SỬA_TỪ_HỆ_THỐNG', callerEmail, saved.hanzi, `Sửa từ vựng ID: ${saved.id}`);
        return NextResponse.json({ success: true, item: saved });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Cập nhật từ vựng thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, message: 'Endpoint không hợp lệ.' }, { status: 404 });
  }

  // -------------------------------------------------------------
  // DELETE DISPATCHER
  // -------------------------------------------------------------
  if (method === 'DELETE') {
    const { isAdmin, userId, email: callerEmail } = authenticateAdmin(request);

    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Truy cập bị từ chối.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // 1. /api/admin/errors
    if (section === 'errors') {
      try {
        const id = searchParams.get('id');
        const purgeResolved = searchParams.get('purgeResolved') === 'true';

        if (purgeResolved) {
          const removedCount = purgeResolvedSystemErrorLogs();
          addAuditLog('DỌN_DẸP_LỖI_ĐÃ_XỬ_LÝ', callerEmail, 'error_logs', `Đã dọn dẹp ${removedCount} sự cố.`);
          return NextResponse.json({ success: true, message: `Đã dọn dẹp ${removedCount} sự cố.` });
        }

        if (!id) {
          return NextResponse.json({ success: false, message: 'Thiếu ID sự cố cần xóa.' }, { status: 400 });
        }

        const ok = deleteSystemErrorLog(id);
        if (!ok) return NextResponse.json({ success: false, message: 'Không tìm thấy sự cố.' }, { status: 404 });

        addAuditLog('XÓA_NHẬT_KÝ_LỖI', callerEmail, id, `Đã xóa nhật ký lỗi ${id}`);
        return NextResponse.json({ success: true, message: 'Đã xóa bản ghi lỗi thành công.' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Xóa sự cố thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    // 2. /api/admin/guides
    if (section === 'guides') {
      try {
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, message: 'Thiếu mã tài liệu cần xóa.' }, { status: 400 });

        const ok = deleteAdminGuide(id);
        if (!ok) return NextResponse.json({ success: false, message: 'Không tìm thấy tài liệu.' }, { status: 404 });

        addAuditLog('XÓA_TÀI_LIỆU_QUẢN_TRỊ', callerEmail, id, `Đã xóa tài liệu ${id}`);
        return NextResponse.json({ success: true, message: 'Đã xóa tài liệu thành công.' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Xóa tài liệu thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    // 3. /api/admin/users
    if (section === 'users') {
      try {
        const targetId = searchParams.get('id');
        if (!targetId) return NextResponse.json({ success: false, message: 'Thiếu ID người dùng.' }, { status: 400 });

        if (targetId === userId) {
          return NextResponse.json({ success: false, message: 'Không thể tự xóa tài khoản của chính mình.' }, { status: 400 });
        }

        const ok = deleteUser(targetId);
        if (!ok) return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng.' }, { status: 404 });

        addAuditLog('XÓA_NGƯỜI_DÙNG', callerEmail, targetId, 'Đã xóa tài khoản học viên.');
        return NextResponse.json({ success: true, message: 'Đã xóa người dùng thành công.' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Xóa người dùng thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    // 4. /api/admin/vocab
    if (section === 'vocab') {
      try {
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, message: 'Thiếu ID từ vựng.' }, { status: 400 });

        const ok = deleteSystemVocabularyItem(id);
        if (!ok) return NextResponse.json({ success: false, message: 'Không tìm thấy từ vựng.' }, { status: 404 });

        addAuditLog('XÓA_TỪ_HỆ_THỐNG', callerEmail, id, `Đã xóa từ vựng ${id}`);
        return NextResponse.json({ success: true, message: 'Đã xóa từ vựng thành công.' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Xóa từ vựng thất bại.';
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, message: 'Endpoint không hợp lệ.' }, { status: 404 });
  }

  return NextResponse.json({ success: false, message: 'Method không được hỗ trợ.' }, { status: 405 });
}
