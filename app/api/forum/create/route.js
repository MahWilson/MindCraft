import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    const { title, content, authorId, authorName, role } = await request.json()
    if (!title || !content || !authorId || !authorName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const docRef = await adminDb.collection('post').add({
      title,
      content,
      authorId,
      authorName,
      role: role || 'student',
      createdAt: new Date(),
      isPinned: false,
      reactions: {},
      votes: {},
      score: 0
    })
    return NextResponse.json({ success: true, id: docRef.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
