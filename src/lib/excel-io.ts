import * as XLSX from 'xlsx';
import { VocabItem, HskLevel } from '@/types/vocabulary';

export interface ImportPreviewResult {
  totalRows: number;
  validItems: Partial<VocabItem>[];
  duplicates: {
    existing: VocabItem;
    incoming: Partial<VocabItem>;
  }[];
  newItems: Partial<VocabItem>[];
  detectedColumns: Record<string, string>;
  errors: string[];
}

export type DuplicateHandling = 'skip' | 'overwrite' | 'keep_both';

export const SAMPLE_TEMPLATE_ROWS = [
  {
    STT: 1,
    'Cấp HSK': 'HSK 1',
    'Từ mới (Chữ Hán)': '爱',
    'Phiên âm': 'ài',
    'Nghĩa tiếng Việt': 'Yêu, thương, yêu thích',
    'Ví dụ (Chữ Hán)': '爸爸爱妈妈。',
    'Phiên âm ví dụ': 'Bàba ài māma.',
    'Dịch câu ví dụ': 'Bố yêu mẹ.',
    'Ghi chú': 'Từ vựng HSK 1 cơ bản',
  },
  {
    STT: 2,
    'Cấp HSK': 'HSK 1',
    'Từ mới (Chữ Hán)': '八',
    'Phiên âm': 'bā',
    'Nghĩa tiếng Việt': 'Số tám (8)',
    'Ví dụ (Chữ Hán)': '他买了八个苹果。',
    'Phiên âm ví dụ': 'Tā mǎile bā gè píngguǒ.',
    'Dịch câu ví dụ': 'Anh ấy đã mua 8 quả táo.',
    'Ghi chú': 'Số từ',
  },
  {
    STT: 3,
    'Cấp HSK': 'HSK 1',
    'Từ mới (Chữ Hán)': '爸爸',
    'Phiên âm': 'bàba',
    'Nghĩa tiếng Việt': 'Bố, ba, cha',
    'Ví dụ (Chữ Hán)': '我爸爸是医生。',
    'Phiên âm ví dụ': 'Wǒ bàba shì yīshēng.',
    'Dịch câu ví dụ': 'Bố tôi là bác sĩ.',
    'Ghi chú': 'Danh từ xưng hô',
  },
  {
    STT: 4,
    'Cấp HSK': 'HSK 1',
    'Từ mới (Chữ Hán)': '喝',
    'Phiên âm': 'hē',
    'Nghĩa tiếng Việt': 'Uống',
    'Ví dụ (Chữ Hán)': '我想喝水。',
    'Phiên âm ví dụ': 'Wǒ xiǎng hē shuǐ.',
    'Dịch câu ví dụ': 'Tôi muốn uống nước.',
    'Ghi chú': 'Động từ',
  },
  {
    STT: 5,
    'Cấp HSK': 'HSK 2',
    'Từ mới (Chữ Hán)': '安排',
    'Phiên âm': 'ānpái',
    'Nghĩa tiếng Việt': 'Sắp xếp, bố trí',
    'Ví dụ (Chữ Hán)': '我已经安排好了明天的会议。',
    'Phiên âm ví dụ': 'Wǒ yǐjīng ānpái hǎole míngtiān de huìyì.',
    'Dịch câu ví dụ': 'Tôi đã sắp xếp xong cuộc họp ngày mai.',
    'Ghi chú': 'Từ vựng HSK 2',
  },
];

/**
 * Downloads a ready-to-use sample spreadsheet template in XLSX or CSV format
 */
export function downloadSampleTemplate(format: 'xlsx' | 'csv' = 'xlsx'): void {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 10 }, // Cấp HSK
    { wch: 20 }, // Từ mới (Chữ Hán)
    { wch: 16 }, // Phiên âm
    { wch: 26 }, // Nghĩa tiếng Việt
    { wch: 32 }, // Ví dụ (Chữ Hán)
    { wch: 32 }, // Phiên âm ví dụ
    { wch: 32 }, // Dịch câu ví dụ
    { wch: 20 }, // Ghi chú
  ];

  const filename = `Mau_Nhap_Tu_Vung_HSK.${format}`;

  if (format === 'xlsx') {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauNhapTuVung');
    XLSX.writeFile(workbook, filename);
  } else {
    // Generate CSV with UTF-8 BOM so Excel opens it with proper diacritics & Hanzi
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Normalizes column header names to detect mapped fields
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\s\(\)\[\]]+/g, '');
}

/**
 * Detects mapping from spreadsheet headers to VocabItem fields
 */
export function detectHeaderMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const h of headers) {
    const norm = normalizeHeader(h);
    
    // Check specific/compound headers first to avoid false partial matches
    if (
      norm.includes('phienamvidu') ||
      norm.includes('examplepinyin') ||
      norm.includes('pinyinvividu') ||
      norm.includes('pinyincau') ||
      (norm.includes('pinyin') && norm.includes('vidu'))
    ) {
      mapping['examplePinyin'] = h;
    } else if (
      norm.includes('dichcau') ||
      norm.includes('dichvidu') ||
      norm.includes('dich') ||
      norm.includes('examplemeaning') ||
      norm.includes('nghiavidu') ||
      norm.includes('translation') ||
      (norm.includes('nghia') && norm.includes('vidu'))
    ) {
      mapping['exampleMeaning'] = h;
    } else if (
      norm.includes('viduchuhan') ||
      norm.includes('cauvidu') ||
      norm.includes('vidu') ||
      norm.includes('example') ||
      norm.includes('sentence')
    ) {
      mapping['example'] = h;
    } else if (
      norm.includes('phienam') ||
      norm.includes('pinyin') ||
      norm.includes('binham') ||
      norm.includes('phatam') ||
      norm.includes('pronunciation')
    ) {
      mapping['pinyin'] = h;
    } else if (
      norm.includes('nghiatiengviet') ||
      norm.includes('nghia') ||
      norm.includes('meaning') ||
      norm.includes('giainghia') ||
      norm.includes('definition') ||
      norm.includes('vietnamese')
    ) {
      mapping['meaning'] = h;
    } else if (
      norm.includes('caphsk') ||
      norm.includes('hsklevel') ||
      norm.includes('hsk') ||
      norm.includes('capdo') ||
      norm.includes('level')
    ) {
      mapping['hskLevel'] = h;
    } else if (
      norm.includes('tumoi') ||
      norm.includes('chuhan') ||
      norm.includes('hantu') ||
      norm.includes('hanzi') ||
      norm.includes('chinese') ||
      norm === 'tu' ||
      norm === 'word'
    ) {
      mapping['hanzi'] = h;
    } else if (
      norm.includes('ghichu') ||
      norm.includes('note') ||
      norm.includes('notes')
    ) {
      mapping['notes'] = h;
    }
  }

  return mapping;
}

/**
 * Parses XLSX or CSV file and compares with existing deck items for duplicates
 */
export async function parseImportFile(
  file: File,
  existingItems: VocabItem[],
  defaultDeckId: string,
  defaultHskLevel: HskLevel = 1
): Promise<ImportPreviewResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
  });

  if (jsonData.length === 0) {
    return {
      totalRows: 0,
      validItems: [],
      duplicates: [],
      newItems: [],
      detectedColumns: {},
      errors: ['Tệp rỗng hoặc không có dữ liệu hợp lệ.'],
    };
  }

  const rawHeaders = Object.keys(jsonData[0]);
  const mapping = detectHeaderMapping(rawHeaders);

  // Fallback heuristic if mapping didn't find hanzi: look for column containing Chinese characters
  if (!mapping['hanzi']) {
    for (const h of rawHeaders) {
      const sample = String(jsonData[0][h] || '');
      if (/[\u4e00-\u9fa5]/.test(sample)) {
        mapping['hanzi'] = h;
        break;
      }
    }
  }

  const validItems: Partial<VocabItem>[] = [];
  const errors: string[] = [];

  const existingByHanzi = new Map<string, VocabItem>();
  for (const item of existingItems) {
    existingByHanzi.set(item.hanzi.trim(), item);
  }

  const duplicates: { existing: VocabItem; incoming: Partial<VocabItem> }[] = [];
  const newItems: Partial<VocabItem>[] = [];

  jsonData.forEach((row) => {
    const hanziCol = mapping['hanzi'] || rawHeaders[1] || rawHeaders[0];
    const hanziVal = String(row[hanziCol] || '').trim();

    if (!hanziVal) {
      return; // Skip empty rows
    }

    const pinyinCol = mapping['pinyin'];
    const meaningCol = mapping['meaning'];
    const exampleCol = mapping['example'];
    const exPinyinCol = mapping['examplePinyin'];
    const exMeaningCol = mapping['exampleMeaning'];
    const notesCol = mapping['notes'];
    const hskCol = mapping['hskLevel'];

    let parsedHsk: HskLevel = defaultHskLevel;
    if (hskCol && row[hskCol]) {
      const num = parseInt(String(row[hskCol]).replace(/\D/g, ''), 10);
      if (num >= 1 && num <= 9) {
        parsedHsk = num as HskLevel;
      }
    }

    const partialItem: Partial<VocabItem> = {
      deckId: defaultDeckId,
      hskLevel: parsedHsk,
      hanzi: hanziVal,
      pinyin: pinyinCol ? String(row[pinyinCol] || '').trim() : '',
      meaning: meaningCol ? String(row[meaningCol] || '').trim() : '',
      example: exampleCol ? String(row[exampleCol] || '').trim() : '',
      examplePinyin: exPinyinCol ? String(row[exPinyinCol] || '').trim() : '',
      exampleMeaning: exMeaningCol ? String(row[exMeaningCol] || '').trim() : '',
      notes: notesCol ? String(row[notesCol] || '').trim() : '',
      hanziStatus: 'unlearned',
      translationStatus: 'unanswered',
    };

    validItems.push(partialItem);

    if (existingByHanzi.has(hanziVal)) {
      duplicates.push({
        existing: existingByHanzi.get(hanziVal)!,
        incoming: partialItem,
      });
    } else {
      newItems.push(partialItem);
    }
  });

  return {
    totalRows: jsonData.length,
    validItems,
    duplicates,
    newItems,
    detectedColumns: mapping,
    errors,
  };
}

/**
 * Exports vocabulary items to XLSX or CSV format
 */
export function exportVocabulary(
  items: VocabItem[],
  deckName: string,
  format: 'xlsx' | 'csv'
): void {
  const exportRows = items.map((item, index) => ({
    STT: index + 1,
    'Cấp HSK': `HSK ${item.hskLevel}`,
    'Từ mới (Chữ Hán)': item.hanzi,
    'Phiên âm': item.pinyin,
    'Nghĩa tiếng Việt': item.meaning,
    'Ôn tập chữ Hán': item.hanziPracticeInput || '',
    'Kết quả chữ Hán':
      item.hanziStatus === 'correct'
        ? 'Đúng'
        : item.hanziStatus === 'wrong'
        ? 'Sai'
        : item.hanziStatus === 'uncertain'
        ? 'Chưa chắc'
        : 'Chưa học',
    'Ví dụ (Chữ Hán)': item.example || '',
    'Phiên âm ví dụ': item.examplePinyin || '',
    'Dịch câu ví dụ': item.exampleMeaning || '',
    'Tập dịch': item.translationPracticeInput || '',
    'Kết quả dịch':
      item.translationStatus === 'correct'
        ? 'Đúng'
        : item.translationStatus === 'review'
        ? 'Cần xem lại'
        : 'Chưa làm',
    'Hạn ôn tập (SRS)': item.srs.dueDate || '',
    'Lần nhớ liên tiếp': item.srs.repetition || 0,
    'Ghi chú': item.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Set explicit column widths for spreadsheet view
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 10 }, // HSK
    { wch: 14 }, // Từ mới
    { wch: 18 }, // Phiên âm
    { wch: 25 }, // Nghĩa
    { wch: 16 }, // Ôn chữ Hán
    { wch: 15 }, // Kết quả chữ Hán
    { wch: 32 }, // Ví dụ
    { wch: 32 }, // Phiên âm ví dụ
    { wch: 32 }, // Dịch ví dụ
    { wch: 32 }, // Tập dịch
    { wch: 15 }, // Kết quả dịch
    { wch: 14 }, // Hạn ôn
    { wch: 16 }, // Lần nhớ
    { wch: 20 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Từ vựng tiếng Trung');

  const safeDeckName = deckName.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${safeDeckName}_${dateStr}.${format}`;

  if (format === 'xlsx') {
    XLSX.writeFile(workbook, filename);
  } else {
    // Generate CSV with UTF-8 BOM so Excel opens it with proper diacritics & Hanzi
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
