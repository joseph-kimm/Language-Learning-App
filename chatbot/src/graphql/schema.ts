import {gql} from 'graphql-tag'

export const typeDefs = gql`
  type Query {
    getChat(chatId: ID!): Chat
    getChats(userId: ID): [Chat!]!
    getMessages(chatId: ID!): [Message!]!
  }

  type Mutation {
    createChat(userId: ID): Chat
    addMessage(chatId: ID!, sender: Sender!, text: String!): Message
  }

  type Subscription {
    chatCreated(userId: ID!): Chat
    chatUpdated(userId: ID!): Chat
    botMessageStream(chatId: ID!, messageId: ID!): MessageChunk!
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
  }

  enum Sender {
    USER
    BOT
  }

  type User {
    userId: ID!
  }

  #for user preference

  type UserProfile {
    userId: ID!
    nativeLanuage: Language!
    targetLangauge: Language!
    interests: [Interests!]!
    additionalInterests: [String!]!
    proficiencyLevel: ProficiencyLevel!
    correctionStyle: CorrectionStyle!
    introduction: String!
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

  enum Language {
    ENGLISH
    KOREAN
    SPANISH
    FRENCH
    GERMAN
    CHINESE
    JAPANESE
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