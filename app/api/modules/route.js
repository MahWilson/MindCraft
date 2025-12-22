import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

// POST /api/modules - Create a new module (courseId required - modules are course-specific)
export async function POST(request) {
	try {
		const { title, order, courseId } = await request.json();

		if (!title) {
			return NextResponse.json({ error: 'Title required' }, { status: 400 });
		}

		if (!courseId) {
			return NextResponse.json({ error: 'Course ID required - modules must belong to a course' }, { status: 400 });
		}

		// Verify course exists
		const courseRef = doc(db, 'course', courseId);
		const courseDoc = await getDoc(courseRef);

		if (!courseDoc.exists()) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		// Create module with courseId (modules are course-specific)
		const moduleData = {
			title: title.trim(),
			order: order || 0,
			lessons: [],
			courseId: courseId, // Module belongs to this course
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const moduleRef = await addDoc(collection(db, 'module'), moduleData);

		// Link module to course
		const courseModules = courseDoc.data().modules || [];
		if (!courseModules.includes(moduleRef.id)) {
			await updateDoc(courseRef, {
				modules: [...courseModules, moduleRef.id],
				updatedAt: serverTimestamp(),
			});
		}

		return NextResponse.json({ success: true, moduleId: moduleRef.id });
	} catch (err) {
		console.error('Module creation error:', err);
		return NextResponse.json({ error: 'Failed to create module', details: String(err) }, { status: 500 });
	}
}

// GET /api/modules?courseId=xxx - Get modules for a course (courseId required)
export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const courseId = searchParams.get('courseId');

		if (!courseId) {
			return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
		}

		// Get modules for a specific course
		const courseRef = doc(db, 'course', courseId);
		const courseDoc = await getDoc(courseRef);

		if (!courseDoc.exists()) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		const moduleIds = courseDoc.data().modules || [];
		
		if (moduleIds.length === 0) {
			return NextResponse.json({ modules: [] });
		}

		// Fetch module details
		const modules = [];
		for (const moduleId of moduleIds) {
			const moduleDoc = await getDoc(doc(db, 'module', moduleId));
			if (moduleDoc.exists()) {
				modules.push({
					id: moduleDoc.id,
					...moduleDoc.data(),
				});
			}
		}

		// Sort by order
		modules.sort((a, b) => (a.order || 0) - (b.order || 0));

		return NextResponse.json({ modules });
	} catch (err) {
		console.error('Error fetching modules:', err);
		return NextResponse.json({ error: 'Failed to fetch modules', details: String(err) }, { status: 500 });
	}
}
