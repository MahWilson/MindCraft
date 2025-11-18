'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ClipboardCheck, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function AssessmentsPage() {
	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterStatus, setFilterStatus] = useState('all'); // all, draft, published
	const [userRole, setUserRole] = useState(null);
	const [deleting, setDeleting] = useState(null);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				try {
					const userDoc = await getDoc(doc(db, 'users', user.uid));
					if (userDoc.exists()) {
						const role = userDoc.data().role;
						setUserRole(role);
						
						// Only teachers and admins can access
						if (role !== 'teacher' && role !== 'admin') {
							router.push('/dashboard/student');
							return;
						}

						await loadAssessments();
					} else {
						// User document doesn't exist
						console.error('User document not found');
						setLoading(false);
						router.push('/login');
					}
				} catch (error) {
					console.error('Error checking user role:', error);
					setLoading(false);
				}
			} else {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [router]);

	async function loadAssessments() {
		try {
			setLoading(true);
			console.log('Loading assessments from Firestore...');
			
			// Read directly from Firestore (has auth context)
			// Try simple query first to avoid index issues
			let snapshot;
			try {
				console.log('Attempting to fetch assessments...');
				snapshot = await getDocs(collection(db, 'assessments'));
				console.log('Fetched assessments, count:', snapshot.size);
			} catch (fetchError) {
				console.error('Error fetching assessments:', fetchError.code, fetchError.message);
				throw fetchError;
			}
			
			const assessmentsList = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				// Only add assessments with required fields
				if (data && data.title) {
					assessmentsList.push({
						id: doc.id,
						...data,
					});
				} else {
					console.warn('Skipping invalid assessment document:', doc.id, data);
				}
			});
			
			// Sort manually by createdAt
			assessmentsList.sort((a, b) => {
				const aTime = a.createdAt?.toMillis?.() || 0;
				const bTime = b.createdAt?.toMillis?.() || 0;
				return bTime - aTime;
			});
			
			console.log('Processed assessments:', assessmentsList.length);
			setAssessments(assessmentsList);
		} catch (err) {
			console.error('Error loading assessments:', err.code, err.message);
			// Set empty array on error so page doesn't stay in loading state
			setAssessments([]);
			// Show error message to user
			alert(`Failed to load assessments: ${err.message}. Please check Firestore security rules.`);
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete(assessmentId, title) {
		if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
			return;
		}

		try {
			setDeleting(assessmentId);
			console.log('Deleting assessment:', assessmentId);
			
			// Delete directly from Firestore
			await deleteDoc(doc(db, 'assessments', assessmentId));
			
			console.log('Assessment deleted successfully');
			
			// Update local state
			setAssessments(assessments.filter((a) => a.id !== assessmentId));
			
			alert(`Assessment "${title}" deleted successfully`);
		} catch (err) {
			console.error('Error deleting assessment:', err.code, err.message);
			alert(`Failed to delete assessment: ${err.message}`);
		} finally {
			setDeleting(null);
		}
	}

	async function togglePublish(assessmentId, currentStatus) {
		try {
			console.log('Toggling publish status for:', assessmentId);
			
			// Update directly in Firestore
			await updateDoc(doc(db, 'assessments', assessmentId), {
				published: !currentStatus
			});
			
			console.log('Publish status updated');
			
			// Update local state
			setAssessments(
				assessments.map((a) =>
					a.id === assessmentId ? { ...a, published: !currentStatus } : a
				)
			);
		} catch (err) {
			console.error('Error updating assessment:', err.code, err.message);
			alert(`Failed to update assessment: ${err.message}`);
		}
	}

	const filteredAssessments = assessments.filter((assessment) => {
		// Skip invalid assessments
		if (!assessment || !assessment.title) {
			console.warn('Invalid assessment found:', assessment);
			return false;
		}
		
		// Search filter
		const matchesSearch =
			assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			assessment.description?.toLowerCase().includes(searchTerm.toLowerCase());

		// Status filter
		const matchesStatus =
			filterStatus === 'all' ||
			(filterStatus === 'published' && assessment.published) ||
			(filterStatus === 'draft' && !assessment.published);

		return matchesSearch && matchesStatus;
	});

	const draftCount = assessments.filter((a) => !a.published).length;
	const publishedCount = assessments.filter((a) => a.published).length;

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Assessments</h1>
					<p className="text-body text-muted-foreground">
						Create and manage quizzes, coding challenges, and assignments
					</p>
				</div>
				<Link href="/dashboard/assessments/new">
					<Button size="lg">
						<Plus className="h-4 w-4 mr-2" />
						Create Assessment
					</Button>
				</Link>
			</div>

			{/* Stats */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="card-hover">
					<CardHeader className="pb-3">
						<CardTitle className="text-h3">Total</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-4xl font-bold text-primary">{assessments.length}</p>
						<p className="text-caption text-muted-foreground mt-2">All assessments</p>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<CardTitle className="text-h3">Published</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-4xl font-bold text-success">{publishedCount}</p>
						<p className="text-caption text-muted-foreground mt-2">Visible to students</p>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<CardTitle className="text-h3">Drafts</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-4xl font-bold text-warning">{draftCount}</p>
						<p className="text-caption text-muted-foreground mt-2">Not yet published</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-4">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Search assessments..."
								className="pl-10"
							/>
						</div>
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<option value="all">All Status</option>
							<option value="published">Published</option>
							<option value="draft">Draft</option>
						</select>
					</div>
				</CardContent>
			</Card>

			{/* Assessments List */}
			{loading ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-8">Loading assessments...</p>
					</CardContent>
				</Card>
			) : filteredAssessments.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-12">
							<ClipboardCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
							<p className="text-h3 text-neutralDark mb-2">No assessments found</p>
							<p className="text-body text-muted-foreground mb-6">
								{searchTerm || filterStatus !== 'all'
									? 'Try adjusting your filters'
									: 'Get started by creating your first assessment'}
							</p>
							{!searchTerm && filterStatus === 'all' && (
								<Link href="/dashboard/assessments/new">
									<Button>
										<Plus className="h-4 w-4 mr-2" />
										Create Assessment
									</Button>
								</Link>
							)}
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-6">
					{filteredAssessments.map((assessment) => (
						<Card key={assessment.id} className="card-hover">
							<CardContent className="pt-6">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-h3 text-neutralDark">{assessment.title}</h3>
											<span
												className={`px-3 py-1 text-caption rounded-full ${
													assessment.published
														? 'bg-success/10 text-success'
														: 'bg-warning/10 text-warning'
												}`}
											>
												{assessment.published ? 'Published' : 'Draft'}
											</span>
											<span className="px-3 py-1 bg-primary/10 text-primary text-caption rounded-full">
												{assessment.type === 'quiz' && 'Quiz'}
												{assessment.type === 'coding' && 'Coding Challenge'}
												{assessment.type === 'assignment' && 'Assignment'}
											</span>
										</div>
										{assessment.description && (
											<p className="text-body text-muted-foreground mb-3">
												{assessment.description}
											</p>
										)}
										<div className="flex items-center gap-6 text-caption text-muted-foreground">
											<span>{assessment.questions?.length || 0} questions</span>
											{assessment.config?.attempts && (
												<span>{assessment.config.attempts} attempt(s)</span>
											)}
											{assessment.config?.timer && (
												<span>{assessment.config.timer} minutes</span>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2 ml-4">
										<Button
											variant="ghost"
											size="default"
											onClick={() => togglePublish(assessment.id, assessment.published)}
											title={assessment.published ? 'Unpublish' : 'Publish'}
										>
											<Eye className="h-5 w-5" />
										</Button>
										<Link href={`/dashboard/assessments/${assessment.id}/edit`}>
											<Button variant="ghost" size="default" title="Edit">
												<Edit className="h-5 w-5" />
											</Button>
										</Link>
										<Button
											variant="ghost"
											size="default"
											onClick={() => handleDelete(assessment.id, assessment.title)}
											disabled={deleting === assessment.id}
											className="text-error hover:text-error"
											title="Delete"
										>
											<Trash2 className="h-5 w-5" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}





