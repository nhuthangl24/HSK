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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#e2e8f0] dark:border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0f172a] dark:text-white">
              Cài Đặt & Cấu Hình Nền Tảng
            </h1>
            <span className="px-2 py-0.5 text-[10.5px] font-bold text-[#047857] dark:text-[#34d399] bg-[#ecfdf5] dark:bg-[#064e3b]/40 rounded border border-[#a7f3d0] dark:border-[#065f46]">
              Vận hành hệ thống
            </span>
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
            Điều chỉnh các tham số toàn cục, kênh hỗ trợ cộng đồng, kiểm soát đăng ký và chế độ bảo trì nền tảng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#334155] dark:text-[#cbd5e1] bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-lg hover:bg-[#f8fafc] dark:hover:bg-[#334155]/60 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 1: Community Zalo Channel */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] dark:border-[#1e293b]">
            <div className="flex items-center gap-2">
              <ZaloIcon className="w-5 h-5 rounded shadow-2xs" />
              <div>
                <h3 className="text-xs font-bold text-[#0f172a] dark:text-white">
                  Kênh Kết Nối Cộng Đồng Zalo
                </h3>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
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
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#047857]" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                Tiêu đề nút Zalo
              </label>
              <input
                type="text"
                value={config.zaloCommunityTitle || ''}
                onChange={(e) => setConfig({ ...config, zaloCommunityTitle: e.target.value })}
                placeholder="Tham gia Cộng Đồng Zalo"
                className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                Liên kết nhóm Zalo (URL)
              </label>
              <input
                type="text"
                value={config.zaloCommunityUrl || ''}
                onChange={(e) => setConfig({ ...config, zaloCommunityUrl: e.target.value })}
                placeholder="https://zalo.me/g/..."
                className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                Mô tả phụ dưới nút
              </label>
              <input
                type="text"
                value={config.zaloCommunityDescription || ''}
                onChange={(e) => setConfig({ ...config, zaloCommunityDescription: e.target.value })}
                placeholder="Hỏi đáp & cùng luyện thi HSK mỗi ngày"
                className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Platform Identity */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f1f5f9] dark:border-[#1e293b]">
            <Sliders size={16} className="text-[#047857]" />
            <h3 className="text-xs font-bold text-[#0f172a] dark:text-white">
              Thông Số Nền Tảng & Thương Hiệu
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                Tên nền tảng
              </label>
              <input
                type="text"
                value={config.platformName}
                onChange={(e) => setConfig({ ...config, platformName: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                Cấp độ mục tiêu mặc định
              </label>
              <select
                value={config.defaultTargetHsk}
                onChange={(e) => setConfig({ ...config, defaultTargetHsk: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
              >
                {[1, 2, 3, 4, 5, 6].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Mục tiêu HSK {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#475569] dark:text-[#cbd5e1] uppercase tracking-wider mb-1">
                Mô tả giới thiệu nền tảng
              </label>
              <textarea
                rows={2}
                value={config.platformDescription}
                onChange={(e) => setConfig({ ...config, platformDescription: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#334155] rounded-lg focus:outline-hidden focus:border-[#047857]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Access & Security Controls */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f1f5f9] dark:border-[#1e293b]">
            <Shield size={16} className="text-[#047857]" />
            <h3 className="text-xs font-bold text-[#0f172a] dark:text-white">
              Bảo Mật & Kiểm Soát Truy Cập
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155]">
              <div>
                <div className="text-xs font-bold text-[#0f172a] dark:text-white">
                  Cho phép đăng ký tài khoản mới
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
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
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#047857]" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155]">
              <div>
                <div className="text-xs font-bold text-[#0f172a] dark:text-white">
                  Chế độ bảo trì hệ thống
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
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
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
              </label>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#047857] hover:bg-[#059669] rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
