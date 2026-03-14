import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import client from '@/lib/mongodb/auth-client';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = client.db();
  const user = await db.collection('users').findOne({ email: session.user.email });

  return NextResponse.json({ hasPassword: !!(user?.passwordHash) });
}
