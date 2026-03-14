export { auth as proxy } from './auth';

export const config = {
  // Protect all routes except auth pages, Next.js internals, and static files
  matcher: [
    '/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
