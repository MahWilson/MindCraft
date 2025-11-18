// Next.js App Router API: /api/assessments/[id]/notifications
// Handles assessment deadline reminders and notifications

import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

/**
 * POST /api/assessments/[id]/notifications/send-reminders
 * Send deadline reminders to enrolled students
 * This can be called by a scheduled job or manually by teacher
 */
export async function POST(request, { params }) {
	try {
		const { id } = params;
		const body = await request.json();

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'Assessment ID is required' },
				{ status: 400 }
			);
		}

		const docRef = doc(db, 'assessments', id);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
			return NextResponse.json(
				{ success: false, error: 'Assessment not found' },
				{ status: 404 }
			);
		}

		const assessment = docSnap.data();
		const config = assessment.config || {};

		// Check if reminders are enabled
		if (!config.enableReminder) {
			return NextResponse.json({
				success: true,
				message: 'Reminders disabled for this assessment',
				sentCount: 0,
			});
		}

		// Get all enrolled students for the course
		const enrollmentQuery = query(
			collection(db, 'enrollments'),
			where('courseId', '==', assessment.courseId),
			where('role', '==', 'student')
		);

		const enrollmentSnapshot = await getDocs(enrollmentQuery);
		const notifications = [];
		const sentCount = enrollmentSnapshot.size;

		// Create notification for each student
		for (const enrollmentDoc of enrollmentSnapshot.docs) {
			const enrollment = enrollmentDoc.data();

			const notification = {
				userId: enrollment.userId,
				assessmentId: id,
				assessmentTitle: assessment.title,
				type: 'deadline_reminder',
				message: `Reminder: Assessment "${assessment.title}" is due in ${config.reminderBefore} hours`,
				deadline: config.endDate,
				read: false,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			// Add to notifications collection
			await addDoc(collection(db, 'notifications'), notification);
			notifications.push(notification);
		}

		return NextResponse.json({
			success: true,
			message: 'Reminders sent successfully',
			sentCount,
			notifications: notifications.length,
		});

	} catch (error) {
		console.error('Error sending reminders:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to send reminders' },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/assessments/[id]/notifications/send-availability
 * Send notification when assessment becomes available
 */
export async function POST(request, { params }) {
	try {
		const { id } = params;

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'Assessment ID is required' },
				{ status: 400 }
			);
		}

		const docRef = doc(db, 'assessments', id);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
			return NextResponse.json(
				{ success: false, error: 'Assessment not found' },
				{ status: 404 }
			);
		}

		const assessment = docSnap.data();
		const config = assessment.config || {};

		// Check if availability notification is enabled
		if (!config.sendNotificationOnStart) {
			return NextResponse.json({
				success: true,
				message: 'Start notification disabled for this assessment',
				sentCount: 0,
			});
		}

		// Get all enrolled students
		const enrollmentQuery = query(
			collection(db, 'enrollments'),
			where('courseId', '==', assessment.courseId),
			where('role', '==', 'student')
		);

		const enrollmentSnapshot = await getDocs(enrollmentQuery);
		const sentCount = enrollmentSnapshot.size;

		// Create notification for each student
		for (const enrollmentDoc of enrollmentSnapshot.docs) {
			const enrollment = enrollmentDoc.data();

			const notification = {
				userId: enrollment.userId,
				assessmentId: id,
				assessmentTitle: assessment.title,
				type: 'assessment_available',
				message: `Assessment "${assessment.title}" is now available for you to take`,
				deadline: config.endDate,
				read: false,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			// Add to notifications collection
			await addDoc(collection(db, 'notifications'), notification);
		}

		return NextResponse.json({
			success: true,
			message: 'Availability notifications sent successfully',
			sentCount,
		});

	} catch (error) {
		console.error('Error sending availability notifications:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to send notifications' },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/assessments/[id]/notifications/check-deadline
 * Check if assessment deadline has passed and mark as unavailable
 */
export async function POST(request, { params }) {
	try {
		const { id } = params;

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'Assessment ID is required' },
				{ status: 400 }
			);
		}

		const docRef = doc(db, 'assessments', id);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
			return NextResponse.json(
				{ success: false, error: 'Assessment not found' },
				{ status: 404 }
			);
		}

		const assessment = docSnap.data();
		const config = assessment.config || {};

		// Check if auto-unavailable is enabled
		if (!config.autoUnavailable) {
			return NextResponse.json({
				success: true,
				message: 'Auto-unavailable disabled for this assessment',
				updated: false,
			});
		}

		// Check if deadline has passed
		const now = new Date();
		const deadlineDate = config.endDate ? new Date(config.endDate) : null;
		const deadlineTime = config.endTime || '23:59';

		if (!deadlineDate) {
			return NextResponse.json({
				success: true,
				message: 'No deadline configured',
				updated: false,
			});
		}

		// Create deadline datetime
		const [hours, minutes] = deadlineTime.split(':');
		deadlineDate.setHours(parseInt(hours), parseInt(minutes), 0);

		if (now > deadlineDate && assessment.published) {
			// Mark assessment as unavailable
			await updateDoc(docRef, {
				published: false,
				config: {
					...config,
					autoUnavailableAt: serverTimestamp(),
				},
				updatedAt: serverTimestamp(),
			});

			// Send notification to all students
			const enrollmentQuery = query(
				collection(db, 'enrollments'),
				where('courseId', '==', assessment.courseId),
				where('role', '==', 'student')
			);

			const enrollmentSnapshot = await getDocs(enrollmentQuery);

			for (const enrollmentDoc of enrollmentSnapshot.docs) {
				const enrollment = enrollmentDoc.data();

				const notification = {
					userId: enrollment.userId,
					assessmentId: id,
					assessmentTitle: assessment.title,
					type: 'assessment_closed',
					message: `Assessment "${assessment.title}" is now closed. Deadline has passed.`,
					read: false,
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				};

				await addDoc(collection(db, 'notifications'), notification);
			}

			return NextResponse.json({
				success: true,
				message: 'Assessment marked as unavailable due to deadline',
				updated: true,
				notifiedStudents: enrollmentSnapshot.size,
			});
		}

		return NextResponse.json({
			success: true,
			message: 'Deadline has not passed yet',
			updated: false,
		});

	} catch (error) {
		console.error('Error checking deadline:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to check deadline' },
			{ status: 500 }
		);
	}
}
