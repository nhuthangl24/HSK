'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Volume2,
  Moon,
  Sun,
  Monitor,
  Check,
  Play,
  RotateCcw,
  Type,
  AlertCircle,
  Save,
  RefreshCw,
  MessageSquare,
  Send,
  Star,
  Sparkles,
  CheckCircle2,
  Bug,
  Lightbulb,
  Headphones,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { useTheme, ThemeMode, FontSize } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { tts, AvailableVoice } from '@/lib/tts';
import { getClientAuthHeaders } from '@/lib/client-auth';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'tts' | 'theme' | 'study' | 'feedback';
}

export function UserSettingsModal({ isOpen, onClose, initialTab = 'tts' }: UserSettingsModalProps) {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    autoPronounce,
    setAutoPronounce,
  } = useTheme();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'tts' | 'theme' | 'study' | 'feedback'>(initialTab);

  // Theme Local State
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(theme);

  // TTS Settings Local State
  const [voices, setVoices] = useState<AvailableVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [genderChoice, setGenderChoice] = useState<'default' | 'male' | 'female'>('default');
  const [ttsRate, setTtsRate] = useState<number>(0.85);

  // Study & Display Settings Local State
  const [tempAutoPronounce, setTempAutoPronounce] = useState<boolean>(autoPronounce);
  const [tempFontSize, setTempFontSize] = useState<FontSize>(fontSize);
  const [targetHsk, setTargetHsk] = useState<number>(user?.targetHsk || 3);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Feedback State
  const [fbCategory, setFbCategory] = useState<'feature' | 'bug' | 'voice' | 'content' | 'other'>('feature');
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbMessage, setFbMessage] = useState<string>('');
  const [fbEmail, setFbEmail] = useState<string>(user?.email || '');
  const [fbName, setFbName] = useState<string>(user?.name || '');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSent, setFbSent] = useState(false);

  const [saving, setSaving] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize modal state when opened
  useEffect(() => {
    if (!isOpen) return;

    setSelectedTheme(theme);
    setTempFontSize(fontSize);
    setTempAutoPronounce(autoPronounce);
    setTargetHsk(user?.targetHsk || 3);
    setTtsRate(tts.getRate());
    setGenderChoice(tts.getCurrentGender());
    if (user?.email) setFbEmail(user.email);
    if (user?.name) setFbName(user.name);
    setFbSent(false);

    const updateVoiceList = (voiceList: AvailableVoice[]) => {
      setVoices(voiceList);
      const currVoice = tts.getCurrentVoiceName();
      if (currVoice) {
        setSelectedVoiceName(currVoice);
      } else if (voiceList.length > 0) {
        // Preferred default: Google 國語 (zh-TW)
        const preferred =
          voiceList.find((v) => v.name.includes('Google') && (v.name.includes('國語') || v.name.includes('臺灣') || v.lang.toLowerCase().includes('zh-tw'))) ||
          voiceList.find((v) => v.lang.toLowerCase().replace(/_/g, '-').startsWith('zh-tw')) ||
          voiceList.find((v) => v.isChinese) ||
          voiceList[0];
        setSelectedVoiceName(preferred.name);
        tts.setVoiceByName(preferred.name);
      }
    };

    updateVoiceList(tts.getAvailableVoices());
    const unsubscribe = tts.onVoicesChanged(updateVoiceList);

    // Populate user settings from server if authenticated
    if (isAuthenticated) {
      fetch('/api/user/settings', {
        headers: getClientAuthHeaders(user),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data.settings) {
            const s = data.settings;
            if (s.ttsVoiceName) {
              setSelectedVoiceName(s.ttsVoiceName);
              tts.setVoiceByName(s.ttsVoiceName);
            }
            if (s.ttsVoiceGender) {
              setGenderChoice(s.ttsVoiceGender);
            }
            if (typeof s.ttsRate === 'number') {
              setTtsRate(s.ttsRate);
              tts.setRate(s.ttsRate);
            }
            if (typeof s.autoPronounce === 'boolean') setTempAutoPronounce(s.autoPronounce);
            if (s.fontSize) setTempFontSize(s.fontSize);
            if (s.targetHsk) setTargetHsk(s.targetHsk);
          }
        })
        .catch(() => {});
    }

    return () => {
      unsubscribe();
    };
  }, [isOpen, isAuthenticated, user]);

  if (!isOpen) return null;

  const chineseVoices = voices.filter((v) => v.isChinese);
  const maleVoices = chineseVoices.filter((v) => v.gender === 'male');
  const femaleVoices = chineseVoices.filter((v) => v.gender === 'female');

  // Handle Theme Selection
  const handleThemeSelect = (mode: ThemeMode) => {
    setSelectedTheme(mode);
    setTheme(mode);
  };

  // Handle Font Size Selection
  const handleFontSizeSelect = (size: FontSize) => {
    setTempFontSize(size);
    setFontSize(size);
  };

  // Handle Auto Pronounce Toggle
  const handleAutoPronounceToggle = (enabled: boolean) => {
    setTempAutoPronounce(enabled);
    setAutoPronounce(enabled);
  };

  // Handle Rate Change
  const handleRateChange = (val: number) => {
    setTtsRate(val);
    tts.setRate(val);
  };

  // Handle Gender Change
  const handleGenderChange = (val: 'default' | 'male' | 'female') => {
    setGenderChoice(val);
    tts.setVoiceByGender(val);
    const active = tts.getCurrentVoiceName();
    if (active) setSelectedVoiceName(active);
    tts.speak(
      val === 'female' ? '你好，这是女声发音。' : val === 'male' ? '你好，这是男声发音。' : '你好，这是系统推荐发音。',
      { rate: ttsRate }
    );
  };

  // Handle Specific Voice Change
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    tts.setVoiceByName(voiceName);
    setGenderChoice(tts.getCurrentGender());
    tts.speak('你好，这是台湾国语标准发音。', {
      voiceName,
      rate: ttsRate,
    });
  };

  // Test Speech Playback
  const handleTestSpeech = () => {
    setIsPlayingTest(true);
    tts.speak('你好！欢迎使用汉语学习词汇平台。祝你学业进步！', {
      voiceName: selectedVoiceName || undefined,
      rate: ttsRate,
    });
    setTimeout(() => setIsPlayingTest(false), 2400);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    handleThemeSelect('light');
    handleFontSizeSelect('normal');
    handleAutoPronounceToggle(false);
    handleRateChange(0.85);
    handleGenderChange('default');
    setTargetHsk(3);

    // Reset default voice to Google 國語 (zh-TW)
    const googleTw = voices.find(
      (v) =>
        v.name.includes('Google') &&
        (v.name.includes('國語') || v.name.includes('臺灣') || v.lang.toLowerCase().includes('zh-tw'))
    );
    if (googleTw) {
      setSelectedVoiceName(googleTw.name);
      tts.setVoiceByName(googleTw.name);
    }
    toast.info('Đã khôi phục cài đặt về chuẩn tối ưu ban đầu.');
  };

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    try {
      setTheme(selectedTheme);
      setFontSize(tempFontSize);
      setAutoPronounce(tempAutoPronounce);
      tts.setRate(ttsRate);
      if (selectedVoiceName) {
        tts.setVoiceByName(selectedVoiceName);
      } else {
        tts.setVoiceByGender(genderChoice);
      }

      if (isAuthenticated) {
        if (updateProfile && typeof targetHsk === 'number') {
          await updateProfile({ targetHsk }).catch(() => {});
        }

        await fetch('/api/user/settings', {
          method: 'PUT',
          headers: getClientAuthHeaders(user),
          body: JSON.stringify({
            theme: selectedTheme,
            ttsVoiceName: selectedVoiceName,
            ttsVoiceGender: genderChoice,
            ttsRate,
            autoPronounce: tempAutoPronounce,
            fontSize: tempFontSize,
            targetHsk,
          }),
        });
      }

      toast.success('Đã lưu cấu hình cá nhân thành công!', 'Cài đặt');
      onClose();
    } catch {
      toast.error('Lưu cài đặt thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Submit Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbMessage.trim()) {
      toast.warning('Vui lòng nhập nội dung góp ý hoặc mô tả lỗi.');
      return;
    }
    setFbSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: fbCategory,
          rating: fbRating,
          message: fbMessage.trim(),
          userEmail: fbEmail.trim() || user?.email,
          userName: fbName.trim() || user?.name,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFbSent(true);
        setFbMessage('');
        toast.success('Cảm ơn bạn! Phản hồi đã được chuyển trực tiếp đến ban phát triển.', 'Đã gửi');
      } else {
        toast.error(data.message || 'Không thể gửi phản hồi.');
      }
    } catch {
      toast.error('Lỗi mạng khi gửi phản hồi. Vui lòng thử lại sau.');
    } finally {
      setFbSubmitting(false);
    }
  };

  const isGoogleTwSelected =
    selectedVoiceName.includes('Google') &&
    (selectedVoiceName.includes('國語') || selectedVoiceName.includes('臺灣') || selectedVoiceName.includes('zh-TW'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Cài Đặt & Tùy Chỉnh</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy biến giọng đọc phát âm, giao diện học tập và gửi góp ý
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div className="flex px-4 sm:px-6 pt-2 border-b border-slate-100 dark:border-slate-800 gap-1.5 bg-slate-50/70 dark:bg-slate-900/70 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('tts')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold rounded-t-xl cursor-pointer border-b-2 transition-all shrink-0 ${
              activeTab === 'tts'
                ? 'border-emerald-600 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40'
            }`}
          >
            <Volume2 size={15} className={activeTab === 'tts' ? 'text-emerald-600' : ''} />
            <span>Giọng đọc phát âm</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
              zh-TW
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold rounded-t-xl cursor-pointer border-b-2 transition-all shrink-0 ${
              activeTab === 'theme'
                ? 'border-emerald-600 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40'
            }`}
          >
            <Moon size={15} className={activeTab === 'theme' ? 'text-emerald-600' : ''} />
            <span>Giao diện (Theme)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold rounded-t-xl cursor-pointer border-b-2 transition-all shrink-0 ${
              activeTab === 'study'
                ? 'border-emerald-600 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40'
            }`}
          >
            <Type size={15} className={activeTab === 'study' ? 'text-emerald-600' : ''} />
            <span>Hiển thị & Mục tiêu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold rounded-t-xl cursor-pointer border-b-2 transition-all shrink-0 relative ${
              activeTab === 'feedback'
                ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-bold shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40'
            }`}
          >
            <MessageSquare size={15} className={activeTab === 'feedback' ? 'text-blue-600' : ''} />
            <span>Góp ý & Báo lỗi</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: TTS VOICE (PRIMARY FOCUS) */}
          {activeTab === 'tts' && (
            <div className="space-y-4">
              {/* Active Voice Showcase Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                      <Headphones size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {selectedVoiceName || 'Google 國語（臺灣） (zh-TW)'}
                        </span>
                        {isGoogleTwSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            ⭐ Đề xuất mặc định
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Giọng phát âm chuẩn Đài Loan / Phổ thông Trung Quốc, âm tiết trong và tự nhiên nhất.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSpeech}
                    disabled={isPlayingTest}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0 btn-press"
                  >
                    {isPlayingTest ? (
                      <>
                        <Volume2 size={13} className="animate-pulse" />
                        <span>Đang đọc...</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-white" />
                        <span>Nghe thử</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Gender selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Phong cách giọng nói
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'default' as const,
                      label: 'Chuẩn Đài Loan',
                      sub: 'Google 國語 (zh-TW)',
                    },
                    {
                      id: 'female' as const,
                      label: 'Giọng Nữ (Female)',
                      sub: femaleVoices.length > 0 ? `${femaleVoices.length} giọng có sẵn` : 'Trong trẻo, rõ lời',
                    },
                    {
                      id: 'male' as const,
                      label: 'Giọng Nam (Male)',
                      sub: maleVoices.length > 0 ? `${maleVoices.length} giọng có sẵn` : 'Trầm ấm, chuẩn xác',
                    },
                  ].map((g) => {
                    const isSelected = genderChoice === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleGenderChange(g.id)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{g.label}</span>
                          {isSelected && <Check size={14} className="text-emerald-600" />}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">{g.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Voice Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Chọn gói giọng đọc cụ thể ({chineseVoices.length} giọng tiếng Trung)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      tts.initVoices();
                      const list = tts.getAvailableVoices();
                      setVoices(list);
                      toast.info(`Đã quét lại ${list.length} giọng đọc từ hệ điều hành.`);
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw size={11} />
                    <span>Quét lại voice</span>
                  </button>
                </div>

                {chineseVoices.length > 0 ? (
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                  >
                    {chineseVoices.map((v) => {
                      const isTw = v.name.includes('Google') && (v.name.includes('國語') || v.lang.toLowerCase().includes('zh-tw'));
                      return (
                        <option key={v.name} value={v.name}>
                          {isTw ? '✓ ' : ''}{v.name} ({v.lang}) {isTw ? '⭐ [Khuyên dùng]' : ''}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Đang tải giọng đọc từ trình duyệt. Mặc định phát âm theo chuẩn Google 國語（臺灣） (zh-TW).
                    </span>
                  </div>
                )}
              </div>

              {/* Speed Rate Slider & Presets */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tốc độ phát âm (Speed Rate)
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {ttsRate}x {ttsRate === 0.85 ? '(Tối ưu cho người học HSK)' : ''}
                  </span>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={ttsRate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />

                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {[
                    { rate: 0.7, label: '0.7x (Chậm)' },
                    { rate: 0.85, label: '0.85x (Chuẩn)' },
                    { rate: 1.0, label: '1.0x (Tự nhiên)' },
                    { rate: 1.25, label: '1.25x (Nhanh)' },
                  ].map((p) => (
                    <button
                      key={p.rate}
                      type="button"
                      onClick={() => handleRateChange(p.rate)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold cursor-pointer transition-all ${
                        ttsRate === p.rate
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THEME */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Chế độ màu sắc hiển thị (Theme)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: 'light' as const,
                      label: 'Sáng (Light)',
                      desc: 'Trang nhã & rõ nét',
                      icon: <Sun size={20} className="text-amber-500" />,
                    },
                    {
                      id: 'dark' as const,
                      label: 'Tối (Dark)',
                      desc: 'Bảo vệ mắt ban đêm',
                      icon: <Moon size={20} className="text-blue-400" />,
                    },
                    {
                      id: 'system' as const,
                      label: 'Tự động (System)',
                      desc: 'Theo hệ điều hành',
                      icon: <Monitor size={20} className="text-slate-400" />,
                    },
                  ].map((m) => {
                    const isSelected = selectedTheme === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleThemeSelect(m.id)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {m.icon}
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs">{m.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <span className="leading-relaxed">
                  Cài đặt giao diện được lưu trực tiếp vào trình duyệt của bạn, tự động ghi nhớ cho các lần truy cập tiếp theo.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: STUDY & DISPLAY */}
          {activeTab === 'study' && (
            <div className="space-y-4">
              {/* Font Size for Chinese Characters */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Cỡ chữ chữ Hán trong bảng từ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal' as const, label: 'Chuẩn (16px)', sample: '汉字' },
                    { id: 'large' as const, label: 'Lớn (20px)', sample: '汉字' },
                    { id: 'xlarge' as const, label: 'Rất lớn (24px)', sample: '汉字' },
                  ].map((f) => {
                    const isSelected = tempFontSize === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFontSizeSelect(f.id)}
                        className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`font-hanzi font-bold mb-1 ${
                            f.id === 'normal' ? 'text-base' : f.id === 'large' ? 'text-xl' : 'text-2xl'
                          }`}
                        >
                          {f.sample}
                        </div>
                        <div className="text-xs font-semibold">{f.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto Pronounce Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Tự động phát âm khi bấm vào chữ Hán
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống sẽ tự động phát âm tiếng Trung mỗi khi bạn click vào dòng từ vựng hoặc lật thẻ ôn tập
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={tempAutoPronounce}
                    onChange={(e) => handleAutoPronounceToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Target HSK level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Mục tiêu cấp độ HSK học tập
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
                    const isSelected = targetHsk === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setTargetHsk(lvl)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        HSK {lvl === 7 ? '7-9' : lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEEDBACK BOX ("Ô FEED BACK TRONG CÀI ĐẶT") */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {fbSent ? (
                <div className="p-8 text-center bg-emerald-50/60 dark:bg-emerald-950/30 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Cảm ơn bạn đã gửi phản hồi!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Mọi ý kiến đóng góp của bạn đều giúp hệ thống HSK Interactive Sheet hoàn thiện và phục vụ cộng đồng học tiếng Trung tốt hơn.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFbSent(false)}
                    className="mt-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    Gửi thêm góp ý khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                        <MessageSquare size={14} className="text-blue-600" />
                        Hòm Thư Góp Ý & Báo Lỗi Nhanh
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Bạn muốn thêm tính năng gì, hay phát hiện từ vựng/giọng đọc bị lỗi? Hãy nói cho chúng mình biết nhé!
                      </p>
                    </div>
                  </div>

                  {/* Feedback Category Chips */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Chủ đề phản hồi:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'feature' as const, label: 'Góp ý tính năng', icon: <Lightbulb size={13} className="text-amber-500" /> },
                        { id: 'bug' as const, label: 'Báo lỗi hệ thống', icon: <Bug size={13} className="text-rose-500" /> },
                        { id: 'voice' as const, label: 'Giọng đọc / TTS', icon: <Volume2 size={13} className="text-blue-500" /> },
                        { id: 'content' as const, label: 'Sai sót từ vựng', icon: <FileText size={13} className="text-emerald-500" /> },
                        { id: 'other' as const, label: 'Khác', icon: <HelpCircle size={13} className="text-purple-500" /> },
                      ].map((c) => {
                        const isSelected = fbCategory === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setFbCategory(c.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-300 dark:ring-blue-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {c.icon}
                            <span>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mức độ hài lòng của bạn:
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFbRating(star)}
                          className="p-1 cursor-pointer transition-transform hover:scale-120"
                        >
                          <Star
                            size={18}
                            className={
                              star <= fbRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 ml-1.5">
                        {fbRating === 5 ? 'Tuyệt vời' : fbRating === 4 ? 'Tốt' : fbRating === 3 ? 'Bình thường' : 'Cần cải thiện'}
                      </span>
                    </div>
                  </div>

                  {/* Message Input Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nội dung ý kiến đóng góp / Chi tiết lỗi *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={fbMessage}
                      onChange={(e) => setFbMessage(e.target.value)}
                      placeholder="Mô tả ý tưởng tính năng bạn mong muốn, câu từ chưa chuẩn hoặc sự cố bạn gặp phải..."
                      className="w-full p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none shadow-2xs leading-relaxed"
                    />
                    <div className="flex justify-between text-[10.5px] text-slate-400 mt-1">
                      <span>Được bảo mật & chuyển ngay đến nhóm phát triển</span>
                      <span>{fbMessage.length}/1000 ký tự</span>
                    </div>
                  </div>

                  {/* Optional Contact Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Email liên hệ (để nhận phản hồi nếu cần)
                      </label>
                      <input
                        type="email"
                        value={fbEmail}
                        onChange={(e) => setFbEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Tên bạn
                      </label>
                      <input
                        type="text"
                        value={fbName}
                        onChange={(e) => setFbName(e.target.value)}
                        placeholder="Họ tên hoặc biệt danh"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Submit Feedback Button */}
                  <div className="pt-1 flex justify-end">
                    <button
                      type="submit"
                      disabled={fbSubmitting || !fbMessage.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-blue-500/20 btn-press"
                    >
                      <Send size={13} className={fbSubmitting ? 'animate-bounce' : ''} />
                      <span>{fbSubmitting ? 'Đang gửi phản hồi...' : 'Gửi góp ý ngay'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            title="Đưa tất cả cài đặt về chuẩn mặc định ban đầu"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium transition-colors"
          >
            <RotateCcw size={13} />
            <span>Khôi phục mặc định</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 btn-press"
            >
              <Save size={14} />
              <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettingsModal;
