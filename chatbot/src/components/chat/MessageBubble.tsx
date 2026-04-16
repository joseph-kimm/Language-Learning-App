'use client';

import { useState, useRef } from 'react';
import { gql } from 'graphql-tag';
import { useLazyQuery } from '@apollo/client/react';
import styles from './MessageBubble.module.css';
import { Sender } from '@/types/chat';
import TTSButton from './TTSButton';
import { useClickOutside } from '@/hooks/useClickOutside';

const IMPROVE_SENTENCE_QUERY = gql`
  query ImproveSentence($chatId: ID!, $messageId: ID!) {
    improveSentence(chatId: $chatId, messageId: $messageId) {
      improvedSentence
      explanation
    }
  }
`;

const EXPLAIN_BOT_MESSAGE_QUERY = gql`
  query ExplainBotMessage($chatId: ID!, $messageId: ID!) {
    explainBotMessage(chatId: $chatId, messageId: $messageId) {
      translation
      explanation
    }
  }
`;

interface ImproveSentenceData {
  improveSentence: {
    improvedSentence: string;
    explanation: string;
  };
}

interface ExplainBotMessageData {
  explainBotMessage: {
    translation: string;
    explanation: string;
  };
}

interface MessageBubbleProps {
  sender: Sender;
  text: string;
  timestamp: string; // ISO 8601 from GraphQL
  messageId?: string; // For streaming bot responses
  chatId?: string; // For streaming bot responses
  isStreaming?: boolean; // Whether this message is currently streaming
  language: string; // BCP-47 language code for TTS
  isLastBotMessage?: boolean; // Whether this is the last bot message (for regenerate)
  onRegenerate?: () => void; // Callback to regenerate bot response
  nativeLanguage?: string;
}

/**
 * Individual message bubble component
 * Styles differently based on sender (user right-aligned blue, bot left-aligned gray)
 * Includes TTS functionality - click message to show TTS button
 * For user messages: also shows an Improve button that suggests a better version
 */
export default function MessageBubble({ sender, text, timestamp, messageId, chatId, isStreaming: initialStreaming, language, isLastBotMessage, onRegenerate, nativeLanguage }: MessageBubbleProps) {
  const [showTTS, setShowTTS] = useState(false);
  const [improvement, setImprovement] = useState<{ improvedSentence: string; explanation: string } | null>(null);
  const [showImprovement, setShowImprovement] = useState(false);
  const [botExplanation, setBotExplanation] = useState<{ translation: string; explanation: string } | null>(null);
  const [showBotExplanation, setShowBotExplanation] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isUser = sender === Sender.USER;

  // ChatInterface streams text directly into the `text` prop via its subscription.
  // We just need the isStreaming flag for the cursor/typing indicator.
  const displayText = text;
  const isCurrentlyStreaming = !!initialStreaming;

  const [improveSentence, { loading: isImproving }] = useLazyQuery<ImproveSentenceData>(
    IMPROVE_SENTENCE_QUERY,
    { fetchPolicy: 'no-cache' }
  );

  const [explainBotMessageQuery, { loading: isExplaining }] = useLazyQuery<ExplainBotMessageData>(
    EXPLAIN_BOT_MESSAGE_QUERY,
    { fetchPolicy: 'no-cache' }
  );

  // Hide TTS/improve buttons when clicking outside the message bubble
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
   * Shows TTS (and Improve for user messages) button when message content is clicked
   */
  const handleShowTTS = () => {
    if (!displayText.trim() || isCurrentlyStreaming) return;
    setShowTTS(true);
  };

  const handleImprove = async () => {
    if (!chatId || !messageId) return;
    setShowTTS(false);
    const result = await improveSentence({ variables: { chatId, messageId } });
    if (result.data) {
      setImprovement(result.data.improveSentence);
      setShowImprovement(true);
    }
  };

  const handleExplain = async () => {
    if (!chatId || !messageId) return;
    // Toggle panel if result already cached
    if (botExplanation) {
      setShowBotExplanation(prev => !prev);
      return;
    }
    const result = await explainBotMessageQuery({ variables: { chatId, messageId } });
    if (result.data) {
      setBotExplanation(result.data.explainBotMessage);
      setShowBotExplanation(true);
    }
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
          {!displayText && isCurrentlyStreaming ? (
            <div className={styles.typingDots}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          ) : (
            <>
              <p className={styles.messageText}>
                {displayText}
                {isCurrentlyStreaming && <span className={styles.cursor}>▊</span>}
              </p>
              <span className={styles.messageTime}>
                {formatTime(timestamp)}
                {isCurrentlyStreaming && <span> (typing...)</span>}
              </span>
            </>
          )}

          {showTTS && !isCurrentlyStreaming && (
            <TTSButton
              text={displayText}
              isUser={isUser}
              onHide={() => setShowTTS(false)}
              language={language}
            />
          )}

          {/* Improve button — inside bubble for absolute positioning, left of TTS */}
          {isUser && (showTTS || isImproving) && !isCurrentlyStreaming && (
            <button
              className={styles.improveButton}
              onClick={handleImprove}
              disabled={isImproving}
              data-tooltip="Improve sentence"
            >
              {isImproving ? <span className={styles.loadingDots} /> : '✦'}
            </button>
          )}

          {/* Explain button — inside bubble for absolute positioning, right of TTS */}
          {!isUser && (showTTS || isExplaining) && !isCurrentlyStreaming && !!messageId && !!nativeLanguage && (
            <button
              className={styles.explainButton}
              onClick={handleExplain}
              disabled={isExplaining}
              data-tooltip="Explain in my language"
            >
              {isExplaining ? <span className={styles.loadingDots} /> : 'あ'}
            </button>
          )}
        </div>
      </div>

      {/* Improvement result panel */}
      {showImprovement && improvement && (
        <div className={styles.improvementPanel}>
          <button
            className={styles.closePanelButton}
            onClick={() => setShowImprovement(false)}
            aria-label="Close"
          >
            ×
          </button>
          <p className={styles.improvedSentence}>{improvement.improvedSentence}</p>
          {improvement.explanation && (
            <p className={styles.explanationText}>{improvement.explanation}</p>
          )}
        </div>
      )}

      {/* Bot explanation panel */}
      {showBotExplanation && botExplanation && (
        <div className={styles.botExplanationPanel}>
          <button
            className={styles.closePanelButton}
            onClick={() => setShowBotExplanation(false)}
            aria-label="Close"
          >
            ×
          </button>
          <p className={styles.translationText}>{botExplanation.translation}</p>
          {botExplanation.explanation && botExplanation.explanation !== 'No notes.' && (
            <p className={styles.explanationText}>{botExplanation.explanation}</p>
          )}
        </div>
      )}

      {isLastBotMessage && !isCurrentlyStreaming && onRegenerate && (
        <button
          className={styles.regenerateButton}
          onClick={onRegenerate}
          aria-label="Regenerate response"
          data-tooltip="Regenerate response"
        >
          ↻
        </button>
      )}
    </div>
  );
}
