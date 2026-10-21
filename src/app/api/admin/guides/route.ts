import { NextResponse } from 'next/server';
import {
  getAllAdminGuides,
  getAdminGuideById,
  getAdminGuideBySlug,
  saveAdminGuide,
  deleteAdminGuide,
  resetStarterAdminGuides,
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
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const category = searchParams.get('category');
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  if (id) {
    const guide = getAdminGuideById(id);
    if (!guide) {
      return NextResponse.json({ success: false, message: 'Tài liệu không tồn tại.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, guide });
  }

  if (slug) {
    const guide = getAdminGuideBySlug(slug);
    if (!guide) {
      return NextResponse.json({ success: false, message: 'Tài liệu không tồn tại.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, guide });
  }

  let guides = getAllAdminGuides();

  if (category && category !== 'all') {
    guides = guides.filter((g) => g.category === category);
  }

  if (q) {
    guides = guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.summary && g.summary.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        g.content.toLowerCase().includes(q) ||
        (g.tags && g.tags.some((t: string) => t.toLowerCase().includes(q)))
    );
  }

  return NextResponse.json({
    success: true,
    total: guides.length,
    guides,
  });
}

export async function POST(request: Request) {
  const { isAdmin, email: callerEmail } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { title, slug, category, summary, content, tags, order, icon } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, message: 'Tiêu đề, đường dẫn (slug) và nội dung không được để trống.' },
        { status: 400 }
      );
    }

    const saved = saveAdminGuide({
      id: body.id,
      title: title.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      category: category || 'general',
      summary: summary || '',
      content,
      tags: Array.isArray(tags) ? tags : [],
      order: typeof order === 'number' ? order : 100,
      icon: icon || 'FileText',
      updatedBy: callerEmail,
    });

    addAuditLog(
      body.id ? 'CẬP_NHẬT_TÀI_LIỆU_ADMIN' : 'TẠO_TÀI_LIỆU_ADMIN',
      callerEmail,
      saved.slug,
      `Tài liệu: ${saved.title} [${saved.category}]`
    );

    return NextResponse.json({
      success: true,
      guide: saved,
      message: 'Lưu tài liệu quản trị thành công.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi lưu tài liệu quản trị.';
    return NextResponse.json({ success: false, message }, { status: 400 });
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
    const reset = searchParams.get('reset') === 'true';
    const id = searchParams.get('id');

    if (reset) {
      const restored = resetStarterAdminGuides();
      addAuditLog('KHÔI_PHỤC_TÀI_LIỆU_CHUẨN', callerEmail, 'admin_guides', `Khôi phục ${restored.length} tài liệu gốc`);
      return NextResponse.json({
        success: true,
        message: `Đã khôi phục thành công ${restored.length} tài liệu quản trị chuẩn.`,
        guides: restored,
      });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID tài liệu cần xóa.' }, { status: 400 });
    }

    const guide = getAdminGuideById(id);
    const ok = deleteAdminGuide(id);
    if (!ok) {
      return NextResponse.json({ success: false, message: 'Tài liệu không tồn tại hoặc đã bị xóa.' }, { status: 404 });
    }

    addAuditLog('XÓA_TÀI_LIỆU_ADMIN', callerEmail, guide ? guide.slug : id, `Xóa tài liệu: ${guide?.title || id}`);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tài liệu quản trị thành công.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Xóa tài liệu thất bại.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
