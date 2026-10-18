import { NextResponse } from 'next/server';
import { saveFeedback, getAllFeedbacks, authenticateAdmin } from '@/lib/server-db';
import { UserFeedback } from '@/types/auth';

export async function POST(request: Request) {
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

export async function GET(request: Request) {
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
