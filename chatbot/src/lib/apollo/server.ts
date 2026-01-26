import { ApolloServer } from '@apollo/server';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import { GraphQLContext } from '@/graphql/context';

/**
 * Apollo Server configuration
 * SDL-first approach with type-safe resolvers
 */

export const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers
});
