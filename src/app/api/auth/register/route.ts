import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/server-db';
import { createToken } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, targetHsk } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Vui lòng cung cấp họ và tên.' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Địa chỉ email không hợp lệ.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' }, { status: 400 });
    }

    const { user } = registerUser(name, email, password, 'user', targetHsk || 3);
    const token = createToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      token,
      message: 'Đăng ký tài khoản thành công.',
    });

    // Set secure HTTP-only cookie
    response.cookies.set('hsk_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Đăng ký không thành công.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
