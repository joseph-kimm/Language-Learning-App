import { connectToMongoDB } from '@/lib/mongodb/mongoose';
import { auth } from '../../auth';

/**
 * GraphQL Context
 * Provides database access and the authenticated userId to resolvers
 */

export interface GraphQLContext {
  connectToMongoDB: typeof connectToMongoDB;
  userId: string | null;
}

export async function createContext(): Promise<GraphQLContext> {
  const session = await auth();
  return {
    connectToMongoDB,
    userId: session?.user?.id ?? null,
  };
}
