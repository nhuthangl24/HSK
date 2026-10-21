import { NextResponse } from 'next/server';
import { handleAdmin } from '@/lib/server-api/admin-handler';
import { handleAuth } from '@/lib/server-api/auth-handler';
import { handleExams } from '@/lib/server-api/exams-handler';
import { handleVocab } from '@/lib/server-api/vocab-handler';
import { handleCustomHsk } from '@/lib/server-api/custom-hsk-handler';
import { handleFeedback } from '@/lib/server-api/feedback-handler';
import { handleNotifications } from '@/lib/server-api/notifications-handler';
import { handleSystemConfig } from '@/lib/server-api/system-config-handler';
import { handleTopics } from '@/lib/server-api/topics-handler';
import { handleUser } from '@/lib/server-api/user-handler';

interface RouteContext {
  params: Promise<{ slug?: string[] }>;
}

async function dispatch(request: Request, context: RouteContext): Promise<Response> {
  const { slug = [] } = (await context.params) || {};
  const domain = slug[0];
  const subSlug = slug.slice(1);

  if (!domain) {
    return NextResponse.json({
      success: true,
      message: 'HSK Master Unified API Gateway is active.',
      version: '2.0.0',
    });
  }

  switch (domain) {
    case 'admin':
      return handleAdmin(request, subSlug);
    case 'auth':
      return handleAuth(request, subSlug);
    case 'exams':
      return handleExams(request, subSlug);
    case 'vocab':
      return handleVocab(request, subSlug);
    case 'custom-hsk':
      return handleCustomHsk(request);
    case 'feedback':
      return handleFeedback(request);
    case 'notifications':
      return handleNotifications(request);
    case 'system-config':
      return handleSystemConfig();
    case 'topics':
      return handleTopics(request);
    case 'user':
      return handleUser(request, subSlug);
    default:
      return NextResponse.json(
        { success: false, message: `Endpoint /api/${domain} không tồn tại.` },
        { status: 404 }
      );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return dispatch(request, context);
}
