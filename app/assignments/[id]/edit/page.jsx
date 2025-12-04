'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function EditAssignmentPage() {
	const params = useParams();
	const router = useRouter();
	const assignmentId = params.id;

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState('');
	const [courseTitle, setCourseTitle] = useState('');
	const [deadline, setDeadline] = useState('');
	const [status, setStatus] = useState('draft');
	const [isOpen, setIsOpen] = useState(true);
	const [allowLateSubmissions, setAllowLateSubmissions] = useState(false);
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [error, setError] = useState('');

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
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
			loadData();
		}
	}, [assignmentId, userRole]);

	async function loadData() {
		setLoading(true);
		try {
			// Load courses
			const coursesQuery = query(collection(db, 'course'));
			const coursesSnapshot = await getDocs(coursesQuery);
			const loadedCourses = coursesSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
			setCourses(loadedCourses);

			// Load assignment
			const assignmentDoc = await getDoc(doc(db, 'assignment', assignmentId));
			if (!assignmentDoc.exists()) {
				setError('Assignment not found');
				setLoading(false);
				return;
			}

			const assignmentData = assignmentDoc.data();

			// Check permissions
			if (assignmentData.createdBy !== currentUserId && userRole !== 'admin') {
				setError('You do not have permission to edit this assignment');
				setLoading(false);
				return;
			}

			setTitle(assignmentData.title || '');
			setDescription(assignmentData.description || '');
			setCourseId(assignmentData.courseId || '');
			setCourseTitle(assignmentData.courseTitle || '');
			setStatus(assignmentData.status || 'draft');
			setIsOpen(assignmentData.isOpen !== undefined ? assignmentData.isOpen : true);
			setAllowLateSubmissions(assignmentData.allowLateSubmissions !== undefined ? assignmentData.allowLateSubmissions : false);

			// Format deadline for datetime-local input
			if (assignmentData.deadline) {
				const deadlineDate = assignmentData.deadline.toDate 
					? assignmentData.deadline.toDate() 
					: new Date(assignmentData.deadline);
				const year = deadlineDate.getFullYear();
				const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
				const day = String(deadlineDate.getDate()).padStart(2, '0');
				const hours = String(deadlineDate.getHours()).padStart(2, '0');
				const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
				setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
			}
		} catch (err) {
			console.error('Error loading data:', err);
			setError('Failed to load assignment');
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

	function handleAllowLateSubmissionsChange(checked) {
		setAllowLateSubmissions(checked);
		// When toggled off, close submissions and set to draft (take offline)
		if (!checked) {
			setIsOpen(false);
			setStatus('draft');
		} else {
			// When toggled on, open submissions and ensure it's published
			setIsOpen(true);
			setStatus('published');
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
				throw new Error('You must be signed in to update assignments');
			}

			const assignmentData = {
				title: title.trim(),
				description: description.trim() || '',
				courseId,
				courseTitle,
				deadline: deadline ? new Date(deadline) : null,
				status,
				isOpen,
				allowLateSubmissions,
				updatedAt: serverTimestamp(),
			};

			await updateDoc(doc(db, 'assignment', assignmentId), assignmentData);

			router.push('/assignments');
		} catch (err) {
			console.error('Error updating assignment:', err);
			alert('Failed to update assignment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
			return;
		}

		setDeleting(true);

		try {
			const { deleteDoc } = await import('firebase/firestore');
			await deleteDoc(doc(db, 'assignment', assignmentId));
			router.push('/assignments');
		} catch (err) {
			console.error('Error deleting assignment:', err);
			alert('Failed to delete assignment: ' + (err.message || 'Unknown error'));
			setDeleting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Edit Assignment</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4" title="Back to Assignments">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assignments
					</Button>
				</Link>
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Edit Assignment</h1>
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
				<h1 className="text-h1 text-neutralDark mb-2">Edit Assignment</h1>
				<p className="text-body text-muted-foreground">Update assignment details and settings</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
							<CardDescription>Update the assignment details</CardDescription>
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
								<label htmlFor="description" className="block text-sm font-medium mb-2">
									Description
								</label>
								<RichTextEditor
									value={description}
									onChange={setDescription}
									placeholder="Enter assignment description and instructions..."
								/>
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
									onCheckedChange={handleAllowLateSubmissionsChange}
								/>
								<div className="flex-1">
									<label htmlFor="allowLateSubmissions" className="text-sm font-medium cursor-pointer">
										Allow late submissions
									</label>
									<p className="text-xs text-muted-foreground mt-1">
										{allowLateSubmissions 
											? 'Students can submit work after the deadline has passed'
											: 'Toggle off to close submissions or take assignment offline'
										}
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
							title="Save Changes"
						>
							{submitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Save Changes
								</>
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={handleDelete}
							disabled={deleting}
							className="text-destructive hover:text-destructive"
							title="Delete Assignment"
						>
							{deleting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Deleting...
								</>
							) : (
								<>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete
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

