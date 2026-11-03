export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'srs' | 'pronounce' | 'exams' | 'worksheet' | 'account' | 'pricing';
  tags: string[];
}

export interface FaqCategory {
  id: 'all' | 'srs' | 'pronounce' | 'exams' | 'worksheet' | 'account' | 'pricing';
  label: string;
  iconName: string;
  description: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'all',
    label: 'Tất cả câu hỏi',
    iconName: 'HelpCircle',
    description: 'Tổng hợp mọi thắc mắc thường gặp khi sử dụng HSK Master',
  },
  {
    id: 'srs',
    label: 'Học tập & Thuật toán SRS',
    iconName: 'RotateCcw',
    description: 'Phương pháp lặp lại ngắt quãng, lộ trình nhớ từ vựng lâu dài',
  },
  {
    id: 'pronounce',
    label: 'Phát âm & Giọng đọc TTS',
    iconName: 'Volume2',
    description: 'Âm thanh chuẩn Bắc Kinh, chỉnh tốc độ đọc và xử lý sự cố',
  },
  {
    id: 'exams',
    label: 'Kho đề thi & Trắc nghiệm',
    iconName: 'GraduationCap',
    description: 'Làm đề HSK thật, đề BLCU, audio MP3 và sổ tay câu sai',
  },
  {
    id: 'worksheet',
    label: 'Tập viết chữ Hán & PDF',
    iconName: 'Printer',
    description: 'Xuất phiếu tập viết ô Mễ điền (米字格), in ấn A4 chuẩn đẹp',
  },
  {
    id: 'account',
    label: 'Tài khoản & Đồng bộ dữ liệu',
    iconName: 'UserCheck',
    description: 'Đăng nhập, lưu trữ đám mây, nhập/xuất file Excel/CSV',
  },
  {
    id: 'pricing',
    label: 'Chi phí & Quyền lợi học viên',
    iconName: 'Sparkles',
    description: 'Chính sách sử dụng miễn phí, quyền lợi tài khoản và cập nhật',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  // SRS & HỌC TẬP
  {
    id: 'srs-how-it-works',
    question: 'Hệ thống lặp lại ngắt quãng (SRS) trên HSK Master hoạt động như thế nào?',
    answer: `Hệ thống SRS (Spaced Repetition System) của HSK Master dựa trên đường cong quên lãng Ebbinghaus kết hợp thuật toán tối ưu hóa thời gian ôn tập. 
    
Khi bạn ôn một từ vựng:
- Nếu bạn chọn **Đã thuộc (Dễ)**: Khoảng cách ôn lại sẽ tự động nhân lên theo cấp số nhân (1 ngày → 3 ngày → 7 ngày → 14 ngày → 30 ngày...).
- Nếu bạn chọn **Chưa thuộc (Quên)**: Từ vựng sẽ lập tức quay về chu kỳ 1 ngày để bạn ôn tập ngay trong ngày tiếp theo.
- Nếu bạn chọn **Phân vân**: Thời gian giãn cách sẽ tăng nhẹ nhưng vẫn ưu tiên kiểm tra lại sớm.

Nhờ cơ chế này, bạn chỉ cần dành 10 - 15 phút mỗi ngày để ôn đúng những từ vựng sắp rơi vào vùng quên, tiết kiệm đến 80% thời gian so với cách học vẹt truyền thống.`,
    category: 'srs',
    tags: ['srs', 'thuật toán', 'quên lãng', 'ôn tập', 'thẻ ghi nhớ', 'flashcard'],
  },
  {
    id: 'srs-due-today',
    question: 'Tại sao số lượng từ "Cần ôn lại" (Due) hôm nay lại thay đổi liên tục?',
    answer: `Số lượng từ "Cần ôn lại" được tính toán tự động dựa trên mốc thời gian thực (Next Review Timestamp). Mỗi khi qua một ngày mới hoặc khi bạn hoàn thành một lượt ôn thẻ flashcard, hệ thống sẽ lọc lại danh sách những từ có thời điểm đáo hạn trước hoặc bằng hiện tại. 

Nếu hôm nay bạn có 20 từ cần ôn, sau khi bạn hoàn thành ôn tập thì con số này sẽ giảm về 0. Vào ngày mai, những từ đến hạn tiếp theo sẽ tự động xuất hiện.`,
    category: 'srs',
    tags: ['due', 'cần ôn', 'thống kê', 'hạn ôn'],
  },
  {
    id: 'srs-hsk-3-levels',
    question: 'Hệ thống từ vựng trên HSK Master theo chuẩn HSK cũ (2.0) hay HSK mới (3.0)?',
    answer: `HSK Master được xây dựng chuẩn theo **Quy chuẩn Giáo dục Quốc tế HSK 3.0 (GF 0025-2021)** gồm 9 cấp độ (HSK 1 đến HSK 9) với hơn 11,000 từ vựng tuyển chọn kỹ lưỡng.

Ngoài ra, hệ thống vẫn gắn nhãn tương thích giúp những bạn đang ôn thi theo format HSK 2.0 (HSK 1-6) dễ dàng nắm bắt trọng tâm từ vựng cần thiết cho từng kỳ thi cụ thể.`,
    category: 'srs',
    tags: ['hsk 3.0', 'hsk 2.0', 'cấp độ', 'hsk 1', 'hsk 6', 'hsk 9', 'tiêu chuẩn'],
  },

  // PHÁT ÂM & TTS
  {
    id: 'tts-beijing-audio',
    question: 'Âm thanh phát âm tiếng Trung trên trang web được tạo như thế nào? Có chuẩn bản xứ không?',
    answer: `Hệ thống sử dụng công nghệ Speech Synthesis API cao cấp kết hợp giọng đọc tiếng Phổ thông (Mandarin - zh-CN) chuẩn giọng Bắc Kinh.

Bạn có thể vào mục **Cài đặt cá nhân & TTS** (biểu tượng Bánh răng trên thanh tiêu đề) để:
- Chọn giọng đọc Nam hoặc Nữ.
- Điều chỉnh tốc độ phát âm (khuyến nghị 0.8x - 0.85x cho người mới bắt đầu và 1.0x cho trình độ trung/cao cấp).
- Bật tính năng **Tự động phát âm** khi lật thẻ Flashcard hoặc chuyển từ.`,
    category: 'pronounce',
    tags: ['tts', 'phát âm', 'bắc kinh', 'giọng đọc', 'audio', 'nghe'],
  },
  {
    id: 'tts-no-sound-fix',
    question: 'Tôi không nghe thấy âm thanh phát âm khi nhấn nút Loa, phải xử lý thế nào?',
    answer: `Nếu bạn gặp tình trạng không nghe thấy tiếng, hãy kiểm tra các bước sau:
1. **Kiểm tra âm lượng máy:** Đảm bảo loa thiết bị của bạn không bị tắt âm (Mute).
2. **Quyền phát âm thanh trên trình duyệt:** Một số trình duyệt (đặc biệt là Safari hoặc Chrome trên iPhone/Android) yêu cầu bạn tương tác chạm vào màn hình ít nhất 1 lần để cấp quyền phát audio.
3. **Cài đặt giọng đọc máy:** Vào mục *Cài đặt cá nhân & TTS* trên web, thử đổi sang giọng đọc khác trong danh sách giọng đọc khả dụng của trình duyệt.
4. **Trình duyệt khuyến nghị:** Bạn nên sử dụng Google Chrome, Microsoft Edge hoặc Safari phiên bản mới nhất để có chất lượng giọng đọc tốt nhất.`,
    category: 'pronounce',
    tags: ['lỗi âm thanh', 'không có tiếng', 'khắc phục sự cố', 'chrome', 'safari'],
  },

  // KHO ĐỀ THI & TRẮC NGHIỆM
  {
    id: 'exams-download-mp3',
    question: 'Kho đề thi HSK có kèm file nghe MP3 và bảng đáp án không? Có được tải về không?',
    answer: `Có! Kho đề thi tại mục **Kho đề thi** (/exams) bao gồm đầy đủ:
- File đề thi định dạng PDF chất lượng cao.
- Trình phát Audio MP3 nghe trực tiếp trên web với tính năng tua 10 giây, chỉnh tốc độ phát và lặp đoạn.
- Link tải toàn bộ đề thi, file nghe và bảng đáp án chi tiết hoàn toàn miễn phí.
- Hỗ trợ mã QR Code để bạn quét mở đề thi nghe trên điện thoại cực kỳ tiện lợi.`,
    category: 'exams',
    tags: ['đề thi', 'mp3', 'đáp án', 'tải về', 'blcu', 'hsk thi thật'],
  },
  {
    id: 'practice-notebook',
    question: 'Tính năng Sổ tay câu sai (错题本) trong mục Luyện tập hoạt động ra sao?',
    answer: `Khi bạn làm bài trắc nghiệm từ vựng 4 kỹ năng (Hán tự, Pinyin, Dịch nghĩa, Nghe âm) hoặc luyện ghép câu:
- Mỗi khi bạn trả lời sai một câu hỏi, câu đó sẽ tự động được lưu vào **Sổ tay câu sai**.
- Bạn có thể mở tab "Sổ tay câu sai" bất cứ lúc nào để làm lại riêng những câu đã từng sai cho tới khi nắm vững 100%.
- Khi đã trả lời đúng lại câu hỏi đó, bạn có thể xóa khỏi sổ câu sai để giải phóng danh sách.`,
    category: 'exams',
    tags: ['sổ câu sai', 'trắc nghiệm', 'ghép câu', '错题本', 'luyện tập'],
  },

  // TẬP VIẾT CHỮ HÁN & PDF
  {
    id: 'worksheet-a4-export',
    question: 'Cách xuất phiếu tập viết chữ Hán ô Mễ điền (米字格) ra file PDF để in?',
    answer: `Bạn chỉ cần vào mục **Tập viết chữ Hán** (/worksheet):
1. Chọn danh sách từ vựng từ bộ từ có sẵn hoặc tự nhập các chữ Hán bạn muốn luyện.
2. Tùy chỉnh kiểu ô: Ô Mễ điền (米字格), Điền tự cách (田字格), hoặc Ô lưới (方格).
3. Chọn hiển thị kèm Pinyin, Dịch nghĩa và chữ viết mờ nét mẫu (để tô theo).
4. Nhấn nút **In ngay / Lưu PDF** để trình duyệt mở hộp thoại in. Tại mục Máy in (Printer), chọn **Lưu dưới dạng PDF (Save as PDF)** với khổ giấy A4.`,
    category: 'worksheet',
    tags: ['tập viết', 'pdf', 'a4', 'mễ điền', 'in ấn', 'chữ hán'],
  },
  {
    id: 'stroke-order-animation',
    question: 'Tôi có thể xem thứ tự thuận bút (thứ tự nét viết) của chữ Hán ở đâu?',
    answer: `Tại bảng từ vựng chính, bạn chỉ cần nhấn vào biểu tượng cây bút cạnh mỗi chữ Hán (hoặc nhấp chuột vào chữ Hán). Hộp thoại **Thuận bút Hán tự** sẽ xuất hiện, hiển thị ảnh động hoạt họa từng nét viết theo chuẩn quy tắc bút thuận, kèm bảng vẽ tương tác để bạn tập viết trực tiếp bằng chuột hoặc bút cảm ứng.`,
    category: 'worksheet',
    tags: ['thuận bút', 'thứ tự nét', 'viết chữ', 'stroke order'],
  },

  // TÀI KHOẢN & ĐỒNG BỘ DỮ LIỆU
  {
    id: 'account-cloud-sync',
    question: 'Dữ liệu học tập và tiến độ ghi nhớ của tôi có bị mất khi đổi thiết bị không?',
    answer: `Nếu bạn đã **Đăng nhập tài khoản** (bằng Email hoặc tài khoản cá nhân):
- Toàn bộ tiến độ học tập, điểm SRS, danh sách từ vựng yêu thích, các bộ từ riêng (Custom Decks) và chuỗi ngày học liên tục (Streak) đều được tự động lưu trữ trên Cloud Database.
- Khi đăng nhập trên máy tính, điện thoại hoặc máy tính bảng khác, dữ liệu sẽ tự động đồng bộ ngay lập tức.

Nếu bạn đang dùng ở chế độ Khách (Guest), dữ liệu sẽ được lưu tạm tại trình duyệt máy tính của bạn (IndexedDB/LocalStorage). Chúng tôi khuyến nghị bạn nên đăng ký tài khoản miễn phí để đảm bảo an toàn dữ liệu 100%.`,
    category: 'account',
    tags: ['tài khoản', 'đồng bộ', 'cloud', 'mất dữ liệu', 'đăng nhập'],
  },
  {
    id: 'account-import-export-excel',
    question: 'Tôi có thể nhập bộ từ vựng cá nhân từ file Excel/CSV vào hệ thống không?',
    answer: `Hoàn toàn được! Trên thanh công cụ bảng từ vựng:
- Nhấn nút **Thêm từ** hoặc **Nhập file (Import)**.
- Bạn có thể dán danh sách từ hàng loạt hoặc tải file Excel (.xlsx) / CSV lên.
- Bạn cũng có thể nhấn **Xuất file (Export)** để tải toàn bộ từ vựng kèm trạng thái thuộc bài về máy tính làm tài liệu sao lưu bất cứ lúc nào.`,
    category: 'account',
    tags: ['excel', 'csv', 'import', 'export', 'xuất file', 'nhập từ'],
  },

  // CHI PHÍ & BẢN QUYỀN
  {
    id: 'pricing-is-free',
    question: 'Nền tảng HSK Master có thu phí người dùng không?',
    answer: `Các tính năng cốt lõi phục vụ học tập bao gồm:
- Tra cứu 11,000 từ vựng HSK 1 - 9 chuẩn HSK 3.0.
- Hệ thống lặp lại ngắt quãng SRS & Thẻ ghi nhớ Flashcard.
- 570 bài Cẩm nang Ngữ pháp HSK 1 - 9 chi tiết.
- Kho đề thi thật & đề BLCU kèm Audio MP3 và đáp án.
- Bộ công cụ tạo phiếu tập viết chữ Hán PDF A4.
- Luyện thi trắc nghiệm & Ghép câu tiếng Trung.

Tất cả các tính năng trên đều được cung cấp **hoàn toàn MIỄN PHÍ** cho cộng đồng người học tiếng Trung tại Việt Nam với mục tiêu lan tỏa tri thức và hỗ trợ các bạn vượt qua các kỳ thi HSK với kết quả cao nhất.`,
    category: 'pricing',
    tags: ['miễn phí', 'chi phí', 'học phí', 'bản quyền', 'phi lợi nhuận'],
  },
  {
    id: 'pricing-contact-support',
    question: 'Tôi có thể liên hệ với ban quản trị hoặc đóng góp ý kiến qua kênh nào?',
    answer: `Ban quản trị luôn hoan nghênh mọi góp ý chân thành từ học viên:
- **Cộng đồng Zalo:** Tham gia nhóm Zalo học viên HSK Master (được ghim tại thanh menu bên trái) để giao lưu, trao đổi ngữ pháp và nhận hỗ trợ kỹ thuật trực tiếp.
- **Form Góp ý:** Nhấn vào mục Thông báo hoặc Cài đặt → Hòm thư góp ý trên website để gửi phản hồi trực tiếp cho đội ngũ phát triển.`,
    category: 'pricing',
    tags: ['liên hệ', 'hỗ trợ', 'zalo', 'góp ý', 'báo lỗi'],
  },
];

export const TERMS_OF_SERVICE = {
  lastUpdated: '03 tháng 11, 2026',
  version: '2.4.0',
  sections: [
    {
      title: '1. Chấp thuận Điều khoản Sử dụng',
      content: `Khi truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào trên nền tảng **HSK Master (HSK Interactive Sheet)**, bạn đồng ý tuân thủ toàn bộ các điều khoản và điều kiện được nêu tại đây. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng ngừng sử dụng nền tảng.`,
    },
    {
      title: '2. Mục đích Dịch vụ & Trách nhiệm Học viên',
      content: `HSK Master là nền tảng công nghệ giáo dục hỗ trợ người học tiếng Trung Quốc rèn luyện từ vựng, ngữ pháp, phản xạ nghe nói và ôn thi chứng chỉ HSK.

Người dùng cam kết:
- Cung cấp thông tin xác thực khi đăng ký tài khoản (đặc biệt là địa chỉ email để khôi phục mật khẩu).
- Tự chịu trách nhiệm bảo mật thông tin đăng nhập cá nhân, không chia sẻ mật khẩu tài khoản cho nhiều người cùng sử dụng nhằm bảo toàn dữ liệu học tập SRS.
- Sử dụng các tài liệu, bài giảng và đề thi đúng mục đích học tập cá nhân phi thương mại.`,
    },
    {
      title: '3. Bản quyền & Sở hữu Trí tuệ',
      content: `- Mã nguồn, giao diện thiết kế, thuật toán SRS, hệ thống bài soạn ngữ pháp và các giải pháp đồ họa trên HSK Master thuộc quyền sở hữu trí tuệ của đội ngũ phát triển HSK Master.
- Các chuẩn từ vựng HSK 1 - 9 tuân thủ khung chuẩn hóa giáo dục quốc tế tiếng Trung (GF 0025-2021).
- Các bộ đề thi mẫu và tài liệu tham khảo được sưu tầm, biên dịch và đăng tải nhằm mục đích hỗ trợ phi lợi nhuận cho cộng đồng học viên theo tinh thần Fair Use trong giáo dục. Nếu có bất kỳ thắc mắc nào liên quan đến bản quyền tài liệu, vui lòng liên hệ ban quản trị để được hỗ trợ giải quyết ngay lập tức.`,
    },
    {
      title: '4. Các Hành vi Bị Nghiêm cấm',
      content: `Khi tham gia sử dụng nền tảng, học viên tuyệt đối không được thực hiện các hành vi sau:
- Sử dụng công cụ tự động (bot, scraper, crawler) để cào dữ liệu, làm nghẽn máy chủ hoặc gây ảnh hưởng tiêu cực đến trải nghiệm của người dùng khác.
- Đảo ngược mã nguồn (reverse engineering), can thiệp bất hợp pháp vào API hệ thống hoặc cố tình khai thác lỗ hổng bảo mật.
- Đăng tải, phát tán các nội dung vi phạm pháp luật, thuần phong mỹ tục, đồi trụy hoặc kích động bạo lực trong các nhóm cộng đồng kết nối với nền tảng.`,
    },
    {
      title: '5. Tính Sẵn sàng của Dịch vụ & Bảo trì',
      content: `Chúng tôi luôn nỗ lực duy trì hệ thống hoạt động ổn định 24/7. Tuy nhiên, trong các trường hợp bảo trì định kỳ, nâng cấp hạ tầng đám mây hoặc sự cố mạng bất khả kháng từ nhà cung cấp dịch vụ Internet, hệ thống có thể tạm thời bị gián đoạn. Đội ngũ kỹ thuật cam kết sẽ thông báo trước và khôi phục hoạt động trong thời gian sớm nhất.`,
    },
    {
      title: '6. Sửa đổi Điều khoản',
      content: `Ban quản trị có quyền cập nhật, bổ sung các điều khoản này vào bất kỳ lúc nào để phù hợp với sự phát triển của sản phẩm và các quy định pháp luật hiện hành. Những thay đổi quan trọng sẽ được thông báo trực tiếp qua hệ thống Thông báo (Notification Center) trên website.`,
    },
  ],
};

export const PRIVACY_POLICY = {
  lastUpdated: '03 tháng 11, 2026',
  version: '2.4.0',
  sections: [
    {
      title: '1. Thông tin Chúng tôi Thu thập',
      content: `Để cung cấp trải nghiệm học tập được cá nhân hóa và đồng bộ tiến độ liên tục, chúng tôi thu thập các thông tin tối thiểu sau:
- **Thông tin tài khoản:** Tên hiển thị, địa chỉ email, ảnh đại diện (nếu đăng nhập bằng Google hoặc tải lên), mục tiêu cấp độ HSK (HSK 1 - 6).
- **Dữ liệu học tập:** Danh sách từ vựng cá nhân, trạng thái thuộc bài, điểm đánh giá SRS, lịch sử ôn tập flashcard, câu làm sai trong phần trắc nghiệm (错题本), và chuỗi ngày học liên tục (Streak).
- **Dữ liệu kỹ thuật:** Kiểu trình duyệt, cài đặt giao diện (Sáng/Tối), tùy chọn giọng đọc phát âm TTS (tốc độ, giọng Nam/Nữ).`,
    },
    {
      title: '2. Mục đích Sử dụng Dữ liệu',
      content: `Dữ liệu của bạn được sử dụng duy nhất cho các mục đích:
- Tính toán chính xác thời điểm lặp lại ngắt quãng (SRS) cho từng từ vựng riêng biệt.
- Đồng bộ hóa dữ liệu mượt mà giữa máy tính, máy tính bảng và điện thoại di động của bạn.
- Hiển thị thống kê tiến độ học tập và tỉ lệ ghi nhớ từ vựng trực quan.
- Hỗ trợ giải đáp thắc mắc và xử lý sự cố kỹ thuật theo yêu cầu của chính bạn.`,
    },
    {
      title: '3. Cam kết Bảo mật & Không Chia sẻ cho Bên Thứ ba',
      content: `**Chúng tôi cam kết tuyệt đối KHÔNG bán, cho thuê hoặc chia sẻ dữ liệu cá nhân của học viên cho bất kỳ bên thứ ba nào vì mục đích quảng cáo hay tiếp thị.**

Tất cả các kết nối trao đổi dữ liệu giữa máy tính của bạn và máy chủ đều được mã hóa bằng giao thức bảo mật tiêu chuẩn ngành SSL/TLS (HTTPS). Dữ liệu đám mây được quản lý bởi hạ tầng bảo mật cấp doanh nghiệp của Google Firebase & Cloud Firestore.`,
    },
    {
      title: '4. Quyền Kiểm soát Dữ liệu của Học viên',
      content: `Bạn nắm giữ toàn quyền đối với dữ liệu của mình:
- **Quyền Xuất dữ liệu:** Bạn có thể xuất toàn bộ danh sách từ vựng, ghi chú và tiến độ của mình ra định dạng file Excel (.xlsx) hoặc CSV bất kỳ lúc nào qua nút "Xuất file".
- **Quyền Chỉnh sửa & Xóa:** Bạn có thể tự do chỉnh sửa thông tin cá nhân, đặt lại mật khẩu hoặc xóa các bộ từ vựng cá nhân không còn nhu cầu học.
- **Quyền Yêu cầu Xóa vĩnh viễn tài khoản:** Bạn có thể gửi yêu cầu xóa toàn bộ tài khoản và mọi dữ liệu liên quan khỏi cơ sở dữ liệu qua Hòm thư góp ý hoặc liên hệ ban quản trị.`,
    },
    {
      title: '5. Sử dụng Bộ nhớ Cục bộ (Local Storage & IndexedDB)',
      content: `HSK Master sử dụng LocalStorage và IndexedDB trên trình duyệt của bạn nhằm lưu trữ ngoại tuyến bộ đệm dữ liệu 11,000 từ vựng. Nhờ đó, ứng dụng có thể mở tức thì chỉ trong vài mili-giây, giảm thiểu tải mạng và cho phép bạn xem từ vựng ngay cả khi kết nối mạng chập chờn.`,
    },
  ],
};
