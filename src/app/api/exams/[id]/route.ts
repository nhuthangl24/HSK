import { NextResponse } from 'next/server';
import { getExamById, updateExam, deleteExam, incrementExamStats, authenticateAdmin } from '@/lib/server-db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exam = getExamById(id);

    if (!exam) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi này.' }, { status: 404 });
    }

    // Auto increment view stat
    incrementExamStats(id, 'view');

    return NextResponse.json({ success: true, exam });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải đề thi.';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'increment' && (body.type === 'view' || body.type === 'download')) {
      const ok = incrementExamStats(id, body.type);
      return NextResponse.json({ success: ok });
    }

    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    const updated = updateExam(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Cập nhật đề thi thành công!', exam: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi khi cập nhật đề thi.';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isAdmin } = authenticateAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
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
