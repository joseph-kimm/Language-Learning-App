"use client";

import { useState, useEffect, useRef } from "react";
import { gql } from "graphql-tag";
import { useMutation, useQuery } from "@apollo/client/react";
import styles from "./ChatInterface.module.css";
import MessageBubble from "./MessageBubble";
import DateDivider from "./DateDivider";
import {
  Sender,
  Personality,
  IMessage,
  CreateChatData,
  AddMessageData,
  GetMessagesData,
  RegenerateResponseData,
} from "@/types/chat";
import PersonalityPicker from "./PersonalityPicker";
import { TargetLanguage } from "@/types/survey";
import { groupMessagesByDate } from "@/utils/dateUtils";
import { useSTT } from "@/hooks/useSTT";

const TARGET_LANGUAGE_TO_BCP47: Record<TargetLanguage, string> = {
  [TargetLanguage.ENGLISH]: "en-US",
  [TargetLanguage.KOREAN]: "ko-KR",
  [TargetLanguage.SPANISH]: "es-ES",
};

// Create a new chat
const CREATE_CHAT_MUTATION = gql`
  mutation CreateChat($language: TargetLanguage!, $personality: Personality) {
    createChat(language: $language, personality: $personality) {
      chatId
    }
  }
`;

// Add a message to existing chat - returns only the new message
const ADD_MESSAGE_MUTATION = gql`
  mutation AddMessage($chatId: ID!, $sender: Sender!, $text: String!) {
    addMessage(chatId: $chatId, sender: $sender, text: $text) {
      _id
      chatId
      sender
      text
      timestamp
    }
  }
`;

// Regenerate bot response
const REGENERATE_RESPONSE_MUTATION = gql`
  mutation RegenerateResponse($chatId: ID!, $messageId: ID!) {
    regenerateResponse(chatId: $chatId, messageId: $messageId) {
      _id
      chatId
      sender
      text
      timestamp
    }
  }
`;

// Fetch all messages for a chat
const GET_MESSAGES_QUERY = gql`
  query GetMessages($chatId: ID!) {
    getMessages(chatId: $chatId) {
      _id
      chatId
      sender
      text
      timestamp
    }
  }
`;

interface ChatInterfaceProps {
  chatId: string | null;
  onChatCreated?: (chatId: string) => void;
  language: TargetLanguage;
}

export default function ChatInterface({
  chatId,
  onChatCreated,
  language,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality | null>(null);
  const [streamingBotMessageId, setStreamingBotMessageId] = useState<
    string | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech-to-text hook
  const {
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    resetTranscript,
    isRecording,
    isProcessing,
    error: sttError,
    isSupported: sttSupported,
  } = useSTT(TARGET_LANGUAGE_TO_BCP47[language]);

  const [createChatMutation] =
    useMutation<CreateChatData>(CREATE_CHAT_MUTATION);
  const [addMessageMutation] =
    useMutation<AddMessageData>(ADD_MESSAGE_MUTATION);
  const [regenerateResponseMutation] =
    useMutation<RegenerateResponseData>(REGENERATE_RESPONSE_MUTATION);

  // Fetch messages when chatId is available
  const { data: messagesData, refetch } = useQuery<GetMessagesData>(
    GET_MESSAGES_QUERY,
    {
      variables: { chatId },
      skip: !chatId, // Skip query if no chatId
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first", // After initial fetch, prefer cache to avoid overwriting streaming
    },
  );

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle chatId changes (user selected different chat or new chat)
  useEffect(() => {
    if (chatId) {
      // User selected existing chat - messages will load from query
      setCurrentChatId(chatId);
    } else {
      // User clicked "New Chat" - clear messages and reset state
      setMessages([]);
      setCurrentChatId(null);
      setSelectedPersonality(null);
    }
  }, [chatId]);

  // Update local messages state when query data arrives
  useEffect(() => {
    if (messagesData?.getMessages) {
      const newMessages = messagesData.getMessages;
      setMessages(newMessages);

      // Detect if a new bot message was added (for streaming)
      if (newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1];

        if (lastMessage.sender === "BOT" && lastMessage.text.trim() === "") {
          // Empty/whitespace bot message means it's streaming
          if (streamingBotMessageId !== lastMessage._id) {
            setStreamingBotMessageId(lastMessage._id);
          }
        } else if (
          streamingBotMessageId &&
          lastMessage._id === streamingBotMessageId &&
          lastMessage.text.trim() !== ""
        ) {
          // Bot message completed streaming
          setStreamingBotMessageId(null);
        }
      }
    }
  }, [messagesData, streamingBotMessageId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // Update message when final transcript changes (not interim)
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

  // Auto-resize textarea as content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set height based on content, with max height of ~5 lines
      const maxHeight = parseFloat(getComputedStyle(textarea).lineHeight) * 5;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    }
  }, [message, interimTranscript]);

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      resetTranscript();
      startRecording();
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!currentChatId) return;

    try {
      await regenerateResponseMutation({
        variables: { chatId: currentChatId, messageId },
      });

      // Poll for the new bot placeholder message
      const pollForBotMessage = async (attempts: number) => {
        const result = await refetch({ chatId: currentChatId });
        const msgs = result.data?.getMessages || [];
        const lastMsg = msgs[msgs.length - 1];
        if ((!lastMsg || lastMsg.sender !== "BOT") && attempts < 10) {
          setTimeout(() => pollForBotMessage(attempts + 1), 500);
        }
      };
      await pollForBotMessage(0);
    } catch (error) {
      console.error("Failed to regenerate response:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    const userMessage = message.trim();
    setMessage("");
    resetTranscript();
    setIsLoading(true);

    try {
      // Create chat on first message if no chatId provided
      let activeChatId = currentChatId;
      if (!activeChatId) {
        const { data } = await createChatMutation({ variables: { language, personality: selectedPersonality || 'DEFAULT' } });
        activeChatId = data?.createChat?.chatId || null;
        setCurrentChatId(activeChatId);
        // Notify parent component about new chat creation
        if (activeChatId && onChatCreated) {
          onChatCreated(activeChatId);
        }
      }

      // Add message to database
      await addMessageMutation({
        variables: {
          chatId: activeChatId,
          sender: "USER",
          text: userMessage,
        },
      });

      // Refetch messages to get updated list from server
      // Then poll until the bot placeholder message appears (it's created asynchronously)
      if (activeChatId) {
        const chatIdForPoll = activeChatId;
        const pollForBotMessage = async (attempts: number) => {
          const result = await refetch({ chatId: chatIdForPoll });
          const msgs = result.data?.getMessages || [];
          const lastMsg = msgs[msgs.length - 1];
          if ((!lastMsg || lastMsg.sender !== "BOT") && attempts < 10) {
            setTimeout(() => pollForBotMessage(attempts + 1), 500);
          }
        };
        await pollForBotMessage(0);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.welcomeMessage}>
            <p>Welcome to your language learning journey!</p>
            <p>Start a conversation to practice.</p>
            {!chatId && (
              <PersonalityPicker
                onSelect={setSelectedPersonality}
                selectedPersonality={selectedPersonality}
              />
            )}
          </div>
        ) : (
          <>
            {groupMessagesByDate(messages).map((group) => (
              <div key={group.date}>
                <DateDivider date={group.date} />
                {group.messages.map((msg) => {
                  const lastBotMsg = messages.findLast((m) => m.sender === Sender.BOT);
                  return (
                    <MessageBubble
                      key={msg._id}
                      sender={msg.sender}
                      text={msg.text}
                      timestamp={msg.timestamp as string}
                      messageId={msg._id}
                      chatId={msg.chatId}
                      isStreaming={msg._id === streamingBotMessageId}
                      language={TARGET_LANGUAGE_TO_BCP47[language]}
                      isLastBotMessage={msg._id === lastBotMsg?._id}
                      onRegenerate={() => handleRegenerate(msg._id)}
                    />
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {sttError && <div className={styles.errorMessage}>{sttError}</div>}

      <form
        className={styles.inputForm}
        onSubmit={handleSubmit}
        suppressHydrationWarning
      >
        <textarea
          ref={textareaRef}
          value={message || interimTranscript}
          onChange={(e) => {
            setMessage(e.target.value);
            // Clear transcript when user manually edits
            if (transcript) {
              resetTranscript();
            }
          }}
          onKeyDown={(e) => {
            // Submit on Enter, but allow Shift+Enter for new lines
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          placeholder={
            isMounted && isRecording ? "Listening..." : "Type your message..."
          }
          className={styles.input}
          disabled={isLoading}
          rows={1}
          suppressHydrationWarning
        />

        {/* Microphone Button - only show if supported and mounted */}
        {isMounted && sttSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`${styles.micButton} ${isRecording ? styles.recording : ""}`}
            disabled={isLoading || isProcessing}
            title={isRecording ? "Stop recording" : "Click to speak"}
          >
            {isProcessing ? (
              <span className={styles.spinner} />
            ) : isRecording ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>
        )}

        <button
          type="submit"
          className={styles.sendButton}
          disabled={isLoading || !message.trim()}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
