import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/server-db';
import { createToken } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập email và mật khẩu.' },
        { status: 400 }
      );
    }

    const { user } = authenticateUser(email, password);
    const token = createToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      token,
      message: 'Đăng nhập thành công.',
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
    const message = err instanceof Error ? err.message : 'Đăng nhập thất bại.';
    return NextResponse.json({ success: false, message }, { status: 401 });
  }
}
