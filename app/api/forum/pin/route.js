import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function PATCH(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Service Unavailable - Backend Config Missing' }, { status: 503 })
    }

    const { postId, userId, userRole } = await request.json().catch(() => ({}))
    if (!postId || !userId || !userRole) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
    }
    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    const data = snap.data()
    const role = String(userRole || '').toLowerCase()
    const permitted = role === 'teacher' || role === 'admin'
    if (!permitted) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    await ref.update({ isPinned: !data.isPinned })
    return NextResponse.json({ success: true, isPinned: !data.isPinned })
  } catch (err) {
    console.error('[forum/pin] Error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
