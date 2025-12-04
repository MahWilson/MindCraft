'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClipboardCheck, FileText, Code, Clock, Calendar, Upload, ArrowRight, Edit2, Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssessmentsPage() {
	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(null);
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
		if (userRole && currentUserId) {
			loadAssessments();
		}
	}, [userRole, currentUserId]);

	async function loadAssessments() {
		setLoading(true);
		try {
			let assessmentsQuery;
			
			if (userRole === 'student') {
				// First, get all published assessments
				// Note: We query without orderBy first to avoid index issues, then sort client-side
				assessmentsQuery = query(
					collection(db, 'assessment'),
					where('published', '==', true)
				);
				
				const snapshot = await getDocs(assessmentsQuery);
				const allAssessments = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
				})).sort((a, b) => {
					// Sort by createdAt if available, otherwise by id
					const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
					const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
					return bTime - aTime;
				});

				// Then, filter by enrollment - only show assessments for courses the student is enrolled in
				if (currentUserId) {
					const enrollmentsQuery = query(
						collection(db, 'enrollment'),
						where('studentId', '==', currentUserId)
					);
					const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
					const enrolledCourseIds = new Set(
						enrollmentsSnapshot.docs.map(doc => doc.data().courseId)
					);

					// Filter assessments to only those for enrolled courses
					const filteredAssessments = allAssessments.filter(assessment => 
						assessment.courseId && enrolledCourseIds.has(assessment.courseId)
					);

					setAssessments(filteredAssessments);
				} else {
					setAssessments([]);
				}
			} else {
				// Teachers and admins see all assessments
				assessmentsQuery = query(
					collection(db, 'assessment'),
					orderBy('createdAt', 'desc')
				);

				const snapshot = await getDocs(assessmentsQuery);
				const loadedAssessments = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
				}));

				setAssessments(loadedAssessments);
			}
		} catch (err) {
			console.error('Error loading assessments:', err);
		} finally {
			setLoading(false);
		}
	}

	function getAssessmentIcon(type) {
		switch (type) {
			case 'quiz':
				return <ClipboardCheck className="h-5 w-5 text-primary" />;
			case 'assignment':
				return <FileText className="h-5 w-5 text-secondary" />;
			case 'coding':
				return <Code className="h-5 w-5 text-success" />;
			default:
				return <ClipboardCheck className="h-5 w-5" />;
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

	function stripHtml(html) {
		if (!html) return '';
		const tmp = document.createElement('DIV');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}

	async function handleDelete(assessmentId) {
		if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
			return;
		}

		try {
			await deleteDoc(doc(db, 'assessment', assessmentId));
			setAssessments(prev => prev.filter(a => a.id !== assessmentId));
		} catch (err) {
			console.error('Error deleting assessment:', err);
			alert('Failed to delete assessment: ' + (err.message || 'Unknown error'));
		}
	}

	async function togglePublish(assessment) {
		try {
			await updateDoc(doc(db, 'assessment', assessment.id), {
				published: !assessment.published,
				updatedAt: new Date(),
			});
			loadAssessments();
		} catch (err) {
			console.error('Error updating assessment:', err);
			alert('Failed to update assessment: ' + (err.message || 'Unknown error'));
		}
	}

	function isDeadlinePassed(deadline) {
		if (!deadline) return false;
		const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
		return deadlineDate < new Date();
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Assessments</h1>
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
					<h1 className="text-h1 text-neutralDark mb-2">Assessments</h1>
					<p className="text-body text-muted-foreground">
						{userRole === 'student' 
							? 'View and submit your assignments' 
							: 'Manage assessments and view submissions'}
					</p>
				</div>
				{userRole !== 'student' && (
					<Link href="/assessments/new">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Create Assessment
						</Button>
					</Link>
				)}
			</div>

			{/* Assessments List */}
			{assessments.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground">
							No assessments available yet.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{assessments.map((assessment) => {
						const deadlinePassed = assessment.config?.endDate ? isDeadlinePassed(assessment.config.endDate) : false;
						
						return (
							<Card key={assessment.id} className="card-hover">
								<CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-white border-b-2 border-primary/20 pb-4">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-h3 mb-3 text-neutralDark font-semibold">{assessment.title}</CardTitle>
											<div className="flex flex-wrap gap-2">
												{assessment.published ? (
													<span className="text-xs bg-success/10 text-success px-2.5 py-1.5 rounded-md font-medium border border-success/20">
														Published
													</span>
												) : (
													<span className="text-xs bg-warning/10 text-warning px-2.5 py-1.5 rounded-md font-medium border border-warning/20">
														Draft
													</span>
												)}
												<span className="text-xs bg-info/10 text-info px-2.5 py-1.5 rounded-md font-medium border border-info/20 capitalize">
													{assessment.type || 'quiz'}
												</span>
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
									{assessment.description && (
										<p className="text-body text-muted-foreground line-clamp-2">
											{stripHtml(assessment.description)}
										</p>
									)}
									
									{assessment.questions && (
										<p className="text-sm text-muted-foreground">
											{assessment.questions.length} {assessment.questions.length === 1 ? 'question' : 'questions'}
										</p>
									)}
									
									{assessment.config && (
										<div className="space-y-2 text-sm">
											{assessment.config.startDate && (
												<div className="flex items-center gap-2 text-muted-foreground">
													<Calendar className="h-5 w-5" />
													<span>Starts: {formatDate(assessment.config.startDate)}</span>
												</div>
											)}
											{assessment.config.endDate && (
												<div className="flex items-center gap-2">
													<Clock className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
													<span className={deadlinePassed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
														Due: {formatDate(assessment.config.endDate)}
													</span>
												</div>
											)}
										</div>
									)}

									<div className="flex flex-wrap gap-2 pt-2 border-t">
										{userRole === 'student' ? (
											<Link 
												href={assessment.type === 'assignment' 
													? `/assessments/${assessment.id}/submit` 
													: `/assessments/${assessment.id}/take`} 
												className="flex-1 min-w-[100px]"
											>
												<Button variant="default" className="w-full" title={assessment.type === 'assignment' ? 'Submit Assignment' : 'Take Assessment'}>
													{assessment.type === 'assignment' ? (
														<>
															<Upload className="h-5 w-5 mr-2" />
															Submit
														</>
													) : (
														<>
															Take Assessment
															<ArrowRight className="h-5 w-5 ml-2" />
														</>
													)}
												</Button>
											</Link>
										) : (
											<>
												<Link href={`/assessments/${assessment.id}/edit`} className="flex-1 min-w-[100px]">
													<Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10 hover:border-primary/40" size="sm" title="Edit Assessment">
														<Edit2 className="h-5 w-5 mr-2 text-primary" />
														Edit
													</Button>
												</Link>
												<Button
													variant="outline"
													size="sm"
													onClick={() => togglePublish(assessment)}
													title={assessment.published ? 'Unpublish' : 'Publish'}
													className={assessment.published 
														? "border-warning/20 hover:bg-warning/10 hover:border-warning/40" 
														: "border-success/20 hover:bg-success/10 hover:border-success/40"}
												>
													{assessment.published ? (
														<>
															<EyeOff className="h-5 w-5 mr-2 text-warning" />
															Unpublish
														</>
													) : (
														<>
															<Eye className="h-5 w-5 mr-2 text-success" />
															Publish
														</>
													)}
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleDelete(assessment.id)}
													title="Delete Assessment"
													className="border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 text-destructive hover:text-destructive"
												>
													<Trash2 className="h-5 w-5 mr-2 fill-destructive text-destructive" />
													Delete
												</Button>
											</>
										)}
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

