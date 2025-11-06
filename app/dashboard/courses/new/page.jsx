'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CourseModuleManager from '@/app/components/CourseModuleManager';

export default function NewCoursePage() {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [publish, setPublish] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [userRole, setUserRole] = useState(null);
	const [modules, setModules] = useState([]);
	const router = useRouter();

	useEffect(() => {
		// Get user role on mount
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					setUserRole(userDoc.data().role);
				}
			}
		});
		return () => unsubscribe();
	}, []);

	async function onSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');

		// Check if user is authenticated
		const user = auth.currentUser;
		if (!user) {
			setError('You must be signed in to create a course');
			setSubmitting(false);
			return;
		}

		try {
			// Get user profile to get name and role
			const userDoc = await getDoc(doc(db, 'users', user.uid));
			const userData = userDoc.exists() ? userDoc.data() : null;
			
			if (!userData || (userData.role !== 'admin' && userData.role !== 'teacher')) {
				setError('Only teachers and admins can create courses');
				setSubmitting(false);
				return;
			}

			// Create course in Firestore
			const courseData = {
				title: title.trim(),
				description: description?.trim() || '',
				status: publish ? 'published' : 'draft',
				modules: [],
				createdBy: user.uid,
				authorName: userData.name || 'Unknown',
				authorEmail: user.email || '',
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			const docRef = await addDoc(collection(db, 'courses'), courseData);
			const newCourseId = docRef.id;
			
			// Save modules if any were created
			if (modules && modules.length > 0) {
				for (const module of modules) {
					if (module.temp) {
						// Create module in Firestore
						const moduleResponse = await fetch('/api/modules', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								courseId: newCourseId,
								title: module.title,
								order: module.order || 0,
							}),
						});

						const moduleData = await moduleResponse.json();
						if (moduleData.success && module.lessons && module.lessons.length > 0) {
							// Create lessons for this module
							for (const lesson of module.lessons) {
								if (lesson.temp) {
									await fetch('/api/lessons', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({
											moduleId: moduleData.moduleId,
											title: lesson.title,
											contentHtml: lesson.contentHtml || '',
											order: lesson.order || 0,
										}),
									});
								}
							}
						}
					}
				}
			}
			
			const isPublished = publish;
			setSuccess(
				isPublished
					? `Course "${title}" published successfully!`
					: `Course "${title}" saved as draft. You can continue editing and publish when ready.`
			);

			// Clear form fields
			setTitle('');
			setDescription('');
			setPublish(false);
			setModules([]);

			// Redirect based on role - use window.location to force full page reload
			setTimeout(() => {
				if (userRole === 'admin' || userRole === 'teacher') {
					window.location.href = '/admin/courses';
				} else {
					window.location.href = '/courses';
				}
			}, 2000);
		} catch (err) {
			console.error('Course creation error:', err);
			setError(err.message || 'Failed to save course');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="max-w-2xl mx-auto">
			<h1 className="text-h1 text-neutralDark mb-8">Create Course</h1>
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

						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={publish}
								onChange={(e) => setPublish(e.target.checked)}
								className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
							/>
							<span className="text-body text-neutralDark">Publish immediately</span>
						</label>

						{/* Modules & Lessons Manager (Optional) */}
						<div className="pt-6 border-t border-border">
							<CourseModuleManager
								courseId={null}
								initialModules={modules}
								onModulesChange={setModules}
							/>
						</div>

						<div className="pt-4">
							<Button
								type="submit"
								disabled={submitting}
								className="w-full"
								size="lg"
							>
								{submitting ? 'Saving…' : 'Save Course'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{error && (
				<Card className="mt-6 border-error bg-error/5">
					<CardContent className="pt-6">
						<p className="text-body text-error">{error}</p>
					</CardContent>
				</Card>
			)}
			{success && (
				<Card className="mt-6 border-success bg-success/5">
					<CardContent className="pt-6">
						<p className="text-body text-success">{success}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}


