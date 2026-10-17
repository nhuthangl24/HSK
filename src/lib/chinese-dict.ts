import { HskLevel } from '@/types/vocabulary';

export interface DictEntry {
  hanzi: string;
  pinyin: string;
  meaning: string;
  hskLevel?: HskLevel;
  partOfSpeech?: string;
  example?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
}

/**
 * Parses raw text pasted by user into Hanzi, Pinyin, Meaning, etc.
 * purely by syntax and regex (NO hardcoded mock dictionary).
 */
export function parseSmartPasteText(text: string): DictEntry {
  if (!text || !text.trim()) {
    return { hanzi: '', pinyin: '', meaning: '', hskLevel: 1 };
  }

  // Regex to match Chinese characters block
  const hanziMatch = text.match(/[\u4e00-\u9fa5]+/);
  const hanzi = hanziMatch ? hanziMatch[0] : '';

  // Split by common delimiters like /, -, :, tab, newline or brackets
  const parts = text.split(/[\/\-|:;\t\r\n\(\)\[\]]+/).map((s) => s.trim()).filter(Boolean);

  let pinyin = '';
  let meaning = '';

  for (const part of parts) {
    if (part === hanzi) continue;
    // Check if part looks like pinyin (contains tones or pure latin characters)
    if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(part) || /^[a-zA-Z\s:0-9]+$/.test(part)) {
      if (!pinyin && part.length < 50) {
        pinyin = part;
        continue;
      }
    }
    // Otherwise it's likely Vietnamese meaning
    if (!meaning) {
      meaning = part;
    }
  }

  return {
    hanzi: hanzi || (parts[0] || ''),
    pinyin,
    meaning,
    hskLevel: 1,
  };
}
