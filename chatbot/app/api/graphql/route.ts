import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { server } from '@/lib/apollo/server';
import { createContext } from '@/graphql/context';

/**
 * GraphQL API Route Handler
 * Integration of Apollo Server with Next.js App Router
 */

const handler = startServerAndCreateNextHandler(server, {
  context: createContext,
});

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}
