import mongoose, { Schema, Document } from 'mongoose';
import { Sender, Personality, IMessageDoc, IChatDoc, IUserDoc } from '@/types/chat';
import { IUserProfileDoc, NativeLanguage, Interests, CorrectionStyle, TargetLanguage, ProficiencyLevel } from '@/types/survey';

/**
 * MongoDB schemas and models (server-side only)
 * For type definitions, import from @/types/chat
 */

// MongoDB Document interfaces - extend plain interfaces with Mongoose Document
export interface IMessageDocument extends IMessageDoc, Document {}
export interface IChatDocument extends IChatDoc, Document {}
export interface IUserDocument extends IUserDoc, Document {}
export interface IUserProfileDocument extends IUserProfileDoc, Document {}

// Re-export for backwards compatibility
export { Sender };

// ============================================
// Schemas
// ============================================

// Message Schema - separate top-level collection
const MessageSchema = new Schema({
  chatId: { type: String, required: true, index: true },  // Foreign key to Chat
  sender: {
    type: String,
    enum: Object.values(Sender),
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true  // Index for sorting
  }
}, { _id: true });

// Compound index for efficient message queries (by chatId, sorted by timestamp)
MessageSchema.index({ chatId: 1, timestamp: 1 });

// Chat Schema - no longer contains messages array
const ChatSchema = new Schema<IChatDocument>({
  chatId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  language: { type: String, enum: Object.values(TargetLanguage), required: true },
  personality: { type: String, enum: Object.values(Personality), default: 'DEFAULT' },
  createdAt: { type: Date, default: Date.now },
  // lastMessage stored as embedded object (not reference) for performance
  lastMessage: {
    type: {
      _id: { type: String, required: true },
      chatId: { type: String, required: true },
      sender: { type: String, enum: Object.values(Sender), required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, required: true }
    },
    default: null,
    required: false
  }
});

const UserSchema = new Schema<IUserDocument>({
  userId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// LearningLanguage sub-schema (embedded in UserProfile)
const LearningLanguageSchema = new Schema({
  language: {
    type: String,
    enum: Object.values(TargetLanguage),
    required: true
  },
  proficiencyLevel: {
    type: String,
    enum: Object.values(ProficiencyLevel),
    required: true
  },
  learningGoals: { type: String, required: true }
}, { _id: false });

// UserProfile Schema - one profile per user
const UserProfileSchema = new Schema<IUserProfileDocument>({
  userId: { type: String, required: true, unique: true, index: true },
  introduction: { type: String, default: '' },
  nativeLanguage: {
    type: String,
    enum: Object.values(NativeLanguage),
    required: true
  },
  interests: [{
    type: String,
    enum: Object.values(Interests)
  }],
  additionalInterests: [{ type: String }],
  correctionStyle: {
    type: String,
    enum: Object.values(CorrectionStyle),
    required: true
  },
  learningLanguages: [LearningLanguageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============================================
// Models
// ============================================

export const Message = mongoose.models.Message || mongoose.model<IMessageDocument>('Message', MessageSchema);
export const Chat = mongoose.models.Chat || mongoose.model<IChatDocument>('Chat', ChatSchema);
export const User = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
export const UserProfile = mongoose.models.UserProfile || mongoose.model<IUserProfileDocument>('UserProfile', UserProfileSchema);
