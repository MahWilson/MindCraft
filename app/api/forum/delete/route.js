import { db } from '@/firebase';
import { doc, getDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { postId, userId, userRole, reason } = await request.json();

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postSnap.data();

    await addDoc(collection(db, 'audit_logs'), {
      action: 'DELETE_POST',
      deletedPostId: postId,
      deletedContent: postData,
      deletedBy: userId,
      reason: reason || '',
      timestamp: serverTimestamp()
    });

    await deleteDoc(postRef);

    return NextResponse.json({ success: true, message: 'Post deleted and logged.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}