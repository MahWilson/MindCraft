import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']

export async function PATCH(request) {
  try {
    const { postId, replyId, userId, userRole, markers } = await request.json()
    if (!postId || !replyId || !userId || !markers || typeof markers !== 'object') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const data = snap.data()
    const replies = Array.isArray(data.replies) ? data.replies : []
    const idx = replies.findIndex(r => r.id === replyId)
    if (idx === -1) return NextResponse.json({ error: 'Reply not found' }, { status: 404 })

    const reply = replies[idx]
    const isModerator = MOD_ROLES.includes(userRole)
    const isAuthor = reply.authorId === userId
    if (!isModerator && !isAuthor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const nextMarkers = {
      ...(reply.markers || {}),
      ...markers,
    }

    replies[idx] = { ...reply, markers: nextMarkers }
    await ref.update({ replies })

    return NextResponse.json({ success: true, markers: nextMarkers })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


