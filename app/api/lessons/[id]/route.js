import { NextResponse } from 'next/server';
import { doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// DELETE /api/lessons/[id] - Delete a lesson
export async function DELETE(request, { params }) {
	try {
		const { id: lessonId } = await params;

		if (!lessonId) {
			return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
		}

		// Verify lesson exists
		const lessonRef = doc(db, 'lesson', lessonId);
		const lessonDoc = await getDoc(lessonRef);

		if (!lessonDoc.exists()) {
			return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
		}

		const lessonData = lessonDoc.data();
		const moduleId = lessonData.moduleId;

		// Delete the lesson
		await deleteDoc(lessonRef);

		// Remove lesson from module
		if (moduleId) {
			const moduleRef = doc(db, 'module', moduleId);
			const moduleDoc = await getDoc(moduleRef);
			if (moduleDoc.exists()) {
				const moduleLessons = moduleDoc.data().lessons || [];
				const updatedLessons = moduleLessons.filter(id => id !== lessonId);
				
				await updateDoc(moduleRef, {
					lessons: updatedLessons,
					updatedAt: serverTimestamp(),
				});
			}
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Lesson deletion error:', err);
		return NextResponse.json({ error: 'Failed to delete lesson', details: String(err) }, { status: 500 });
	}
}

