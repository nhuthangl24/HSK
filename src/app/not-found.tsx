import React from 'react';
import Link from 'next/link';
import { Home, BookOpen, MessageCircle, Sparkles, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-slate-50 to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-400/15 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-teal-400/15 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-md w-full text-center relative z-10 space-y-6">
        {/* Cute Mascot Avatar with Bamboo & Hearts */}
        <div className="relative inline-block mx-auto">
          {/* Animated Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 blur-lg opacity-40 animate-pulse" />

          {/* Panda Card */}
          <div className="relative w-36 h-36 mx-auto rounded-full bg-white dark:bg-slate-800 shadow-xl border-4 border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-7xl select-none transform hover:scale-105 transition-transform duration-300">
            <span role="img" aria-label="Cute Panda">🐼</span>

            {/* Bamboo branch badge */}
            <div className="absolute -bottom-2 -right-2 w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-xl shadow-md border-2 border-white dark:border-slate-800 animate-bounce">
              🎋
            </div>

            {/* Sparkle badge */}
            <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-800">
              <Sparkles size={14} className="text-white fill-white" />
            </div>
          </div>
        </div>

        {/* Status code & Chinese idiom */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Compass size={13} className="text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span>404 • 迷路了吗？(Mílù le ma?)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Ui cha, bạn đi lạc rồi à?
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
            Trang bạn đang tìm không tồn tại hoặc đã được chuyển dời. Chắc chú gấu trúc mải gặm măng trúc nên dẫn bạn đi nhầm vào rừng rồi ~
          </p>
        </div>

        {/* Cute Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Home size={16} />
            <span>Về Trang Chủ Học Tiếp</span>
          </Link>

          <Link
            href="/?filter=all"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <BookOpen size={16} className="text-emerald-600" />
            <span>Xem Kho Từ Vựng</span>
          </Link>
        </div>

        {/* Helpful Footnote */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-4">
          <Link
            href="/admin"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Trang Quản trị (Admin)
          </Link>
          <span>•</span>
          <a
            href="https://zalo.me/g/vtdrsq845"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
          >
            <MessageCircle size={12} className="text-[#0068FF]" />
            Hỏi cộng đồng Zalo
          </a>
        </div>
      </main>
    </div>
  );
}
