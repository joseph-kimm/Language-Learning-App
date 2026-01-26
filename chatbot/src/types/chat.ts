/**
 * Shared type definitions for chat functionality
 * Safe to import in both client and server components (no Node.js dependencies)
 */

export enum Sender {
  USER = 'USER',
  BOT = 'BOT'
}

// Client-side interfaces (GraphQL responses - timestamps as ISO strings)
export interface IMessage {
  _id: string;
  chatId: string;  // Foreign key to Chat
  sender: Sender;
  text: string;
  timestamp: string;
}

export interface IChat {
  chatId: string;
  userId: string;
  createdAt: string;
  lastMessage: IMessage | null;  // Last message in the chat (can be null for new chats)
}

export interface IUser {
  userId: string;
  createdAt: string;
}

// Server-side MongoDB document interfaces (timestamps as Date objects)
// Note: _id is automatically added by Mongoose Document, so we don't include it here
export interface IMessageDoc {
  chatId: string;  // Foreign key to Chat
  sender: Sender;
  text: string;
  timestamp: Date;
}

export interface IChatDoc {
  chatId: string;
  userId: string;
  createdAt: Date;
  lastMessage?: {
    _id: string;
    chatId: string;
    sender: Sender;
    text: string;
    timestamp: Date;
  } | null;  // Embedded last message (optional)
}

export interface IUserDoc {
  userId: string;
  createdAt: Date;
}

// GraphQL mutation response types
export interface CreateChatData {
  createChat: {
    chatId: string;
  };
}

export interface AddMessageData {
  addMessage: IMessage;
}

// GraphQL query response types
export interface GetChatsData {
  getChats: IChat[];
}

export interface GetMessagesData {
  getMessages: IMessage[];
}
