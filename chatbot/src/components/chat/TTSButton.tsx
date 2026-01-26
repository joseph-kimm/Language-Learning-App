'use client';

import { useCallback } from 'react';
import styles from './TTSButton.module.css';
import { useTTS } from '@/hooks/useTTS';

interface TTSButtonProps {
  text: string;
  isUser: boolean;
  onHide: () => void;
}

/**
 * TTS (Text-to-Speech) Button Component
 *
 * Renders a floating button beside message bubbles that reads the message aloud
 * Uses Web Speech API with automatic language detection
 */
export default function TTSButton({ text, isUser, onHide }: TTSButtonProps) {
  const { speak, isPlaying, isLoading, isSupported } = useTTS();

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
   * Starts speech and shows loading state
   */
  const handleSpeak = useCallback(() => {
    if (isPlaying || isLoading) return; // Prevent multiple clicks

    speak(text);
  }, [text, speak, isPlaying, isLoading]);

  // Hide button when playing (not during loading)
  if (isPlaying) {
    return null;
  }

  return (
    <button
      className={`${styles.ttsButton} ${isUser ? styles.userMessage : styles.botMessage} ${isLoading ? styles.loading : ''}`}
      onClick={handleSpeak}
      aria-label={isLoading ? "Loading audio..." : "Read message aloud"}
      title={isLoading ? "Loading..." : "Read aloud"}
      disabled={isPlaying || isLoading}
    >
      {isLoading ? (
        <span className={styles.spinner} />
      ) : (
        '🔊'
      )}
    </button>
  );
}
