import { PubSub } from 'graphql-subscriptions';
import type { IChat } from '@/types/chat';
import type { MessageChunk } from '@/types/llm';

/**
 * PubSub instance for GraphQL subscriptions
 * In production, replace with RedisPubSub for horizontal scaling
 */

// Event types
export const CHAT_EVENTS = {
  CHAT_CREATED: 'CHAT_CREATED',
  CHAT_UPDATED: 'CHAT_UPDATED',
  BOT_MESSAGE_CHUNK: 'BOT_MESSAGE_CHUNK',
} as const;

// Event payload types - reusing existing IChat interface
export interface ChatCreatedPayload {
  chatCreated: IChat;
}

export interface ChatUpdatedPayload {
  chatUpdated: IChat;
}

export interface BotMessageChunkPayload {
  botMessageStream: MessageChunk;
}

// Singleton instance - use global to persist across Next.js route handlers
// This is crucial because Next.js can create separate module instances for different routes
const globalForPubSub = globalThis as unknown as {
  pubsub: PubSub | undefined;
};

export const pubsub = globalForPubSub.pubsub ?? new PubSub();

// Persist in global to ensure same instance across all routes
if (!globalForPubSub.pubsub) {
  globalForPubSub.pubsub = pubsub;
}
