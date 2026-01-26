'use client';

import styles from './ChatListItem.module.css';
import { IChat } from '@/types/chat';

interface ChatListItemProps {
  chat: IChat;
  isSelected: boolean;
  onClick: (chatId: string) => void;
}

export default function ChatListItem({ chat, isSelected, onClick }: ChatListItemProps) {
  // Format timestamp as relative time (e.g., "2h ago", "Yesterday")
  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let createdTime;

    if (diffMins < 1) createdTime = 'Just now';
    else if (diffMins < 60) createdTime = `${diffMins}m ago`;
    else if (diffHours < 24) createdTime = `${diffHours}h ago`;
    else if (diffDays === 1) createdTime = 'Yesterday';
    else if (diffDays < 7) createdTime = `${diffDays}d ago`;
    else createdTime = date.toDateString();
    return createdTime;
  };

  // Truncate message text to 50 characters with ellipsis
  const truncateText = (text: string, maxLength = 50) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  return (
    <div
      className={`${styles.chatListItem} ${isSelected ? styles.selected : ''}`}
      onClick={() => onClick(chat.chatId)}
    >
      {/* Chat creation time */}
      <div className={styles.chatInfo}>
        <span className={styles.createdTime}>
          {'Created: '+ formatRelativeTime(chat.createdAt)}
        </span>
      </div>

      {/* Last message with timestamp */}
      {chat.lastMessage ? (
        <div className={styles.lastMessage}>
          <p className={styles.messageText}>
            {truncateText(chat.lastMessage.text)}
          </p>
          <span className={styles.messageTime}>
            {formatRelativeTime(chat.lastMessage.timestamp)}
          </span>
        </div>
      ) : (
        <p className={styles.noMessages}>No messages yet</p>
      )}
    </div>
  );
}
