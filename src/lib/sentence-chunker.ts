/**
 * Intelligent Sentence Chunker for HSK Word Order Challenge (连词成句)
 * Splits a Chinese sentence into 3 to 6 natural syntactic chunks with Pinyin support.
 */

export interface ChunkToken {
  id: string;
  text: string;
  pinyin?: string;
}

export interface SentencePuzzle {
  id: string;
  originalSentence: string;
  pinyin: string;
  meaning: string;
  targetWord?: string;
  hskLevel: number;
  chunks: string[];
  shuffledChunks: ChunkToken[];
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

// High-frequency Pinyin dictionary for instant fallback
const FALLBACK_PINYIN: Record<string, string> = {
  的: 'de', 了: 'le', 吗: 'ma', 呢: 'ne', 吧: 'ba', 得: 'de', 地: 'de',
  着: 'zhe', 过: 'guo', 和: 'hé', 跟: 'gēn', 在: 'zài', 是: 'shì', 有: 'yǒu',
  不: 'bù', 没: 'méi', 很: 'hěn', 都: 'dōu', 也: 'yě', 就: 'jiù', 还: 'hái',
  我: 'wǒ', 你: 'nǐ', 他: 'tā', 她: 'tā', 它: 'tā', 们: 'men',
  这: 'zhè', 那: 'nà', 哪: 'nǎ', 谁: 'shéi', 什么: 'shénme', 怎么: 'zěnme',
  我们: 'wǒmen', 你们: 'nǐmen', 他们: 'tāmen', 她们: 'tāmen', 大家: 'dàjiā',
  大: 'dà', 小: 'xiǎo', 多: 'duō', 少: 'shǎo', 好: 'hǎo', 忙: 'máng', 累: 'lèi',
  吃: 'chī', 喝: 'hē', 看: 'kàn', 听: 'tīng', 说: 'shuō', 写: 'xiě', 读: 'dú',
  去: 'qù', 来: 'lái', 想: 'xiǎng', 要: 'yào', 能: 'néng', 会: 'huì', 可以: 'kěyǐ',
  做: 'zuò', 买: 'mǎi', 卖: 'mài', 走: 'zǒu', 跑: 'pǎo', 学: 'xué', 学习: 'xuéxí',
  今天: 'jīntiān', 明天: 'míngtiān', 昨天: 'zuótiān', 现在: 'xiànzài',
  一个: 'yí gè', 这个: 'zhè ge', 那个: 'nà ge', 一些: 'yìxiē', 一点: 'yìdiǎn',
  先生: 'xiānsheng', 小姐: 'xiǎojiě', 老师: 'lǎoshī', 学生: 'xuésheng', 朋友: 'péngyou',
  中国: 'zhōngguó', 汉语: 'hànyǔ', 中文: 'zhōngwén',
  太好了: 'tài hǎo le', 没有: 'méiyǒu', 不是: 'bú shì', 不要: 'bú yào', 不能: 'bù néng',
};

/**
 * Clean punctuation from chunk to get clean characters for Pinyin lookup
 */
export function cleanPunctuation(text: string): string {
  return (text || '').replace(/[。！？.,!?…\s\u3000]/g, '').trim();
}

/**
 * Compute Pinyin for a chunk using known word map
 */
export function getChunkPinyin(chunk: string, pinyinMap?: Map<string, string>): string {
  const clean = cleanPunctuation(chunk);
  if (!clean) return '';

  // 1. Direct word match in provided pinyinMap
  if (pinyinMap && pinyinMap.has(clean)) {
    return pinyinMap.get(clean)!;
  }

  // 2. Direct match in fallback
  if (FALLBACK_PINYIN[clean]) {
    return FALLBACK_PINYIN[clean];
  }

  // 3. Character by character lookup
  const parts: string[] = [];
  for (const char of clean) {
    if (pinyinMap && pinyinMap.has(char)) {
      parts.push(pinyinMap.get(char)!);
    } else if (FALLBACK_PINYIN[char]) {
      parts.push(FALLBACK_PINYIN[char]);
    } else {
      parts.push(char);
    }
  }
  return parts.join(' ');
}

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

    if (prev && prev.length === 1 && curr.length === 1 && rawTokens.length > 4) {
      merged[merged.length - 1] = prev + curr;
    } else if (
      prev &&
      ['的', '地', '得', '了', '着', '过', '吗', '呢', '吧'].includes(curr) &&
      prev.length <= 2
    ) {
      merged[merged.length - 1] = prev + curr;
    } else {
      merged.push(curr);
    }
  }

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
 * Fisher-Yates array shuffle with Pinyin annotation
 */
export function shuffleChunks(
  chunks: string[],
  pinyinMap?: Map<string, string>
): ChunkToken[] {
  const items: ChunkToken[] = chunks.map((text, idx) => ({
    id: `chk-${idx}-${text}`,
    text,
    pinyin: getChunkPinyin(text, pinyinMap),
  }));

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
