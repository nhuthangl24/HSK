/**
 * Top 10 Curated Google Fonts for Chinese Characters (Hanzi / 汉字 / 漢字)
 * Carefully selected for high legibility, diverse calligraphy styles, and educational value.
 */

export interface HanziFontDefinition {
  id: string;
  name: string;
  chineseName: string;
  category: string;
  categoryBadge: string;
  fontFamily: string;
  googleFontFamily?: string;
  description: string;
  author: string;
  previewSample: string;
  previewPinyin: string;
  previewMeaning: string;
  isPopular?: boolean;
  isCalligraphy?: boolean;
  tags: string[];
}

export const GOOGLE_HANZI_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Liu+Jian+Mao+Cao&family=Long+Cang&family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@300;400;500;700;900&family=Noto+Serif+SC:wght@400;600;700;900&family=ZCOOL+KuaiLe&family=ZCOOL+QingKe+HuangYou&family=ZCOOL+XiaoWei&family=Zhi+Mang+Xing&display=swap';

export const SYSTEM_HANZI_FONT: HanziFontDefinition = {
  id: 'system',
  name: 'Mặc định Hệ Thống',
  chineseName: '系统默认字体',
  category: 'Hệ điều hành',
  categoryBadge: 'Mặc định',
  fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif',
  description: 'Phông chữ mặc định của hệ điều hành (Apple PingFang SC trên iOS/macOS, Microsoft YaHei trên Windows).',
  author: 'Apple / Microsoft',
  previewSample: '敏而好学，不耻下问',
  previewPinyin: 'mǐn ér hào xué, bù chǐ xià wèn',
  previewMeaning: 'Thông minh mà hiếu học, không ngại học hỏi từ người khác.',
  tags: ['Chuẩn OS', 'Nhanh', 'Gọn'],
};

export const TOP_10_HANZI_FONTS: HanziFontDefinition[] = [
  {
    id: 'lxgw-wenkai',
    name: 'LXGW WenKai (霞鹜文楷)',
    chineseName: '霞鹜文楷',
    category: 'Khải thư giáo trình (Kaiti)',
    categoryBadge: 'Đề xuất số 1',
    fontFamily: '"LXGW WenKai TC", "LXGW WenKai", cursive, sans-serif',
    googleFontFamily: 'LXGW+WenKai+TC:wght@400;700',
    description:
      'Phông Khải thư (Kaiti) phỏng nét bút viết tay chuẩn mực nhất trên Google Fonts. Nét thanh tú, thứ tự nét bút rõ ràng, cực kỳ khuyên dùng cho người học tiếng Trung & HSK.',
    author: 'Lüxiaogw / Google Fonts',
    previewSample: '温故而知新，可以为师矣',
    previewPinyin: 'wēn gù ér zhī xīn, kě yǐ wéi shī yǐ',
    previewMeaning: 'Ôn lại điều cũ để hiểu điều mới, có thể làm thầy được rồi.',
    isPopular: true,
    tags: ['Chuẩn sách giáo khoa', 'Dễ nhìn', 'Nét bút tay'],
  },
  {
    id: 'noto-sans-sc',
    name: 'Noto Sans SC (思源黑体)',
    chineseName: '思源黑体',
    category: 'Hắc thể hiện đại (Sans-Serif)',
    categoryBadge: 'Hiện đại',
    fontFamily: '"Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif',
    googleFontFamily: 'Noto+Sans+SC:wght@300;400;500;700;900',
    description:
      'Bộ phông mở chuẩn mực thế giới từ Google và Adobe. Độ tương phản cao, nét đều phẳng, hiển thị sắc sảo tối ưu cho màn hình kỹ thuật số và bảng dữ liệu.',
    author: 'Google & Adobe',
    previewSample: '学而不思则罔，思而不学则殆',
    previewPinyin: 'xué ér bù sī zé wǎng, sī ér bù xué zé dài',
    previewMeaning: 'Học mà không suy nghĩ thì mịt mờ, nghĩ mà không học thì nguy hại.',
    isPopular: true,
    tags: ['Tối giản', 'Gọn gàng', 'Chuẩn quốc tế'],
  },
  {
    id: 'noto-serif-sc',
    name: 'Noto Serif SC (思源宋体)',
    chineseName: '思源宋体',
    category: 'Tống thể in ấn (Serif)',
    categoryBadge: 'Thanh lịch',
    fontFamily: '"Noto Serif SC", serif',
    googleFontFamily: 'Noto+Serif+SC:wght@400;600;700;900',
    description:
      'Kiểu chữ Tống thể (Song/Ming) cổ điển của sách in văn học. Chân nét thanh đậm tao nhã, mang phong thái uyên bác, trang nghiêm và giàu tính truyền thống.',
    author: 'Google & Adobe',
    previewSample: '千里之行，始于足下',
    previewPinyin: 'qiān lǐ zhī xíng, shǐ yú zú xià',
    previewMeaning: 'Hành trình vạn dặm bắt đầu từ một bước chân duy nhất.',
    tags: ['Cổ điển', 'Sách văn học', 'Chân nét'],
  },
  {
    id: 'ma-shan-zheng',
    name: 'Ma Shan Zheng (马善政毛笔楷书)',
    chineseName: '马善政楷书',
    category: 'Thư pháp bút lông (Brush)',
    categoryBadge: 'Thư pháp cổ phong',
    fontFamily: '"Ma Shan Zheng", cursive',
    googleFontFamily: 'Ma+Shan+Zheng',
    description:
      'Bộ thư pháp bút lông chính tông do nhà thư pháp Mã Thiện Chính chắp bút. Nét đậm đà, đường bút hữu lực, tạo không khí cổ phong trang nghiêm như thư họa.',
    author: 'Ma Shan-Zheng',
    previewSample: '海纳百川，有容乃大',
    previewPinyin: 'hǎi nà bǎi chuān, yǒu róng nǎi dà',
    previewMeaning: 'Biển nạp trăm sông, có lòng bao dung ắt trở nên vĩ đại.',
    isCalligraphy: true,
    tags: ['Bút lông', 'Cổ trang', 'Uy lực'],
  },
  {
    id: 'zhi-mang-xing',
    name: 'Zhi Mang Xing (志莽行书)',
    chineseName: '志莽行书',
    category: 'Hành thư bay bổng (Running Script)',
    categoryBadge: 'Hành thư nghệ thuật',
    fontFamily: '"Zhi Mang Xing", cursive',
    googleFontFamily: 'Zhi+Mang+Xing',
    description:
      'Lối viết Hành thư tốc ký sống động như rồng bay phượng múa. Các nét nối uyển chuyển, liên hoàn, thể hiện thần thái lãng mạn của thi ca phương Đông.',
    author: 'Wei Zhi-Mang',
    previewSample: '会当凌绝顶，一览众山小',
    previewPinyin: 'huì dāng líng jué dǐng, yī lǎn zhòng shān xiǎo',
    previewMeaning: 'Lên tới tận đỉnh cao chót vót, thu gọn muôn non dưới tầm mắt.',
    isCalligraphy: true,
    tags: ['Phiêu lãng', 'Nét nối', 'Hành thư'],
  },
  {
    id: 'liu-jian-mao-cao',
    name: 'Liu Jian Mao Cao (刘建毛草)',
    chineseName: '刘建毛草',
    category: 'Thảo thư cuồng phóng (Wild Script)',
    categoryBadge: 'Cuồng thảo',
    fontFamily: '"Liu Jian Mao Cao", cursive',
    googleFontFamily: 'Liu+Jian+Mao+Cao',
    description:
      'Thư pháp Thảo thư phóng khoáng, nét cọ xé gió đầy nội lực. Mang phong cách của bậc đại sư nghệ thuật tự do, gây ấn tượng thị giác cực mạnh.',
    author: 'Liu Jian',
    previewSample: '长风破浪会有时，直挂云帆济沧海',
    previewPinyin: 'cháng fēng pò làng huì yǒu shí, zhí guà yún fān jì cāng hǎi',
    previewMeaning: 'Cưỡi gió vượt sóng ắt có ngày, giương buồm mây vượt biển lớn.',
    isCalligraphy: true,
    tags: ['Phá cách', 'Tốc độ', 'Thảo thư'],
  },
  {
    id: 'long-cang',
    name: 'Long Cang (龙苍体)',
    chineseName: '龙苍体',
    category: 'Thư pháp nghiêng nhẹ (Slanted Cursive)',
    categoryBadge: 'Mềm mại thi vị',
    fontFamily: '"Long Cang", cursive',
    googleFontFamily: 'Long+Cang',
    description:
      'Thế chữ nghiêng tự nhiên, nét mực thanh mảnh và dịu dàng như cỏ rạp trong gió thu. Thích hợp cho những câu thơ cổ và câu danh ngôn nhẹ nhàng.',
    author: 'Qiu Long-Cang',
    previewSample: '落霞与孤鹜齐飞，秋水共长天一色',
    previewPinyin: 'luò xiá yǔ gū wù qí fēi, qiū shuǐ gòng cháng tiān yí sè',
    previewMeaning: 'Ráng chiều cùng cánh cò đơn chiếc, nước thu hòa với trời một màu.',
    isCalligraphy: true,
    tags: ['Nghiêng nhẹ', 'Thơ mộng', 'Thanh thoát'],
  },
  {
    id: 'zcool-xiaowei',
    name: 'ZCOOL XiaoWei (站酷小薇体)',
    chineseName: '站酷小薇体',
    category: 'Nét mảnh tao nhã (Slim Display)',
    categoryBadge: 'Tinh tế',
    fontFamily: '"ZCOOL XiaoWei", serif',
    googleFontFamily: 'ZCOOL+XiaoWei',
    description:
      'Thiết kế thon cao với các nét thanh mảnh và tỷ lệ cách điệu duyên dáng. Mang hơi thở đương đại, vừa lãng mạn vừa mang nét cổ điển cách tân.',
    author: 'ZCOOL / Li Da-Wei',
    previewSample: '春水碧于天，画船听雨眠',
    previewPinyin: 'chūn shuǐ bì yú tiān, huà chuán tīng yǔ mián',
    previewMeaning: 'Nước xuân xanh biếc hơn trời, trên thuyền vẽ hoa nghe tiếng mưa ngủ.',
    tags: ['Thon cao', 'Duyên dáng', 'Thời trang'],
  },
  {
    id: 'zcool-qingke-huangyou',
    name: 'ZCOOL HuangYou (站酷庆科黄油体)',
    chineseName: '站酷庆科黄油体',
    category: 'Hình học Poster (Geometric Bold)',
    categoryBadge: 'Đồ họa Poster',
    fontFamily: '"ZCOOL QingKe HuangYou", cursive, sans-serif',
    googleFontFamily: 'ZCOOL+QingKe+HuangYou',
    description:
      'Nét chữ đậm đà với các góc bo tròn mềm mại kết hợp vát chéo hình học độc đáo. Tạo ấn tượng thị giác trẻ trung, hiện đại như áp phích đồ họa.',
    author: 'ZCOOL / Zheng Qing-Ke',
    previewSample: '三人行，必有我师焉',
    previewPinyin: 'sān rén xíng, bì yǒu wǒ shī yān',
    previewMeaning: 'Ba người cùng đi, ắt có một người là thầy của ta.',
    tags: ['Nét đậm', 'Hình học', 'Nổi bật'],
  },
  {
    id: 'zcool-kuaile',
    name: 'ZCOOL KuaiLe (站酷快乐体)',
    chineseName: '站酷快乐体',
    category: 'Hoạt hình vui nhộn (Playful Cartoon)',
    categoryBadge: 'Dễ thương',
    fontFamily: '"ZCOOL KuaiLe", cursive, sans-serif',
    googleFontFamily: 'ZCOOL+KuaiLe',
    description:
      'Kiểu chữ hoạt hình tròn trịa, vui mắt và đầy năng lượng. Làm dịu đi sự khô khan khi học chữ Hán, tạo cảm giác thân thiện và vui vẻ cho học viên.',
    author: 'ZCOOL / Liu Bing-Ke',
    previewSample: '天天向上，快乐学中文',
    previewPinyin: 'tiān tiān xiàng shàng, kuài lè xué zhōng wén',
    previewMeaning: 'Ngày ngày tiến bước, học tiếng Trung thật vui và hào hứng.',
    tags: ['Vui vẻ', 'Hoạt hình', 'Tròn trịa'],
  },
];

export const ALL_HANZI_FONTS: HanziFontDefinition[] = [
  SYSTEM_HANZI_FONT,
  ...TOP_10_HANZI_FONTS,
];

export const HANZI_FONT_STORAGE_KEY = 'hsk_hanzi_font';

/**
 * Find font definition by ID, fallback to system font
 */
export function getHanziFontById(id?: string | null): HanziFontDefinition {
  if (!id) return SYSTEM_HANZI_FONT;
  const found = ALL_HANZI_FONTS.find((f) => f.id === id);
  return found || SYSTEM_HANZI_FONT;
}

/**
 * Apply the selected Hanzi font globally to document.documentElement
 */
export function applyHanziFontToDom(fontId: string): void {
  if (typeof document === 'undefined') return;

  const font = getHanziFontById(fontId);
  const root = document.documentElement;

  // Set CSS custom property for .font-hanzi
  root.style.setProperty('--hanzi-font-family', font.fontFamily);
  root.setAttribute('data-hanzi-font', font.id);
}
