"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { gql } from "graphql-tag";
import { useMutation, useQuery } from "@apollo/client/react";
import { useBotMessageStream } from "@/hooks/useBotMessageStream";
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
import { MessageChunk } from "@/types/llm";

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
  nativeLanguage?: string;
}

export default function ChatInterface({
  chatId,
  onChatCreated,
  language,
  nativeLanguage,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPersonality, setSelectedPersonality] =
    useState<Personality | null>(null);
  const [streamingBotMessageId, setStreamingBotMessageId] = useState<
    string | null
  >(null);
  const [showWarmupPopup, setShowWarmupPopup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStreamingIdRef = useRef<string | null>(null);

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
  const [regenerateResponseMutation] = useMutation<RegenerateResponseData>(
    REGENERATE_RESPONSE_MUTATION,
  );

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

  // Handle incoming streaming chunks — stable ref so useBotMessageStream doesn't re-subscribe
  const handleStreamChunk = useCallback((chunk: MessageChunk) => {
    setStreamingBotMessageId(chunk.messageId);
    setMessages((prev) => {
      const exists = prev.find((m) => m._id === chunk.messageId);
      if (exists) {
        return prev.map((m) =>
          m._id === chunk.messageId ? { ...m, text: m.text + chunk.chunk } : m,
        );
      }
      // First real chunk — replace the pending typing indicator with the real message
      return [
        ...prev.filter((m) => !m._id.startsWith("pending-")),
        {
          _id: chunk.messageId,
          chatId: chunk.chatId,
          sender: "BOT" as Sender,
          text: chunk.chunk,
          timestamp: new Date().toISOString(),
        },
      ];
    });

    if (chunk.isComplete) {
      // Refetch first — DB saves before isComplete fires, so data is ready.
      // Only clear streamingBotMessageId after refetch resolves so the useEffect
      // doesn't overwrite local state with stale messagesData during the transition.
      refetch().then(() => setStreamingBotMessageId(null));
    }
  }, [refetch]);

  useBotMessageStream(currentChatId, handleStreamChunk);

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

      if (streamingBotMessageId) {
        // While streaming, preserve the locally-built bot message so DB refetches
        // don't overwrite the live chunks with the stale placeholder from DB
        setMessages((prev) => {
          const streamingMsg = prev.find(
            (m) => m._id === streamingBotMessageId,
          );
          if (!streamingMsg) return newMessages;
          return [
            ...newMessages.filter((m) => m._id !== streamingBotMessageId),
            streamingMsg,
          ];
        });
      } else {
        setMessages(newMessages);
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

  // Dismiss warmup popup when the first real chunk arrives (pending → real messageId).
  // This means the model is actively streaming, so the cold-start wait is over.
  useEffect(() => {
    const prev = prevStreamingIdRef.current;
    if (prev?.startsWith("pending-") && streamingBotMessageId && !streamingBotMessageId.startsWith("pending-")) {
      // Transition from pending placeholder → real messageId: model started streaming
      if (warmupTimerRef.current) {
        clearTimeout(warmupTimerRef.current);
        warmupTimerRef.current = null;
      }
      setShowWarmupPopup(false);
    }
    prevStreamingIdRef.current = streamingBotMessageId;
  }, [streamingBotMessageId]);

  // Clear warmup timer on unmount
  useEffect(() => {
    return () => {
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    };
  }, []);

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
      // Refetch before adding the pending indicator so messagesData no longer contains
      // the deleted message. Without this, the messagesData effect re-runs when
      // streamingBotMessageId changes and restores the old message from stale cache.
      await refetch();
      // Replace deleted message with a pending indicator — new bot message arrives via subscription
      const pendingId = `pending-${Date.now()}`;
      setMessages((prev) => [
        ...prev.filter((m) => m._id !== messageId),
        {
          _id: pendingId,
          chatId: currentChatId,
          sender: "BOT" as Sender,
          text: "",
          timestamp: new Date().toISOString(),
        },
      ]);
      setStreamingBotMessageId(pendingId);
      warmupTimerRef.current = setTimeout(() => setShowWarmupPopup(true), 10000);
    } catch (error) {
      console.error("Failed to regenerate response:", error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage("");
    resetTranscript();
    setIsLoading(true);
    warmupTimerRef.current = setTimeout(() => setShowWarmupPopup(true), 10000);

    try {
      // Create chat on first message if no chatId provided
      let activeChatId = currentChatId;
      if (!activeChatId) {
        const { data } = await createChatMutation({
          variables: {
            language,
            personality: selectedPersonality || "DEFAULT",
          },
        });
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

      // Refetch to show the user message — bot response arrives via subscription
      if (activeChatId) {
        await refetch({ chatId: activeChatId });
        // Show typing indicator while waiting for first chunk (~1-2s before server starts)
        const pendingId = `pending-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            _id: pendingId,
            chatId: activeChatId!,
            sender: "BOT" as Sender,
            text: "",
            timestamp: new Date().toISOString(),
          },
        ]);
        setStreamingBotMessageId(pendingId);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to send message:", error);
      if (warmupTimerRef.current) {
        clearTimeout(warmupTimerRef.current);
        warmupTimerRef.current = null;
      }
      setShowWarmupPopup(false);
      setIsLoading(false);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
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
                  const lastBotMsg = messages.findLast(
                    (m) => m.sender === Sender.BOT,
                  );
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
                      nativeLanguage={nativeLanguage}
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

      {showWarmupPopup && (
        <div className={styles.warmupPopup}>
          <span className={styles.warmupIcon}>ℹ</span>
          <p className={styles.warmupText}>
            The model may be waking up from a cold start and may take some time
            to respond. Thanks for your patience!
          </p>
          <button
            type="button"
            className={styles.warmupDismiss}
            onClick={() => setShowWarmupPopup(false)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

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
              handleSend();
            }
          }}
          placeholder={
            isMounted && isRecording ? "Listening..." : "Type your message..."
          }
          className={styles.input}
          disabled={isLoading || !!streamingBotMessageId}
          rows={1}
          suppressHydrationWarning
        />

        {/* Microphone Button - only show if supported and mounted */}
        {isMounted && sttSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`${styles.micButton} ${isRecording ? styles.recording : ""}`}
            disabled={isLoading || isProcessing || !!streamingBotMessageId}
            title={isRecording ? "Stop recording" : "Click to speak"}
          >
            {isProcessing ? (
              <span className={styles.spinner} />
            ) : isRecording ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
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
          disabled={isLoading || !message.trim() || !!streamingBotMessageId}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
