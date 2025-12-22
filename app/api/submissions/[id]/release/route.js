import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
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

// POST /api/submissions/[id]/release - Release feedback and grade to student
export async function POST(request, { params }) {
	try {
		const { id: submissionId } = await params;
		const body = await request.json();
		const { grade, feedback, allowRegrading, token } = body;

		if (!token) {
			return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
		}

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

		// Validate that grade or feedback is provided
		if (!grade && !feedback) {
			return NextResponse.json({ error: 'Grade or feedback is required' }, { status: 400 });
		}

		// Prepare update data
		const updateData = {
			grade: grade ? parseFloat(grade) : null,
			feedback: feedback || '',
			feedbackReleased: true,
			releasedAt: serverTimestamp(),
			releasedBy: userId,
			gradedAt: serverTimestamp(),
			gradedBy: userId,
			allowRegrading: allowRegrading !== false, // Default to true
		};

		await updateDoc(doc(db, 'submission', submissionId), updateData);

		// Create notification for student
		try {
			const itemId = submissionData.assignmentId || submissionData.assessmentId;
			let itemTitle = 'Assignment';
			
			if (submissionData.assignmentId) {
				const assignmentDoc = await getDoc(doc(db, 'assignment', submissionData.assignmentId));
				if (assignmentDoc.exists()) {
					itemTitle = assignmentDoc.data().title || 'Assignment';
				}
			} else if (submissionData.assessmentId) {
				const assessmentDoc = await getDoc(doc(db, 'assessment', submissionData.assessmentId));
				if (assessmentDoc.exists()) {
					itemTitle = assessmentDoc.data().title || 'Assessment';
				}
			}

			await addDoc(collection(db, 'notification'), {
				userId: submissionData.studentId,
				type: 'feedback_released',
				title: `Feedback released for ${itemTitle}`,
				message: `Your teacher has released the grade and feedback for your submission.`,
				itemId: itemId,
				submissionId: submissionId,
				read: false,
				createdAt: serverTimestamp(),
			});
		} catch (notifErr) {
			console.error('Error creating notification:', notifErr);
			// Don't fail the release if notification fails
		}

		return NextResponse.json({ 
			success: true, 
			message: 'Feedback and grade released successfully',
			releasedAt: new Date().toISOString()
		});
	} catch (err) {
		console.error('Error releasing feedback:', err);
		return NextResponse.json({ 
			error: 'Failed to release feedback', 
			details: err.message 
		}, { status: 500 });
	}
}

