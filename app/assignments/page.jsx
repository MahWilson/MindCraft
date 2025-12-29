'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Plus, Edit2, Trash2, Calendar, Clock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssignmentsPage() {
	const [assignments, setAssignments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					setUserRole(userDoc.data().role);
				}
			} else {
				setCurrentUserId(null);
				setUserRole(null);
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	useEffect(() => {
		if (userRole) {
			loadAssignments();
		}
	}, [userRole]);

	async function loadAssignments() {
		setLoading(true);
		try {
			let assignmentsQuery;

			if (userRole === 'student') {
				// Students only see published assignments
				assignmentsQuery = query(
					collection(db, 'assignment'),
					where('status', '==', 'published'),
					orderBy('createdAt', 'desc')
				);
			} else {
				// Teachers and admins see all assignments
				assignmentsQuery = query(
					collection(db, 'assignment'),
					orderBy('createdAt', 'desc')
				);
			}

			const snapshot = await getDocs(assignmentsQuery);
			const loadedAssignments = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			setAssignments(loadedAssignments);
		} catch (err) {
			console.error('Error loading assignments:', err);
		} finally {
			setLoading(false);
		}
	}

	async function confirmDelete(assignmentId) {
		const assignment = assignments.find(a => a.id === assignmentId);
		let submissionCount = 0;
		try {
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assignmentId', '==', assignmentId)
			);
			const snapshot = await getDocs(submissionsQuery);
			submissionCount = snapshot.size;
		} catch (err) {
			console.error('Error checking submissions:', err);
		}

		setDeleteConfirm({
			id: assignmentId,
			title: assignment?.title || 'Assignment',
			submissionCount
		});
	}

	async function executeDelete() {
		if (!deleteConfirm) return;
		const assignmentId = deleteConfirm.id;

		try {
			// Delete all associated submissions first
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assignmentId', '==', assignmentId)
			);
			const submissionSnapshot = await getDocs(submissionsQuery);
			const deletePromises = submissionSnapshot.docs.map(doc => deleteDoc(doc.ref));
			await Promise.all(deletePromises);

			await deleteDoc(doc(db, 'assignment', assignmentId));
			setAssignments(prev => prev.filter(a => a.id !== assignmentId));
			setDeleteConfirm(null);
		} catch (err) {
			console.error('Error deleting assignment:', err);
			alert('Failed to delete assignment: ' + (err.message || 'Unknown error'));
			setDeleteConfirm(null);
		}
	}

	async function togglePublish(assignment) {
		try {
			await updateDoc(doc(db, 'assignment', assignment.id), {
				status: assignment.status === 'published' ? 'draft' : 'published',
				updatedAt: new Date(),
			});
			loadAssignments();
		} catch (err) {
			console.error('Error updating assignment:', err);
			alert('Failed to update assignment: ' + (err.message || 'Unknown error'));
		}
	}

	async function toggleOpen(assignment) {
		try {
			await updateDoc(doc(db, 'assignment', assignment.id), {
				isOpen: !assignment.isOpen,
				updatedAt: new Date(),
			});
			loadAssignments();
		} catch (err) {
			console.error('Error updating assignment:', err);
			alert('Failed to update assignment: ' + (err.message || 'Unknown error'));
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return 'No date set';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isDeadlinePassed(deadline) {
		if (!deadline) return false;
		const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
		return deadlineDate < new Date();
	}

	function stripHtml(html) {
		if (!html) return '';
		// Remove HTML tags and decode entities
		const tmp = document.createElement('DIV');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}

	const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Assignments</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Assignments</h1>
					<p className="text-body text-muted-foreground">
						{isTeacherOrAdmin ? 'Create and manage assignments for your courses' : 'View and complete your assignments'}
					</p>
				</div>
				{isTeacherOrAdmin && (
					<Link href="/assignments/new">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Create Assignment
						</Button>
					</Link>
				)}
			</div>

			{/* Assignments List */}
			{assignments.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground mb-4">
							{isTeacherOrAdmin ? 'No assignments created yet.' : 'No active assignments found.'}
						</p>
						{isTeacherOrAdmin && (
							<Link href="/assignments/new">
								<Button>Create Your First Assignment</Button>
							</Link>
						)}
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{assignments.map((assignment) => {
						const deadlinePassed = isDeadlinePassed(assignment.deadline);

						return (
							<Card key={assignment.id} className="card-hover">
								<CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-white border-b-2 border-primary/20 pb-4">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-h3 mb-3 text-neutralDark font-semibold">{assignment.title}</CardTitle>
											<div className="flex flex-wrap gap-2">
												{assignment.status === 'published' ? (
													<span className="text-xs bg-success/10 text-success px-2.5 py-1.5 rounded-md font-medium border border-success/20">
														Published
													</span>
												) : (
													<span className="text-xs bg-warning/10 text-warning px-2.5 py-1.5 rounded-md font-medium border border-warning/20">
														Draft
													</span>
												)}
												{assignment.isOpen ? (
													<span className="text-xs bg-info/10 text-info px-2.5 py-1.5 rounded-md font-medium border border-info/20 flex items-center gap-1.5">
														<CheckCircle className="h-3.5 w-3.5" />
														Open
													</span>
												) : (
													<span className="text-xs bg-muted/50 text-muted-foreground px-2.5 py-1.5 rounded-md font-medium border border-border flex items-center gap-1.5">
														<XCircle className="h-3.5 w-3.5" />
														Closed
													</span>
												)}
												{deadlinePassed && (
													<span className="text-xs bg-destructive/10 text-destructive px-2.5 py-1.5 rounded-md font-medium border border-destructive/20 flex items-center gap-1.5">
														<AlertCircle className="h-3.5 w-3.5" />
														Past Due
													</span>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{assignment.description && (
										<p className="text-body text-muted-foreground line-clamp-2">
											{stripHtml(assignment.description)}
										</p>
									)}

									{assignment.courseTitle && (
										<p className="text-sm text-muted-foreground">
											Course: {assignment.courseTitle}
										</p>
									)}

									{assignment.deadline && (
										<div className="flex items-center gap-2 text-sm">
											<Calendar className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
											<span className={deadlinePassed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
												Due: {formatDate(assignment.deadline)}
											</span>
										</div>
									)}

									<div className="pt-4 border-t border-border/50">
										{isTeacherOrAdmin ? (
											<div className="grid grid-cols-2 gap-3">
												<Link href={`/assignments/${assignment.id}/edit`} className="w-full">
													<Button variant="outline" className="w-full h-10 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60" title="Edit Assignment">
														<Edit2 className="h-4 w-4 mr-2" />
														Edit
													</Button>
												</Link>

												<Link href={`/assignments/${assignment.id}`} className="w-full">
													<Button variant="outline" className="w-full h-10 border-neutral-300 text-neutralDark hover:bg-neutral-100 hover:border-neutral-400" title="View Submissions">
														<FileText className="h-4 w-4 mr-2" />
														Submissions
													</Button>
												</Link>

												<Button
													variant="outline"
													onClick={() => togglePublish(assignment)}
													title={assignment.status === 'published' ? 'Unpublish' : 'Publish'}
													className={`w-full h-10 ${assignment.status === 'published'
														? "border-warning/30 text-warning hover:bg-warning/10 hover:border-warning/50"
														: "border-success/30 text-success hover:bg-success/10 hover:border-success/50"}`}
												>
													{assignment.status === 'published' ? (
														<>
															<EyeOff className="h-4 w-4 mr-2" />
															Unpublish
														</>
													) : (
														<>
															<Eye className="h-4 w-4 mr-2" />
															Publish
														</>
													)}
												</Button>

												<Button
													variant="destructive"
													onClick={() => confirmDelete(assignment.id)}
													title="Delete Assignment"
													className="w-full h-10 bg-red-600 hover:bg-red-700 text-white shadow-sm"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete
												</Button>
											</div>
										) : (
											<Link href={`/assignments/${assignment.id}`} className="w-full">
												<Button className="w-full h-11 text-base shadow-sm hover:shadow-md transition-all" variant="default">
													View Details
													<ArrowRight className="h-5 w-5 ml-2" />
												</Button>
											</Link>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) setDeleteConfirm(null);
					}}
				>
					<Card className="max-w-md w-full animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-xl text-neutralDark flex items-center gap-2">
								<AlertCircle className="h-6 w-6 text-neutralDark" />
								Confirm Delete
							</CardTitle>
							<CardDescription>
								Are you sure you want to delete this assignment? This action cannot be undone.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="p-4 border border-border rounded-lg bg-white">
								<p className="text-sm font-semibold text-neutralDark mb-2">
									Assignment: {deleteConfirm.title}
								</p>

								{deleteConfirm.submissionCount > 0 && (
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-destructive font-bold text-sm">
											<AlertCircle className="h-4 w-4" />
											WARNING:
										</div>
										<p className="text-sm text-muted-foreground">
											There are {deleteConfirm.submissionCount} student submissions.
										</p>
										<p className="text-sm text-neutralDark">
											Deleting this assignment will permanently remove all associated student data and submissions.
										</p>
									</div>
								)}
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<Button
									variant="outline"
									onClick={() => setDeleteConfirm(null)}
									className="px-6"
								>
									Cancel
								</Button>
								<Button
									variant="destructive"
									onClick={executeDelete}
									className="px-6 bg-red-600 hover:bg-red-700 text-white"
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}

