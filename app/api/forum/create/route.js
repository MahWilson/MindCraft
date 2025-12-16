import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    const body = await request.json()
    const { title, content, authorId, authorName, role, tags, images, context } = body
    if (!title || !content || !authorId || !authorName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const now = new Date()
    const docRef = await adminDb.collection('post').add({
      title,
      content,
      authorId,
      authorName,
      role: role || 'student',
      createdAt: now,
      isPinned: false,
      isLocked: false,
      reactions: {},
      votes: {},
      score: 0,
      tags: Array.isArray(tags) ? tags : [],
      images: Array.isArray(images) ? images : [],
      resolutionStatus: 'unanswered',
      acceptedReplyId: null,
      context: context || null,
      isExamRelevant: false,
      isInKnowledgeBase: false,
    })
    return NextResponse.json({ success: true, id: docRef.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
