'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, PlayCircle, CheckCircle2, Lock, ChevronRight, User, Clock } from 'lucide-react';
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
	const [enrollmentProgress, setEnrollmentProgress] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
				// Get user role
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const userRole = userDoc.data().role;
					setRole(userRole);
					if (userRole === 'student' && courseId) {
						// Check enrollment directly from Firestore (more reliable than API)
						try {
							const enrollmentId = `${user.uid}_${courseId}`;
							const enrollmentRef = doc(db, 'enrollment', enrollmentId);
							const enrollmentDoc = await getDoc(enrollmentRef);
							const enrolled = enrollmentDoc.exists();
							setIsEnrolled(enrolled);
							
							// Load enrollment progress
							if (enrolled && enrollmentDoc.exists()) {
								const enrollmentData = enrollmentDoc.data();
								setEnrollmentProgress(enrollmentData.progress || {
									completedModules: [],
									completedLessons: [],
									overallProgress: 0,
								});
							}
							
							console.log('Enrollment check:', { enrollmentId, enrolled, courseId, userId: user.uid });
						} catch (err) {
							console.error('Error checking enrollment:', err);
							setIsEnrolled(false);
						}
					} else if (userRole === 'teacher' || userRole === 'admin') {
						// Teachers and admins have access to all courses
						setIsEnrolled(true);
					} else {
						setIsEnrolled(false);
					}
				} else {
					setIsEnrolled(false);
				}
			} else {
				setUserId(null);
				setRole(null);
				setIsEnrolled(false);
			}
			setEnrollmentLoading(false);
		});

		return () => unsubscribe();
	}, [courseId]);

	// Listen for enrollment progress updates
	useEffect(() => {
		if (!userId || !courseId || role !== 'student') return;

		const enrollmentId = `${userId}_${courseId}`;
		const enrollmentRef = doc(db, 'enrollment', enrollmentId);

		// Use onSnapshot for real-time updates
		const unsubscribe = onSnapshot(enrollmentRef, (doc) => {
			if (doc.exists()) {
				const enrollmentData = doc.data();
				setEnrollmentProgress(enrollmentData.progress || {
					completedModules: [],
					completedLessons: [],
					overallProgress: 0,
				});
			}
		}, (err) => {
			console.error('Error listening to enrollment:', err);
		});

		return () => unsubscribe();
	}, [userId, courseId, role]);

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
			// State is already updated, no need to reload
		} catch (err) {
			console.error('Enrollment error:', err);
			setError(err.message || 'Failed to enroll. Please try again.');
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

	return (
		<div className="space-y-8">
			{/* Course Header */}
			<div className="bg-gradient-to-br from-primary/5 via-background to-background rounded-xl p-6 border border-primary/10">
				<div className="flex items-center gap-3 mb-4">
					<Link href="/courses">
						<Button variant="ghost" size="sm" className="hover:bg-primary/10">
							← Back to Courses
						</Button>
					</Link>
				</div>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<h1 className="text-h1 text-neutralDark mb-3 font-bold">{course.title}</h1>
						<p className="text-body text-muted-foreground mb-5 leading-relaxed">{course.description || 'No description'}</p>
						<div className="flex items-center gap-6 text-caption text-muted-foreground">
							<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border">
								<User className="h-4 w-4" />
								<span className="font-medium">By: {course.authorName || 'Unknown'}</span>
							</div>
							{course.modules && (
								<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border">
									<BookOpen className="h-4 w-4" />
									<span className="font-medium">{course.modules.length} {course.modules.length === 1 ? 'Module' : 'Modules'}</span>
								</div>
							)}
						</div>
					</div>
					{canEnroll && (
						<Button onClick={handleEnroll} size="lg" disabled={loading} className="shadow-md hover:shadow-lg transition-shadow">
							{loading ? 'Enrolling...' : 'Enroll in Course'}
						</Button>
					)}
					{isEnrolled && (
						<span className="px-5 py-2.5 rounded-lg bg-success/10 text-success text-body font-semibold flex items-center gap-2 border border-success/20 shadow-sm">
							<CheckCircle2 className="h-5 w-5" />
							Enrolled
						</span>
					)}
				</div>
				{error && (
					<div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}
			</div>

			{/* Modules & Lessons Structure */}
			{modules.length > 0 ? (
				<div className="space-y-6">
					<div className="flex items-center gap-3 mb-2">
						<BookOpen className="h-6 w-6 text-primary" />
						<h2 className="text-h2 text-neutralDark font-bold">Course Content</h2>
					</div>
					{modules.map((module, moduleIndex) => {
						const moduleLessons = lessons[module.id] || [];
						const isModuleLocked = isStudent && !isEnrolled && moduleIndex > 0;
						
						// Calculate completion progress for this module
						let completedCount = 0;
						if (isStudent && isEnrolled && enrollmentProgress && moduleLessons.length > 0) {
							const completedLessons = enrollmentProgress.completedLessons || [];
							completedCount = moduleLessons.filter(lesson => completedLessons.includes(lesson.id)).length;
						}
						
						return (
							<Card key={module.id} className={`relative ${isModuleLocked ? 'opacity-60' : ''} transition-all duration-200 hover:shadow-lg`}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3 flex-1">
											{isModuleLocked ? (
												<Lock className="h-5 w-5 text-muted-foreground" />
											) : (
												<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white text-body font-semibold shadow-md">
													{moduleIndex + 1}
												</div>
											)}
											<div className="flex-1">
												<CardTitle className="text-h3">{module.title}</CardTitle>
												{moduleLessons.length > 0 && (
													<CardDescription className="mt-1">
														{moduleLessons.length} {moduleLessons.length === 1 ? 'lesson' : 'lessons'}
													</CardDescription>
												)}
											</div>
										</div>
										{/* Progress Badge */}
										{isStudent && isEnrolled && moduleLessons.length > 0 && (
											<div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
												<span className="text-body font-semibold text-primary">
													{completedCount} of {moduleLessons.length} complete
												</span>
											</div>
										)}
									</div>
								</CardHeader>
								<CardContent>
									{moduleLessons.length > 0 ? (
										<div className="space-y-2">
											{moduleLessons.map((lesson, lessonIndex) => {
												const isLessonLocked = isModuleLocked || (isStudent && !isEnrolled);
												const isLessonCompleted = isStudent && isEnrolled && enrollmentProgress && 
													(enrollmentProgress.completedLessons || []).includes(lesson.id);
												
												return (
													<Link
														key={lesson.id}
														href={isLessonLocked ? '#' : `/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
														className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 ${
															isLessonLocked
																? 'border-border bg-neutralLight cursor-not-allowed opacity-60'
																: isLessonCompleted
																? 'border-success/30 bg-success/5 hover:border-success/50 hover:bg-success/10 cursor-pointer'
																: 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
														}`}
													>
														{isLessonLocked ? (
															<Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
														) : isLessonCompleted ? (
															<CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
														) : (
															<div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-caption font-semibold flex-shrink-0">
																{lessonIndex + 1}
															</div>
														)}
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<h4 className="text-body font-medium text-neutralDark">{lesson.title}</h4>
																{isLessonCompleted && (
																	<span className="px-2 py-0.5 rounded text-caption font-medium bg-success/20 text-success">
																		Completed
																	</span>
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

