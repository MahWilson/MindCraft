// Next.js App Router API: /api/assessments/[id]
// Handles fetching, updating, and deleting individual assessments

import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * GET /api/assessments/[id]
 * Fetch a specific assessment by ID
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

		return NextResponse.json({
			success: true,
			assessment: {
				id: docSnap.id,
				...docSnap.data()
			}
		});

	} catch (error) {
		console.error('Error fetching assessment:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to fetch assessment' },
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/assessments/[id]
 * Update an existing assessment
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

		// Validate mandatory fields if provided
		if (body.title !== undefined && (!body.title || !body.title.trim())) {
			return NextResponse.json(
				{ success: false, error: 'Title cannot be empty' },
				{ status: 400 }
			);
		}

		if (body.type !== undefined && !['quiz', 'coding', 'assignment'].includes(body.type)) {
			return NextResponse.json(
				{ success: false, error: 'Valid assessment type is required (quiz, coding, or assignment)' },
				{ status: 400 }
			);
		}

		// Prepare update data
		const updateData = {
			...body,
			updatedAt: serverTimestamp()
		};

		// Remove fields that shouldn't be updated
		delete updateData.id;
		delete updateData.createdAt;

		await updateDoc(docRef, updateData);

		return NextResponse.json({
			success: true,
			message: 'Assessment updated successfully'
		});

	} catch (error) {
		console.error('Error updating assessment:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to update assessment' },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/assessments/[id]
 * Delete an assessment
 */
export async function DELETE(request, { params }) {
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

		await deleteDoc(docRef);

		return NextResponse.json({
			success: true,
			message: 'Assessment deleted successfully'
		});

	} catch (error) {
		console.error('Error deleting assessment:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to delete assessment' },
			{ status: 500 }
		);
	}
}





