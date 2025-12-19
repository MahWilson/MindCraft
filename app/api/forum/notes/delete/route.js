import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/admin'

const MOD_ROLES = ['admin', 'teacher', 'instructor']

export async function DELETE(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Service Unavailable - Backend Config Missing' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const entryIndexStr = searchParams.get('entryIndex')
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole') || ''

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!MOD_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const ref = adminDb.collection('instructor_notes').doc(postId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const data = snap.data()
    const history = Array.isArray(data.history) ? data.history : []
    const entryIndex = entryIndexStr !== null ? Number(entryIndexStr) : null
    let deleted

    if (entryIndex !== null && Number.isInteger(entryIndex) && entryIndex >= 0 && entryIndex < history.length) {
      deleted = history[entryIndex]
      const next = history.slice(0, entryIndex).concat(history.slice(entryIndex + 1))
      await ref.set(
        {
          history: next,
        },
        { merge: true }
      )
    } else {
      deleted = { notes: data.notes || '', updatedAt: data.updatedAt || null, updatedBy: data.updatedBy || null, historyCount: history.length }
      await ref.delete()
    }

    await adminDb.collection('audit_log').add({
      action: 'DELETE_INSTRUCTOR_NOTE',
      postId,
      deletedBy: userId,
      deletedRole: userRole,
      deletedEntry: deleted || null,
      timeStamp: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
