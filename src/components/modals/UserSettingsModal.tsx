'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Volume2,
  Moon,
  Sun,
  Monitor,
  Check,
  Play,
  Square,
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
  Sliders,
  GraduationCap,
  Sparkle,
  Radio,
  User as UserIcon,
  Palette,
} from 'lucide-react';
import { useTheme, ThemeMode, FontSize } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { tts, AvailableVoice } from '@/lib/tts';
import { getClientAuthHeaders } from '@/lib/client-auth';
import { saveUserSettingsToFirestore, loadUserSettingsFromFirestore } from '@/lib/firebase-db';
import {
  ALL_HANZI_FONTS,
  TOP_10_HANZI_FONTS,
  SYSTEM_HANZI_FONT,
  getHanziFontById,
  HANZI_FONT_STORAGE_KEY,
} from '@/lib/hanzi-fonts';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'tts' | 'theme' | 'font' | 'study' | 'feedback';
}

export function UserSettingsModal({ isOpen, onClose, initialTab = 'tts' }: UserSettingsModalProps) {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    autoPronounce,
    setAutoPronounce,
    hanziFont,
    setHanziFont,
  } = useTheme();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'tts' | 'theme' | 'font' | 'study' | 'feedback'>(initialTab);

  // Theme & Font Local State
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(theme);
  const [selectedHanziFont, setSelectedHanziFont] = useState<string>(hanziFont || 'system');
  const [fontPreviewText, setFontPreviewText] = useState<string>('学而时习之，不亦说乎');

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

  const [lastSavedTime, setLastSavedTime] = useState<string>('Vừa xong');
  const [isSaving, setIsSaving] = useState(false);

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

  // Sync to server & firestore helper
  const syncServerSettings = useCallback(
    async (overrides?: Record<string, unknown>) => {
      const payload = {
        theme: selectedTheme,
        ttsVoiceName: selectedVoiceName,
        ttsVoiceGender: genderChoice,
        ttsRate,
        autoPronounce: tempAutoPronounce,
        fontSize: tempFontSize,
        hanziFont: selectedHanziFont,
        targetHsk,
        ...overrides,
      };

      // 1. Always persist to localStorage
      try {
        if (payload.theme) localStorage.setItem('hsk_theme_preference', payload.theme as string);
        if (payload.fontSize) localStorage.setItem('hsk_font_size', payload.fontSize as string);
        if (payload.hanziFont) localStorage.setItem(HANZI_FONT_STORAGE_KEY, payload.hanziFont as string);
        if (typeof payload.autoPronounce === 'boolean') {
          localStorage.setItem('hsk_auto_pronounce', payload.autoPronounce ? 'true' : 'false');
        }
        if (typeof payload.ttsRate === 'number') {
          localStorage.setItem('hsk_tts_rate', String(payload.ttsRate));
        }
        if (payload.ttsVoiceName) {
          localStorage.setItem('hsk_tts_voice_name', payload.ttsVoiceName as string);
        }
        if (payload.ttsVoiceGender) {
          localStorage.setItem('hsk_tts_voice_gender', payload.ttsVoiceGender as string);
        }
      } catch {}

      // 2. Persist to server API
      try {
        await fetch('/api/user/settings', {
          method: 'PUT',
          headers: getClientAuthHeaders(user),
          body: JSON.stringify(payload),
        });
        setLastSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      } catch {}

      // 3. Persist to Firestore if user ID available
      if (user?.id) {
        saveUserSettingsToFirestore(user.id, payload).catch(() => {});
      }
    },
    [user, selectedTheme, selectedVoiceName, genderChoice, ttsRate, tempAutoPronounce, tempFontSize, selectedHanziFont, targetHsk]
  );

  // Save all settings explicitly
  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    try {
      // 1. Immediately commit all settings to localStorage
      try {
        localStorage.setItem('hsk_theme_preference', selectedTheme);
        localStorage.setItem('hsk_font_size', tempFontSize);
        localStorage.setItem(HANZI_FONT_STORAGE_KEY, selectedHanziFont);
        localStorage.setItem('hsk_auto_pronounce', tempAutoPronounce ? 'true' : 'false');
        localStorage.setItem('hsk_tts_rate', String(ttsRate));
        if (selectedVoiceName) localStorage.setItem('hsk_tts_voice_name', selectedVoiceName);
        if (genderChoice) localStorage.setItem('hsk_tts_voice_gender', genderChoice);
      } catch {}

      // 2. Apply to React contexts & singletons
      setTheme(selectedTheme);
      setFontSize(tempFontSize);
      setHanziFont(selectedHanziFont);
      setAutoPronounce(tempAutoPronounce);
      tts.setRate(ttsRate);
      if (selectedVoiceName) tts.setVoiceByName(selectedVoiceName);
      if (genderChoice) tts.setVoiceByGender(genderChoice);

      if (user && updateProfile) {
        updateProfile({ targetHsk }).catch(() => {});
      }

      // 3. Save to server API
      const settingsPayload = {
        theme: selectedTheme,
        ttsVoiceName: selectedVoiceName,
        ttsVoiceGender: genderChoice,
        ttsRate,
        autoPronounce: tempAutoPronounce,
        fontSize: tempFontSize,
        hanziFont: selectedHanziFont,
        targetHsk,
      };

      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: getClientAuthHeaders(user),
        body: JSON.stringify(settingsPayload),
      }).catch(() => {});

      // 4. Save to Firestore if user is logged in
      if (user?.id) {
        await saveUserSettingsToFirestore(user.id, settingsPayload).catch(() => {});
      }

      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      toast.success('Đã lưu toàn bộ cài đặt thành công!', 'Cài đặt hệ thống');
      onClose();
    } catch {
      toast.error('Lỗi khi lưu cài đặt.');
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize modal state when opened
  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage first
    try {
      const savedTheme = localStorage.getItem('hsk_theme_preference') as ThemeMode;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setSelectedTheme(savedTheme);
      } else {
        setSelectedTheme(theme);
      }

      const savedFont = localStorage.getItem('hsk_font_size') as FontSize;
      if (savedFont && ['normal', 'large', 'xlarge'].includes(savedFont)) {
        setTempFontSize(savedFont);
      } else {
        setTempFontSize(fontSize);
      }

      const savedAuto = localStorage.getItem('hsk_auto_pronounce');
      if (savedAuto !== null) {
        setTempAutoPronounce(savedAuto === 'true');
      } else {
        setTempAutoPronounce(autoPronounce);
      }

      const savedRate = localStorage.getItem('hsk_tts_rate');
      if (savedRate) {
        const r = parseFloat(savedRate);
        if (!isNaN(r) && r >= 0.5 && r <= 2.0) {
          setTtsRate(r);
          tts.setRate(r);
        }
      } else {
        setTtsRate(tts.getRate());
      }

      const savedGender = localStorage.getItem('hsk_tts_voice_gender') as any;
      if (savedGender && ['default', 'male', 'female'].includes(savedGender)) {
        setGenderChoice(savedGender);
      } else {
        setGenderChoice(tts.getCurrentGender());
      }

      const savedVoice = localStorage.getItem('hsk_tts_voice_name');
      if (savedVoice) {
        setSelectedVoiceName(savedVoice);
      }

      const savedHanziFont = localStorage.getItem(HANZI_FONT_STORAGE_KEY);
      if (savedHanziFont) {
        setSelectedHanziFont(savedHanziFont);
      } else {
        setSelectedHanziFont(hanziFont || 'system');
      }
    } catch {}

    setTargetHsk(user?.targetHsk || 3);
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

    // Populate user settings from server API
    fetch('/api/user/settings', {
      headers: getClientAuthHeaders(user),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.settings) {
          const s = data.settings;
          if (s.theme && ['light', 'dark', 'system'].includes(s.theme)) {
            setSelectedTheme(s.theme);
            setTheme(s.theme);
          }
          if (s.fontSize && ['normal', 'large', 'xlarge'].includes(s.fontSize)) {
            setTempFontSize(s.fontSize);
            setFontSize(s.fontSize);
          }
          if (s.hanziFont) {
            setSelectedHanziFont(s.hanziFont);
            setHanziFont(s.hanziFont);
          }
          if (typeof s.autoPronounce === 'boolean') {
            setTempAutoPronounce(s.autoPronounce);
            setAutoPronounce(s.autoPronounce);
          }
          if (typeof s.ttsRate === 'number' && s.ttsRate >= 0.5 && s.ttsRate <= 2.0) {
            setTtsRate(s.ttsRate);
            tts.setRate(s.ttsRate);
          }
          if (s.ttsVoiceName) {
            setSelectedVoiceName(s.ttsVoiceName);
            tts.setVoiceByName(s.ttsVoiceName);
          }
          if (s.ttsVoiceGender && ['default', 'male', 'female'].includes(s.ttsVoiceGender)) {
            setGenderChoice(s.ttsVoiceGender);
          }
          if (s.targetHsk) setTargetHsk(s.targetHsk);
        }
      })
      .catch(() => {});

    // Also populate from Firestore if user is logged in
    if (user?.id) {
      loadUserSettingsFromFirestore(user.id)
        .then((fsSettings) => {
          if (fsSettings) {
            if (fsSettings.theme && ['light', 'dark', 'system'].includes(fsSettings.theme as string)) {
              setSelectedTheme(fsSettings.theme as ThemeMode);
              setTheme(fsSettings.theme as ThemeMode);
            }
            if (fsSettings.fontSize && ['normal', 'large', 'xlarge'].includes(fsSettings.fontSize as string)) {
              setTempFontSize(fsSettings.fontSize as FontSize);
              setFontSize(fsSettings.fontSize as FontSize);
            }
            if (fsSettings.hanziFont) {
              setSelectedHanziFont(fsSettings.hanziFont as string);
              setHanziFont(fsSettings.hanziFont as string);
            }
            if (typeof fsSettings.autoPronounce === 'boolean') {
              setTempAutoPronounce(fsSettings.autoPronounce as boolean);
              setAutoPronounce(fsSettings.autoPronounce as boolean);
            }
            if (typeof fsSettings.ttsRate === 'number') {
              setTtsRate(fsSettings.ttsRate);
              tts.setRate(fsSettings.ttsRate);
            }
            if (fsSettings.ttsVoiceName) {
              setSelectedVoiceName(fsSettings.ttsVoiceName as string);
              tts.setVoiceByName(fsSettings.ttsVoiceName as string);
            }
            if (fsSettings.ttsVoiceGender) {
              setGenderChoice(fsSettings.ttsVoiceGender as any);
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      unsubscribe();
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const chineseVoices = voices.filter((v) => v.isChinese);

  // Handle Hanzi Font Selection with Instant Preview & Auto-Save
  const handleHanziFontSelect = (fontId: string) => {
    setSelectedHanziFont(fontId);
    setHanziFont(fontId);
    try {
      localStorage.setItem(HANZI_FONT_STORAGE_KEY, fontId);
    } catch {}
    syncServerSettings({ hanziFont: fontId });
    const f = getHanziFontById(fontId);
    toast.success(`Đã áp dụng phông: ${f.name}`, 'Phông chữ Hán');
  };

  // Handle Theme Selection with Instant Auto-Save
  const handleThemeSelect = (mode: ThemeMode) => {
    setSelectedTheme(mode);
    setTheme(mode);
    try {
      localStorage.setItem('hsk_theme_preference', mode);
    } catch {}
    syncServerSettings({ theme: mode });
  };

  // Handle Font Size Selection with Instant Auto-Save
  const handleFontSizeSelect = (size: FontSize) => {
    setTempFontSize(size);
    setFontSize(size);
    try {
      localStorage.setItem('hsk_font_size', size);
    } catch {}
    syncServerSettings({ fontSize: size });
  };

  // Handle Auto Pronounce Toggle with Instant Auto-Save
  const handleAutoPronounceToggle = (enabled: boolean) => {
    setTempAutoPronounce(enabled);
    setAutoPronounce(enabled);
    try {
      localStorage.setItem('hsk_auto_pronounce', enabled ? 'true' : 'false');
    } catch {}
    syncServerSettings({ autoPronounce: enabled });
  };

  // Handle Rate Change with Instant Auto-Save
  const handleRateChange = (val: number) => {
    setTtsRate(val);
    tts.setRate(val);
    try {
      localStorage.setItem('hsk_tts_rate', String(val));
    } catch {}
    syncServerSettings({ ttsRate: val });
  };

  // Handle Gender / Tone Change
  const handleGenderChange = (val: 'default' | 'male' | 'female') => {
    setGenderChoice(val);
    tts.setVoiceByGender(val);
    try {
      localStorage.setItem('hsk_tts_voice_gender', val);
    } catch {}
    const active = tts.getCurrentVoiceName();
    if (active) {
      setSelectedVoiceName(active);
      try {
        localStorage.setItem('hsk_tts_voice_name', active);
      } catch {}
    }
    syncServerSettings({ ttsVoiceGender: val, ttsVoiceName: active });
    tts.speak(
      val === 'female' ? '你好，这是女声发音。' : val === 'male' ? '你好，这是男声发音。' : '你好，这是台湾国语标准发音。',
      { rate: ttsRate }
    );
  };

  // Handle Specific Voice Change
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    tts.setVoiceByName(voiceName);
    try {
      localStorage.setItem('hsk_tts_voice_name', voiceName);
    } catch {}
    const g = tts.getCurrentGender();
    setGenderChoice(g);
    try {
      localStorage.setItem('hsk_tts_voice_gender', g);
    } catch {}
    syncServerSettings({ ttsVoiceName: voiceName, ttsVoiceGender: g });
    tts.speak('你好，这是台湾国语标准发音。', {
      voiceName,
      rate: ttsRate,
    });
  };

  // Test Speech Playback
  const handleTestSpeech = () => {
    if (isPlayingTest) {
      tts.stop();
      setIsPlayingTest(false);
      return;
    }
    setIsPlayingTest(true);
    tts.speak('你好！欢迎使用汉语学习词汇平台。祝你学业进步！', {
      voiceName: selectedVoiceName || undefined,
      rate: ttsRate,
    });
    setTimeout(() => setIsPlayingTest(false), 3000);
  };

  // Target HSK Change
  const handleTargetHskChange = (lvl: number) => {
    setTargetHsk(lvl);
    if (updateProfile) updateProfile({ targetHsk: lvl }).catch(() => {});
    syncServerSettings({ targetHsk: lvl });
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    handleThemeSelect('light');
    handleFontSizeSelect('normal');
    handleAutoPronounceToggle(false);
    handleRateChange(0.85);
    handleGenderChange('default');
    handleTargetHskChange(3);

    // Reset default voice to Google 國語 (zh-TW)
    const googleTw = voices.find(
      (v) =>
        v.name.includes('Google') &&
        (v.name.includes('國語') || v.name.includes('臺灣') || v.lang.toLowerCase().includes('zh-tw'))
    );
    if (googleTw) {
      setSelectedVoiceName(googleTw.name);
      tts.setVoiceByName(googleTw.name);
      try {
        localStorage.setItem('hsk_tts_voice_name', googleTw.name);
      } catch {}
    }
    toast.info('Đã khôi phục cài đặt về chuẩn tối ưu ban đầu.');
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

  const navItems = [
    {
      id: 'tts' as const,
      label: 'Phát âm & Giọng đọc',
      badge: 'zh-TW',
      icon: <Volume2 size={16} />,
      desc: 'Giọng đọc chuẩn Đài Loan',
    },
    {
      id: 'theme' as const,
      label: 'Giao diện & Cỡ chữ',
      icon: <Moon size={16} />,
      desc: 'Dark mode & Kích thước chữ',
    },
    {
      id: 'font' as const,
      label: 'Phông chữ Hán (Fonts)',
      badge: 'Top 10',
      icon: <Type size={16} />,
      desc: '10 phông Google nghệ thuật',
    },
    {
      id: 'study' as const,
      label: 'Mục tiêu & Hiển thị',
      icon: <GraduationCap size={16} />,
      desc: 'HSK 1-9 & Tự động phát âm',
    },
    {
      id: 'feedback' as const,
      label: 'Hòm thư Góp ý & Báo lỗi',
      badge: 'Mới',
      icon: <MessageSquare size={16} />,
      desc: 'Gửi phản hồi trực tiếp',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-3 sm:p-5 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 2-Column macOS / Linear Style Preferences Window */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 max-w-4xl w-full h-[640px] max-h-[92vh] overflow-hidden flex flex-col md:flex-row animate-scaleIn ring-1 ring-black/5 dark:ring-white/10">
        
        {/* LEFT COLUMN: macOS Style Sidebar Navigation */}
        <div className="w-full md:w-72 bg-slate-50/90 dark:bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col justify-between shrink-0">
          <div>
            {/* Window Controls & App Title */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    onClick={onClose}
                    title="Đóng (Esc)"
                    className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 cursor-pointer transition-colors shadow-2xs"
                  />
                  <span className="w-3 h-3 rounded-full bg-amber-400 cursor-default" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 cursor-default" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-2 tracking-tight">
                  Cài Đặt Hệ Thống
                </span>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                v3.0
              </span>
            </div>

            {/* User Profile Mini Card */}
            <div className="my-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={16} />}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || 'Khách học tập'}
                </div>
                <div className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
                  {user?.email || 'Chế độ khách'}
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="space-y-1">
              <div className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                Danh mục tùy chọn
              </div>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                        {item.icon}
                      </span>
                      <div className="truncate">
                        <div className="text-xs leading-none">{item.label}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.id === 'feedback'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Sidebar Footer */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tự động lưu ({lastSavedTime})
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-900"
            >
              <RotateCcw size={12} />
              <span>Khôi phục mặc định</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Settings Content Canvas */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900">
          
          {/* Top Canvas Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {activeTab === 'tts' && 'Phát Âm & Giọng Đọc Tiếng Trung'}
                {activeTab === 'theme' && 'Giao Diện & Màu Sắc Hiển Thị'}
                {activeTab === 'study' && 'Mục Tiêu & Phương Pháp Học'}
                {activeTab === 'feedback' && 'Hòm Thư Góp Ý & Báo Lỗi Nhanh'}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {activeTab === 'tts' && 'Mặc định ưu tiên giọng đọc chuẩn Google 國語 (zh-TW)'}
                {activeTab === 'theme' && 'Tùy chỉnh chế độ ban đêm và cỡ chữ Hán trong bảng tính'}
                {activeTab === 'study' && 'Cấu hình cấp độ HSK mục tiêu và hành vi tương tác'}
                {activeTab === 'feedback' && 'Ý kiến của bạn được gửi trực tiếp đến ban phát triển hệ thống'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Settings Rows */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            
            {/* TAB 1: TTS VOICE */}
            {activeTab === 'tts' && (
              <div className="space-y-4">
                {/* Highlighted Banner for Default Voice */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                      <Headphones size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {selectedVoiceName || 'Google 國語（臺灣） (zh-TW)'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          ⭐ Mặc định hệ thống
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Giọng phát âm Đài Loan trong trẻo, không bị ngọng, chuẩn từng thanh điệu.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSpeech}
                    className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0 btn-press"
                  >
                    {isPlayingTest ? (
                      <>
                        <Square size={13} className="fill-white" />
                        <span>Dừng đọc</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} className="fill-white" />
                        <span>Nghe thử</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Apple-style Grouped Settings List */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                  
                  {/* Row 1: Voice Selector */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Gói giọng đọc tiếng Trung
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Đã phát hiện {chineseVoices.length} giọng tương thích trên thiết bị
                      </div>
                    </div>

                    <div className="sm:w-72">
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
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
                    </div>
                  </div>

                  {/* Row 2: Gender/Tone */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Tông giọng nói
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Lọc theo giọng Nữ, Nam hoặc Tự động tối ưu
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                      {[
                        { id: 'default' as const, label: 'Đài Loan (zh-TW)' },
                        { id: 'female' as const, label: 'Giọng Nữ' },
                        { id: 'male' as const, label: 'Giọng Nam' },
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleGenderChange(g.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            genderChoice === g.id
                              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Speech Speed */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Tốc độ đọc phát âm
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Điều chỉnh tốc độ chậm hoặc tự nhiên khi học từ vựng
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
                          {ttsRate}x
                        </span>
                      </div>
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

                    <div className="flex items-center justify-between gap-1.5">
                      {[
                        { rate: 0.7, label: '0.7x (Chậm)' },
                        { rate: 0.85, label: '0.85x (Chuẩn HSK)' },
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
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: THEME */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                  
                  {/* Mode Row */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Chế độ giao diện (Dark Mode)
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Lựa chọn giao diện hiển thị phù hợp với điều kiện ánh sáng
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      {[
                        {
                          id: 'light' as const,
                          label: 'Sáng (Light)',
                          icon: <Sun size={18} className="text-amber-500" />,
                          bg: 'bg-white border-slate-200',
                        },
                        {
                          id: 'dark' as const,
                          label: 'Tối (Dark)',
                          icon: <Moon size={18} className="text-blue-400" />,
                          bg: 'bg-slate-900 border-slate-700',
                        },
                        {
                          id: 'system' as const,
                          label: 'Hệ thống (Auto)',
                          icon: <Monitor size={18} className="text-slate-400" />,
                          bg: 'bg-gradient-to-r from-slate-100 to-slate-800 border-slate-300',
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
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              {m.icon}
                              {isSelected && <Check size={14} className="text-emerald-600" />}
                            </div>
                            <div className="text-xs font-bold">{m.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hanzi Font Size */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Cỡ chữ chữ Hán trong bảng từ vựng
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Tăng kích cỡ chữ Hán để dễ nhìn và nhận diện từng nét chữ
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'normal' as const, label: 'Chuẩn (16px)', sample: '汉字', sizeClass: 'text-base' },
                        { id: 'large' as const, label: 'Lớn (20px)', sample: '汉字', sizeClass: 'text-xl' },
                        { id: 'xlarge' as const, label: 'Rất lớn (24px)', sample: '汉字', sizeClass: 'text-2xl' },
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
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className={`font-hanzi font-bold mb-1 ${f.sizeClass}`}>
                              {f.sample}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              {f.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Hanzi Font Banner */}
                  <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Type size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Phông chữ Hán: {getHanziFontById(selectedHanziFont).name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            {getHanziFontById(selectedHanziFont).categoryBadge}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {getHanziFontById(selectedHanziFont).category} • Google Fonts
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('font')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs shrink-0"
                    >
                      Đổi phông chữ →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TOP 10 GOOGLE FONTS FOR CHINESE CHARACTERS */}
            {activeTab === 'font' && (
              <div className="space-y-4">
                {/* Header Showcase Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-bold uppercase tracking-wider mb-1.5">
                        <Sparkles size={11} />
                        Google Fonts CJK Collection • Top 10 Tuyển Chọn
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Bộ Sưu Tập Phông Chữ Hán Tuyển Chọn
                      </h3>
                      <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                        Tuyển chọn 10 kiểu chữ Hán đỉnh cao trên Google Fonts: từ <strong>Khải thư giáo trình</strong>, <strong>Thư pháp bút lông</strong>, <strong>Hành thư bay bổng</strong> đến <strong>Tống thể tao nhã</strong> và <strong>Poster hiện đại</strong>. Phông chữ được áp dụng lập tức cho toàn bộ bảng tính, thẻ từ vựng và bài tập.
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleHanziFontSelect('system')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          selectedHanziFont === 'system'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Khôi phục phông hệ thống
                      </button>
                    </div>
                  </div>

                  {/* Interactive Live Font Tester Bar */}
                  <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Type size={13} className="text-emerald-600" />
                        Gõ chữ Hán bất kỳ để xem thử trực tiếp tất cả 10 phông:
                      </span>
                      {fontPreviewText && (
                        <button
                          type="button"
                          onClick={() => setFontPreviewText('')}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        >
                          Xóa chữ
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={fontPreviewText}
                        onChange={(e) => setFontPreviewText(e.target.value)}
                        placeholder="Nhập chữ Hán của bạn (vd: 学习中文, 见贤思齐, 春暖花开)..."
                        className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </div>

                    {/* Quick Sample Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10.5px] text-slate-400 dark:text-slate-500 mr-1">Mẫu nhanh:</span>
                      {[
                        '温故而知新',
                        '海纳百川',
                        '千里之行',
                        '天天向上',
                        '长风破浪',
                        '落霞与孤鹜齐飞',
                      ].map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => setFontPreviewText(sample)}
                          className="px-2.5 py-0.5 text-[11px] rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 hover:text-emerald-700 cursor-pointer transition-colors"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Font Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {ALL_HANZI_FONTS.map((font) => {
                    const isSelected = selectedHanziFont === font.id;
                    const displaySample = fontPreviewText.trim() || font.previewSample;

                    return (
                      <div
                        key={font.id}
                        onClick={() => handleHanziFontSelect(font.id)}
                        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/25 shadow-sm'
                            : 'border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                        }`}
                      >
                        {/* Top: Header Info & Badges */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {font.chineseName}
                                </h4>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {font.name.split('(')[0].trim()}
                                </span>
                              </div>
                              <div className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {font.category}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {font.categoryBadge && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    font.id === 'lxgw-wenkai'
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                      : font.isCalligraphy
                                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {font.categoryBadge}
                                </span>
                              )}
                              {isSelected && (
                                <span className="flex items-center gap-1 text-[10.5px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full shadow-2xs">
                                  <Check size={11} /> Đang dùng
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Font Preview Showcase Box */}
                          <div className="my-2.5 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 overflow-hidden">
                            <div
                              style={{ fontFamily: font.fontFamily }}
                              className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-slate-100 leading-snug tracking-wide text-center py-1 transition-all"
                            >
                              {displaySample}
                            </div>

                            {!fontPreviewText.trim() && (
                              <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col text-center">
                                <span className="font-pinyin text-[11px] text-slate-400 dark:text-slate-500">
                                  {font.previewPinyin}
                                </span>
                                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                  &ldquo;{font.previewMeaning}&rdquo;
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                            {font.description}
                          </p>
                        </div>

                        {/* Bottom: Tags & Select Button */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1">
                            {font.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHanziFontSelect(font.id);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Đã kích hoạt' : 'Chọn phông'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: STUDY PREFERENCES */}
            {activeTab === 'study' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                  
                  {/* Auto Pronounce Row */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Tự động phát âm chữ Hán
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Phát âm tức thì mỗi khi bấm vào một dòng từ vựng hoặc lật thẻ ôn tập
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={tempAutoPronounce}
                        onChange={(e) => handleAutoPronounceToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Target HSK Level Row */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Cấp độ HSK mục tiêu
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Tự động lọc các từ vựng và câu hỏi ôn tập theo cấp độ học
                      </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
                        const isSelected = targetHsk === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleTargetHskChange(lvl)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs scale-102 ring-2 ring-emerald-300 dark:ring-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            HSK {lvl === 7 ? '7-9' : lvl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FEEDBACK BOX */}
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
                    {/* Category Selector Chips */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Chủ đề phản hồi
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'feature' as const, label: 'Góp ý tính năng', icon: <Lightbulb size={13} className="text-amber-500" /> },
                          { id: 'bug' as const, label: 'Báo lỗi hệ thống', icon: <Bug size={13} className="text-rose-500" /> },
                          { id: 'voice' as const, label: 'Giọng đọc / Audio', icon: <Volume2 size={13} className="text-blue-500" /> },
                          { id: 'content' as const, label: 'Từ vựng / Dịch nghĩa', icon: <FileText size={13} className="text-emerald-500" /> },
                          { id: 'other' as const, label: 'Ý kiến khác', icon: <HelpCircle size={13} className="text-purple-500" /> },
                        ].map((c) => {
                          const isSelected = fbCategory === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setFbCategory(c.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300 dark:ring-blue-800'
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

                    {/* Satisfaction Rating */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Đánh giá mức độ hài lòng của bạn:
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
                      </div>
                    </div>

                    {/* Message Box */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nội dung ý kiến đóng góp / Chi tiết sự cố *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={fbMessage}
                        onChange={(e) => setFbMessage(e.target.value)}
                        placeholder="Mô tả ý tưởng tính năng bạn mong muốn, câu từ chưa chuẩn hoặc sự cố bạn gặp phải..."
                        className="w-full p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none shadow-2xs leading-relaxed"
                      />
                      <div className="flex justify-between text-[10.5px] text-slate-400 mt-1">
                        <span>Được bảo mật & chuyển ngay đến tác giả</span>
                        <span>{fbMessage.length}/1000</span>
                      </div>
                    </div>

                    {/* Sender Contact Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Email của bạn (tùy chọn)
                        </label>
                        <input
                          type="email"
                          value={fbEmail}
                          onChange={(e) => setFbEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Họ tên / Biệt danh
                        </label>
                        <input
                          type="text"
                          value={fbName}
                          onChange={(e) => setFbName(e.target.value)}
                          placeholder="Học viên"
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="submit"
                        disabled={fbSubmitting || !fbMessage.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-blue-500/20 btn-press"
                      >
                        <Send size={13} className={fbSubmitting ? 'animate-bounce' : ''} />
                        <span>{fbSubmitting ? 'Đang gửi...' : 'Gửi góp ý ngay'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right Bottom Action Bar */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {lastSavedTime ? (
                <span className="text-[11.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đã đồng bộ lúc {lastSavedTime}
                </span>
              ) : (
                <span className="text-[11.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Tự động ghi nhớ và đồng bộ đám mây
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleSaveAllSettings}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm shadow-emerald-600/25 btn-press"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Lưu cài đặt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettingsModal;
