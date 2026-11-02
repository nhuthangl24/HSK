'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  BookOpen,
  MessageSquare,
  Volume2,
  Lightbulb,
  TrendingUp,
  Target,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ConversationAssessmentReport } from '@/types/ai';

interface AssessmentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ConversationAssessmentReport | null;
  onStartNewSession?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

type TabKey = 'grammar' | 'vocab' | 'communication' | 'recommendations' | 'evidence';

export function AssessmentReportModal({
  isOpen,
  onClose,
  report,
  onStartNewSession,
  onRetry,
  isRetrying = false,
}: AssessmentReportModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('grammar');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const isInsufficient = report.status === 'insufficient_data';
  const isFailed = report.status === 'failed';
  const isCompleted = report.status === 'completed';

  const copyMarkdownSummary = () => {
    if (!report) return;
    const text = `# BÁO CÁO ĐÁNH GIÁ NĂNG LỰC NÓI TIẾNG TRUNG - TIỂU TRÍ AI
- Chủ đề: ${report.topic}
- Cấp độ: ${report.hsk_level}
- Điểm tổng quan: ${report.overall_score !== null ? `${report.overall_score}/100` : 'Chưa đủ dữ liệu'}
- Đánh giá phát âm: ${report.pronunciation_assessed ? 'Có đánh giá âm thanh' : 'Loại trừ (chỉ có bản ghi văn bản)'}
- Nhận xét: ${report.assessment_summary}

## ĐIỂM CHI TIẾT
- Ngữ pháp (20%): ${report.criteria_scores.grammar ?? 'N/A'}/100
- Từ vựng (20%): ${report.criteria_scores.vocabulary ?? 'N/A'}/100
- Giao tiếp (25%): ${report.criteria_scores.communication ?? 'N/A'}/100
- Lưu loát (20%): ${report.criteria_scores.fluency ?? 'N/A'}/100
- Phát âm (15%): ${report.criteria_scores.pronunciation ?? 'Không đánh giá'}

## ĐIỂM MẠNH:
${report.strengths.map((s) => `- ${s}`).join('\n')}

## ĐIỂM CẦN CẢI THIỆN:
${report.weaknesses.map((w) => `- ${w}`).join('\n')}

## LỜI KHUYÊN & BÀI TẬP:
${report.recommendations.map((r) => `- ${r}`).join('\n')}
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400 dark:text-zinc-500';
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 55) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700';
    if (score >= 85) return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80';
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80';
    if (score >= 55) return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80';
    return 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-zinc-800 overflow-hidden relative">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-zinc-800/90 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Báo Cáo Đánh Giá Khẩu Ngữ Tiếng Trung
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {report.topic}
                </span>
                <span>•</span>
                <span className="font-mono">{report.hsk_level}</span>
                <span>•</span>
                <span>{new Date(report.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted && (
              <button
                type="button"
                onClick={copyMarkdownSummary}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Sao chép báo cáo chi tiết"
              >
                {copied ? <Check size={17} className="text-emerald-500" /> : <Copy size={17} />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {/* CASE 1: INSUFFICIENT DATA */}
          {isInsufficient && (
            <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 space-y-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={22} />
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-amber-100 text-sm sm:text-base">
                    Dữ liệu hội thoại chưa đủ để đánh giá toàn diện
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {report.assessment_summary}
                  </p>
                </div>
              </div>

              {report.recommendations.length > 0 && (
                <div className="pt-3 border-t border-amber-200/60 dark:border-amber-800/40 space-y-2">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Target size={14} />
                    <span>Gợi ý để có báo cáo đánh giá chuẩn xác:</span>
                  </div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pl-4 list-disc">
                    {report.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* CASE 2: FAILED / SERVER ERROR */}
          {isFailed && (
            <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/60 space-y-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={22} />
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-rose-100 text-sm sm:text-base">
                    Không thể hoàn tất đánh giá lúc này
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {report.assessment_summary}
                  </p>
                  {report.error_message && (
                    <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 bg-white/60 dark:bg-black/40 p-2 rounded-xl">
                      Chi tiết: {report.error_message}
                    </p>
                  )}
                </div>
              </div>

              {onRetry && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
                    <span>{isRetrying ? 'Đang chấm lại...' : 'Thử chấm điểm lại'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CASE 3: COMPLETED ASSESSMENT */}
          {isCompleted && (
            <>
              {/* TOP SCORE HERO CARD */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Overall Score Dial */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-zinc-800 border-4 border-emerald-500 flex flex-col items-center justify-center shadow-md">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {report.overall_score ?? '--'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      / 100
                    </span>
                  </div>
                  <span className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    Điểm Tổng Quan
                  </span>
                </div>

                {/* Proficiency & Summary */}
                <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{report.estimated_proficiency || `Trình độ HSK ${report.hsk_level}`}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {report.assessment_summary}
                  </p>

                  {!report.pronunciation_assessed && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      * Điểm phát âm được loại trừ và chuẩn hóa trọng số theo tiêu chuẩn vì phiên hội thoại chỉ thu thập bản ghi văn bản.
                    </div>
                  )}
                </div>
              </div>

              {/* 5 CRITERIA SCORE CARDS */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Bảng Điểm 5 Tiêu Chí Đánh Giá
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {/* 1. Grammar (20%) */}
                  <div
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${getScoreBg(
                      report.criteria_scores.grammar
                    )}`}
                  >
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Ngữ pháp (20%)
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-xl sm:text-2xl font-black font-mono ${getScoreColor(report.criteria_scores.grammar)}`}>
                        {report.criteria_scores.grammar ?? '--'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">/100</span>
                    </div>
                  </div>

                  {/* 2. Vocabulary (20%) */}
                  <div
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${getScoreBg(
                      report.criteria_scores.vocabulary
                    )}`}
                  >
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Từ vựng (20%)
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-xl sm:text-2xl font-black font-mono ${getScoreColor(report.criteria_scores.vocabulary)}`}>
                        {report.criteria_scores.vocabulary ?? '--'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">/100</span>
                    </div>
                  </div>

                  {/* 3. Communication (25%) */}
                  <div
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${getScoreBg(
                      report.criteria_scores.communication
                    )}`}
                  >
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Giao tiếp (25%)
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-xl sm:text-2xl font-black font-mono ${getScoreColor(report.criteria_scores.communication)}`}>
                        {report.criteria_scores.communication ?? '--'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">/100</span>
                    </div>
                  </div>

                  {/* 4. Fluency (20%) */}
                  <div
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${getScoreBg(
                      report.criteria_scores.fluency
                    )}`}
                  >
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Lưu loát (20%)
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-xl sm:text-2xl font-black font-mono ${getScoreColor(report.criteria_scores.fluency)}`}>
                        {report.criteria_scores.fluency ?? '--'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">/100</span>
                    </div>
                  </div>

                  {/* 5. Pronunciation (15%) */}
                  <div
                    className={`col-span-2 sm:col-span-1 p-3 rounded-2xl border flex flex-col justify-between transition-all ${getScoreBg(
                      report.criteria_scores.pronunciation
                    )}`}
                  >
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Phát âm (15%)
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      {report.pronunciation_assessed && report.criteria_scores.pronunciation !== null ? (
                        <>
                          <span className={`text-xl sm:text-2xl font-black font-mono ${getScoreColor(report.criteria_scores.pronunciation)}`}>
                            {report.criteria_scores.pronunciation}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">/100</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                          Chưa đánh giá*
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TABS NAVIGATION */}
              <div className="border-b border-slate-200 dark:border-zinc-800 flex gap-1 sm:gap-2 overflow-x-auto pb-1 text-xs">
                {[
                  { key: 'grammar', label: 'Ngữ pháp & Sửa câu', icon: BookOpen },
                  { key: 'vocab', label: 'Từ vựng & Vốn từ', icon: Lightbulb },
                  { key: 'communication', label: 'Giao tiếp & Lưu loát', icon: MessageSquare },
                  { key: 'recommendations', label: 'Điểm mạnh & Lộ trình', icon: TrendingUp },
                  { key: 'evidence', label: 'Dẫn chứng câu nói', icon: CheckCircle2 },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key as TabKey)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB CONTENT PANELS */}
              <div className="text-xs sm:text-sm space-y-3">
                {/* 1. GRAMMAR TAB */}
                {activeTab === 'grammar' && (
                  <div className="space-y-3">
                    {report.grammar_feedback.length > 0 ? (
                      report.grammar_feedback.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/80 dark:border-zinc-800 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[11px] shrink-0">
                              Câu gốc chưa chuẩn
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.mistake}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shrink-0">
                              Cách nói tự nhiên
                            </span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">
                              {item.correction}
                            </span>
                          </div>

                          {item.explanation && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-slate-300 dark:border-zinc-700 leading-relaxed">
                              {item.explanation}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs">
                        🎉 Chúc mừng! Ngữ pháp trong toàn bộ phiên hội thoại được đánh giá rất tốt, không có lỗi cấu trúc nghiêm trọng.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VOCABULARY TAB */}
                {activeTab === 'vocab' && (
                  <div className="space-y-3">
                    {report.vocabulary_feedback.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {report.vocabulary_feedback.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/80 dark:border-zinc-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base font-bold text-slate-900 dark:text-white">
                                {item.word}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  item.type === 'strength'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : item.type === 'recommended'
                                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {item.type === 'strength'
                                  ? 'Điểm cộng'
                                  : item.type === 'recommended'
                                  ? 'Nên áp dụng'
                                  : 'Cần đa dạng'}
                              </span>
                            </div>

                            {(item.pinyin || item.meaning) && (
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {item.pinyin && <span className="font-mono text-emerald-600 dark:text-emerald-400 mr-2">{item.pinyin}</span>}
                                {item.meaning && <span>({item.meaning})</span>}
                              </div>
                            )}

                            {item.note && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {item.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850 text-slate-600 dark:text-slate-300 text-xs">
                        Vốn từ vựng của bạn đáp ứng tốt yêu cầu đối thoại ở trình độ này.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. COMMUNICATION & FLUENCY TAB */}
                {activeTab === 'communication' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        Hiểu ngữ cảnh & Khả năng duy trì đối thoại:
                      </h5>
                      {report.communication_feedback.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/80 dark:border-zinc-800 space-y-1">
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {item.aspect}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.observation}
                          </p>
                          {item.suggestion && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              💡 {item.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2">
                      <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        Độ lưu loát & Tính tự nhiên:
                      </h5>
                      {report.fluency_feedback.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/80 dark:border-zinc-800 space-y-1">
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {item.aspect}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.observation}
                          </p>
                          {item.suggestion && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              💡 {item.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. RECOMMENDATIONS & PLAN TAB */}
                {activeTab === 'recommendations' && (
                  <div className="space-y-4">
                    {/* Strengths & Weaknesses Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Top 3 Strengths */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                        <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span>Top 3 Điểm Mạnh:</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {report.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Top 3 Weaknesses */}
                      <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
                        <div className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertCircle size={14} />
                          <span>Top 3 Điểm Cần Cải Thiện:</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {report.weaknesses.map((w, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-rose-600 font-bold">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable Learning Plan */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Target size={14} className="text-emerald-500" />
                        <span>Kế hoạch & Bài tập đề xuất cho bạn:</span>
                      </div>
                      <div className="space-y-2">
                        {report.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed flex-1">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. EVIDENCE TAB */}
                {activeTab === 'evidence' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Căn cứ trực tiếp từ các câu nói thực tế của bạn trong cuộc hội thoại:
                    </p>
                    {report.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-850 border border-slate-200/80 dark:border-zinc-800 text-xs flex items-start gap-2.5"
                      >
                        <span className="font-mono text-emerald-600 font-bold shrink-0">#{idx + 1}</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          "{ev}"
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-zinc-800/90 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/50 gap-2">
          {onStartNewSession ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartNewSession();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Bắt đầu cuộc trò chuyện mới</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
