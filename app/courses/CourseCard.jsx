'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, User, CheckCircle2, Eye, X } from 'lucide-react';
import CoursePreviewModal from './CoursePreviewModal';

export default function CourseCard({ course, currentUserId, currentRole }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [checkingEnrollment, setCheckingEnrollment] = useState(true);
	const [showPreview, setShowPreview] = useState(false);
	const router = useRouter();

	const canEdit = currentRole === 'admin' || (currentRole === 'teacher' && course.createdBy === currentUserId);
	const isPublished = course.status === 'published';
	const isStudent = currentRole === 'student';

	// Check enrollment status for students
	useEffect(() => {
		async function checkEnrollment() {
			// Check enrollment for both published and draft courses (students may have enrolled before course was unpublished)
			if (isStudent && currentUserId) {
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
	}, [isStudent, currentUserId, course.id]);

	async function handleEnroll() {
		if (!currentUserId) {
			setError('Please sign in to enroll');
			return;
		}

		setLoading(true);
		setError('');
		try {
			// Use client-side Firestore to create enrollment (has auth context)
			const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
			const { db } = await import('@/firebase');
			
			// Check if already enrolled
			const enrollmentId = `${currentUserId}_${course.id}`;
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
			const enrollmentId = `${currentUserId}_${course.id}`;
			const enrollmentRef = doc(db, 'enrollment', enrollmentId);
			await deleteDoc(enrollmentRef);
			
			setIsEnrolled(false);
			// Reload to update the UI
			window.location.reload();
		} catch (err) {
			console.error('Unenrollment error:', err);
			setError(err.message || 'Failed to unenroll. Please try again.');
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
				{/* Show actions for published courses, or for draft courses if student is already enrolled */}
				{isStudent && (isPublished || isEnrolled) && !checkingEnrollment && (
					<div className="space-y-2 pt-2 border-t border-border">
						{isEnrolled ? (
							<>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-5 w-5 text-success" />
									<Link href={`/courses/${course.id}`} className="flex-1">
										<Button variant="default" className="w-full">
											Continue Learning
										</Button>
									</Link>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowPreview(true)}
										title="Preview course structure"
									>
										<Eye className="h-4 w-4" />
									</Button>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleUnenroll}
									disabled={loading}
									className="w-full text-error hover:text-error hover:bg-error/10"
								>
									<X className="h-4 w-4 mr-2" />
									{loading ? 'Unenrolling...' : 'Unenroll'}
								</Button>
							</>
						) : (
							<div className="flex items-center gap-2">
								<Button
									onClick={handleEnroll}
									disabled={loading}
									className="flex-1"
								>
									{loading ? 'Enrolling...' : 'Enroll'}
								</Button>
								<Button
									variant="outline"
									onClick={() => setShowPreview(true)}
									className="flex-1"
								>
									<Eye className="h-4 w-4 mr-2" />
									Preview
								</Button>
							</div>
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

			{/* Course Preview Modal */}
			<CoursePreviewModal
				course={course}
				isOpen={showPreview}
				onClose={() => setShowPreview(false)}
				currentUserId={currentUserId}
				onEnroll={handleEnroll}
			/>
		</Card>
	);
}
