import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// Check if student is enrolled in a course
async function isEnrolled(studentId, courseId) {
	try {
		const enrollmentRef = doc(db, 'enrollment', `${studentId}_${courseId}`);
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
		const body = await request.json();
		const { studentId } = body;

		console.log('Enrollment request:', { courseId, studentId });

		if (!studentId) {
			return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
		}

		if (!courseId) {
			return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
		}

		// Verify course exists
		const courseRef = doc(db, 'course', courseId);
		const courseDoc = await getDoc(courseRef);

		if (!courseDoc.exists()) {
			console.error('Course not found:', courseId);
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
		const enrollmentId = `${studentId}_${courseId}`;
		const enrollmentRef = doc(db, 'enrollment', enrollmentId);
		
		console.log('Creating enrollment:', enrollmentId);
		
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

		console.log('Enrollment created successfully');
		return NextResponse.json({ success: true, message: 'Enrolled successfully' });
	} catch (err) {
		console.error('Enrollment error:', err);
		console.error('Error stack:', err.stack);
		return NextResponse.json({ 
			error: 'Failed to enroll', 
			details: err.message || String(err),
			stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
		}, { status: 500 });
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

