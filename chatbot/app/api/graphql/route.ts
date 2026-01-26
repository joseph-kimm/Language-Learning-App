import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { server } from '@/lib/apollo/server';
import { createContext } from '@/graphql/context';

/**
 * GraphQL API Route Handler
 * Integration of Apollo Server with Next.js App Router
 */

const handler = startServerAndCreateNextHandler(server, {
  context: createContext,
});

export { handler as GET, handler as POST };
