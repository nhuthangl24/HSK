'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  ArrowLeft,
  Bot,
  User as UserIcon,
  AlertCircle,
  Zap,
  Sun,
  Moon,
  ChevronDown,
  X,
  Square,
  SlidersHorizontal,
  MessageSquare,
  RefreshCw,
  Globe,
  Lightbulb,
  Eye,
  EyeOff,
  Award,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { tts } from '@/lib/tts';
import {
  AVAILABLE_AI_MODELS,
  CONVERSATION_TOPICS,
  ConversationAssessmentReport,
} from '@/types/ai';
import { AssessmentReportModal } from '@/components/modals/AssessmentReportModal';

// -------------------------------------------------------------
// TYPES & INTERFACES
// -------------------------------------------------------------

export type VoiceState = 'idle' | 'recording' | 'processing' | 'ai_speaking' | 'error';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isVoice?: boolean;
  voiceDuration?: number; // seconds
  sessionId?: string;
  transcript?: string;
  topic?: string;
  hskLevel?: number;
}

interface ParsedAiContent {
  mainMarkdown: string;
  pinyin: string[];
  translations: string[];
  corrections: string[];
  explanations: string[];
  chineseForTts: string;
}

const STORAGE_KEY = 'hsk_chat_history_v3';
const GUEST_USAGE_KEY = 'hsk_guest_chat_count';

function getTopicOpeningGreeting(topicId: string, level: number): string {
  switch (topicId) {
    case 'restaurant':
      return `您好！欢迎光临！请问您一共几位？想坐在大厅还是包厢？想先看下菜单吗？
> 拼 **Pinyin**: Nín hǎo! Huānyíng guānglín! Qǐngwèn nín yīgòng jǐ wèi? Xiǎng zuò zài dàtīng háishì bāoxiāng? Xiǎng xiān kàn xià càidān ma?
> 🌐 **Dịch nghĩa**: Xin chào! Hoan nghênh quý khách! Xin hỏi quý khách đi mấy người? Muốn ngồi ngoài sảnh hay phòng riêng? Quý khách muốn xem thực đơn trước không?`;
    case 'shopping':
      return `你好！欢迎光临，想看点什么衣服或者特产？我们今天全场有优惠，有什么我可以帮您的吗？
> 拼 **Pinyin**: Nǐ hǎo! Huānyíng guānglín, xiǎng kàn diǎn shénme yīfu huòzhě tèchǎn? Wǒmen jīntiān quánchǎng yǒu yōuhuì, yǒu shénme wǒ kěyǐ bāng nín de ma?
> 🌐 **Dịch nghĩa**: Xin chào! Hoan nghênh bạn ghé thăm, bạn muốn xem quần áo hay đặc sản gì? Cửa hàng chúng tôi hôm nay có ưu đãi toàn bộ, tôi có thể giúp gì cho bạn?`;
    case 'travel':
      return `你好！欢迎来到中国旅游。请问你想去哪个著名景点？需要我为你指路或者推荐最佳交通路线吗？
> 拼 **Pinyin**: Nǐ hǎo! Huānyíng lái dào Zhōngguó lǚyóu. Qǐngwèn nǐ xiǎng qù nǎge zhùmíng jǐngdiǎn? Xūyào wǒ wèi nǐ zhǐlù huòzhě tuījiàn zuìjiā jiāotōng lùxiàn ma?
> 🌐 **Dịch nghĩa**: Xin chào! Chào mừng bạn đến Trung Quốc du lịch. Xin hỏi bạn muốn đi điểm tham quan nổi tiếng nào? Cần tôi chỉ đường hoặc gợi ý tuyến giao thông thuận tiện nhất không?`;
    case 'interview':
      return `你好，请坐。欢迎来参加我们公司的中文面试。首先，请你用中文做一个简短的自我介绍吧。
> 拼 **Pinyin**: Nǐ hǎo, qǐng zuò. Huānyíng lái cānjiā wǒmen gōngsī de zhōngwén miànshì. Shǒuxiān, qǐng nǐ yòng zhōngwén zuò yī gè jiǎnduǎn de zìwǒ jièshào ba.
> 🌐 **Dịch nghĩa**: Xin chào, mời ngồi. Chào mừng bạn đến tham gia buổi phỏng vấn bằng tiếng Trung của công ty chúng tôi. Trước tiên, mời bạn giới thiệu ngắn gọn về bản thân bằng tiếng Trung nhé.`;
    case 'health_doctor':
      return `你好，请坐。请问你哪里感觉不舒服？发烧、头疼还是嗓子疼？这种症状持续几天了？
> 拼 **Pinyin**: Nǐ hǎo, qǐng zuò. Qǐngwèn nǐ nǎlǐ gǎnjué bù shūfu? Fāshāo, tóuténg háishì sǎngzi téng? Zhè zhǒng zhèngzhuàng chíxù jǐ tiān le?
> 🌐 **Dịch nghĩa**: Xin chào, mời ngồi. Xin hỏi bạn cảm thấy khó chịu ở đâu? Sốt, đau đầu hay đau họng? Triệu chứng này đã kéo dài mấy ngày rồi?`;
    case 'office_work':
      return `早安！关于我们这个季度的项目进展，你那边准备得怎么样了？今天下午两点的团队会议材料准备齐了吗？
> 拼 **Pinyin**: Zǎo'ān! Guānyú wǒmen zhège jìdù de xiàngmù jìnzhǎn, nǐ nàbiān zhǔnbèi de zěnmeyàng le? Jīntiān xiàwǔ liǎng diǎn de tuánduì huìyì cáiliào zhǔnbèi qí le ma?
> 🌐 **Dịch nghĩa**: Chào buổi sáng! Về tiến độ dự án quý này của chúng ta, bên bạn chuẩn bị thế nào rồi? Tài liệu cuộc họp nhóm lúc 2 giờ chiều nay đã đủ chưa?`;
    case 'grammar_doctor':
      return `你好！我是你的语法医生小智。把你想表达的中文句子、短语或者拿不准的语法发给我，我来帮你诊断分析！
> 拼 **Pinyin**: Nǐ hǎo! Wǒ shì nǐ de yǔfǎ yīshēng Xiǎozhì. Bǎ nǐ xiǎng biǎodá de zhōngwén jùzi, duǎnyǔ huòzhě ná bù zhǔn de yǔfǎ fā gěi wǒ, wǒ lái bāng nǐ zhěnduàn fēnxī!
> 🌐 **Dịch nghĩa**: Xin chào! Tôi là bác sĩ ngữ pháp Tiểu Trí. Hãy gửi cho tôi câu tiếng Trung bạn muốn diễn đạt hoặc ngữ pháp bạn chưa chắc chắn, tôi sẽ giúp bạn chẩn đoán và phân tích nhé!`;
    case 'hskk_exam':
      return `你好！欢迎来到HSKK口语模拟考场（HSK ${level}）。请放松心态，听清考题并自信清晰地用中文作答。你准备好了吗？
> 拼 **Pinyin**: Nǐ hǎo! Huānyíng lái dào HSKK kǒuyǔ mónǐ kǎochǎng (HSK ${level}). Qǐng fàngsōng xīntài, tīng qīng kǎotí bìng zìxìn qīngxī de yòng zhōngwén zuòdá. Nǐ zhǔnbèi hǎo le ma?
> 🌐 **Dịch nghĩa**: Xin chào! Chào mừng bạn đến với phòng thi mô phỏng khẩu ngữ HSKK (cấp độ HSK ${level}). Hãy giữ tâm lý thoải mái, nghe rõ đề thi và tự tin, rõ ràng trả lời bằng tiếng Trung. Bạn đã sẵn sàng chưa?`;
    case 'free_chat':
    default:
      return `你好！我是小智，你的中文口语助手。准备好练习中文了吗？请按下下方的麦克风开始说吧！
> 拼 **Pinyin**: Nǐ hǎo! Wǒ shì Xiǎozhì, nǐ de zhōngwén kǒuyǔ zhùshǒu. Zhǔnbèi hǎo liànxí zhōngwén le ma? Qǐng àn xià xiàfāng de màikèfēng kāishǐ shuō ba!
> 🌐 **Dịch nghĩa**: Xin chào! Tôi là Tiểu Trí, trợ lý luyện nói tiếng Trung của bạn. Bạn đã sẵn sàng luyện nói chưa? Hãy nhấn vào micro bên dưới để bắt đầu nói nhé!`;
  }
}

// Web Speech API Interface
interface IWindowSpeechRecognition {
  new (): ISpeechRecognition;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

// -------------------------------------------------------------
// HELPER: DETECT PINYIN VS VIETNAMESE ACCURATELY
// -------------------------------------------------------------
function isPinyinText(str: string): boolean {
  const vietnameseDistinct = /[đươâăêảãạẻẽẹỉĩịỏõọủũụỷỹỵ]/i;
  if (vietnameseDistinct.test(str)) return false;

  const commonViWords = /\b(tôi|bạn|là|xin|chào|của|ở|và|với|được|không|muốn|gì|này|đó|rất|hôm|nay|cho|đi|ăn|uống|nhé|nào|quý|khách|thế|giúp|cảm|ơn)\b/i;
  if (commonViWords.test(str)) return false;

  const pinyinTones = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i;
  return pinyinTones.test(str);
}

// -------------------------------------------------------------
// HELPER: EXTRACT ONLY CHINESE CHARACTERS FOR AUDIO TTS
// -------------------------------------------------------------
function extractChineseForTts(text: string): string {
  const lines = text.split('\n');
  const chineseLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[>\s*-]*(?:(?:拼|🇨🇳)\s*)?(?:\*\*)?(?:Pinyin|Phiên âm)/i.test(trimmed)) continue;
    if (/^[>\s*-]*(?:(?:🌐|🇻🇳)\s*)?(?:\*\*)?(?:Dịch nghĩa|Dịch|Bản dịch|Nghĩa)/i.test(trimmed)) continue;
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) continue;
    if (/^[>\s*💡👉-]*(?:Gợi ý|Sửa lỗi|Giải thích)/i.test(trimmed)) continue;

    if (/[\u4e00-\u9fa5]/.test(trimmed)) {
      const cleaned = trimmed.replace(/[*_#`~>]/g, '').trim();
      if (cleaned) chineseLines.push(cleaned);
    }
  }

  return chineseLines.join(' ') || text.replace(/[*_#`~>]/g, '').trim();
}

// -------------------------------------------------------------
// HELPER: PARSE AI RESPONSE (CLEAN MARKDOWN, PINYIN, VIETNAMESE, FEEDBACK)
// -------------------------------------------------------------
function parseAiResponse(content: string): ParsedAiContent {
  const lines = content.split('\n');
  const pinyin: string[] = [];
  const translations: string[] = [];
  const corrections: string[] = [];
  const explanations: string[] = [];
  const mainLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (mainLines.length > 0 && mainLines[mainLines.length - 1] !== '') {
        mainLines.push('');
      }
      continue;
    }

    // Skip divider lines
    if (/^[-*_]{3,}$/.test(line)) {
      continue;
    }

    // 1. Tagged Pinyin: > 拼 **Pinyin**: ... OR Pinyin: ... OR Phiên âm: ...
    const pinyinMatch = line.match(/^[>\s*-]*(?:(?:拼|🇨🇳)\s*)?(?:\*\*)?(?:Pinyin|Phiên âm)(?:\*\*)?\s*[:：]\s*(.*)$/i);
    if (pinyinMatch) {
      const p = pinyinMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
      if (p) pinyin.push(p);
      continue;
    }

    // 2. Tagged Translation: > 🌐 **Dịch nghĩa**: ... OR Dịch: ... OR Nghĩa: ...
    const transMatch = line.match(/^[>\s*-]*(?:(?:🌐|🇻🇳)\s*)?(?:\*\*)?(?:Dịch nghĩa|Dịch|Bản dịch|Nghĩa tiếng Việt|Nghĩa)(?:\*\*)?\s*[:：]\s*(.*)$/i);
    if (transMatch) {
      const t = transMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
      if (t) translations.push(t);
      continue;
    }

    // 3. Feedback Header: > 💡 **Gợi ý học tập**:
    if (/💡/i.test(line) && /(?:Gợi ý|Góp ý|Nhận xét)/i.test(line)) {
      continue;
    }

    // 4. Tagged Corrections: 👉 ... or > - **Cách nói tự nhiên hơn**: ...
    if (line.includes('👉') || /^[>\s*-]*(?:\*\*)?(?:Sửa lỗi|Cách nói tự nhiên hơn|Tự nhiên hơn|Cách nói chuẩn)(?:\*\*)?\s*[:：]/i.test(line)) {
      corrections.push(line.replace(/^[>\s*👉-]+/, '').replace(/^\*\*|\*\*$/g, '').trim());
      continue;
    }

    // 5. Tagged Explanations: 💡 ... or > - **Giải thích**: ...
    if (line.includes('💡') || /^[>\s*-]*(?:\*\*)?(?:Giải thích|Lưu ý)(?:\*\*)?\s*[:：]/i.test(line)) {
      explanations.push(line.replace(/^[>\s*💡-]+/, '').replace(/^\*\*|\*\*$/g, '').trim());
      continue;
    }

    // 6. Parentheses format: (Pinyin...) or (Translation...)
    if (line.startsWith('(') && line.endsWith(')')) {
      const inner = line.substring(1, line.length - 1).trim();
      if (isPinyinText(inner)) {
        pinyin.push(inner);
        continue;
      } else {
        translations.push(inner);
        continue;
      }
    }

    mainLines.push(rawLine);
  }

  const mainMarkdown = mainLines.join('\n').trim();
  const chineseForTts = extractChineseForTts(mainMarkdown || content);

  return {
    mainMarkdown: mainMarkdown || content,
    pinyin,
    translations,
    corrections,
    explanations,
    chineseForTts,
  };
}

// -------------------------------------------------------------
// MARKDOWN STYLED COMPONENTS (TAILWIND TYPOGRAPHY)
// -------------------------------------------------------------
const markdownComponents = {
  p: ({ children }: any) => (
    <p className="leading-relaxed mb-2.5 last:mb-0 font-normal">
      {children}
    </p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-bold text-emerald-700 dark:text-emerald-400">
      {children}
    </strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-slate-700 dark:text-slate-300">
      {children}
    </em>
  ),
  h1: ({ children }: any) => (
    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-3 mb-2 flex items-center gap-1.5">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-2.5 mb-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-2 mb-1">
      {children}
    </h3>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-1.5 my-2 pl-1 text-sm">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1.5 my-2 pl-1 text-sm">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed">
      {children}
    </li>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-3 border-emerald-500 pl-3 py-1.5 my-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-r-2xl text-slate-700 dark:text-slate-300 italic text-xs sm:text-sm">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }: any) => {
    const isInline = !className && typeof children === 'string' && !children.includes('\n');
    return isInline ? (
      <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-zinc-700 font-semibold" {...props}>
        {children}
      </code>
    ) : (
      <pre className="p-3 my-2 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
        <code className={className} {...props}>{children}</code>
      </pre>
    );
  },
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3 rounded-2xl border border-slate-200 dark:border-zinc-800">
      <table className="w-full text-left text-xs sm:text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="bg-slate-100 dark:bg-zinc-800 p-2 font-bold border-b border-slate-200 dark:border-zinc-700">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="p-2 border-b border-slate-100 dark:border-zinc-800/80">
      {children}
    </td>
  ),
  hr: () => (
    <hr className="my-3 border-slate-200 dark:border-zinc-800" />
  ),
};

// Quick Conversation Starters
const QUICK_PROMPTS = [
  { chinese: '今天天气怎么样？', hint: 'Hôm nay thời tiết thế nào?' },
  { chinese: '你平时喜欢做什么？', hint: 'Bình thường bạn thích làm gì?' },
  { chinese: '我想去中国旅游，你有什么推荐吗？', hint: 'Tôi muốn đi du lịch Trung Quốc, bạn gợi ý gì không?' },
  { chinese: '教我几句地道的中文口语', hint: 'Dạy tôi vài câu khẩu ngữ tiếng Trung chuẩn bản xứ' },
];

// -------------------------------------------------------------
// COMPONENT: AUDIO WAVEFORM VISUALIZER (LIVELY & DYNAMIC)
// -------------------------------------------------------------
function AudioWaveform({
  isActive,
  color = 'emerald',
  level = 0,
}: {
  isActive: boolean;
  color?: 'emerald' | 'rose';
  level?: number;
}) {
  const barCount = 20;
  // Dynamic scale multiplier that visibly pulses when speaking
  const scaleMultiplier = level > 5 ? Math.min(1.7, 1 + level / 45) : 1;

  return (
    <div
      className="flex items-center justify-center gap-1 sm:gap-1.5 h-12 px-2 transition-transform duration-100 ease-out"
      style={{
        transform: isActive ? `scaleY(${scaleMultiplier})` : 'scaleY(1)',
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const dist = Math.abs(i - 9.5);
        // Beautiful natural bell curve: taller in the center, shorter at edges
        const baseHeight = isActive ? Math.max(8, Math.round(28 - dist * 1.8)) : 4;
        const delays = [0.05, 0.25, 0.45, 0.15, 0.35, 0.55, 0.1, 0.3, 0.5, 0.2];
        const delay = delays[i % delays.length];
        const duration = 0.55 + ((i % 5) * 0.12);

        const activeBg =
          color === 'rose'
            ? 'bg-rose-500 shadow-rose-500/50'
            : 'bg-emerald-500 shadow-emerald-500/50';

        return (
          <span
            key={i}
            className={`w-1 sm:w-1.5 rounded-full transition-all ${
              isActive ? `${activeBg} shadow-xs animate-wave-bar` : 'bg-slate-300 dark:bg-zinc-700'
            }`}
            style={{
              height: `${baseHeight}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------
// MAIN COMPONENT: AI CHINESE SPEAKING PRACTICE
// -------------------------------------------------------------
export default function AiChatPage() {
  const { user, isAuthenticated, isAdmin, updateAiCredits } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  // App & Model State (Default to DeepSeek V4.1 Flash)
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_AI_MODELS[0].id);
  const [hskLevel, setHskLevel] = useState<number>(user?.targetHsk || 3);

  // Topic & Session Assessment State
  const [selectedTopic, setSelectedTopic] = useState<string>(() => {
    if (typeof window === 'undefined') return 'free_chat';
    return localStorage.getItem('hsk_chat_topic') || 'free_chat';
  });
  const [sessionId, setSessionId] = useState<string>('sess_default');
  const [isSessionEnded, setIsSessionEnded] = useState<boolean>(false);
  const [isAssessing, setIsAssessing] = useState<boolean>(false);
  const [assessmentReport, setAssessmentReport] = useState<ConversationAssessmentReport | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState<boolean>(false);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false);
  const [showPinyinGlobally, setShowPinyinGlobally] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hsk_chat_show_pinyin') === 'true';
  });
  const [showVietnameseGlobally, setShowVietnameseGlobally] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hsk_chat_show_vi') === 'true';
  });
  const [autoPronounce, setAutoPronounce] = useState<boolean>(true);
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.85);

  // Per-message local toggle map (so user can inspect pinyin/translation per message on demand)
  const [expandedPinyinMap, setExpandedPinyinMap] = useState<Record<string, boolean>>({});
  const [expandedTransMap, setExpandedTransMap] = useState<Record<string, boolean>>({});

  const toggleMessagePinyin = (id: string) => {
    setExpandedPinyinMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMessageTrans = (id: string) => {
    setExpandedTransMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Conversation State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTextInputMode, setIsTextInputMode] = useState(false);

  // Voice Interaction State
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recognitionLang, setRecognitionLang] = useState<'zh-CN' | 'vi-VN'>('zh-CN');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Per-message UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Refs for bulletproof voice recording & silence detection
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const recordingSecondsRef = useRef<number>(0);
  const lastVoiceDetectedRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const handleStopRecordingAndSendRef = useRef<() => void>(() => {});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Guest usage
  const [guestCount, setGuestCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(GUEST_USAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  const isGuest = !isAuthenticated || !user;
  const userCredits = user?.aiCredits ?? 200;
  const guestRemaining = Math.max(0, 3 - guestCount);
  const effectiveCredits = isGuest ? guestRemaining : userCredits;

  // -------------------------------------------------------------
  // LOAD & SAVE CONVERSATION HISTORY
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('hsk_speech_lang');
      if (savedLang === 'zh-CN' || savedLang === 'vi-VN') {
        setRecognitionLang(savedLang);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionKey = `${STORAGE_KEY}_session_${user?.id || 'guest'}`;
    const savedSession = localStorage.getItem(sessionKey);
    const activeSess = savedSession || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(activeSess);
    localStorage.setItem(sessionKey, activeSess);

    // Check if there was an assessment report saved for this session
    const savedAssessment = localStorage.getItem(`${STORAGE_KEY}_assessment_${activeSess}`);
    if (savedAssessment) {
      try {
        const parsedReport = JSON.parse(savedAssessment);
        if (parsedReport && parsedReport.session_id === activeSess) {
          setAssessmentReport(parsedReport);
          setIsSessionEnded(true);
        }
      } catch {}
    }

    const key = `${STORAGE_KEY}_${user?.id || 'guest'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {}
    }

    // Default friendly initial greeting message matching current topic and HSK level
    const defaultGreeting: Message = {
      id: `msg-init-${Date.now()}`,
      sessionId: activeSess,
      role: 'assistant',
      content: getTopicOpeningGreeting(selectedTopic, hskLevel),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      topic: selectedTopic,
      hskLevel,
    };
    setMessages([defaultGreeting]);
  }, [user?.id, selectedTopic, hskLevel]);

  useEffect(() => {
    if (typeof window === 'undefined' || messages.length === 0) return;
    const key = `${STORAGE_KEY}_${user?.id || 'guest'}`;
    try {
      localStorage.setItem(key, JSON.stringify(messages));
    } catch {}
  }, [messages, user?.id]);

  // Scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, voiceState, liveTranscript, scrollToBottom]);

  // -------------------------------------------------------------
  // AUDIO LEVEL & HARDWARE STREAM CLEANUP
  // -------------------------------------------------------------
  const cleanupMediaStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const startAudioLevelVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let lastThrottleTime = 0;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const now = Date.now();

        // 1. Audio Activity Detection (VAD)
        if (avg > 8) {
          lastVoiceDetectedRef.current = now;
          hasSpokenRef.current = true;
          // Clear initial silence timeout since user spoke
          if (initialSilenceTimerRef.current) {
            clearTimeout(initialSilenceTimerRef.current);
            initialSilenceTimerRef.current = null;
          }
        } else if (hasSpokenRef.current && isRecordingRef.current && !isStoppingRef.current) {
          // If the user spoke, and now 1.8 seconds of silence has passed:
          if (now - lastVoiceDetectedRef.current >= 1800) {
            handleStopRecordingAndSendRef.current();
            return;
          }
        }

        // 2. Throttle visualizer state update to ~25fps (every 40ms) so React stays butter smooth
        if (now - lastThrottleTime > 40) {
          lastThrottleTime = now;
          setAudioLevel(avg);
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn('AudioContext visualizer not available:', err);
    }
  };

  const startRecordingTimer = () => {
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const clearSilenceTimers = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (initialSilenceTimerRef.current) {
      clearTimeout(initialSilenceTimerRef.current);
      initialSilenceTimerRef.current = null;
    }
  };

  // -------------------------------------------------------------
  // SEND MESSAGE (CORE CONVERSATION DISPATCHER)
  // -------------------------------------------------------------
  const handleSendUserMessage = async (text: string, isVoiceInput = false, duration = 0) => {
    const textToSend = text.trim();
    if (!textToSend) return;

    // Disallow new messages if session has already ended/been evaluated
    if (isSessionEnded) {
      alert('Phiên hội thoại này đã kết thúc và được lập báo cáo đánh giá. Bạn vui lòng bấm "Hội thoại mới" để bắt đầu lượt luyện tập tiếp theo nhé!');
      return;
    }

    // Check credits
    if (isGuest && guestRemaining <= 0) {
      setShowOutOfCreditsModal(true);
      return;
    }
    if (!isGuest && userCredits <= 0) {
      setShowOutOfCreditsModal(true);
      return;
    }

    const userMessage: Message = {
      id: `msg-usr-${Date.now()}`,
      sessionId,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isVoice: isVoiceInput,
      voiceDuration: duration,
      transcript: isVoiceInput ? textToSend : undefined,
      topic: selectedTopic,
      hskLevel,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setVoiceState('processing');

    try {
      const apiHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      } else {
        headers['x-guest-chat-count'] = String(guestCount);
      }

      // Non-admins always use default model (deepseek-v4.1-flash)
      const effectiveModel = (isAdmin || user?.role === 'admin') ? selectedModel : AVAILABLE_AI_MODELS[0].id;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: apiHistory,
          scenario: selectedTopic,
          hskLevel,
          model: effectiveModel,
          stream: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.outOfCredits || data.requireAuth) {
          setShowOutOfCreditsModal(true);
        }
        const errorMsg: Message = {
          id: `msg-err-${Date.now()}`,
          sessionId,
          role: 'assistant',
          content: data.message || 'Hệ thống đang bận. Vui lòng thử lại sau giây lát.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          topic: selectedTopic,
          hskLevel,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setVoiceState('idle');
        return;
      }

      // Assistant Reply
      const assistantMessage: Message = {
        id: `msg-ai-${Date.now()}`,
        sessionId,
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        topic: selectedTopic,
        hskLevel,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Deduct credit & update
      if (isGuest) {
        const nextGuest = guestCount + 1;
        setGuestCount(nextGuest);
        localStorage.setItem(GUEST_USAGE_KEY, String(nextGuest));
      } else if (typeof data.remainingCredits === 'number') {
        updateAiCredits(data.remainingCredits);
      }

      // Auto-pronounce if enabled
      if (autoPronounce) {
        handlePlayAudio(data.message.content, assistantMessage.id);
      } else {
        setVoiceState('idle');
      }
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        sessionId,
        role: 'assistant',
        content: 'Lỗi kết nối đến máy chủ AI. Vui lòng kiểm tra lại đường truyền mạng.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        topic: selectedTopic,
        hskLevel,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setVoiceState('idle');
    }
  };

  // -------------------------------------------------------------
  // CONVERSATION SESSION & ASSESSMENT DISPATCHER
  // -------------------------------------------------------------
  const handleStartNewSession = (newTopic = selectedTopic, newHsk = hskLevel) => {
    tts.stop();
    setActivePlayingId(null);
    clearSilenceTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    cleanupMediaStream();

    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(newSessionId);
    setSelectedTopic(newTopic);
    setIsSessionEnded(false);
    setAssessmentReport(null);
    setIsAssessing(false);
    setVoiceState('idle');

    const greetingContent = getTopicOpeningGreeting(newTopic, newHsk);
    const greetingMsg: Message = {
      id: `msg-init-${Date.now()}`,
      sessionId: newSessionId,
      role: 'assistant',
      content: greetingContent,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      topic: newTopic,
      hskLevel: newHsk,
    };
    setMessages([greetingMsg]);

    if (typeof window !== 'undefined') {
      const key = `${STORAGE_KEY}_${user?.id || 'guest'}`;
      localStorage.setItem(key, JSON.stringify([greetingMsg]));
      localStorage.setItem(`${STORAGE_KEY}_session_${user?.id || 'guest'}`, newSessionId);
      localStorage.setItem('hsk_chat_current_session', newSessionId);
      localStorage.setItem('hsk_chat_topic', newTopic);
    }
  };

  const handleSelectTopic = (topicId: string) => {
    if (topicId === selectedTopic) return;
    setSelectedTopic(topicId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hsk_chat_topic', topicId);
    }
    // Auto-start new session if only greeting exists or user confirms
    if (messages.length <= 1 || confirm('Bắt đầu cuộc trò chuyện mới với chủ đề này?')) {
      handleStartNewSession(topicId, hskLevel);
    }
  };

  const handleEndConversationAndAssess = async () => {
    if (isAssessing) return;

    if (voiceState === 'recording') {
      handleCancelRecording();
    }
    tts.stop();
    setActivePlayingId(null);

    setIsAssessing(true);
    setIsSessionEnded(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      const res = await fetch('/api/ai/assessment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          topic: selectedTopic,
          hskLevel,
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            isVoice: m.isVoice,
            voiceDuration: m.voiceDuration,
            transcript: m.transcript || (m.isVoice ? m.content : undefined),
          })),
          hasAudioAssessmentData: false, // Text-based Web Speech API transcript
          model: selectedModel,
          forceRetry: false,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setAssessmentReport(data.report);
        setShowAssessmentModal(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `${STORAGE_KEY}_assessment_${sessionId}`,
            JSON.stringify(data.report)
          );
        }
      } else {
        alert(data.message || 'Không thể tạo báo cáo đánh giá lúc này.');
      }
    } catch (err) {
      console.error('Error generating assessment:', err);
      alert('Lỗi kết nối khi gửi yêu cầu đánh giá.');
    } finally {
      setIsAssessing(false);
    }
  };

  const handleRetryAssessment = async () => {
    if (isAssessing) return;
    setIsAssessing(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      const res = await fetch('/api/ai/assessment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          topic: selectedTopic,
          hskLevel,
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            isVoice: m.isVoice,
            voiceDuration: m.voiceDuration,
            transcript: m.transcript || (m.isVoice ? m.content : undefined),
          })),
          hasAudioAssessmentData: false,
          model: selectedModel,
          forceRetry: true,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setAssessmentReport(data.report);
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `${STORAGE_KEY}_assessment_${sessionId}`,
            JSON.stringify(data.report)
          );
        }
      }
    } catch (err) {
      console.error('Error retrying assessment:', err);
    } finally {
      setIsAssessing(false);
    }
  };

  // -------------------------------------------------------------
  // BULLETPROOF VOICE RECOGNITION (WITH AUTO-SILENCE DETECTION)
  // -------------------------------------------------------------
  const handleStopRecordingAndSend = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    isRecordingRef.current = false;
    clearSilenceTimers();
    stopRecordingTimer();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    cleanupMediaStream();

    const textToSend = transcriptRef.current.trim() || liveTranscript.trim();
    if (textToSend) {
      handleSendUserMessage(textToSend, true, recordingSecondsRef.current);
      transcriptRef.current = '';
      setLiveTranscript('');
    } else {
      setVoiceState('error');
      setErrorMessage('Chưa nhận diện được giọng nói. Bạn hãy nói to hơn hoặc chọn đúng ngôn ngữ (🇨🇳 Tiếng Trung hoặc 🇻🇳 Tiếng Việt) nhé!');
    }
  }, [liveTranscript]);

  // Keep ref up to date for hardware VAD ticks & timeout callbacks
  useEffect(() => {
    handleStopRecordingAndSendRef.current = handleStopRecordingAndSend;
  }, [handleStopRecordingAndSend]);

  const handleCancelRecording = () => {
    isStoppingRef.current = true;
    isRecordingRef.current = false;
    clearSilenceTimers();
    stopRecordingTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    cleanupMediaStream();
    transcriptRef.current = '';
    setLiveTranscript('');
    setVoiceState('idle');
  };

  const handleStartSpeaking = async () => {
    // Check credits
    if (isGuest && guestRemaining <= 0) {
      setShowOutOfCreditsModal(true);
      return;
    }
    if (!isGuest && userCredits <= 0) {
      setShowOutOfCreditsModal(true);
      return;
    }

    // Stop TTS if speaking
    tts.stop();
    setActivePlayingId(null);

    setErrorMessage('');
    setLiveTranscript('');
    transcriptRef.current = '';
    isStoppingRef.current = false;
    isRecordingRef.current = true;
    hasSpokenRef.current = false;
    lastVoiceDetectedRef.current = Date.now();
    recordingSecondsRef.current = 0;
    clearSilenceTimers();

    // 1. Explicitly request hardware microphone permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      startAudioLevelVisualizer(stream);
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setErrorMessage('Trình duyệt chưa được cấp quyền micro. Vui lòng nhấn vào biểu tượng Micro/Ổ khóa trên thanh địa chỉ URL để cấp quyền!');
      setVoiceState('error');
      isRecordingRef.current = false;
      return;
    }

    // 2. Initialize fresh Web Speech Recognition instance
    const windowObj = window as unknown as {
      SpeechRecognition?: IWindowSpeechRecognition;
      webkitSpeechRecognition?: IWindowSpeechRecognition;
    };
    const SpeechRecognitionAPI = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      cleanupMediaStream();
      isRecordingRef.current = false;
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói (Web Speech API). Vui lòng sử dụng Google Chrome, Edge hoặc Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recog = new SpeechRecognitionAPI();
      recog.continuous = true; // KEEP LISTENING continuously!
      recog.interimResults = true;
      recog.lang = recognitionLang;

      recog.onresult = (event: ISpeechRecognitionEvent) => {
        let full = '';
        for (let i = 0; i < event.results.length; ++i) {
          full += event.results[i][0].transcript;
        }
        transcriptRef.current = full;
        setLiveTranscript(full);

        if (full.trim()) {
          hasSpokenRef.current = true;
          lastVoiceDetectedRef.current = Date.now();
          if (initialSilenceTimerRef.current) {
            clearTimeout(initialSilenceTimerRef.current);
            initialSilenceTimerRef.current = null;
          }
        }

        // VAD / AUTO-END: If words are heard, reset silence timer!
        // Automatically finish & send after 1.8 seconds of silence
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        if (full.trim()) {
          silenceTimerRef.current = setTimeout(() => {
            handleStopRecordingAndSendRef.current();
          }, 1800);
        }
      };

      recog.onerror = (e) => {
        console.warn('Speech recognition error event:', e.error);
        if (e.error === 'no-speech') {
          // Normal pause during speaking, keep listening!
          return;
        }
        if (e.error === 'not-allowed') {
          setErrorMessage('Quyền truy cập micro đã bị chặn. Vui lòng cấp quyền trong cài đặt trình duyệt.');
          setVoiceState('error');
          isRecordingRef.current = false;
          clearSilenceTimers();
          stopRecordingTimer();
          cleanupMediaStream();
        }
      };

      recog.onend = () => {
        stopRecordingTimer();
        cleanupMediaStream();
        clearSilenceTimers();

        if (!isStoppingRef.current && isRecordingRef.current) {
          isRecordingRef.current = false;
          const finalCandidate = transcriptRef.current.trim();
          if (finalCandidate) {
            handleSendUserMessage(finalCandidate, true, recordingSecondsRef.current);
            transcriptRef.current = '';
            setLiveTranscript('');
          } else {
            setVoiceState('idle');
          }
        }
      };

      recog.start();
      recognitionRef.current = recog;
      setVoiceState('recording');
      startRecordingTimer();

      // If user presses mic but says nothing at all for 5 seconds, auto cancel
      initialSilenceTimerRef.current = setTimeout(() => {
        if (!hasSpokenRef.current && !transcriptRef.current.trim() && !isStoppingRef.current) {
          handleCancelRecording();
          setErrorMessage('Không nhận được âm thanh nói. Bạn hãy bấm lại micro và nói to hơn nhé!');
          setVoiceState('error');
        }
      }, 5000);
    } catch (err) {
      console.error('Speech recognition start error:', err);
      cleanupMediaStream();
      clearSilenceTimers();
      isRecordingRef.current = false;
      setVoiceState('error');
      setErrorMessage('Không thể khởi động bộ nhận diện giọng nói. Vui lòng thử lại.');
    }
  };

  const toggleLanguage = () => {
    const nextLang = recognitionLang === 'zh-CN' ? 'vi-VN' : 'zh-CN';
    setRecognitionLang(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hsk_speech_lang', nextLang);
    }
  };

  // -------------------------------------------------------------
  // TEXT-TO-SPEECH (SPEAK CHINESE WITH NATIVE ACCENT)
  // -------------------------------------------------------------
  const handlePlayAudio = (rawText: string, messageId: string) => {
    if (activePlayingId === messageId) {
      tts.stop();
      setActivePlayingId(null);
      if (voiceState === 'ai_speaking') setVoiceState('idle');
      return;
    }

    const textToSpeak = extractChineseForTts(rawText);

    setActivePlayingId(messageId);
    setVoiceState('ai_speaking');

    tts.setRate(speechSpeed);
    tts.speak(textToSpeak, {
      rate: speechSpeed,
      onEnd: () => {
        setActivePlayingId(null);
        setVoiceState('idle');
      },
      onError: () => {
        setActivePlayingId(null);
        setVoiceState('idle');
      },
    });
  };

  // Reset conversation
  const handleResetChat = () => {
    if (!confirm('Bạn có muốn xóa cuộc trò chuyện và bắt đầu phiên mới không?')) return;
    handleStartNewSession(selectedTopic, hskLevel);
  };

  // Copy to clipboard
  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  // -------------------------------------------------------------
  // RENDER: AI CONVERSATION MESSAGE ITEM
  // -------------------------------------------------------------
  const renderAiMessage = (msg: Message) => {
    const isPlaying = activePlayingId === msg.id;
    const parsed = parseAiResponse(msg.content);

    const hasPinyin = parsed.pinyin.length > 0;
    const hasTranslation = parsed.translations.length > 0;
    const hasFeedback = parsed.corrections.length > 0 || parsed.explanations.length > 0;

    const isPinyinVisible = showPinyinGlobally || !!expandedPinyinMap[msg.id];
    const isTransVisible = showVietnameseGlobally || !!expandedTransMap[msg.id];

    return (
      <div key={msg.id} className="w-full flex gap-3 sm:gap-4 group animate-fadeIn">
        {/* Tutor Avatar */}
        <div className="relative shrink-0 self-start mt-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xs">
            <Bot size={20} />
          </div>
          {isPlaying && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 animate-ping" />
          )}
        </div>

        {/* Message Container */}
        <div className="flex-1 max-w-2xl min-w-0">
          <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
            {/* Primary Content: Clean Chinese Conversation in Rich Markdown */}
            <div className="text-base sm:text-lg tracking-wide leading-relaxed font-sans text-slate-800 dark:text-slate-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {parsed.mainMarkdown}
              </ReactMarkdown>
            </div>

            {/* Collapsible Language Assist Drawer: Pinyin */}
            {hasPinyin && isPinyinVisible && (
              <div className="mt-3.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs sm:text-sm animate-fadeIn">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-[11px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Phiên âm Pinyin
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(parsed.pinyin.join('\n'), `pinyin-${msg.id}`)}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {copiedId === `pinyin-${msg.id}` ? (
                      <>
                        <Check size={11} /> <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-1">
                  {parsed.pinyin.map((p, idx) => (
                    <p key={idx} className="font-mono font-medium text-emerald-900 dark:text-emerald-200 tracking-wide leading-relaxed select-text">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Language Assist Drawer: Vietnamese Translation */}
            {hasTranslation && isTransVisible && (
              <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 text-xs sm:text-sm animate-fadeIn">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    <Globe size={11} className="text-blue-500" />
                    Bản dịch tiếng Việt
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(parsed.translations.join('\n'), `trans-${msg.id}`)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1"
                  >
                    {copiedId === `trans-${msg.id}` ? (
                      <>
                        <Check size={11} /> <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-1">
                  {parsed.translations.map((t, idx) => (
                    <p key={idx} className="text-slate-700 dark:text-slate-300 italic leading-relaxed select-text font-normal">
                      {t}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* LEARNING FEEDBACK PANEL (Gợi ý học tập & Chữa lỗi) */}
            {hasFeedback && (
              <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 text-xs text-amber-950 dark:text-amber-200 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <Lightbulb size={14} className="text-amber-500" />
                  <span>Gợi ý học tập từ Tiểu Trí:</span>
                </div>

                {parsed.corrections.map((corr, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white/70 dark:bg-zinc-900/60 p-2 rounded-xl border border-amber-200/50 dark:border-amber-900/40 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">👉</span>
                    <div className="flex-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {corr}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}

                {parsed.explanations.map((exp, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 leading-relaxed pl-2 border-l-2 border-amber-400/50 text-xs">
                    <div className="flex-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {exp}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Message Action Bar */}
            <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {/* Play Pronunciation Button */}
                <button
                  type="button"
                  onClick={() => handlePlayAudio(parsed.chineseForTts || msg.content, msg.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                  }`}
                  title={isPlaying ? 'Dừng phát âm' : 'Nghe phát âm chuẩn (giọng Bắc Kinh)'}
                >
                  {isPlaying ? <Square size={13} className="fill-white" /> : <Volume2 size={14} />}
                  <span>{isPlaying ? 'Đang đọc...' : 'Nghe đọc'}</span>
                </button>

                {/* Per-Message Pinyin Toggle Button */}
                {hasPinyin && (
                  <button
                    type="button"
                    onClick={() => toggleMessagePinyin(msg.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isPinyinVisible
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-transparent text-slate-600 dark:text-slate-400'
                    }`}
                    title={isPinyinVisible ? 'Ẩn phiên âm Pinyin' : 'Hiện phiên âm Pinyin'}
                  >
                    <span className="font-bold text-[10px]">拼</span>
                    <span>{isPinyinVisible ? 'Ẩn Pinyin' : 'Pinyin'}</span>
                  </button>
                )}

                {/* Per-Message Vietnamese Translation Toggle Button */}
                {hasTranslation && (
                  <button
                    type="button"
                    onClick={() => toggleMessageTrans(msg.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isTransVisible
                        ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-transparent text-slate-600 dark:text-slate-400'
                    }`}
                    title={isTransVisible ? 'Ẩn bản dịch tiếng Việt' : 'Hiện bản dịch tiếng Việt'}
                  >
                    <Globe size={12} className={isTransVisible ? 'text-blue-600' : 'text-slate-500'} />
                    <span>{isTransVisible ? 'Ẩn dịch' : 'Dịch'}</span>
                  </button>
                )}
              </div>

              {/* Auxiliary Controls: Time & Copy */}
              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 ml-auto">
                <span className="text-[10px] font-mono mr-1">{msg.timestamp}</span>

                <button
                  type="button"
                  onClick={() => handleCopy(parsed.mainMarkdown, msg.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Sao chép câu tiếng Trung"
                >
                  {copiedId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // RENDER: USER MESSAGE ITEM
  // -------------------------------------------------------------
  const renderUserMessage = (msg: Message) => {
    return (
      <div key={msg.id} className="w-full flex justify-end gap-3 sm:gap-4 animate-fadeIn">
        <div className="max-w-xl">
          <div className="bg-emerald-600 text-white rounded-3xl rounded-tr-xs p-3.5 sm:p-4 shadow-sm text-sm sm:text-base leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ...markdownComponents,
                p: ({ children }: any) => <p className="leading-relaxed mb-1 last:mb-0 text-white">{children}</p>,
                strong: ({ children }: any) => <strong className="font-bold text-emerald-100">{children}</strong>,
                code: ({ children }: any) => (
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/20 text-white font-semibold">
                    {children}
                  </code>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>

            <div className="mt-1.5 pt-1 flex items-center justify-end gap-2 text-[10px] text-emerald-100/90 font-mono">
              {msg.isVoice && (
                <span className="flex items-center gap-1 bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
                  <Mic size={10} />
                  <span>{msg.voiceDuration ? `00:${String(msg.voiceDuration).padStart(2, '0')}` : 'Giọng nói'}</span>
                </span>
              )}
              <span>{msg.timestamp}</span>
            </div>
          </div>
        </div>

        {/* User Initial Icon */}
        <div className="w-8 h-8 rounded-2xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 self-start mt-0.5">
          <UserIcon size={15} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-[#0F172A] dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-emerald-100 selection:text-emerald-900">
      {/* ------------------------------------------------------------- */}
      {/* A. FIXED PERMANENT TOP NAVIGATION (NEVER DISAPPEARS ON SCROLL) */}
      {/* ------------------------------------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-[#E2E8F0] dark:border-zinc-800 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-xs">
        {/* Left Side: Back + AI Avatar + Name (Clean & Simple) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            href="/"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Quay lại Bảng từ vựng"
          >
            <ArrowLeft size={19} />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Bot size={18} />
            </div>
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
              Tiểu Trí AI (小智)
            </span>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              HSK {hskLevel}
            </span>
            {/* Active Topic Indicator Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              title="Nhấn để đổi chủ đề luyện nói"
            >
              <span>{CONVERSATION_TOPICS.find((t) => t.id === selectedTopic)?.name || 'Hội thoại'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Global Toggles + Credits + Assessment + Model Selector (ADMIN ONLY) + Reset + Settings + Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Conversation Assessment Action Button */}
          <button
            type="button"
            onClick={
              isSessionEnded && assessmentReport
                ? () => setShowAssessmentModal(true)
                : handleEndConversationAndAssess
            }
            disabled={isAssessing}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              isSessionEnded && assessmentReport
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            }`}
            title={
              isSessionEnded
                ? 'Xem lại Báo cáo Đánh giá'
                : 'Kết thúc hội thoại và nhận Báo cáo Đánh giá toàn diện'
            }
          >
            {isAssessing ? (
              <>
                <Sparkles size={14} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Đang đánh giá...</span>
              </>
            ) : isSessionEnded ? (
              <>
                <Award size={14} />
                <span className="hidden sm:inline">Xem Báo Cáo</span>
              </>
            ) : (
              <>
                <Award size={14} />
                <span className="hidden sm:inline">Kết thúc & Đánh giá</span>
                <span className="sm:hidden">Đánh giá</span>
              </>
            )}
          </button>

          {/* Quick Global Switch: Pinyin */}
          <button
            type="button"
            onClick={() => {
              const next = !showPinyinGlobally;
              setShowPinyinGlobally(next);
              if (typeof window !== 'undefined') {
                localStorage.setItem('hsk_chat_show_pinyin', String(next));
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showPinyinGlobally
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
            }`}
            title="Bật/Tắt hiển thị Pinyin cho toàn bộ cuộc trò chuyện"
          >
            <span className="font-bold text-[11px]">拼</span>
            <span className="hidden sm:inline">Pinyin</span>
            {showPinyinGlobally ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Quick Global Switch: Vietnamese Translation */}
          <button
            type="button"
            onClick={() => {
              const next = !showVietnameseGlobally;
              setShowVietnameseGlobally(next);
              if (typeof window !== 'undefined') {
                localStorage.setItem('hsk_chat_show_vi', String(next));
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showVietnameseGlobally
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
            }`}
            title="Bật/Tắt hiển thị Dịch nghĩa cho toàn bộ cuộc trò chuyện"
          >
            <Globe size={13} className={showVietnameseGlobally ? 'text-white' : 'text-slate-500'} />
            <span className="hidden sm:inline">Dịch</span>
            {showVietnameseGlobally ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Remaining Credits Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
              effectiveCredits <= 10
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
                : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
            }`}
            title="Mỗi lượt trò chuyện AI tiêu hao 1 credit"
          >
            <Zap size={14} className={effectiveCredits <= 10 ? 'text-rose-500 fill-rose-500' : 'text-amber-500 fill-amber-500'} />
            <span className="font-mono">{effectiveCredits}</span>
            <span className="hidden md:inline font-medium">Credits</span>
          </div>

          {/* Model Selector Dropdown - ONLY FOR ADMIN */}
          {(isAdmin || user?.role === 'admin') && (
            <div className="relative hidden md:block">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-300 hover:border-amber-400 focus:outline-none cursor-pointer"
                title="Quyền Admin: Chọn Model AI"
              >
                {AVAILABLE_AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    Admin: {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-600 pointer-events-none" />
            </div>
          )}

          {/* Reset / Clear Chat */}
          <button
            type="button"
            onClick={handleResetChat}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Xóa và bắt đầu phiên hội thoại mới"
          >
            <RotateCcw size={15} />
          </button>

          {/* Settings Modal Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Cài đặt giọng đọc & Hiển thị"
          >
            <SlidersHorizontal size={15} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {effectiveTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* GUEST BANNER (IF APPLICABLE) */}
      {/* ------------------------------------------------------------- */}
      {isGuest && (
        <div className="max-w-4xl w-full mx-auto px-3 sm:px-6 pt-16 sm:pt-20">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>
                Bạn đang thử nghiệm ở chế độ Khách (còn <strong>{guestRemaining} lượt</strong>). Hãy <strong>Đăng nhập</strong> để nhận ngay <strong>200 Credits</strong> luyện nói!
              </span>
            </div>
            <Link
              href="/"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-2xs shrink-0 whitespace-nowrap"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* C. MAIN AI CONVERSATION AREA (FOCUSED & SPACIOUS) */}
      {/* ------------------------------------------------------------- */}
      <main className={`flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 pb-48 flex flex-col space-y-6 ${isGuest ? 'pt-4' : 'pt-20 sm:pt-24'}`}>
        {messages.map((msg) => (msg.role === 'assistant' ? renderAiMessage(msg) : renderUserMessage(msg)))}

        {/* Quick Conversation Starters when conversation is fresh */}
        {messages.length <= 1 && (
          <div className="pt-2 animate-fadeIn">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              💡 Gợi ý câu mở đầu luyện nói:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendUserMessage(qp.chinese, false)}
                  className="group flex flex-col items-start p-3 bg-white dark:bg-zinc-900 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl text-left shadow-2xs transition-all cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    💬 {qp.chinese}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-emerald-600/80 dark:group-hover:text-emerald-400/80 mt-0.5">
                    {qp.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {voiceState === 'processing' && (
          <div className="w-full flex gap-3 sm:gap-4 animate-fadeIn">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Bot size={20} />
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-slate-200 dark:border-zinc-800 flex items-center gap-3">
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                Tiểu Trí đang chuẩn bị phản hồi...
              </span>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* ------------------------------------------------------------- */}
      {/* D. VOICE-FIRST INTERACTION PANEL (ENHANCED & AUTO-SEND) */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-black dark:via-black/95 dark:to-transparent pt-6 pb-4 sm:pb-6 px-3 sm:px-6">
        <div className="max-w-xl mx-auto">
          {/* Main Voice Dock Container */}
          <div className="bg-white dark:bg-zinc-900/95 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xl p-3 sm:p-4 backdrop-blur-xl">
            {/* STATE: SESSION ENDED / COMPLETED ASSESSMENT */}
            {isSessionEnded ? (
              <div className="flex flex-col items-center gap-2.5 py-2 text-center animate-fadeIn">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  <Award size={18} className="text-emerald-500" />
                  <span>Phiên hội thoại đã hoàn tất & có báo cáo đánh giá!</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Bạn có thể xem lại kết quả phân tích hoặc bắt đầu cuộc trò chuyện mới để tiếp tục nâng cao phản xạ.
                </p>
                <div className="flex items-center gap-2.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowAssessmentModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award size={14} />
                    <span>Xem Báo Cáo Đánh Giá</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartNewSession()}
                    className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Hội thoại mới</span>
                  </button>
                </div>
              </div>
            ) : isTextInputMode ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Chế độ gõ phím</span>
                  <button
                    type="button"
                    onClick={() => setIsTextInputMode(false)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Mic size={13} />
                    <span>Chuyển sang Luyện Nói (Voice)</span>
                  </button>
                </div>

                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputValue.trim()) {
                          handleSendUserMessage(inputValue.trim(), false);
                        }
                      }
                    }}
                    placeholder="Nhập câu tiếng Trung hoặc tiếng Việt... (Enter để gửi)"
                    className="flex-1 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-200 dark:border-zinc-700 resize-none"
                  />
                  <button
                    type="button"
                    disabled={!inputValue.trim()}
                    onClick={() => {
                      if (inputValue.trim()) {
                        handleSendUserMessage(inputValue.trim(), false);
                      }
                    }}
                    className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-xs cursor-pointer transition-all"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            ) : (
              // STATE: VOICE-FIRST MODES (IDLE, RECORDING, PROCESSING, AI SPEAKING)
              <div className="flex flex-col items-center">
                {/* 1. RECORDING STATE */}
                {voiceState === 'recording' && (
                  <div className="w-full flex flex-col items-center gap-2.5 py-1 animate-fadeIn">
                    <div className="flex items-center gap-2 text-rose-500 font-bold text-xs sm:text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Đang nghe bạn nói ({recognitionLang === 'zh-CN' ? 'Tiếng Trung' : 'Tiếng Việt'})</span>
                      <span className="font-mono bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full text-xs">
                        00:{String(recordingSeconds).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Dynamic Dancing Waveform - animates and modulates with real volume */}
                    <AudioWaveform isActive={true} color="rose" level={audioLevel} />

                    {/* Live Transcript Display */}
                    <div className="w-full max-h-24 overflow-y-auto px-3 py-2 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700/80 text-xs sm:text-sm text-slate-800 dark:text-slate-100 text-center font-medium min-h-[42px] flex flex-col items-center justify-center">
                      {liveTranscript ? (
                        <>
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{liveTranscript}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            (Dừng nói 1.8s hệ thống sẽ tự động gửi...)
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">
                          (Hãy bắt đầu nói vào micro, chữ sẽ xuất hiện tại đây...)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1">
                      {/* Cancel Button */}
                      <button
                        type="button"
                        onClick={handleCancelRecording}
                        className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Hủy bỏ"
                      >
                        <X size={18} />
                      </button>

                      {/* Immediate Send Button */}
                      <button
                        type="button"
                        onClick={handleStopRecordingAndSend}
                        className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <Check size={16} />
                        <span>Xong & Gửi ngay</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. PROCESSING STATE */}
                {voiceState === 'processing' && (
                  <div className="flex flex-col items-center gap-2 py-2 animate-fadeIn">
                    <div className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <Sparkles size={16} className="animate-spin" />
                      <span>Tiểu Trí đang suy nghĩ...</span>
                    </div>
                    <AudioWaveform isActive={true} color="emerald" level={0} />
                  </div>
                )}

                {/* 3. AI SPEAKING STATE */}
                {voiceState === 'ai_speaking' && (
                  <div className="w-full flex flex-col items-center gap-2 py-1 animate-fadeIn">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                      <Volume2 size={16} className="animate-pulse" />
                      <span>Tiểu Trí đang phát âm...</span>
                    </div>
                    <AudioWaveform isActive={true} color="emerald" level={25} />

                    <button
                      type="button"
                      onClick={() => {
                        tts.stop();
                        setActivePlayingId(null);
                        setVoiceState('idle');
                      }}
                      className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Square size={12} className="fill-current" />
                      <span>Dừng phát âm</span>
                    </button>
                  </div>
                )}

                {/* 4. ERROR STATE */}
                {voiceState === 'error' && (
                  <div className="flex flex-col items-center gap-2.5 py-1 text-center animate-fadeIn max-w-md">
                    <p className="text-xs text-rose-500 font-medium leading-relaxed">
                      {errorMessage || 'Không thể nhận diện được giọng nói.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStartSpeaking}
                        className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RefreshCw size={12} />
                        <span>Thử nói lại</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTextInputMode(true)}
                        className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-200"
                      >
                        Gõ phím thay thế
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. IDLE STATE: THE HERO MICROPHONE CTA BUTTON */}
                {voiceState === 'idle' && (
                  <div className="w-full flex items-center justify-between px-2 sm:px-4 py-1">
                    {/* Left: Language Toggle Chip */}
                    <button
                      type="button"
                      onClick={toggleLanguage}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Bấm để đổi ngôn ngữ nói (Tiếng Trung hoặc Tiếng Việt)"
                    >
                      <Globe size={13} className="text-emerald-500" />
                      <span>{recognitionLang === 'zh-CN' ? '🇨🇳 Tiếng Trung' : '🇻🇳 Tiếng Việt'}</span>
                    </button>

                    {/* Center: Large Hero Microphone Button */}
                    <div className="flex flex-col items-center -mt-6">
                      <button
                        type="button"
                        onClick={handleStartSpeaking}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-emerald-500/20 group"
                        title="Bấm để nói"
                      >
                        <Mic size={28} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <span className="mt-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                        Nhấn để nói
                      </span>
                    </div>

                    {/* Right: Switch to Keyboard Typing */}
                    <button
                      type="button"
                      onClick={() => setIsTextInputMode(true)}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Gõ văn bản bằng bàn phím"
                    >
                      <MessageSquare size={13} className="text-slate-500" />
                      <span className="hidden sm:inline">Gõ phím</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SETTINGS MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-zinc-800 p-6 relative">
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-emerald-500" />
              <span>Cài Đặt Hội Thoại & Phát Âm</span>
            </h3>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Tốc độ đọc TTS */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Tốc độ phát âm tiếng Trung:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '0.7x (Chậm)', val: 0.7 },
                    { label: '0.85x (Chuẩn)', val: 0.85 },
                    { label: '1.0x (Nhanh)', val: 1.0 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setSpeechSpeed(s.val)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        speechSpeed === s.val
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tự động phát âm khi AI trả lời */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Tự động phát âm câu trả lời</div>
                  <div className="text-[11px] text-slate-400">AI tự động đọc câu tiếng Trung sau khi phản hồi</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPronounce}
                  onChange={(e) => setAutoPronounce(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Hiển thị Pinyin */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Hiển thị phiên âm Pinyin</div>
                  <div className="text-[11px] text-slate-400">Tự động mở phiên âm cho tất cả câu thoại</div>
                </div>
                <input
                  type="checkbox"
                  checked={showPinyinGlobally}
                  onChange={(e) => {
                    setShowPinyinGlobally(e.target.checked);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('hsk_chat_show_pinyin', String(e.target.checked));
                    }
                  }}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Hiển thị dịch nghĩa tiếng Việt */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Hiển thị dịch nghĩa tiếng Việt</div>
                  <div className="text-[11px] text-slate-400">Tự động mở bản dịch cho tất cả câu thoại</div>
                </div>
                <input
                  type="checkbox"
                  checked={showVietnameseGlobally}
                  onChange={(e) => {
                    setShowVietnameseGlobally(e.target.checked);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('hsk_chat_show_vi', String(e.target.checked));
                    }
                  }}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* HSK Level Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Mục tiêu cấp độ HSK:
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setHskLevel(lvl);
                        handleStartNewSession(selectedTopic, lvl);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        hskLevel === lvl
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      HSK {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chủ đề hội thoại */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Chủ đề luyện nói ({CONVERSATION_TOPICS.find((t) => t.id === selectedTopic)?.name}):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONVERSATION_TOPICS.map((top) => (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => handleSelectTopic(top.id)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        selectedTopic === top.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/30'
                          : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{top.name}</div>
                      <div className="text-[10px] text-slate-400 font-sans truncate">{top.chineseName}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* OUT OF CREDITS MODAL */}
      {/* ------------------------------------------------------------- */}
      {showOutOfCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-zinc-800 p-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Zap size={24} className="fill-amber-500" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {isGuest ? 'Đăng Nhập Để Nhận 200 Credits!' : 'Bạn Đã Dùng Hết Credit AI'}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {isGuest
                ? 'Bạn đã dùng hết 3 lượt trò chuyện thử nghiệm. Hãy đăng nhập hoặc tạo tài khoản miễn phí để nhận ngay 200 Credits luyện nói tiếng Trung cùng Tiểu Trí!'
                : 'Tài khoản của bạn đã sử dụng hết số credit AI được cấp. Vui lòng liên hệ Quản trị viên hệ thống để được nạp thêm credit học tập hoàn toàn miễn phí.'}
            </p>

            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60 text-xs text-slate-600 dark:text-slate-300 mb-5 space-y-1">
              <div>
                📧 Email Admin: <strong className="font-mono text-emerald-600 dark:text-emerald-400">luunhuthang2402@gmail.com</strong>
              </div>
              <div>⚡ Mỗi tin nhắn trò chuyện với AI chỉ tiêu hao 1 credit.</div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowOutOfCreditsModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              {isGuest ? (
                <Link
                  href="/"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-colors shadow-xs"
                >
                  Đăng nhập ngay
                </Link>
              ) : (
                <a
                  href="mailto:luunhuthang2402@gmail.com?subject=Yêu cầu nạp thêm credit AI HSK"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-colors shadow-xs"
                >
                  Liên hệ Admin
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ASSESSMENT REPORT MODAL */}
      {/* ------------------------------------------------------------- */}
      <AssessmentReportModal
        isOpen={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        report={assessmentReport}
        onStartNewSession={() => handleStartNewSession()}
        onRetry={handleRetryAssessment}
        isRetrying={isAssessing}
      />
    </div>
  );
}
