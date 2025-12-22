import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Service Unavailable - Backend Config Missing' }, { status: 503 })
    }

    const { postId, userId, emoji } = await request.json().catch(() => ({}))
    if (!postId || !userId || !emoji) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
    }
    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    const data = snap.data()
    const reactions = { ...(data.reactions || {}) }
    if (reactions[userId] === emoji) delete reactions[userId]
    else reactions[userId] = emoji
    await ref.update({ reactions })
    return NextResponse.json({ success: true, reactions })
  } catch (err) {
    console.error('[forum/react] Error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
