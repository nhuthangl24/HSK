'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Shield,
  Save,
  RefreshCw,
  AlertTriangle,
  Sliders,
  Database,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { SystemConfig } from '@/types/auth';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';
import { saveSystemConfigToFirestore, loadSystemConfigFromFirestore } from '@/lib/firebase-db';

export default function AdminSettingsTab() {
  const toast = useToast();
  const { user } = useAuth();
  const [config, setConfig] = useState<SystemConfig>({
    platformName: 'HSK Interactive Sheet',
    platformDescription: 'Nền tảng học và ôn tập từ vựng tiếng Trung đa tương tác chuẩn HSK 1 - 9',
    allowRegistration: true,
    maintenanceMode: false,
    maxImportBatchSize: 500,
    defaultTargetHsk: 3,
    zaloCommunityEnabled: true,
    zaloCommunityUrl: 'https://zalo.me/g/vtdrsq845',
    zaloCommunityTitle: 'Tham gia Cộng Đồng Zalo',
    zaloCommunityDescription: 'Hỏi đáp & cùng luyện thi HSK mỗi ngày',
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/admin/settings', {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfig((prev) => ({ ...prev, ...data.config }));
        }
      }
      // Firestore fallback
      const firestoreConfig = await loadSystemConfigFromFirestore();
      if (firestoreConfig) {
        setConfig((prev) => ({ ...prev, ...firestoreConfig }));
      }
    } catch (err) {
      console.error('Fetch system config error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const authHeaders = getClientAuthHeaders(user);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(config),
      });
      const data = await res.json();

      // Sync directly to Firestore for serverless persistence
      await saveSystemConfigToFirestore(config as unknown as Record<string, unknown>);

      if (data.success && data.config) {
        setConfig((prev) => ({ ...prev, ...data.config }));
        toast.success('Đã lưu cấu hình hệ thống thành công!', 'Cài đặt nền tảng');
      } else {
        toast.success('Đã lưu cấu hình lên cơ sở dữ liệu Cloud!', 'Cài đặt nền tảng');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu cập nhật.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="text-emerald-600" size={22} />
            Cài Đặt & Cấu Hình Nền Tảng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Điều chỉnh tham số vận hành, nút cộng đồng Zalo, bảo mật đăng ký và các thông số hoạt động của toàn hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchConfig}
          className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 cursor-pointer font-semibold transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Đang tải cấu hình hệ thống...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Zalo Community Settings */}
          <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-2xs space-y-4 ring-1 ring-blue-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0068FF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  Z
                </div>
                Cấu hình Nút Cộng Đồng Zalo (Sidebar)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Tính năng mới
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Toggle Enable */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageCircle size={15} className="text-[#0068FF]" />
                    Bật / Tắt nút &quot;Tham gia Cộng Đồng Zalo&quot; trên thanh bên
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Khi bật, toàn bộ học viên và khách truy cập sẽ nhìn thấy nút tham gia nhóm Zalo ở thanh bên trái (Sidebar).
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={config.zaloCommunityEnabled ?? true}
                    onChange={(e) => setConfig({ ...config, zaloCommunityEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0068FF]" />
                </label>
              </div>

              {/* Zalo URL */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đường link Nhóm Zalo (Link mời / Tham gia nhóm) *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={config.zaloCommunityUrl || ''}
                    onChange={(e) => setConfig({ ...config, zaloCommunityUrl: e.target.value })}
                    placeholder="https://zalo.me/g/..."
                    className="w-full px-3 py-2.5 pr-20 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden font-mono text-xs"
                  />
                  {config.zaloCommunityUrl && (
                    <a
                      href={config.zaloCommunityUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-semibold transition-colors"
                    >
                      <ExternalLink size={11} />
                      Mở thử
                    </a>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Link dẫn vào nhóm Zalo học tập để học viên bấm vào là tham gia ngay trên điện thoại hoặc máy tính.
                </span>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tiêu đề nút hiển thị
                  </label>
                  <input
                    type="text"
                    value={config.zaloCommunityTitle || 'Tham gia Cộng Đồng Zalo'}
                    onChange={(e) => setConfig({ ...config, zaloCommunityTitle: e.target.value })}
                    placeholder="Ví dụ: Tham gia Cộng Đồng Zalo"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mô tả phụ
                  </label>
                  <input
                    type="text"
                    value={config.zaloCommunityDescription || 'Hỏi đáp & cùng luyện thi HSK mỗi ngày'}
                    onChange={(e) => setConfig({ ...config, zaloCommunityDescription: e.target.value })}
                    placeholder="Ví dụ: Hỏi đáp & cùng luyện thi HSK"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Xem trước giao diện nút trên thanh bên (Live Preview):
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-emerald-500/10 border border-blue-200 dark:border-blue-800 rounded-2xl max-w-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0068FF] to-[#0091FF] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-blue-500/25">
                      Z
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span>{config.zaloCommunityTitle || 'Tham gia Cộng Đồng Zalo'}</span>
                        <ExternalLink size={11} className="text-blue-500 shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {config.zaloCommunityDescription || 'Hỏi đáp & cùng luyện thi HSK'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* General Platform Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database size={16} className="text-emerald-600" />
              Thông tin chung nền tảng
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên hiển thị của nền tảng *
                </label>
                <input
                  type="text"
                  required
                  value={config.platformName}
                  onChange={(e) => setConfig({ ...config, platformName: e.target.value })}
                  placeholder="Ví dụ: HSK Interactive Sheet"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô tả nền tảng
                </label>
                <textarea
                  value={config.platformDescription || ''}
                  onChange={(e) => setConfig({ ...config, platformDescription: e.target.value })}
                  rows={2}
                  placeholder="Mô tả tóm tắt ứng dụng..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>
          </div>

          {/* Access & Registration Controls */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield size={16} className="text-emerald-600" />
              Quyền truy cập & Đăng ký tài khoản
            </h3>

            <div className="space-y-4 text-xs">
              {/* Allow Registration Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">Cho phép công khai đăng ký tài khoản mới</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Khi tắt, người dùng mới sẽ không thể đăng ký tài khoản qua form hoặc Google Auth.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.allowRegistration}
                    onChange={(e) => setConfig({ ...config, allowRegistration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50/50 border border-rose-100">
                <div>
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-600" />
                    Chế độ bảo trì hệ thống (Maintenance Mode)
                  </div>
                  <div className="text-[11px] text-rose-700/80 mt-0.5">
                    Khi bật, chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập ứng dụng.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600" />
                </label>
              </div>
            </div>
          </div>

          {/* Operating Limits & Defaults */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders size={16} className="text-emerald-600" />
              Thông số vận hành & Mặc định
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Giới hạn số từ mỗi lượt Paste / Import hàng loạt
                </label>
                <input
                  type="number"
                  min={10}
                  max={2000}
                  value={config.maxImportBatchSize}
                  onChange={(e) => setConfig({ ...config, maxImportBatchSize: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Khuyến nghị: 500 từ/lần</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mục tiêu HSK mặc định cho học viên mới
                </label>
                <select
                  value={config.defaultTargetHsk}
                  onChange={(e) => setConfig({ ...config, defaultTargetHsk: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-hidden bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                    <option key={lvl} value={lvl}>HSK {lvl}</option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">Tự động gán khi tài khoản vừa tạo</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? 'Đang lưu cấu hình...' : 'Lưu tất cả thay đổi'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
