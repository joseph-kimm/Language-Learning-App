import { ApolloLink, Operation, FetchResult, Observable } from '@apollo/client';
import { print } from 'graphql';
import { createClient, Client } from 'graphql-sse';

/**
 * Custom Apollo Link for GraphQL subscriptions over SSE
 * Handles automatic reconnection with exponential backoff
 */

interface SSELinkOptions {
  onConnectionChange?: (connected: boolean) => void;
}

export class SSELink extends ApolloLink {
  private client: Client;
  private connectionState: 'connected' | 'disconnected' = 'disconnected';
  private onConnectionChange?: (connected: boolean) => void;

  constructor(url: string, options?: SSELinkOptions) {
    super();
    this.onConnectionChange = options?.onConnectionChange;

    this.client = createClient({
      url,
      retryAttempts: Infinity,
      on: {
        connected: () => {
          this.connectionState = 'connected';
          this.onConnectionChange?.(true);
        },
      },
    });
  }

  public request(operation: Operation): Observable<FetchResult> {
    return new Observable((observer) => {
      const unsubscribe = this.client.subscribe(
        {
          query: print(operation.query),
          variables: operation.variables,
          operationName: operation.operationName,
        },
        {
          next: (data) => observer.next(data as FetchResult),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        }
      );

      // Cleanup on unsubscribe
      return () => {
        unsubscribe();
      };
    });
  }
}
