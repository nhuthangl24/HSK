import { NextResponse } from 'next/server';
import {
  getAllExams,
  saveExam,
  updateExam,
  deleteExam,
  deleteAllExams,
  resetStarterExams,
  incrementExamStats,
} from '@/lib/server-db';
import { authenticateAdmin } from '@/lib/server-db';
import { ExamItem } from '@/types/exam';

export async function GET(request: Request) {
  try {
    const { isAdmin } = authenticateAdmin(request);
    const all = getAllExams();

    // If admin, show all including drafts; if public learner, only show published
    const list = isAdmin ? all : all.filter((e) => e.status === 'published');

    // Sort: Pinned first, then newest updatedAt
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return NextResponse.json(
      { success: true, exams: list },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải danh sách đề thi.';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.action === 'reset_starter') {
      const restored = resetStarterExams();
      return NextResponse.json({
        success: true,
        message: 'Đã nạp lại các bộ đề thi mẫu thành công!',
        exams: restored,
      });
    }

    const {
      title,
      hskLevel,
      category,
      year,
      source,
      durationMinutes,
      questionCount,
      description,
      pdfUrl,
      audioUrl,
      answerUrl,
      isPinned,
      status,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: 'Tiêu đề đề thi không được để trống.' },
        { status: 400 }
      );
    }

    const created = saveExam({
      title: title.trim(),
      hskLevel: hskLevel || 1,
      category: category || 'official',
      year: typeof year === 'number' ? year : new Date().getFullYear(),
      source: source?.trim() || 'Biên soạn bởi HSK Master',
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      questionCount: questionCount ? Number(questionCount) : undefined,
      description: description?.trim() || '',
      pdfUrl: pdfUrl?.trim() || '',
      audioUrl: audioUrl?.trim() || '',
      answerUrl: answerUrl?.trim() || '',
      isPinned: Boolean(isPinned),
      status: status === 'draft' ? 'draft' : 'published',
    });

    return NextResponse.json({
      success: true,
      message: 'Tạo đề thi mới thành công!',
      exam: created,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tạo đề thi.';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, type, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu mã đề thi (id).' }, { status: 400 });
    }

    // Public action: increment views or downloads
    if (action === 'increment' && (type === 'view' || type === 'download')) {
      const ok = incrementExamStats(id, type);
      return NextResponse.json({ success: ok });
    }

    // Other edits require Admin privilege
    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    const updated = updateExam(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi cần cập nhật.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Cập nhật đề thi thành công!', exam: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi khi cập nhật đề thi.';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const deleteAll = url.searchParams.get('all') === 'true';

    if (deleteAll) {
      deleteAllExams();
      return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ đề thi thành công.' });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu mã đề thi (id).' }, { status: 400 });
    }

    const ok = deleteExam(id);
    if (!ok) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi để xóa.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa đề thi thành công.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi khi xóa đề thi.';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
