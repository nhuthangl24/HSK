import { AdminGuide } from '@/types/auth';

export const INITIAL_ADMIN_GUIDES: AdminGuide[] = [
  {
    id: 'guide-1-getting-started',
    slug: 'getting-started-admin-portal',
    title: 'Khởi đầu với Trang Quản Trị (Getting Started with Admin Portal)',
    category: 'Tổng quan',
    description: 'Hướng dẫn tổng quan về cấu trúc, giao diện điều hướng, các phân hệ quản lý và quy chuẩn vận hành của HSK Exam Suite Admin Portal.',
    order: 1,
    isPublished: true,
    author: 'Ban Quản Trị HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `
![Giao diện Bảng điều khiển Quản trị HSK Master](/docs/screenshots/admin-overview.png)

### 1. Giới thiệu Tổng quan
Trang Quản trị (**Admin Portal**) là trung tâm điều hành toàn diện của nền tảng **HSK Exam Suite**. Tại đây, các Quản trị viên (Admin) có quyền kiểm soát toàn bộ người dùng, kho dữ liệu 11,000+ từ vựng chuẩn HSK 1–9, thư viện 65 bộ đề thi kèm audio MP3, giám sát sức khỏe dịch vụ và cấu hình hệ thống.

### 2. Cấu trúc Thanh Điều Hướng (Navigation Sidebar)
Hệ thống quản trị được phân chia thành các nhóm nghiệp vụ rõ ràng:
- **Tổng quan (Overview)**: Bảng điều khiển Dashboard hiển thị các chỉ số cốt lõi (tổng người dùng, phân bố từ vựng theo cấp độ, đề thi, tình trạng sức khỏe máy chủ).
- **Người dùng (Users)**: Quản lý danh mục tài khoản, phân quyền, khóa tài khoản và kiểm tra không gian làm việc của học viên.
- **Nội dung HSK (Content)**: Quản trị kho từ vựng chuẩn HSK 1–9, chủ đề phân loại, công cụ dán dữ liệu nhanh và kiểm tra chất lượng từ vựng (Duplicate / Quality Audit).
- **Khảo thí (Exams)**: Quản trị 65 bộ đề thi thật Hanban / CTI và đề thử BLCU, liên kết file PDF và file âm thanh MP3.
- **Hỗ trợ & Tương tác (Support)**: Tiếp nhận ý kiến đóng góp, báo cáo lỗi từ học viên và gửi thông báo toàn hệ thống.
- **Hệ thống & Vận hành (Operations)**: Trung tâm Giám sát Sức khỏe (Health Center), Nhật ký lỗi (Error Logs) và Nhật ký kiểm toán (Audit Logs).
- **Tài liệu Quản trị (Admin Guides)**: Trung tâm tài liệu hướng dẫn kỹ thuật và quy trình vận hành.

### 3. Quy tắc An toàn Vận hành
> [!IMPORTANT]
> - Mọi thao tác nhạy cảm (Khóa tài khoản, Xóa dữ liệu, Thay đổi quyền Admin) đều được hệ thống ghi nhận tự động vào **Nhật ký Kiểm toán (Audit Logs)**.
> - Luôn kiểm tra bản xem trước (Preview) trước khi áp dụng các thay đổi hàng loạt (Bulk Import / Paste).`,
  },
  {
    id: 'guide-2-user-management',
    slug: 'user-and-role-management',
    title: 'Quản lý Người dùng & Phân quyền (User and Role Management)',
    category: 'Người dùng',
    description: 'Quy trình tra cứu tài khoản, kích hoạt, khóa tài khoản vi phạm, thay đổi vai trò (User / Admin) và quy trình xóa tài khoản an toàn.',
    order: 2,
    isPublished: true,
    author: 'Ban Quản Trị HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `
![Giao diện Quản trị Người Dùng & Học Viên](/docs/screenshots/admin-users.png)

### 1. Tra cứu và Lọc Người dùng
Tại phân hệ **Người dùng (Users)**, quản trị viên có thể:
1. Tìm kiếm học viên tức thì theo **Họ tên**, **Email** hoặc **Mã ID**.
2. Lọc danh sách theo **Vai trò** (\`admin\`, \`user\`, \`student\`, \`teacher\`) hoặc **Trạng thái** (Hoạt động / Bị khóa).
3. Sắp xếp danh sách theo ngày đăng ký mới nhất, chuỗi ngày học (Streak) hoặc mục tiêu HSK.

### 2. Khóa và Mở khóa Tài khoản (Suspend / Activate)
- **Khi nào cần khóa**: Khi phát hiện tài khoản có hành vi gian lận, spam phản hồi hoặc vi phạm điều khoản dịch vụ.
- **Thao tác**: Nhấn nút **Khóa tài khoản** tại dòng người dùng tương ứng. Tài khoản bị khóa sẽ không thể đăng nhập hoặc đồng bộ dữ liệu lên máy chủ.
- **Biện pháp an toàn**: Hệ thống ngăn chặn việc Admin vô tình tự khóa tài khoản của chính mình.

### 3. Phân quyền Quản trị viên (Role Assignment)
- **Quyền Admin**: Được phép truy cập toàn bộ trang \`/admin\`, thực thi các API quản trị và chỉnh sửa cơ sở dữ liệu.
- **Quy tắc bảo mật**: Chỉ cấp quyền Admin cho các nhân sự phụ trách vận hành kỹ thuật hoặc kiểm duyệt nội dung. Không cấp quyền Admin diện rộng.

### 4. Quy trình Xóa Tài khoản An toàn
- Khi thực hiện xóa tài khoản, hệ thống sẽ yêu cầu xác nhận hộp thoại cảnh báo.
- Dữ liệu tiến độ học cá nhân (\`user_progress\`) và từ vựng riêng (\`custom_words\`) của người dùng đó sẽ được dọn dẹp an toàn mà không làm ảnh hưởng đến kho từ vựng chung của hệ thống.`,
  },
  {
    id: 'guide-3-managing-vocabulary',
    slug: 'managing-hsk-vocabulary',
    title: 'Quản lý Kho Từ vựng Chuẩn HSK 1–9 (Managing HSK Vocabulary)',
    category: 'Nội dung',
    description: 'Hướng dẫn thêm, sửa, xóa từ vựng hệ thống, định dạng phiên âm pinyin có dấu thanh điệu chuẩn và gắn câu ví dụ ngữ cảnh.',
    order: 3,
    isPublished: true,
    author: 'Ban Nội Dung HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `
![Giao diện Kho Từ Vựng Chuẩn HSK 1–9](/docs/screenshots/admin-vocab.png)

### 1. Quy chuẩn Dữ liệu Từ vựng
Mỗi mục từ vựng trong hệ thống cần tuân thủ cấu trúc chuẩn:
- **Chữ Hán (Hanzi)**: Ký tự chữ Hán giản thể chuẩn (ví dụ: \`学习\`).
- **Phiên âm (Pinyin)**: Pinyin chuẩn kèm dấu thanh điệu Unicode (ví dụ: \`xuéxí\`, không dùng số như \`xue2xi2\`).
- **Nghĩa tiếng Việt**: Rõ ràng, súc tích, bao hàm nghĩa thông dụng nhất trong bài thi HSK.
- **Cấp độ HSK**: Thuộc các cấp độ từ 1 đến 9 theo chuẩn HSK 3.0 mới nhất.
- **Câu ví dụ (Example)**: Bao gồm chữ Hán, phiên âm pinyin ví dụ và bản dịch tiếng Việt tương ứng.

### 2. Thao tác Biên tập Từ vựng
1. Vào tab **Từ vựng HSK** trên thanh menu bên trái.
2. Sử dụng ô tìm kiếm để kiểm tra xem từ vựng đã tồn tại hay chưa để tránh trùng lặp.
3. Nhấn **Thêm từ mới** hoặc chọn nút chỉnh sửa (Cây bút) trên dòng từ cần cập nhật.
4. Điền đầy đủ các trường thông tin và nhấn **Lưu thay đổi**. Thao tác này sẽ lưu vào máy chủ và đồng bộ lên Cloud Firestore nếu có cấu hình kết nối.

### 3. Công cụ Kiểm tra Chất lượng Dữ liệu (Quality Audit)
Phân hệ cung cấp bộ lọc kiểm tra tự động phát hiện:
- Các từ bị thiếu phiên âm pinyin hoặc thiếu nghĩa tiếng Việt.
- Các từ bị gán sai cấp độ HSK.
- Các từ Hán bị trùng lặp nhiều lần trong cơ sở dữ liệu.`,
  },
  {
    id: 'guide-4-import-export-data',
    slug: 'importing-exporting-vocabulary',
    title: 'Nhập & Xuất Dữ liệu Từ vựng (Importing and Exporting Vocabulary)',
    category: 'Nội dung',
    description: 'Quy chuẩn nhập tệp CSV / Excel, cách sử dụng công cụ Dán nhanh (Bulk Paste), xử lý lỗi dữ liệu và xuất báo cáo.',
    order: 4,
    isPublished: true,
    author: 'Ban Kỹ Thuật HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `### 1. Nhập Dữ liệu Bằng Công cụ Dán Nhanh (Bulk Paste)
Công cụ Dán nhanh (**Bulk Paste**) cho phép Admin sao chép trực tiếp các cột dữ liệu từ Google Sheets hoặc Excel rồi dán thẳng vào trình duyệt:
1. Mở tab **Dán nhanh (Bulk Paste)** trong mục Nội dung.
2. Dán khối văn bản dạng bảng (ngăn cách bằng dấu Tab hoặc phẩy).
3. Hệ thống sẽ tự động phân tách các cột: *Chữ Hán*, *Pinyin*, *Nghĩa tiếng Việt*, *Cấp độ HSK*, *Ví dụ*.
4. Kiểm tra bảng xem trước (Preview Table) trước khi bấm **Xác nhận nhập**.

### 2. Nhập từ Tệp CSV / Excel
- File nhập phải sử dụng bảng mã **UTF-8** để không bị lỗi font chữ Hán và dấu thanh điệu pinyin.
- Thứ tự các cột chuẩn: \`hanzi\`, \`pinyin\`, \`meaning\`, \`hskLevel\`, \`example\`, \`examplePinyin\`, \`exampleMeaning\`.

### 3. Xuất Dữ liệu (Export)
- Admin có thể xuất toàn bộ từ vựng hoặc lọc theo cấp độ HSK cụ thể.
- Định dạng xuất hỗ trợ: **CSV (UTF-8 with BOM)** để mở trực tiếp trong Microsoft Excel mà không bị lỗi font chữ tiếng Trung và tiếng Việt.`,
  },
  {
    id: 'guide-5-managing-topics',
    slug: 'managing-topics-and-folders',
    title: 'Quản lý Chủ đề & Thư mục (Managing Topics and Folders)',
    category: 'Nội dung',
    description: 'Tạo và quản lý các chủ đề từ vựng chuyên ngành, gán nhãn, theo dõi số lượng từ vựng và xử lý chủ đề mồ côi.',
    order: 5,
    isPublished: true,
    author: 'Ban Nội Dung HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `
![Giao diện Không Gian Học Viên & Thư Mục](/docs/screenshots/admin-workspaces.png)

### 1. Vai trò của Chủ đề (Topics)
Chủ đề giúp học viên phân nhóm từ vựng theo ngữ cảnh thực tế (ví dụ: *Giao tiếp hàng ngày, Ẩm thực & Nhà hàng, Du lịch & Khách sạn, Kinh tế & Thương mại, Công nghệ thông tin*).

### 2. Tạo và Chỉnh sửa Chủ đề
1. Mở tab **Chủ đề & Nhóm** trong menu quản trị.
2. Nhấn **Tạo chủ đề mới**: nhập tên chủ đề, mô tả ngắn gọn và chọn màu sắc nhận diện.
3. Nhấn **Lưu chủ đề**.

### 3. Quy tắc Khi Xóa Chủ đề
- Khi xóa một chủ đề đang chứa từ vựng, hệ thống sẽ hỏi xác nhận:
  - Giữ lại các từ vựng và chuyển chúng về nhóm *Chưa phân loại*.
  - Không bao giờ xóa mất các từ vựng hệ thống chỉ vì thao tác xóa nhãn chủ đề.`,
  },
  {
    id: 'guide-6-managing-exams',
    slug: 'managing-exam-pdfs-and-audio',
    title: 'Quản lý Kho Đề thi PDF & Audio (Managing Exam PDFs and Audio)',
    category: 'Khảo thí',
    description: 'Hướng dẫn đăng tải đề thi HSK, đính kèm tệp âm thanh nghe MP3, liên kết bảng đáp án và kiểm tra liên kết hỏng.',
    order: 6,
    isPublished: true,
    author: 'Ban Khảo Thí HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `### 1. Cấu trúc Tài liệu Đề thi
Kho đề thi hỗ trợ đầy đủ các tài liệu phục vụ ôn thi:
- **Tệp PDF Đề thi**: Bản in chuẩn A4, độ phân giải cao phục vụ học sinh làm bài hoặc in ấn.
- **Tệp Audio MP3**: File âm thanh phòng thi chính thức phục vụ phần thi Nghe hiểu (Listening).
- **Tệp Đáp án**: Bảng đáp án chi tiết và giải thích đáp án.

### 2. Quy trình Thêm Mới hoặc Cập nhật Đề thi
1. Mở tab **Kho đề thi (Exams)** trong menu quản trị.
2. Bấm nút **Thêm đề thi mới**.
3. Điền các trường bắt buộc: *Tiêu đề đề thi*, *Cấp độ HSK (1 đến 6, 7-9, hoặc HSKK)*, *Nguồn phát hành (Hanban / BLCU)*, *Năm thi*, *Thời lượng (phút)*, *Số lượng câu hỏi*.
4. Nhập đường dẫn tệp:
   - Tệp PDF: đường dẫn dạng \`/exam-files/pdf/ten_file.pdf\`.
   - Tệp Audio: đường dẫn dạng \`/exam-files/audio/ten_file.mp3\`.
5. Bấm **Lưu đề thi**. Hệ thống sẽ kiểm tra tính hợp lệ của tệp và công bố vào thư viện \`/exams\`.

### 3. Tự động Quét Liên kết Hỏng (Broken-Resource Scanner)
Trang quản trị tích hợp công cụ kiểm tra tự động các liên kết PDF và MP3. Nếu một tệp bị thiếu trên ổ cứng máy chủ, hệ thống sẽ cảnh báo bằng biểu tượng màu vàng để quản trị viên kịp thời bổ sung.`,
  },
  {
    id: 'guide-7-srs-and-learning-progress',
    slug: 'understanding-learning-progress-and-srs',
    title: 'Hiểu về Tiến độ Học tập & Thuật toán SRS SM-2 (Understanding Learning Progress and SRS)',
    category: 'Vận hành',
    description: 'Nguyên lý hoạt động của thuật toán Spaced Repetition SM-2, chu kỳ ngắt quãng, các chỉ số đánh giá và chẩn đoán dữ liệu học bất thường.',
    order: 7,
    isPublished: true,
    author: 'Ban Kỹ Thuật HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `### 1. Thuật toán Spaced Repetition (SRS SM-2)
Hệ thống sử dụng thuật toán kinh điển **SuperMemo SM-2** kết hợp cơ chế phân loại 4 mức đánh giá của **Anki**:
- **[1] Quên (Again)**: Điểm chất lượng = 1. Thẻ bị xếp lại vào cuối phiên học hôm nay. Chu kỳ lặp lại được đặt lại về 1 ngày.
- **[2] Khó (Hard)**: Điểm chất lượng = 3. Chu kỳ tăng nhẹ (khoảng 1.2 lần khoảng cách trước).
- **[3] Tốt (Good)**: Điểm chất lượng = 4. Thẻ tăng chu kỳ chuẩn (1 ngày ➔ 3 ngày ➔ interval * easeFactor).
- **[4] Dễ (Easy)**: Điểm chất lượng = 5. Thẻ được tăng vượt bậc (4 ngày ➔ 7 ngày ➔ interval * easeFactor * 1.3).

### 2. Các Chỉ số Quản trị Cần Theo dõi
- **Tỷ lệ ghi nhớ (Retention Rate)**: Phần trăm số lần đánh giá đúng (Good / Easy) trên tổng số lượt ôn tập. Tỷ lệ tối ưu của hệ thống là 85% – 90%.
- **Từ đến hạn (Due Today)**: Số từ vựng có ngày đến hạn (\`dueDate\`) nhỏ hơn hoặc bằng ngày hiện tại.

### 3. Xử lý Dữ liệu Học Bất thường
Nếu phát hiện một tài khoản có số lượt ôn tập đột biến trong thời gian ngắn (ví dụ hàng chục ngàn lượt trong vài phút), Admin có thể kiểm tra tab **Nhật ký** để phát hiện hành vi dùng bot tự động và khóa tài khoản khi cần thiết.`,
  },
  {
    id: 'guide-8-system-health-diagnostics',
    slug: 'system-health-and-diagnostics',
    title: 'Giám sát Sức khỏe Hệ thống & Chẩn đoán (System Health and Diagnostics)',
    category: 'Hệ thống',
    description: 'Cách đọc bảng trạng thái dịch vụ (App, Firestore, Storage, Audio), kiểm tra độ trễ (latency) và phát hiện lỗi kết nối.',
    order: 8,
    isPublished: true,
    author: 'Ban Kỹ Thuật HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `
![Giao diện Giám Sát Sức Khỏe & Chẩn Đoán Hệ Thống](/docs/screenshots/admin-health.png)

### 1. Bảng Trạng thái Sức khỏe Hệ thống (Health Center)
Phân hệ **Sức khỏe Hệ thống** kiểm tra tự động và liên tục các thành phần cốt lõi:
- **Application Server (Node.js)**: Đo lường thời gian hoạt động liên tục (Uptime), phiên bản runtime và dung lượng bộ nhớ RAM (Memory RSS / Heap).
- **Cơ sở Dữ liệu Cục bộ (.data/)**: Kiểm tra tính toàn vẹn của các file JSON lưu trữ, đo độ trễ đọc ghi thực tế (Latency in ms).
- **Tài nguyên Tệp Đề thi (Exam Assets)**: Kiểm tra sự tồn tại thực tế của các file PDF và Audio MP3 trong thư mục lưu trữ.
- **Cloud Firestore & Firebase Auth**: Kiểm tra trạng thái kết nối đám mây (Trực tuyến / Hoạt động ngoại tuyến).
- **Trình phát TTS & Âm thanh**: Kiểm tra các giọng đọc tiếng Trung có sẵn trên môi trường trình duyệt.

### 2. Các Mức Trạng thái
- 🟢 **Khỏe mạnh (Healthy)**: Tất cả các dịch vụ phản hồi tốt, độ trễ dưới 100ms.
- 🟡 **Giảm hiệu năng (Degraded)**: Một số dịch vụ có độ trễ cao hoặc hoạt động ở chế độ dự phòng.
- 🔴 **Gặp sự cố (Unavailable)**: Có dịch vụ không thể kết nối hoặc phát sinh lỗi nghiêm trọng.

### 3. Nút Kiểm tra Lại Tức thì (Re-check)
Bất cứ lúc nào nghi ngờ có sự cố, Admin có thể nhấn nút **Kiểm tra sức khỏe ngay** để kích hoạt luồng thăm dò thời gian thực (Live Probe).`,
  },
  {
    id: 'guide-9-troubleshooting-errors',
    slug: 'troubleshooting-common-errors',
    title: 'Xử lý & Khắc phục Sự cố Phổ biến (Troubleshooting Common Errors)',
    category: 'Hệ thống',
    description: 'Danh mục các mã lỗi thường gặp (403 Forbidden, 404 Missing Resource, lỗi âm thanh TTS, lỗi bộ nhớ đệm) và quy trình xử lý dứt điểm.',
    order: 9,
    isPublished: true,
    author: 'Ban Kỹ Thuật HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `### 1. Lỗi 403 Forbidden khi Truy cập Trang Quản trị
- **Nguyên nhân**: Tài khoản chưa được gán vai trò \`admin\` trong cơ sở dữ liệu hoặc phiên đăng nhập đã hết hạn.
- **Khắc phục**:
  1. Kiểm tra tài khoản trong \`.data/users.json\`.
  2. Đảm bảo trường \`role\` có giá trị là \`admin\`.
  3. Đăng xuất và đăng nhập lại để làm mới phiên bảo mật.

### 2. Không Nghe được Giọng đọc Tiếng Trung (TTS Audio)
- **Nguyên nhân**: Trình duyệt trên thiết bị chưa tải xong gói giọng đọc Web Speech API hoặc người dùng tắt âm thanh.
- **Khắc phục**:
  1. Vào phần Cài đặt của trang, chọn giọng đọc khuyên dùng (ví dụ: Google 國語 hoặc Microsoft Xiaoxiao).
  2. Bấm nút Nghe thử. Trên Chrome/Safari, giọng đọc sẽ tự động nạp sau khoảng 1-2 giây.

### 3. Tệp Đề thi Bị Lỗi 404 Không Tải Được
- **Nguyên nhân**: Tệp PDF hoặc MP3 chưa được chép vào đúng thư mục \`public/exam-files/pdf/\` hoặc \`public/exam-files/audio/\`.
- **Khắc phục**: Sử dụng tính năng quét liên kết hỏng trong tab **Kho đề thi** để xác định chính xác tên file bị thiếu và tải bổ sung lên máy chủ.`,
  },
  {
    id: 'guide-10-security-audit-logs',
    slug: 'security-permissions-and-audit-logs',
    title: 'An ninh, Quyền hạn & Nhật ký Kiểm toán (Security, Permissions, and Audit Logs)',
    category: 'Bảo mật',
    description: 'Nguyên tắc phân quyền tối thiểu, cơ chế kiểm tra token ở server và cách tra cứu lịch sử hành động trong Nhật ký Kiểm toán.',
    order: 10,
    isPublished: true,
    author: 'Ban An Ninh Hệ Thống HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `### 1. Nguyên tắc Phân quyền Tối thiểu (Principle of Least Privilege)
- Mọi API trong \`/api/admin/*\` đều bắt buộc phải chạy qua hàm xác thực \`authenticateAdmin(request)\` phía Server.
- Không bao giờ tin tưởng quyền hạn do Client tự gửi lên nếu không có chữ ký số (Token) hợp lệ.

### 2. Nhật ký Kiểm toán (Audit Logs)
Nhật ký kiểm toán lưu lại lịch sử đầy đủ của các hành vi nhạy cảm:
- **Thời gian (Timestamp)**: Thời điểm chính xác xảy ra hành động.
- **Tác nhân (Actor)**: Email của Quản trị viên thực hiện.
- **Hành động (Action)**: Thêm/Sửa/Xóa từ vựng, Khóa tài khoản, Đổi quyền, Cập nhật đề thi, Thay đổi cấu hình hệ thống.
- **Đối tượng tác động (Target)**: ID hoặc tên của tài nguyên bị thay đổi.
- **Chi tiết (Details)**: Nội dung dữ liệu trước và sau khi thay đổi.

### 3. Bất biến Dữ liệu Kiểm toán
Admin thông thường không được phép xóa hoặc chỉnh sửa nội dung trong Nhật ký Kiểm toán nhằm phục vụ điều tra sự cố khi cần thiết.`,
  },
  {
    id: 'guide-11-backup-and-recovery',
    slug: 'backup-and-recovery-procedures',
    title: 'Quy trình Sao lưu & Khôi phục Dữ liệu (Backup and Recovery Procedures)',
    category: 'Vận hành',
    description: 'Quy trình xuất bản sao lưu định kỳ, bảo vệ cơ sở dữ liệu .data/ và cách phục hồi hệ thống khi gặp sự cố máy chủ.',
    order: 11,
    isPublished: true,
    author: 'Ban Vận Hành HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `### 1. Cấu trúc Thư mục Dữ liệu Cần Sao lưu
Cơ sở dữ liệu cục bộ được lưu trong thư mục \`.data/\`:
- \`system_vocab.json\`: 11,000+ từ vựng chuẩn HSK 1–9.
- \`exams.json\`: 65 bộ tài liệu đề thi và thông số metadata.
- \`users.json\`: Danh mục người dùng và phân quyền.
- \`topics.json\`: Danh sách các chủ đề từ vựng.
- \`system_config.json\`: Cấu hình toàn bộ nền tảng.
- \`audit_logs.json\`: Toàn bộ lịch sử thao tác của Admin.

### 2. Quy trình Sao lưu Định kỳ (Backup Routine)
1. Thực hiện sao lưu định kỳ hàng tuần hoặc trước mỗi đợt nâng cấp hệ thống lớn.
2. Nén toàn bộ thư mục \`.data/\` và \`public/exam-files/\` thành tệp \`.tar.gz\` hoặc \`.zip\`.
3. Lưu trữ bản sao lưu tại một vị trí an toàn (Cloud Storage độc lập hoặc máy chủ lưu trữ thứ hai).

### 3. Quy trình Phục hồi Dữ liệu (Disaster Recovery)
1. Dừng ứng dụng Next.js.
2. Giải nén bản sao lưu vào thư mục \`.data/\`.
3. Khởi động lại ứng dụng và vào trang Quản trị kiểm tra tab **Sức khỏe Hệ thống** để đảm bảo tất cả các file JSON được nạp đầy đủ.`,
  },
  {
    id: 'guide-12-frequently-asked-questions',
    slug: 'frequently-asked-questions-faq',
    title: 'Câu hỏi Thường gặp Dành cho Quản trị viên (Frequently Asked Questions - FAQ)',
    category: 'Hỗ trợ',
    description: 'Tổng hợp các câu hỏi và tình huống thắc mắc thường gặp nhất trong quá trình quản trị và vận hành ứng dụng HSK Master.',
    order: 12,
    isPublished: true,
    author: 'Ban Hỗ Trợ Kỹ Thuật HSK Master',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
    content: `### Q1: Làm thế nào để thêm một đề thi mới vào thư viện?
**Trả lời**:
1. Đặt file PDF vào \`public/exam-files/pdf/ten_file.pdf\` và file Audio vào \`public/exam-files/audio/ten_file.mp3\`.
2. Vào trang Admin ➔ Mục **Kho đề thi (Exams)** ➔ Bấm **Thêm đề thi mới**.
3. Điền tiêu đề, cấp độ HSK và nhập đường dẫn file tương ứng, sau đó bấm Lưu.

### Q2: Tại sao học viên báo không nghe được file Audio trên điện thoại?
**Trả lời**:
Hầu hết các trình duyệt di động (iOS Safari, Android Chrome) yêu cầu người dùng phải chạm trực tiếp vào màn hình trước khi âm thanh được phép phát tự động. Học viên chỉ cần chạm vào nút **Nghe MP3** trên thanh điều khiển.

### Q3: Bật/Tắt tính năng Cộng đồng Zalo ở đâu?
**Trả lời**:
Vào tab **Cài đặt hệ thống** trong trang Quản trị, tìm phần **Cộng đồng Zalo**, bật công tắc sang trạng thái Bật và dán đường link nhóm Zalo của bạn, sau đó nhấn **Lưu cấu hình**.

### Q4: Nếu vô tình xóa một từ vựng chuẩn thì có khôi phục được không?
**Trả lời**:
Mỗi thao tác xóa từ đều được ghi vào Audit Logs kèm mã ID và nội dung từ vựng. Bạn có thể tra cứu lại trong Audit Logs hoặc dùng tính năng khôi phục từ tệp sao lưu \`system_vocab.json\`.`,
  },
];
