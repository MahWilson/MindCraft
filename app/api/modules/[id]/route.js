import { NextResponse } from 'next/server';
import { doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// DELETE /api/modules/[id] - Delete a module and its lessons
export async function DELETE(request, { params }) {
	try {
		const { id: moduleId } = await params;

		if (!moduleId) {
			return NextResponse.json({ error: 'Module ID required' }, { status: 400 });
		}

		// Verify module exists
		const moduleRef = doc(db, 'modules', moduleId);
		const moduleDoc = await getDoc(moduleRef);

		if (!moduleDoc.exists()) {
			return NextResponse.json({ error: 'Module not found' }, { status: 404 });
		}

		const moduleData = moduleDoc.data();
		const courseId = moduleData.courseId;

		// Delete all lessons in this module
		if (moduleData.lessons && moduleData.lessons.length > 0) {
			for (const lessonId of moduleData.lessons) {
				try {
					await deleteDoc(doc(db, 'lessons', lessonId));
				} catch (err) {
					console.error(`Error deleting lesson ${lessonId}:`, err);
				}
			}
		}

		// Delete the module
		await deleteDoc(moduleRef);

		// Remove module from course
		if (courseId) {
			const courseRef = doc(db, 'courses', courseId);
			const courseDoc = await getDoc(courseRef);
			if (courseDoc.exists()) {
				const courseModules = courseDoc.data().modules || [];
				const updatedModules = courseModules.filter(id => id !== moduleId);
				
				await updateDoc(courseRef, {
					modules: updatedModules,
					updatedAt: serverTimestamp(),
				});
			}
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Module deletion error:', err);
		return NextResponse.json({ error: 'Failed to delete module', details: String(err) }, { status: 500 });
	}
}

