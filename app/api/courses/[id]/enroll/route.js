import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// Check if student is enrolled in a course
async function isEnrolled(studentId, courseId) {
	try {
		const enrollmentRef = doc(db, 'enrollments', `${studentId}_${courseId}`);
		const enrollmentDoc = await getDoc(enrollmentRef);
		return enrollmentDoc.exists();
	} catch (err) {
		console.error('Error checking enrollment:', err);
		return false;
	}
}

// POST /api/courses/[id]/enroll - Enroll student in course
export async function POST(request, { params }) {
	try {
		const { id: courseId } = await params;
		const { studentId } = await request.json();

		if (!studentId) {
			return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
		}

		// Verify course exists
		const courseRef = doc(db, 'courses', courseId);
		const courseDoc = await getDoc(courseRef);

		if (!courseDoc.exists()) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		const courseData = courseDoc.data();
		if (courseData.status !== 'published') {
			return NextResponse.json({ error: 'Cannot enroll in unpublished course' }, { status: 400 });
		}

		// Check if already enrolled
		const alreadyEnrolled = await isEnrolled(studentId, courseId);
		if (alreadyEnrolled) {
			return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 });
		}

		// Create enrollment
		const enrollmentRef = doc(db, 'enrollments', `${studentId}_${courseId}`);
		await setDoc(enrollmentRef, {
			studentId,
			courseId,
			enrolledAt: serverTimestamp(),
			progress: {
				completedModules: [],
				completedLessons: [],
				overallProgress: 0,
			},
		});

		return NextResponse.json({ success: true, message: 'Enrolled successfully' });
	} catch (err) {
		console.error('Enrollment error:', err);
		return NextResponse.json({ error: 'Failed to enroll', details: String(err) }, { status: 500 });
	}
}

// GET /api/courses/[id]/enroll - Check enrollment status
export async function GET(request, { params }) {
	try {
		const { id: courseId } = await params;
		const { searchParams } = new URL(request.url);
		const studentId = searchParams.get('studentId');

		if (!studentId) {
			return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
		}

		const enrolled = await isEnrolled(studentId, courseId);
		return NextResponse.json({ enrolled });
	} catch (err) {
		console.error('Error checking enrollment:', err);
		return NextResponse.json({ error: 'Failed to check enrollment', details: String(err) }, { status: 500 });
	}
}

