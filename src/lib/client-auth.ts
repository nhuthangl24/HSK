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

  const u = currentUser || getCachedUser();
  if (u?.id) {
    headers['x-user-id'] = u.id;
    headers['x-user-email'] = u.email || '';
    headers['x-user-role'] = u.role || 'user';
    headers['x-user-name'] = encodeURIComponent(u.name || '');
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('hsk_session_token') || localStorage.getItem('hsk_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}
