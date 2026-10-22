import fullGrammarData from './hsk_grammar_full.json';
import { GrammarPoint, HskGrammarLevel } from '@/types/grammar';

export const HSK_GRAMMAR_DATABASE: GrammarPoint[] = fullGrammarData as GrammarPoint[];

export const HSK_LEVEL_METAS: Record<
  HskGrammarLevel,
  {
    level: HskGrammarLevel;
    label: string;
    chineseName: string;
    description: string;
    color: string;
    badgeBg: string;
  }
> = {
  1: {
    level: 1,
    label: 'HSK 1',
    chineseName: '一级语法',
    description: 'Ngữ pháp cơ bản HSK 1: Trật tự từ SVO, trợ từ, số từ, lượng từ, câu chữ 是/有.',
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500 text-white',
  },
  2: {
    level: 2,
    label: 'HSK 2',
    chineseName: '二级语法',
    description: 'Ngữ pháp HSK 2: Động từ năng nguyện, bổ ngữ trạng thái, câu so sánh 比, trợ từ động thái.',
    color: 'from-teal-500 to-cyan-600',
    badgeBg: 'bg-teal-500 text-white',
  },
  3: {
    level: 3,
    label: 'HSK 3',
    chineseName: '三级语法',
    description: 'Ngữ pháp HSK 3: Câu chữ 把, câu chữ 被, bổ ngữ khả năng, từ ly hợp, câu phức liên kết.',
    color: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-500 text-white',
  },
  4: {
    level: 4,
    label: 'HSK 4',
    chineseName: '四级语法',
    description: 'Ngữ pháp HSK 4: Bộ ba trợ từ 的/地/得, cấu trúc nhấn mạnh 是...的, bổ ngữ xu hướng kép.',
    color: 'from-indigo-500 to-purple-600',
    badgeBg: 'bg-indigo-500 text-white',
  },
  5: {
    level: 5,
    label: 'HSK 5',
    chineseName: '五级语法',
    description: 'Ngữ pháp HSK 5: Câu tồn hiện, từ ngữ văn viết 便/则/予以/进行, bổ ngữ mức độ cao cấp.',
    color: 'from-purple-500 to-pink-600',
    badgeBg: 'bg-purple-500 text-white',
  },
  6: {
    level: 6,
    label: 'HSK 6',
    chineseName: '六级语法',
    description: 'Ngữ pháp HSK 6: Hư từ cổ 之/乎/者/也/所, chẩn đoán bệnh cú, cấu trúc 以...为..., liên câu.',
    color: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-500 text-white',
  },
  7: {
    level: 7,
    label: 'HSK 7',
    chineseName: '七级高级语法',
    description: 'Ngữ pháp HSK 7: Văn phong học thuật, câu bị động chính luận 为……所, cấu trúc nhân quả cao cấp.',
    color: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-600 text-white',
  },
  8: {
    level: 8,
    label: 'HSK 8',
    chineseName: '八级高级语法',
    description: 'Ngữ pháp HSK 8: Biện pháp tu từ ngẫu biền, cấu trúc tăng tiến đa tầng 由表及里, ẩn dụ học thuật.',
    color: 'from-orange-500 to-amber-700',
    badgeBg: 'bg-orange-600 text-white',
  },
  9: {
    level: 9,
    label: 'HSK 9',
    chineseName: '九级巅峰语法',
    description: 'Ngữ pháp HSK 9: Biện luận nhượng bộ đỉnh cao, hư từ danh từ hóa 所……的, phong cách học thuật.',
    color: 'from-red-600 to-rose-700',
    badgeBg: 'bg-red-600 text-white',
  },
};

export function getGrammarPointById(id: string): GrammarPoint | undefined {
  return HSK_GRAMMAR_DATABASE.find((p) => p.id === id);
}

export function getGrammarPointsByLevel(level: HskGrammarLevel): GrammarPoint[] {
  return HSK_GRAMMAR_DATABASE.filter((p) => p.level === level);
}

export function getAllGrammarQuizzes(level?: HskGrammarLevel) {
  const points = level ? getGrammarPointsByLevel(level) : HSK_GRAMMAR_DATABASE;
  return points.flatMap((p) =>
    p.quiz.map((q) => ({
      ...q,
      grammarPointId: p.id,
      grammarPointTitle: p.title,
      grammarLevelLabel: p.levelLabel,
    }))
  );
}
