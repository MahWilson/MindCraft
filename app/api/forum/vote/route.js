import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    const { postId, replyId, userId, voteType } = await request.json()
    if (!postId || !userId || !['upvote','downvote'].includes(voteType)) return NextResponse.json({ error: 'Missing/invalid fields' }, { status: 400 })
    if (replyId) {
      const pRef = adminDb.collection('post').doc(postId)
      const pSnap = await pRef.get()
      if (!pSnap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      const dataPost = pSnap.data()
      const arr = Array.isArray(dataPost.replies) ? dataPost.replies : []
      const idx = arr.findIndex(r => r.id === replyId)
      if (idx === -1) return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
      const data = arr[idx]
      const votes = { ...(data.votes || {}) }
      const current = votes[userId]
      let delta = 0
      if (current === voteType) { delete votes[userId]; delta = voteType === 'upvote' ? -1 : 1 }
      else if (current) { votes[userId] = voteType; delta = voteType === 'upvote' ? 2 : -2 }
      else { votes[userId] = voteType; delta = voteType === 'upvote' ? 1 : -1 }
      arr[idx] = { ...data, votes, score: (data.score || 0) + delta }
      await pRef.update({ replies: arr })
      return NextResponse.json({ success: true })
    } else {
      const pRef = adminDb.collection('post').doc(postId)
      const pSnap = await pRef.get()
      if (!pSnap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      const data = pSnap.data()
      const votes = { ...(data.votes || {}) }
      const current = votes[userId]
      let delta = 0
      if (current === voteType) { delete votes[userId]; delta = voteType === 'upvote' ? -1 : 1 }
      else if (current) { votes[userId] = voteType; delta = voteType === 'upvote' ? 2 : -2 }
      else { votes[userId] = voteType; delta = voteType === 'upvote' ? 1 : -1 }
      await pRef.update({ votes, score: (data.score || 0) + delta })
      return NextResponse.json({ success: true })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
