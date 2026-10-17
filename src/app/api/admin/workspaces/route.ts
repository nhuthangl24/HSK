import { NextResponse } from 'next/server';
import { getAllUserWorkspacesSummary, authenticateAdmin } from '@/lib/server-db';

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
