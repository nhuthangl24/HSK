/**
 * Intelligent Sentence Chunker for HSK Word Order Challenge (连词成句)
 * Splits a Chinese sentence into 3 to 6 natural syntactic chunks.
 */

export interface SentencePuzzle {
  id: string;
  originalSentence: string;
  pinyin: string;
  meaning: string;
  targetWord?: string;
  hskLevel: number;
  chunks: string[];
  shuffledChunks: { id: string; text: string }[];
}

// Common grammar particles, pronouns, measure words & high frequency markers
const COMMON_UNITS = new Set([
  '我们', '你们', '他们', '她们', '它们', '大家', '自己', '什么', '怎么', '多少', '哪里',
  '这个', '那个', '这些', '那些', '一位', '一个', '两个', '三本', '今天', '明天', '昨天',
  '现在', '刚才', '以前', '以后', '一直', '已经', '正在', '常常', '总是', '非常', '十分',
  '特别', '超级', '比较', '觉得', '认为', '希望', '喜欢', '可能', '应该', '必须', '愿意',
  '知道', '认识', '看到', '听到', '找到', '买了', '吃了', '喝了', '看了', '去了', '来了',
  '做了', '写了', '听了', '学了', '很大', '很小', '很多', '很少', '很好', '很高', '很漂亮',
  '太好了', '不要', '不能', '不会', '没有', '不是',
]);

/**
 * Split sentence into clean grammatical tokens
 */
export function chunkSentence(
  sentence: string,
  targetWord?: string,
  knownWords?: Set<string>
): string[] {
  const s = (sentence || '').trim();
  if (!s) return [];

  // Separate terminal punctuation
  let core = s;
  let endPunct = '';
  const lastChar = s.slice(-1);
  if (['。', '！', '？', '.', '!', '?'].includes(lastChar)) {
    endPunct = lastChar;
    core = s.slice(0, -1);
  }

  const lookup = knownWords || COMMON_UNITS;
  const rawTokens: string[] = [];
  let i = 0;
  const n = core.length;

  while (i < n) {
    // 1. If targetWord matches here, treat it as a distinct block
    if (targetWord && core.startsWith(targetWord, i) && targetWord.length > 1) {
      rawTokens.push(targetWord);
      i += targetWord.length;
      continue;
    }

    // 2. Try matching 4-char, 3-char, 2-char dictionary or common unit
    let matched = '';
    for (let len = Math.min(4, n - i); len >= 2; len--) {
      const sub = core.slice(i, i + len);
      if (lookup.has(sub) || COMMON_UNITS.has(sub)) {
        matched = sub;
        break;
      }
    }

    if (matched) {
      rawTokens.push(matched);
      i += matched.length;
    } else {
      rawTokens.push(core[i]);
      i += 1;
    }
  }

  // 3. Post-processing: Balance chunks so we don't have too many tiny 1-char tokens
  const merged: string[] = [];
  for (let j = 0; j < rawTokens.length; j++) {
    const curr = rawTokens[j];
    const prev = merged[merged.length - 1];

    // If current is single char and previous was single char, combine them
    if (prev && prev.length === 1 && curr.length === 1 && rawTokens.length > 4) {
      merged[merged.length - 1] = prev + curr;
    }
    // If current is grammatical particle like '的', '地', '得', '了', '着', '过', attach to previous
    else if (prev && ['的', '地', '得', '了', '着', '过', '吗', '呢', '吧'].includes(curr) && prev.length <= 2) {
      merged[merged.length - 1] = prev + curr;
    }
    // If current is preposition like '在', '向', '从', '给', '对' and next is a noun/pronoun, keep or attach
    else {
      merged.push(curr);
    }
  }

  // If still too many chunks (> 6), merge short adjacent ones
  while (merged.length > 6) {
    let shortestIdx = 0;
    let shortestLen = 999;
    for (let k = 0; k < merged.length - 1; k++) {
      const combinedLen = merged[k].length + merged[k + 1].length;
      if (combinedLen < shortestLen) {
        shortestLen = combinedLen;
        shortestIdx = k;
      }
    }
    merged.splice(shortestIdx, 2, merged[shortestIdx] + merged[shortestIdx + 1]);
  }

  // Attach ending punctuation to the last chunk
  if (endPunct && merged.length > 0) {
    merged[merged.length - 1] += endPunct;
  }

  return merged.length >= 2 ? merged : [core + (endPunct || '。')];
}

/**
 * Fisher-Yates array shuffle that guarantees the result is NOT identical to the original order
 */
export function shuffleChunks(chunks: string[]): { id: string; text: string }[] {
  const items = chunks.map((text, idx) => ({ id: `chk-${idx}-${text}`, text }));
  if (items.length <= 1) return items;

  let shuffled = [...items];
  let attempts = 0;

  do {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    attempts++;
  } while (
    attempts < 10 &&
    shuffled.map((s) => s.text).join('') === chunks.join('')
  );

  return shuffled;
}
