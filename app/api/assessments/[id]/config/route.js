// Next.js App Router API: /api/assessments/[id]/config
// Handles assessment configuration (grading rules, availability, notifications)

import { NextResponse } from 'next/server';
import { db, admin } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * GET /api/assessments/[id]/config
 * Fetch assessment configuration
 */
export async function GET(request, { params }) {
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

		const data = docSnap.data();
		
		// Extract configuration
		const config = {
			// Grading Configuration
			totalMarks: data.config?.totalMarks || 100,
			passingMarks: data.config?.passingMarks || 40,
			weightage: data.config?.weightage || [],
			rubrics: data.config?.rubrics || [],

			// Availability Configuration
			startDate: data.config?.startDate || null,
			startTime: data.config?.startTime || null,
			endDate: data.config?.endDate || null,
			endTime: data.config?.endTime || null,
			duration: data.config?.duration || null, // in minutes
			showDuration: data.config?.showDuration || false,

			// Student Access Control
			studentAccess: data.config?.studentAccess || 'online', // 'online', 'offline', 'disabled'
			allowMultipleAttempts: data.config?.allowMultipleAttempts || false,
			maxAttempts: data.config?.maxAttempts || 1,

			// Notification & Reminder
			enableReminder: data.config?.enableReminder || false,
			reminderBefore: data.config?.reminderBefore || 24, // hours before deadline
			sendNotificationOnStart: data.config?.sendNotificationOnStart || false,

			// Auto-availability
			autoUnavailable: data.config?.autoUnavailable || true,
			showResults: data.config?.showResults || true,

			// Additional settings
			shuffleQuestions: data.config?.shuffleQuestions || false,
			attempts: data.config?.attempts || 1,
			timer: data.config?.timer || null,
		};

		return NextResponse.json({
			success: true,
			config,
			assessmentId: id,
		});

	} catch (error) {
		console.error('Error fetching assessment config:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to fetch configuration' },
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/assessments/[id]/config
 * Update assessment configuration
 */
export async function PUT(request, { params }) {
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

		// Validate configuration data
		if (body.totalMarks !== undefined && body.totalMarks <= 0) {
			return NextResponse.json(
				{ success: false, error: 'Total marks must be greater than 0' },
				{ status: 400 }
			);
		}

		if (body.passingMarks !== undefined && body.passingMarks < 0) {
			return NextResponse.json(
				{ success: false, error: 'Passing marks cannot be negative' },
				{ status: 400 }
			);
		}

		if (body.startDate && body.endDate) {
			const start = new Date(body.startDate);
			const end = new Date(body.endDate);
			if (start >= end) {
				return NextResponse.json(
					{ success: false, error: 'Start date must be before end date' },
					{ status: 400 }
				);
			}
		}

		// Merge new config with existing config
		const currentData = docSnap.data();
		const updatedConfig = {
			...currentData.config,
			...body,
		};

		// Update assessment with new config
		await updateDoc(docRef, {
			config: updatedConfig,
			updatedAt: serverTimestamp(),
		});

		return NextResponse.json({
			success: true,
			message: 'Assessment configuration updated successfully',
			config: updatedConfig,
		});

	} catch (error) {
		console.error('Error updating assessment config:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to update configuration' },
			{ status: 500 }
		);
	}
}
