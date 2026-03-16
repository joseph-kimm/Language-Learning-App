import { useSubscription } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { MessageChunk } from '@/types/llm';

const BOT_MESSAGE_STREAM_SUBSCRIPTION = gql`
  subscription BotMessageStream($chatId: ID!) {
    botMessageStream(chatId: $chatId) {
      messageId
      chatId
      chunk
      isComplete
    }
  }
`;

/**
 * Subscribes to bot message streaming for an active chat.
 * Calls onChunk for each incoming chunk, including the final completion event.
 * Subscription is skipped when chatId is null.
 */
export function useBotMessageStream(
  chatId: string | null,
  onChunk: (chunk: MessageChunk) => void
): void {
  useSubscription<{ botMessageStream: MessageChunk }>(BOT_MESSAGE_STREAM_SUBSCRIPTION, {
    variables: { chatId },
    skip: !chatId,
    onData: ({ data }) => {
      const chunk = data.data?.botMessageStream;
      if (chunk) onChunk(chunk);
    },
  });
}
