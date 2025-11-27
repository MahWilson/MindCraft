import { db } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    const { postId, userRole } = await request.json();

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const current = postSnap.data();
    const newPinned = !current?.isPinned;
    await updateDoc(postRef, { isPinned: newPinned });

    return NextResponse.json({ success: true, isPinned: newPinned });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}