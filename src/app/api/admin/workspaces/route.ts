import { NextResponse } from 'next/server';
import { getAllUserWorkspacesSummary, syncUsersToServer, authenticateAdmin } from '@/lib/server-db';

export async function GET(request: Request) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const summaries = getAllUserWorkspacesSummary();
  return NextResponse.json({ success: true, workspaces: summaries });
}

export async function POST(request: Request) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    if (Array.isArray(body.users)) {
      syncUsersToServer(body.users);
    }
    const summaries = getAllUserWorkspacesSummary();
    return NextResponse.json({ success: true, workspaces: summaries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi đồng bộ danh sách học viên.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
