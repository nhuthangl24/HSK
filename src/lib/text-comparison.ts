/**
 * Intelligent Chinese sentence comparison and evaluation
 * Handles punctuation stripping, whitespace normalization, and fuzzy character matching
 */

// Common Chinese and Western punctuation to remove during comparison
const PUNCTUATION_REGEX = /[，。！？、“”‘’：；（）《》【】…—·\s.,!?'":;()\[\]]/g;

export interface TranslationComparisonResult {
  status: 'perfect' | 'close' | 'partial' | 'different' | 'empty';
  score: number; // 0 - 100
  feedback: string;
  userClean: string;
  referenceClean: string;
  missingChars: string[];
  extraChars: string[];
}

export function cleanChineseText(text: string): string {
  if (!text) return '';
  return text.replace(PUNCTUATION_REGEX, '').trim();
}

/**
 * Calculates Dice coefficient for character bigrams / unigrams
 */
export function calculateChineseSimilarity(str1: string, str2: string): number {
  const s1 = cleanChineseText(str1);
  const s2 = cleanChineseText(str2);

  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  // Count character frequencies
  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};

  for (const char of s1) {
    freq1[char] = (freq1[char] || 0) + 1;
  }
  for (const char of s2) {
    freq2[char] = (freq2[char] || 0) + 1;
  }

  let intersection = 0;
  for (const char in freq1) {
    if (freq2[char]) {
      intersection += Math.min(freq1[char], freq2[char]);
    }
  }

  // Levenshtein distance check for word order
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  const levSimilarity = Math.max(0, (maxLen - distance) / maxLen);

  // Char overlap similarity
  const charOverlap = (2 * intersection) / (s1.length + s2.length);

  // Weighted combo (60% character overlap, 40% sequence order)
  return 0.6 * charOverlap + 0.4 * levSimilarity;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function compareChineseTranslation(
  userInput: string,
  referenceSentence: string
): TranslationComparisonResult {
  const userClean = cleanChineseText(userInput);
  const refClean = cleanChineseText(referenceSentence);

  if (!userClean) {
    return {
      status: 'empty',
      score: 0,
      feedback: 'Chưa nhập câu dịch',
      userClean: '',
      referenceClean: refClean,
      missingChars: [],
      extraChars: [],
    };
  }

  // Exact match
  if (userClean === refClean) {
    return {
      status: 'perfect',
      score: 100,
      feedback: 'Xuất sắc! Dịch chính xác 100% so với câu mẫu.',
      userClean,
      referenceClean: refClean,
      missingChars: [],
      extraChars: [],
    };
  }

  const similarity = calculateChineseSimilarity(userClean, refClean);
  const score = Math.round(similarity * 100);

  // Find missing and extra characters
  const refChars = new Set(refClean.split(''));
  const userChars = new Set(userClean.split(''));

  const missingChars = [...refChars].filter((c) => !userChars.has(c));
  const extraChars = [...userChars].filter((c) => !refChars.has(c));

  if (score >= 85) {
    return {
      status: 'close',
      score,
      feedback: `Rất tốt (${score}%)! Bản dịch rất sát câu mẫu, chỉ khác một vài chữ hoặc trợ từ.`,
      userClean,
      referenceClean: refClean,
      missingChars,
      extraChars,
    };
  }

  if (score >= 60) {
    return {
      status: 'partial',
      score,
      feedback: `Khá (${score}%)! Bản dịch đúng một phần ý, hãy đối chiếu câu mẫu để hoàn thiện.`,
      userClean,
      referenceClean: refClean,
      missingChars,
      extraChars,
    };
  }

  return {
    status: 'different',
    score,
    feedback: `Chưa khớp (${score}%). Hãy nhấn xem đáp án để đối chiếu và ghi nhớ cấu trúc câu.`,
    userClean,
    referenceClean: refClean,
    missingChars,
    extraChars,
  };
}
