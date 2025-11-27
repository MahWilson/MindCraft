import { db } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc, collection } from 'firebase/firestore';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request) {
  try {
    const { postId, authorId, authorName, content, parentReplyId } = await request.json();
    
    if (!postId || !authorId || !authorName || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const newReply = {
      id: randomUUID(),
      authorId,
      authorName,
      content,
      createdAt: new Date(), // Use regular Date instead of serverTimestamp
      votes: {},
      score: 0,
      parentReplyId: parentReplyId || null,
      replies: []
    };

    if (parentReplyId) {
      // Nested reply - need to find parent and add to its replies
      const replies = postSnap.data().replies || [];
      const addReplyToParent = (replies, parentId, newReply) => {
        return replies.map(reply => {
          if (reply.id === parentId) {
            return {
              ...reply,
              replies: [...(reply.replies || []), newReply]
            };
          } else if (reply.replies && reply.replies.length > 0) {
            return {
              ...reply,
              replies: addReplyToParent(reply.replies, parentId, newReply)
            };
          }
          return reply;
        });
      };

      const updatedReplies = addReplyToParent(replies, parentReplyId, newReply);
      await updateDoc(postRef, { replies: updatedReplies });
    } else {
      // Top-level reply - get current replies and append new one
      const currentReplies = postSnap.data().replies || [];
      const updatedReplies = [...currentReplies, newReply];
      await updateDoc(postRef, { replies: updatedReplies });
    }

    return NextResponse.json({ success: true, replyId: newReply.id });
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
    
    // Find reply recursively
    const findReply = (replies, replyId) => {
      for (let reply of replies) {
        if (reply.id === replyId) return reply;
        if (reply.replies && reply.replies.length > 0) {
          const found = findReply(reply.replies, replyId);
          if (found) return found;
        }
      }
      return null;
    };

    const target = findReply(replies, replyId);
    if (!target) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    const canDelete = userRole === 'teacher' || userRole === 'admin' || target.authorId === userId;
    if (!canDelete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Remove reply recursively
    const removeReply = (replies, replyId) => {
      return replies.filter(reply => {
        if (reply.id === replyId) return false;
        if (reply.replies && reply.replies.length > 0) {
          reply.replies = removeReply(reply.replies, replyId);
        }
        return true;
      });
    };

    const updatedReplies = removeReply(replies, replyId);
    await updateDoc(postRef, { replies: updatedReplies });

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

    // Find and update reply recursively
    const updateReply = (replies, replyId, content) => {
      return replies.map(reply => {
        if (reply.id === replyId) {
          if (reply.authorId !== userId) {
            throw new Error('Unauthorized');
          }
          return {
            ...reply,
            content,
            editedAt: new Date()
          };
        } else if (reply.replies && reply.replies.length > 0) {
          return {
            ...reply,
            replies: updateReply(reply.replies, replyId, content)
          };
        }
        return reply;
      });
    };

    try {
      const updatedReplies = updateReply(replies, replyId, content);
      await updateDoc(postRef, { replies: updatedReplies });
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      throw error;
    }

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}