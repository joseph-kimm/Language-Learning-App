'use client';

import { useState, useCallback, useEffect } from 'react';
import { detectLanguage } from '@/utils/languageDetection';

/**
 * Global utterance tracking to ensure only one message plays at a time
 * Uses singleton pattern with module-level state
 */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Interface for the useTTS hook return value
 */
export interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  isSupported: boolean;
}

/**
 * Custom hook for text-to-speech functionality using Web Speech API
 *
 * Features:
 * - Automatic language detection using franc-min
 * - Global playback management (only one message at a time)
 * - Browser support detection
 * - Cleanup on unmount
 *
 * @returns Object with speak, stop functions and state
 */
export function useTTS(language: string): UseTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if Web Speech API is supported
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  /**
   * Speaks the given text using Web Speech API
   * Automatically detects language and cancels any previous playback
   */
  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any existing speech
    if (currentUtterance) {
      speechSynthesis.cancel();
    }

    // Set loading state immediately
    setIsLoading(true);

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Use explicit language if provided, otherwise auto-detect
    utterance.lang = language || detectLanguage(text);
    console.log(utterance.lang)

    // Set up event handlers
    utterance.onstart = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsLoading(false);
      currentUtterance = null;
    };

    utterance.onerror = (event) => {
      console.warn('Speech synthesis error:', event);
      setIsPlaying(false);
      setIsLoading(false);
      currentUtterance = null;
    };

    // Store and start utterance
    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
  }, [isSupported, language]);

  /**
   * Stops current speech playback
   */
  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setIsLoading(false);
      currentUtterance = null;
    }
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { speak, stop, isPlaying, isLoading, isSupported };
}
