import { db } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc, collection } from 'firebase/firestore';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request) {
  try {
    const { postId, authorId, authorName, content } = await request.json();
    if (!postId || !authorId || !authorName || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      replies: arrayUnion({
        id: randomUUID(),
        authorId,
        authorName,
        content,
        createdAt: serverTimestamp(),
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { postId, replyId, userId, userRole, reason } = await request.json();
    if (!postId || !replyId || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const data = snap.data();
    const replies = data.replies || [];
    const target = replies.find((r) => r.id === replyId);
    if (!target) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    const canDelete = userRole === 'teacher' || userRole === 'admin' || target.authorId === userId;
    if (!canDelete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updated = replies.filter((r) => r.id !== replyId);
    await updateDoc(postRef, { replies: updated });

    await addDoc(collection(db, 'audit_logs'), {
      action: 'DELETE_REPLY',
      postId,
      replyId,
      deletedBy: userId,
      reason: reason || '',
      timestamp: serverTimestamp(),
      deletedContent: target,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { postId, replyId, userId, content } = await request.json();
    if (!postId || !replyId || !userId || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const data = snap.data();
    const replies = data.replies || [];
    const idx = replies.findIndex((r) => r.id === replyId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    const target = replies[idx];
    if (target.authorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedTarget = { ...target, content, editedAt: serverTimestamp() };
    const updated = [...replies.slice(0, idx), updatedTarget, ...replies.slice(idx + 1)];
    await updateDoc(postRef, { replies: updated });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
