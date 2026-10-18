'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Printer,
  Download,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Grid,
  Palette,
  Layers,
  Settings2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sun,
  Moon,
  FileText,
  Share2,
  Sliders,
  AlignJustify,
  CheckCircle2,
  Search,
  Eye,
  LayoutList,
  PenLine,
  HelpCircle,
  ExternalLink,
  Shuffle,
  GraduationCap,
  Sparkle,
} from 'lucide-react';
import { VocabItem } from '@/types/vocabulary';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';

// Google Fonts for Authentic Chinese Calligraphy
const GOOGLE_CALLIGRAPHY_FONT_URL =
  'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;600;700&family=Ma+Shan+Zheng&display=swap';

// -------------------------------------------------------------
// Type Definitions
// -------------------------------------------------------------
export interface WorksheetWordItem {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  hskLevel: number;
}

interface PracticeRow {
  id: string;
  hanzi: string;
  wordHanzi: string;
  pinyin: string;
  meaning: string;
  hskLevel: number;
  lineIndex: number;
  totalLines: number;
  isFollowUpLine: boolean;
  isBlank: boolean;
}

export type GridStyleType = 'mi' | 'tian' | 'hui' | 'kou';
export type GridColorType = 'red' | 'gray' | 'emerald' | 'blue' | 'amber' | 'purple';
export type FontStyleType = 'wenkai' | 'serif' | 'sans' | 'mashan';
export type TraceCountType = 0 | 1 | 2 | 3 | 5 | 'all';
export type TraceOpacityType = 'light' | 'medium' | 'dark';
export type CanvasThemeType = 'dark' | 'light' | 'paper';

interface GridColorConfig {
  id: GridColorType;
  name: string;
  main: string;
  border: string;
  cross: string;
  sub: string;
  bg: string;
  pinyinColor: string;
  pinyinLine: string;
  accentBg: string;
}

const COLOR_CONFIGS: Record<GridColorType, GridColorConfig> = {
  red: {
    id: 'red',
    name: '🏮 Chu Sa Đỏ (Cinnabar Red)',
    main: '#b91c1c',
    border: '#dc2626',
    cross: '#ef4444',
    sub: '#fca5a5',
    bg: '#fff5f5',
    pinyinColor: '#991b1b',
    pinyinLine: '#f87171',
    accentBg: 'rgba(220, 38, 38, 0.08)',
  },
  gray: {
    id: 'gray',
    name: '🖋️ Mực Đen Thư Pháp (Ink Eco)',
    main: '#1e293b',
    border: '#475569',
    cross: '#64748b',
    sub: '#cbd5e1',
    bg: '#f8fafc',
    pinyinColor: '#0f172a',
    pinyinLine: '#94a3b8',
    accentBg: 'rgba(71, 85, 105, 0.08)',
  },
  emerald: {
    id: 'emerald',
    name: '🍃 Lục Bảo Thạch (Emerald Jade)',
    main: '#047857',
    border: '#059669',
    cross: '#10b981',
    sub: '#a7f3d0',
    bg: '#f0fdf4',
    pinyinColor: '#065f46',
    pinyinLine: '#34d399',
    accentBg: 'rgba(5, 150, 105, 0.08)',
  },
  blue: {
    id: 'blue',
    name: '🌊 Lam Ngọc Học Đường (Sapphire)',
    main: '#1d4ed8',
    border: '#2563eb',
    cross: '#3b82f6',
    sub: '#bfdbfe',
    bg: '#eff6ff',
    pinyinColor: '#1e40af',
    pinyinLine: '#60a5fa',
    accentBg: 'rgba(37, 99, 235, 0.08)',
  },
  amber: {
    id: 'amber',
    name: '🌾 Hoàng Cúc Cổ Trang (Amber Gold)',
    main: '#b45309',
    border: '#d97706',
    cross: '#f59e0b',
    sub: '#fde68a',
    bg: '#fffbeb',
    pinyinColor: '#92400e',
    pinyinLine: '#fbbf24',
    accentBg: 'rgba(217, 119, 6, 0.08)',
  },
  purple: {
    id: 'purple',
    name: '🟣 Tử Sa Cung Đình (Royal Violet)',
    main: '#6d28d9',
    border: '#7c3aed',
    cross: '#8b5cf6',
    sub: '#ddd6fe',
    bg: '#faf5ff',
    pinyinColor: '#5b21b6',
    pinyinLine: '#a78bfa',
    accentBg: 'rgba(124, 58, 237, 0.08)',
  },
};

const FONT_FAMILIES: Record<FontStyleType, { name: string; style: string; badge: string }> = {
  wenkai: {
    name: 'LXGW WenKai (Khải Thư Giáo Trình)',
    style: '"LXGW WenKai TC", "LXGW WenKai", "STKaiti", "KaiTi", serif',
    badge: 'Chuẩn Sách',
  },
  mashan: {
    name: 'Ma Shan Zheng (Thư Pháp Bút Lông)',
    style: '"Ma Shan Zheng", "Kaiti", cursive, serif',
    badge: 'Nghệ Thuật',
  },
  serif: {
    name: 'Noto Serif SC (Tống Thể Cổ Điển)',
    style: '"Noto Serif SC", "SimSun", "Songti SC", serif',
    badge: 'In Ấn',
  },
  sans: {
    name: 'Noto Sans SC (Hắc Thể Hiện Đại)',
    style: '"Noto Sans SC", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    badge: 'Hiện Đại',
  },
};

// -------------------------------------------------------------
// Quick Curated Presets
// -------------------------------------------------------------
interface PresetTemplate {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: string;
  gridStyle: GridStyleType;
  color: GridColorType;
  font: FontStyleType;
  rowsPerPage: number;
  traceCount: TraceCountType;
  traceOpacity: TraceOpacityType;
  showPinyinGuide: boolean;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'classic-red',
    title: '🏮 Mễ Điền Chu Sa (Kinh Điển)',
    subtitle: 'Luyện viết nét cân đối theo chuẩn ô Mễ điền truyền thống',
    tag: 'Khuyên Dùng',
    icon: '🏮',
    gridStyle: 'mi',
    color: 'red',
    font: 'wenkai',
    rowsPerPage: 12,
    traceCount: 2,
    traceOpacity: 'medium',
    showPinyinGuide: false,
  },
  {
    id: 'ink-eco',
    title: '🖋️ Điền Tự Mực Đen (Tiết Kiệm)',
    subtitle: 'Lưới Điền tự 4 ô vuông, thanh thoát, tối ưu mực in tại nhà',
    tag: 'Tiết Kiệm',
    icon: '🖋️',
    gridStyle: 'tian',
    color: 'gray',
    font: 'wenkai',
    rowsPerPage: 12,
    traceCount: 2,
    traceOpacity: 'light',
    showPinyinGuide: false,
  },
  {
    id: 'pinyin-primary',
    title: '🎒 Vở Kẻ Tứ Tuyến Pinyin (Nhập Môn)',
    subtitle: 'Kèm dòng kẻ Pinyin 4 dòng (四线三格) chuẩn cấp 1 luyện thanh điệu',
    tag: 'Học Sinh',
    icon: '🎒',
    gridStyle: 'tian',
    color: 'emerald',
    font: 'wenkai',
    rowsPerPage: 10,
    traceCount: 3,
    traceOpacity: 'medium',
    showPinyinGuide: true,
  },
  {
    id: 'intensive-cram',
    title: '⚡ Siêu Dày Ôn Thi (16 Dòng)',
    subtitle: 'Mật độ 16 dòng tối đa từ vựng cho kỳ thi HSK sắp tới',
    tag: 'Nhiều Từ',
    icon: '⚡',
    gridStyle: 'hui',
    color: 'blue',
    font: 'sans',
    rowsPerPage: 16,
    traceCount: 1,
    traceOpacity: 'light',
    showPinyinGuide: false,
  },
  {
    id: 'single-page-drill',
    title: '📜 Thâm Canh 1 Chữ (Cả Trang A4)',
    subtitle: 'Lặp lại 1 chữ Hán khó trên toàn bộ trang để khắc sâu trí nhớ cơ bắp',
    tag: 'Chuyên Sâu',
    icon: '📜',
    gridStyle: 'mi',
    color: 'purple',
    font: 'wenkai',
    rowsPerPage: 12,
    traceCount: 3,
    traceOpacity: 'medium',
    showPinyinGuide: false,
  },
];

// Curated Word Snippets for 1-Click Injection
const QUICK_SNIPPETS = [
  {
    name: 'HSK 1: Giao Tiếp Chào Hỏi',
    text: '你好 | nǐhǎo | Xin chào\n谢谢 | xièxie | Cảm ơn\n不客气 | bú kèqi | Đừng khách sáo\n对不起 | duìbuqǐ | Xin lỗi\n没关系 | méi guānxi | Không sao đâu\n再见 | zàijiàn | Tạm biệt',
  },
  {
    name: 'HSK 2: Sinh Hoạt Gia Đình',
    text: '爸爸 | bàba | Bố\n妈妈 | māma | Mẹ\n吃饭 | chīfàn | Ăn cơm\n喝水 | hēshuǐ | Uống nước\n睡觉 | shuìjiào | Đi ngủ\n学习 | xuéxí | Học tập',
  },
  {
    name: 'HSK 3: Du Lịch & Khám Phá',
    text: '旅游 | lǚyóu | Du lịch\n机场 | jīchǎng | Sân bay\n宾馆 | bīnguǎn | Khách sạn\n热情 | rèqíng | Nhiệt tình\n打算 | dǎsuàn | Dự định\n环境 | huánjìng | Môi trường',
  },
  {
    name: 'Thành Ngữ 4 Chữ (成语)',
    text: '一心一意 | yì xīn yí yì | Một lòng một dạ\n马到成功 | mǎ dào chéng gōng | Mã đáo thành công\n自强不息 | zì qiáng bù xī | Tự lực tự cường\n风调雨顺 | fēng tiáo yǔ shùn | Mưa thuận gió hòa\n温故知新 | wēn gù zhī xīn | Ôn cũ biết mới\n精益求精 | jīng yì qiú jīng | Đã tốt càng tốt hơn',
  },
  {
    name: 'Thơ Đường: Tĩnh Dạ Tứ (Lý Bạch)',
    text: '床前明月光 | chuáng qián míng yuè guāng | Đầu giường ánh trăng rọi\n疑是地上霜 | yí shì dì shàng shuāng | Ngỡ là sương trên mặt đất\n举头望明月 | jǔ tóu wàng míng yuè | Ngẩng đầu nhìn trăng sáng\n低头思故乡 | dī tóu sī gù xiāng | Cúi đầu nhớ quê hương',
  },
];

// -------------------------------------------------------------
// Vector Hanzi Grid Component (SVG with Crisp vectorEffect)
// -------------------------------------------------------------
const HanziGridSvg = React.memo(function HanziGridSvg({
  style,
  colorConfig,
  showPinyinGuide,
}: {
  style: GridStyleType;
  colorConfig: GridColorConfig;
  showPinyinGuide?: boolean;
}) {
  return (
    <div className="absolute inset-0 w-full h-full flex flex-col pointer-events-none select-none">
      {/* Optional Top 4-line Pinyin Guideline (四线三格) */}
      {showPinyinGuide && (
        <svg
          className="w-full shrink-0"
          style={{ height: '24%' }}
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
        >
          {/* 4 horizontal lines forming 3 spaces */}
          <line
            x1="0"
            y1="2"
            x2="100"
            y2="2"
            stroke={colorConfig.pinyinLine}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            y1="9"
            x2="100"
            y2="9"
            stroke={colorConfig.pinyinLine}
            strokeWidth="0.9"
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            y1="16"
            x2="100"
            y2="16"
            stroke={colorConfig.pinyinLine}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            y1="23"
            x2="100"
            y2="23"
            stroke={colorConfig.pinyinLine}
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {/* Main Hanzi Character Box */}
      <div className="relative flex-1 w-full">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Outer Square Border */}
          <rect
            x="1"
            y="1"
            width="98"
            height="98"
            fill="none"
            stroke={colorConfig.border}
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Cross Center Lines (+) for 'mi' and 'tian' */}
          {(style === 'mi' || style === 'tian') && (
            <>
              <line
                x1="0"
                y1="50"
                x2="100"
                y2="50"
                stroke={colorConfig.cross}
                strokeWidth="1.2"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="50"
                y1="0"
                x2="50"
                y2="100"
                stroke={colorConfig.cross}
                strokeWidth="1.2"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {/* Diagonal Lines (X) ONLY for 'mi' (米字格) */}
          {style === 'mi' && (
            <>
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke={colorConfig.sub}
                strokeWidth="1.1"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="100"
                y1="0"
                x2="0"
                y2="100"
                stroke={colorConfig.sub}
                strokeWidth="1.1"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {/* Inner Concentric Square for 'hui' (回字格) */}
          {style === 'hui' && (
            <rect
              x="26"
              y="26"
              width="48"
              height="48"
              fill="none"
              stroke={colorConfig.cross}
              strokeWidth="1.3"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
    </div>
  );
});

// -------------------------------------------------------------
// Main Worksheet Studio Component
// -------------------------------------------------------------
function WorksheetStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { effectiveTheme } = useTheme();

  // Canvas State & View
  const [zoomLevel, setZoomLevel] = useState<number>(85); // 50 to 125%
  const [canvasViewMode, setCanvasViewMode] = useState<'single' | 'continuous'>('single');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [canvasTheme, setCanvasTheme] = useState<CanvasThemeType>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'source' | 'style' | 'layout' | 'header'>('source');

  // 1. Vocabulary Source & Scope
  const [sourceType, setSourceType] = useState<'custom' | 'hsk' | 'single'>('custom');
  const [customInput, setCustomInput] = useState<string>(
    '你好 | nǐhǎo | Xin chào\n谢谢 | xièxie | Cảm ơn\n再见 | zàijiàn | Tạm biệt\n学习 | xuéxí | Học tập\n朋友 | péngyou | Bạn bè\n中国 | zhōngguó | Trung Quốc'
  );
  const [singleWordInput, setSingleWordInput] = useState<string>('爱');
  const [singleWordRepeat, setSingleWordRepeat] = useState<number | 'full_page'>('full_page');
  const [selectedHskLevel, setSelectedHskLevel] = useState<number>(1);
  const [hskSearchQuery, setHskSearchQuery] = useState<string>('');
  const [selectedHskWords, setSelectedHskWords] = useState<VocabItem[]>([]);
  const [hskDeckItems, setHskDeckItems] = useState<VocabItem[]>([]);
  const [isLoadingVocab, setIsLoadingVocab] = useState<boolean>(false);

  // 2. Practice Grid & Style
  const [gridStyle, setGridStyle] = useState<GridStyleType>('mi');
  const [gridColorTheme, setGridColorTheme] = useState<GridColorType>('red');
  const [fontFamily, setFontFamily] = useState<FontStyleType>('wenkai');
  const [showPinyinGuide, setShowPinyinGuide] = useState<boolean>(false);

  // 3. Layout & Density
  const [rowsPerPage, setRowsPerPage] = useState<number>(12); // 10, 12, 14, 16
  const [cellsPerRow, setCellsPerRow] = useState<number>(12); // 10, 12, 14
  const [traceCount, setTraceCount] = useState<TraceCountType>(2);
  const [traceOpacity, setTraceOpacity] = useState<TraceOpacityType>('medium');
  const [practiceMode, setPracticeMode] = useState<'character' | 'word'>('character');
  const [fillBlankRows, setFillBlankRows] = useState<boolean>(true);

  // 4. Header & Annotations
  const [worksheetTitle, setWorksheetTitle] = useState<string>('PHIẾU TẬP VIẾT CHỮ HÁN');
  const [worksheetSubtitle, setWorksheetSubtitle] = useState<string>(
    'Luyện viết theo chuẩn ô Mễ điền (米字格) • Nét Khải thư tiêu chuẩn'
  );
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showMeaning, setShowMeaning] = useState<boolean>(true);
  const [showHskLevel, setShowHskLevel] = useState<boolean>(true);
  const [showStudentInfo, setShowStudentInfo] = useState<boolean>(true);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-adapt canvas backdrop to system theme initially
  useEffect(() => {
    if (effectiveTheme === 'dark') {
      setCanvasTheme('dark');
    } else {
      setCanvasTheme('light');
    }
  }, [effectiveTheme]);

  // Load Vocab items from API for dictionary lookup and HSK decks
  useEffect(() => {
    let isMounted = true;
    setIsLoadingVocab(true);
    fetch('/api/vocab')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.items)) {
          setHskDeckItems(data.items);
        }
      })
      .catch((err) => {
        console.warn('Could not load online vocab bank, fallback to local text:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingVocab(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Quick dictionary lookup map for auto-enriching Pinyin & Vietnamese meaning
  const vocabLookupMap = useMemo(() => {
    const map = new Map<string, VocabItem>();
    hskDeckItems.forEach((item) => {
      if (item.hanzi) {
        map.set(item.hanzi.trim(), item);
      }
    });
    return map;
  }, [hskDeckItems]);

  // Handle URL Query Params (?word=... or ?level=...)
  useEffect(() => {
    const wordParam = searchParams.get('word') || searchParams.get('char');
    const levelParam = searchParams.get('level');
    const titleParam = searchParams.get('title');

    if (wordParam) {
      const decodedWord = decodeURIComponent(wordParam).trim();
      setSourceType('single');
      setSingleWordInput(decodedWord);
      setWorksheetTitle(`PHIẾU TẬP VIẾT CHỮ —「${decodedWord}」`);
      setWorksheetSubtitle(`Luyện viết chuyên sâu chữ Hán 「${decodedWord}」• Khổ A4`);
    } else if (levelParam) {
      const lvl = parseInt(levelParam, 10);
      if (lvl >= 1 && lvl <= 6) {
        setSelectedHskLevel(lvl);
        setSourceType('hsk');
        setWorksheetTitle(`PHIẾU TẬP VIẾT HSK ${lvl}`);
      }
    }

    if (titleParam) {
      setWorksheetTitle(decodeURIComponent(titleParam));
    }
  }, [searchParams]);

  // Filter HSK words by level and search query
  const filteredHskLevelWords = useMemo(() => {
    let list = hskDeckItems.filter((i) => i.hskLevel === selectedHskLevel);
    if (hskSearchQuery.trim()) {
      const q = hskSearchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.hanzi.includes(q) ||
          i.pinyin.toLowerCase().includes(q) ||
          i.meaning.toLowerCase().includes(q)
      );
    }
    return list;
  }, [hskDeckItems, selectedHskLevel, hskSearchQuery]);

  // Parse custom text input into structured items
  const parsedCustomItems = useMemo<WorksheetWordItem[]>(() => {
    if (!customInput.trim()) return [];
    const lines = customInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const result: WorksheetWordItem[] = [];

    lines.forEach((line, lineIdx) => {
      if (line.includes('|') || line.includes('\t') || line.includes(';') || line.includes(' - ')) {
        const parts = line.split(/[|\t;]|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
        const hanzi = parts[0] || '';
        let pinyin = parts[1] || '';
        let meaning = parts[2] || '';

        // Auto lookup
        if (hanzi && (!pinyin || !meaning)) {
          const match = vocabLookupMap.get(hanzi);
          if (match) {
            if (!pinyin) pinyin = match.pinyin;
            if (!meaning) meaning = match.meaning;
          }
        }

        if (hanzi) {
          result.push({
            id: `custom-${lineIdx}-${hanzi}`,
            hanzi,
            pinyin,
            meaning,
            hskLevel: 1,
          });
        }
      } else {
        const tokens = line.split(/[\s,，、]+/).map((t) => t.trim()).filter(Boolean);
        tokens.forEach((token, tIdx) => {
          let pinyin = '';
          let meaning = '';
          const match = vocabLookupMap.get(token);
          if (match) {
            pinyin = match.pinyin;
            meaning = match.meaning;
          }
          result.push({
            id: `custom-${lineIdx}-${tIdx}-${token}`,
            hanzi: token,
            pinyin,
            meaning,
            hskLevel: match?.hskLevel || 1,
          });
        });
      }
    });

    return result;
  }, [customInput, vocabLookupMap]);

  // Target Words depending on active source
  const targetWords = useMemo<WorksheetWordItem[]>(() => {
    if (sourceType === 'single') {
      const char = singleWordInput.trim() || '爱';
      const match = vocabLookupMap.get(char);
      return [
        {
          id: `single-${char}`,
          hanzi: char,
          pinyin: match?.pinyin || '',
          meaning: match?.meaning || '',
          hskLevel: match?.hskLevel || 1,
        },
      ];
    }

    if (sourceType === 'hsk') {
      if (selectedHskWords.length > 0) {
        return selectedHskWords.map((i) => ({
          id: i.id,
          hanzi: i.hanzi,
          pinyin: i.pinyin,
          meaning: i.meaning,
          hskLevel: i.hskLevel,
        }));
      }
      // If none selected, default to first 24 words of level
      return filteredHskLevelWords.slice(0, 24).map((i) => ({
        id: i.id,
        hanzi: i.hanzi,
        pinyin: i.pinyin,
        meaning: i.meaning,
        hskLevel: i.hskLevel,
      }));
    }

    return parsedCustomItems;
  }, [
    sourceType,
    singleWordInput,
    vocabLookupMap,
    selectedHskWords,
    filteredHskLevelWords,
    parsedCustomItems,
  ]);

  // Expand Target Words into Practice Rows
  const practiceRows = useMemo(() => {
    const rows: PracticeRow[] = [];

    targetWords.forEach((item) => {
      let chars: string[] = [];
      if (practiceMode === 'word') {
        chars = [item.hanzi];
      } else {
        const extracted = Array.from(item.hanzi).filter((c) =>
          /[\u4e00-\u9fa5\u3400-\u4dbf]/.test(c)
        );
        chars = extracted.length > 0 ? extracted : [item.hanzi];
      }

      chars.forEach((char, charIdx) => {
        const repeatCount =
          sourceType === 'single'
            ? singleWordRepeat === 'full_page'
              ? rowsPerPage
              : Number(singleWordRepeat)
            : 1;

        for (let line = 1; line <= repeatCount; line++) {
          rows.push({
            id: `${item.id}-char-${charIdx}-line-${line}`,
            hanzi: char,
            wordHanzi: item.hanzi,
            pinyin: item.pinyin,
            meaning: item.meaning,
            hskLevel: item.hskLevel,
            lineIndex: line,
            totalLines: repeatCount,
            isFollowUpLine: line > 1,
            isBlank: false,
          });
        }
      });
    });

    return rows;
  }, [targetWords, practiceMode, sourceType, singleWordRepeat, rowsPerPage]);

  // Split Rows into A4 Pages
  const pages = useMemo(() => {
    const p: PracticeRow[][] = [];
    for (let i = 0; i < practiceRows.length; i += rowsPerPage) {
      const slice = practiceRows.slice(i, i + rowsPerPage);

      if (fillBlankRows && slice.length < rowsPerPage) {
        const missing = rowsPerPage - slice.length;
        const filled = [...slice];
        for (let k = 0; k < missing; k++) {
          filled.push({
            id: `blank-${i}-${k}`,
            hanzi: '',
            wordHanzi: '',
            pinyin: '',
            meaning: '',
            hskLevel: 0,
            lineIndex: 1,
            totalLines: 1,
            isFollowUpLine: false,
            isBlank: true,
          });
        }
        p.push(filled);
      } else {
        p.push(slice);
      }
    }

    return p.length > 0 ? p : [[]];
  }, [practiceRows, rowsPerPage, fillBlankRows]);

  // Keep active page within bounds
  const clampedPageIndex = Math.min(Math.max(0, activePageIndex), Math.max(0, pages.length - 1));

  // Current Color Config
  const currentColorConfig = COLOR_CONFIGS[gridColorTheme];
  const currentFontFamily = FONT_FAMILIES[fontFamily];

  // Dynamic Scale and Sizing Config
  const sizeConfig = useMemo(() => {
    switch (rowsPerPage) {
      case 10:
        return {
          previewCellPx: 46,
          previewFontClass: 'text-2xl',
          printCellPx: 48,
          printFontClass: 'text-3xl',
          metaWidth: 'w-24',
          metaFontSize: 'text-xs',
          cellPadding: 'py-1.5',
        };
      case 14:
        return {
          previewCellPx: 33,
          previewFontClass: 'text-lg',
          printCellPx: 37,
          printFontClass: 'text-xl',
          metaWidth: 'w-20',
          metaFontSize: 'text-[10px]',
          cellPadding: 'py-0.5',
        };
      case 16:
        return {
          previewCellPx: 29,
          previewFontClass: 'text-base',
          printCellPx: 33,
          printFontClass: 'text-lg',
          metaWidth: 'w-18',
          metaFontSize: 'text-[9px]',
          cellPadding: 'py-0.5',
        };
      case 12:
      default:
        return {
          previewCellPx: 39,
          previewFontClass: 'text-xl',
          printCellPx: 42,
          printFontClass: 'text-2xl',
          metaWidth: 'w-22',
          metaFontSize: 'text-[11px]',
          cellPadding: 'py-1',
        };
    }
  }, [rowsPerPage]);

  // Opacity styles for tracing cells
  const traceOpacityStyle = useMemo(() => {
    switch (traceOpacity) {
      case 'light':
        return { color: '#cbd5e1' }; // 25%
      case 'dark':
        return { color: '#64748b' }; // 65%
      case 'medium':
      default:
        return { color: '#94a3b8' }; // 45%
    }
  }, [traceOpacity]);

  // Calculated Trace Cell Count per row
  const actualTraceCount = useMemo(() => {
    if (traceCount === 'all') return cellsPerRow - 1;
    return Math.min(Number(traceCount), cellsPerRow - 1);
  }, [traceCount, cellsPerRow]);

  // Apply Preset Template
  const applyPreset = useCallback(
    (preset: PresetTemplate) => {
      setGridStyle(preset.gridStyle);
      setGridColorTheme(preset.color);
      setFontFamily(preset.font);
      setRowsPerPage(preset.rowsPerPage);
      setTraceCount(preset.traceCount);
      setTraceOpacity(preset.traceOpacity);
      setShowPinyinGuide(preset.showPinyinGuide);

      if (preset.id === 'single-page-drill') {
        setSourceType('single');
        setSingleWordRepeat('full_page');
      }

      toast.success(`Đã áp dụng mẫu: ${preset.title}`);
    },
    [toast]
  );

  // Trigger Print Engine
  const handlePrint = useCallback(() => {
    if (practiceRows.length === 0) {
      toast.warning('Không có từ vựng nào để in phiếu!');
      return;
    }
    document.body.classList.add('worksheet-printing');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('worksheet-printing');
    }, 1500);
  }, [practiceRows, toast]);

  // Copy Shareable Link to Clipboard
  const handleCopyShareLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    let url = `${origin}/worksheet?theme=${gridColorTheme}&grid=${gridStyle}&rows=${rowsPerPage}`;

    if (sourceType === 'single') {
      url += `&word=${encodeURIComponent(singleWordInput.trim())}`;
    } else if (sourceType === 'hsk') {
      url += `&level=${selectedHskLevel}`;
    }

    navigator.clipboard.writeText(url).then(() => {
      toast.success('Đã sao chép liên kết thiết kế vào bộ nhớ tạm!');
    });
  }, [gridColorTheme, gridStyle, rowsPerPage, sourceType, singleWordInput, selectedHskLevel, toast]);

  // Randomize HSK selection
  const handleRandomizeHsk = (count: number) => {
    const list = [...filteredHskLevelWords];
    const shuffled = list.sort(() => 0.5 - Math.random());
    setSelectedHskWords(shuffled.slice(0, count));
    toast.info(`Đã chọn ngẫu nhiên ${count} từ HSK ${selectedHskLevel}`);
  };

  return (
    <>
      {/* Inject Google Calligraphy Fonts */}
      <link rel="stylesheet" href={GOOGLE_CALLIGRAPHY_FONT_URL} />

      <div
        className={`w-full h-screen flex flex-col overflow-hidden transition-colors duration-300 no-print select-none ${
          canvasTheme === 'dark'
            ? 'bg-[#0b0f19] text-slate-100'
            : canvasTheme === 'paper'
            ? 'bg-[#f6f2e9] text-amber-950'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        {/* =========================================================================
            TOP STUDIO NAVIGATION & TOOLBAR
           ========================================================================= */}
        <header
          className={`h-14 sm:h-16 px-3 sm:px-5 border-b flex items-center justify-between gap-3 shrink-0 z-30 transition-colors ${
            canvasTheme === 'dark'
              ? 'bg-[#111827]/90 border-slate-800 text-white backdrop-blur-md'
              : canvasTheme === 'paper'
              ? 'bg-[#fcf9f2] border-amber-200/80 text-amber-950 shadow-2xs'
              : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs backdrop-blur-md'
          }`}
        >
          {/* Left: Back & Brand */}
          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
            <Link
              href="/"
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all ${
                canvasTheme === 'dark'
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
              title="Quay lại bảng từ vựng HSK"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Bảng HSK</span>
            </Link>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div
                style={{ backgroundColor: currentColorConfig.border }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-red-500/10 shrink-0"
              >
                <PenLine size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-sm font-black tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                    <span>XƯỞNG PHIẾU VIẾT</span>
                    <span
                      style={{
                        backgroundColor: currentColorConfig.accentBg,
                        color: currentColorConfig.border,
                      }}
                      className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md border border-current/20 hidden md:inline"
                    >
                      A4 Studio
                    </span>
                  </h1>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden lg:block leading-none mt-0.5">
                  Tập viết Hán tự • Mễ Điền / Điền Tự / Hồi Tự • PDF Vector
                </p>
              </div>
            </div>
          </div>

          {/* Center: Presets Quick Pills (Hidden on small mobile) */}
          <div className="hidden xl:flex items-center gap-1.5 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-300/40 dark:border-slate-700/50">
            {PRESET_TEMPLATES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  gridStyle === preset.gridStyle && gridColorTheme === preset.color
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{preset.icon}</span>
                <span>{preset.title.split(' ')[1]}</span>
              </button>
            ))}
          </div>

          {/* Right: Controls & Print CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="hidden md:flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCanvasViewMode('single')}
                className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                  canvasViewMode === 'single'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Xem từng trang A4"
              >
                Trang đơn
              </button>
              <button
                type="button"
                onClick={() => setCanvasViewMode('continuous')}
                className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                  canvasViewMode === 'continuous'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Xem cuộn liên tục tất cả các trang"
              >
                Cuộn dọc
              </button>
            </div>

            {/* Canvas Backdrop Mode Switcher */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCanvasTheme('dark')}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  canvasTheme === 'dark'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
                title="Phông nền Canvas Tối"
              >
                <Moon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCanvasTheme('paper')}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  canvasTheme === 'paper'
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Phông nền Giấy Tuyên Ấm Áp"
              >
                <Sun size={14} className="text-amber-500" />
              </button>
            </div>

            {/* Share Link Button */}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className={`p-2 rounded-xl border transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-semibold ${
                canvasTheme === 'dark'
                  ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Chia sẻ liên kết thiết kế phiếu viết"
            >
              <Share2 size={14} />
              <span className="hidden lg:inline">Chia sẻ</span>
            </button>

            {/* Primary Action Button: IN PHIẾU NGAY (A4 PRINT) */}
            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: currentColorConfig.border,
                boxShadow: `0 4px 14px ${currentColorConfig.border}40`,
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:brightness-110 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all shrink-0"
              title="Xuất phiếu ra khổ giấy A4 hoặc lưu thành tệp PDF"
            >
              <Printer size={16} />
              <span>In Phiếu / PDF</span>
              <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-full font-extrabold hidden sm:inline">
                {pages.length} trang
              </span>
            </button>
          </div>
        </header>

        {/* =========================================================================
            MAIN WORKSPACE: TWO-PANE LAYOUT (LEFT CONTROLS, RIGHT A4 CANVAS)
           ========================================================================= */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* =====================================================================
              LEFT INSPECTOR PANEL (STUDIO CONTROLS)
             ===================================================================== */}
          <aside
            className={`w-full sm:w-[410px] lg:w-[430px] border-r flex flex-col shrink-0 z-20 transition-all duration-300 ${
              canvasTheme === 'dark'
                ? 'bg-[#111827] border-slate-800 text-slate-200'
                : canvasTheme === 'paper'
                ? 'bg-[#faf6ee] border-amber-200/80 text-amber-950'
                : 'bg-white border-slate-200 text-slate-900'
            } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute h-full sm:relative'}`}
          >
            {/* Inspector Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-3 pt-2 gap-1 overflow-x-auto scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'source'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <BookOpen size={14} />
                <span>Từ vựng</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {targetWords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('style')}
                className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'style'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Grid size={14} />
                <span>Ô & Màu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('layout')}
                className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'layout'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Layers size={14} />
                <span>Bố cục & Nét</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('header')}
                className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'header'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Settings2 size={14} />
                <span>Tiêu đề</span>
              </button>
            </div>

            {/* Inspector Tab Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
              {/* -------------------------------------------------------------
                  TAB 1: VOCABULARY SOURCE
                 ------------------------------------------------------------- */}
              {activeTab === 'source' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Source Type Selector */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setSourceType('custom')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-center cursor-pointer transition-all ${
                        sourceType === 'custom'
                          ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Tự soạn
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceType('hsk')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-center cursor-pointer transition-all ${
                        sourceType === 'hsk'
                          ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Kho HSK 1–6
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceType('single')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-center cursor-pointer transition-all ${
                        sourceType === 'single'
                          ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      1 Chữ khó
                    </button>
                  </div>

                  {/* Sub-mode A: CUSTOM RAW INPUT */}
                  {sourceType === 'custom' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Nhập danh sách chữ Hán:
                        </label>
                        <button
                          type="button"
                          onClick={() => setCustomInput('')}
                          className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Xóa hết</span>
                        </button>
                      </div>

                      <div className="relative">
                        <textarea
                          rows={7}
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder="Nhập: 汉字 | pinyin | nghĩa&#10;Hoặc dán chữ Hán cách nhau bằng dấu cách/dòng..."
                          className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-y leading-relaxed text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>
                          Đã phát hiện: <strong>{parsedCustomItems.length} từ</strong>
                        </span>
                        <span className="italic text-slate-400">
                          Hỗ trợ: `chữ | pinyin | nghĩa`
                        </span>
                      </div>

                      {/* Quick Presets Dropdown/Pills */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                          Mẫu từ vựng nạp nhanh:
                        </label>
                        <div className="space-y-1.5">
                          {QUICK_SNIPPETS.map((snippet, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCustomInput(snippet.text);
                                toast.info(`Đã nạp: ${snippet.name}`);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-500/50 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <span>{snippet.name}</span>
                              <Plus size={13} className="text-slate-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-mode B: HSK DECKS 1-6 */}
                  {sourceType === 'hsk' && (
                    <div className="space-y-3">
                      {/* Level Selector Pills */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          Chọn Cấp độ HSK:
                        </label>
                        <div className="grid grid-cols-6 gap-1">
                          {[1, 2, 3, 4, 5, 6].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => {
                                setSelectedHskLevel(lvl);
                                setSelectedHskWords([]);
                              }}
                              className={`py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                                selectedHskLevel === lvl
                                  ? 'bg-red-600 border-red-600 text-white shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                              }`}
                            >
                              HSK {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Randomizer & Batch Selection Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRandomizeHsk(12)}
                          className="flex-1 py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300"
                        >
                          <Shuffle size={12} />
                          <span>Ngẫu nhiên 12 từ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRandomizeHsk(24)}
                          className="flex-1 py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300"
                        >
                          <Shuffle size={12} />
                          <span>Ngẫu nhiên 24 từ</span>
                        </button>
                      </div>

                      {/* Search in Selected Level */}
                      <div className="relative">
                        <Search
                          size={13}
                          className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={hskSearchQuery}
                          onChange={(e) => setHskSearchQuery(e.target.value)}
                          placeholder={`Tìm trong ${filteredHskLevelWords.length} từ HSK ${selectedHskLevel}...`}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>

                      {/* Words Chips Grid */}
                      <div className="max-h-52 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 grid grid-cols-3 gap-1 scrollbar-thin">
                        {filteredHskLevelWords.slice(0, 90).map((word) => {
                          const isSelected = selectedHskWords.some((w) => w.id === word.id);
                          return (
                            <button
                              key={word.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedHskWords(
                                    selectedHskWords.filter((w) => w.id !== word.id)
                                  );
                                } else {
                                  setSelectedHskWords([...selectedHskWords, word]);
                                }
                              }}
                              className={`p-1.5 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <div className="font-hanzi font-bold text-sm truncate leading-tight">
                                {word.hanzi}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                                {word.pinyin}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {selectedHskWords.length > 0
                          ? `Đã chọn tay: ${selectedHskWords.length} từ`
                          : `Tự động đưa vào 24 từ đầu tiên của HSK ${selectedHskLevel}`}
                      </div>
                    </div>
                  )}

                  {/* Sub-mode C: SINGLE WORD / CHARACTER DRILL */}
                  {sourceType === 'single' && (
                    <div className="space-y-3.5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Nhập chữ Hán cần luyện chuyên sâu:
                        </label>
                        <input
                          type="text"
                          value={singleWordInput}
                          onChange={(e) => setSingleWordInput(e.target.value)}
                          placeholder="Vd: 爱 hoặc 学习"
                          className="w-full px-3 py-2 text-xl font-hanzi font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          Số dòng lặp lại cho chữ này:
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: '1 dòng', val: 1 },
                            { label: '2 dòng', val: 2 },
                            { label: '3 dòng', val: 3 },
                            { label: 'Cả trang', val: 'full_page' },
                          ].map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setSingleWordRepeat(opt.val as any)}
                              className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                                singleWordRepeat === opt.val
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        💡 <strong>Mẹo luyện thư pháp:</strong> Chọn chế độ <em>Cả trang</em> để
                        luyện lặp đi lặp lại một chữ khó, giúp bàn tay hình thành phản xạ nét mực
                        tự nhiên.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 2: GRID STYLES & COLOR PALETTE
                 ------------------------------------------------------------- */}
              {activeTab === 'style' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Grid Style Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Kiểu Khung Kẻ Truyền Thống:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'mi' as GridStyleType,
                          name: '米字格 (Mễ Điền)',
                          desc: '8 tam giác, nét chữ thập & 2 đường chéo',
                        },
                        {
                          id: 'tian' as GridStyleType,
                          name: '田字格 (Điền Tự)',
                          desc: '4 ô vuông chữ thập, chuẩn SGK',
                        },
                        {
                          id: 'hui' as GridStyleType,
                          name: '回字格 (Hồi Tự)',
                          desc: 'Khung vuông lồng khung vuông',
                        },
                        {
                          id: 'kou' as GridStyleType,
                          name: '口字格 (Phương Cách)',
                          desc: 'Khung vuông mở, không nét phân chia',
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGridStyle(item.id)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            gridStyle === item.id
                              ? 'border-red-500 bg-red-50/70 dark:bg-red-950/40 text-red-950 dark:text-red-200 ring-2 ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">{item.name}</span>
                            {gridStyle === item.id && (
                              <CheckCircle2 size={14} className="text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                            {item.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4-Line Pinyin Guide (四线三格) Toggle */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Dòng kẻ Pinyin 4 dòng (四线三格)
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Thêm dòng kẻ phía trên mỗi ô chữ để luyện viết Pinyin
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showPinyinGuide}
                      onChange={(e) => setShowPinyinGuide(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded cursor-pointer accent-red-600"
                    />
                  </div>

                  {/* Color Palettes */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Bảng Màu Mực Truyền Thống:
                    </label>
                    <div className="space-y-1.5">
                      {Object.values(COLOR_CONFIGS).map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setGridColorTheme(color.id)}
                          className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                            gridColorTheme === color.id
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 ring-2 ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              style={{ backgroundColor: color.border }}
                              className="w-6 h-6 rounded-lg shadow-xs flex items-center justify-center text-white"
                            >
                              <div
                                style={{ backgroundColor: color.cross }}
                                className="w-2.5 h-2.5 rounded-xs"
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {color.name}
                            </span>
                          </div>
                          {gridColorTheme === color.id && (
                            <Check size={14} className="text-red-600 dark:text-red-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Typography Font Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Phông Chữ Chữ Hán:
                    </label>
                    <div className="space-y-1.5">
                      {(Object.keys(FONT_FAMILIES) as FontStyleType[]).map((fKey) => {
                        const font = FONT_FAMILIES[fKey];
                        return (
                          <button
                            key={fKey}
                            type="button"
                            onClick={() => setFontFamily(fKey)}
                            className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                              fontFamily === fKey
                                ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 ring-2 ring-red-500/20'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">{font.name}</div>
                              <div
                                className="text-base text-slate-900 dark:text-white mt-0.5"
                                style={{ fontFamily: font.style }}
                              >
                                学而时习之，不亦说乎
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {font.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 3: LAYOUT & TRACING SETTINGS
                 ------------------------------------------------------------- */}
              {activeTab === 'layout' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Rows Density per Page */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Mật độ dòng trên mỗi trang A4:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { rows: 10, label: '10 dòng', sub: 'Ô lớn' },
                        { rows: 12, label: '12 dòng', sub: 'Tiêu chuẩn' },
                        { rows: 14, label: '14 dòng', sub: 'Trung bình' },
                        { rows: 16, label: '16 dòng', sub: 'Siêu dày' },
                      ].map((item) => (
                        <button
                          key={item.rows}
                          type="button"
                          onClick={() => setRowsPerPage(item.rows)}
                          className={`py-2 px-1 rounded-xl text-center border cursor-pointer transition-all ${
                            rowsPerPage === item.rows
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-xs">{item.label}</div>
                          <div className="text-[9.5px] opacity-75">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Practice Cells per Row */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Số ô luyện viết trên mỗi hàng:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { count: 10, label: '10 ô / hàng' },
                        { count: 12, label: '12 ô (Chuẩn A4)' },
                        { count: 14, label: '14 ô (Nhiều ô)' },
                      ].map((item) => (
                        <button
                          key={item.count}
                          type="button"
                          onClick={() => setCellsPerRow(item.count)}
                          className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                            cellsPerRow === item.count
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trace Count Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Số ô tô nét mờ (Watermark tracing):
                    </label>
                    <div className="grid grid-cols-6 gap-1">
                      {[
                        { val: 0, label: '0 ô' },
                        { val: 1, label: '1 ô' },
                        { val: 2, label: '2 ô' },
                        { val: 3, label: '3 ô' },
                        { val: 5, label: '5 ô' },
                        { val: 'all', label: 'Cả hàng' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setTraceCount(item.val as any)}
                          className={`py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                            traceCount === item.val
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trace Opacity */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Độ đậm của nét chữ tô mờ:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 'light', label: 'Mờ nhạt (25%)' },
                        { val: 'medium', label: 'Vừa phải (45%)' },
                        { val: 'dark', label: 'Đậm nét (65%)' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setTraceOpacity(item.val as any)}
                          className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                            traceOpacity === item.val
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Practice Mode: Character vs Word */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Chế độ tách từ ghép:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPracticeMode('character')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          practiceMode === 'character'
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="text-xs">Tách từng chữ đơn</div>
                        <div className="text-[10px] opacity-75 font-normal">
                          VD: 你好 thành 2 dòng (你, 好)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPracticeMode('word')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          practiceMode === 'word'
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="text-xs">Giữ nguyên cả từ</div>
                        <div className="text-[10px] opacity-75 font-normal">
                          VD: 你好 trên cùng 1 hàng
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Fill Blank Rows Toggle */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Tự động điền đầy trang cuối
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Thêm các dòng ô trống vào trang cuối để bố cục không bị hẫng
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={fillBlankRows}
                      onChange={(e) => setFillBlankRows(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded cursor-pointer accent-red-600"
                    />
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 4: HEADER & METADATA SETTINGS
                 ------------------------------------------------------------- */}
              {activeTab === 'header' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Custom Worksheet Title */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Tiêu đề phiếu in:
                    </label>
                    <input
                      type="text"
                      value={worksheetTitle}
                      onChange={(e) => setWorksheetTitle(e.target.value)}
                      placeholder="PHIẾU TẬP VIẾT CHỮ HÁN"
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  {/* Custom Subtitle */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Phụ đề / Ghi chú phương pháp:
                    </label>
                    <input
                      type="text"
                      value={worksheetSubtitle}
                      onChange={(e) => setWorksheetSubtitle(e.target.value)}
                      placeholder="Luyện viết theo chuẩn ô Mễ điền (米字格)..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Các yếu tố hiển thị trên phiếu:
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Phiên âm Pinyin (拼音)
                      </span>
                      <input
                        type="checkbox"
                        checked={showPinyin}
                        onChange={(e) => setShowPinyin(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded cursor-pointer accent-red-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Nghĩa tiếng Việt
                      </span>
                      <input
                        type="checkbox"
                        checked={showMeaning}
                        onChange={(e) => setShowMeaning(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded cursor-pointer accent-red-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
                      <span className="text-xs text-slate-700 dark:text-slate-300">Cấp độ HSK</span>
                      <input
                        type="checkbox"
                        checked={showHskLevel}
                        onChange={(e) => setShowHskLevel(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded cursor-pointer accent-red-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Thanh thông tin Học viên (Họ tên, Ngày, Điểm)
                      </span>
                      <input
                        type="checkbox"
                        checked={showStudentInfo}
                        onChange={(e) => setShowStudentInfo(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded cursor-pointer accent-red-600"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Stats */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <div className="flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" />
                <span>
                  <strong>{pages.length}</strong> trang A4 • <strong>{practiceRows.length}</strong> dòng
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                In ngay →
              </button>
            </div>
          </aside>

          {/* =====================================================================
              CENTER / RIGHT LIVE A4 CANVAS WORKSPACE
             ===================================================================== */}
          <main
            ref={canvasRef}
            className="flex-1 overflow-y-auto overflow-x-auto relative flex flex-col items-center justify-start p-4 sm:p-8"
            style={{
              backgroundImage:
                canvasTheme === 'dark'
                  ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
                  : canvasTheme === 'paper'
                  ? 'radial-gradient(rgba(180, 83, 9, 0.12) 1px, transparent 1px)'
                  : 'radial-gradient(rgba(100, 116, 139, 0.15) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* Floating Floating Canvas Controls (Zoom, Fit, Page Switcher) */}
            <div className="sticky top-2 z-20 mb-6 flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-1.5 backdrop-blur-md text-xs">
              {/* Page Switcher in Single Page Mode */}
              {canvasViewMode === 'single' && (
                <>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={clampedPageIndex <= 0}
                      onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Trang trước"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span className="font-bold text-slate-800 dark:text-slate-200 px-1 whitespace-nowrap">
                      Trang {clampedPageIndex + 1} / {pages.length}
                    </span>

                    <button
                      type="button"
                      disabled={clampedPageIndex >= pages.length - 1}
                      onClick={() =>
                        setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))
                      }
                      className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Trang tiếp theo"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                </>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={15} />
                </button>

                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 w-11 text-center select-none">
                  {zoomLevel}%
                </span>

                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setZoomLevel(85)}
                  className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                  title="Đặt lại mức hiển thị vừa mắt"
                >
                  Chuẩn
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              {/* Quick Print Trigger */}
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs"
                style={{ backgroundColor: currentColorConfig.border }}
              >
                <Printer size={13} />
                <span>In trang</span>
              </button>
            </div>

            {/* =================================================================
                ACTUAL PHYSICAL A4 PAPER SHEETS
               ================================================================= */}
            <div
              className="flex flex-col items-center gap-10 transition-transform origin-top duration-200 pb-16"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
              }}
            >
              {/* In Single Page Mode, render ONLY the active page. In Continuous Mode, render all pages */}
              {(canvasViewMode === 'single'
                ? [
                    {
                      pageRows: pages[clampedPageIndex] || [],
                      pageNumber: clampedPageIndex + 1,
                    },
                  ]
                : pages.map((pageRows, idx) => ({ pageRows, pageNumber: idx + 1 }))
              ).map(({ pageRows, pageNumber }) => (
                <div
                  key={`a4-page-${pageNumber}`}
                  className="w-[210mm] min-h-[297mm] bg-white text-slate-950 p-[12mm] rounded-xs relative flex flex-col justify-between shadow-2xl transition-all duration-300 select-text"
                  style={{
                    boxShadow:
                      '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                    fontFamily: currentFontFamily.style,
                  }}
                >
                  {/* Top Header of Worksheet */}
                  <div>
                    {/* Main Title & Subtitle */}
                    <div className="text-center pb-2 border-b-2 border-slate-900 mb-2.5">
                      <h2 className="text-base font-black tracking-widest uppercase text-slate-950 font-serif">
                        {worksheetTitle}
                      </h2>
                      {worksheetSubtitle && (
                        <p className="text-[10.5px] text-slate-600 mt-0.5 tracking-wide">
                          {worksheetSubtitle}
                        </p>
                      )}
                    </div>

                    {/* Student Info Bar */}
                    {showStudentInfo && (
                      <div className="flex items-center justify-between text-[11px] font-serif text-slate-700 pb-1.5 mb-2 border-b border-dashed border-slate-300">
                        <div>
                          <span>Học viên: </span>
                          <span className="font-semibold text-slate-900">
                            ...........................................................................
                          </span>
                        </div>
                        <div>
                          <span>Lớp / Ngày: </span>
                          <span className="font-semibold text-slate-900">..../..../202...</span>
                        </div>
                        <div>
                          <span>Điểm: </span>
                          <span className="font-semibold text-slate-900">........</span>
                        </div>
                      </div>
                    )}

                    {/* Character Practice Rows Table */}
                    <div className="space-y-1 mt-1 flex flex-col justify-between">
                      {pageRows.map((row) => (
                        <div
                          key={row.id}
                          className={`flex items-center gap-2 ${sizeConfig.cellPadding} border-b border-slate-100 last:border-b-0`}
                        >
                          {/* Word Meta Information Box (Pinyin, Meaning, Level) */}
                          <div className={`${sizeConfig.metaWidth} shrink-0 text-left`}>
                            {row.isBlank ? (
                              <div className="text-[9.5px] text-slate-300 italic">Tự luyện</div>
                            ) : row.isFollowUpLine ? (
                              <div className="text-[9.5px] text-slate-400 font-medium italic">
                                Dòng {row.lineIndex}
                              </div>
                            ) : (
                              <>
                                {showPinyin && (
                                  <div
                                    style={{ color: currentColorConfig.pinyinColor }}
                                    className="font-bold text-xs leading-none truncate"
                                  >
                                    {row.pinyin}
                                  </div>
                                )}
                                {showMeaning && (
                                  <div className="text-[9.5px] text-slate-600 leading-tight line-clamp-1 mt-0.5">
                                    {row.meaning}
                                  </div>
                                )}
                                {showHskLevel && (
                                  <div className="text-[8.5px] font-bold text-slate-400 mt-0.5">
                                    HSK {row.hskLevel}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Practice Grid Cells Row */}
                          <div className="flex items-center gap-0.5 overflow-hidden">
                            {/* 1. Model Bold Hanzi Cell (First cell) */}
                            {!row.isBlank ? (
                              <div
                                style={{
                                  width: `${sizeConfig.previewCellPx}px`,
                                  height: `${sizeConfig.previewCellPx}px`,
                                }}
                                className="relative shrink-0 flex items-center justify-center bg-white"
                              >
                                <HanziGridSvg
                                  style={gridStyle}
                                  colorConfig={currentColorConfig}
                                  showPinyinGuide={showPinyinGuide}
                                />
                                <span
                                  className={`relative z-10 font-bold ${sizeConfig.previewFontClass} text-slate-950 leading-none`}
                                  style={{ fontFamily: currentFontFamily.style }}
                                >
                                  {row.hanzi}
                                </span>
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: `${sizeConfig.previewCellPx}px`,
                                  height: `${sizeConfig.previewCellPx}px`,
                                }}
                                className="relative shrink-0 flex items-center justify-center bg-white"
                              >
                                <HanziGridSvg
                                  style={gridStyle}
                                  colorConfig={currentColorConfig}
                                  showPinyinGuide={showPinyinGuide}
                                />
                              </div>
                            )}

                            {/* 2. Faint Trace Cells (For tracing over) */}
                            {!row.isBlank &&
                              Array.from({ length: actualTraceCount }).map((_, tIdx) => (
                                <div
                                  key={`trace-${tIdx}`}
                                  style={{
                                    width: `${sizeConfig.previewCellPx}px`,
                                    height: `${sizeConfig.previewCellPx}px`,
                                  }}
                                  className="relative shrink-0 flex items-center justify-center bg-white"
                                >
                                  <HanziGridSvg
                                    style={gridStyle}
                                    colorConfig={currentColorConfig}
                                    showPinyinGuide={showPinyinGuide}
                                  />
                                  <span
                                    className={`relative z-10 ${sizeConfig.previewFontClass} select-none leading-none`}
                                    style={{
                                      fontFamily: currentFontFamily.style,
                                      ...traceOpacityStyle,
                                    }}
                                  >
                                    {row.hanzi}
                                  </span>
                                </div>
                              ))}

                            {/* 3. Empty Cells for Free Hand Practice */}
                            {Array.from({
                              length: row.isBlank
                                ? cellsPerRow - 1
                                : Math.max(1, cellsPerRow - 1 - actualTraceCount),
                            }).map((_, eIdx) => (
                              <div
                                key={`empty-${eIdx}`}
                                style={{
                                  width: `${sizeConfig.previewCellPx}px`,
                                  height: `${sizeConfig.previewCellPx}px`,
                                }}
                                className="relative shrink-0 flex items-center justify-center bg-white"
                              >
                                <HanziGridSvg
                                  style={gridStyle}
                                  colorConfig={currentColorConfig}
                                  showPinyinGuide={showPinyinGuide}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Worksheet Page Footer */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-sans">
                    <span>
                      HSK Master • Nền tảng học tiếng Trung ({gridStyle.toUpperCase()} •{' '}
                      {currentColorConfig.name.split(' ')[1]})
                    </span>
                    <span>
                      Trang {pageNumber} / {pages.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* =========================================================================
          HIGH-RESOLUTION PRINT DOM TREE (Exclusively active on window.print())
         ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white z-[999999] m-0 p-0 text-slate-900 font-sans hanzi-worksheet-printable">
        {pages.map((pageRows, pageIdx) => (
          <div
            key={`print-page-${pageIdx}`}
            className="w-full bg-white text-slate-900 p-8 relative flex flex-col justify-between hanzi-print-page"
            style={{
              minHeight: '282mm',
              pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'avoid',
              breakAfter: pageIdx < pages.length - 1 ? 'page' : 'avoid',
              fontFamily: currentFontFamily.style,
            }}
          >
            <div>
              {/* Header */}
              <div className="text-center pb-2.5 border-b-2 border-slate-950 mb-3">
                <h2 className="text-base font-black tracking-wider uppercase text-slate-950 font-serif">
                  {worksheetTitle}
                </h2>
                {worksheetSubtitle && (
                  <p className="text-[11px] text-slate-600 mt-0.5 tracking-wide">
                    {worksheetSubtitle}
                  </p>
                )}
              </div>

              {/* Student Metadata */}
              {showStudentInfo && (
                <div className="flex items-center justify-between text-xs font-serif text-slate-700 pb-2 mb-2.5 border-b border-dashed border-slate-400">
                  <div>
                    <span>Học viên: </span>
                    <span className="font-semibold text-slate-900">
                      ...........................................................................
                    </span>
                  </div>
                  <div>
                    <span>Lớp / Ngày: </span>
                    <span className="font-semibold text-slate-900">..../..../202...</span>
                  </div>
                  <div>
                    <span>Điểm: </span>
                    <span className="font-semibold text-slate-900">........</span>
                  </div>
                </div>
              )}

              {/* Rows */}
              <div className="space-y-1 mt-1 flex flex-col justify-between">
                {pageRows.map((row) => (
                  <div
                    key={`print-${row.id}`}
                    className={`flex items-center gap-2 ${sizeConfig.cellPadding} border-b border-slate-100 last:border-b-0`}
                  >
                    {/* Meta */}
                    <div className={`${sizeConfig.metaWidth} shrink-0 text-left`}>
                      {row.isBlank ? (
                        <div className="text-[9.5px] text-slate-300 italic">Tự luyện</div>
                      ) : row.isFollowUpLine ? (
                        <div className="text-[9.5px] text-slate-400 font-medium italic">
                          Dòng {row.lineIndex}
                        </div>
                      ) : (
                        <>
                          {showPinyin && (
                            <div
                              style={{ color: currentColorConfig.pinyinColor }}
                              className="font-bold text-xs leading-none truncate"
                            >
                              {row.pinyin}
                            </div>
                          )}
                          {showMeaning && (
                            <div className="text-[9.5px] text-slate-600 leading-tight line-clamp-1 mt-0.5">
                              {row.meaning}
                            </div>
                          )}
                          {showHskLevel && (
                            <div className="text-[8.5px] font-bold text-slate-400 mt-0.5">
                              HSK {row.hskLevel}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Grids */}
                    <div className="flex items-center gap-0.5 overflow-hidden">
                      {/* Model */}
                      {!row.isBlank ? (
                        <div
                          style={{
                            width: `${sizeConfig.printCellPx}px`,
                            height: `${sizeConfig.printCellPx}px`,
                          }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <HanziGridSvg
                            style={gridStyle}
                            colorConfig={currentColorConfig}
                            showPinyinGuide={showPinyinGuide}
                          />
                          <span
                            className={`relative z-10 font-bold ${sizeConfig.printFontClass} text-slate-950 leading-none`}
                            style={{ fontFamily: currentFontFamily.style }}
                          >
                            {row.hanzi}
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: `${sizeConfig.printCellPx}px`,
                            height: `${sizeConfig.printCellPx}px`,
                          }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <HanziGridSvg
                            style={gridStyle}
                            colorConfig={currentColorConfig}
                            showPinyinGuide={showPinyinGuide}
                          />
                        </div>
                      )}

                      {/* Traces */}
                      {!row.isBlank &&
                        Array.from({ length: actualTraceCount }).map((_, tIdx) => (
                          <div
                            key={`print-trace-${tIdx}`}
                            style={{
                              width: `${sizeConfig.printCellPx}px`,
                              height: `${sizeConfig.printCellPx}px`,
                            }}
                            className="relative shrink-0 flex items-center justify-center bg-white"
                          >
                            <HanziGridSvg
                              style={gridStyle}
                              colorConfig={currentColorConfig}
                              showPinyinGuide={showPinyinGuide}
                            />
                            <span
                              className={`relative z-10 ${sizeConfig.printFontClass} select-none leading-none`}
                              style={{
                                fontFamily: currentFontFamily.style,
                                ...traceOpacityStyle,
                              }}
                            >
                              {row.hanzi}
                            </span>
                          </div>
                        ))}

                      {/* Blanks */}
                      {Array.from({
                        length: row.isBlank
                          ? cellsPerRow - 1
                          : Math.max(1, cellsPerRow - 1 - actualTraceCount),
                      }).map((_, eIdx) => (
                        <div
                          key={`print-empty-${eIdx}`}
                          style={{
                            width: `${sizeConfig.printCellPx}px`,
                            height: `${sizeConfig.printCellPx}px`,
                          }}
                          className="relative shrink-0 flex items-center justify-center bg-white"
                        >
                          <HanziGridSvg
                            style={gridStyle}
                            colorConfig={currentColorConfig}
                            showPinyinGuide={showPinyinGuide}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Footer */}
            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[9.5px] text-slate-500 font-sans">
              <span>
                HSK Master Studio ({gridStyle.toUpperCase()} • {currentColorConfig.name.split(' ')[1]})
              </span>
              <span>
                Trang {pageIdx + 1} / {pages.length}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// Wrap with Suspense boundary for Next.js useSearchParams compliance
export default function WorksheetPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            Đang khởi động Xưởng Phiếu Viết Chữ Hán...
          </p>
        </div>
      }
    >
      <WorksheetStudioContent />
    </Suspense>
  );
}
