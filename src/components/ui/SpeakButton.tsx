'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { tts } from '@/lib/tts';

interface SpeakButtonProps {
  text: string;
  size?: 'sm' | 'md';
  className?: string;
  rate?: number;
  title?: string;
}

export function SpeakButton({
  text,
  size = 'sm',
  className = '',
  rate,
  title = 'Phát âm tiếng Trung (Web Speech)',
}: SpeakButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    setIsPlaying(true);
    tts.speak(text, rate);
    setTimeout(() => {
      setIsPlaying(false);
    }, 1500);
  };

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title={title}
      className={`inline-flex items-center justify-center p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer ${className}`}
      aria-label="Phát âm"
    >
      {isPlaying ? (
        <VolumeX size={iconSize} className="text-emerald-600 animate-pulse" />
      ) : (
        <Volume2 size={iconSize} />
      )}
    </button>
  );
}
