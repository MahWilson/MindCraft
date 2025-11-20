'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
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

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
				// Get user role
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					setRole(userDoc.data().role);
					if (userDoc.data().role === 'student') {
						// Check enrollment
						try {
							const response = await fetch(`/api/courses/${courseId}/enroll?studentId=${user.uid}`);
							const data = await response.json();
							setIsEnrolled(data.enrolled || false);
						} catch (err) {
							console.error('Error checking enrollment:', err);
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
				const courseDoc = await getDoc(doc(db, 'courses', courseId));
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
								const moduleDoc = await getDoc(doc(db, 'modules', moduleId));
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
										collection(db, 'lessons'),
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
												const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
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
		try {
			const response = await fetch(`/api/courses/${courseId}/enroll`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ studentId: userId }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to enroll');
			}

			setIsEnrolled(true);
		} catch (err) {
			setError(err.message || 'Failed to enroll');
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

	if (error || !course) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error || 'Course not found'}</p>
				</CardContent>
			</Card>
		);
	}

	const isStudent = role === 'student';
	const canEnroll = isStudent && !isEnrolled && course.status === 'published';

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
						<span className="px-4 py-2 rounded-lg bg-success/10 text-success text-caption font-medium flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4" />
							Enrolled
						</span>
					)}
				</div>
			</div>

			{/* Modules & Lessons Structure */}
			{modules.length > 0 ? (
				<div className="space-y-6">
					<h2 className="text-h2 text-neutralDark">Course Content</h2>
					{modules.map((module, moduleIndex) => {
						const moduleLessons = lessons[module.id] || [];
						const isModuleLocked = isStudent && !isEnrolled && moduleIndex > 0;
						
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
												const isLessonLocked = isModuleLocked || (isStudent && !isEnrolled);
												
												return (
													<Link
														key={lesson.id}
														href={isLessonLocked ? '#' : `/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
														className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
															isLessonLocked
																? 'border-border bg-neutralLight cursor-not-allowed opacity-60'
																: 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
														}`}
													>
														{isLessonLocked ? (
															<Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
														) : (
															<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-caption font-medium flex-shrink-0">
																{lessonIndex + 1}
															</div>
														)}
														<div className="flex-1 min-w-0">
															<h4 className="text-body font-medium text-neutralDark">{lesson.title}</h4>
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

