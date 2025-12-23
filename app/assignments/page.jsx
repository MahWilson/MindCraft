'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Plus, Edit2, Trash2, Calendar, Clock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AssignmentsPage() {
	const { language } = useLanguage();
	const [assignments, setAssignments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(null);
	const router = useRouter();

	// Translations
	const translations = {
		en: {
			pageTitle: 'Assignments',
			pageDescription: 'Create and manage assignments for your courses',
			createAssignment: 'Create Assignment',
			loading: 'Loading...',
			accessDenied: 'Access denied. Only teachers and admins can manage assignments.',
			noAssignments: 'No assignments created yet.',
			createFirstAssignment: 'Create Your First Assignment',
			published: 'Published',
			draft: 'Draft',
			open: 'Open',
			closed: 'Closed',
			pastDue: 'Past Due',
			course: 'Course:',
			due: 'Due:',
			noDateSet: 'No date set',
			edit: 'Edit',
			unpublish: 'Unpublish',
			publish: 'Publish',
			close: 'Close',
			delete: 'Delete',
			deleteConfirm: 'Are you sure you want to delete this assignment? This action cannot be undone.',
			deleteFailed: 'Failed to delete assignment: ',
			updateFailed: 'Failed to update assignment: ',
			editTitle: 'Edit Assignment',
			publishTitle: 'Publish',
			unpublishTitle: 'Unpublish',
			closeTitle: 'Close Assignment',
			openTitle: 'Open Assignment',
			deleteTitle: 'Delete Assignment',
		},
		bm: {
			pageTitle: 'Tugasan',
			pageDescription: 'Cipta dan urus tugasan untuk kursus anda',
			createAssignment: 'Cipta Tugasan',
			loading: 'Memuatkan...',
			accessDenied: 'Akses ditolak. Hanya guru dan admin boleh menguruskan tugasan.',
			noAssignments: 'Tiada tugasan dicipta lagi.',
			createFirstAssignment: 'Cipta Tugasan Pertama Anda',
			published: 'Diterbitkan',
			draft: 'Draf',
			open: 'Buka',
			closed: 'Tutup',
			pastDue: 'Melepasi Tarikh Akhir',
			course: 'Kursus:',
			due: 'Tarikh Akhir:',
			noDateSet: 'Tiada tarikh ditetapkan',
			edit: 'Edit',
			unpublish: 'Nyahterbit',
			publish: 'Terbitkan',
			close: 'Tutup',
			delete: 'Padam',
			deleteConfirm: 'Adakah anda pasti ingin memadam tugasan ini? Tindakan ini tidak boleh dibatalkan.',
			deleteFailed: 'Gagal memadam tugasan: ',
			updateFailed: 'Gagal mengemaskini tugasan: ',
			editTitle: 'Edit Tugasan',
			publishTitle: 'Terbitkan',
			unpublishTitle: 'Nyahterbit',
			closeTitle: 'Tutup Tugasan',
			openTitle: 'Buka Tugasan',
			deleteTitle: 'Padam Tugasan',
		},
	};

	const t = translations[language] || translations.en;

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
		if (userRole && (userRole === 'teacher' || userRole === 'admin')) {
			loadAssignments();
		} else if (userRole && userRole === 'student') {
			// Students should be redirected or see a different view
			router.push('/dashboard/student');
		}
	}, [userRole, router]);

	async function loadAssignments() {
		setLoading(true);
		try {
			const assignmentsQuery = query(
				collection(db, 'assignment'),
				orderBy('createdAt', 'desc')
			);

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

	async function handleDelete(assignmentId) {
		if (!confirm(t.deleteConfirm)) {
			return;
		}

		try {
			await deleteDoc(doc(db, 'assignment', assignmentId));
			setAssignments(prev => prev.filter(a => a.id !== assignmentId));
		} catch (err) {
			console.error('Error deleting assignment:', err);
			alert(t.deleteFailed + (err.message || 'Unknown error'));
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
			alert(t.updateFailed + (err.message || 'Unknown error'));
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
			alert(t.updateFailed + (err.message || 'Unknown error'));
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return t.noDateSet;
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

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">{t.pageTitle}</h1>
					<p className="text-body text-muted-foreground">{t.loading}</p>
				</div>
			</div>
		);
	}

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">{t.pageTitle}</h1>
					<p className="text-body text-muted-foreground">{t.accessDenied}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">{t.pageTitle}</h1>
					<p className="text-body text-muted-foreground">{t.pageDescription}</p>
				</div>
				<Link href="/assignments/new">
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						{t.createAssignment}
					</Button>
				</Link>
			</div>

			{/* Assignments List */}
			{assignments.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground mb-4">
							{t.noAssignments}
						</p>
						<Link href="/assignments/new">
							<Button>{t.createFirstAssignment}</Button>
						</Link>
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
														{t.published}
													</span>
												) : (
													<span className="text-xs bg-warning/10 text-warning px-2.5 py-1.5 rounded-md font-medium border border-warning/20">
														{t.draft}
													</span>
												)}
												{assignment.isOpen ? (
													<span className="text-xs bg-info/10 text-info px-2.5 py-1.5 rounded-md font-medium border border-info/20 flex items-center gap-1.5">
														<CheckCircle className="h-3.5 w-3.5" />
														{t.open}
													</span>
												) : (
													<span className="text-xs bg-muted/50 text-muted-foreground px-2.5 py-1.5 rounded-md font-medium border border-border flex items-center gap-1.5">
														<XCircle className="h-3.5 w-3.5" />
														{t.closed}
													</span>
												)}
												{deadlinePassed && (
													<span className="text-xs bg-destructive/10 text-destructive px-2.5 py-1.5 rounded-md font-medium border border-destructive/20 flex items-center gap-1.5">
														<AlertCircle className="h-3.5 w-3.5" />
														{t.pastDue}
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
											{t.course} {assignment.courseTitle}
										</p>
									)}

									{assignment.deadline && (
										<div className="flex items-center gap-2 text-sm">
											<Calendar className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
											<span className={deadlinePassed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
												{t.due} {formatDate(assignment.deadline)}
											</span>
										</div>
									)}

									<div className="flex flex-wrap gap-2 pt-2 border-t">
										<Link href={`/assignments/${assignment.id}/edit`} className="flex-1 min-w-[100px]">
											<Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10 hover:border-primary/40" size="sm" title={t.editTitle}>
												<Edit2 className="h-5 w-5 mr-2 text-primary" />
												{t.edit}
											</Button>
										</Link>
										<Button
											variant="outline"
											size="sm"
											onClick={() => togglePublish(assignment)}
											title={assignment.status === 'published' ? t.unpublishTitle : t.publishTitle}
											className={assignment.status === 'published' 
												? "border-warning/20 hover:bg-warning/10 hover:border-warning/40" 
												: "border-success/20 hover:bg-success/10 hover:border-success/40"}
										>
											{assignment.status === 'published' ? (
												<>
													<EyeOff className="h-5 w-5 mr-2 text-warning" />
													{t.unpublish}
												</>
											) : (
												<>
													<Eye className="h-5 w-5 mr-2 text-success" />
													{t.publish}
												</>
											)}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => toggleOpen(assignment)}
											title={assignment.isOpen ? t.closeTitle : t.openTitle}
											className={assignment.isOpen 
												? "border-2 border-destructive/60 hover:bg-destructive/10 hover:border-destructive text-destructive hover:text-destructive" 
												: "border-info/20 hover:bg-info/10 hover:border-info/40"}
										>
											{assignment.isOpen ? (
												<>
													<XCircle className="h-5 w-5 mr-2 fill-destructive text-destructive" />
													{t.close}
												</>
											) : (
												<>
													<CheckCircle className="h-5 w-5 mr-2 text-info" />
													{t.open}
												</>
											)}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDelete(assignment.id)}
											title={t.deleteTitle}
											className="border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 text-destructive hover:text-destructive"
										>
											<Trash2 className="h-5 w-5 mr-2 fill-destructive text-destructive" />
											{t.delete}
										</Button>
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

