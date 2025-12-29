'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, PlayCircle, CheckCircle2, Lock, ChevronRight, User, Clock, X } from 'lucide-react';
import Link from 'next/link';

export default function CourseDetailPage() {
	const params = useParams();
	const router = useRouter();
	const courseId = params.id;
	
	const [course, setCourse] = useState(null);
	const [modules, setModules] = useState([]);
	const [lessons, setLessons] = useState({}); // moduleId -> lessons[]
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [userId, setUserId] = useState(null);
	const [role, setRole] = useState(null);
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [enrollmentLoading, setEnrollmentLoading] = useState(true);
	const [enrollment, setEnrollment] = useState(null); // Store full enrollment data for progress
	const [completedLessons, setCompletedLessons] = useState(new Set()); // Track completed lessons
	const [lastAccessedLesson, setLastAccessedLesson] = useState(null); // Track last accessed lesson

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
				// Get user role
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					setRole(userDoc.data().role);
					if (userDoc.data().role === 'student') {
						// Check enrollment and get progress
						try {
							const enrollmentId = `${user.uid}_${courseId}`;
							const enrollmentRef = doc(db, 'enrollment', enrollmentId);
							const enrollmentDoc = await getDoc(enrollmentRef);
							
							if (enrollmentDoc.exists()) {
								const enrollmentData = enrollmentDoc.data();
								setIsEnrolled(true);
								setEnrollment(enrollmentData);
								
								// Track completed lessons
								const completed = enrollmentData.progress?.completedLessons || [];
								setCompletedLessons(new Set(completed));
								
								// Find last accessed lesson (first incomplete lesson, or last completed)
								if (completed.length > 0 && modules.length > 0) {
									// This will be updated after modules are loaded
								}
							} else {
								setIsEnrolled(false);
								setEnrollment(null);
							}
						} catch (err) {
							console.error('Error checking enrollment:', err);
							setIsEnrolled(false);
						}
					}
				}
			}
			setEnrollmentLoading(false);
		});

		return () => unsubscribe();
	}, [courseId]);

	useEffect(() => {
		async function loadCourse() {
			try {
				// Load course
				const courseDoc = await getDoc(doc(db, 'course', courseId));
				if (!courseDoc.exists()) {
					setError('Course not found');
					setLoading(false);
					return;
				}

				const courseData = { id: courseDoc.id, ...courseDoc.data() };
				setCourse(courseData);

				// Load modules if they exist - fetch directly from Firestore (client-side with auth)
				if (courseData.modules && courseData.modules.length > 0) {
					try {
						// Fetch modules directly from Firestore
						const { getDoc } = await import('firebase/firestore');
						const loadedModules = [];
						
						for (const moduleId of courseData.modules) {
							try {
								const moduleDoc = await getDoc(doc(db, 'module', moduleId));
								if (moduleDoc.exists()) {
									loadedModules.push({
										id: moduleDoc.id,
										...moduleDoc.data(),
									});
								}
							} catch (moduleErr) {
								console.error(`Error loading module ${moduleId}:`, moduleErr);
							}
						}
						
						// Sort by order
						loadedModules.sort((a, b) => (a.order || 0) - (b.order || 0));
						setModules(loadedModules);
						
						// Load lessons for each module
						const lessonsMap = {};
						for (const module of loadedModules) {
							if (module.lessons && module.lessons.length > 0) {
								try {
									const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
									const lessonsQuery = query(
										collection(db, 'lesson'),
										where('moduleId', '==', module.id),
										orderBy('order', 'asc')
									);
									const lessonsSnapshot = await getDocs(lessonsQuery);
									const loadedLessons = lessonsSnapshot.docs.map(doc => ({
										id: doc.id,
										...doc.data(),
									}));
									lessonsMap[module.id] = loadedLessons;
								} catch (lessonErr) {
									console.error(`Error loading lessons for module ${module.id}:`, lessonErr);
									// Fallback: try to load from module.lessons array
									if (module.lessons && module.lessons.length > 0) {
										const { getDoc } = await import('firebase/firestore');
										const fallbackLessons = [];
										for (const lessonId of module.lessons) {
											try {
												const lessonDoc = await getDoc(doc(db, 'lesson', lessonId));
												if (lessonDoc.exists()) {
													fallbackLessons.push({
														id: lessonDoc.id,
														...lessonDoc.data(),
													});
												}
											} catch (err) {
												console.error(`Error loading lesson ${lessonId}:`, err);
											}
										}
										fallbackLessons.sort((a, b) => (a.order || 0) - (b.order || 0));
										lessonsMap[module.id] = fallbackLessons;
									}
								}
							}
						}
						setLessons(lessonsMap);
					} catch (err) {
						console.error('Error loading modules:', err);
						// Set empty modules array so it shows the empty state
						setModules([]);
					}
				}
			} catch (err) {
				console.error('Error loading course:', err);
				setError('Failed to load course');
			} finally {
				setLoading(false);
			}
		}

		if (courseId) {
			loadCourse();
		}
	}, [courseId]);

	// Update last accessed lesson when enrollment or lessons change
	useEffect(() => {
		if (isEnrolled && enrollment && modules.length > 0 && Object.keys(lessons).length > 0) {
			findLastAccessedLesson(modules, lessons, enrollment);
		}
	}, [isEnrolled, enrollment, modules, lessons]);

	// Find the last accessed lesson (first incomplete lesson, or last completed lesson)
	function findLastAccessedLesson(loadedModules, lessonsMap, enrollmentData) {
		const completed = new Set(enrollmentData.progress?.completedLessons || []);
		
		// Find first incomplete lesson
		for (const module of loadedModules) {
			const moduleLessons = lessonsMap[module.id] || [];
			for (const lesson of moduleLessons) {
				if (!completed.has(lesson.id)) {
					setLastAccessedLesson({
						moduleId: module.id,
						moduleTitle: module.title,
						lessonId: lesson.id,
						lessonTitle: lesson.title,
					});
					return;
				}
			}
		}
		
		// If all lessons completed, find the last completed lesson
		if (completed.size > 0) {
			for (let i = loadedModules.length - 1; i >= 0; i--) {
				const module = loadedModules[i];
				const moduleLessons = lessonsMap[module.id] || [];
				for (let j = moduleLessons.length - 1; j >= 0; j--) {
					const lesson = moduleLessons[j];
					if (completed.has(lesson.id)) {
						setLastAccessedLesson({
							moduleId: module.id,
							moduleTitle: module.title,
							lessonId: lesson.id,
							lessonTitle: lesson.title,
						});
						return;
					}
				}
			}
		}
		
		// If no lessons completed, set first lesson
		if (loadedModules.length > 0) {
			const firstModule = loadedModules[0];
			const firstModuleLessons = lessonsMap[firstModule.id] || [];
			if (firstModuleLessons.length > 0) {
				const firstLesson = firstModuleLessons[0];
				setLastAccessedLesson({
					moduleId: firstModule.id,
					moduleTitle: firstModule.title,
					lessonId: firstLesson.id,
					lessonTitle: firstLesson.title,
				});
			}
		}
	}

	async function handleEnroll() {
		if (!userId) {
			router.push('/login');
			return;
		}

		setLoading(true);
		setError('');
		try {
			// Use client-side Firestore to create enrollment (has auth context)
			const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
			
			// Check if already enrolled
			const enrollmentId = `${userId}_${courseId}`;
			const enrollmentRef = doc(db, 'enrollment', enrollmentId);
			const enrollmentDoc = await getDoc(enrollmentRef);
			
			if (enrollmentDoc.exists()) {
				setError('You are already enrolled in this course');
				setIsEnrolled(true);
				setLoading(false);
				return;
			}

			// Verify course is published
			if (course.status !== 'published') {
				setError('Cannot enroll in unpublished course');
				setLoading(false);
				return;
			}

			// Create enrollment (client-side has auth context)
			await setDoc(enrollmentRef, {
				studentId: userId,
				courseId: courseId,
				enrolledAt: serverTimestamp(),
				progress: {
					completedModules: [],
					completedLessons: [],
					overallProgress: 0,
				},
			});

			setIsEnrolled(true);
			// Reload the page to show enrolled status
			window.location.reload();
		} catch (err) {
			console.error('Enrollment error:', err);
			setError(err.message || 'Failed to enroll. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	async function handleUnenroll() {
		if (!confirm(`Are you sure you want to unenroll from "${course.title}"? Your progress will be lost.`)) {
			return;
		}

		setLoading(true);
		setError('');
		try {
			const { doc, deleteDoc } = await import('firebase/firestore');
			const enrollmentId = `${userId}_${courseId}`;
			const enrollmentRef = doc(db, 'enrollment', enrollmentId);
			await deleteDoc(enrollmentRef);
			
			setIsEnrolled(false);
			setEnrollment(null);
			setCompletedLessons(new Set());
			// Reload the page to update the UI
			window.location.reload();
		} catch (err) {
			console.error('Unenrollment error:', err);
			setError(err.message || 'Failed to unenroll. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	if (loading || enrollmentLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading course...</p>
			</div>
		);
	}

	if (!course) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">Course not found</p>
				</CardContent>
			</Card>
		);
	}

	const isStudent = role === 'student';
	const canEnroll = isStudent && !isEnrolled && course.status === 'published';
	
	// Calculate overall progress for enrolled students
	const overallProgress = enrollment?.progress?.overallProgress || 0;
	const totalLessons = Object.values(lessons).reduce((sum, moduleLessons) => sum + moduleLessons.length, 0);
	const completedCount = completedLessons.size;

	return (
		<div className="space-y-8">
			{/* Course Header */}
			<div>
				<div className="flex items-center gap-3 mb-4">
					<Link href="/courses">
						<Button variant="ghost" size="sm">← Back to Courses</Button>
					</Link>
				</div>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<h1 className="text-h1 text-neutralDark mb-2">{course.title}</h1>
						<p className="text-body text-muted-foreground mb-4">{course.description || 'No description'}</p>
						<div className="flex items-center gap-4 text-caption text-muted-foreground">
							<div className="flex items-center gap-2">
								<User className="h-4 w-4" />
								<span>By: {course.authorName || 'Unknown'}</span>
							</div>
							{course.modules && (
								<div className="flex items-center gap-2">
									<BookOpen className="h-4 w-4" />
									<span>{course.modules.length} {course.modules.length === 1 ? 'Module' : 'Modules'}</span>
								</div>
							)}
						</div>
					</div>
					{canEnroll && (
						<Button onClick={handleEnroll} size="lg" disabled={loading}>
							{loading ? 'Enrolling...' : 'Enroll in Course'}
						</Button>
					)}
					{isEnrolled && (
						<div className="flex flex-col items-end gap-2">
							<div className="flex items-center gap-3">
								<span className="px-4 py-2 rounded-lg bg-success/10 text-success text-caption font-medium flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4" />
									Enrolled
								</span>
								{lastAccessedLesson && (
									<Link href={`/courses/${courseId}/modules/${lastAccessedLesson.moduleId}/lessons/${lastAccessedLesson.lessonId}`}>
										<Button size="lg" className="flex items-center gap-2">
											<PlayCircle className="h-4 w-4" />
											Continue Learning
										</Button>
									</Link>
								)}
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleUnenroll}
								disabled={loading}
								className="text-error hover:text-error hover:bg-error/10"
							>
								<X className="h-4 w-4 mr-2" />
								{loading ? 'Unenrolling...' : 'Unenroll'}
							</Button>
						</div>
					)}
				</div>
				{error && (
					<div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}
				
				{/* Progress Bar for Enrolled Students */}
				{isEnrolled && enrollment && totalLessons > 0 && (
					<div className="mt-4 space-y-2">
						<div className="flex items-center justify-between text-caption">
							<span className="text-muted-foreground">Course Progress</span>
							<span className="font-medium text-neutralDark">{overallProgress}%</span>
						</div>
						<div className="w-full h-2 bg-muted rounded-full overflow-hidden">
							<div 
								className="h-full bg-primary transition-all duration-300"
								style={{ width: `${overallProgress}%` }}
							></div>
						</div>
						<p className="text-caption text-muted-foreground">
							{completedCount} of {totalLessons} lessons completed
						</p>
					</div>
				)}
			</div>

			{/* Modules & Lessons Structure */}
			{modules.length > 0 ? (
				<div className="space-y-6">
					<h2 className="text-h2 text-neutralDark">Course Content</h2>
					{modules.map((module, moduleIndex) => {
						const moduleLessons = lessons[module.id] || [];
						// Fix: All modules should be locked if student is not enrolled
						// Only allow viewing course structure, not accessing lessons
						const isModuleLocked = isStudent && !isEnrolled;
						
						return (
							<Card key={module.id} className={isModuleLocked ? 'opacity-60' : ''}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											{isModuleLocked ? (
												<Lock className="h-5 w-5 text-muted-foreground" />
											) : (
												<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-body font-semibold">
													{moduleIndex + 1}
												</div>
											)}
											<div>
												<CardTitle className="text-h3">{module.title}</CardTitle>
												{moduleLessons.length > 0 && (
													<CardDescription className="mt-1">
														{moduleLessons.length} {moduleLessons.length === 1 ? 'lesson' : 'lessons'}
													</CardDescription>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									{moduleLessons.length > 0 ? (
										<div className="space-y-2">
											{moduleLessons.map((lesson, lessonIndex) => {
												// Fix: Lesson is locked if student is not enrolled
												const isLessonLocked = isStudent && !isEnrolled;
												const isCompleted = isEnrolled && completedLessons.has(lesson.id);
												
												return (
													<Link
														key={lesson.id}
														href={isLessonLocked ? '#' : `/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
														className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
															isLessonLocked
																? 'border-border bg-neutralLight cursor-not-allowed opacity-60'
																: isCompleted
																? 'border-success/30 bg-success/5 hover:border-success/50 cursor-pointer'
																: 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
														}`}
													>
														{isLessonLocked ? (
															<Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
														) : isCompleted ? (
															<CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
														) : (
															<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-caption font-medium flex-shrink-0">
																{lessonIndex + 1}
															</div>
														)}
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<h4 className="text-body font-medium text-neutralDark">{lesson.title}</h4>
																{isCompleted && (
																	<span className="text-caption text-success font-medium">Completed</span>
																)}
															</div>
															{lesson.contentHtml && (
																<p className="text-caption text-muted-foreground mt-1 line-clamp-1">
																	{lesson.contentHtml.replace(/<[^>]*>/g, '').substring(0, 60)}...
																</p>
															)}
														</div>
														{!isLessonLocked && (
															<ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
														)}
													</Link>
												);
											})}
										</div>
									) : (
										<p className="text-body text-muted-foreground py-4 text-center">
											No lessons in this module yet
										</p>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-8">
							<BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-body text-muted-foreground mb-4">
								This course doesn't have any modules or lessons yet.
							</p>
							{(role === 'teacher' || role === 'admin') && course.createdBy === userId && (
								<Link href={`/dashboard/courses/${courseId}/edit`}>
									<Button>Add Modules & Lessons</Button>
								</Link>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

