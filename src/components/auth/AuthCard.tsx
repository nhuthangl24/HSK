'use client';

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface AuthCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
  className?: string;
}

export function AuthCard({
  title = 'Đăng Nhập Để Tiếp Tục',
  subtitle = 'Đăng nhập để lưu tiến độ, đồng bộ dữ liệu và theo dõi chuỗi ngày học của bạn.',
  icon,
  initialMode = 'login',
  onSuccess,
  className = '',
}: AuthCardProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register, loginWithGoogle, resetPassword } = useAuth();
  const toast = useToast();

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        toast.success('Đăng nhập Google thành công!', 'Chào mừng bạn');
        onSuccess?.();
      } else {
        setError(res.message || 'Đăng nhập Google không thành công.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email');
      return;
    }

    if (mode === 'forgot_password') {
      setIsSubmitting(true);
      try {
        const res = await resetPassword(email);
        if (res.success) {
          setResetSent(true);
          toast.success('Đã gửi email khôi phục mật khẩu!', 'Kiểm tra hộp thư');
        } else {
          setError(res.message || 'Không thể gửi email khôi phục. Vui lòng kiểm tra lại địa chỉ email.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.success) {
          toast.success('Đăng nhập thành công!', 'Thành công');
          onSuccess?.();
        } else {
          setError(res.message || 'Email hoặc mật khẩu không chính xác');
        }
      } else {
        const res = await register(name, email, password);
        if (res.success) {
          toast.success('Đăng ký tài khoản thành công!', 'Thành công');
          onSuccess?.();
        } else {
          setError(res.message || 'Đăng ký không thành công. Vui lòng thử lại.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`max-w-[420px] w-full bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xl p-6 sm:p-8 space-y-4.5 text-left transition-colors ${className}`}
    >
      {/* Icon & Title Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-13 h-13 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
          {icon || <Lock size={24} />}
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-sm">
          {subtitle}
        </p>
      </div>

      {/* Mode switcher tabs */}
      {mode !== 'forgot_password' ? (
        <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setResetSent(false);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setResetSent(false);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            Đăng ký mới
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
            setResetSent(false);
          }}
          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
        >
          <ArrowLeft size={13} />
          <span>Quay lại đăng nhập</span>
        </button>
      )}

      {/* Google Login */}
      {mode !== 'forgot_password' && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10.5px] uppercase tracking-wider">
              <span className="bg-white dark:bg-zinc-900 px-3 text-slate-400 dark:text-zinc-500 font-bold select-none">
                hoặc email
              </span>
            </div>
          </div>
        </>
      )}

      {/* Reset password success banner */}
      {resetSent && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span>
            Đã gửi liên kết khôi phục đến <strong className="font-semibold">{email}</strong>. Vui lòng kiểm tra hộp thư đến hoặc thư rác.
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Họ và tên
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none">
                <UserIcon size={14} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
            Địa chỉ Email
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none">
              <Mail size={14} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        {mode !== 'forgot_password' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                Mật khẩu
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setError('');
                    setResetSent(false);
                  }}
                  className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
                >
                  Quên mật khẩu?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none">
                <Lock size={14} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer p-0.5 rounded transition-colors"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all disabled:opacity-60 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/25 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : mode === 'login' ? (
            <>
              <span>Đăng nhập ngay</span>
              <ArrowRight size={14} />
            </>
          ) : mode === 'register' ? (
            <>
              <span>Tạo tài khoản học tập</span>
              <ArrowRight size={14} />
            </>
          ) : (
            <>
              <span>Gửi liên kết khôi phục</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
