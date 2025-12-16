import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']

export async function PATCH(request) {
  try {
    const { postId, replyId, userId, userRole } = await request.json()
    if (!postId || !replyId || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const data = snap.data()
    const replies = Array.isArray(data.replies) ? data.replies : []
    const hasReply = replies.some(r => r.id === replyId)
    if (!hasReply) return NextResponse.json({ error: 'Reply not found' }, { status: 404 })

    const isModerator = MOD_ROLES.includes(userRole)
    const isOwner = data.authorId === userId
    if (!isModerator && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const currentlyAccepted = data.acceptedReplyId || null
    let nextAccepted = replyId
    let resolutionStatus = 'solved'

    if (currentlyAccepted === replyId) {
      // toggle off
      nextAccepted = null
      resolutionStatus = 'in_progress'
    }

    await ref.update({
      acceptedReplyId: nextAccepted,
      resolutionStatus,
    })

    return NextResponse.json({ success: true, acceptedReplyId: nextAccepted, resolutionStatus })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


