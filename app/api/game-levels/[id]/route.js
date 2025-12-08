import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
	doc,
	getDoc,
	updateDoc,
	serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';

function isTeacherOrAdmin(cookieStore) {
	const role = cookieStore.get('user_role')?.value;
	return role === 'teacher' || role === 'admin';
}

export async function GET(request, { params }) {
	try {
		const { id } = params;
		const ref = doc(db, 'gameLevel', id);
		const snapshot = await getDoc(ref);

		if (!snapshot.exists()) {
			return NextResponse.json({ error: 'Level not found' }, { status: 404 });
		}

		return NextResponse.json({ level: { id: snapshot.id, ...snapshot.data() } });
	} catch (err) {
		console.error('Error fetching game level:', err);
		return NextResponse.json(
			{ error: 'Failed to load level', details: String(err) },
			{ status: 500 }
		);
	}
}

export async function PUT(request, { params }) {
	try {
		const cookieStore = await cookies();
		if (!isTeacherOrAdmin(cookieStore)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		const { id } = params;
		const body = await request.json();
		const updateData = {};

		if (body.title !== undefined) updateData.title = body.title.trim();
		if (body.goal !== undefined) updateData.goal = body.goal.trim();
		if (body.points !== undefined) updateData.points = Number(body.points) || 0;
		if (body.gridSize !== undefined) updateData.gridSize = Number(body.gridSize) || 5;
		if (body.goalRow !== undefined) updateData.goalRow = Number(body.goalRow) || 1;
		if (body.goalCol !== undefined) updateData.goalCol = Number(body.goalCol) || 1;
		if (body.coinTarget !== undefined) updateData.coinTarget = Number(body.coinTarget) || 0;
		if (body.sampleBlocks !== undefined) updateData.sampleBlocks = body.sampleBlocks;

		updateData.updatedAt = serverTimestamp();

		await updateDoc(doc(db, 'gameLevel', id), updateData);

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Error updating game level:', err);
		return NextResponse.json(
			{ error: 'Failed to update level', details: String(err) },
			{ status: 500 }
		);
	}
}


