import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']
const ALLOWED_STATUSES = ['unanswered', 'in_progress', 'solved']

export async function PATCH(request) {
  try {
    const { postId, userId, userRole, resolutionStatus } = await request.json()
    if (!postId || !userId || !resolutionStatus) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!ALLOWED_STATUSES.includes(resolutionStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const data = snap.data()
    const isModerator = MOD_ROLES.includes(userRole)
    const isOwner = data.authorId === userId
    if (!isModerator && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const update = { resolutionStatus }
    if (resolutionStatus !== 'solved') {
      update.acceptedReplyId = null
    }

    await ref.update(update)
    return NextResponse.json({ success: true, resolutionStatus: update.resolutionStatus, acceptedReplyId: update.acceptedReplyId ?? data.acceptedReplyId ?? null })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


