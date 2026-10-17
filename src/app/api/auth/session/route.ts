import { NextResponse } from 'next/server';
import { createToken } from '@/lib/server-auth';
import { User } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user } = body as { user?: User };

    if (!user || !user.id) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin người dùng.' }, { status: 400 });
    }

    const token = createToken(user);
    const response = NextResponse.json({
      success: true,
      token,
      message: 'Phiên đăng nhập đã được đồng bộ.',
    });

    response.cookies.set('hsk_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi đồng bộ phiên.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
