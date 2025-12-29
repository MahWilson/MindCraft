import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']

export async function PATCH(request) {
  try {
    if (!adminDb) {
      const { postId, userId, userRole, isExamRelevant } = await request.json().catch(() => ({}))
      if (!postId || !userId || typeof isExamRelevant !== 'boolean') {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      }
      if (!MOD_ROLES.includes(userRole)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      return NextResponse.json({ success: true, isExamRelevant, fallback: true, message: 'Using client-side Firestore' }, { status: 200 })
    }

    const { postId, userId, userRole, isExamRelevant } = await request.json()
    if (!postId || !userId || typeof isExamRelevant !== 'boolean') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (!MOD_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const ref = adminDb.collection('post').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    await ref.update({ isExamRelevant })
    return NextResponse.json({ success: true, isExamRelevant })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
