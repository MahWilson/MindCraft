'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, User, CheckCircle2 } from 'lucide-react';

export default function CourseCard({ course, currentUserId, currentRole }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [checkingEnrollment, setCheckingEnrollment] = useState(true);
	const router = useRouter();

	const canEdit = currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);
	const isPublished = course.status === 'published';
	const isStudent = currentRole === 'student';

	// Check enrollment status for students
	useEffect(() => {
		async function checkEnrollment() {
			if (isStudent && currentUserId && isPublished) {
				try {
					// Check enrollment directly from Firestore (client-side)
					const { getDoc } = await import('firebase/firestore');
					const enrollmentRef = doc(db, 'enrollment', `${currentUserId}_${course.id}`);
					const enrollmentDoc = await getDoc(enrollmentRef);
					setIsEnrolled(enrollmentDoc.exists());
				} catch (err) {
					console.error('Error checking enrollment:', err);
					setIsEnrolled(false);
				} finally {
					setCheckingEnrollment(false);
				}
			} else {
				setCheckingEnrollment(false);
			}
		}
		checkEnrollment();
	}, [isStudent, currentUserId, course.id, isPublished]);

	async function handleEnroll() {
		if (!currentUserId) {
			setError('Please sign in to enroll');
			return;
		}

		setLoading(true);
		setError('');
		try {
			// Enroll directly from client-side to use Firebase Auth context
			// Verify course exists and is published
			const courseRef = doc(db, 'course', course.id);
			const courseDoc = await getDoc(courseRef);
			
			if (!courseDoc.exists()) {
				throw new Error('Course not found');
			}
			
			const courseData = courseDoc.data();
			if (courseData.status !== 'published') {
				throw new Error('Cannot enroll in unpublished course');
			}
			
			// Check if already enrolled
			const enrollmentRef = doc(db, 'enrollment', `${currentUserId}_${course.id}`);
			const enrollmentDoc = await getDoc(enrollmentRef);
			
			if (enrollmentDoc.exists()) {
				throw new Error('Already enrolled in this course');
			}
			
			// Create enrollment (client-side with auth context)
			await setDoc(enrollmentRef, {
				studentId: currentUserId,
				courseId: course.id,
				enrolledAt: serverTimestamp(),
				progress: {
					completedModules: [],
					completedLessons: [],
					overallProgress: 0,
				},
			});

			setIsEnrolled(true);
			// Redirect to course detail page
			router.push(`/courses/${course.id}`);
		} catch (err) {
			console.error('Enrollment error details:', err);
			console.error('Error code:', err.code);
			console.error('Error message:', err.message);
			// Show more specific error message
			if (err.code === 'permission-denied') {
				setError('Permission denied. Please check your Firestore security rules or ensure you are signed in as a student.');
			} else {
				setError(err.message || 'Failed to enroll');
			}
		} finally {
			setLoading(false);
		}
	}

	async function handleUnpublish() {
		if (!confirm(`Unpublish "${course.title}"? It will be moved back to draft and taken off the live server.`)) {
			return;
		}
		setLoading(true);
		setError('');
		try {
			await updateDoc(doc(db, 'course', course.id), {
				status: 'draft',
				updatedAt: serverTimestamp(),
			});
			window.location.reload();
		} catch (err) {
			setError(err.message || 'Failed to unpublish');
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card className="card-hover">
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-h3 mb-2 line-clamp-2">{course.title}</CardTitle>
						<CardDescription className="line-clamp-2 mb-4">
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
					<User className="h-4 w-4" />
					<span>By: {course.authorName || 'Unknown'}</span>
				</div>

				{/* Student Actions */}
				{isStudent && isPublished && !checkingEnrollment && (
					<div className="flex items-center gap-2 pt-2 border-t border-border">
						{isEnrolled ? (
							<>
								<CheckCircle2 className="h-5 w-5 text-success" />
								<Link href={`/courses/${course.id}`} className="flex-1">
									<Button variant="default" className="w-full">
										Continue Learning
									</Button>
								</Link>
							</>
						) : (
							<>
								<Button
									onClick={handleEnroll}
									disabled={loading}
									className="flex-1"
								>
									{loading ? 'Enrolling...' : 'Enroll'}
								</Button>
								<Link href={`/courses/${course.id}`}>
									<Button variant="outline" className="flex-1">
										View Details
									</Button>
								</Link>
							</>
						)}
					</div>
				)}

				{/* Teacher/Admin Actions */}
				{course.status === 'draft' && canEdit && (
					<div className="flex items-center gap-2 pt-2 border-t border-border">
						<Link href={`/dashboard/courses/${course.id}/edit`} className="flex-1">
							<Button variant="outline" className="w-full">
								Edit Course
							</Button>
						</Link>
					</div>
				)}

				{isPublished && canEdit && (
					<div className="flex items-center gap-2 pt-2 border-t border-border">
						<Link href={`/dashboard/courses/${course.id}/edit`} className="flex-1">
							<Button variant="outline" className="w-full">
								Edit
							</Button>
						</Link>
						<Button
							onClick={handleUnpublish}
							disabled={loading}
							variant="outline"
							className="border-warning text-warning hover:bg-warning/10 flex-1"
						>
							Unpublish
						</Button>
					</div>
				)}

				{error && (
					<div className="p-3 rounded-lg bg-error/10 border border-error/20">
						<p className="text-caption text-error">{error}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

