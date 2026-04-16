export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MessageChunk {
  messageId: string;
  chatId: string;
  chunk: string;
  isComplete: boolean;
}

interface LLMError {
  code: 'LLM_API_ERROR' | 'LLM_TIMEOUT' | 'LLM_INVALID_RESPONSE';
  message: string;
  timestamp: string;
}
