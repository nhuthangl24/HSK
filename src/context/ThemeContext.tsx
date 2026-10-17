'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';
export type FontSize = 'normal' | 'large' | 'xlarge';

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setTheme: (mode: ThemeMode) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  autoPronounce: boolean;
  setAutoPronounce: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  effectiveTheme: 'light',
  setTheme: () => {},
  fontSize: 'normal',
  setFontSize: () => {},
  autoPronounce: false,
  setAutoPronounce: () => {},
});

const THEME_KEY = 'hsk_theme_preference';
const FONT_SIZE_KEY = 'hsk_font_size';
const AUTO_PRONOUNCE_KEY = 'hsk_auto_pronounce';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('light');
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');
  const [autoPronounce, setAutoPronounceState] = useState<boolean>(false);

  // Compute and apply theme to DOM
  const applyTheme = useCallback((mode: ThemeMode) => {
    let resolved: EffectiveTheme = 'light';
    if (mode === 'system') {
      const isSystemDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = isSystemDark ? 'dark' : 'light';
    } else {
      resolved = mode;
    }

    setEffectiveTheme(resolved);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    }
  }, []);

  const applyFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', size);
    }
  }, []);

  // Initialize from localStorage (default to light mode unless explicitly set)
  useEffect(() => {
    let initialMode: ThemeMode = 'light';
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        initialMode = savedTheme;
      }
    } catch {
      initialMode = 'light';
    }

    setThemeState(initialMode);
    applyTheme(initialMode);

    // Initialize font size
    try {
      const savedFont = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
      if (savedFont && ['normal', 'large', 'xlarge'].includes(savedFont)) {
        applyFontSize(savedFont);
      } else {
        applyFontSize('normal');
      }
    } catch {
      applyFontSize('normal');
    }

    // Initialize auto pronounce
    try {
      const savedAuto = localStorage.getItem(AUTO_PRONOUNCE_KEY);
      setAutoPronounceState(savedAuto === 'true');
    } catch {
      setAutoPronounceState(false);
    }

    // Listen to OS system color-scheme changes
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      let current: ThemeMode = 'light';
      try {
        current = (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light';
      } catch {}
      if (current === 'system') {
        applyTheme('system');
      }
    };

    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      media.addListener(listener);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [applyTheme, applyFontSize]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      try {
        localStorage.setItem(THEME_KEY, mode);
      } catch {}
      applyTheme(mode);
    },
    [applyTheme]
  );

  const setFontSize = useCallback(
    (size: FontSize) => {
      applyFontSize(size);
      try {
        localStorage.setItem(FONT_SIZE_KEY, size);
      } catch {}
    },
    [applyFontSize]
  );

  const setAutoPronounce = useCallback((enabled: boolean) => {
    setAutoPronounceState(enabled);
    try {
      localStorage.setItem(AUTO_PRONOUNCE_KEY, enabled ? 'true' : 'false');
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        setTheme,
        fontSize,
        setFontSize,
        autoPronounce,
        setAutoPronounce,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

