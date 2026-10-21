import { getClientAuthHeaders } from './client-auth';

export interface ReportIncidentOptions {
  module: 'database' | 'exams' | 'auth' | 'audio_tts' | 'workspaces' | 'ui_render' | 'network' | string;
  message: string;
  severity?: 'critical' | 'error' | 'warning' | 'info';
  stack?: string;
  path?: string;
  userId?: string;
}

/**
 * Client-side utility to report errors, warnings, or incidents to the Centralized Error Log API
 */
export async function reportSystemIncident(options: ReportIncidentOptions): Promise<boolean> {
  try {
    const payload = {
      module: options.module || 'client',
      message: options.message,
      severity: options.severity || 'error',
      stack: options.stack || (typeof window !== 'undefined' ? window.location.href : undefined),
      path: options.path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      userId: options.userId,
    };

    const res = await fetch('/api/admin/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getClientAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('Failed to report incident to /api/admin/errors:', err);
    return false;
  }
}
