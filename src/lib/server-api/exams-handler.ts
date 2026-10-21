import { NextResponse } from 'next/server';
import {
  getAllExams,
  getExamById,
  saveExam,
  updateExam,
  deleteExam,
  deleteAllExams,
  resetStarterExams,
  incrementExamStats,
  authenticateAdmin,
} from '@/lib/server-db';
import { HskLevel } from '@/types/vocabulary';

export async function handleExams(request: Request, subSlug: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  const id = subSlug[0];

  // GET
  if (method === 'GET') {
    try {
      if (id) {
        const exam = getExamById(id);
        if (!exam) {
          return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi này.' }, { status: 404 });
        }
        incrementExamStats(id, 'view');
        return NextResponse.json({ success: true, exam });
      }

      const { isAdmin } = authenticateAdmin(request);
      const all = getAllExams();
      const list = isAdmin ? all : all.filter((e) => e.status === 'published');

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
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải đề thi.';
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

      if (body.action === 'reset_starter') {
        const resetList = resetStarterExams();
        return NextResponse.json({
          success: true,
          message: 'Đã khôi phục bộ 10 đề thi mẫu chuẩn HSK 1 - 6.',
          exams: resetList,
        });
      }

      if (body.action === 'batch_import' && Array.isArray(body.exams)) {
        let count = 0;
        for (const item of body.exams) {
          if (item.title && item.level) {
            saveExam(item);
            count++;
          }
        }
        return NextResponse.json({
          success: true,
          message: `Đã nhập thành công ${count} bộ đề thi mới!`,
          exams: getAllExams(),
        });
      }

      const { title, level, year, durationMinutes, totalQuestions } = body;
      if (!title || !title.trim()) {
        return NextResponse.json({ success: false, message: 'Tiêu đề đề thi không được để trống.' }, { status: 400 });
      }

      const created = saveExam({
        title: title.trim(),
        hskLevel: (Number(body.hskLevel || body.level) || 1) as HskLevel,
        category: body.category || 'official',
        source: body.source?.trim() || 'Hán Ban (Hanban) Official',
        year: Number(year) || new Date().getFullYear(),
        durationMinutes: Number(durationMinutes) || 35,
        questionCount: Number(body.questionCount || totalQuestions) || 40,
        description: body.description?.trim() || '',
        pdfUrl: body.pdfUrl?.trim() || '',
        audioUrl: body.audioUrl?.trim() || '',
        answerUrl: body.answerUrl || body.answersUrl?.trim() || '',
        status: body.status || 'published',
        isPinned: Boolean(body.isPinned),
      });

      return NextResponse.json({
        success: true,
        message: 'Đã tạo và đăng tải bộ đề thi thành công!',
        exam: created,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tạo đề thi.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  // PATCH
  if (method === 'PATCH') {
    try {
      if (!id) {
        return NextResponse.json({ success: false, message: 'Thiếu mã đề thi.' }, { status: 400 });
      }

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

      if (id) {
        const ok = deleteExam(id);
        if (!ok) {
          return NextResponse.json({ success: false, message: 'Không tìm thấy đề thi để xóa.' }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Đã xóa đề thi thành công.' });
      }

      deleteAllExams();
      return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ kho đề thi.' });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi xóa đề thi.';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, message: 'Method không được hỗ trợ.' }, { status: 405 });
}
