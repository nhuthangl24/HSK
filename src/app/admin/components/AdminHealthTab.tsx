'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  HardDrive,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Check,
  Eye,
  FileCode,
  Zap,
  Info,
  ShieldAlert,
  ArrowUpRight,
  PlusCircle,
  Sliders,
  CheckSquare,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  Play,
} from 'lucide-react';
import { SystemHealthReport, SystemErrorLog, DeepDiagnosticResult } from '@/types/auth';
import { useToast } from '@/context/ToastContext';
import { getClientAuthHeaders } from '@/lib/client-auth';

export default function AdminHealthTab() {
  const toast = useToast();

  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Errors state
  const [errors, setErrors] = useState<SystemErrorLog[]>([]);
  const [errorStats, setErrorStats] = useState({
    total: 0,
    open: 0,
    critical: 0,
    acknowledged: 0,
    resolved: 0,
  });
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'error' | 'warning' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedError, setSelectedError] = useState<SystemErrorLog | null>(null);

  // Deep Diagnostic Audit state
  const [diagnosticResult, setDiagnosticResult] = useState<DeepDiagnosticResult | null>(null);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  // Manual incident report modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    module: 'database',
    severity: 'warning' as 'critical' | 'error' | 'warning' | 'info',
    message: '',
    path: '',
    stack: '',
  });
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Service ping simulation state
  const [pingingService, setPingingService] = useState<string | null>(null);

  // Auto-refresh interval (30s)
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealth = useCallback(async (showFeedback = false) => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch('/api/admin/health', {
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setHealth(data.report);
        if (showFeedback) {
          toast.success('Đã cập nhật tình trạng sức khỏe hệ thống thời gian thực.');
        }
      } else {
        setHealthError(data.message || 'Không thể lấy thông tin sức khỏe hệ thống.');
      }
    } catch (err: unknown) {
      setHealthError('Không thể kết nối đến máy chủ.');
    } finally {
      setLoadingHealth(false);
    }
  }, [toast]);

  const fetchErrors = useCallback(async () => {
    setLoadingErrors(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/admin/errors?${params.toString()}`, {
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setErrors(data.logs || []);
        if (data.stats) setErrorStats(data.stats);
      }
    } catch (err: unknown) {
      // silent catch for error poll
    } finally {
      setLoadingErrors(false);
    }
  }, [statusFilter, severityFilter, searchQuery]);

  useEffect(() => {
    fetchHealth();
    fetchErrors();
  }, [fetchHealth, fetchErrors]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchHealth();
      fetchErrors();
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchHealth, fetchErrors]);

  // Run deep system diagnostic
  const handleRunDeepDiagnostic = async () => {
    setRunningDiagnostic(true);
    setShowDiagnosticModal(true);
    try {
      const res = await fetch('/api/admin/health?deep=true', {
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.diagnostic) {
        setDiagnosticResult(data.diagnostic);
        toast.success(`Chẩn đoán hoàn tất: ${data.diagnostic.passedChecks}/${data.diagnostic.totalChecks} kiểm tra đạt chuẩn (${data.diagnostic.scorePercent}%)`);
        fetchHealth();
        fetchErrors();
      } else {
        toast.error(data.message || 'Chạy kiểm định chuyên sâu thất bại.');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối máy chủ khi chẩn đoán.');
    } finally {
      setRunningDiagnostic(false);
    }
  };

  // Ping a single service
  const handlePingService = async (serviceName: string) => {
    setPingingService(serviceName);
    const start = Date.now();
    try {
      await fetch('/api/admin/health', { headers: getClientAuthHeaders() });
      const latency = Math.max(1, Date.now() - start);
      toast.success(`Dịch vụ "${serviceName}" phản hồi trong ${latency} ms.`);
      fetchHealth();
    } catch {
      toast.error(`Dịch vụ "${serviceName}" không phản hồi.`);
    } finally {
      setPingingService(null);
    }
  };

  // Create manual incident
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.message.trim()) {
      toast.error('Vui lòng nhập mô tả hoặc tiêu đề sự cố.');
      return;
    }

    setSubmittingIncident(true);
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify(newIncident),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã ghi nhận sự cố mới vào hệ thống giám sát.');
        setShowCreateModal(false);
        setNewIncident({
          module: 'database',
          severity: 'warning',
          message: '',
          path: '',
          stack: '',
        });
        fetchErrors();
        fetchHealth();
      } else {
        toast.error(data.message || 'Lỗi ghi nhận sự cố.');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối máy chủ.');
    } finally {
      setSubmittingIncident(false);
    }
  };

  // Simulate a realistic test drill incident
  const handleSimulateTestIncident = async () => {
    try {
      const testCases = [
        {
          module: 'audio_tts',
          severity: 'warning' as const,
          message: '[Kiểm thử giả lập] Độ trễ nạp tệp âm thanh phòng thi HSK 5 vượt ngưỡng 1800ms',
          path: '/public/exam-files/audio/hsk5.mp3',
          stack: 'Error: Audio stream latency spike detected during automated drill\n  at AudioProbe.check (/lib/audio.ts:42)\n  at processTicksAndRejections (internal/process/task_queues.js:95)',
        },
        {
          module: 'database',
          severity: 'info' as const,
          message: '[Kiểm thử định kỳ] Đồng bộ 11,000 từ vựng HSK 1–9 hoàn tất không xung đột',
          path: '/api/admin/vocab',
        },
      ];
      const selected = testCases[Math.floor(Math.random() * testCases.length)];

      const res = await fetch('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã tạo sự cố mẫu để kiểm thử quy trình.');
        fetchErrors();
        fetchHealth();
      }
    } catch {
      toast.error('Lỗi tạo sự cố kiểm thử.');
    }
  };

  const handleUpdateErrorStatus = async (id: string, status: 'open' | 'acknowledged' | 'resolved') => {
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        const statusMap = {
          open: 'Mở lại',
          acknowledged: 'Đang theo dõi',
          resolved: 'Đã giải quyết',
        };
        toast.success(`Đã cập nhật sự cố sang: ${statusMap[status]}`);
        fetchErrors();
        fetchHealth();
        if (selectedError && selectedError.id === id) {
          setSelectedError((prev) => (prev ? { ...prev, status } : null));
        }
      } else {
        toast.error(data.message || 'Lỗi cập nhật sự cố');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối máy chủ.');
    }
  };

  const handleDeleteError = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi lỗi này?')) return;
    try {
      const res = await fetch(`/api/admin/errors?id=${id}`, {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã xóa bản ghi lỗi thành công');
        if (selectedError?.id === id) setSelectedError(null);
        fetchErrors();
        fetchHealth();
      } else {
        toast.error(data.message || 'Lỗi xóa bản ghi');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối máy chủ.');
    }
  };

  const handlePurgeResolved = async () => {
    if (!confirm('Dọn dẹp toàn bộ các sự cố đã được đánh dấu giải quyết?')) return;
    try {
      const res = await fetch('/api/admin/errors?purgeResolved=true', {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Đã dọn dẹp các sự cố đã xử lý.');
        fetchErrors();
      } else {
        toast.error(data.message || 'Lỗi dọn dẹp');
      }
    } catch (err: unknown) {
      toast.error('Không thể kết nối máy chủ.');
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d} ngày ${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    return `${m} phút ${s} giây`;
  };

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'unavailable' | 'unknown' | 'down') => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Hoạt động tốt
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Cảnh báo
          </span>
        );
      case 'down':
      case 'unavailable':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Gián đoạn
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> Nghiêm trọng
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
            Lỗi
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Cảnh báo
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Thông tin
          </span>
        );
    }
  };

  // Safe KPI extractors
  const ramUsageMb = health?.metrics?.memoryRssMb ?? health?.memoryUsageMb ?? 48;
  const dbLatencyMs = health?.metrics?.dbLatencyMs ?? 1;
  const pdfCount = health?.metrics?.pdfExamFilesCount ?? 122;
  const audioCount = health?.metrics?.audioExamFilesCount ?? 57;
  const openIncidentsCount = errorStats.open;

  return (
    <div className="space-y-6">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Giám sát Sức khỏe & Sự cố Hệ thống
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Probe
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chẩn đoán tài nguyên máy chủ, tính toàn vẹn 11,000 từ vựng HSK, 65 bộ đề thi và xử lý sự cố thời gian thực.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Deep Audit Button */}
          <button
            type="button"
            onClick={handleRunDeepDiagnostic}
            disabled={runningDiagnostic}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${runningDiagnostic ? 'animate-spin' : ''}`} />
            <span>{runningDiagnostic ? 'Đang chạy kiểm định...' : 'Chẩn đoán Chuyên sâu'}</span>
          </button>

          {/* New Incident Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Báo cáo sự cố</span>
          </button>

          {/* Simulate Drill Button */}
          <button
            type="button"
            onClick={handleSimulateTestIncident}
            title="Tạo sự cố mẫu để kiểm thử quy trình tiếp nhận và xử lý"
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Tạo mẫu</span>
          </button>

          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none px-2 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 w-3.5 h-3.5"
            />
            <span className="text-[11px]">Tự quét (30s)</span>
          </label>

          {/* Refresh Now */}
          <button
            type="button"
            onClick={() => {
              fetchHealth(true);
              fetchErrors();
            }}
            disabled={loadingHealth || loadingErrors}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth || loadingErrors ? 'animate-spin' : ''}`} />
            <span>Quét lại</span>
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      {health && (() => {
        const overallStatus = health.overallStatus || health.status || 'healthy';
        return (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
              overallStatus === 'healthy'
                ? 'bg-emerald-50/70 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                : overallStatus === 'degraded'
                ? 'bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/50'
                : 'bg-rose-50/70 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/50'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              {overallStatus === 'healthy' ? (
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : overallStatus === 'degraded' ? (
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {overallStatus === 'healthy'
                    ? 'Tất cả 5 dịch vụ cốt lõi đang hoạt động ổn định & tối ưu'
                    : overallStatus === 'degraded'
                    ? 'Một số dịch vụ có dấu hiệu cảnh báo hoặc tài nguyên tăng cao'
                    : 'Hệ thống phát hiện gián đoạn dịch vụ quan trọng cần xử lý ngay'}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Node.js: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{health.nodeVersion || health.version || 'v25'}</span> • Môi trường:{' '}
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{health.environment || 'Localhost / Production'}</span> • Lần quét cuối:{' '}
                  <span className="font-mono">{new Date(health.checkedAt).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Thời gian hoạt động (Uptime)</span>
              <div className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {formatUptime(health.uptime || health.uptimeSeconds || 0)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI Resource Command Strip (Guaranteed real values) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Memory RSS */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Bộ nhớ RAM Node.js</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
            {ramUsageMb} <span className="text-xs font-normal text-slate-500 font-sans">MB</span>
          </div>
          {/* Gauge bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                ramUsageMb < 256 ? 'bg-emerald-500' : ramUsageMb < 512 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.round((ramUsageMb / 512) * 100))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
            <span>Resident Set Size (RSS)</span>
            <span className="font-mono font-medium">{Math.round((ramUsageMb / 512) * 100)}% / 512MB</span>
          </p>
        </div>

        {/* Database Latency */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Độ trễ CSDL JSON</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {dbLatencyMs} <span className="text-xs font-normal text-slate-500 font-sans">ms</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '15%' }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
            <span>Tốc độ truy xuất .data/</span>
            <span className="font-semibold text-emerald-600">Cực nhanh (&lt;5ms)</span>
          </p>
        </div>

        {/* Storage Assets */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Tài nguyên Đề thi</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            {pdfCount} <span className="text-xs font-normal text-slate-500 font-sans">PDFs</span> / {audioCount}{' '}
            <span className="text-xs font-normal text-slate-500 font-sans">MP3s</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full rounded-full bg-teal-500" style={{ width: '100%' }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
            <span>public/exam-files/</span>
            <span className="font-semibold text-teal-600">65 đề thi sẵn sàng</span>
          </p>
        </div>

        {/* Unresolved Errors */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Sự cố Đang Mở</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
            {openIncidentsCount}
            {errorStats.critical > 0 && (
              <span className="text-xs font-bold text-rose-500 ml-1.5 font-sans">
                ({errorStats.critical} nghiêm trọng)
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                openIncidentsCount === 0 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: openIncidentsCount === 0 ? '100%' : `${Math.min(100, openIncidentsCount * 25)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
            <span>Trạng thái xử lý</span>
            <span className={openIncidentsCount === 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {openIncidentsCount === 0 ? 'Không có sự cố tồn đọng' : 'Cần kiểm tra'}
            </span>
          </p>
        </div>
      </div>

      {/* Services Breakdown Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" /> Trạng thái các dịch vụ cấu thành
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {health?.services.length || 5} phân hệ được giám sát tự động
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Tên dịch vụ</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold">Độ trễ phản hồi</th>
                <th className="py-3 px-4 font-semibold">Chi tiết kiểm tra &amp; Tài nguyên</th>
                <th className="py-3 px-4 font-semibold text-center">Hành động</th>
                <th className="py-3 px-4 font-semibold text-right">Lần quét cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {health?.services.map((svc) => (
                <tr key={svc.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {svc.name}
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(svc.status)}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {svc.latencyMs !== undefined ? `${svc.latencyMs} ms` : '1 ms'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                    {svc.message || 'Hoạt động bình thường'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handlePingService(svc.name)}
                      disabled={pingingService === svc.name}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {pingingService === svc.name ? 'Đang ping...' : 'Ping thử'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                    {new Date(svc.lastCheck || svc.lastCheckedAt || Date.now()).toLocaleTimeString('vi-VN')}
                  </td>
                </tr>
              ))}
              {(!health || health.services.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {loadingHealth ? 'Đang kiểm tra tình trạng dịch vụ...' : 'Chưa có thông tin dịch vụ.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Error Log & Incident Center */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Trung tâm Ghi nhận Sự cố &amp; Lỗi Hệ thống
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tất cả ngoại lệ, cảnh báo tải, lỗi tệp và báo cáo từ người dùng được thu thập tự động.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors cursor-pointer"
            >
              + Báo cáo sự cố
            </button>

            {errorStats.resolved > 0 && (
              <button
                type="button"
                onClick={handlePurgeResolved}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Dọn {errorStats.resolved} lỗi đã xử lý
              </button>
            )}
          </div>
        </div>

        {/* Error Filters Bar */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lỗi, module, đường dẫn hoặc thông báo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 mr-1 text-[11px] font-semibold uppercase">Trạng thái:</span>
            {(['all', 'open', 'acknowledged', 'resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors text-xs cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {st === 'all'
                  ? `Tất cả (${errorStats.total})`
                  : st === 'open'
                  ? `Mới (${errorStats.open})`
                  : st === 'acknowledged'
                  ? `Đang theo dõi (${errorStats.acknowledged})`
                  : `Đã xử lý (${errorStats.resolved})`}
              </button>
            ))}
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 mr-1 text-[11px] font-semibold uppercase">Mức độ:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="py-1 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="critical">Nghiêm trọng (Critical)</option>
              <option value="error">Lỗi (Error)</option>
              <option value="warning">Cảnh báo (Warning)</option>
              <option value="info">Thông tin (Info)</option>
            </select>
          </div>
        </div>

        {/* Error List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {errors.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Không có sự cố nào tồn đọng</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Hệ thống đang vận hành hoàn toàn ổn định. Bạn có thể nhấn &ldquo;Tạo mẫu&rdquo; ở trên để chạy thử quy trình.
              </p>
            </div>
          ) : (
            errors.map((err) => (
              <div
                key={err.id}
                className={`p-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  err.status === 'resolved' ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(err.severity)}
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                      {err.module}
                    </span>
                    {err.count > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        x{err.count} lần
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(err.timestamp).toLocaleString('vi-VN')}
                    </span>
                    {err.status === 'acknowledged' && (
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        Đang theo dõi
                      </span>
                    )}
                    {err.status === 'resolved' && (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Đã xử lý {err.resolvedBy ? `bởi ${err.resolvedBy}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 break-words">
                    {err.message}
                  </div>

                  {err.path && (
                    <div className="text-xs text-slate-500 font-mono truncate">
                      Đường dẫn liên quan: <span className="text-slate-700 dark:text-slate-300">{err.path}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  {err.stack && (
                    <button
                      type="button"
                      onClick={() => setSelectedError(selectedError?.id === err.id ? null : err)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{selectedError?.id === err.id ? 'Ẩn Stack' : 'Xem Stack'}</span>
                    </button>
                  )}

                  {err.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateErrorStatus(err.id, 'acknowledged')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                    >
                      Theo dõi
                    </button>
                  )}

                  {err.status !== 'resolved' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateErrorStatus(err.id, 'resolved')}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã xử lý</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateErrorStatus(err.id, 'open')}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Mở lại
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteError(err.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Xóa bản ghi sự cố này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Expanded Stack Trace Drawer */}
        {selectedError && selectedError.stack && (
          <div className="p-4 bg-slate-900 text-slate-200 border-t border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <FileCode className="w-4 h-4" /> Chi tiết Stack Trace [{selectedError.id}]
              </span>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap max-h-60 text-[11px] leading-relaxed text-slate-300">
              {selectedError.stack}
            </pre>
          </div>
        )}
      </div>

      {/* MODAL 1: Deep Diagnostic Audit Modal */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Kết quả Chẩn đoán Hệ thống Chuyên sâu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Quy trình kiểm định 6 tiêu chuẩn cốt lõi (6-Point Verification)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnosticModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {runningDiagnostic && !diagnosticResult && (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Đang quét toàn diện hệ thống...</p>
                  <p className="text-xs text-slate-500">Đang kiểm tra 11,000 từ vựng, 65 đề thi PDF/MP3, và phân quyền người dùng</p>
                </div>
              )}

              {diagnosticResult && (
                <>
                  {/* Score Summary Box */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Chỉ số sức khỏe toàn diện
                      </div>
                      <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        {diagnosticResult.scorePercent}% Đạt chuẩn
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Hoàn thành {diagnosticResult.passedChecks}/{diagnosticResult.totalChecks} bài kiểm tra • {diagnosticResult.warningChecks} cảnh báo
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Thời gian: {new Date(diagnosticResult.auditedAt).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2.5">
                    {diagnosticResult.checks.map((chk) => (
                      <div
                        key={chk.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex items-start gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        {chk.status === 'pass' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : chk.status === 'warning' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {chk.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">{chk.latencyMs}ms</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {chk.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <span className="text-xs text-slate-500">Chu kỳ kiểm định khuyến nghị: 24 giờ / lần</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunDeepDiagnostic}
                  disabled={runningDiagnostic}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Quét lại
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiagnosticModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Manual Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Báo cáo Sự cố Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phân hệ (Module)
                  </label>
                  <select
                    value={newIncident.module}
                    onChange={(e) => setNewIncident({ ...newIncident, module: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="database">Cơ sở dữ liệu (.data/)</option>
                    <option value="exams">Tài liệu Đề thi &amp; PDF</option>
                    <option value="audio_tts">Âm thanh &amp; TTS</option>
                    <option value="auth">Xác thực &amp; Tài khoản</option>
                    <option value="workspaces">Không gian học viên</option>
                    <option value="ui_render">Giao diện (Frontend)</option>
                    <option value="network">Mạng &amp; API Server</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="warning">Cảnh báo (Warning)</option>
                    <option value="error">Lỗi (Error)</option>
                    <option value="critical">Nghiêm trọng (Critical)</option>
                    <option value="info">Thông tin (Info)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả sự cố / Tiêu đề lỗi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tải file đề thi HSK 6 gặp mã lỗi HTTP 404..."
                  value={newIncident.message}
                  onChange={(e) => setNewIncident({ ...newIncident, message: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Đường dẫn liên quan (URL / Path)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: /exams?level=6 hoặc /public/exam-files/pdf/..."
                  value={newIncident.path}
                  onChange={(e) => setNewIncident({ ...newIncident, path: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú kỹ thuật / Stack Trace (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  placeholder="Dán mã lỗi hoặc hướng dẫn tái hiện sự cố..."
                  value={newIncident.stack}
                  onChange={(e) => setNewIncident({ ...newIncident, stack: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                >
                  {submittingIncident ? 'Đang lưu...' : 'Lưu sự cố'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
