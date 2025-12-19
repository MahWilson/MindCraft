import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']
const STOPWORDS = new Set([
  'the','a','an','and','or','but','to','of','in','on','for','with','from','by','is','are','was','were','be','been','it','that','this','as','at','we','you','they','i','he','she','them','us','our','your'
])

function tokenize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[`~!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function filterTokens(tokens) {
  return tokens.filter(t => t.length > 1 && !STOPWORDS.has(t))
}

function buildBigrams(tokens) {
  const bigrams = []
  for (let i = 0; i < tokens.length - 1; i++) bigrams.push(tokens[i] + ' ' + tokens[i+1])
  return bigrams
}

function levenshtein(a, b) {
  const s = (a || '').toLowerCase()
  const t = (b || '').toLowerCase()
  const m = s.length, n = t.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[m][n]
}

function fuzzyScore(query, text) {
  const q = (query || '').trim()
  const t = (text || '').trim()
  if (!q || !t) return 0
  const dist = levenshtein(q, t.slice(0, q.length * 3))
  const denom = Math.max(q.length, 1)
  const sim = 1 - Math.min(dist / (denom * 2), 1)
  return Math.max(sim, 0)
}

function jaccard(aSet, bSet) {
  const inter = new Set([...aSet].filter(x => bSet.has(x))).size
  const union = new Set([...aSet, ...bSet]).size
  return union === 0 ? 0 : inter / union
}

function tfScore(tokens, queryTokens) {
  const counts = Object.create(null)
  tokens.forEach(t => { counts[t] = (counts[t] || 0) + 1 })
  return queryTokens.reduce((sum, qt) => sum + (counts[qt] || 0), 0) / Math.max(tokens.length, 1)
}

function recencyWeight(createdAt) {
  try {
    const t = createdAt?.toMillis ? createdAt.toMillis() : new Date(createdAt).getTime()
    if (!t || Number.isNaN(t)) return 0.8
    const days = Math.max((Date.now() - t) / (1000 * 60 * 60 * 24), 0)
    const w = Math.exp(-days / 90) // 90-day half-life
    return Math.min(Math.max(w, 0.4), 1)
  } catch { return 0.8 }
}

function activityWeight(replies) {
  const n = Array.isArray(replies) ? replies.length : 0
  return Math.min(1, 0.6 + Math.log10(1 + n) * 0.2)
}

function makeSnippet(content, qTokens) {
  const text = (content || '').trim()
  if (!text) return ''
  const lower = text.toLowerCase()
  let idx = -1
  for (const qt of qTokens) {
    const found = lower.indexOf(qt)
    if (found !== -1) { idx = found; break }
  }
  if (idx === -1) return text.slice(0, 200)
  const start = Math.max(idx - 60, 0)
  const end = Math.min(idx + 140, text.length)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ results: [] })
    }

    const { query, limit = 10 } = await request.json().catch(() => ({}))
    const qRaw = (query || '').trim()
    const q = qRaw.toLowerCase()
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const qTokens = filterTokens(tokenize(q))
    const qBigrams = buildBigrams(qTokens)
    const qSet = new Set(qTokens)
    const qBigramSet = new Set(qBigrams)

    const snap = await adminDb
      .collection('post')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const scored = []
    snap.forEach(doc => {
      const data = doc.data()
      const title = data.title || ''
      const content = data.content || ''
      const replies = Array.isArray(data.replies) ? data.replies : []
      const tokensTitle = filterTokens(tokenize(title))
      const tokensContent = filterTokens(tokenize(content))
      const bigramsTitle = buildBigrams(tokensTitle)
      const bigramsContent = buildBigrams(tokensContent)

      const titleSet = new Set(tokensTitle)
      const contentSet = new Set(tokensContent)
      const titleBigSet = new Set(bigramsTitle)
      const contentBigSet = new Set(bigramsContent)

      const jaccardTitle = jaccard(qSet, titleSet)
      const jaccardContent = jaccard(qSet, contentSet)
      const bigOverlap = jaccard(qBigramSet, new Set([...titleBigSet, ...contentBigSet]))
      const tf = Math.max(tfScore(tokensTitle, qTokens), tfScore(tokensContent, qTokens))
      const fuzzy = Math.max(fuzzyScore(qRaw, title), fuzzyScore(qRaw, content))
      const rec = recencyWeight(data.createdAt)
      const act = activityWeight(replies)
      const hasInstructorReply = replies.some(r => MOD_ROLES.includes(r.role))

      // Weighted score: keyword + bigrams + tf + recency + activity
      const raw =
        0.35 * Math.max(jaccardTitle, jaccardContent) +
        0.20 * bigOverlap +
        0.18 * tf +
        0.12 * fuzzy +
        0.15 * rec +
        0.10 * act

      const score = Math.round(Math.min(Math.max(raw, 0), 1) * 100)

      // Filter low scores
      if (score < 10) return

      scored.push({
        id: doc.id,
        title,
        snippet: makeSnippet(content, qTokens),
        tags: Array.isArray(data.tags) ? data.tags : [],
        resolutionStatus: data.resolutionStatus || 'unanswered',
        hasInstructorReply,
        createdAt: data.createdAt || null,
        score,
        replyCount: replies.length
      })
    })

    scored.sort((a, b) => b.score - a.score)
    const results = scored.slice(0, limit)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('[forum/analyze] Error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
