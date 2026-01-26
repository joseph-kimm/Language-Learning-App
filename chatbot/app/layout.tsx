import type { Metadata } from 'next';
import { ApolloProvider } from '@/lib/apollo/ApolloProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Language Learning Chatbot',
  description: 'Learn any language through interactive conversations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ApolloProvider>{children}</ApolloProvider>
      </body>
    </html>
  );
}
