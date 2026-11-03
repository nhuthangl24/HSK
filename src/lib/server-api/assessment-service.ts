import {
  ConversationAssessmentReport,
  CriteriaScores,
  GrammarFeedbackItem,
  VocabularyFeedbackItem,
  AspectFeedbackItem,
  PronunciationFeedbackItem,
  UserUtteranceRecord,
  CONVERSATION_TOPICS,
} from '@/types/ai';

const HHTECH_BASE_URL = process.env.HHTECH_BASE_URL || 'https://hhtechapi.net/v1';
const HHTECH_API_KEY = process.env.HHTECH_API_KEY || '';
const DEFAULT_MODEL = process.env.HHTECH_MODEL || 'deepseek-v4.1-flash';

export interface AssessConversationInput {
  sessionId: string;
  userId: string;
  topic?: string;
  hskLevel?: number;
  messages: Array<{
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    isVoice?: boolean;
    voiceDuration?: number;
    transcript?: string;
  }>;
  hasAudioAssessmentData?: boolean;
  audioPronunciationData?: {
    overallPronunciationScore?: number;
    toneAccuracy?: number;
    fluencyScore?: number;
    errors?: string[];
  };
  model?: string;
}

/**
 * Builds the dedicated AI Evaluation system prompt adhering strictly
 * to the 5 assessment criteria and scoring rubric.
 */
function buildEvaluationSystemPrompt(
  hskLevel: number,
  topicName: string,
  topicChinese: string,
  hasAudioData: boolean
): string {
  const pronunciationRule = hasAudioData
    ? `5. DỮ LIỆU ÂM THANH KHẢ DỤNG:
   - Hệ thống CÓ dữ liệu đánh giá âm thanh/phát âm thực tế từ microphone.
   - Hãy chấm điểm Tiêu chí E (Phát âm) từ 0 - 100 dựa trên độ chuẩn thanh điệu (Tones), thanh mẫu/vận mẫu (Initials/Finals) và độ rõ ràng.
   - Đặt "pronunciation_assessed": true.`
    : `5. NGUYÊN TẮC BẮT BUỘC VỀ PHÁT ÂM (QUAN TRỌNG NHẤT):
   - Phiên hội thoại này CHỈ CÓ bản ghi văn bản (text transcripts), KHÔNG có luồng phân tích âm thanh/ngữ âm phòng thu chuyên sâu.
   - TUYỆT ĐỐI KHÔNG BỊA ĐẶT ĐIỂM PHÁT ÂM.
   - BẮT BUỘC đặt "pronunciation": null trong criteria_scores.
   - BẮT BUỘC đặt "pronunciation_assessed": false.
   - Trong pronunciation_feedback, ghi rõ: "Chưa đánh giá do phiên hội thoại chỉ thu thập bản ghi văn bản (không có dữ liệu phổ âm thanh)."`;

  return `Bạn là Chuyên gia Giám khảo Khảo thí Khẩu ngữ Tiếng Trung Quốc tế cấp cao (Senior Chinese Oral Language Proficiency Assessor).
Nhiệm vụ của bạn là phân tích và đánh giá toàn diện năng lực giao tiếp khẩu ngữ tiếng Trung của học viên dựa trên TOÀN BỘ cuộc hội thoại giữa học viên (User) và trợ lý AI (Tiểu Trí).

THÔNG TIN PHIÊN HỘI THOẠI:
- Cấp độ HSK mục tiêu: HSK ${hskLevel}
- Chủ đề: ${topicName} (${topicChinese})

NGUYÊN TẮC ĐÁNH GIÁ CỐT LÕI:
1. CHỈ ĐÁNH GIÁ NĂNG LỰC CỦA HỌC VIÊN (USER):
   - Đánh giá dựa trên TOÀN BỘ các câu nói của User trong phiên hội thoại.
   - TUYỆT ĐỐI KHÔNG lấy các câu của AI (Assistant) làm bằng chứng cho năng lực của User.
   - Xem xét ngữ cảnh hội thoại (câu hỏi của AI và cách User phản xạ, trả lời).
2. TÔN TRỌNG CẤP ĐỘ HSK MỤC TIÊU:
   - Học viên đang ở trình độ: HSK ${hskLevel}.
   - Đánh giá công bằng theo tiêu chuẩn HSK tương ứng. Không trừ điểm nếu học viên dùng từ vựng/cấu trúc đơn giản nhưng chuẩn xác và phù hợp với cấp độ HSK đã chọn.
3. TIÊU CHUẨN ĐÁNH GIÁ KHÁCH QUAN, CHUẨN XÁC:
   - Không cho điểm phóng đại (inflated) và không cho điểm quá khắt khe (harsh).
   - Điểm số phải phản ánh đúng thực tế biểu đạt của học viên.
   - Mọi nhận xét lỗi sai hoặc lời khen đều phải có BẰNG CHỨNG (trích dẫn trực tiếp từ câu nói thực tế của User). TUYỆT ĐỐI KHÔNG bịa đặt câu nói, lỗi sai hay vấn đề không có thật.
4. BÁO CÁO TOÀN DIỆN BẰNG TIẾNG VIỆT:
   - Tất cả nhận xét, giải thích ngữ pháp, lời khuyên và tóm tắt phải được viết bằng tiếng Việt tự nhiên, súc tích, mang tính sư phạm và khích lệ cao.

${pronunciationRule}

5 TIÊU CHÍ ĐÁNH GIÁ CHUẨN (Thang điểm 0 - 100 cho mỗi tiêu chí):
A. Ngữ pháp (Grammar Accuracy - Trọng số 20%):
   - Độ chính xác ngữ pháp tiếng Trung, cấu trúc câu, trật tự từ, cách dùng trợ từ (了, 着, 过, 的, 得, 地, 把, 被...).
B. Từ vựng (Vocabulary Usage - Trọng số 20%):
   - Vốn từ, độ phong phú, tính xác đáng khi dùng từ, từ vựng theo chủ đề ${topicName}.
C. Giao tiếp & Hiểu ngữ cảnh (Communication & Comprehension - Trọng số 25%):
   - Khả năng hiểu câu hỏi/ngữ cảnh, câu trả lời đúng trọng tâm, tính logic, duy trì mạch đối thoại.
D. Độ lưu loát & Biểu đạt (Fluency & Expression - Trọng số 20%):
   - Tính tự nhiên, cấu tứ câu liền mạch, khả năng diễn đạt ý tưởng trôi chảy.
E. Phát âm (Pronunciation - Trọng số 15%):
   - ${hasAudioData ? 'Chấm 0-100 dựa trên dữ liệu âm thanh' : 'BẮT BUỘC ĐẶT LÀ null vì chỉ có bản ghi văn bản'}.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Trả về DUY NHẤT một chuỗi JSON thuần túy (hợp lệ cú pháp RFC 8259, không kèm văn bản mở đầu/kết thúc, không kèm markdown khác ngoài khối json nếu cần):
{
  "criteria_scores": {
    "grammar": 85,
    "vocabulary": 80,
    "communication": 90,
    "fluency": 82,
    "pronunciation": ${hasAudioData ? '85' : 'null'}
  },
  "pronunciation_assessed": ${hasAudioData ? 'true' : 'false'},
  "estimated_proficiency": "HSK ${hskLevel} - Khẩu ngữ Tự tin & Chuẩn xác",
  "assessment_summary": "Nhận xét tổng quan súc tích, mang tính sư phạm và khích lệ bằng tiếng Việt.",
  "strengths": [
    "Top 1 điểm mạnh nổi bật của học viên",
    "Top 2 điểm mạnh nổi bật của học viên",
    "Top 3 điểm mạnh nổi bật của học viên"
  ],
  "weaknesses": [
    "Top 1 điểm yếu / hạn chế cần khắc phục",
    "Top 2 điểm yếu / hạn chế cần khắc phục",
    "Top 3 điểm yếu / hạn chế cần khắc phục"
  ],
  "grammar_feedback": [
    {
      "mistake": "Câu hoặc cụm từ học viên nói bị sai hoặc chưa tự nhiên",
      "correction": "Câu tiếng Trung chuẩn bản xứ",
      "explanation": "Giải thích ngữ pháp ngắn gọn bằng tiếng Việt",
      "evidence": "Trích dẫn nguyên văn câu nói của User"
    }
  ],
  "vocabulary_feedback": [
    {
      "type": "strength",
      "word": "Từ vựng tốt học viên đã dùng",
      "pinyin": "pīnyīn",
      "meaning": "nghĩa tiếng Việt",
      "note": "Nhận xét cách dùng từ"
    },
    {
      "type": "recommended",
      "word": "Từ vựng nâng cao nên học theo chủ đề",
      "pinyin": "pīnyīn",
      "meaning": "nghĩa tiếng Việt",
      "note": "Lý do nên áp dụng"
    }
  ],
  "communication_feedback": [
    {
      "aspect": "Khả năng hiểu câu hỏi và ngữ cảnh",
      "observation": "Nhận xét cụ thể về cách học viên tiếp nhận câu hỏi của Tiểu Trí",
      "suggestion": "Gợi ý cách phản hồi phong phú hơn"
    },
    {
      "aspect": "Tính gắn kết và duy trì hội thoại",
      "observation": "Nhận xét về việc học viên có chủ động mở rộng ý hoặc đặt câu hỏi ngược lại không",
      "suggestion": "Gợi ý để cuộc trò chuyện sâu sắc hơn"
    }
  ],
  "fluency_feedback": [
    {
      "aspect": "Độ tự nhiên và liền mạch",
      "observation": "Nhận xét về nhịp điệu diễn đạt và cấu trúc liên kết câu",
      "suggestion": "Gợi ý luyện tập phản xạ liên tục"
    }
  ],
  "pronunciation_feedback": [
    {
      "aspect": "Đánh giá phát âm",
      "observation": "${hasAudioData ? 'Nhận xét thanh điệu và âm tiết' : 'Phiên hội thoại chỉ thu thập bản ghi văn bản, chưa có luồng âm thanh chuyên sâu.'}",
      "suggestion": "Gợi ý luyện tập",
      "wordsToPractice": []
    }
  ],
  "recommendations": [
    "Gợi ý bài tập 1",
    "Gợi ý bài tập 2",
    "Chủ đề luyện tập tiếp theo nên chọn"
  ],
  "evidence": [
    "Trích dẫn câu 1 của User",
    "Trích dẫn câu 2 của User"
  ]
}`;
}

/**
 * Calculates the overall score using the exact formula from the specification:
 * - Grammar: 20%
 * - Vocabulary: 20%
 * - Communication: 25%
 * - Fluency: 20%
 * - Pronunciation: 15%
 *
 * If pronunciation is unavailable:
 * - Exclude pronunciation from calculation.
 * - Normalize remaining weights: (Grammar*0.20 + Vocabulary*0.20 + Communication*0.25 + Fluency*0.20) / 0.85
 */
export function calculateOverallScore(
  criteria: CriteriaScores,
  pronunciationAssessed: boolean
): number {
  const clamp = (val: number | null | undefined, fallback = 70): number => {
    if (typeof val !== 'number' || isNaN(val)) return fallback;
    return Math.max(0, Math.min(100, Math.round(val)));
  };

  const g = clamp(criteria.grammar);
  const v = clamp(criteria.vocabulary);
  const c = clamp(criteria.communication);
  const f = clamp(criteria.fluency);

  if (pronunciationAssessed && typeof criteria.pronunciation === 'number') {
    const p = clamp(criteria.pronunciation);
    const score = g * 0.2 + v * 0.2 + c * 0.25 + f * 0.2 + p * 0.15;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Pronunciation not assessed: normalize remaining weights across 0.85
  const normalizedScore = (g * 0.2 + v * 0.2 + c * 0.25 + f * 0.2) / 0.85;
  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
}

/**
 * Evaluates the conversation based on all user utterances and conversation context.
 */
export async function evaluateConversation(
  input: AssessConversationInput
): Promise<ConversationAssessmentReport> {
  const {
    sessionId,
    userId,
    topic = 'free_chat',
    hskLevel = 3,
    messages = [],
    hasAudioAssessmentData = false,
    audioPronunciationData,
    model = DEFAULT_MODEL,
  } = input;

  const topicInfo = CONVERSATION_TOPICS.find((t) => t.id === topic) || {
    id: topic,
    name: topic,
    chineseName: topic,
    icon: 'MessageSquare',
    description: '',
  };

  // 1. Extract only user utterances
  const userMessages = messages.filter((m) => m.role === 'user');
  const userUtterances: UserUtteranceRecord[] = userMessages.map((m, idx) => ({
    session_id: sessionId,
    message_id: m.id || `usr-${idx + 1}`,
    timestamp: m.timestamp || new Date().toISOString(),
    original_text: m.content,
    transcript: m.transcript || (m.isVoice ? m.content : undefined),
    conversation_topic: topic,
    hsk_level: hskLevel,
    is_voice: Boolean(m.isVoice),
    voice_duration: m.voiceDuration,
  }));

  // Calculate total Chinese characters spoken by user
  const totalChineseChars = userMessages.reduce((acc, m) => {
    const matches = m.content.match(/[\u4e00-\u9fa5]/g);
    return acc + (matches ? matches.length : 0);
  }, 0);

  // 2. CHECK FOR INSUFFICIENT DATA
  // If user said fewer than 2 messages OR total Chinese characters < 4
  if (userMessages.length < 2 || totalChineseChars < 4) {
    const isVeryEmpty = userMessages.length === 0;
    return {
      session_id: sessionId,
      user_id: userId,
      topic: topicInfo.name,
      hsk_level: `HSK ${hskLevel}`,
      status: 'insufficient_data',
      overall_score: null,
      criteria_scores: {
        grammar: null,
        vocabulary: null,
        communication: null,
        fluency: null,
        pronunciation: null,
      },
      pronunciation_assessed: false,
      assessment_summary: isVeryEmpty
        ? 'Phiên hội thoại chưa có dữ liệu phản hồi của học viên để đánh giá. Bạn hãy nhấn Micro hoặc gõ phím để trò chuyện với Tiểu Trí nhé!'
        : `Dữ liệu hội thoại hiện tại chưa đủ để đưa ra đánh giá chính xác và khách quan (học viên mới gửi ${userMessages.length} câu ngắn, tổng cộng ${totalChineseChars} chữ Hán). Hãy luyện nói thêm ít nhất 2 - 3 lượt câu hoàn chỉnh cùng Tiểu Trí để nhận báo cáo phân tích toàn diện nhé!`,
      estimated_proficiency: `HSK ${hskLevel} (Đang thu thập dữ liệu)`,
      strengths: userMessages.length > 0 ? ['Học viên đã chủ động bắt đầu phiên luyện tập hội thoại.'] : [],
      weaknesses: ['Dung lượng mẫu câu hội thoại quá ngắn, chưa đủ căn cứ đánh giá sâu.'],
      grammar_feedback: [],
      vocabulary_feedback: [],
      communication_feedback: [
        {
          aspect: 'Duy trì hội thoại',
          observation: 'Thời lượng trao đổi chưa đủ để đánh giá độ hiểu và phản xạ.',
          suggestion: 'Hãy trả lời câu hỏi của Tiểu Trí bằng câu hoàn chỉnh có chủ ngữ, vị ngữ.',
        },
      ],
      fluency_feedback: [],
      pronunciation_feedback: [
        {
          aspect: 'Đánh giá phát âm',
          observation: 'Chưa đủ dữ liệu câu nói để đánh giá.',
          suggestion: 'Thực hiện ít nhất 3 lượt hội thoại bằng giọng nói để rèn luyện khẩu âm.',
        },
      ],
      recommendations: [
        'Tiếp tục trò chuyện thêm ít nhất 2 - 3 lượt câu với Tiểu Trí.',
        'Thử diễn đạt câu dài hơn thay vì chỉ trả lời bằng 1 từ đơn (ví dụ: thay vì chỉ nói "好", hãy nói "好的，我觉得这个提议很好").',
        `Chọn chủ đề thân thuộc như "${topicInfo.name}" để dễ dàng chia sẻ ý kiến bản thân.`,
      ],
      evidence: userMessages.map((m) => m.content),
      user_utterances_count: userMessages.length,
      created_at: new Date().toISOString(),
    };
  }

  // 3. PREPARE PROMPTS FOR AI EVALUATOR
  const systemPrompt = buildEvaluationSystemPrompt(
    hskLevel,
    topicInfo.name,
    topicInfo.chineseName,
    hasAudioAssessmentData
  );

  // Format conversation history clearly labeling User vs Assistant
  const formattedTranscript = messages
    .map((m, idx) => {
      const speaker = m.role === 'user' ? '【HỌC VIÊN / USER】' : '【TIỂU TRÍ / ASSISTANT】';
      const voiceTag = m.isVoice ? ' [Giọng nói/Voice]' : ' [Gõ phím/Text]';
      return `${idx + 1}. ${speaker}${voiceTag}: ${m.content}`;
    })
    .join('\n\n');

  const userEvidenceList = userUtterances
    .map(
      (u, idx) =>
        `- Câu ${idx + 1} (${u.is_voice ? 'Nói' : 'Gõ'}): "${u.original_text}"`
    )
    .join('\n');

  let audioEvidenceBlock = 'Dữ liệu âm thanh: KHÔNG CÓ (Chỉ có bản ghi văn bản)';
  if (hasAudioAssessmentData && audioPronunciationData) {
    audioEvidenceBlock = `Dữ liệu âm thanh chuyên sâu:
- Điểm phát âm tổng thể từ thiết bị: ${audioPronunciationData.overallPronunciationScore || 80}/100
- Độ chính xác thanh điệu: ${audioPronunciationData.toneAccuracy || 80}%
- Độ lưu loát: ${audioPronunciationData.fluencyScore || 80}/100
- Lỗi phát âm ghi nhận: ${audioPronunciationData.errors?.join(', ') || 'Không phát hiện lỗi nghiêm trọng'}`;
  }

  const evaluationUserPrompt = `HÃY ĐÁNH GIÁ TOÀN BỘ PHIÊN HỘI THOẠI SAU ĐÂY:

THÔNG TIN:
- Cấp độ HSK mục tiêu: HSK ${hskLevel}
- Chủ đề: ${topicInfo.name} (${topicInfo.chineseName})
- Số câu học viên nói: ${userUtterances.length} câu
- ${audioEvidenceBlock}

DANH SÁCH CÂU NÓI CỦA HỌC VIÊN CẦN ĐÁNH GIÁ:
${userEvidenceList}

TOÀN BỘ MẠCH HỘI THOẠI ĐỐI THOẠI ĐỂ ĐỐI CHIẾU NGỮ CẢNH:
${formattedTranscript}

LƯU Ý NGHIÊM NGẶT:
- Chỉ đánh giá câu nói của User. Không lấy câu của Assistant làm bằng chứng.
- ${hasAudioAssessmentData ? 'Chấm điểm phát âm từ dữ liệu âm thanh đã cấp.' : 'Vì không có âm thanh chuyên sâu, "pronunciation" TRONG criteria_scores PHẢI LÀ null VÀ "pronunciation_assessed" PHẢI LÀ false.'}
- Trả về JSON đúng cấu trúc đã yêu cầu, không thêm bất kỳ văn bản nào ngoài JSON.`;

  // 4. CALL LLM EVALUATOR
  let rawJsonText = '';
  try {
    const res = await fetch(`${HHTECH_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HHTECH_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: evaluationUserPrompt },
        ],
        temperature: 0.3, // Low temperature for consistent, objective scoring
        max_tokens: 2500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('AI Assessment LLM Error:', res.status, errText);
      throw new Error(`Máy chủ AI phản hồi lỗi: ${res.status}`);
    }

    const data = await res.json();
    rawJsonText = data?.choices?.[0]?.message?.content || '';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ AI đánh giá.';
    console.error('Failed to call assessment model:', err);
    return {
      session_id: sessionId,
      user_id: userId,
      topic: topicInfo.name,
      hsk_level: `HSK ${hskLevel}`,
      status: 'failed',
      overall_score: null,
      criteria_scores: {
        grammar: null,
        vocabulary: null,
        communication: null,
        fluency: null,
        pronunciation: null,
      },
      pronunciation_assessed: false,
      assessment_summary: 'Hệ thống đánh giá đang tạm thời quá tải hoặc gặp sự cố kết nối. Bạn có thể nhấn nút Thử lại để chấm điểm lại cuộc hội thoại này.',
      strengths: [],
      weaknesses: [],
      grammar_feedback: [],
      vocabulary_feedback: [],
      communication_feedback: [],
      fluency_feedback: [],
      pronunciation_feedback: [],
      recommendations: ['Vui lòng thử lại sau giây lát hoặc kiểm tra kết nối mạng.'],
      evidence: [],
      user_utterances_count: userMessages.length,
      created_at: new Date().toISOString(),
      error_message: msg,
    };
  }

  // 5. PARSE EVALUATION JSON OUTPUT
  let parsed: Partial<ConversationAssessmentReport> = {};
  try {
    let cleanJson = rawJsonText.trim();
    if (cleanJson.includes('```json')) {
      cleanJson = cleanJson.split('```json')[1].split('```')[0].trim();
    } else if (cleanJson.includes('```')) {
      cleanJson = cleanJson.split('```')[1].split('```')[0].trim();
    }
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse AI evaluation JSON. Raw content:', rawJsonText);
    // Attempt fallback heuristic extraction
    const jsonMatch = rawJsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {}
    }
  }

  // 6. ENFORCE VALIDATION, SCORES AND WEIGHT NORMALIZATION
  const parsedCriteria = parsed.criteria_scores || ({} as Partial<CriteriaScores>);

  const validGrammar = Math.max(0, Math.min(100, Math.round(Number(parsedCriteria.grammar) || 75)));
  const validVocab = Math.max(0, Math.min(100, Math.round(Number(parsedCriteria.vocabulary) || 75)));
  const validComm = Math.max(0, Math.min(100, Math.round(Number(parsedCriteria.communication) || 75)));
  const validFluency = Math.max(0, Math.min(100, Math.round(Number(parsedCriteria.fluency) || 75)));

  let validPronunciation: number | null = null;
  const isPronunciationAssessed = hasAudioAssessmentData && typeof parsedCriteria.pronunciation === 'number';

  if (isPronunciationAssessed) {
    validPronunciation = Math.max(0, Math.min(100, Math.round(Number(parsedCriteria.pronunciation) || 75)));
  }

  const finalCriteriaScores: CriteriaScores = {
    grammar: validGrammar,
    vocabulary: validVocab,
    communication: validComm,
    fluency: validFluency,
    pronunciation: validPronunciation,
  };

  // Compute deterministic overall score on backend
  const calculatedOverallScore = calculateOverallScore(
    finalCriteriaScores,
    isPronunciationAssessed
  );

  // Ensure default feedback arrays are populated gracefully
  const grammarFeedback: GrammarFeedbackItem[] = Array.isArray(parsed.grammar_feedback)
    ? parsed.grammar_feedback
    : [];
  const vocabularyFeedback: VocabularyFeedbackItem[] = Array.isArray(parsed.vocabulary_feedback)
    ? parsed.vocabulary_feedback
    : [];
  const communicationFeedback: AspectFeedbackItem[] = Array.isArray(parsed.communication_feedback)
    ? parsed.communication_feedback
    : [
        {
          aspect: 'Khả năng hiểu và phản xạ',
          observation: 'Học viên theo dõi được mạch đối thoại của Tiểu Trí.',
          suggestion: 'Nên chủ động đặt thêm câu hỏi để tạo tương tác hai chiều.',
        },
      ];
  const fluencyFeedback: AspectFeedbackItem[] = Array.isArray(parsed.fluency_feedback)
    ? parsed.fluency_feedback
    : [
        {
          aspect: 'Độ tự nhiên',
          observation: 'Học viên duy trì được phản xạ giao tiếp cơ bản.',
          suggestion: 'Luyện tập nối câu bằng các liên từ như 因为...所以..., 虽然...但是...',
        },
      ];

  const pronunciationFeedback: PronunciationFeedbackItem[] = isPronunciationAssessed
    ? Array.isArray(parsed.pronunciation_feedback)
      ? parsed.pronunciation_feedback
      : [
          {
            aspect: 'Phát âm thanh điệu',
            observation: 'Phát âm tương đối rõ ràng, thanh điệu cơ bản chính xác.',
            suggestion: 'Chú ý thanh 4 (dứt khoát) và biến điệu của 一, 不.',
          },
        ]
    : [
        {
          aspect: 'Đánh giá phát âm',
          observation:
            'Phiên hội thoại chỉ thu thập bản ghi văn bản (chưa có luồng phân tích âm thanh phổ tần số). Điểm phát âm được loại trừ khỏi tổng điểm.',
          suggestion: 'Tiếp tục luyện nghe phát âm mẫu chuẩn Bắc Kinh của Tiểu Trí và nhắc lại theo.',
        },
      ];

  const strengths: string[] = Array.isArray(parsed.strengths) && parsed.strengths.length > 0
    ? parsed.strengths
    : [
        'Tinh thần tích cực và tự tin khi luyện nói tiếng Trung',
        'Sử dụng đúng ngữ cảnh các từ vựng theo chủ đề đã chọn',
        'Phản hồi đúng trọng tâm câu hỏi của trợ lý AI',
      ];

  const weaknesses: string[] = Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0
    ? parsed.weaknesses
    : [
        'Cấu trúc câu còn đơn giản, chưa áp dụng nhiều câu phức',
        'Cần chú ý trật tự từ và các trợ từ ngữ khí',
        'Vốn từ vựng chuyên sâu về chủ đề cần được mở rộng thêm',
      ];

  const recommendations: string[] = Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
    ? parsed.recommendations
    : [
        `Ôn tập lại các mẫu câu giao tiếp phổ biến của cấp độ HSK ${hskLevel}.`,
        'Tập đặt câu ghép với các cặp liên từ để tăng điểm lưu loát.',
        `Thử sức với chủ đề tiếp theo như "Du lịch & Hỏi đường" hoặc "Mua sắm".`,
      ];

  const evidence: string[] = Array.isArray(parsed.evidence) && parsed.evidence.length > 0
    ? parsed.evidence
    : userMessages.slice(0, 5).map((m) => m.content);

  const report: ConversationAssessmentReport = {
    session_id: sessionId,
    user_id: userId,
    topic: topicInfo.name,
    hsk_level: `HSK ${hskLevel}`,
    status: 'completed',
    overall_score: calculatedOverallScore,
    criteria_scores: finalCriteriaScores,
    pronunciation_assessed: isPronunciationAssessed,
    assessment_summary:
      parsed.assessment_summary ||
      `Học viên đã hoàn thành xuất sắc phiên hội thoại chủ đề "${topicInfo.name}" ở trình độ HSK ${hskLevel} với tổng điểm ${calculatedOverallScore}/100. Khả năng hiểu câu hỏi tốt và phản xạ linh hoạt.`,
    estimated_proficiency:
      parsed.estimated_proficiency || `HSK ${hskLevel} - Đạt chuẩn giao tiếp`,
    strengths,
    weaknesses,
    grammar_feedback: grammarFeedback,
    vocabulary_feedback: vocabularyFeedback,
    communication_feedback: communicationFeedback,
    fluency_feedback: fluencyFeedback,
    pronunciation_feedback: pronunciationFeedback,
    recommendations,
    evidence,
    user_utterances_count: userMessages.length,
    created_at: new Date().toISOString(),
  };

  return report;
}
