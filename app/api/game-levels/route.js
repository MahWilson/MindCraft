import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
	collection,
	addDoc,
	getDocs,
	query,
	orderBy,
	limit,
	serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';

function isTeacherOrAdmin(cookieStore) {
	const role = cookieStore.get('user_role')?.value;
	return role === 'teacher' || role === 'admin';
}

export async function GET() {
	try {
		const q = query(
			collection(db, 'gameLevel'),
			orderBy('updatedAt', 'desc'),
			limit(25)
		);
		const snapshot = await getDocs(q);
		const levels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		return NextResponse.json({ levels });
	} catch (err) {
		console.error('Error listing game levels:', err);
		return NextResponse.json(
			{ error: 'Failed to load game levels', details: String(err) },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
	try {
		const cookieStore = await cookies();
		if (!isTeacherOrAdmin(cookieStore)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		const body = await request.json();
		const {
			title,
			goal,
			points = 0,
			gridSize = 5,
			goalRow = 1,
			goalCol = 1,
			coinTarget = 0,
			sampleBlocks = [],
		} = body;

		if (!title?.trim() || !goal?.trim()) {
			return NextResponse.json(
				{ error: 'Title and goal are required' },
				{ status: 400 }
			);
		}

		const createdBy = cookieStore.get('user_id')?.value || 'unknown';

		const payload = {
			title: title.trim(),
			goal: goal.trim(),
			points: Number(points) || 0,
			gridSize: Number(gridSize) || 5,
			goalRow: Number(goalRow) || 1,
			goalCol: Number(goalCol) || 1,
			coinTarget: Number(coinTarget) || 0,
			sampleBlocks,
			createdBy,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const ref = await addDoc(collection(db, 'gameLevel'), payload);

		return NextResponse.json({ success: true, id: ref.id });
	} catch (err) {
		console.error('Error creating game level:', err);
		return NextResponse.json(
			{ error: 'Failed to create level', details: String(err) },
			{ status: 500 }
		);
	}
}


