import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']

export async function GET(request) {
  try {
    if (!adminDb) {
      // Return empty notes instead of 503 - frontend will use client-side fallback
      return NextResponse.json({ notes: '', updatedAt: null, updatedBy: null, history: [], fallback: true })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const userRole = searchParams.get('userRole') || ''

    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    if (!MOD_ROLES.includes(userRole)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const ref = adminDb.collection('instructor_notes').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ notes: '', updatedAt: null, updatedBy: null, history: [] })

    const data = snap.data()
    return NextResponse.json({
      notes: data.notes || '',
      updatedAt: data.updatedAt || null,
      updatedBy: data.updatedBy || null,
      history: Array.isArray(data.history) ? data.history : [],
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    if (!adminDb) {
      // Return success with fallback flag - frontend will use client-side Firestore
      return NextResponse.json({ success: true, fallback: true, message: 'Using client-side Firestore' })
    }

    const { postId, userId, userRole, notes } = await request.json()
    if (!postId || !userId || typeof notes !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!MOD_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const ref = adminDb.collection('instructor_notes').doc(postId)
    const now = new Date()
    const snap = await ref.get()
    const prev = snap.exists ? (Array.isArray(snap.data().history) ? snap.data().history : []) : []
    const entry = { notes, updatedAt: now, updatedBy: userId }
    await ref.set(
      {
        notes,
        updatedAt: now,
        updatedBy: userId,
        history: [...prev, entry],
      },
      { merge: true }
    )

    return NextResponse.json({ success: true, updatedAt: now.toISOString(), historyAppended: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
