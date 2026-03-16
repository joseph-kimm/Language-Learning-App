import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import { v4 as uuidv4 } from 'uuid';
import { Chat, Message, Sender, UserProfile } from '@/lib/mongodb/mongodb_schema';
import { GraphQLContext } from './context';
import { pubsub, CHAT_EVENTS, ChatCreatedPayload, ChatUpdatedPayload, BotMessageChunkPayload } from '@/lib/pubsub/pubsub';
import { generateBotResponse, improveSentence, explainBotMessage } from '@/utils/botResponseService';

export const resolvers = {
  Query: {
    // Fetch chat by ID, returns null if not found
    getChat: async (_parent: unknown, { chatId }: { chatId: string }, context: GraphQLContext) => {
      try {
        await context.connectToMongoDB();
        const chat = await Chat.findOne({ chatId });

        if (!chat) {
          return null;
        }

        // Transform lastMessage if it exists (convert Date to ISO string)
        const lastMessage = chat.lastMessage ? {
          _id: chat.lastMessage._id,
          chatId: chat.lastMessage.chatId,
          sender: chat.lastMessage.sender,
          text: chat.lastMessage.text,
          timestamp: chat.lastMessage.timestamp.toISOString()
        } : null;

        return {
          chatId: chat.chatId,
          userId: chat.userId,
          personality: chat.personality || 'DEFAULT',
          createdAt: chat.createdAt.toISOString(),
          lastMessage
        };
      } catch (error) {
        console.error('Error fetching chat:', error);
        throw new GraphQLError('Failed to fetch chat', {
          extensions: { code: 'DB_CONNECTION_ERROR' }
        });
      }
    },

    // Fetch all chats for a specific user with their last messages
    getChats: async (_parent: unknown, { userId }: { userId?: string }, context: GraphQLContext) => {
      try {
        await context.connectToMongoDB();

        const finalUserId = userId || context.userId;

        if (!finalUserId) {
          throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        // Query MongoDB for user's chats, newest first
        const chats = await Chat.find({ userId: finalUserId })
          .sort({ createdAt: -1 })
          .lean();

        // Transform to GraphQL response format
        return chats.map(chat => ({
          chatId: chat.chatId,
          userId: chat.userId,
          language: chat.language,
          personality: chat.personality || 'DEFAULT',
          createdAt: chat.createdAt.toISOString(),
          lastMessage: chat.lastMessage ? {
            _id: chat.lastMessage._id,
            chatId: chat.lastMessage.chatId,
            sender: chat.lastMessage.sender,
            text: chat.lastMessage.text,
            timestamp: chat.lastMessage.timestamp.toISOString()
          } : null
        }));
      } catch (error) {
        console.error('Error fetching chats:', error);
        throw new GraphQLError('Failed to fetch chats', {
          extensions: { code: 'DB_CONNECTION_ERROR' }
        });
      }
    },

    // Fetch all messages for a specific chat, sorted by timestamp
    getMessages: async (_parent: unknown, { chatId }: { chatId: string }, context: GraphQLContext) => {
      try {
        await context.connectToMongoDB();

        // Verify chat exists
        const chat = await Chat.findOne({ chatId });
        if (!chat) {
          throw new GraphQLError(`Chat with ID ${chatId} not found`, {
            extensions: { code: 'CHAT_NOT_FOUND' }
          });
        }

        // Fetch all messages for this chat, sorted by timestamp ascending
        const messages = await Message.find({ chatId })
          .sort({ timestamp: 1 })
          .lean();

        // Transform to GraphQL response format
        return messages.map(msg => ({
          _id: msg._id.toString(),
          chatId: msg.chatId,
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp.toISOString()
        }));
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.error('Error fetching messages:', error);
        throw new GraphQLError('Failed to fetch messages', {
          extensions: { code: 'DB_CONNECTION_ERROR' }
        });
      }
    },

    // Improve a user's sentence — delegates all logic to botResponseService
    improveSentence: async (
      _parent: unknown,
      { chatId, messageId }: { chatId: string; messageId: string },
      context: GraphQLContext
    ) => {
      try {
        return await improveSentence(chatId, messageId, context);
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        console.error('Error improving sentence:', error);
        throw new GraphQLError('Failed to improve sentence', {
          extensions: { code: 'LLM_ERROR' }
        });
      }
    },

    // Translate and explain a bot message in the user's native language
    explainBotMessage: async (
      _parent: unknown,
      { chatId, messageId }: { chatId: string; messageId: string },
      context: GraphQLContext
    ) => {
      try {
        return await explainBotMessage(chatId, messageId, context);
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        console.error('Error explaining bot message:', error);
        throw new GraphQLError('Failed to explain bot message', {
          extensions: { code: 'LLM_ERROR' }
        });
      }
    },

    // Fetch user profile by userId, returns null if not found
    getUserProfile: async (_parent: unknown, { userId }: { userId: string }, context: GraphQLContext) => {
      try {
        await context.connectToMongoDB();
        const profile = await UserProfile.findOne({ userId }).lean();

        if (!profile) {
          return null;
        }

        return {
          userId: profile.userId,
          introduction: profile.introduction || '',
          nativeLanguage: profile.nativeLanguage,
          interests: profile.interests,
          additionalInterests: profile.additionalInterests || [],
          learningLanguages: profile.learningLanguages,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString()
        };
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw new GraphQLError('Failed to fetch user profile', {
          extensions: { code: 'DB_CONNECTION_ERROR' }
        });
      }
    }
  },

  Mutation: {
    // Create new chat with generated UUID
    createChat: async (_parent: unknown, { userId, language, personality }: { userId?: string; language: string; personality?: string }, context: GraphQLContext) => {
      try {
        await context.connectToMongoDB();

        const chatId = uuidv4();
        const finalUserId = userId || context.userId;

        if (!finalUserId) {
          throw new GraphQLError('Not authenticated', {
            extensions: { code: 'UNAUTHENTICATED' }
          });
        }

        const newChat = new Chat({
          chatId,
          userId: finalUserId,
          language,
          personality: personality || 'DEFAULT',
          createdAt: new Date(),
          lastMessage: null  // No messages yet
        });

        await newChat.save();

        // Prepare chat payload for return and subscription
        const chatPayload = {
          chatId: newChat.chatId,
          userId: newChat.userId,
          language: newChat.language,
          personality: newChat.personality,
          createdAt: newChat.createdAt.toISOString(),
          lastMessage: null
        };

        // Publish CHAT_CREATED event
        await pubsub.publish(CHAT_EVENTS.CHAT_CREATED, {
          chatCreated: chatPayload
        });

        return chatPayload;
      } catch (error) {
        console.error('Error creating chat:', error);
        throw new GraphQLError('Failed to create chat', {
          extensions: { code: 'DB_CONNECTION_ERROR' }
        });
      }
    },

    // Add message to chat - creates Message document and updates Chat.lastMessage
    addMessage: async (
      _parent: unknown,
      { chatId, sender, text }: { chatId: string; sender: string; text: string },
      context: GraphQLContext
    ) => {
      try {
        if (!text || text.trim().length === 0) {
          throw new GraphQLError('Message text cannot be empty', {
            extensions: { code: 'VALIDATION_ERROR' }
          });
        }

        if (!chatId) {
          throw new GraphQLError('chatId is required. Call createChat first.', {
            extensions: { code: 'VALIDATION_ERROR' }
          });
        }

        await context.connectToMongoDB();

        // Verify chat exists
        const chat = await Chat.findOne({ chatId });
        if (!chat) {
          throw new GraphQLError(`Chat with ID ${chatId} not found`, {
            extensions: { code: 'CHAT_NOT_FOUND' }
          });
        }

        // Create new Message document
        const newMessage = new Message({
          chatId,
          sender: sender as Sender,
          text: text.trim(),
          timestamp: new Date()
        });

        await newMessage.save();

        // Update Chat's lastMessage field (embedded copy for performance)
        const lastMessageData = {
          _id: newMessage._id.toString(),
          chatId: newMessage.chatId,
          sender: newMessage.sender,
          text: newMessage.text,
          timestamp: newMessage.timestamp
        };

        await Chat.findOneAndUpdate(
          { chatId },
          { lastMessage: lastMessageData }
        );

        // Fetch updated chat and publish CHAT_UPDATED event
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

        // If message is from USER, generate bot response in background
        if (sender === Sender.USER) {
          // Don't await - run in background
          generateBotResponse(chatId, context).catch(err => {
            console.error('[Bot Response Error]', err);
          });
        }

        // Return the new message
        return {
          _id: newMessage._id.toString(),
          chatId: newMessage.chatId,
          sender: newMessage.sender,
          text: newMessage.text,
          timestamp: newMessage.timestamp.toISOString()
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.error('Error adding message:', error);
        throw new GraphQLError('Failed to add message', {
          extensions: { code: 'UPDATE_FAILED' }
        });
      }
    },

    // Regenerate bot response: deletes the existing bot message and triggers a new one
    regenerateResponse: async (
      _parent: unknown,
      { chatId, messageId }: { chatId: string; messageId: string },
      context: GraphQLContext
    ) => {
      try {
        await context.connectToMongoDB();

        // Find and delete the existing bot message
        const existingMessage = await Message.findOneAndDelete({
          _id: messageId,
          chatId,
          sender: Sender.BOT
        }).lean();

        if (!existingMessage) {
          throw new GraphQLError('Bot message not found', {
            extensions: { code: 'NOT_FOUND' }
          });
        }

        // Trigger new bot response in background (reuses existing pipeline)
        generateBotResponse(chatId, context).catch(err => {
          console.error('[Regenerate Bot Response Error]', err);
        });

        return {
          _id: existingMessage._id.toString(),
          chatId: existingMessage.chatId,
          sender: existingMessage.sender,
          text: existingMessage.text,
          timestamp: existingMessage.timestamp.toISOString()
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.error('Error regenerating response:', error);
        throw new GraphQLError('Failed to regenerate response', {
          extensions: { code: 'UPDATE_FAILED' }
        });
      }
    },

    // Save or update user profile (upsert)
    saveUserProfile: async (
      _parent: unknown,
      { input }: { input: {
        userId: string;
        introduction?: string;
        nativeLanguage: string;
        interests: string[];
        additionalInterests?: string[];
        learningLanguages: Array<{
          language: string;
          proficiencyLevel: string;
          learningGoals: string;
        }>;
      }},
      context: GraphQLContext
    ) => {
      try {
        await context.connectToMongoDB();

        const now = new Date();
        const profileData = {
          userId: input.userId,
          introduction: input.introduction || '',
          nativeLanguage: input.nativeLanguage,
          interests: input.interests,
          additionalInterests: input.additionalInterests || [],
          learningLanguages: input.learningLanguages,
          updatedAt: now
        };

        // Upsert: create if not exists, update if exists
        const savedProfile = await UserProfile.findOneAndUpdate(
          { userId: input.userId },
          {
            $set: profileData,
            $setOnInsert: { createdAt: now }
          },
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        ).lean();

        if (!savedProfile) {
          throw new GraphQLError('Failed to save user profile', {
            extensions: { code: 'SAVE_FAILED' }
          });
        }

        return {
          userId: savedProfile.userId,
          introduction: savedProfile.introduction || '',
          nativeLanguage: savedProfile.nativeLanguage,
          interests: savedProfile.interests,
          additionalInterests: savedProfile.additionalInterests || [],
          learningLanguages: savedProfile.learningLanguages,
          createdAt: savedProfile.createdAt.toISOString(),
          updatedAt: savedProfile.updatedAt.toISOString()
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        console.error('Error saving user profile:', error);
        throw new GraphQLError('Failed to save user profile', {
          extensions: { code: 'DB_CONNECTION_ERROR' }
        });
      }
    }
  },

  Subscription: {
    // Subscribe to new chats created
    chatCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator(CHAT_EVENTS.CHAT_CREATED),
        (payload: ChatCreatedPayload | undefined, variables: { userId: string } | undefined) => {
          // Only send events for chats belonging to the subscribing user
          return !!payload && !!variables && payload.chatCreated.userId === variables.userId;
        }
      )
    },

    // Subscribe to chat updates (lastMessage changes)
    chatUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator(CHAT_EVENTS.CHAT_UPDATED),
        (payload: ChatUpdatedPayload | undefined, variables: { userId: string } | undefined) => {
          // Only send events for chats belonging to the subscribing user
          return !!payload && !!variables && payload.chatUpdated.userId === variables.userId;
        }
      )
    },

    // Subscribe to bot message streaming chunks
    botMessageStream: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator(CHAT_EVENTS.BOT_MESSAGE_CHUNK),
        (payload: BotMessageChunkPayload | undefined, variables: { chatId: string; messageId: string } | undefined) => {
          // Only send chunks for the specific message being streamed
          return !!payload && !!variables &&
                 payload.botMessageStream.chatId === variables.chatId &&
                 payload.botMessageStream.messageId === variables.messageId;
        }
      )
    }
  }
};
