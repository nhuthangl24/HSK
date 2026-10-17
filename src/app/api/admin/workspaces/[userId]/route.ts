import { NextResponse } from 'next/server';
import { getUserWorkspaceData, authenticateAdmin } from '@/lib/server-db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const { userId } = await params;
  try {
    const data = getUserWorkspaceData(userId);
    return NextResponse.json({ success: true, workspace: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi lấy không gian người dùng.';
    return NextResponse.json({ success: false, message }, { status: 404 });
  }
}
