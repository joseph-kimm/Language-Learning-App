'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import styles from './SideNav.module.css';
import ChatListItem from './ChatListItem';
import { IChat } from '@/types/chat';
import { TargetLanguage } from '@/types/survey';
import { useChatSubscriptions } from '@/hooks/useChatSubscriptions';

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChatId: string | null;
  onChatSelect: (chatId: string | null) => void;
  language: TargetLanguage;
}

interface GetChatsData {
  getChats: IChat[];
}

const GET_CHATS_QUERY = gql`
  query GetChats($userId: ID) {
    getChats(userId: $userId) {
      chatId
      createdAt
      language
      personality
      lastMessage {
        text
        timestamp
      }
    }
  }
`;

export default function SideNav({ isOpen, onClose, selectedChatId, onChatSelect, language }: SideNavProps) {
  const { data, loading, error } = useQuery<GetChatsData>(GET_CHATS_QUERY, {
    variables: { userId: undefined }, // Uses default 'mock-user-123'
  });

  // Subscribe to real-time chat updates
  useChatSubscriptions({
    userId: undefined, // Uses default 'mock-user-123'
  });

  // Filter chats by selected language
  const filteredChats = data?.getChats.filter(
    (chat) => chat.language === language
  ) || [];

  // Handle chat item click
  const handleChatClick = (chatId: string) => {
    onChatSelect(chatId);
    // On mobile, close nav after selection
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Handle new chat button click
  const handleNewChat = () => {
    onChatSelect(null);
    // On mobile, close nav after selection
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Side navigation */}
      <nav
        className={`${styles.sideNav} ${isOpen ? styles.open : ''}`}
        aria-label="Chat history"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Chat History</h2>
          <button
            className={styles.newChatButton}
            onClick={handleNewChat}
            aria-label="Start new chat"
          >
            + New Chat
          </button>
        </div>

        <div className={styles.chatList}>
          {loading && (
            <div className={styles.statusMessage}>Loading chats...</div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              Failed to load chats. Please try again.
            </div>
          )}

          {!loading && !error && filteredChats.length === 0 && (
            <div className={styles.statusMessage}>No chats yet</div>
          )}

          {!loading && !error && filteredChats.map((chat: IChat) => (
            <ChatListItem
              key={chat.chatId}
              chat={chat}
              isSelected={chat.chatId === selectedChatId}
              onClick={handleChatClick}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
