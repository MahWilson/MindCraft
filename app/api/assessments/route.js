// Next.js App Router API: /api/assessments
// Handles creation and fetching of assessments

import { NextResponse } from 'next/server';
import { db, auth } from '@/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';

/**
 * POST /api/assessments
 * Create a new assessment
 * Required fields: title, courseId, type
 * Optional: questions, config (attempts, timer, visibility), published
 */
export async function POST(request) {
	try {
		const body = await request.json();
		const { 
			title, 
			courseId, 
			type, 
			questions = [], 
			config = {}, 
			published = false,
			description = ''
		} = body;

		// Validation: Mandatory fields
		if (!title || !title.trim()) {
			return NextResponse.json(
				{ success: false, error: 'Title is required' },
				{ status: 400 }
			);
		}

		if (!courseId || !courseId.trim()) {
			return NextResponse.json(
				{ success: false, error: 'Course ID is required' },
				{ status: 400 }
			);
		}

		if (!type || !['quiz', 'coding', 'assignment'].includes(type)) {
			return NextResponse.json(
				{ success: false, error: 'Valid assessment type is required (quiz, coding, or assignment)' },
				{ status: 400 }
			);
		}

		// Validate questions if provided
		if (questions.length > 0) {
			for (let i = 0; i < questions.length; i++) {
				const q = questions[i];
				if (!q.type || !q.question || !q.question.trim()) {
					return NextResponse.json(
						{ success: false, error: `Question ${i + 1} is missing required fields (type and question)` },
						{ status: 400 }
					);
				}

				// Validate based on question type
				if (q.type === 'mcq' && (!q.options || !Array.isArray(q.options) || q.options.length < 2)) {
					return NextResponse.json(
						{ success: false, error: `Question ${i + 1} (MCQ) must have at least 2 options` },
						{ status: 400 }
					);
				}

				if (q.type === 'true-false' && (!q.correctAnswer || !['true', 'false'].includes(q.correctAnswer.toLowerCase()))) {
					return NextResponse.json(
						{ success: false, error: `Question ${i + 1} (True/False) must have a valid correctAnswer` },
						{ status: 400 }
					);
				}
			}
		}

		// Validate config
		const assessmentConfig = {
			attempts: config.attempts || 1,
			timer: config.timer || null,
			startDate: config.startDate || null,
			endDate: config.endDate || null,
			showResults: config.showResults !== undefined ? config.showResults : true,
			shuffleQuestions: config.shuffleQuestions || false,
			...config
		};

		// Create assessment document
		const assessmentData = {
			title: title.trim(),
			description: description.trim(),
			courseId: courseId.trim(),
			type,
			questions,
			config: assessmentConfig,
			published,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(collection(db, 'assessments'), assessmentData);

		return NextResponse.json({
			success: true,
			assessmentId: docRef.id,
			message: published ? 'Assessment published successfully' : 'Assessment saved as draft'
		});

	} catch (error) {
		console.error('Error creating assessment:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to create assessment' },
			{ status: 500 }
		);
	}
}

/**
 * GET /api/assessments
 * Fetch assessments
 * Query params: courseId (optional), published (optional)
 */
export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const courseId = searchParams.get('courseId');
		const publishedParam = searchParams.get('published');

		let q = collection(db, 'assessments');
		const constraints = [];

		// Filter by course if provided
		if (courseId) {
			constraints.push(where('courseId', '==', courseId));
		}

		// Filter by published status if provided
		if (publishedParam !== null) {
			const published = publishedParam === 'true';
			constraints.push(where('published', '==', published));
		}

		// Order by creation date
		constraints.push(orderBy('createdAt', 'desc'));

		if (constraints.length > 0) {
			q = query(q, ...constraints);
		}

		const snapshot = await getDocs(q);
		const assessments = [];

		snapshot.forEach((doc) => {
			assessments.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return NextResponse.json({
			success: true,
			assessments
		});

	} catch (error) {
		console.error('Error fetching assessments:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to fetch assessments' },
			{ status: 500 }
		);
	}
}





