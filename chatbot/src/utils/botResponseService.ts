import { Chat, Message, Sender } from '@/lib/mongodb/mongodb_schema';
import { pubsub, CHAT_EVENTS } from '@/lib/pubsub/pubsub';
import { generateBotResponseStream } from '@/utils/huggingFaceLLM';
import type { ConversationMessage } from '@/types/llm';
import type { GraphQLContext } from '@/graphql/context';

const FALLBACK_MESSAGE = "Lo siento, estoy teniendo problemas técnicos. Por favor, inténtalo de nuevo.";

/**
 * Background function to generate bot response with streaming
 */
export async function generateBotResponse(
  chatId: string,
  context: GraphQLContext
): Promise<void> {
  try {
    await context.connectToMongoDB();

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
      for await (const chunk of generateBotResponseStream(conversationHistory)) {
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
      botMessage.text = FALLBACK_MESSAGE;
      await botMessage.save();

      // Send completion with fallback
      await pubsub.publish(CHAT_EVENTS.BOT_MESSAGE_CHUNK, {
        botMessageStream: {
          messageId: botMessageId,
          chatId,
          chunk: FALLBACK_MESSAGE,
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
