import { db } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { postId, userId, emoji } = await request.json();
    if (!postId || !userId || !emoji) {
      return NextResponse.json({ error: 'Missing fields' }, { status:400 });
    }

    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status:404 });
    }

    const current = postSnap.data() || {};
    const reactions = current.reactions || {};
    if (reactions[userId] === emoji) {
      delete reactions[userId];
    } else {
      reactions[userId] = emoji;
    }

    await updateDoc(postRef, { reactions });

    return NextResponse.json({ success: true, reactions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}