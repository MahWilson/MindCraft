import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']

export async function POST(request) {
  try {
    if (!adminDb) {
      // Return empty results silently instead of 503 to avoid breaking the UI search loop
      return NextResponse.json({ results: [] })
    }

    const { query, limit = 10 } = await request.json().catch(() => ({}))
    const q = (query || '').trim().toLowerCase()
    if (!q || q.length < 3) {
      return NextResponse.json({ results: [] })
    }

    // Reduced limit for better performance and added server-side filtering
    const snap = await adminDb
      .collection('post')
      .orderBy('createdAt', 'desc')
      .limit(50) // Reduced from 100 to 50 for better performance
      .get()

    const results = []
    snap.forEach(doc => {
      if (results.length >= limit) return
      const data = doc.data()
      const title = data.title || ''
      const content = data.content || ''
      
      // Server-side filtering with better performance
      if (
        title.toLowerCase().includes(q) ||
        content.toLowerCase().includes(q)
      ) {
        const replies = Array.isArray(data.replies) ? data.replies : []
        const hasInstructorReply = replies.some(r => MOD_ROLES.includes(r.role))
        results.push({
          id: doc.id,
          title,
          snippet: content.slice(0, 200),
          tags: Array.isArray(data.tags) ? data.tags : [],
          resolutionStatus: data.resolutionStatus || 'unanswered',
          hasInstructorReply,
          createdAt: data.createdAt || null,
        })
      }
    })

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[forum/analyze] Error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
