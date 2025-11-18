// Next.js App Router API: /api/assessments/[id]/check-availability
// Checks if student can access/submit assessment based on availability settings

import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * POST /api/assessments/[id]/check-availability
 * Check if assessment is available for student to take
 * Returns: { available: boolean, reason?: string, deadline?: date }
 */
export async function POST(request, { params }) {
	try {
		const { id } = params;
		const body = await request.json();
		const { userId } = body;

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'Assessment ID is required' },
				{ status: 400 }
			);
		}

		if (!userId) {
			return NextResponse.json(
				{ success: false, error: 'User ID is required' },
				{ status: 400 }
			);
		}

		// Get assessment
		const assessmentDoc = await getDoc(doc(db, 'assessments', id));
		if (!assessmentDoc.exists()) {
			return NextResponse.json(
				{ success: false, error: 'Assessment not found' },
				{ status: 404 }
			);
		}

		const assessment = assessmentDoc.data();
		const config = assessment.config || {};
		const now = new Date();

		// Check 1: Assessment must be published
		if (!assessment.published) {
			return NextResponse.json({
				success: true,
				available: false,
				reason: 'Assessment is not published yet',
				status: 'not_published',
			});
		}

		// Check 2: Student access mode
		if (config.studentAccess === 'disabled') {
			return NextResponse.json({
				success: true,
				available: false,
				reason: 'Student access is disabled for this assessment',
				status: 'access_disabled',
			});
		}

		// Check 3: Check start date/time
		if (config.startDate) {
			const startTime = config.startTime || '00:00';
			const [hours, minutes] = startTime.split(':');
			const startDateTime = new Date(config.startDate);
			startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

			if (now < startDateTime) {
				return NextResponse.json({
					success: true,
					available: false,
					reason: `Assessment is not available yet. It will be available on ${config.startDate} at ${startTime}`,
					status: 'not_started',
					availableAt: startDateTime.toISOString(),
				});
			}
		}

		// Check 4: Check end date/time for submission deadline
		const submissionDeadline = getSubmissionDeadline(config);
		if (submissionDeadline && now > submissionDeadline) {
			return NextResponse.json({
				success: true,
				available: false,
				reason: 'Assessment submission deadline has passed',
				status: 'deadline_passed',
				deadline: submissionDeadline.toISOString(),
			});
		}

		// Check 5: Check attempts
		if (config.allowMultipleAttempts === false || config.maxAttempts) {
			const attemptQuery = query(
				collection(db, 'submissions'),
				where('assessmentId', '==', id),
				where('userId', '==', userId)
			);

			const attemptSnapshot = await getDocs(attemptQuery);
			const attemptCount = attemptSnapshot.size;
			const maxAttempts = config.maxAttempts || 1;

			if (attemptCount >= maxAttempts) {
				return NextResponse.json({
					success: true,
					available: false,
					reason: `You have reached the maximum number of attempts (${maxAttempts})`,
					status: 'max_attempts_reached',
					attempts: attemptCount,
					maxAttempts,
				});
			}
		}

		// All checks passed - assessment is available
		return NextResponse.json({
			success: true,
			available: true,
			status: 'available',
			deadline: submissionDeadline ? submissionDeadline.toISOString() : null,
			remainingTime: submissionDeadline ? Math.max(0, submissionDeadline - now) : null, // ms
		});

	} catch (error) {
		console.error('Error checking availability:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to check availability' },
			{ status: 500 }
		);
	}
}

/**
 * Helper: Calculate submission deadline based on config
 */
function getSubmissionDeadline(config) {
	if (!config.endDate) return null;

	const endTime = config.endTime || '23:59';
	const [hours, minutes] = endTime.split(':');
	const deadline = new Date(config.endDate);
	deadline.setHours(parseInt(hours), parseInt(minutes), 0);

	return deadline;
}
