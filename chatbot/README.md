# Spanish Language Learning Chatbot

A Next.js-based chatbot application for learning Spanish through interactive conversations.

## Technology Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript 5.9+
- **Frontend**: React 19+
- **Styling**: CSS Modules
- **API**: GraphQL (Apollo Server/Client)
- **Real-time**: Server-Sent Events (SSE)
- **Databases**:
  - PostgreSQL 15+ (Supabase + Prisma) - for authentication
  - MongoDB 7+ (Mongoose + Atlas) - for user data and chat history

## Project Structure

```
chatbot/
├── app/                          # Next.js App Router
│   ├── api/graphql/             # GraphQL endpoint
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── src/
│   ├── components/              # React components
│   │   ├── chat/               # Chat-related components
│   │   └── common/             # Reusable components
│   ├── graphql/                # GraphQL schema and resolvers
│   ├── lib/                    # Utilities and configurations
│   │   ├── apollo/            # Apollo client/server config
│   │   ├── db/                # Database connections
│   │   └── sse/               # Server-Sent Events utilities
│   ├── models/                 # Database models
│   └── types/                  # TypeScript type definitions
├── prisma/                      # Prisma schema
└── public/                      # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (package manager)

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

Copy `.env.example` to `.env.local` and configure the following:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your database URLs (when ready):
- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `MONGODB_URI` - MongoDB connection string (Atlas)

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linting

## GraphQL API

The GraphQL API is available at `/api/graphql`

In development, you can access the GraphQL playground at:
[http://localhost:3000/api/graphql](http://localhost:3000/api/graphql)

## Coding Standards

See [claude.md](claude.md) for detailed coding standards and architecture decisions.

Key standards:
- 2 spaces indentation
- Strict TypeScript mode
- Functional components with hooks
- Server Components by default
- async/await for all async operations

## Database Setup

### PostgreSQL (Prisma)

Database connection will be configured later for authentication.

### MongoDB (Mongoose)

Database connection will be configured later for user profiles and chat history.

## Future Development

- User authentication (Supabase)
- MongoDB integration for user data
- Chat message persistence
- Chatbot AI integration
- Learning progress tracking
- User preferences and settings

## Architecture

For detailed architecture decisions and patterns, see [claude.md](claude.md)

## License

ISC
