import { connectToMongoDB } from '@/lib/mongodb/mongoose';

/**
 * GraphQL Context
 * Provides database access and other utilities to resolvers
 */

export interface GraphQLContext {
  connectToMongoDB: typeof connectToMongoDB;
}

export async function createContext(): Promise<GraphQLContext> {
  return {
    connectToMongoDB,
  };
}
