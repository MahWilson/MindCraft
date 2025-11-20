'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function CreateAssignmentPage() {
	const router = useRouter();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState('');
	const [courseTitle, setCourseTitle] = useState('');
	const [deadline, setDeadline] = useState('');
	const [status, setStatus] = useState('draft');
	const [allowLateSubmissions, setAllowLateSubmissions] = useState(false);
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [generating, setGenerating] = useState(false);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	useEffect(() => {
		if (userRole === 'teacher' || userRole === 'admin') {
			loadCourses();
		}
	}, [userRole]);

	async function loadCourses() {
		setLoading(true);
		try {
			const coursesQuery = query(collection(db, 'courses'));
			const snapshot = await getDocs(coursesQuery);
			const loadedCourses = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
			setCourses(loadedCourses);
		} catch (err) {
			console.error('Error loading courses:', err);
		} finally {
			setLoading(false);
		}
	}

	function handleCourseChange(e) {
		const selectedCourseId = e.target.value;
		setCourseId(selectedCourseId);
		const selectedCourse = courses.find(c => c.id === selectedCourseId);
		setCourseTitle(selectedCourse ? selectedCourse.title : '');
	}

	async function handleGenerateContent() {
		if (!courseId) {
			alert('Please select a course first');
			return;
		}

		setGenerating(true);
		try {
			const selectedCourse = courses.find(c => c.id === courseId);
			const courseTitle = selectedCourse?.title || '';
			const courseDescription = selectedCourse?.description || '';

			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'generate_assignment',
					options: {
						courseTitle,
						courseDescription,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to generate content');
			}

			const data = await response.json();
			
			// Populate the form fields with generated content
			if (data.title) {
				setTitle(data.title);
			}
			if (data.description) {
				setDescription(data.description);
			}
		} catch (err) {
			console.error('Error generating assignment content:', err);
			alert('Failed to generate content: ' + (err.message || 'Unknown error'));
		} finally {
			setGenerating(false);
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!title.trim()) {
			alert('Assignment title is required');
			return;
		}

		if (!courseId) {
			alert('Please select a course');
			return;
		}

		setSubmitting(true);

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to create assignments');
			}

			const assignmentData = {
				title: title.trim(),
				description: description.trim() || '',
				courseId,
				courseTitle,
				deadline: deadline ? new Date(deadline) : null,
				status,
				isOpen: true, // New assignments are open by default
				allowLateSubmissions,
				createdBy: auth.currentUser.uid,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			await addDoc(collection(db, 'assignments'), assignmentData);

			router.push('/assignments');
		} catch (err) {
			console.error('Error creating assignment:', err);
			alert('Failed to create assignment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Create Assignment</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Create Assignment</h1>
					<p className="text-body text-muted-foreground">Access denied.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4" title="Back to Assignments">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assignments
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">Create Assignment</h1>
				<p className="text-body text-muted-foreground">Create a new assignment for your course</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
							<CardDescription>Enter the assignment details</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label htmlFor="title" className="block text-sm font-medium mb-2">
									Assignment Title <span className="text-destructive">*</span>
								</label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="e.g., Python Programming Project"
									required
								/>
							</div>

							<div>
								<label htmlFor="course" className="block text-sm font-medium mb-2">
									Course <span className="text-destructive">*</span>
								</label>
								<select
									id="course"
									value={courseId}
									onChange={handleCourseChange}
									className="w-full px-3 py-2 border border-border rounded-md bg-white"
									required
								>
									<option value="">Select a course</option>
									{courses.map((course) => (
										<option key={course.id} value={course.id}>
											{course.title}
										</option>
									))}
								</select>
							</div>

							<div>
								<div className="flex items-center justify-between mb-2">
									<label htmlFor="description" className="block text-sm font-medium">
										Description
									</label>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleGenerateContent}
										disabled={generating || !courseId}
										className="flex items-center gap-2"
									>
										{generating ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" />
												Generating...
											</>
										) : (
											<>
												<Sparkles className="h-4 w-4" />
												Generate Content
											</>
										)}
									</Button>
								</div>
								<RichTextEditor
									value={description}
									onChange={setDescription}
									placeholder="Enter assignment description and instructions..."
								/>
								<p className="text-xs text-muted-foreground mt-1">
									Click "Generate Content" to create a sample assignment scaffold based on the selected course
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Settings */}
					<Card>
						<CardHeader>
							<CardTitle>Settings</CardTitle>
							<CardDescription>Configure assignment settings</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="w-1/2">
								<label htmlFor="deadline" className="block text-sm font-medium mb-2">
									Deadline
								</label>
								<Input
									id="deadline"
									type="datetime-local"
									value={deadline}
									onChange={(e) => setDeadline(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground mt-1">
									Set a deadline for when students must submit their work
								</p>
							</div>

							<div className="flex items-center gap-3">
								<Switch
									id="allowLateSubmissions"
									checked={allowLateSubmissions}
									onCheckedChange={setAllowLateSubmissions}
								/>
								<div className="flex-1">
									<label htmlFor="allowLateSubmissions" className="text-sm font-medium cursor-pointer">
										Allow late submissions
									</label>
									<p className="text-xs text-muted-foreground mt-1">
										When enabled, students can submit work after the deadline has passed
									</p>
								</div>
							</div>

							<div className="w-1/2">
								<label htmlFor="status" className="block text-sm font-medium mb-2">
									Status
								</label>
								<select
									id="status"
									value={status}
									onChange={(e) => setStatus(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-md bg-white"
								>
									<option value="draft">Draft</option>
									<option value="published">Published</option>
								</select>
								<p className="text-xs text-muted-foreground mt-1">
									Draft assignments are only visible to you. Published assignments are visible to students.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex gap-4 w-1/2 mx-auto justify-center">
						<Button
							type="submit"
							disabled={submitting}
							title="Create Assignment"
						>
							{submitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Create Assignment
								</>
							)}
						</Button>
						<Link href="/assignments">
							<Button variant="outline" type="button" title="Cancel">
								Cancel
							</Button>
						</Link>
					</div>
				</div>
			</form>
		</div>
	);
}

