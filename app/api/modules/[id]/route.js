import { NextResponse } from 'next/server';
import { doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// Helper function to get user role from cookies
function getRole(request) {
	const cookie = request.headers.get('cookie') || '';
	return cookie.match(/user_role=([^;]+)/)?.[1];
}

// Helper function to get user ID from cookies
function getUserId(request) {
	const cookie = request.headers.get('cookie') || '';
	const match = cookie.match(/user_id=([^;]+)/);
	if (!match) return null;
	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

// DELETE /api/modules/[id] - Delete a module and its lessons
export async function DELETE(request, { params }) {
	try {
		const { id: moduleId } = await params;

		if (!moduleId) {
			return NextResponse.json({ error: 'Module ID required' }, { status: 400 });
		}

		// Check authentication and authorization
		const role = getRole(request);
		const userId = getUserId(request);

		if (!role || !userId) {
			return NextResponse.json({ error: 'Unauthorized: Please sign in' }, { status: 401 });
		}

		if (role !== 'admin' && role !== 'teacher') {
			return NextResponse.json({ error: 'Forbidden: Only teachers and admins can delete modules' }, { status: 403 });
		}

		// Verify module exists
		const moduleRef = doc(db, 'module', moduleId);
		const moduleDoc = await getDoc(moduleRef);

		if (!moduleDoc.exists()) {
			return NextResponse.json({ error: 'Module not found' }, { status: 404 });
		}

		const moduleData = moduleDoc.data();
		const courseId = moduleData.courseId;

		// Check ownership: Teachers can only delete their own modules, admins can delete any
		if (role === 'teacher' && moduleData.createdBy) {
			const moduleCreatedBy = String(moduleData.createdBy).trim();
			const currentUserId = userId ? String(userId).trim() : null;
			if (moduleCreatedBy !== currentUserId) {
				return NextResponse.json({ 
					error: 'Forbidden: You can only delete modules you created' 
				}, { status: 403 });
			}
		}

		// Delete all lessons in this module
		if (moduleData.lessons && moduleData.lessons.length > 0) {
			for (const lessonId of moduleData.lessons) {
				try {
					await deleteDoc(doc(db, 'lesson', lessonId));
				} catch (err) {
					console.error(`Error deleting lesson ${lessonId}:`, err);
				}
			}
		}

		// Delete the module
		await deleteDoc(moduleRef);

		// Remove module from course (modules are course-specific)
		// This handles cases where the course was already deleted
		if (courseId) {
			try {
				const courseRef = doc(db, 'course', courseId);
				const courseDoc = await getDoc(courseRef);
				if (courseDoc.exists()) {
					const courseModules = courseDoc.data().modules || [];
					const updatedModules = courseModules.filter(id => id !== moduleId);
					
					await updateDoc(courseRef, {
						modules: updatedModules,
						updatedAt: serverTimestamp(),
					});
				}
				// If course doesn't exist, that's fine - just continue with module deletion
			} catch (courseErr) {
				// Log but don't fail - course might have been deleted already
				console.warn(`Course ${courseId} not found or error updating it:`, courseErr);
				// Continue with module deletion even if course update fails
			}
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Module deletion error:', err);
		return NextResponse.json({ error: 'Failed to delete module', details: String(err) }, { status: 500 });
	}
}

