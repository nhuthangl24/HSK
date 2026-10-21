import { NextResponse } from 'next/server';
import {
  getAllNotifications,
  saveNotification,
  updateNotification,
  deleteNotification,
  deleteAllNotifications,
  authenticateAdmin,
} from '@/lib/server-db';

export async function handleNotifications(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  // GET
  if (method === 'GET') {
    try {
      const list = getAllNotifications();
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(
        { success: true, notifications: list },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải thông báo.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  // POST
  if (method === 'POST') {
    try {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { title, message, type, priority, actionLabel, actionType, actionPayload } = body;

      if (!title || !title.trim()) {
        return NextResponse.json(
          { success: false, message: 'Tiêu đề thông báo không được để trống.' },
          { status: 400 }
        );
      }

      if (!message || !message.trim()) {
        return NextResponse.json(
          { success: false, message: 'Nội dung thông báo không được để trống.' },
          { status: 400 }
        );
      }

      const created = saveNotification({
        title: title.trim(),
        message: message.trim(),
        type: type || 'system',
        priority: priority || 'normal',
        actionLabel: actionLabel?.trim() || undefined,
        actionType: actionType || undefined,
        actionPayload: actionPayload?.trim() || undefined,
      });

      return NextResponse.json({
        success: true,
        message: 'Đã phát thông báo thành công tới toàn bộ học viên!',
        notification: created,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tạo thông báo.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  // PATCH
  if (method === 'PATCH') {
    try {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json({ success: false, message: 'Thiếu mã thông báo (id).' }, { status: 400 });
      }

      const updated = updateNotification(id, updates);
      if (!updated) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy thông báo.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Cập nhật thông báo thành công!', notification: updated });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi cập nhật thông báo.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  // DELETE
  if (method === 'DELETE') {
    try {
      const { isAdmin } = authenticateAdmin(request);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
          { status: 403 }
        );
      }

      const url = new URL(request.url);
      let id = url.searchParams.get('id');
      const deleteAll = url.searchParams.get('all') === 'true';

      // Support json body if id not in query
      if (!id && !deleteAll) {
        const body = await request.json().catch(() => ({}));
        if (body.id) id = body.id;
        if (body.all) {
          deleteAllNotifications();
          return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ thông báo thành công.' });
        }
      }

      if (deleteAll || id === 'all') {
        deleteAllNotifications();
        return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ thông báo thành công.' });
      }

      if (!id || !id.trim()) {
        return NextResponse.json({ success: false, message: 'Thiếu mã thông báo (id).' }, { status: 400 });
      }

      const ok = deleteNotification(id.trim());
      return NextResponse.json({
        success: true,
        message: ok ? 'Đã xóa thông báo thành công.' : 'Thông báo đã được gỡ bỏ.',
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi xóa thông báo.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, message: 'Method không được hỗ trợ.' }, { status: 405 });
}
