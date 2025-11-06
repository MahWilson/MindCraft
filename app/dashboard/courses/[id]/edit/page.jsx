'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CourseModuleManager from '@/app/components/CourseModuleManager';

export default function EditCoursePage() {
	const params = useParams();
	const router = useRouter();
	const courseId = params.id;
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [status, setStatus] = useState('draft');
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	useEffect(() => {
		// Wait for Firebase Auth to initialize
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			try {
				if (!user) {
					setError('You must be signed in to edit a course');
					setLoading(false);
					return;
				}

				// Get user role from Firestore
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (!userDoc.exists()) {
					setError('User profile not found');
					setLoading(false);
					return;
				}

				const userData = userDoc.data();
				const currentRole = userData.role;
				const currentUserId = user.uid;

				// Fetch course
				const courseDoc = await getDoc(doc(db, 'courses', courseId));
				
				if (!courseDoc.exists()) {
					setError('Course not found');
					setLoading(false);
					return;
				}

				const course = { id: courseDoc.id, ...courseDoc.data() };
				
				// Check permissions
				const courseCreatedBy = course.createdBy ? String(course.createdBy).trim() : null;
				
				if (currentRole === 'admin') {
					// Admin can edit any course
				} else if (currentRole === 'teacher') {
					// Teachers can only edit their own courses
					if (!courseCreatedBy || courseCreatedBy !== currentUserId) {
						setError('Unauthorized: You can only edit your own courses');
						setLoading(false);
						return;
					}
				} else {
					setError('Unauthorized: Only teachers and admins can edit courses');
					setLoading(false);
					return;
				}

				// Load course data
				setTitle(course.title);
				setDescription(course.description || '');
				setStatus(course.status);
			} catch (err) {
				console.error('Error fetching course:', err);
				setError('Failed to load course');
			} finally {
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, [courseId]);

	async function onSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');

		try {
			await updateDoc(doc(db, 'courses', courseId), {
				title: title.trim(),
				description: description?.trim() || '',
				status: status,
				updatedAt: serverTimestamp(),
			});

			setSuccess('Course updated successfully!');
			setTimeout(() => {
				router.push('/courses');
			}, 1500);
		} catch (err) {
			console.error('Error updating course:', err);
			setError(err.message || 'Failed to update course');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="max-w-2xl mx-auto p-4">Loading...</div>;
	}

	if (error && !title) {
		return (
			<div className="max-w-2xl mx-auto p-4">
				<div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">{error}</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Edit Course</h1>
				<p className="text-body text-muted-foreground">Update course details and manage modules & lessons</p>
			</div>

			<Card>
				<CardContent className="pt-6">
					<form onSubmit={onSubmit} className="space-y-6">
						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">Title</span>
							<Input
								required
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter course title"
							/>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">Description</span>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={4}
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
								placeholder="Enter course description"
							/>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">Status</span>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
							>
								<option value="draft">Draft</option>
								<option value="published">Published</option>
							</select>
						</label>

						<div className="pt-4 border-t border-border">
							<Button
								type="submit"
								disabled={submitting}
								className="w-full"
								size="lg"
							>
								{submitting ? 'Saving…' : 'Save Changes'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* Modules & Lessons Manager */}
			<Card>
				<CardContent className="pt-6">
					<CourseModuleManager
						courseId={courseId}
						onModulesChange={() => {}}
					/>
				</CardContent>
			</Card>

			{error && (
				<Card className="border-error bg-error/5">
					<CardContent className="pt-6">
						<p className="text-body text-error">{error}</p>
					</CardContent>
				</Card>
			)}
			{success && (
				<Card className="border-success bg-success/5">
					<CardContent className="pt-6">
						<p className="text-body text-success">{success}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

