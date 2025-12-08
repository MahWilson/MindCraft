import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
	doc,
	getDoc,
	updateDoc,
	increment,
	arrayUnion,
	serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';

export async function POST(request, { params }) {
	try {
		const cookieStore = await cookies();
		const userId = cookieStore.get('user_id')?.value;

		if (!userId) {
			return NextResponse.json({ error: 'Sign in first' }, { status: 403 });
		}

		const { id } = params;
		const levelRef = doc(db, 'gameLevel', id);
		const levelSnap = await getDoc(levelRef);

		if (!levelSnap.exists()) {
			return NextResponse.json({ error: 'Level not found' }, { status: 404 });
		}

		const level = levelSnap.data();
		const points = Number(level.points) || 0;

		const userRef = doc(db, 'user', userId);
		const userSnap = await getDoc(userRef);
		if (!userSnap.exists()) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		await updateDoc(userRef, {
			points: increment(points),
			completedLevels: arrayUnion(id),
			lastLevelEarnedAt: serverTimestamp(),
		});

		return NextResponse.json({ success: true, pointsEarned: points });
	} catch (err) {
		console.error('Error awarding points:', err);
		return NextResponse.json(
			{ error: 'Failed to award points', details: String(err) },
			{ status: 500 }
		);
	}
}


