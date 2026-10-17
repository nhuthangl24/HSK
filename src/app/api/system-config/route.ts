import { NextResponse } from 'next/server';
import { getSystemConfig } from '@/lib/server-db';

export async function GET() {
  const config = getSystemConfig();
  return NextResponse.json({
    success: true,
    config: {
      platformName: config.platformName,
      platformDescription: config.platformDescription,
      allowRegistration: config.allowRegistration,
      maintenanceMode: config.maintenanceMode,
      zaloCommunityEnabled: config.zaloCommunityEnabled ?? true,
      zaloCommunityUrl: config.zaloCommunityUrl || 'https://zalo.me/g/vtdrsq845',
      zaloCommunityTitle: config.zaloCommunityTitle || 'Tham gia Cộng Đồng Zalo',
      zaloCommunityDescription: config.zaloCommunityDescription || 'Hỏi đáp & cùng luyện thi HSK mỗi ngày',
    },
  });
}
