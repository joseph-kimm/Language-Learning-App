import { useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client/react';
import {gql} from '@apollo/client'

const BOT_MESSAGE_STREAM_SUBSCRIPTION = gql`
  subscription OnBotMessageStream($chatId: ID!, $messageId: ID!) {
    botMessageStream(chatId: $chatId, messageId: $messageId) {
      messageId
      chatId
      chunk
      isComplete
    }
  }
`;

interface UseBotMessageStreamResult {
  streamingText: string;
  isStreaming: boolean;
  isComplete: boolean;
}

interface BotMessageStreamData {
  botMessageStream: {
    chunk: string;
    isComplete: boolean;
  };
}

/**
 * Hook to subscribe to bot message streaming for a specific message
 * @param chatId - The chat ID
 * @param messageId - The bot message ID to stream
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useBotMessageStream(
  chatId: string | null,
  messageId: string | null,
  enabled: boolean = true
): UseBotMessageStreamResult {
  const [streamingText, setStreamingText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const shouldSkip = !enabled || !chatId || !messageId;

  const { data } = useSubscription<BotMessageStreamData>(BOT_MESSAGE_STREAM_SUBSCRIPTION, {
    variables: { chatId, messageId },
    skip: shouldSkip,
  });

  useEffect(() => {
    if (data?.botMessageStream) {
      const { chunk, isComplete: chunkComplete } = data.botMessageStream;

      if (chunkComplete) {
        setIsComplete(true);
      } else if (chunk) {
        setStreamingText((prev) => prev + chunk);
      }
    }
  }, [data]);

  // Reset state when messageId changes
  useEffect(() => {
    if (messageId) {
      setStreamingText('');
      setIsComplete(false);
    }
  }, [messageId]);

  return {
    streamingText,
    isStreaming: enabled && !isComplete && !!messageId,
    isComplete,
  };
}
