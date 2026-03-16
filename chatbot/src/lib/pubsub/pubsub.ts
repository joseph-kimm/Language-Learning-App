import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import type { IChat } from '@/types/chat';
import type { MessageChunk } from '@/types/llm';

// Event types
export const CHAT_EVENTS = {
  CHAT_CREATED: 'CHAT_CREATED',
  CHAT_UPDATED: 'CHAT_UPDATED',
  BOT_MESSAGE_CHUNK: 'BOT_MESSAGE_CHUNK',
} as const;

// Event payload types
export interface ChatCreatedPayload {
  chatCreated: IChat;
}

export interface ChatUpdatedPayload {
  chatUpdated: IChat;
}

export interface BotMessageChunkPayload {
  botMessageStream: MessageChunk;
}

const redisOptions = {
  tls: { rejectUnauthorized: false },
  family: 4,
  enableReadyCheck: false, // Upstash blocks the INFO command used for ready checks
  lazyConnect: true,       // Defer TCP connection until first command, avoiding eager module-load connections
  maxRetriesPerRequest: 0, // Don't retry failed commands — fail fast rather than queuing
};

// Two separate clients required by Redis pub/sub protocol
const publisher = new Redis(process.env.REDIS_URL!, redisOptions);
const subscriber = new Redis(process.env.REDIS_URL!, redisOptions);

// Prevent unhandled 'error' events from crashing the process
publisher.on('error', (err) => console.error('[Redis publisher]', err.message));
subscriber.on('error', (err) => console.error('[Redis subscriber]', err.message));

export const pubsub = new RedisPubSub({ publisher, subscriber });
