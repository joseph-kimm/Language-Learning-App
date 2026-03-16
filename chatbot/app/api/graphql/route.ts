import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { server } from '@/lib/apollo/server';
import { createContext } from '@/graphql/context';

/**
 * GraphQL API Route Handler
 * Integration of Apollo Server with Next.js App Router
 * maxDuration allows LLM generation to complete — Fluid Compute provides 5 min on Hobby by default
 */

export const maxDuration = 120;

const handler = startServerAndCreateNextHandler(server, {
  context: createContext,
});

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}
