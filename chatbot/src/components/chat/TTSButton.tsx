'use client';

import { useCallback } from 'react';
import styles from './TTSButton.module.css';
import { useTTS } from '@/hooks/useTTS';

interface TTSButtonProps {
  text: string;
  isUser: boolean;
  onHide: () => void;
  language: string;
}

/**
 * TTS (Text-to-Speech) Button Component
 *
 * Renders a floating button beside message bubbles that reads the message aloud
 * Uses Web Speech API with the chat's target language
 */
export default function TTSButton({ text, isUser, onHide, language }: TTSButtonProps) {
  const { speak, stop, isPlaying, isLoading, isSupported } = useTTS(language);

  // Don't render if browser doesn't support TTS
  if (!isSupported) {
    return null;
  }

  // Don't render for empty or very long messages
  const MAX_TTS_LENGTH = 5000;
  if (!text.trim() || text.length > MAX_TTS_LENGTH) {
    return null;
  }

  /**
   * Handles TTS button click
   * Starts speech or stops it if already playing
   */
  const handleClick = useCallback(() => {
    if (isLoading) return;

    if (isPlaying) {
      stop();
    } else {
      speak(text);
    }
  }, [text, speak, stop, isPlaying, isLoading]);

  return (
    <button
      className={`${styles.ttsButton} ${isUser ? styles.userMessage : styles.botMessage} ${isLoading ? styles.loading : ''} ${isPlaying ? styles.playing : ''}`}
      onClick={handleClick}
      aria-label={isPlaying ? "Stop audio" : isLoading ? "Loading audio..." : "Read message aloud"}
      title={isPlaying ? "Stop" : isLoading ? "Loading..." : "Read aloud"}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className={styles.spinner} />
      ) : isPlaying ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
