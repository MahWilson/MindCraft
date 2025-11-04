// Next.js App Router API: /api/courses
// Methods:
// - POST: Create a course document in Firestore
// - GET: List courses, optional filter ?status=draft|published
//
// TODO(auth): Enforce role: only teachers/admins can POST. Verify Firebase ID token
//             from Authorization header (Bearer) before allowing writes.
// TODO(data): Validate/sanitize inputs; add server-side defaults.
// TODO(audit): Attach createdBy from verified user and server timestamp.

import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import {
	collection,
	addDoc,
	serverTimestamp,
	query,
	where,
	getDocs,
} from 'firebase/firestore';

export async function POST(request) {
	try {
		const body = await request.json();
		const { title, description = '', modules = [], status = 'draft' } = body || {};

		if (!title || typeof title !== 'string') {
			return NextResponse.json({ error: 'Title is required' }, { status: 400 });
		}

		// TODO(auth): Get UID from verified token; fallback to null in stub
		const createdBy = null; // replace after wiring Firebase Auth validation in API route

		const payload = {
			title: title.trim(),
			description: description?.trim?.() || '',
			status: status === 'published' ? 'published' : 'draft',
			modules,
			createdBy,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const ref = await addDoc(collection(db, 'courses'), payload);
		return NextResponse.json({ id: ref.id, ...payload }, { status: 201 });
	} catch (err) {
		return NextResponse.json({ error: 'Failed to create course', details: String(err) }, { status: 500 });
	}
}

export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const status = searchParams.get('status');

		let q = collection(db, 'courses');
		if (status && (status === 'draft' || status === 'published')) {
			q = query(q, where('status', '==', status));
		}

		const snap = await getDocs(q);
		const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
		return NextResponse.json({ items });
	} catch (err) {
		return NextResponse.json({ error: 'Failed to list courses', details: String(err) }, { status: 500 });
	}
}

// NOTE: For PUT /api/courses/:id create file app/api/courses/[id]/route.js
// with update logic (persist module ordering, etc.). Kept minimal per starter scope.


