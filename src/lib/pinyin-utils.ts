// Pinyin vowel mappings with tone marks to base vowels
const PINYIN_TONE_MAP: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a',
  ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
  ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v', ü: 'v',
  Ā: 'A', Á: 'A', Ǎ: 'A', À: 'A',
  Ē: 'E', É: 'E', Ě: 'E', È: 'E',
  Ī: 'I', Í: 'I', Ǐ: 'I', Ì: 'I',
  Ō: 'O', Ó: 'O', Ǒ: 'O', Ò: 'O',
  Ū: 'U', Ú: 'U', Ǔ: 'U', Ù: 'U',
  Ǖ: 'V', Ǘ: 'V', Ǚ: 'V', Ǜ: 'V', Ü: 'V',
};

export function removePinyinTones(pinyin: string): string {
  if (!pinyin) return '';
  return pinyin
    .split('')
    .map((char) => PINYIN_TONE_MAP[char] || char)
    .join('');
}

export function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Checks if a search query matches a vocabulary item across:
 * - Hanzi (exact or substring)
 * - Pinyin (with tones, without tones, or partial)
 * - Vietnamese meaning (with or without accents)
 * - Example sentence (Hanzi or Vietnamese translation)
 */
export function matchesSearchQuery(
  item: {
    hanzi: string;
    pinyin: string;
    meaning: string;
    example?: string;
    exampleMeaning?: string;
  },
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const q = query.trim().toLowerCase();
  const qClean = normalizeVietnamese(removePinyinTones(q));

  // 1. Direct match on Hanzi
  if (item.hanzi.includes(q)) return true;

  // 2. Direct match on Pinyin
  if (item.pinyin.toLowerCase().includes(q)) return true;

  // 3. Match on tone-stripped Pinyin (e.g. searching "xuexi" matches "xuéxí")
  const pinyinStripped = removePinyinTones(item.pinyin).toLowerCase().replace(/\s+/g, '');
  const qStrippedNoSpace = qClean.replace(/\s+/g, '');
  if (pinyinStripped.includes(qStrippedNoSpace)) return true;

  // 4. Match on Vietnamese meaning (direct or accent-insensitive)
  if (item.meaning.toLowerCase().includes(q)) return true;
  const meaningNormalized = normalizeVietnamese(item.meaning.toLowerCase());
  if (meaningNormalized.includes(qClean)) return true;

  // 5. Example sentence match
  if (item.example && item.example.includes(q)) return true;
  if (
    item.exampleMeaning &&
    (item.exampleMeaning.toLowerCase().includes(q) ||
      normalizeVietnamese(item.exampleMeaning.toLowerCase()).includes(qClean))
  ) {
    return true;
  }

  return false;
}
