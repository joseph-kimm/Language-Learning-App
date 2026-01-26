/**
 * GraphQL Type Definitions
 * Define GraphQL-related TypeScript types here
 */

export interface GraphQLError {
  message: string;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}
