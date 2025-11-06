'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Search, PlayCircle } from 'lucide-react';
import { ProgressBar } from '@tremor/react';

function getUserRole() {
	if (typeof document === 'undefined') return null;
	const cookies = document.cookie.split(';');
	const roleCookie = cookies.find((c) => c.trim().startsWith('user_role='));
	return roleCookie ? roleCookie.split('=')[1] : null;
}

export default function MyCoursesPage() {
	const [enrolledCourses, setEnrolledCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState(null);
	const [userId, setUserId] = useState(null);
	const [enrollments, setEnrollments] = useState({});

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
				// Get user role
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					setRole(userDoc.data().role);
				}
			} else {
				setRole('guest');
			}
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		async function loadEnrolledCourses() {
			if (!userId && role !== 'admin' && role !== 'teacher') {
				// Wait for userId to be loaded
				return;
			}

			try {
				const currentRole = role || getUserRole() || 'guest';

				// For students, load only their enrolled courses
				if (currentRole === 'student' && userId) {
					// Get all enrollments for this student
					const enrollmentsQuery = query(
						collection(db, 'enrollments'),
						where('studentId', '==', userId)
					);
					const enrollmentsSnap = await getDocs(enrollmentsQuery);
					
					const enrollmentMap = {};
					const courseIds = [];
					
					enrollmentsSnap.docs.forEach(doc => {
						const data = doc.data();
						enrollmentMap[data.courseId] = data;
						courseIds.push(data.courseId);
					});
					
					setEnrollments(enrollmentMap);

					// Load course details for enrolled courses
					if (courseIds.length > 0) {
						const courses = [];
						for (const courseId of courseIds) {
							const courseDoc = await getDoc(doc(db, 'courses', courseId));
							if (courseDoc.exists()) {
								courses.push({ id: courseDoc.id, ...courseDoc.data() });
							}
						}
						setEnrolledCourses(courses);
					}
				} else if (currentRole === 'admin') {
					// Admins see all courses
					const coursesQuery = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
					const snapshot = await getDocs(coursesQuery);
					const coursesList = snapshot.docs.map(doc => ({
						id: doc.id,
						...doc.data()
					}));
					setEnrolledCourses(coursesList);
				} else if (currentRole === 'teacher') {
					// Teachers see published + their own drafts
					const publishedQuery = query(
						collection(db, 'courses'),
						where('status', '==', 'published'),
						orderBy('createdAt', 'desc')
					);
					const myDraftsQuery = query(
						collection(db, 'courses'),
						where('status', '==', 'draft'),
						where('createdBy', '==', userId),
						orderBy('createdAt', 'desc')
					);
					
					const [publishedSnap, draftsSnap] = await Promise.all([
						getDocs(publishedQuery),
						userId ? getDocs(myDraftsQuery) : Promise.resolve({ docs: [] })
					]);
					
					const allCourses = [
						...publishedSnap.docs.map(d => ({ id: d.id, ...d.data() })),
						...draftsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
					];
					setEnrolledCourses(allCourses);
				}
			} catch (err) {
				console.error('Error loading courses:', err);
			} finally {
				setLoading(false);
			}
		}

		if (userId || role) {
			loadEnrolledCourses();
		}
	}, [userId, role]);

	const canCreate = role === 'admin' || role === 'teacher';
	const isStudent = role === 'student';

	// Calculate progress for a course
	function getProgress(courseId) {
		const enrollment = enrollments[courseId];
		if (!enrollment || !enrollment.progress) return 0;
		return enrollment.progress.overallProgress || 0;
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading courses...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">My Courses</h1>
					<p className="text-body text-muted-foreground">
						{isStudent 
							? 'Continue learning from your enrolled courses' 
							: role === 'teacher'
							? 'Manage your courses'
							: 'Manage all courses'}
					</p>
				</div>
				<div className="flex items-center gap-3">
					{isStudent && (
						<Link href="/courses/explore">
							<Button size="lg" variant="outline">
								<Search className="h-4 w-4 mr-2" />
								Explore Courses
							</Button>
						</Link>
					)}
					{canCreate && (
						<Link href="/dashboard/courses/new">
							<Button size="lg">Create Course</Button>
						</Link>
					)}
				</div>
			</div>

			{isStudent && enrolledCourses.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-12">
							<BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
							<h3 className="text-h3 text-neutralDark mb-2">No enrolled courses yet</h3>
							<p className="text-body text-muted-foreground mb-6">
								Start your learning journey by exploring and enrolling in courses
							</p>
							<Link href="/courses/explore">
								<Button size="lg">
									<Search className="h-4 w-4 mr-2" />
									Explore Courses
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			) : enrolledCourses.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-8">No courses available</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{enrolledCourses.map((course) => {
						const progress = getProgress(course.id);
						
						return (
							<Card key={course.id} className="card-hover">
								<CardHeader>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<CardTitle className="text-h3 mb-2 line-clamp-2">{course.title}</CardTitle>
											<CardDescription className="line-clamp-2">
												{course.description || 'No description provided'}
											</CardDescription>
										</div>
										<span className={`px-3 py-1 rounded-full text-caption font-medium whitespace-nowrap ${
											course.status === 'published' 
												? 'bg-success/10 text-success' 
												: 'bg-warning/10 text-warning'
										}`}>
											{course.status === 'published' ? 'Published' : 'Draft'}
										</span>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center gap-2 text-caption text-muted-foreground">
										<BookOpen className="h-4 w-4" />
										<span>By: {course.authorName || 'Unknown'}</span>
									</div>

									{isStudent && progress > 0 && (
										<div className="space-y-2">
											<div className="flex items-center justify-between text-caption">
												<span className="text-muted-foreground">Progress</span>
												<span className="font-medium text-neutralDark">{progress}%</span>
											</div>
											<ProgressBar value={progress} color="indigo" className="h-2" />
										</div>
									)}

									<div className="flex items-center gap-2 pt-2 border-t border-border">
										<Link href={`/courses/${course.id}`} className="flex-1">
											<Button variant="default" className="w-full">
												{isStudent ? (
													<>
														<PlayCircle className="h-4 w-4 mr-2" />
														Continue Learning
													</>
												) : (
													'View Course'
												)}
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
