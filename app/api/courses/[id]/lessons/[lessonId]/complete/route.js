import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// Helper to get user info from request
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

function getRole(request) {
	const cookie = request.headers.get('cookie') || '';
	return cookie.match(/user_role=([^;]+)/)?.[1];
}

// POST /api/courses/[id]/lessons/[lessonId]/complete - Mark lesson as complete
export async function POST(request, { params }) {
	try {
		const { id: courseId, lessonId } = await params;
		
		// Try to get userId from request body first, then from cookies
		const body = await request.json().catch(() => ({}));
		let userId = body.userId || getUserId(request);
		let role = body.role || getRole(request);

		// If still no userId, try to get from query params (fallback)
		if (!userId) {
			const { searchParams } = new URL(request.url);
			userId = searchParams.get('userId');
		}

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized: Please sign in' }, { status: 401 });
		}

		// If no role from body/cookie, try to get from Firestore
		if (!role) {
			try {
				const userDoc = await getDoc(doc(db, 'user', userId));
				if (userDoc.exists()) {
					role = userDoc.data().role;
				}
			} catch (err) {
				console.error('Error getting user role:', err);
			}
		}

		if (role !== 'student') {
			return NextResponse.json({ error: 'Only students can mark lessons as complete' }, { status: 403 });
		}

		// Check enrollment
		const enrollmentId = `${userId}_${courseId}`;
		const enrollmentRef = doc(db, 'enrollment', enrollmentId);
		const enrollmentDoc = await getDoc(enrollmentRef);

		if (!enrollmentDoc.exists()) {
			return NextResponse.json({ error: 'You must be enrolled in this course' }, { status: 403 });
		}

		// Verify lesson exists and belongs to course
		const lessonRef = doc(db, 'lesson', lessonId);
		const lessonDoc = await getDoc(lessonRef);

		if (!lessonDoc.exists()) {
			return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
		}

		const lessonData = lessonDoc.data();
		
		// Verify lesson belongs to a module in this course
		if (lessonData.moduleId) {
			const moduleRef = doc(db, 'module', lessonData.moduleId);
			const moduleDoc = await getDoc(moduleRef);
			
			if (moduleDoc.exists()) {
				const moduleData = moduleDoc.data();
				if (moduleData.courseId !== courseId) {
					return NextResponse.json({ error: 'Lesson does not belong to this course' }, { status: 400 });
				}
			}
		}

		// Get current enrollment data
		const enrollmentData = enrollmentDoc.data();
		const currentProgress = enrollmentData.progress || {
			completedModules: [],
			completedLessons: [],
			overallProgress: 0,
		};

		const completedLessons = currentProgress.completedLessons || [];
		const completedModules = currentProgress.completedModules || [];

		// Check if already completed
		const isAlreadyCompleted = completedLessons.includes(lessonId);
		
		// Toggle completion status
		let updatedCompletedLessons;
		if (isAlreadyCompleted) {
			// Remove from completed list
			updatedCompletedLessons = completedLessons.filter(id => id !== lessonId);
		} else {
			// Add to completed list
			updatedCompletedLessons = [...completedLessons, lessonId];
		}

		// Get course to calculate total lessons
		const courseRef = doc(db, 'course', courseId);
		const courseDoc = await getDoc(courseRef);
		
		if (!courseDoc.exists()) {
			return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		}

		const courseData = courseDoc.data();
		const moduleIds = courseData.modules || [];

		// Calculate total lessons in course
		let totalLessons = 0;
		for (const moduleId of moduleIds) {
			try {
				const moduleRef = doc(db, 'module', moduleId);
				const moduleDoc = await getDoc(moduleRef);
				if (moduleDoc.exists()) {
					const moduleData = moduleDoc.data();
					if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
						totalLessons += moduleData.lessons.length;
					}
				}
			} catch (err) {
				console.error(`Error loading module ${moduleId}:`, err);
			}
		}

		// Calculate overall progress
		const overallProgress = totalLessons > 0 
			? Math.round((updatedCompletedLessons.length / totalLessons) * 100)
			: 0;

		// Check if module is completed (all lessons in module are completed)
		if (lessonData.moduleId) {
			try {
				const moduleRef = doc(db, 'module', lessonData.moduleId);
				const moduleDoc = await getDoc(moduleRef);
				
				if (moduleDoc.exists()) {
					const moduleData = moduleDoc.data();
					const moduleLessonIds = moduleData.lessons || [];
					
					// Check if all lessons in module are completed
					const allModuleLessonsCompleted = moduleLessonIds.every(id => 
						updatedCompletedLessons.includes(id)
					);
					
					let updatedCompletedModules = [...completedModules];
					
					if (allModuleLessonsCompleted && !completedModules.includes(lessonData.moduleId)) {
						// Add module to completed list
						updatedCompletedModules.push(lessonData.moduleId);
					} else if (!allModuleLessonsCompleted && completedModules.includes(lessonData.moduleId)) {
						// Remove module from completed list
						updatedCompletedModules = updatedCompletedModules.filter(id => id !== lessonData.moduleId);
					}

					// Update enrollment with new progress
					await updateDoc(enrollmentRef, {
						progress: {
							completedModules: updatedCompletedModules,
							completedLessons: updatedCompletedLessons,
							overallProgress,
						},
						updatedAt: serverTimestamp(),
					});

					return NextResponse.json({
						success: true,
						completed: !isAlreadyCompleted,
						progress: {
							completedModules: updatedCompletedModules,
							completedLessons: updatedCompletedLessons,
							overallProgress,
						},
					});
				}
			} catch (err) {
				console.error('Error checking module completion:', err);
			}
		}

		// Update enrollment with new progress (fallback if module check fails)
		await updateDoc(enrollmentRef, {
			progress: {
				completedModules,
				completedLessons: updatedCompletedLessons,
				overallProgress,
			},
			updatedAt: serverTimestamp(),
		});

		return NextResponse.json({
			success: true,
			completed: !isAlreadyCompleted,
			progress: {
				completedModules,
				completedLessons: updatedCompletedLessons,
				overallProgress,
			},
		});
	} catch (err) {
		console.error('Error marking lesson as complete:', err);
		return NextResponse.json({ 
			error: 'Failed to update lesson completion', 
			details: String(err) 
		}, { status: 500 });
	}
}

// GET /api/courses/[id]/lessons/[lessonId]/complete - Check if lesson is completed
export async function GET(request, { params }) {
	try {
		const { id: courseId, lessonId } = await params;
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');

		if (!userId) {
			return NextResponse.json({ error: 'User ID required' }, { status: 400 });
		}

		// Check enrollment
		const enrollmentId = `${userId}_${courseId}`;
		const enrollmentRef = doc(db, 'enrollment', enrollmentId);
		const enrollmentDoc = await getDoc(enrollmentRef);

		if (!enrollmentDoc.exists()) {
			return NextResponse.json({ completed: false, enrolled: false });
		}

		const enrollmentData = enrollmentDoc.data();
		const completedLessons = enrollmentData.progress?.completedLessons || [];
		const completed = completedLessons.includes(lessonId);

		return NextResponse.json({ 
			completed,
			enrolled: true,
			progress: enrollmentData.progress || {
				completedModules: [],
				completedLessons: [],
				overallProgress: 0,
			},
		});
	} catch (err) {
		console.error('Error checking lesson completion:', err);
		return NextResponse.json({ 
			error: 'Failed to check lesson completion', 
			details: String(err) 
		}, { status: 500 });
	}
}

