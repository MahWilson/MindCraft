import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Initialize Firebase for server-side
const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Helper to get user role
async function getUserRole(userId) {
	try {
		const userDoc = await getDoc(doc(db, 'user', userId));
		if (userDoc.exists()) {
			return userDoc.data().role;
		}
		return null;
	} catch (err) {
		console.error('Error getting user role:', err);
		return null;
	}
}

// PUT /api/submissions/[id]/grade - Auto-save or update grade
export async function PUT(request, { params }) {
	try {
		const { id: submissionId } = await params;
		const body = await request.json();
		const { grade, feedback, token } = body;

		if (!token) {
			return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
		}

		// Verify token and get user (in production, use Firebase Admin SDK)
		// For now, we'll rely on client-side auth and Firestore security rules
		const userId = body.userId;
		if (!userId) {
			return NextResponse.json({ error: 'User ID required' }, { status: 401 });
		}

		const role = await getUserRole(userId);
		if (role !== 'teacher' && role !== 'admin') {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		// Check if submission exists
		const submissionDoc = await getDoc(doc(db, 'submission', submissionId));
		if (!submissionDoc.exists()) {
			return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
		}

		const submissionData = submissionDoc.data();
		
		// Don't allow updates if feedback is released and regrading is not allowed
		if (submissionData.feedbackReleased && submissionData.allowRegrading === false) {
			return NextResponse.json({ error: 'Regrading not allowed for this submission' }, { status: 403 });
		}

		// Prepare update data
		const updateData = {
			lastSavedAt: serverTimestamp(),
		};

		if (grade !== undefined) {
			updateData.grade = grade ? parseFloat(grade) : null;
			updateData.draftGrade = grade ? parseFloat(grade) : null;
		}

		if (feedback !== undefined) {
			updateData.feedback = feedback;
			updateData.draftFeedback = feedback;
		}

		// Only update gradedAt if this is a manual save (not auto-save)
		if (body.isManualSave) {
			updateData.gradedAt = serverTimestamp();
			updateData.gradedBy = userId;
		}

		await updateDoc(doc(db, 'submission', submissionId), updateData);

		return NextResponse.json({ 
			success: true, 
			message: 'Grade saved successfully',
			savedAt: new Date().toISOString()
		});
	} catch (err) {
		console.error('Error saving grade:', err);
		return NextResponse.json({ 
			error: 'Failed to save grade', 
			details: err.message 
		}, { status: 500 });
	}
}

