import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ fallback: true, message: 'Using client-side Firestore' }, { status: 200 })
    }

    const body = await request.json().catch(() => ({}))
    const { title, content, authorId, authorName, role, tags, images, context } = body
    
    // Validate required fields
    if (!title || !content || !authorId || !authorName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const now = new Date()
    const postData = {
      title: title.trim(),
      content: content.trim(),
      authorId: authorId.trim(),
      authorName: authorName.trim(),
      role: role || 'student',
      createdAt: now,
      isPinned: false,
      isLocked: false,
      reactions: {},
      votes: {},
      score: 0,
      tags: Array.isArray(tags) ? tags.filter(t => typeof t === 'string').map(t => t.trim()) : [],
      images: Array.isArray(images) ? images.filter(i => typeof i === 'string') : [],
      resolutionStatus: 'unanswered',
      acceptedReplyId: null,
      context: context || null,
      isExamRelevant: false,
      isInKnowledgeBase: false,
    }
    
    const docRef = await adminDb.collection('post').add(postData)
    return NextResponse.json({ success: true, id: docRef.id })
  } catch (err) {
    console.error('[forum/create] Error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
