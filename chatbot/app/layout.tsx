import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { ApolloProvider } from '@/lib/apollo/ApolloProvider';
import { auth } from '../auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Language Learning Chatbot',
  description: 'Learn any language through interactive conversations',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <ApolloProvider>{children}</ApolloProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
