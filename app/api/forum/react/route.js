import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    const { postId, userId, emoji } = await request.json()
    if (!postId || !userId || !emoji) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    const data = snap.data()
    const reactions = { ...(data.reactions || {}) }
    if (reactions[userId] === emoji) delete reactions[userId]
    else reactions[userId] = emoji
    await ref.update({ reactions })
    return NextResponse.json({ success: true, reactions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
