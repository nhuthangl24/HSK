import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getUserSettings, saveUserSettings, updateUser } from '@/lib/server-db';
import { UserSettings } from '@/types/auth';

export async function GET(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({
      success: true,
      settings: {
        userId: 'guest',
        theme: 'light',
        ttsRate: 0.85,
        autoPronounce: false,
        fontSize: 'normal',
      },
      isGuest: true,
    });
  }

  const settings = getUserSettings(payload.userId);
  return NextResponse.json({ success: true, settings, isGuest: false });
}

export async function PUT(request: Request) {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để lưu cài đặt lên tài khoản.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<UserSettings> & { targetHsk?: number };
    const updated = saveUserSettings(payload.userId, body);
    if (typeof body.targetHsk === 'number' && body.targetHsk >= 1 && body.targetHsk <= 9) {
      try {
        updateUser(payload.userId, { targetHsk: body.targetHsk });
      } catch {}
    }
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi lưu cài đặt.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
