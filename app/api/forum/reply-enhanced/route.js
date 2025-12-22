import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    if (!adminDb) {
      // Admin SDK not available - return 200 with flag to trigger client-side fallback
      // This avoids 503 logs while still signaling the frontend to use fallback
      return NextResponse.json({ fallback: true, message: 'Using client-side Firestore' }, { status: 200 })
    }

    const { postId, authorId, authorName, role, content, parentReplyId } = await request.json()
    
    // Validate required fields
    if (!postId || !authorId || !authorName || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Validate data types
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
    }
    
    const pRef = adminDb.collection('post').doc(postId)
    const snap = await pRef.get()
    
    if (!snap.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    const data = snap.data()
    const arr = Array.isArray(data.replies) ? data.replies : []
    const replyId = crypto.randomUUID()
    const newReply = { 
      id: replyId, 
      authorId: authorId.trim(), 
      authorName: authorName.trim(), 
      role: role || 'student', 
      content: content.trim(), 
      createdAt: new Date(), 
      votes: {}, 
      score: 0, 
      parentReplyId: parentReplyId || null 
    }
    
    await pRef.update({ replies: [...arr, newReply] })
    return NextResponse.json({ success: true, replyId })
  } catch (err) {
    console.error('[forum/reply-enhanced] Error creating reply:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ fallback: true, message: 'Using client-side Firestore' }, { status: 200 })
    }

    const { postId, replyId, userId, userRole } = await request.json()
    
    // Validate required fields
    if (!postId || !replyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const pRef = adminDb.collection('post').doc(postId)
    const pSnap = await pRef.get()
    
    if (!pSnap.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    const dataPost = pSnap.data()
    const arr = Array.isArray(dataPost.replies) ? dataPost.replies : []
    const idx = arr.findIndex(r => r.id === replyId)
    
    if (idx === -1) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }
    
    const data = arr[idx]
    const permitted = userRole === 'teacher' || userRole === 'admin' || data.authorId === userId
    
    if (!permitted) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const updated = arr.filter(r => r.id !== replyId)
    await pRef.update({ replies: updated })
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[forum/reply-enhanced] Error deleting reply:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ fallback: true, message: 'Using client-side Firestore' }, { status: 200 })
    }

    const { postId, replyId, userId, content } = await request.json()
    
    // Validate required fields
    if (!postId || !replyId || !userId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Validate content
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
    }
    
    const pRef = adminDb.collection('post').doc(postId)
    const pSnap = await pRef.get()
    
    if (!pSnap.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    const dataPost = pSnap.data()
    const arr = Array.isArray(dataPost.replies) ? dataPost.replies : []
    const idx = arr.findIndex(r => r.id === replyId)
    
    if (idx === -1) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }
    
    const data = arr[idx]
    
    if (data.authorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    arr[idx] = { ...data, content: content.trim(), editedAt: new Date() }
    await pRef.update({ replies: arr })
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[forum/reply-enhanced] Error editing reply:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
