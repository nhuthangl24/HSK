import { NextResponse } from 'next/server';
import { saveFeedback, getAllFeedbacks, updateFeedbackStatus, deleteFeedback, authenticateAdmin } from '@/lib/server-db';
import { UserFeedback } from '@/types/auth';

export async function handleFeedback(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  // POST: Send feedback
  if (method === 'POST') {
    try {
      const body = await request.json();
      const { category, message, rating, userEmail, userName, userId } = body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return NextResponse.json(
          { success: false, message: 'Nội dung phản hồi không được để trống.' },
          { status: 400 }
        );
      }

      const feedbackData: Omit<UserFeedback, 'id' | 'createdAt'> = {
        category: category || 'other',
        message: message.trim(),
        rating: typeof rating === 'number' ? rating : 5,
        userEmail: userEmail || undefined,
        userName: userName || undefined,
        userId: userId || undefined,
        deviceInfo: typeof window !== 'undefined' ? window.navigator.userAgent : request.headers.get('user-agent') || undefined,
        status: 'new',
      };

      const created = saveFeedback(feedbackData);

      return NextResponse.json({
        success: true,
        message: 'Cảm ơn bạn đã gửi phản hồi! Ý kiến của bạn đã được ghi nhận.',
        feedback: created,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi gửi phản hồi.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  // GET: List feedbacks (Admin only)
  if (method === 'GET') {
    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    const list = getAllFeedbacks();
    return NextResponse.json({ success: true, feedbacks: list });
  }

  // PATCH: Update status (Admin only)
  if (method === 'PATCH') {
    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    try {
      const body = await request.json();
      const { id, status } = body;
      if (!id || !status) {
        return NextResponse.json({ success: false, message: 'Thiếu id hoặc trạng thái.' }, { status: 400 });
      }

      const ok = updateFeedbackStatus(id, status);
      if (!ok) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy phản hồi.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Đã cập nhật trạng thái phản hồi.' });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái phản hồi.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  // DELETE: Delete feedback (Admin only)
  if (method === 'DELETE') {
    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ success: false, message: 'Thiếu tham số ID phản hồi.' }, { status: 400 });
      }

      const ok = deleteFeedback(id);
      if (!ok) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy phản hồi để xóa.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Đã xóa phản hồi thành công.' });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi xóa phản hồi.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, message: 'Method không được hỗ trợ.' }, { status: 405 });
}
