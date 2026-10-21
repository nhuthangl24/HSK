import { User } from '@/types/auth';
import { getCachedUser } from '@/context/AuthContext';

/**
 * Returns authentication headers containing client session metadata and Bearer token
 * to authenticate all server API calls seamlessly for Firebase Auth users.
 */
export function getClientAuthHeaders(currentUser?: User | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let u = currentUser || getCachedUser();

  if (typeof window !== 'undefined') {
    const isDevAdmin = localStorage.getItem('hsk_dev_admin_active') === 'true';
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // If on localhost or explicit dev admin toggle, ensure admin headers are provided
    if ((isDevAdmin || isLocalhost) && (!u || u.role !== 'admin')) {
      u = {
        id: u?.id || 'UpF7pabMmrMWKEGdMms21OB3EDF3',
        email: u?.email || 'nhuthangl24@gmail.com',
        name: u?.name || 'Lưu Như Thắng (Admin)',
        role: 'admin',
        streakDays: u?.streakDays || 5,
        totalMastered: u?.totalMastered || 12,
        createdAt: u?.createdAt || new Date().toISOString(),
      };
    }
  }

  if (u?.id) {
    headers['x-user-id'] = u.id;
    headers['x-user-email'] = u.email || '';
    headers['x-user-role'] = u.role || 'user';
    headers['x-user-name'] = encodeURIComponent(u.name || '');
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('hsk_session_token') || localStorage.getItem('hsk_auth_token');
    if (token && token.trim() && token !== 'undefined' && token !== 'null') {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }
  }

  return headers;
}
