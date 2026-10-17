'use client';

import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  Lock,
  User as UserIcon,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
}: AuthModalProps) {
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

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        toast.success('Đăng nhập Google thành công!', 'Chào mừng bạn');
        onClose();
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
          onClose();
        } else {
          setError(res.message || 'Email hoặc mật khẩu không chính xác');
        }
      } else {
        const res = await register(name, email, password);
        if (res.success) {
          toast.success('Đăng ký tài khoản thành công!', 'Thành công');
          onClose();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/20 max-w-[410px] w-full border border-slate-100 p-6 sm:p-7 relative animate-scaleIn">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          title="Đóng cửa sổ"
        >
          <X size={18} />
        </button>

        {/* Tiêu đề & Logo Brand */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {mode === 'login'
                ? 'Chào mừng bạn trở lại'
                : mode === 'register'
                ? 'Tạo tài khoản học tập'
                : 'Khôi phục mật khẩu'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login'
                ? 'Đăng nhập để đồng bộ tiến độ và từ vựng HSK'
                : mode === 'register'
                ? 'Bắt đầu lộ trình học từ vựng tiếng Trung tương tác'
                : 'Nhập email để nhận liên kết đặt lại mật khẩu'}
            </p>
          </div>
        </div>

        {/* Tabs chuyển đổi Đăng nhập / Đăng ký (ẩn khi đang khôi phục mật khẩu) */}
        {mode !== 'forgot_password' ? (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4.5 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setResetSent(false);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
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
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
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
            className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold mb-4 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Quay lại đăng nhập</span>
          </button>
        )}

        {/* Nút Đăng nhập Google (chỉ hiển thị ở chế độ đăng nhập / đăng ký) */}
        {mode !== 'forgot_password' && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
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

            {/* Divider thanh lịch, không bị rớt dòng */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white px-3 text-slate-400 font-semibold select-none">
                  hoặc tiếp tục với email
                </span>
              </div>
            </div>
          </>
        )}

        {/* Thông báo gửi thành công link reset */}
        {resetSent && (
          <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 leading-relaxed animate-fadeIn">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Đã gửi liên kết khôi phục mật khẩu đến <strong className="font-semibold">{email}</strong>. Vui lòng kiểm tra hộp thư đến (inbox) hoặc thư rác (spam).
            </span>
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="mb-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2 leading-relaxed animate-fadeIn">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Form Email / Mật khẩu */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Họ và tên
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <UserIcon size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all shadow-2xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Địa chỉ Email
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Mail size={15} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all shadow-2xs"
              />
            </div>
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
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
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded transition-colors"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-1.5 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all disabled:opacity-60 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/25 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : mode === 'login' ? (
              <>
                <span>Đăng nhập</span>
                <ArrowRight size={15} />
              </>
            ) : mode === 'register' ? (
              <>
                <span>Tạo tài khoản học tập</span>
                <ArrowRight size={15} />
              </>
            ) : (
              <>
                <span>Gửi liên kết khôi phục</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Chuyển đổi chân trang */}
        {mode !== 'forgot_password' && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <span>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer hover:underline"
                >
                  Đăng ký miễn phí
                </button>
              </span>
            ) : (
              <span>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer hover:underline"
                >
                  Đăng nhập ngay
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
