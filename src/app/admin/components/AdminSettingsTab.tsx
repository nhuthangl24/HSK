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
  CheckCircle2,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { SystemConfig } from '@/types/auth';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getClientAuthHeaders } from '@/lib/client-auth';
import { saveSystemConfigToFirestore, loadSystemConfigFromFirestore } from '@/lib/firebase-db';
import { ZaloIcon } from '@/components/ui/ZaloIcon';

const DEFAULT_CONFIG: SystemConfig = {
  platformName: 'HSK Interactive Sheet',
  platformDescription: 'Nền tảng học và ôn tập từ vựng tiếng Trung đa tương tác chuẩn HSK 1 - 9',
  allowRegistration: true,
  maintenanceMode: false,
  maxImportBatchSize: 500,
  defaultTargetHsk: 3,
  zaloCommunityEnabled: false,
  zaloCommunityUrl: 'https://zalo.me/g/urwxu6t93bwfnjkzeuok',
  zaloCommunityTitle: 'Tham gia Cộng Đồng Zalo',
  zaloCommunityDescription: 'Hỏi đáp & cùng luyện thi HSK mỗi ngày',
  updatedAt: '2026-10-18T00:00:00.000Z',
};

export default function AdminSettingsTab() {
  const toast = useToast();
  const { user } = useAuth();
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      let localCfg = DEFAULT_CONFIG;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hsk_system_config');
        if (stored) {
          try {
            localCfg = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
          } catch {}
        }
      }

      // Firestore config
      const fsCfg = await loadSystemConfigFromFirestore();
      if (fsCfg) {
        localCfg = { ...localCfg, ...(fsCfg as Partial<SystemConfig>) };
      } else {
        const authHeaders = getClientAuthHeaders(user);
        const res = await fetch('/api/admin/settings', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            localCfg = { ...localCfg, ...data.config };
          }
        }
      }

      setConfig(localCfg);
    } catch (err) {
      console.warn('Config fetch warning:', err);
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
      const updated = {
        ...config,
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_system_config', JSON.stringify(updated));
      }

      await saveSystemConfigToFirestore(updated as unknown as Record<string, unknown>).catch(
        (err) => console.warn('Firestore config save warning:', err)
      );

      const authHeaders = getClientAuthHeaders(user);
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updated),
      }).catch(() => null);

      setConfig(updated);
      toast.success('Đã lưu cấu hình hệ thống thành công');
    } catch {
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Sliders size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Cài Đặt & Cấu Hình Nền Tảng
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                Vận hành hệ thống
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Điều chỉnh các tham số toàn cục, kênh hỗ trợ cộng đồng, kiểm soát đăng ký và chế độ bảo trì nền tảng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-zinc-700/60 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-emerald-500' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 1: Community Zalo Channel */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <ZaloIcon className="w-6 h-6 rounded-lg shadow-2xs" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  Kênh Kết Nối Cộng Đồng Zalo
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Hiển thị liên kết nhóm Zalo trên thanh bên trái (Sidebar) để học viên tham gia học tập.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={Boolean(config.zaloCommunityEnabled)}
                onChange={(e) => setConfig({ ...config, zaloCommunityEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Tiêu đề nút Zalo
              </label>
              <input
                type="text"
                value={config.zaloCommunityTitle || ''}
                onChange={(e) => setConfig({ ...config, zaloCommunityTitle: e.target.value })}
                placeholder="Tham gia Cộng Đồng Zalo"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Liên kết nhóm Zalo (URL)
              </label>
              <input
                type="text"
                value={config.zaloCommunityUrl || ''}
                onChange={(e) => setConfig({ ...config, zaloCommunityUrl: e.target.value })}
                placeholder="https://zalo.me/g/..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Mô tả phụ dưới nút
              </label>
              <input
                type="text"
                value={config.zaloCommunityDescription || ''}
                onChange={(e) => setConfig({ ...config, zaloCommunityDescription: e.target.value })}
                placeholder="Hỏi đáp & cùng luyện thi HSK mỗi ngày"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Platform Identity */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <Sliders size={16} className="text-emerald-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              Thông Số Nền Tảng & Thương Hiệu
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Tên nền tảng
              </label>
              <input
                type="text"
                value={config.platformName}
                onChange={(e) => setConfig({ ...config, platformName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Cấp độ mục tiêu mặc định
              </label>
              <select
                value={config.defaultTargetHsk}
                onChange={(e) => setConfig({ ...config, defaultTargetHsk: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              >
                {[1, 2, 3, 4, 5, 6].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Mục tiêu HSK {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Mô tả giới thiệu nền tảng
              </label>
              <textarea
                rows={2}
                value={config.platformDescription}
                onChange={(e) => setConfig({ ...config, platformDescription: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Access & Security Controls */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <Shield size={16} className="text-emerald-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              Bảo Mật & Kiểm Soát Truy Cập
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  Cho phép đăng ký tài khoản mới
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Khi tắt, học viên mới sẽ không thể tạo tài khoản qua cổng xác thực.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.allowRegistration}
                  onChange={(e) => setConfig({ ...config, allowRegistration: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  Chế độ bảo trì hệ thống
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Khi bật, toàn bộ học viên sẽ thấy thông báo bảo trì nâng cấp máy chủ.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.maintenanceMode}
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
              </label>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
