import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

// POST /api/lessons - Create a new lesson
export async function POST(request) {
	try {
		const { moduleId, title, contentHtml, order } = await request.json();

		if (!moduleId || !title) {
			return NextResponse.json({ error: 'Module ID and title required' }, { status: 400 });
		}

		// Verify module exists
		const moduleRef = doc(db, 'module', moduleId);
		const moduleDoc = await getDoc(moduleRef);

		if (!moduleDoc.exists()) {
			return NextResponse.json({ error: 'Module not found' }, { status: 404 });
		}

		// Create lesson
		const lessonData = {
			moduleId,
			title: title.trim(),
			contentHtml: contentHtml || '',
			materials: [],
			order: order || 0,
			aiGenerated: false,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const lessonRef = await addDoc(collection(db, 'lesson'), lessonData);

		// Update module to include this lesson
		const moduleLessons = moduleDoc.data().lessons || [];
		if (!moduleLessons.includes(lessonRef.id)) {
			await updateDoc(moduleRef, {
				lessons: [...moduleLessons, lessonRef.id],
				updatedAt: serverTimestamp(),
			});
		}

		return NextResponse.json({ success: true, lessonId: lessonRef.id });
	} catch (err) {
		console.error('Lesson creation error:', err);
		return NextResponse.json({ error: 'Failed to create lesson', details: String(err) }, { status: 500 });
	}
}

// GET /api/lessons?moduleId=xxx - Get lessons for a module
export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const moduleId = searchParams.get('moduleId');

		if (!moduleId) {
			return NextResponse.json({ error: 'Module ID required' }, { status: 400 });
		}

		// Try to get lessons with orderBy, but fallback if index doesn't exist
		let snapshot;
		try {
			const lessonsQuery = query(
				collection(db, 'lesson'),
				where('moduleId', '==', moduleId),
				orderBy('order', 'asc')
			);
			snapshot = await getDocs(lessonsQuery);
		} catch (err) {
			// If orderBy fails (likely missing index), try without it
			if (err.code === 'failed-precondition' || err.message?.includes('index')) {
				console.warn('Firestore index may be missing, using fallback query');
				const fallbackQuery = query(
					collection(db, 'lesson'),
					where('moduleId', '==', moduleId)
				);
				snapshot = await getDocs(fallbackQuery);
			} else {
				throw err;
			}
		}

		const lessons = snapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data(),
		}));

		// Sort by order if not already sorted
		lessons.sort((a, b) => (a.order || 0) - (b.order || 0));

		return NextResponse.json({ lessons });
	} catch (err) {
		console.error('Error fetching lessons:', err);
		return NextResponse.json({ error: 'Failed to fetch lessons', details: String(err) }, { status: 500 });
	}
}

