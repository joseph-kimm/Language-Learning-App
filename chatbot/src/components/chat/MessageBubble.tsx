'use client';

import { useState, useRef } from 'react';
import styles from './MessageBubble.module.css';
import { Sender } from '@/types/chat';
import TTSButton from './TTSButton';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useBotMessageStream } from '@/hooks/useBotMessageStream';

interface MessageBubbleProps {
  sender: Sender;
  text: string;
  timestamp: string; // ISO 8601 from GraphQL
  messageId?: string; // For streaming bot responses
  chatId?: string; // For streaming bot responses
  isStreaming?: boolean; // Whether this message is currently streaming
}

/**
 * Individual message bubble component
 * Styles differently based on sender (user right-aligned blue, bot left-aligned gray)
 * Includes TTS functionality - click message to show TTS button
 */
export default function MessageBubble({ sender, text, timestamp, messageId, chatId, isStreaming: initialStreaming }: MessageBubbleProps) {
  const [showTTS, setShowTTS] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isUser = sender === Sender.USER;

  // Use streaming hook for bot messages that are streaming
  const shouldStream = sender === Sender.BOT && initialStreaming && !!messageId && !!chatId;

  const { streamingText, isStreaming: streamActive } = useBotMessageStream(
    shouldStream ? chatId : null,
    shouldStream ? messageId : null,
    shouldStream
  );

  // Use streaming text if available, otherwise use the prop text
  // Important: Only use streamingText if we actually have streamed content
  const displayText = (shouldStream && streamingText) ? streamingText : text;
  const isCurrentlyStreaming = shouldStream && streamActive;

  // Hide TTS button when clicking outside the message bubble
  useClickOutside(bubbleRef, () => setShowTTS(false), showTTS);

  // Format ISO string to readable time (e.g., "2:45 PM")
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  /**
   * Shows TTS button when message content is clicked
   */
  const handleShowTTS = () => {
    if (!displayText.trim() || isCurrentlyStreaming) return;
    setShowTTS(true);
  };

  return (
    <div className={styles.messageBubbleWrapper}>
      <div
        className={`${styles.messageBubble} ${isUser ? styles.userMessage : styles.botMessage}`}
      >
        <div
          ref={bubbleRef}
          className={styles.messageContent}
          onClick={handleShowTTS}
        >
          <p className={styles.messageText}>
            {displayText}
            {isCurrentlyStreaming && <span className={styles.cursor}>▊</span>}
          </p>
          <span className={styles.messageTime}>
            {formatTime(timestamp)}
            {isCurrentlyStreaming && <span> (typing...)</span>}
          </span>

          {showTTS && !isCurrentlyStreaming && (
            <TTSButton
              text={displayText}
              isUser={isUser}
              onHide={() => setShowTTS(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
