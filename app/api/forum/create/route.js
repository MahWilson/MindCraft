import { adminDb, FieldValue } from '@/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { title, content, authorId, authorName, role } = await request.json();

    if (!title || !content || !authorId || !authorName || !role) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const docRef = await adminDb.collection('posts').add({
      title,
      content,
      authorId,
      authorName,
      role,
      createdAt: FieldValue.serverTimestamp(),
      isPinned: false,
      reactions: {},
      replies: [],
      votes: {},
      score: 0
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}