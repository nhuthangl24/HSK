import { NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/server-auth';
import {
  getUserRecordById,
  getUserCredits,
  deductUserCredit,
  updateUser,
  DEFAULT_AI_CREDITS,
  getAssessmentBySessionId,
  getAssessmentsByUserId,
  saveAssessmentRecord,
} from '@/lib/server-db';
import { AVAILABLE_AI_MODELS, ConversationAssessmentReport } from '@/types/ai';
import { evaluateConversation } from './assessment-service';

// In-memory set to prevent concurrent duplicate evaluation runs for the same session
const activeEvaluatingSessions = new Set<string>();

const HHTECH_BASE_URL = process.env.HHTECH_BASE_URL || 'https://hhtechapi.net/v1';
const HHTECH_API_KEY = process.env.HHTECH_API_KEY || 'sk-372528de2e1f44d098a5fa7d';
const DEFAULT_MODEL = process.env.HHTECH_MODEL || 'deepseek-v4.1-flash';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestPayload {
  messages: ChatMessage[];
  scenario?: string;
  hskLevel?: number;
  model?: string;
  stream?: boolean;
}

function getUserIdFromRequest(request: Request): string | null {
  const token = extractToken(request);
  const payload = token ? verifyToken(token) : null;
  if (payload?.userId) return payload.userId;

  const headerUserId = request.headers.get('x-user-id') || request.headers.get('x-client-user-id');
  if (headerUserId && headerUserId.trim() && headerUserId.trim() !== 'undefined' && headerUserId.trim() !== 'null') {
    return headerUserId.trim();
  }
  return null;
}

function buildSystemPrompt(scenario = 'free_chat', hskLevel = 3): string {
  let scenarioInstruction = '';
  switch (scenario) {
    case 'restaurant':
      scenarioInstruction = `
TÌNH HUỐNG: Nhà hàng Trung Quốc (餐厅).
Bạn đóng vai nhân viên phục vụ (服务员) chuyên nghiệp, niềm nở.
Hãy chào đón khách (学 员), giới thiệu các món ăn đặc sắc (như 麻婆豆腐, 宫保鸡丁, 北京烤鸭, 水饺, 奶茶...), hỏi khẩu vị (cay hay không cay), ghi món, xác nhận hóa đơn và chúc ngon miệng.`;
      break;
    case 'shopping':
      scenarioInstruction = `
TÌNH HUỐNG: Mua sắm & Mặc cả tại chợ / cửa hàng (购物与讨价还价).
Bạn đóng vai chủ cửa hàng (老板 / 售货员) vui vẻ, khéo léo bán hàng.
Hãy giới thiệu sản phẩm (quần áo, đồ lưu niệm, trà, trái cây), đưa ra giá ban đầu, tương tác khi học viên trả giá (太贵了, 便宜一点儿吧), tạo các tình huống mặc cả vui vẻ và thanh toán (微信/支付宝).`;
      break;
    case 'travel':
      scenarioInstruction = `
TÌNH HUỐNG: Du lịch & Hỏi đường (旅游与问路).
Bạn đóng vai người dân địa phương thân thiện tại Bắc Kinh hoặc Thượng Hải.
Hãy chỉ đường chi tiết (往前走, 向右拐, 过马路, 坐地铁/公交), hướng dẫn mua vé, thời gian di chuyển, và gợi ý các điểm đến hấp dẫn (故宫, 天安门, 外滩, 颐和园).`;
      break;
    case 'interview':
      scenarioInstruction = `
TÌNH HUỐNG: Phỏng vấn xin việc bằng tiếng Trung (中文面试).
Bạn đóng vai nhà tuyển dụng / HR (面试官) lịch thiệp nhưng nghiêm túc.
Hãy đặt các câu hỏi phỏng vấn chuẩn mực: giới thiệu bản thân (自我介绍), kinh nghiệm làm việc, lý do ứng tuyển, điểm mạnh điểm yếu, mức lương mong muốn. Sau mỗi câu trả lời, hãy nhận xét cách diễn đạt chuyên nghiệp.`;
      break;
    case 'health_doctor':
      scenarioInstruction = `
TÌNH HUỐNG: Bác sĩ & Sức khỏe (看病与健康).
Bạn đóng vai bác sĩ tận tình tại bệnh viện hoặc phòng khám Trung Quốc.
Hãy hỏi thăm triệu chứng (你哪里不舒服？头疼、发烧还是咳嗽？), hướng dẫn cách uống thuốc (一天三次, 饭后吃), dặn dò nghỉ ngơi và tái khám.`;
      break;
    case 'office_work':
      scenarioInstruction = `
TÌNH HUỐNG: Công việc & Văn phòng (职场与商务办公).
Bạn đóng vai đồng nghiệp hoặc quản lý thân thiện trong môi trường công sở quốc tế.
Cùng học viên trao đổi về dự án, báo cáo tiến độ (汇报工作), sắp xếp cuộc họp (开会), viết email công việc và thảo luận công việc thường ngày.`;
      break;
    case 'grammar_doctor':
      scenarioInstruction = `
TÌNH HUỐNG: Bác sĩ Ngữ pháp HSK (语法医生).
Nhiệm vụ trọng tâm của bạn là "khám bệnh" cho câu tiếng Trung của học viên.
Hãy phân tích cực kỳ chi tiết các cấu trúc ngữ pháp (câu chữ 把, câu chữ 被, câu so sánh 比, trợ từ ngữ khí 了, 着, 过, bổ ngữ kết quả/khả năng/xu hướng...).
Chỉ ra chính xác: Lỗi sai ở đâu? Tại sao sai? Viết lại thế nào cho chuẩn người bản xứ?`;
      break;
    case 'hskk_exam':
      scenarioInstruction = `
TÌNH HUỐNG: Luyện thi khẩu ngữ HSKK (HSKK 口语考试模拟).
Bạn đóng vai giám khảo luyện thi HSKK (HSK ${hskLevel}).
Hãy đưa ra các dạng bài thi thực tế: Nhắc lại câu (听后重复), Trả lời câu hỏi theo tranh hoặc chủ đề (看图说话 / 回答问题).
Chấm điểm phản xạ, chỉ ra từ vựng HSK nên áp dụng để đạt điểm cao.`;
      break;
    case 'free_chat':
    default:
      scenarioInstruction = `
TÌNH HUỐNG: Hội thoại tự do hàng ngày (日常自由交谈).
Bạn là bạn đồng hành luyện khẩu ngữ thân thiện, vui vẻ. Cùng học viên trò chuyện về sở thích, công việc, ẩm thực, thời tiết, cuộc sống, âm nhạc, phim ảnh...`;
      break;
  }

  return `Bạn là "Tiểu Trí" (小智) - Trợ lý Gia sư AI Luyện Nói & Hội Thoại Tiếng Trung của hệ thống HSK Interactive Sheet.
Mục tiêu của bạn là giúp người Việt Nam luyện phản xạ, nói tiếng Trung lưu loát, tự tin và chuẩn ngữ pháp.

TRÌNH ĐỘ HỌC VIÊN HIỆN TẠI: HSK ${hskLevel} (Hãy điều chỉnh độ khó từ vựng và câu phù hợp với trình độ này).

${scenarioInstruction}

NGUYÊN TẮC TRẢ LỜI & ĐỊNH DẠNG (BẮT BUỘC DÙNG MARKDOWN CHUẨN):
1. PHẢN HỒI BẰNG TIẾNG TRUNG TỰ NHIÊN:
   - Trả lời bằng tiếng Trung Giản thể (简体中文) tự nhiên, phát âm chuẩn Bắc Kinh.
   - Trình bày định dạng Markdown đẹp mắt (có thể in đậm **từ khóa**, dùng gạch đầu dòng hoặc bảng biểu nếu phù hợp).
   - Tuyệt đối KHÔNG viết chèn pinyin hoặc dịch nghĩa lẫn lộn vào giữa các câu tiếng Trung chính.

2. TÁCH BIỆT KHỐI PHIÊN ÂM PINYIN & DỊCH NGHĨA Ở CUỐI TIN NHẮN:
   Sau phần hội thoại tiếng Trung chính, BẮT BUỘC cung cấp phiên âm Pinyin và dịch nghĩa tiếng Việt trong đúng định dạng khối sau:

> 拼 **Pinyin**: [Toàn bộ phiên âm Pinyin có thanh điệu chuẩn của câu tiếng Trung trên]
> 🌐 **Dịch nghĩa**: [Bản dịch tiếng Việt tự nhiên, chuẩn xác]

3. PHÂN TÍCH & SỬA LỖI HỌC VIÊN (NẾU HỌC VIÊN NÓI CÓ LỖI HOẶC CẦN NÂNG CẤP):
   Nếu câu nói của học viên sai ngữ pháp, dùng từ chưa tự nhiên hoặc phát âm cần lưu ý, hãy thêm khối góp ý Markdown ở cuối:

> 💡 **Gợi ý học tập**:
> - **Cách nói tự nhiên hơn**: [Câu tiếng Trung chuẩn bản xứ]
> - **Giải thích**: [Giải thích súc tích bằng tiếng Việt vì sao nên nói như vậy]

4. TÍNH TƯƠNG TÁC CAO: Luôn kết thúc bằng 1 câu hỏi mở bằng tiếng Trung để dẫn dắt học viên tiếp tục phản xạ hội thoại.
5. DUY TRÌ MẠCH HỘI THOẠI TỰ NHIÊN: Lắng nghe, nhớ các thông tin học viên vừa chia sẻ, tránh lặp lại câu hỏi cũ, khuyến khích học viên tự nhiên bày tỏ ý tưởng.
6. NGUYÊN TẮC BẢO MẬT ĐÁNH GIÁ (QUAN TRỌNG):
   - Tuyệt đối KHÔNG ngắt ngang hội thoại để chấm điểm hoặc công bố điểm số tổng kết.
   - Không tiết lộ barem chấm điểm chi tiết trong hội thoại. Việc chấm điểm và lập báo cáo đánh giá toàn diện sẽ chỉ diễn ra trên toàn bộ phiên sau khi học viên kết thúc hội thoại.
7. Giữ thái độ thân thiện, khích lệ và tạo cảm hứng cho người học!`;
}

export async function handleAi(request: Request, subSlug: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  const action = subSlug[0]; // e.g. 'chat', 'credits', 'models'

  // 1. GET /api/ai/models
  if (method === 'GET' && action === 'models') {
    return NextResponse.json({
      success: true,
      models: AVAILABLE_AI_MODELS,
      defaultModel: DEFAULT_MODEL,
    });
  }

  // 2. GET /api/ai/credits
  if (method === 'GET' && action === 'credits') {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({
        success: true,
        credits: 3,
        isGuest: true,
        message: 'Chế độ khách: Tặng 3 lượt trò chuyện thử nghiệm. Đăng ký để nhận 200 credits!',
      });
    }

    const credits = getUserCredits(userId);
    return NextResponse.json({
      success: true,
      credits,
      isGuest: false,
    });
  }

  // 3. POST /api/ai/chat
  if (method === 'POST' && action === 'chat') {
    const userId = getUserIdFromRequest(request);
    const isGuest = !userId;

    let remainingCredits = DEFAULT_AI_CREDITS;

    // Check credits
    if (isGuest) {
      // Check guest cookie or header counter
      const guestUsageHeader = request.headers.get('x-guest-chat-count');
      const guestUsage = parseInt(guestUsageHeader || '0', 10);
      if (guestUsage >= 3) {
        return NextResponse.json(
          {
            success: false,
            message: 'Bạn đã dùng hết 3 lượt trò chuyện thử nghiệm. Vui lòng Đăng nhập hoặc Tạo tài khoản miễn phí để nhận ngay 200 Credits!',
            requireAuth: true,
          },
          { status: 403 }
        );
      }
      remainingCredits = Math.max(0, 3 - guestUsage - 1);
    } else {
      const currentCredits = getUserCredits(userId);
      if (currentCredits < 1) {
        return NextResponse.json(
          {
            success: false,
            message: 'Tài khoản của bạn đã hết credit AI (số dư: 0). Vui lòng liên hệ Quản trị viên để được nạp thêm credit học tập!',
            outOfCredits: true,
            remainingCredits: 0,
          },
          { status: 402 }
        );
      }
    }

    try {
      const body = (await request.json()) as ChatRequestPayload;
      const { messages = [], scenario = 'free_chat', hskLevel = 3, model = DEFAULT_MODEL, stream = false } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ success: false, message: 'Danh sách tin nhắn không hợp lệ.' }, { status: 400 });
      }

      const systemPrompt = buildSystemPrompt(scenario, hskLevel);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ];

      // Validate selected model
      const validModelIds = AVAILABLE_AI_MODELS.map((m) => m.id);
      const effectiveModel = validModelIds.includes(model) ? model : DEFAULT_MODEL;

      // Handle Streaming SSE
      if (stream) {
        const hhtechRes = await fetch(`${HHTECH_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${HHTECH_API_KEY}`,
          },
          body: JSON.stringify({
            model: effectiveModel,
            messages: apiMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!hhtechRes.ok) {
          const errText = await hhtechRes.text();
          console.error('HHTECH API Stream Error:', hhtechRes.status, errText);
          return NextResponse.json(
            { success: false, message: 'Không thể kết nối đến máy chủ AI. Vui lòng thử lại sau.' },
            { status: 502 }
          );
        }

        // Deduct 1 credit upon initiating stream
        if (!isGuest && userId) {
          const deductRes = deductUserCredit(userId, 1);
          remainingCredits = deductRes.remainingCredits;
        }

        // Forward SSE stream to client
        const streamResponse = new ReadableStream({
          async start(controller) {
            const reader = hhtechRes.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } catch (err) {
              controller.error(err);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(streamResponse, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'x-remaining-credits': String(remainingCredits),
          },
        });
      }

      // Non-streaming standard response
      const hhtechRes = await fetch(`${HHTECH_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HHTECH_API_KEY}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!hhtechRes.ok) {
        const errText = await hhtechRes.text();
        console.error('HHTECH API Error:', hhtechRes.status, errText);
        return NextResponse.json(
          { success: false, message: 'Máy chủ AI đang bận hoặc phản hồi lỗi. Vui lòng thử lại.' },
          { status: 502 }
        );
      }

      const resData = await hhtechRes.json();
      const assistantMessage = resData?.choices?.[0]?.message?.content || 'Xin lỗi, tôi chưa thể trả lời lúc này.';

      // Deduct 1 credit
      if (!isGuest && userId) {
        const deductRes = deductUserCredit(userId, 1);
        remainingCredits = deductRes.remainingCredits;
      }

      return NextResponse.json({
        success: true,
        message: {
          role: 'assistant',
          content: assistantMessage,
        },
        model: effectiveModel,
        remainingCredits,
        isGuest,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xử lý tin nhắn AI.';
      console.error('Error in handleAi chat:', err);
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
  }

  // 4. POST /api/ai/credits/topup or /api/ai/topup
  if (method === 'POST' && (action === 'topup' || (action === 'credits' && subSlug[1] === 'topup'))) {
    try {
      const body = await request.json();
      const { targetUserId, amount } = body;

      if (!targetUserId || typeof amount !== 'number') {
        return NextResponse.json({ success: false, message: 'Thiếu thông tin nạp credit.' }, { status: 400 });
      }

      const current = getUserCredits(targetUserId);
      const newTotal = Math.max(0, current + amount);
      updateUser(targetUserId, { aiCredits: newTotal });

      return NextResponse.json({
        success: true,
        targetUserId,
        previousCredits: current,
        newCredits: newTotal,
        message: `Đã nạp thành công ${amount > 0 ? '+' + amount : amount} credits! Số dư mới: ${newTotal}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nạp credit thất bại.';
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
  }

  // 5. GET /api/ai/assessment (Retrieve single report by sessionId or list for user)
  if (method === 'GET' && (action === 'assessment' || action === 'assess')) {
    try {
      const { searchParams } = new URL(request.url);
      const sessionId = searchParams.get('sessionId') || searchParams.get('session_id');
      const getHistory = searchParams.get('history') === 'true';

      const callerUserId = getUserIdFromRequest(request);

      // A. Query single session assessment
      if (sessionId) {
        const report = getAssessmentBySessionId(sessionId);
        if (!report) {
          return NextResponse.json(
            { success: false, message: 'Không tìm thấy báo cáo đánh giá cho phiên này.' },
            { status: 404 }
          );
        }

        // Authorization check: ensure users can only access their own assessment reports
        if (report.user_id && report.user_id !== 'guest') {
          const isOwner = callerUserId === report.user_id;
          const caller = callerUserId ? getUserRecordById(callerUserId) : null;
          const isAdmin = caller?.role === 'admin';

          if (!isOwner && !isAdmin) {
            return NextResponse.json(
              { success: false, message: 'Bạn không có quyền truy cập báo cáo đánh giá này.' },
              { status: 403 }
            );
          }
        }

        return NextResponse.json({ success: true, report });
      }

      // B. Query user history
      if (getHistory) {
        if (!callerUserId) {
          return NextResponse.json(
            { success: false, message: 'Vui lòng đăng nhập để xem lịch sử đánh giá.' },
            { status: 401 }
          );
        }
        const reports = getAssessmentsByUserId(callerUserId);
        return NextResponse.json({ success: true, reports });
      }

      return NextResponse.json({ success: false, message: 'Thiếu tham số sessionId hoặc history.' }, { status: 400 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi lấy báo cáo đánh giá.';
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
  }

  // 6. POST /api/ai/assessment (Trigger Conversation-Based Speaking Assessment)
  if (method === 'POST' && (action === 'assessment' || action === 'assess')) {
    const isRetryEndpoint = subSlug[1] === 'retry';

    try {
      const body = await request.json();
      const {
        sessionId,
        topic = 'free_chat',
        hskLevel = 3,
        messages = [],
        hasAudioAssessmentData = false,
        audioPronunciationData,
        model = DEFAULT_MODEL,
        forceRetry = isRetryEndpoint,
      } = body;

      if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Thiếu mã định danh phiên hội thoại (sessionId).' },
          { status: 400 }
        );
      }

      if (!Array.isArray(messages)) {
        return NextResponse.json(
          { success: false, message: 'Danh sách tin nhắn hội thoại không hợp lệ.' },
          { status: 400 }
        );
      }

      const callerUserId = getUserIdFromRequest(request) || 'guest';

      // PREVENT DUPLICATE EVALUATIONS
      // 1. Check if assessment is already in progress
      if (activeEvaluatingSessions.has(sessionId)) {
        return NextResponse.json({
          success: true,
          status: 'evaluating',
          message: 'Báo cáo đánh giá cho phiên này đang được tiến hành xử lý.',
        });
      }

      // 2. Check existing persisted assessment
      const existingReport = getAssessmentBySessionId(sessionId);
      if (existingReport && existingReport.status === 'completed' && !forceRetry) {
        // Enforce authorization
        if (existingReport.user_id && existingReport.user_id !== 'guest' && existingReport.user_id !== callerUserId) {
          const caller = getUserRecordById(callerUserId);
          if (caller?.role !== 'admin') {
            return NextResponse.json(
              { success: false, message: 'Bạn không có quyền truy cập báo cáo đánh giá này.' },
              { status: 403 }
            );
          }
        }

        return NextResponse.json({
          success: true,
          cached: true,
          message: 'Báo cáo đánh giá đã tồn tại cho phiên này.',
          report: existingReport,
        });
      }

      // Acquire lock for this session
      activeEvaluatingSessions.add(sessionId);

      try {
        // Run AI evaluation workflow on entire conversation
        const report = await evaluateConversation({
          sessionId,
          userId: callerUserId,
          topic,
          hskLevel: Number(hskLevel) || 3,
          messages,
          hasAudioAssessmentData: Boolean(hasAudioAssessmentData),
          audioPronunciationData,
          model,
        });

        // Persist final report to database
        saveAssessmentRecord(report);

        return NextResponse.json({
          success: report.status !== 'failed',
          report,
        });
      } finally {
        activeEvaluatingSessions.delete(sessionId);
      }
    } catch (err: unknown) {
      console.error('Error in assessment endpoint:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi đánh giá hội thoại.';
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, message: 'Endpoint AI không hợp lệ.' }, { status: 404 });
}
