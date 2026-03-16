import { Chat, Message, Sender, UserProfile } from '@/lib/mongodb/mongodb_schema';
import { pubsub, CHAT_EVENTS } from '@/lib/pubsub/pubsub';
import { generateBotResponseStream, generateTextCompletion } from '@/utils/huggingFaceLLM';
import { buildSystemPrompt, buildImproveSentencePrompt, buildExplainBotMessagePrompt } from '@/utils/prompts';
import type { ConversationMessage } from '@/types/llm';
import type { GraphQLContext } from '@/graphql/context';
import { Personality } from '@/types/chat';
import {
  TargetLanguage,
  NativeLanguage,
  Interests,
  getLanguageLabel,
  getNativeLanguageLabel,
  getProficiencyLabel,
  getInterestLabel,
} from '@/types/survey';

const FALLBACK_MESSAGES: Record<string, string> = {
  [TargetLanguage.ENGLISH]: "Sorry, I'm having technical issues. Please try again.",
  [TargetLanguage.KOREAN]: "죄송합니다. 기술적인 문제가 있습니다. 다시 시도해 주세요.",
  [TargetLanguage.SPANISH]: "Lo siento, estoy teniendo problemas técnicos. Por favor, inténtalo de nuevo.",
};

/**
 * Background function to generate bot response with streaming
 */
export async function generateBotResponse(
  chatId: string,
  context: GraphQLContext
): Promise<void> {
  try {
    await context.connectToMongoDB();

    // Fetch the chat to get language and userId
    const chat = await Chat.findOne({ chatId }).lean();
    if (!chat) return;

    const targetLanguage = chat.language as TargetLanguage;
    const languageName = getLanguageLabel(targetLanguage);

    // Fetch user profile to build dynamic prompt
    const profile = await UserProfile.findOne({ userId: chat.userId }).lean();

    // Find the matching language entry in the profile
    const langEntry = profile?.learningLanguages?.find(
      (l: { language: string }) => l.language === targetLanguage
    );

    const systemPrompt = buildSystemPrompt({
      languageName,
      proficiencyLevel: langEntry ? getProficiencyLabel(langEntry.proficiencyLevel) : 'intermediate',
      learningGoals: langEntry?.learningGoals || 'general conversation',
      interests: profile?.interests?.map((i: string) => getInterestLabel(i as Interests)) || ['Daily Life'],
      personality: (chat.personality as Personality) || Personality.DEFAULT,
      introduction: profile?.introduction,
    });

    // Fetch last 10 messages for conversation context (includes the just-added user message)
    const recentMessages = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Convert to conversation history format (reverse to chronological order)
    const conversationHistory: ConversationMessage[] = recentMessages
      .reverse()
      .map(msg => ({
        role: msg.sender === Sender.USER ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

    // Create placeholder BOT message
    const botMessage = new Message({
      chatId,
      sender: Sender.BOT,
      text: ' ', // Will be updated with full text
      timestamp: new Date()
    });

    await botMessage.save();
    const botMessageId = botMessage._id.toString();

    let accumulatedText = '';

    try {
      // Stream LLM response
      for await (const chunk of generateBotResponseStream(conversationHistory, systemPrompt, targetLanguage)) {
        accumulatedText += chunk;

        // Publish chunk to subscribers
        await pubsub.publish(CHAT_EVENTS.BOT_MESSAGE_CHUNK, {
          botMessageStream: {
            messageId: botMessageId,
            chatId,
            chunk,
            isComplete: false
          }
        });
      }

      // Update bot message with complete text
      botMessage.text = accumulatedText;
      await botMessage.save();

      // Send final chunk indicating completion
      await pubsub.publish(CHAT_EVENTS.BOT_MESSAGE_CHUNK, {
        botMessageStream: {
          messageId: botMessageId,
          chatId,
          chunk: '',
          isComplete: true
        }
      });

    } catch (llmError) {
      console.error('[LLM Generation Error]', {
        error: llmError,
        chatId,
        messageId: botMessageId
      });

      // Use fallback message on error
      const fallback = FALLBACK_MESSAGES[targetLanguage] || FALLBACK_MESSAGES[TargetLanguage.ENGLISH];
      botMessage.text = fallback;
      await botMessage.save();

      // Send completion with fallback
      await pubsub.publish(CHAT_EVENTS.BOT_MESSAGE_CHUNK, {
        botMessageStream: {
          messageId: botMessageId,
          chatId,
          chunk: fallback,
          isComplete: true
        }
      });
    }

    // Update Chat's lastMessage with bot response
    const lastMessageData = {
      _id: botMessage._id.toString(),
      chatId: botMessage.chatId,
      sender: botMessage.sender,
      text: botMessage.text,
      timestamp: botMessage.timestamp
    };

    await Chat.findOneAndUpdate(
      { chatId },
      { lastMessage: lastMessageData }
    );

    // Publish CHAT_UPDATED event
    const updatedChat = await Chat.findOne({ chatId }).lean();
    if (updatedChat) {
      await pubsub.publish(CHAT_EVENTS.CHAT_UPDATED, {
        chatUpdated: {
          chatId: updatedChat.chatId,
          userId: updatedChat.userId,
          language: updatedChat.language,
          personality: updatedChat.personality || 'DEFAULT',
          createdAt: updatedChat.createdAt.toISOString(),
          lastMessage: updatedChat.lastMessage ? {
            _id: updatedChat.lastMessage._id,
            chatId: updatedChat.lastMessage.chatId,
            sender: updatedChat.lastMessage.sender,
            text: updatedChat.lastMessage.text,
            timestamp: updatedChat.lastMessage.timestamp.toISOString()
          } : null
        }
      });
    }

  } catch (error) {
    console.error('[Generate Bot Response Error]', {
      error,
      chatId
    });
  }
}

/**
 * Improves a user's sentence using conversation context.
 * Returns the improved sentence and an explanation in the user's native language.
 */
export async function improveSentence(
  chatId: string,
  messageId: string,
  context: GraphQLContext
): Promise<{ improvedSentence: string; explanation: string }> {
  await context.connectToMongoDB();

  const chat = await Chat.findOne({ chatId }).lean();
  if (!chat) throw new Error(`Chat ${chatId} not found`);

  const targetMessage = await Message.findById(messageId).lean();
  if (!targetMessage) throw new Error('Message not found');

  // Last 10 messages for conversation context
  const recentMessages = await Message.find({ chatId })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();
  const contextMessages = recentMessages.reverse();

  const profile = await UserProfile.findOne({ userId: chat.userId }).lean();
  const nativeLangLabel = profile?.nativeLanguage
    ? getNativeLanguageLabel(profile.nativeLanguage as NativeLanguage)
    : 'English';
  const targetLangLabel = getLanguageLabel(chat.language as TargetLanguage);

  const contextStr = contextMessages
    .map(m => `${m.sender === Sender.USER ? 'USER' : 'BOT'}: ${m.text}`)
    .join('\n');

  const prompt = buildImproveSentencePrompt({
    targetLangLabel,
    nativeLangLabel,
    userSentence: targetMessage.text,
    contextStr,
  });

  const result = await generateTextCompletion(
    [{ role: 'user', content: prompt }]
  );

  const improvedMatch = result.match(/IMPROVED:\s*(.+?)(?=\nEXPLANATION:|$)/s);
  const explanationMatch = result.match(/EXPLANATION:\s*([\s\S]+?)$/);

  return {
    improvedSentence: improvedMatch?.[1]?.trim() ?? result.trim(),
    explanation: explanationMatch?.[1]?.trim() ?? ''
  };
}

/**
 * Translates a bot's message and explains notable language points in the user's native language.
 */
export async function explainBotMessage(
  chatId: string,
  messageId: string,
  context: GraphQLContext
): Promise<{ translation: string; explanation: string }> {
  await context.connectToMongoDB();

  const chat = await Chat.findOne({ chatId }).lean();
  if (!chat) throw new Error(`Chat ${chatId} not found`);

  const targetMessage = await Message.findById(messageId).lean();
  if (!targetMessage) throw new Error('Message not found');

  const profile = await UserProfile.findOne({ userId: chat.userId }).lean();
  const nativeLangLabel = profile?.nativeLanguage
    ? getNativeLanguageLabel(profile.nativeLanguage as NativeLanguage)
    : 'English';
  const targetLangLabel = getLanguageLabel(chat.language as TargetLanguage);

  const langEntry = profile?.learningLanguages?.find(
    (l: { language: string }) => l.language === chat.language
  );
  const proficiencyLevel = langEntry
    ? getProficiencyLabel(langEntry.proficiencyLevel)
    : 'Intermediate';

  const prompt = buildExplainBotMessagePrompt({
    targetLangLabel,
    nativeLangLabel,
    proficiencyLevel,
    botMessage: targetMessage.text,
  });

  const result = await generateTextCompletion(
    [{ role: 'user', content: prompt }]
  );

  const translationMatch = result.match(/TRANSLATION:\s*(.+?)(?=\nEXPLANATION:|$)/s);
  const explanationMatch = result.match(/EXPLANATION:\s*([\s\S]+?)$/);

  return {
    translation: translationMatch?.[1]?.trim() ?? result.trim(),
    explanation: explanationMatch?.[1]?.trim() ?? ''
  };
}
