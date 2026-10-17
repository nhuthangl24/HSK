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

class ChineseTTS {
  private synth: SpeechSynthesis | null = null;
  private currentVoice: SpeechSynthesisVoice | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private rate = 0.85;
  private gender: 'male' | 'female' | 'default' = 'default';
  private isInitialized = false;

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
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.initVoices();
        }
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.voices.length > 0) {
      this.isInitialized = true;

      // Try restoring saved voice name
      let savedVoiceName: string | null = null;
      try {
        if (typeof window !== 'undefined') {
          savedVoiceName = localStorage.getItem('hsk_tts_voice_name');
        }
      } catch {}

      if (savedVoiceName) {
        const found = this.voices.find((v) => v.name === savedVoiceName);
        if (found) {
          this.currentVoice = found;
          return;
        }
      }

      // Default to best mainland Chinese voice if not yet selected
      if (!this.currentVoice) {
        const zhVoice =
          this.voices.find((v) => v.lang === 'zh-CN') ||
          this.voices.find((v) => v.lang.startsWith('zh')) ||
          this.voices.find((v) => v.lang.includes('cmn'));
        if (zhVoice) {
          this.currentVoice = zhVoice;
        }
      }
    }
  }

  public getAvailableVoices(): AvailableVoice[] {
    if (!this.synth) return [];
    if (!this.isInitialized || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    return this.voices.map((v) => {
      const lower = (v.name + ' ' + v.voiceURI).toLowerCase();
      let gender: 'male' | 'female' | 'default' = 'default';

      if (
        lower.includes('female') ||
        lower.includes('woman') ||
        lower.includes('tingting') ||
        lower.includes('xiaoxiao') ||
        lower.includes('xiaoyi') ||
        lower.includes('yaoyao') ||
        lower.includes('sinji') ||
        lower.includes('meijia') ||
        lower.includes('huihui') ||
        lower.includes('yating')
      ) {
        gender = 'female';
      } else if (
        lower.includes('male') ||
        lower.includes('man') ||
        lower.includes('kangkang') ||
        lower.includes('yunyang') ||
        lower.includes('yunxi') ||
        lower.includes('zhiwei') ||
        lower.includes('danny') ||
        lower.includes('george')
      ) {
        gender = 'male';
      }

      return {
        name: v.name,
        lang: v.lang,
        gender,
        isChinese: v.lang.startsWith('zh') || v.lang.includes('cmn'),
        voiceURI: v.voiceURI,
      };
    });
  }

  public setVoiceByName(voiceName: string): boolean {
    if (!this.synth) return false;
    this.initVoices();
    const found = this.voices.find((v) => v.name === voiceName);
    if (found) {
      this.currentVoice = found;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('hsk_tts_voice_name', voiceName);
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
    if (gender === 'default') {
      const zhDefault = this.voices.find((v) => v.lang === 'zh-CN') || this.voices.find((v) => v.lang.startsWith('zh'));
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

    const available = this.getAvailableVoices().filter((v) => v.isChinese);
    const target = available.find((v) => v.gender === gender);
    if (target) {
      const actual = this.voices.find((v) => v.name === target.name);
      if (actual) {
        this.currentVoice = actual;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('hsk_tts_voice_name', actual.name);
          }
        } catch {}
        return true;
      }
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

    this.synth.cancel();

    if (!this.isInitialized) {
      this.initVoices();
    }

    const opts = typeof options === 'number' ? { rate: options } : options;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = opts?.lang || (this.currentVoice ? this.currentVoice.lang : 'zh-CN');
    utterance.rate = opts?.rate || this.rate;
    utterance.pitch = opts?.pitch || 1.0;

    if (opts?.voiceName) {
      const explicit = this.voices.find((v) => v.name === opts.voiceName);
      if (explicit) {
        utterance.voice = explicit;
      }
    } else if (this.currentVoice) {
      utterance.voice = this.currentVoice;
    }

    this.synth.speak(utterance);
  }

  public testSpeech(voiceName?: string, rate?: number): void {
    this.speak('你好！欢迎使用汉语学习词汇平台。', {
      voiceName,
      rate: rate || this.rate,
    });
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const tts = new ChineseTTS();
