import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function PATCH(request) {
  try {
    const { postId, userId, userRole } = await request.json()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    const data = snap.data()
    const permitted = userRole === 'teacher' || userRole === 'admin'
    if (!permitted) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    await ref.update({ isPinned: !data.isPinned })
    return NextResponse.json({ success: true, isPinned: !data.isPinned })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
