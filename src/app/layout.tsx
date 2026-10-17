import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hsks-a320f.web.app";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HSK Master - Bảng Từ Vựng Tiếng Trung HSK 1 - 9 Tương Tác",
    template: "%s | HSK Master",
  },
  description:
    "Nền tảng học và ôn tập từ vựng tiếng Trung HSK 1 - 9 phong cách bảng tính Excel / Google Sheets thông minh. Luyện nhớ chữ Hán, phát âm chuẩn pinyin bản ngữ, luyện dịch câu và thuật toán lặp lại ngắt quãng Spaced Repetition (SRS).",
  keywords: [
    "HSK",
    "học tiếng Trung",
    "từ vựng HSK",
    "HSK 1",
    "HSK 2",
    "HSK 3",
    "HSK 4",
    "HSK 5",
    "HSK 6",
    "HSK 7-9",
    "bảng từ vựng HSK",
    "luyện thi HSK",
    "tiếng Trung giao tiếp",
    "ôn tập chữ Hán",
    "phiên âm pinyin",
    "spaced repetition tiếng Trung",
    "flashcard HSK",
    "học chữ Hán online",
    "bảng tính tiếng Trung Excel",
  ],
  authors: [{ name: "HSK Master Team" }],
  creator: "HSK Master",
  publisher: "HSK Master",
  applicationName: "HSK Master",
  category: "education",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HSK Master - Bảng Từ Vựng Tiếng Trung HSK 1 - 9 Tương Tác",
    description:
      "Học và ôn tập từ vựng tiếng Trung HSK 1 - 9 phong cách bảng tính Excel / Google Sheets thông minh. Ghi nhớ chữ Hán, phát âm pinyin, luyện dịch và thuật toán SRS.",
    url: siteUrl,
    siteName: "HSK Master",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HSK Master - Bảng Từ Vựng Tiếng Trung Tương Tác",
        type: "image/png",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HSK Master - Bảng Từ Vựng Tiếng Trung HSK 1 - 9 Tương Tác",
    description:
      "Học và ôn tập từ vựng tiếng Trung HSK 1 - 9 phong cách bảng tính Excel / Google Sheets thông minh. Ghi nhớ chữ Hán, phát âm pinyin, luyện dịch và thuật toán SRS.",
    images: ["/og-image.png"],
    creator: "@hskmaster",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "HSK Master",
      url: siteUrl,
      description:
        "Nền tảng học và ôn tập từ vựng tiếng Trung HSK 1 - 9 phong cách bảng tính Excel / Google Sheets thông minh.",
      applicationCategory: "EducationalApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "VND",
      },
      featureList: [
        "Toàn bộ kho từ vựng chuẩn HSK 1 đến HSK 9",
        "Ôn tập chữ Hán và kiểm tra gõ chữ Hán trực tiếp",
        "Phát âm audio chuẩn pinyin",
        "Luyện tập dịch câu ví dụ",
        "Thuật toán lặp lại ngắt quãng Spaced Repetition (SRS)",
        "Tạo bộ từ vựng cá nhân không giới hạn",
        "Nhập/Xuất file Excel và CSV",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "HSK Master",
      description: "Bảng từ vựng tiếng Trung HSK 1 - 9 tương tác thông minh",
      inLanguage: ["vi-VN", "zh-CN"],
    },
    {
      "@type": "Course",
      "@id": `${siteUrl}/#course`,
      name: "Lộ Trình Từ Vựng Tiếng Trung HSK 1 - HSK 9 Chuẩn Quốc Tế",
      description:
        "Lộ trình học và ghi nhớ toàn diện trọn bộ 11,000 từ vựng tiếng Trung chuẩn HSK 3.0 từ sơ cấp HSK 1 đến cao cấp HSK 7-9.",
      provider: {
        "@type": "Organization",
        name: "HSK Master",
        url: siteUrl,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="h-full flex flex-col font-sans bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
