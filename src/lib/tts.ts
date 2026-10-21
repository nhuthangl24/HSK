/**
 * Web Speech API Text-to-Speech utility for Chinese (Mandarin zh-CN) and multilingual learning
 */

export interface AvailableVoice {
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'default';
  isChinese: boolean;
  voiceURI: string;
}

type VoicesChangedListener = (voices: AvailableVoice[]) => void;

class ChineseTTS {
  private synth: SpeechSynthesis | null = null;
  private currentVoice: SpeechSynthesisVoice | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private rate = 0.85;
  private gender: 'male' | 'female' | 'default' = 'default';
  private isInitialized = false;
  private listeners: VoicesChangedListener[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedRate = localStorage.getItem('hsk_tts_rate');
        if (savedRate) {
          const parsed = parseFloat(savedRate);
          if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
            this.rate = parsed;
          }
        }
        const savedGender = localStorage.getItem('hsk_tts_voice_gender') as 'male' | 'female' | 'default';
        if (savedGender && ['male', 'female', 'default'].includes(savedGender)) {
          this.gender = savedGender;
        }
      } catch {}

      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.initVoices();

        const handleVoicesChanged = () => {
          this.initVoices();
        };

        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = handleVoicesChanged;
        }
        try {
          window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        } catch {}

        // Multi-stage polling for asynchronous browser voice initialization (Chrome / Safari / Edge)
        setTimeout(() => this.initVoices(), 150);
        setTimeout(() => this.initVoices(), 500);
        setTimeout(() => this.initVoices(), 1200);
      }
    }
  }

  public onVoicesChanged(callback: VoicesChangedListener): () => void {
    this.listeners.push(callback);
    // If voices are already loaded, notify immediately
    if (this.voices.length > 0) {
      callback(this.getAvailableVoices());
    }
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    const list = this.getAvailableVoices();
    for (const listener of this.listeners) {
      try {
        listener(list);
      } catch (err) {
        console.error('Error in voice change listener:', err);
      }
    }
  }

  public isChineseVoice(v: SpeechSynthesisVoice): boolean {
    const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
    const name = (v.name || '').toLowerCase();
    return (
      lang.startsWith('zh') ||
      lang.includes('cmn') ||
      lang.includes('chinese') ||
      name.includes('chinese') ||
      name.includes('mandarin') ||
      name.includes('cantonese') ||
      name.includes('putonghua') ||
      /[\u4e00-\u9fa5]/.test(v.name)
    );
  }

  public detectGender(v: SpeechSynthesisVoice): 'male' | 'female' | 'default' {
    const lower = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();

    // Female voice markers across Apple, Microsoft, Google, Edge, Android
    if (
      lower.includes('female') ||
      lower.includes('woman') ||
      lower.includes('girl') ||
      lower.includes('tingting') ||
      lower.includes('ting-ting') ||
      lower.includes('xiaoxiao') ||
      lower.includes('xiao-xiao') ||
      lower.includes('xiaoyi') ||
      lower.includes('xiao-yi') ||
      lower.includes('yaoyao') ||
      lower.includes('yao-yao') ||
      lower.includes('sinji') ||
      lower.includes('sin-ji') ||
      lower.includes('meijia') ||
      lower.includes('mei-jia') ||
      lower.includes('huihui') ||
      lower.includes('hui-hui') ||
      lower.includes('yating') ||
      lower.includes('ya-ting') ||
      lower.includes('hiu-gaam') ||
      lower.includes('hiugaam') ||
      lower.includes('hiu-man') ||
      lower.includes('hiuman') ||
      lower.includes('zhiyu') ||
      lower.includes('xiaoxuan') ||
      lower.includes('xiaoxue') ||
      lower.includes('xiaoyan') ||
      lower.includes('lili') ||
      lower.includes('li-li') ||
      lower.includes('samantha') ||
      lower.includes('kyoko') ||
      lower.includes('siri female') ||
      lower.includes('siri (female)')
    ) {
      return 'female';
    }

    // Male voice markers
    if (
      lower.includes('male') ||
      lower.includes('man') ||
      lower.includes('boy') ||
      lower.includes('kangkang') ||
      lower.includes('kang-kang') ||
      lower.includes('yunyang') ||
      lower.includes('yun-yang') ||
      lower.includes('yunxi') ||
      lower.includes('yun-xi') ||
      lower.includes('yunye') ||
      lower.includes('yun-ye') ||
      lower.includes('zhiwei') ||
      lower.includes('zhi-wei') ||
      lower.includes('danny') ||
      lower.includes('george') ||
      lower.includes('wanlung') ||
      lower.includes('wan-lung') ||
      lower.includes('siri male') ||
      lower.includes('siri (male)')
    ) {
      return 'male';
    }

    return 'default';
  }

  public initVoices() {
    if (!this.synth) return;
    const loaded = this.synth.getVoices();
    if (loaded && loaded.length > 0) {
      const prevCount = this.voices.length;
      this.voices = loaded;
      this.isInitialized = true;

      // Try restoring saved voice name
      let savedVoiceName: string | null = null;
      try {
        if (typeof window !== 'undefined') {
          savedVoiceName = localStorage.getItem('hsk_tts_voice_name');
        }
      } catch {}

      if (savedVoiceName) {
        const found = this.voices.find(
          (v) => v.name === savedVoiceName || v.voiceURI === savedVoiceName
        );
        if (found) {
          this.currentVoice = found;
          this.gender = this.detectGender(found);
        }
      }

      // If no valid voice selected yet, default to Google 國語（臺灣） (zh-TW) or preferred Chinese voice
      if (!this.currentVoice) {
        const zhVoices = this.voices.filter((v) => this.isChineseVoice(v));
        if (zhVoices.length > 0) {
          // 1. Prioritize Google 國語（臺灣） (zh-TW)
          const googleTw = zhVoices.find(
            (v) =>
              v.name.includes('Google') &&
              (v.name.includes('國語') || v.name.includes('臺灣') || v.name.includes('Taiwan') || (v.lang || '').toLowerCase().includes('zh-tw'))
          );
          // 2. Any zh-TW voice
          const anyTw = zhVoices.find((v) => (v.lang || '').toLowerCase().replace(/_/g, '-').startsWith('zh-tw'));

          if (this.gender !== 'default') {
            const genderMatch = zhVoices.find((v) => this.detectGender(v) === this.gender);
            if (genderMatch) {
              this.currentVoice = genderMatch;
            }
          }

          if (!this.currentVoice) {
            this.currentVoice = googleTw || anyTw || zhVoices.find((v) => v.name.includes('Google')) || zhVoices.find((v) => (v.lang || '').toLowerCase().startsWith('zh-cn')) || zhVoices[0];
          }
        }
      }

      // Notify listeners if voices count changed or first load
      if (prevCount !== this.voices.length) {
        this.notifyListeners();
      }
    }
  }

  public getAvailableVoices(): AvailableVoice[] {
    if (!this.synth) return [];
    if (!this.isInitialized || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    const list = this.voices.map((v) => ({
      name: v.name,
      lang: v.lang,
      gender: this.detectGender(v),
      isChinese: this.isChineseVoice(v),
      voiceURI: v.voiceURI,
    }));

    // Prioritize Google 國語 (zh-TW) and zh-TW at the very top of Chinese voices
    return list.sort((a, b) => {
      if (a.isChinese && !b.isChinese) return -1;
      if (!a.isChinese && b.isChinese) return 1;

      if (a.isChinese && b.isChinese) {
        const isGoogleTwA = a.name.includes('Google') && (a.name.includes('國語') || a.name.includes('臺灣') || a.lang.toLowerCase().includes('zh-tw'));
        const isGoogleTwB = b.name.includes('Google') && (b.name.includes('國語') || b.name.includes('臺灣') || b.lang.toLowerCase().includes('zh-tw'));
        if (isGoogleTwA && !isGoogleTwB) return -1;
        if (!isGoogleTwA && isGoogleTwB) return 1;

        const isTwA = (a.lang || '').toLowerCase().replace(/_/g, '-').startsWith('zh-tw');
        const isTwB = (b.lang || '').toLowerCase().replace(/_/g, '-').startsWith('zh-tw');
        if (isTwA && !isTwB) return -1;
        if (!isTwA && isTwB) return 1;

        const isGoogleA = a.name.includes('Google');
        const isGoogleB = b.name.includes('Google');
        if (isGoogleA && !isGoogleB) return -1;
        if (!isGoogleA && isGoogleB) return 1;
      }

      return a.name.localeCompare(b.name);
    });
  }

  public setVoiceByName(voiceName: string): boolean {
    if (!this.synth) return false;
    this.initVoices();
    const found = this.voices.find(
      (v) => v.name === voiceName || v.voiceURI === voiceName
    );
    if (found) {
      this.currentVoice = found;
      const detected = this.detectGender(found);
      this.gender = detected;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('hsk_tts_voice_name', found.name);
          localStorage.setItem('hsk_tts_voice_gender', detected);
        }
      } catch {}
      return true;
    }
    return false;
  }

  public getCurrentVoiceName(): string {
    return this.currentVoice?.name || '';
  }

  public getCurrentGender(): 'default' | 'male' | 'female' {
    return this.gender;
  }

  public setVoiceByGender(gender: 'default' | 'male' | 'female'): boolean {
    this.gender = gender;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hsk_tts_voice_gender', gender);
      }
    } catch {}

    if (!this.synth) return false;
    this.initVoices();

    const zhVoices = this.voices.filter((v) => this.isChineseVoice(v));
    if (zhVoices.length === 0) return false;

    if (gender === 'default') {
      const googleTw = zhVoices.find(
        (v) =>
          v.name.includes('Google') &&
          (v.name.includes('國語') || v.name.includes('臺灣') || v.name.includes('Taiwan') || (v.lang || '').toLowerCase().includes('zh-tw'))
      );
      const anyTw = zhVoices.find((v) => (v.lang || '').toLowerCase().replace(/_/g, '-').startsWith('zh-tw'));
      const zhDefault = googleTw || anyTw || zhVoices.find((v) => v.name.includes('Google')) || zhVoices.find((v) => (v.lang || '').toLowerCase().startsWith('zh-cn')) || zhVoices[0];
      if (zhDefault) {
        this.currentVoice = zhDefault;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('hsk_tts_voice_name', zhDefault.name);
          }
        } catch {}
        return true;
      }
      return false;
    }

    const target = zhVoices.find((v) => this.detectGender(v) === gender);
    if (target) {
      this.currentVoice = target;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('hsk_tts_voice_name', target.name);
        }
      } catch {}
      return true;
    }

    // Fallback to first available Chinese voice
    const fallback = zhVoices[0];
    if (fallback) {
      this.currentVoice = fallback;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('hsk_tts_voice_name', fallback.name);
        }
      } catch {}
      return true;
    }

    return false;
  }

  public setRate(rate: number): void {
    if (rate >= 0.5 && rate <= 2.0) {
      this.rate = rate;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('hsk_tts_rate', String(rate));
        }
      } catch {}
    }
  }

  public getRate(): number {
    return this.rate;
  }

  public speak(
    text: string,
    options?:
      | number
      | {
          rate?: number;
          pitch?: number;
          voiceName?: string;
          lang?: string;
        }
  ): void {
    if (!this.synth) return;

    try {
      this.synth.cancel();
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch {}

    if (!this.isInitialized || this.voices.length === 0) {
      this.initVoices();
    }

    const opts = typeof options === 'number' ? { rate: options } : options;

    // Check latest saved rate from settings if not explicitly provided
    let chosenRate = opts?.rate;
    if (chosenRate === undefined && typeof window !== 'undefined') {
      try {
        const savedRate = localStorage.getItem('hsk_tts_rate');
        if (savedRate) {
          const parsed = parseFloat(savedRate);
          if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
            chosenRate = parsed;
          }
        }
      } catch {}
    }
    if (chosenRate === undefined) chosenRate = this.rate;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.min(Math.max(chosenRate, 0.5), 2.0);
    utterance.pitch = opts?.pitch ?? 1.0;

    let targetVoice: SpeechSynthesisVoice | null = null;
    if (opts?.voiceName) {
      targetVoice =
        this.voices.find(
          (v) => v.name === opts.voiceName || v.voiceURI === opts.voiceName
        ) || null;
    }

    // Check latest saved voice name from user settings
    if (!targetVoice && typeof window !== 'undefined') {
      try {
        const savedVoiceName = localStorage.getItem('hsk_tts_voice_name');
        if (savedVoiceName) {
          targetVoice =
            this.voices.find(
              (v) => v.name === savedVoiceName || v.voiceURI === savedVoiceName
            ) || null;
        }
      } catch {}
    }

    if (!targetVoice && this.currentVoice) {
      targetVoice = this.currentVoice;
    }

    if (!targetVoice && this.voices.length > 0) {
      targetVoice = this.voices.find((v) => this.isChineseVoice(v)) || null;
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang || 'zh-CN';
    } else {
      utterance.lang = opts?.lang || 'zh-CN';
    }

    // Retain reference on instance to prevent Chrome garbage-collection bug during playback
    this.activeUtterance = utterance;
    utterance.onend = () => {
      if (this.activeUtterance === utterance) {
        this.activeUtterance = null;
      }
    };
    utterance.onerror = () => {
      if (this.activeUtterance === utterance) {
        this.activeUtterance = null;
      }
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis speak error:', e);
    }
  }

  public testSpeech(voiceName?: string, rate?: number): void {
    this.speak('你好！欢迎使用汉语学习词汇平台。祝你学业进步！', {
      voiceName: voiceName || this.getCurrentVoiceName(),
      rate: rate || this.rate,
    });
  }

  public stop(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }
}

export const tts = new ChineseTTS();
