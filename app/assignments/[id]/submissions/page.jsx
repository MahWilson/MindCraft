'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FileText, User, Calendar, CheckCircle, Clock, AlertCircle, Edit } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AssignmentSubmissionsPage() {
	const params = useParams();
	const router = useRouter();
	const { language } = useLanguage();
	const assignmentId = params.id;

	const [assignment, setAssignment] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [students, setStudents] = useState({});
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role === 'teacher' || role === 'admin') {
						loadData();
					} else {
						router.push('/dashboard/student');
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	async function loadData() {
		setLoading(true);
		try {
			// Load assignment
			const assignmentDoc = await getDoc(doc(db, 'assignment', assignmentId));
			if (!assignmentDoc.exists()) {
				setLoading(false);
				return;
			}
			setAssignment({ id: assignmentDoc.id, ...assignmentDoc.data() });

			// Load submissions
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assignmentId', '==', assignmentId),
				orderBy('submittedAt', 'desc')
			);
			const submissionsSnapshot = await getDocs(submissionsQuery);
			const loadedSubmissions = submissionsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
			setSubmissions(loadedSubmissions);

			// Load student info
			const studentIds = [...new Set(loadedSubmissions.map(s => s.studentId))];
			const studentData = {};
			for (const studentId of studentIds) {
				try {
					const studentDoc = await getDoc(doc(db, 'user', studentId));
					if (studentDoc.exists()) {
						studentData[studentId] = { id: studentDoc.id, ...studentDoc.data() };
					}
				} catch (err) {
					console.error(`Error loading student ${studentId}:`, err);
				}
			}
			setStudents(studentData);
		} catch (err) {
			console.error('Error loading data:', err);
		} finally {
			setLoading(false);
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return language === 'bm' ? 'Tiada' : 'N/A';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { 
			year: 'numeric', 
			month: 'short', 
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Penyerahan' : 'Submissions'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	if (!assignment) {
		return (
			<div className="space-y-8">
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali' : 'Back'}
					</Button>
				</Link>
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-body text-muted-foreground">
							{language === 'bm' ? 'Tugasan tidak dijumpai' : 'Assignment not found'}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali ke Tugasan' : 'Back to Assignments'}
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">{assignment.title}</h1>
				<p className="text-body text-muted-foreground">
					{language === 'bm' ? 'Lihat dan gred semua penyerahan' : 'View and grade all submissions'}
				</p>
			</div>

			{/* Submissions List */}
			{submissions.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground">
							{language === 'bm' 
								? 'Tiada penyerahan lagi untuk tugasan ini.'
								: 'No submissions yet for this assignment.'}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{submissions.map((submission) => {
						const student = students[submission.studentId];
						const isGraded = submission.grade !== undefined || submission.feedback;
						const isReleased = submission.feedbackReleased;

						return (
							<Card key={submission.id} className="card-hover">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-h4 mb-2">
												{student?.name || student?.email || 'Unknown Student'}
											</CardTitle>
											<div className="flex flex-wrap gap-2">
												{submission.submittedAt && (
													<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
														<Calendar className="h-4 w-4" />
														{language === 'bm' ? 'Dihantar:' : 'Submitted:'} {formatDate(submission.submittedAt)}
													</div>
												)}
												{isReleased ? (
													<span className="text-xs bg-success/10 text-success px-2.5 py-1.5 rounded-md font-medium border border-success/20 flex items-center gap-1.5">
														<CheckCircle className="h-3.5 w-3.5" />
														{language === 'bm' ? 'Telah dilepaskan' : 'Released'}
													</span>
												) : isGraded ? (
													<span className="text-xs bg-warning/10 text-warning px-2.5 py-1.5 rounded-md font-medium border border-warning/20 flex items-center gap-1.5">
														<Clock className="h-3.5 w-3.5" />
														{language === 'bm' ? 'Belum dilepaskan' : 'Not Released'}
													</span>
												) : (
													<span className="text-xs bg-info/10 text-info px-2.5 py-1.5 rounded-md font-medium border border-info/20 flex items-center gap-1.5">
														<AlertCircle className="h-3.5 w-3.5" />
														{language === 'bm' ? 'Menunggu gred' : 'Pending Grade'}
													</span>
												)}
											</div>
										</div>
										<Link href={`/submissions/${submission.id}/grade`}>
											<Button variant="outline" size="sm">
												<Edit className="h-4 w-4 mr-2" />
												{language === 'bm' ? 'Gred' : 'Grade'}
											</Button>
										</Link>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{submission.files && submission.files.length > 0 && (
											<div>
												<p className="text-sm font-medium mb-2">
													{language === 'bm' ? 'Fail:' : 'Files:'} {submission.files.length}
												</p>
												<div className="flex flex-wrap gap-2">
													{submission.files.map((file, idx) => (
														<span key={idx} className="text-xs bg-neutralLight px-2 py-1 rounded">
															{file.name}
														</span>
													))}
												</div>
											</div>
										)}
										{submission.grade !== undefined && (
											<div>
												<p className="text-sm font-medium">
													{language === 'bm' ? 'Gred:' : 'Grade:'} <span className="text-primary font-bold">{submission.grade}%</span>
												</p>
											</div>
										)}
										{submission.feedback && isReleased && (
											<div>
												<p className="text-sm font-medium mb-1">
													{language === 'bm' ? 'Maklum Balas:' : 'Feedback:'}
												</p>
												<div className="text-sm text-muted-foreground p-3 bg-neutralLight rounded-lg" dangerouslySetInnerHTML={{ __html: submission.feedback }} />
											</div>
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

