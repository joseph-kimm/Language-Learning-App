'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Global recognition instance to ensure only one recording at a time
 * Uses singleton pattern with module-level state
 */
let currentRecognition: SpeechRecognition | null = null;

/**
 * Interface for the useSpeechToText hook return value
 */
export interface UseSpeechToTextReturn {
  transcript: string;
  interimTranscript: string;
  startRecording: () => void;
  stopRecording: () => void;
  resetTranscript: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  isSupported: boolean;
}

/**
 * Custom hook for speech-to-text functionality using Web Speech API
 *
 * Features:
 * - Spanish language recognition (es-ES) by default
 * - Browser support detection (Chrome, Edge, Safari)
 * - Real-time transcript updates
 * - Error handling for permissions, no speech, network issues
 * - Cleanup on unmount
 *
 * @returns Object with recording controls and state
 */
export function useSTT(language: string): UseSpeechToTextReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if Web Speech API is supported
  const SpeechRecognitionClass =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const isSupported = !!SpeechRecognitionClass;

  /**
   * Initialize speech recognition instance
   */
  const initRecognition = useCallback(() => {
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();

    // Configure recognition
    recognition.lang = language;
    recognition.continuous = false; // Stop after one phrase
    recognition.interimResults = true; // Show real-time results
    recognition.maxAlternatives = 1; // Single best result

    return recognition;
  }, [SpeechRecognitionClass, language]);

  /**
   * Start speech recognition
   */
  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    // Cancel any existing recognition first
    if (currentRecognition) {
      currentRecognition.stop();
      currentRecognition = null;
    }

    // Clear previous state
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setIsProcessing(true);

    // Initialize new recognition instance
    const recognition = initRecognition();
    if (!recognition) return;

    // Event handler: Recognition started
    recognition.onstart = () => {
      setIsProcessing(false);
      setIsRecording(true);
    };

    // Event handler: Speech recognized
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += transcriptPart;
        } else {
          interimText += transcriptPart;
        }
      }

      // Update transcript states separately
      if (finalText) {
        setTranscript(prev => prev ? `${prev} ${finalText}` : finalText);
        setInterimTranscript(''); // Clear interim when we get final
      } else if (interimText) {
        setInterimTranscript(interimText);
      }
    };

    // Event handler: Recognition ended
    recognition.onend = () => {
      setIsRecording(false);
      setIsProcessing(false);
      currentRecognition = null;
    };

    // Event handler: Speech ended (auto-stop)
    recognition.onspeechend = () => {
      recognition.stop();
    };

    // Event handler: Errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      setIsProcessing(false);

      // Map error types to user-friendly messages
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          setError('Microphone permission denied');
          break;
        case 'no-speech':
          setError('No speech detected. Please try again');
          break;
        case 'audio-capture':
          setError('Microphone not found');
          break;
        case 'network':
          setError('Network error occurred');
          break;
        case 'aborted':
          // User manually stopped - no error needed
          setError(null);
          break;
        default:
          setError('Speech recognition error occurred');
      }

      currentRecognition = null;
    };

    // Start recognition
    try {
      recognition.start();
      currentRecognition = recognition;
      recognitionRef.current = recognition;
    } catch (err) {
      setError('Failed to start recording');
      setIsProcessing(false);
      setIsRecording(false);
    }
  }, [isSupported, initRecognition]);

  /**
   * Stop speech recognition
   */
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (currentRecognition) {
      currentRecognition.stop();
    }
  }, []);

  /**
   * Reset transcript
   */
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentRecognition) {
        currentRecognition.stop();
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    resetTranscript,
    isRecording,
    isProcessing,
    error,
    isSupported
  };
}
