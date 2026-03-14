'use client';

import { useEffect } from 'react';
import { gql } from '@apollo/client';
import { useSubscription, useApolloClient } from '@apollo/client/react';
import { IChat } from '@/types/chat';

/**
 * GraphQL Subscriptions
 */
const CHAT_CREATED_SUBSCRIPTION = gql`
  subscription OnChatCreated($userId: ID!) {
    chatCreated(userId: $userId) {
      chatId
      userId
      createdAt
      language
      lastMessage {
        _id
        chatId
        sender
        text
        timestamp
      }
    }
  }
`;

const CHAT_UPDATED_SUBSCRIPTION = gql`
  subscription OnChatUpdated($userId: ID!) {
    chatUpdated(userId: $userId) {
      chatId
      userId
      createdAt
      language
      lastMessage {
        _id
        chatId
        sender
        text
        timestamp
      }
    }
  }
`;

interface UseChatSubscriptionsProps {
  userId?: string;
}

interface ChatCreatedData {
  chatCreated: IChat;
}

interface ChatUpdatedData {
  chatUpdated: IChat;
}

/**
 * Hook to subscribe to real-time chat updates
 * Handles both new chat creation and chat updates (lastMessage changes)
 */
export function useChatSubscriptions({ userId }: UseChatSubscriptionsProps = {}) {
  const client = useApolloClient();

  // Subscribe to new chats
  const { data: chatCreatedData, error: chatCreatedError } = useSubscription<ChatCreatedData>(
    CHAT_CREATED_SUBSCRIPTION,
    {
      variables: { userId },
      skip: !userId,
    }
  );

  // Subscribe to chat updates
  const { data: chatUpdatedData, error: chatUpdatedError } = useSubscription<ChatUpdatedData>(
    CHAT_UPDATED_SUBSCRIPTION,
    {
      variables: { userId },
      skip: !userId,
    }
  );

  // Handle new chat creation
  useEffect(() => {
    if (chatCreatedData?.chatCreated) {
      const newChat: IChat = chatCreatedData.chatCreated;

      // Update cache using modify for reliable re-renders
      client.cache.modify({
        fields: {
          getChats(existingChats = []) {
            // Add new chat to the beginning (newest first)
            return [newChat, ...existingChats];
          },
        },
      });
    }
  }, [chatCreatedData, client.cache]);

  // Handle chat updates (lastMessage changes)
  useEffect(() => {
    if (chatUpdatedData?.chatUpdated) {
      const updatedChat: IChat = chatUpdatedData.chatUpdated;

      // Update cache using modify for reliable re-renders
      client.cache.modify({
        fields: {
          getChats(existingChats = []) {
            // Replace the chat with matching chatId
            return existingChats.map((chat: IChat) =>
              chat.chatId === updatedChat.chatId ? updatedChat : chat
            );
          },
        },
      });
    }
  }, [chatUpdatedData, client.cache]);

  return {
    chatCreatedError,
    chatUpdatedError,
  };
}
