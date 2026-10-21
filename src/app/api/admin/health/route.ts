import { NextResponse } from 'next/server';
import { checkSystemHealth, runDeepSystemDiagnostic, authenticateAdmin } from '@/lib/server-db';

export async function GET(request: Request) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const isDeep = searchParams.get('deep') === 'true';

  try {
    if (isDeep) {
      const diagnostic = runDeepSystemDiagnostic();
      return NextResponse.json({
        success: true,
        diagnostic,
      });
    }

    const report = checkSystemHealth();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi kiểm tra sức khỏe hệ thống.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { isAdmin } = authenticateAdmin(request);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên.' },
      { status: 403 }
    );
  }

  try {
    const diagnostic = runDeepSystemDiagnostic();
    return NextResponse.json({
      success: true,
      diagnostic,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi chạy chẩn đoán chuyên sâu.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
