import { createHandler } from 'graphql-sse/lib/use/fetch';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import { connectToMongoDB } from '@/lib/mongodb/mongoose';

/**
 * SSE endpoint for GraphQL subscriptions
 * Route: /api/graphql/subscriptions
 */

// Create executable schema for subscriptions
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Create SSE handler
const handler = createHandler({
  schema,
  context: async () => {
    // Provide same context as regular GraphQL queries
    return {
      connectToMongoDB,
    } as Record<PropertyKey, unknown>;
  },
});

export { handler as GET, handler as POST };
