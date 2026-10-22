export type HskGrammarLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type GrammarCategory =
  | 'sentence_pattern' // 句型 (Cấu trúc câu đặc biệt)
  | 'complement'       // 补语 (Bổ ngữ: kết quả, khả năng, xu hướng, trạng thái, thời lượng)
  | 'particle'         // 助词/虚词 (Trợ từ: 的/地/得, 了/着/过, 吧/吗/呢)
  | 'conjunction'      // 连词/复句 (Liên từ, câu phức: điều kiện, nhượng bộ, nhân quả)
  | 'comparison'       // 比较句 (Câu so sánh: 比, 没有, 不如, 一样)
  | 'word_order'       // 语序/词类 (Trật tự từ, phó từ, lượng từ, động từ ly hợp)
  | 'aspect'           // 动作的态 (Thời thái động tác: tiến hành, hoàn thành, tiếp diễn)
  | 'discourse';       // 句群/篇章 (Nhóm câu, văn bản học thuật & chính luận HSK 7-9)

export interface GrammarExample {
  chinese: string;
  pinyin: string;
  meaning: string;
  highlight?: string; // Word or structure to emphasize
  audioText?: string;
}

export interface GrammarMistake {
  wrong: string;
  correct: string;
  explanation: string;
}

export interface GrammarQuizQuestion {
  id: string;
  type: 'choice' | 'cloze' | 'spot_bug';
  question: string;
  promptSub?: string;
  options: string[];
  correctAnswer: string | number; // index or exact string
  explanation: string;
}

export interface GrammarCoreStructure {
  num: number;
  pattern: string; // e.g. "基于... (Căn cứ trên)"
  description: string; // e.g. "Dùng để nêu căn cứ, cơ sở của một luận điểm."
  example: string; // e.g. "基于以上分析，我们可以得出结论。"
  examplePinyin?: string;
  exampleMeaning?: string; // e.g. "Dựa trên các phân tích trên, chúng ta có thể rút ra kết luận."
}

export interface GrammarVocabItem {
  word: string;
  pinyin: string;
  meaning: string;
}

export interface GrammarPoint {
  id: string;
  level: HskGrammarLevel;
  levelLabel: string; // e.g. "HSK 1", "HSK 2", ..., "HSK 7", "HSK 8", "HSK 9"
  category: GrammarCategory;
  categoryLabel: string;
  title: string;
  chineseTitle: string;
  structure: string; // Formula e.g. "S + 把 + O + V + Thành phần khác"
  syntaxTokens?: Array<{
    label: string;
    role: 'subject' | 'time_place' | 'adverb' | 'special' | 'verb' | 'object' | 'complement';
  }>;
  summary: string;
  rules: string[];
  tips?: string;
  examples: GrammarExample[];
  commonMistakes: GrammarMistake[];
  quiz: GrammarQuizQuestion[];
  isHotOrTricky?: boolean;

  // LMS Course Structure Fields
  lessonIndex: number; // e.g. 1, 2, 3...
  lessonTitleChinese: string; // e.g. "Bài 1: 语法基础"
  durationMinutes: number; // e.g. 10
  contentItemCount: number; // e.g. 5
  difficultyLevel: string; // e.g. "Sơ cấp" | "Trung cấp" | "Cao cấp" | "Trung cấp - Nâng cao"
  coreStructures: GrammarCoreStructure[];
  keyVocab: GrammarVocabItem[];
}
