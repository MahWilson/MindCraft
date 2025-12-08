import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    const { postId, userId, userRole, reason } = await request.json()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    const dataSnap = await adminDb.collection('post').doc(postId).get()
    const data = dataSnap.exists ? dataSnap.data() : null
    const isOwner = data && data.authorId === userId
    if (userRole !== 'teacher' && userRole !== 'admin' && !isOwner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    await adminDb.collection('audit_log').add({
      action: 'DELETE_POST',
      postId,
      deletedContent: snap.data(),
      deletedBy: userId,
      reason: reason || '',
      timeStamp: new Date(),
      replyId: ''
    })
    await ref.delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
