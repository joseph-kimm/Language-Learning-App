import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '../../../../auth';
import client from '@/lib/mongodb/auth-client';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = client.db();
    const user = await db.collection('users').findOne({ email: session.user.email });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: 'Password change is not available for Google sign-in accounts' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.collection('users').updateOne(
      { email: session.user.email },
      { $set: { passwordHash: newHash, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Change password error]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
