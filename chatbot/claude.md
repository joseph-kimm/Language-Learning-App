# Spanish Language Learning Chatbot App

## Technology Stack
- **Language**: TypeScript 5.9+
- **Framework**: Next.js 16+ (App Router)
- **Frontend**: React 19+
- **Styling**: CSS Modules
- **API**: GraphQL (Apollo Server/Client)
- **Real-time**: Server-Sent Events (SSE)
- **Databases**: PostgreSQL 15+ (Supabase + Prisma), MongoDB 7+ (Mongoose + Atlas)

## Architecture

### Database Strategy
**PostgreSQL (Supabase + Prisma)**:
- User authentication only (email, password hash, userId)

**MongoDB (Atlas + Mongoose)**:
- User profiles
- Learning progress and history
- Chat conversations and transcripts
- User preferences and settings

### API Strategy
**GraphQL (Apollo)**:
- Queries: Fetch user data, learning materials, progress, chat history
- Mutations: Update profiles, save progress, manage preferences
- SDL-first schema approach

## Coding Standards

### General
- 2 spaces indentation (no tabs)
- Always use strict equality (`===`, `!==`)
- Always use `async/await` for async operations
- Comments explain WHY, not WHAT
- Responsive design for both mobile and computers

### TypeScript
- Enable strict mode
- Avoid `any` - use proper types or `unknown`
- Define interfaces for all data structures
- Export types for reusability

### React/Next.js
- Functional components with hooks
- Server Components by default
- Client Components only when needed (`'use client'`)
- Single-responsibility components

### GraphQL
- SDL-first schema definition
- Type-safe resolvers
- Use dataloaders for N+1 prevention

### Error Handling
- Always use try/catch with async/await
- User-friendly error messages
- Never expose sensitive details to client

### File Naming
- Components: PascalCase (`ChatInterface.tsx`)
- Utilities: camelCase (`formatDate.ts`)