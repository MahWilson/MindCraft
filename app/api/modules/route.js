import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

// POST /api/modules - Create a new independent module (no courseId required)
export async function POST(request) {
	try {
		const { title, order, courseId } = await request.json();

		if (!title) {
			return NextResponse.json({ error: 'Title required' }, { status: 400 });
		}

		// Create independent module (courseId is optional for linking later)
		const moduleData = {
			title: title.trim(),
			order: order || 0,
			lessons: [],
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const moduleRef = await addDoc(collection(db, 'module'), moduleData);

		// If courseId is provided, link the module to the course
		if (courseId) {
			const courseRef = doc(db, 'course', courseId);
			const courseDoc = await getDoc(courseRef);

			if (courseDoc.exists()) {
				const courseModules = courseDoc.data().modules || [];
				if (!courseModules.includes(moduleRef.id)) {
					await updateDoc(courseRef, {
						modules: [...courseModules, moduleRef.id],
						updatedAt: serverTimestamp(),
					});
				}
			}
		}

		return NextResponse.json({ success: true, moduleId: moduleRef.id });
	} catch (err) {
		console.error('Module creation error:', err);
		return NextResponse.json({ error: 'Failed to create module', details: String(err) }, { status: 500 });
	}
}

// GET /api/modules?courseId=xxx - Get modules for a course
// GET /api/modules - Get all modules (for module library)
export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const courseId = searchParams.get('courseId');

		if (courseId) {
			// Get modules linked to a specific course
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
		} else {
			// Get all modules (for module library)
			const modulesQuery = query(
				collection(db, 'module'),
				orderBy('createdAt', 'desc')
			);

			const snapshot = await getDocs(modulesQuery);
			const modules = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			return NextResponse.json({ modules });
		}
	} catch (err) {
		console.error('Error fetching modules:', err);
		return NextResponse.json({ error: 'Failed to fetch modules', details: String(err) }, { status: 500 });
	}
}
