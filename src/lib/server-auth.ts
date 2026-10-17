import crypto from 'crypto';
import { User, UserRole } from '@/types/auth';

const AUTH_SECRET = process.env.AUTH_SECRET || 'hsk-secure-jwt-auth-secret-key-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number; // unix timestamp in seconds
}

/**
 * Hash a password using scrypt with salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Verify password against stored hash and salt
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Create a secure HMAC-signed token
 */
export function createToken(user: User, expiresInSeconds = 7 * 24 * 3600): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode an HMAC-signed token
 */
export const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL,
  process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  'luunhuthang2402@gmail.com',
]
  .filter(Boolean)
  .map((e) => (e as string).toLowerCase().trim());

export function isUserAdmin(email?: string, role?: string): boolean {
  if (role === 'admin') return true;
  if (email && ADMIN_EMAILS.includes(email.toLowerCase().trim())) return true;
  return false;
}

/**
 * Verify and decode an HMAC-signed token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payloadB64)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    // Auto-elevate if email is authorized admin
    if (isUserAdmin(payload.email, payload.role)) {
      payload.role = 'admin';
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Request (Authorization header, Cookie, or client auth bridge)
 */
export function extractToken(request: Request): string | null {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie: hsk_session_token=<token>
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith('hsk_session_token=')) {
        return c.substring('hsk_session_token='.length).trim();
      }
    }
  }

  // 3. Check client authenticated user headers (Firebase client session bridge)
  const userId = request.headers.get('x-user-id') || request.headers.get('x-client-user-id');
  if (userId && userId.trim()) {
    const cleanId = userId.trim();
    const cleanEmail = (request.headers.get('x-user-email') || '').trim().toLowerCase();
    const rawRole = (request.headers.get('x-user-role') as UserRole) || 'user';
    const cleanRole: UserRole = isUserAdmin(cleanEmail, rawRole) ? 'admin' : rawRole;
    return createToken({
      id: cleanId,
      email: cleanEmail,
      role: cleanRole,
      name: request.headers.get('x-user-name') || cleanEmail.split('@')[0] || 'User',
      streakDays: 0,
      totalMastered: 0,
      createdAt: new Date().toISOString(),
    });
  }

  return null;
}

