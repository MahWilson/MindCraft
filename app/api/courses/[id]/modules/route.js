import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// POST /api/courses/[id]/modules - Add an existing module to a course
export async function POST(request, { params }) {
	try {
		const { id: courseId } = await params;
		const { moduleId } = await request.json();

		if (!moduleId) {
			return NextResponse.json({ error: 'Module ID required' }, { status: 400 });
		}

		// Verify course exists
		const courseRef = doc(db, 'course', courseId);
		const courseDoc = await getDoc(courseRef);

		if (!courseDoc.exists()) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		// Verify module exists
		const moduleRef = doc(db, 'module', moduleId);
		const moduleDoc = await getDoc(moduleRef);

		if (!moduleDoc.exists()) {
			return NextResponse.json({ error: 'Module not found' }, { status: 404 });
		}

		// Add module to course
		const courseModules = courseDoc.data().modules || [];
		if (!courseModules.includes(moduleId)) {
			await updateDoc(courseRef, {
				modules: [...courseModules, moduleId],
				updatedAt: serverTimestamp(),
			});
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Error adding module to course:', err);
		return NextResponse.json({ error: 'Failed to add module to course', details: String(err) }, { status: 500 });
	}
}

// DELETE /api/courses/[id]/modules?moduleId=xxx - Remove a module from a course
export async function DELETE(request, { params }) {
	try {
		const { id: courseId } = await params;
		const { searchParams } = new URL(request.url);
		const moduleId = searchParams.get('moduleId');

		if (!moduleId) {
			return NextResponse.json({ error: 'Module ID required' }, { status: 400 });
		}

		// Verify course exists
		const courseRef = doc(db, 'course', courseId);
		const courseDoc = await getDoc(courseRef);

		if (!courseDoc.exists()) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		// Remove module from course (but don't delete the module itself)
		const courseModules = courseDoc.data().modules || [];
		const updatedModules = courseModules.filter(id => id !== moduleId);

		await updateDoc(courseRef, {
			modules: updatedModules,
			updatedAt: serverTimestamp(),
		});

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Error removing module from course:', err);
		return NextResponse.json({ error: 'Failed to remove module from course', details: String(err) }, { status: 500 });
	}
}

