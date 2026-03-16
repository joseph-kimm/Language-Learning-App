import {gql} from 'graphql-tag'

export const typeDefs = gql`
  type Query {
    getChat(chatId: ID!): Chat
    getChats(userId: ID): [Chat!]!
    getMessages(chatId: ID!): [Message!]!
    getUserProfile(userId: ID!): UserProfile
    improveSentence(chatId: ID!, messageId: ID!): SentenceImprovement!
    explainBotMessage(chatId: ID!, messageId: ID!): BotMessageExplanation!
  }

  type Mutation {
    createChat(userId: ID, language: TargetLanguage!, personality: Personality): Chat
    addMessage(chatId: ID!, sender: Sender!, text: String!): Message
    regenerateResponse(chatId: ID!, messageId: ID!): Message
    saveUserProfile(input: UserProfileInput!): UserProfile!
  }

  # Input type for nested learning language data
  input LearningLanguageInput {
    language: TargetLanguage!
    proficiencyLevel: ProficiencyLevel!
    learningGoals: String!
  }

  # Input type for saveUserProfile mutation (excludes server-managed timestamps)
  input UserProfileInput {
    userId: ID!
    introduction: String
    nativeLanguage: NativeLanguage!
    interests: [Interests!]!
    additionalInterests: [String!]
    correctionStyle: CorrectionStyle!
    learningLanguages: [LearningLanguageInput!]!
  }

  type Subscription {
    chatCreated(userId: ID!): Chat
    chatUpdated(userId: ID!): Chat
    botMessageStream(chatId: ID!, messageId: ID!): MessageChunk!
  }

  type SentenceImprovement {
    improvedSentence: String!
    explanation: String!
  }

  type BotMessageExplanation {
    translation: String!
    explanation: String!
  }

  #for chatting

  type Message {
    _id: ID!
    chatId: ID!
    sender: Sender!
    text: String!
    timestamp: String!
  }

  type MessageChunk {
    messageId: ID!
    chatId: ID!
    chunk: String!
    isComplete: Boolean!
  }

  type Chat {
    chatId: ID!
    userId: ID!
    createdAt: String!
    lastMessage: Message
    language: TargetLanguage
    personality: Personality
  }

  enum Sender {
    USER
    BOT
  }

  type User {
    userId: ID!
  }

  enum Personality {
    DEFAULT
    CALM
    CURIOUS
    HYPE
    PLAYFUL
  }

  #for user preference

  type UserProfile {
    userId: ID!
    introduction: String
    nativeLanguage: NativeLanguage!
    interests: [Interests!]!
    additionalInterests: [String!]!
    correctionStyle: CorrectionStyle!
    learningLanguages: [LearningLanguage]!
    createdAt: String!
    updatedAt: String!
  }

  type LearningLanguage {
    language: TargetLanguage!
    proficiencyLevel: ProficiencyLevel!
    learningGoals: String!
  }

  enum CorrectionStyle {
    ALWAYS
    EXPLANATION
    MAJOR_ERRORS
    REPEAT
    NEVER
  }

  enum ProficiencyLevel {
    BEGINNER
    ELEMENTARY
    INTERMEDIATE
    UPPER_INTERMEDIATE
    ADVANCED
    NATIVE
  }

  enum TargetLanguage {
    ENGLISH
    KOREAN
    SPANISH
  }

  enum NativeLanguage {
    ARABIC
    BENGALI
    CANTONESE
    DUTCH
    ENGLISH
    FRENCH
    GERMAN
    GREEK
    HINDI
    INDONESIAN
    ITALIAN
    JAPANESE
    KOREAN
    MANDARIN
    PERSIAN
    POLISH
    PORTUGUESE
    PUNJABI
    RUSSIAN
    SPANISH
    SWAHILI
    TAGALOG
    TAMIL
    THAI
    TURKISH
    UKRAINIAN
    URDU
    VIETNAMESE
    OTHER
  }

  enum Interests {
    FOOD
    DAILY_LIFE
    TRAVEL
    HEALTH
    WORK
    SCHOOL
    TECHNOLOGY
    HOBBY
    EMOTION
    SOCIAL_MEDIA
    CULTURE
    MUSIC
    ENTERTAINMENT
    OPINION
  }

`