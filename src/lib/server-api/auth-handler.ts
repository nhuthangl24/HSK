import { NextResponse } from 'next/server';
import { authenticateUser, registerUser, getUserRecordById, toPublicUser } from '@/lib/server-db';
import { createToken, extractToken, verifyToken } from '@/lib/server-auth';
import { User } from '@/types/auth';

export async function handleAuth(request: Request, subSlug: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  const action = subSlug[0];

  if (method === 'GET') {
    if (action === 'me') {
      const token = extractToken(request);
      if (!token) {
        return NextResponse.json({ authenticated: false, user: null });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json({ authenticated: false, user: null });
      }

      const userRecord = getUserRecordById(payload.userId);
      if (!userRecord || userRecord.isLocked) {
        return NextResponse.json({ authenticated: false, user: null });
      }

      const publicUser = toPublicUser(userRecord);
      return NextResponse.json({
        authenticated: true,
        user: publicUser,
        isAdmin: publicUser.role === 'admin',
      });
    }

    return NextResponse.json({ success: false, message: 'Endpoint không hợp lệ.' }, { status: 404 });
  }

  if (method === 'POST') {
    // 1. /api/auth/login
    if (action === 'login') {
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

    // 2. /api/auth/register
    if (action === 'register') {
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

        response.cookies.set('hsk_session_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 3600,
        });

        return response;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đăng ký không thành công.';
        return NextResponse.json({ success: false, message }, { status: 400 });
      }
    }

    // 3. /api/auth/logout
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Đã đăng xuất.' });
      response.cookies.delete('hsk_session_token');
      return response;
    }

    // 4. /api/auth/session
    if (action === 'session') {
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
  }

  return NextResponse.json({ success: false, message: 'Endpoint không hợp lệ.' }, { status: 404 });
}
