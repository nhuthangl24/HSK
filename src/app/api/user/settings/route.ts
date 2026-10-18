import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getUserSettings, saveUserSettings, updateUser } from '@/lib/server-db';
import { UserSettings } from '@/types/auth';

function getUserIdFromRequest(request: Request): string | null {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (payload?.userId) return payload.userId;

  const headerUserId = request.headers.get('x-user-id') || request.headers.get('x-client-user-id');
  if (headerUserId && headerUserId.trim() && headerUserId.trim() !== 'undefined' && headerUserId.trim() !== 'null') {
    return headerUserId.trim();
  }
  return null;
}

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    const guestSettings = getUserSettings('guest');
    return NextResponse.json({
      success: true,
      settings: guestSettings,
      isGuest: true,
    });
  }

  const settings = getUserSettings(userId);
  return NextResponse.json({ success: true, settings, isGuest: false });
}

export async function PUT(request: Request) {
  const userId = getUserIdFromRequest(request);

  try {
    const body = (await request.json()) as Partial<UserSettings> & { targetHsk?: number; userId?: string };
    const effectiveUserId = userId || body.userId || 'guest';

    const updated = saveUserSettings(effectiveUserId, body);
    if (effectiveUserId !== 'guest' && typeof body.targetHsk === 'number' && body.targetHsk >= 1 && body.targetHsk <= 9) {
      try {
        updateUser(effectiveUserId, { targetHsk: body.targetHsk });
      } catch {}
    }
    return NextResponse.json({ success: true, settings: updated, isGuest: !userId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi lưu cài đặt.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
