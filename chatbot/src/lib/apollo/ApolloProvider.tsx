'use client';

import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { apolloClient } from './client';

// Wrapper to provide Apollo Client to all child components
export function ApolloProvider({ children }: { children: React.ReactNode }) {
  return <BaseApolloProvider client={apolloClient}>{children}</BaseApolloProvider>;
}
