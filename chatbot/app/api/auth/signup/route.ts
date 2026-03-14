import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import client from '@/lib/mongodb/auth-client';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = client.db();
    const existing = await db.collection('users').findOne({ email });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const _id = new ObjectId();

    await db.collection('users').insertOne({
      _id,
      userId: _id.toString(),
      name,
      email,
      passwordHash,
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[Signup error]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
