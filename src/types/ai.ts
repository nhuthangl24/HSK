export interface AiModelInfo {
  id: string;
  name: string;
  description: string;
  tag: string;
}

export const AVAILABLE_AI_MODELS: AiModelInfo[] = [
  {
    id: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash',
    description: 'Thông minh, chuẩn ngữ pháp tiếng Trung & Việt (Khuyên dùng)',
    tag: 'Tối ưu nhất',
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    description: 'Siêu rẻ (350 cr/1M), phản hồi cực nhanh',
    tag: 'Tiết kiệm',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    description: 'Google AI tốc độ cao, đa năng, xử lý hội thoại tốt',
    tag: 'Tốc độ',
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    description: 'Văn phong tự nhiên, sư phạm cao từ Anthropic',
    tag: 'Tự nhiên',
  },
];

export interface ConversationTopicInfo {
  id: string;
  name: string;
  chineseName: string;
  icon: string;
  description: string;
}

export const CONVERSATION_TOPICS: ConversationTopicInfo[] = [
  {
    id: 'free_chat',
    name: 'Hội thoại tự do',
    chineseName: '日常自由交谈',
    icon: 'MessageSquare',
    description: 'Trò chuyện về sở thích, công việc, cuộc sống hàng ngày',
  },
  {
    id: 'restaurant',
    name: 'Nhà hàng & Gọi món',
    chineseName: '餐厅点餐',
    icon: 'Utensils',
    description: 'Chào hỏi, gọi món đặc sắc, hỏi khẩu vị và thanh toán hóa đơn',
  },
  {
    id: 'shopping',
    name: 'Mua sắm & Mặc cả',
    chineseName: '购物与讨价还价',
    icon: 'ShoppingBag',
    description: 'Hỏi giá, mặc cả giá cả, chọn mẫu mã màu sắc',
  },
  {
    id: 'travel',
    name: 'Du lịch & Hỏi đường',
    chineseName: '旅游与问路',
    icon: 'MapPin',
    description: 'Hỏi đường, bắt xe buýt/tàu điện ngầm, điểm du lịch nổi tiếng',
  },
  {
    id: 'interview',
    name: 'Phỏng vấn xin việc',
    chineseName: '中文面试',
    icon: 'Briefcase',
    description: 'Giới thiệu bản thân, kinh nghiệm, trả lời câu hỏi nhà tuyển dụng',
  },
  {
    id: 'health_doctor',
    name: 'Bác sĩ & Sức khỏe',
    chineseName: '看病与健康',
    icon: 'Activity',
    description: 'Kể triệu chứng bệnh, lời dặn của bác sĩ và cách uống thuốc',
  },
  {
    id: 'office_work',
    name: 'Công sở & Văn phòng',
    chineseName: '职场与商务办公',
    icon: 'Building',
    description: 'Báo cáo tiến độ dự án, sắp xếp cuộc họp, thảo luận công việc',
  },
  {
    id: 'grammar_doctor',
    name: 'Bác sĩ Ngữ pháp HSK',
    chineseName: '语法医生',
    icon: 'Stethoscope',
    description: 'Chẩn đoán và sửa lỗi ngữ pháp câu tiếng Trung của bạn',
  },
  {
    id: 'hskk_exam',
    name: 'Luyện thi HSKK',
    chineseName: 'HSKK口语模拟',
    icon: 'GraduationCap',
    description: 'Mô phỏng kỳ thi khẩu ngữ HSKK theo chủ đề chuẩn hóa',
  },
];

export interface UserUtteranceRecord {
  session_id: string;
  message_id: string;
  timestamp: string;
  original_text: string;
  transcript?: string;
  conversation_topic: string;
  hsk_level: number | string;
  is_voice?: boolean;
  voice_duration?: number;
}

export interface CriteriaScores {
  grammar: number | null;
  vocabulary: number | null;
  communication: number | null;
  fluency: number | null;
  pronunciation: number | null;
}

export interface GrammarFeedbackItem {
  mistake: string;
  correction: string;
  explanation: string;
  evidence?: string;
}

export interface VocabularyFeedbackItem {
  type: 'strength' | 'repetition' | 'missing' | 'recommended';
  word: string;
  pinyin?: string;
  meaning?: string;
  note: string;
}

export interface AspectFeedbackItem {
  aspect: string;
  observation: string;
  suggestion: string;
}

export interface PronunciationFeedbackItem {
  aspect: string;
  observation: string;
  suggestion: string;
  wordsToPractice?: string[];
}

export interface ConversationAssessmentReport {
  session_id: string;
  user_id: string;
  topic: string;
  hsk_level: string; // e.g. "HSK 3"
  status: 'completed' | 'insufficient_data' | 'failed' | 'evaluating';
  overall_score: number | null;
  criteria_scores: CriteriaScores;
  pronunciation_assessed: boolean;
  assessment_summary: string;
  estimated_proficiency?: string;
  strengths: string[];
  weaknesses: string[];
  grammar_feedback: GrammarFeedbackItem[];
  vocabulary_feedback: VocabularyFeedbackItem[];
  communication_feedback: AspectFeedbackItem[];
  fluency_feedback: AspectFeedbackItem[];
  pronunciation_feedback: PronunciationFeedbackItem[];
  recommendations: string[];
  evidence: string[];
  user_utterances_count?: number;
  created_at: string;
  error_message?: string;
}
