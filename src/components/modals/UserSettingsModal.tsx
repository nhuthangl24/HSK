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
} from 'lucide-react';
import { useTheme, ThemeMode, FontSize } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { tts, AvailableVoice } from '@/lib/tts';
import { getClientAuthHeaders } from '@/lib/client-auth';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
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

  const [activeTab, setActiveTab] = useState<'theme' | 'tts' | 'study'>('theme');

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

  const [saving, setSaving] = useState(false);

  // Initialize modal state when opened
  useEffect(() => {
    if (!isOpen) return;

    setSelectedTheme(theme);
    setTempFontSize(fontSize);
    setTempAutoPronounce(autoPronounce);
    setTargetHsk(user?.targetHsk || 3);
    setTtsRate(tts.getRate());
    setGenderChoice(tts.getCurrentGender());

    const updateVoiceList = (voiceList: AvailableVoice[]) => {
      setVoices(voiceList);
      const currVoice = tts.getCurrentVoiceName();
      if (currVoice) {
        setSelectedVoiceName(currVoice);
      } else if (voiceList.length > 0) {
        const def = voiceList.find((v) => v.isChinese) || voiceList[0];
        setSelectedVoiceName(def.name);
      }
    };

    updateVoiceList(tts.getAvailableVoices());
    const unsubscribe = tts.onVoicesChanged(updateVoiceList);

    // Only populate form fields from server if logged in
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
  }, [isOpen]);

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
      val === 'female' ? '你好，这是女声发音。' : val === 'male' ? '你好，这是男声发音。' : '你好，这是系统默认发音。',
      { rate: ttsRate }
    );
  };

  // Handle Specific Voice Change
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    tts.setVoiceByName(voiceName);
    setGenderChoice(tts.getCurrentGender());
    tts.speak('你好，这是发音测试。', {
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
    toast.info('Đã khôi phục cài đặt về trạng thái chuẩn.');
  };

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Apply to runtime & localStorage without overwriting each other
      setTheme(selectedTheme);
      setFontSize(tempFontSize);
      setAutoPronounce(tempAutoPronounce);
      tts.setRate(ttsRate);
      if (selectedVoiceName) {
        tts.setVoiceByName(selectedVoiceName);
      } else {
        tts.setVoiceByGender(genderChoice);
      }

      // 2. Persist to server if logged in
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Cài Đặt Cá Nhân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy chỉnh giao diện Dark mode, giọng đọc phát âm và phong cách học
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Segmented Nav Tabs */}
        <div className="flex px-6 pt-3 border-b border-slate-100 dark:border-slate-800 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
              activeTab === 'theme'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Moon size={15} />
            <span>Giao diện (Theme)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tts')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
              activeTab === 'tts'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Volume2 size={15} />
            <span>Giọng đọc phát âm</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
              activeTab === 'study'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Type size={15} />
            <span>Hiển thị & Học tập</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: THEME */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Chế độ giao diện (Dark Mode)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: 'light' as const,
                      label: 'Sáng (Light)',
                      desc: 'Màu nền trắng trang nhã',
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
                      desc: 'Theo cài đặt thiết bị',
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
                  Giao diện Sáng (Light) là chế độ mặc định rõ nét. Bạn có thể chọn Tối (Dark) hoặc Tự động (System). Cài đặt được lưu tức thì vào trình duyệt.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: TTS VOICE */}
          {activeTab === 'tts' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Lựa chọn giọng đọc
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      tts.initVoices();
                      const list = tts.getAvailableVoices();
                      setVoices(list);
                      toast.info(`Đã quét lại ${list.length} giọng đọc từ hệ thống.`);
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw size={11} />
                    <span>Làm mới danh sách voice</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'default' as const, label: 'Mặc định', sub: 'Tự động tối ưu' },
                    {
                      id: 'female' as const,
                      label: 'Giọng Nữ',
                      sub: femaleVoices.length > 0 ? `${femaleVoices.length} giọng có sẵn` : 'Chuẩn tự nhiên',
                    },
                    {
                      id: 'male' as const,
                      label: 'Giọng Nam',
                      sub: maleVoices.length > 0 ? `${maleVoices.length} giọng có sẵn` : 'Chuẩn tự nhiên',
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

              {/* Exact Voice Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gói giọng nói cụ thể ({chineseVoices.length > 0 ? `${chineseVoices.length} giọng tiếng Trung` : `${voices.length} giọng hệ thống`})
                </label>
                {chineseVoices.length > 0 ? (
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                  >
                    {chineseVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang}) {v.gender !== 'default' ? `— [${v.gender === 'male' ? 'Nam' : 'Nữ'}]` : ''}
                      </option>
                    ))}
                  </select>
                ) : voices.length > 0 ? (
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                  >
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Trình duyệt đang tải gói giọng đọc của hệ điều hành. Hệ thống sẽ phát âm tự động theo chuẩn tiếng Trung (zh-CN).
                    </span>
                  </div>
                )}
              </div>

              {/* Speech Rate Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tốc độ phát âm (Speed Rate)
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {ttsRate}x {ttsRate === 0.85 ? '(Khuyên dùng cho người học)' : ''}
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
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>0.5x (Chậm)</span>
                  <span>0.85x (Chuẩn)</span>
                  <span>1.5x (Nhanh)</span>
                </div>
              </div>

              {/* Test Audio Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestSpeech}
                  disabled={isPlayingTest}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isPlayingTest ? (
                    <Volume2 size={14} className="animate-pulse text-white" />
                  ) : (
                    <Play size={13} className="fill-white" />
                  )}
                  <span>{isPlayingTest ? 'Đang phát âm thử...' : 'Nghe thử phát âm mẫu'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: STUDY & DISPLAY PREFERENCES */}
          {activeTab === 'study' && (
            <div className="space-y-4">
              {/* Font Size for Chinese Characters */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Cỡ chữ Hán trong bảng tính
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
                    Hệ thống sẽ tự đọc to chữ Hán mỗi khi bạn chọn ô hoặc lật thẻ từ
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Mục tiêu cấp độ HSK của bạn
                </label>
                <select
                  value={targetHsk}
                  onChange={(e) => setTargetHsk(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      HSK {lvl} ({lvl <= 3 ? 'Sơ cấp' : lvl <= 6 ? 'Trung cấp' : 'Cao cấp'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            title="Đưa tất cả cài đặt về chuẩn mặc định"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium transition-colors"
          >
            <RotateCcw size={13} />
            <span>Khôi phục mặc định</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
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
