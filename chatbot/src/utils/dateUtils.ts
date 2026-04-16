import { IMessage } from '@/types/chat';

/**
 * Interface for grouped messages by date
 */
interface MessageGroup {
  date: string; // Formatted date string ("Today", "Yesterday", or full date)
  messages: IMessage[];
}

/**
 * Formats a date for display in date divider
 * @param dateString - ISO 8601 timestamp or Date object
 * @returns "Today", "Yesterday", or "Month Day, Year" (e.g., "January 15, 2025")
 */
function formatDateDivider(dateString: string | Date): string {
  const messageDate = new Date(dateString);
  const today = new Date();

  // Reset time to midnight for accurate date comparison
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const messageMidnight = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

  // Calculate difference in days
  const diffTime = todayMidnight.getTime() - messageMidnight.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  // For older dates, return "Month Day, Year"
  return messageDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Groups messages by date
 * @param messages - Array of messages with ISO 8601 timestamps (should be sorted by timestamp)
 * @returns Array of message groups with formatted date headers
 */
export function groupMessagesByDate(messages: IMessage[]): MessageGroup[] {
  if (messages.length === 0) {
    return [];
  }

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;
  let currentDateKey = '';

  for (const message of messages) {
    const messageDate = new Date(message.timestamp);
    // Use date string as key (YYYY-MM-DD format) for grouping
    const dateKey = messageDate.toDateString();

    if (dateKey !== currentDateKey) {
      // Start a new group
      currentGroup = {
        date: formatDateDivider(message.timestamp),
        messages: [message]
      };
      groups.push(currentGroup);
      currentDateKey = dateKey;
    } else {
      // Add to current group
      currentGroup?.messages.push(message);
    }
  }

  return groups;
}
