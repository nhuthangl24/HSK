import { NextResponse } from 'next/server';
import { getAdminMetrics, authenticateAdmin } from '@/lib/server-db';

export async function GET(request: Request) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const timeWindow = (url.searchParams.get('timeWindow') as 'all' | '30d' | '7d' | 'today') || 'all';

  const stats = getAdminMetrics(timeWindow);
  return NextResponse.json({ success: true, stats });
}
