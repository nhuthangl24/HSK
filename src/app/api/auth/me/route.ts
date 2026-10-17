import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import { getUserRecordById, toPublicUser } from '@/lib/server-db';

export async function GET(request: Request) {
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

