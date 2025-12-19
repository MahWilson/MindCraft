import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ fallback: true, message: 'Using client-side Firestore' }, { status: 200 })
    }

    const body = await request.json().catch(() => ({}))
    const { title, content, authorId, authorName, role, tags, images, context, nsfw, flair, postType, pollOptions } = body
    
    if (!title || !content || !authorId || !authorName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const tokenize = (s) => (s || '').toLowerCase().replace(/[`~!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/]/g, ' ').split(/\s+/).filter(Boolean)
    const filterTokens = (tokens) => tokens.filter(t => t.length > 1)
    const buildBigrams = (tokens) => {
      const big = []
      for (let i = 0; i < tokens.length - 1; i++) big.push(tokens[i] + ' ' + tokens[i+1])
      return big
    }
    const tTokens = filterTokens(tokenize(title))
    const cTokens = filterTokens(tokenize(content))
    const indexTokens = Array.from(new Set([...tTokens, ...cTokens]))
    const indexBigrams = Array.from(new Set(buildBigrams([...tTokens, ...cTokens])))

    const prohibited = ['nsfw','porn','sex','nude','explicit','xxx','adult','hate','racist','homophobic','terror','violence']
    const lc = (title + ' ' + content).toLowerCase()
    if (nsfw === true) {
      return NextResponse.json({ error: 'NSFW content is prohibited' }, { status: 422 })
    }
    if (prohibited.some(w => lc.includes(w))) {
      return NextResponse.json({ error: 'Content violates community guidelines' }, { status: 422 })
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
      nsfw: !!nsfw,
      flair: typeof flair === 'string' ? flair : '',
      postType: typeof postType === 'string' ? postType : 'text',
      pollOptions: Array.isArray(pollOptions) ? pollOptions.filter(x => typeof x === 'string' && x.trim()).slice(0, 6) : [],
      searchIndex: {
        tokens: indexTokens,
        bigrams: indexBigrams,
      },
    }
    
    const docRef = await adminDb.collection('post').add(postData)
    return NextResponse.json({ success: true, id: docRef.id })
  } catch (err) {
    console.error('[forum/create] Error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
