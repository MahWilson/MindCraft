import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']

export async function POST(request) {
  try {
    if (!adminDb) {
      const { postId, userId, userRole } = await request.json().catch(() => ({}))
      if (!postId || !userId) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      }
      if (!MOD_ROLES.includes(userRole)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      return NextResponse.json({ success: true, knowledgeBaseId: null, fallback: true, message: 'Using client-side Firestore' }, { status: 200 })
    }

    const { postId, userId, userRole } = await request.json()
    if (!postId || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (!MOD_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const data = snap.data()

    const kbRef = await adminDb.collection('knowledge_base').add({
      sourcePostId: postId,
      title: data.title || '',
      content: data.content || '',
      authorId: data.authorId || '',
      authorName: data.authorName || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      context: data.context || null,
      acceptedReplyId: data.acceptedReplyId || null,
      createdAt: new Date(),
      createdBy: userId,
    })

    await ref.update({ isInKnowledgeBase: true })

    return NextResponse.json({ success: true, knowledgeBaseId: kbRef.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
