import { ApolloClient, ApolloLink, InMemoryCache, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { SSELink } from './sseLink';

/**
 * Apollo Client configuration
 * Configured for Next.js App Router with SSR support
 * Uses split link to route subscriptions to SSE and queries/mutations to HTTP
 */

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  fetchOptions: { cache: 'no-store' },
});

// SSE link for subscriptions (only on client-side)
const sseLink = typeof window !== 'undefined'
  ? new SSELink(process.env.NEXT_PUBLIC_GRAPHQL_SSE_URL!)
  : httpLink; // Fallback to HTTP on server

// Route subscriptions to SSE, queries/mutations to HTTP
const splitLink = ApolloLink.split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  sseLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getChats: {
            // Merge strategy for chat list updates
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  ssrMode: typeof window === 'undefined',
});
