'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, User, Calendar, CheckCircle, Clock, AlertCircle, Edit, Search, Filter } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Input } from '@/components/ui/input';

export default function AssessmentSubmissionsPage() {
	const params = useParams();
	const router = useRouter();
	const { language } = useLanguage();
	const assessmentId = params.id;

	const [assessment, setAssessment] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [filteredSubmissions, setFilteredSubmissions] = useState([]);
	const [students, setStudents] = useState({});
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'graded', 'released'

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
			// Load assessment
			const assessmentDoc = await getDoc(doc(db, 'assessment', assessmentId));
			if (!assessmentDoc.exists()) {
				setLoading(false);
				return;
			}
			setAssessment({ id: assessmentDoc.id, ...assessmentDoc.data() });

			// Load submissions
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('assessmentId', '==', assessmentId),
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
			setFilteredSubmissions(loadedSubmissions);
		} catch (err) {
			console.error('Error loading data:', err);
		} finally {
			setLoading(false);
		}
	}

	// Filter submissions based on search and status
	useEffect(() => {
		let filtered = [...submissions];

		// Filter by search query (student name or email)
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(sub => {
				const student = students[sub.studentId];
				const name = (student?.name || '').toLowerCase();
				const email = (student?.email || '').toLowerCase();
				return name.includes(query) || email.includes(query);
			});
		}

		// Filter by status
		if (statusFilter !== 'all') {
			filtered = filtered.filter(sub => {
				const isGraded = sub.grade !== undefined || sub.feedback;
				const isReleased = sub.feedbackReleased;
				if (statusFilter === 'pending') return !isGraded;
				if (statusFilter === 'graded') return isGraded && !isReleased;
				if (statusFilter === 'released') return isReleased;
				return true;
			});
		}

		setFilteredSubmissions(filtered);
	}, [submissions, searchQuery, statusFilter, students]);

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

	if (!assessment) {
		return (
			<div className="space-y-8">
				<Link href="/assessments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali' : 'Back'}
					</Button>
				</Link>
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-body text-muted-foreground">
							{language === 'bm' ? 'Penilaian tidak dijumpai' : 'Assessment not found'}
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
				<Link href="/assessments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali ke Penilaian' : 'Back to Assessments'}
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">{assessment.title}</h1>
				<p className="text-body text-muted-foreground">
					{language === 'bm' ? 'Lihat dan gred semua penyerahan' : 'View and grade all submissions'}
				</p>
			</div>

			{/* Filters and Search */}
			{submissions.length > 0 && (
				<Card>
					<CardContent className="pt-6">
						<div className="flex flex-col md:flex-row gap-4">
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									type="text"
									placeholder={language === 'bm' ? 'Cari pelajar...' : 'Search students...'}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10"
								/>
							</div>
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-muted-foreground" />
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
								>
									<option value="all">{language === 'bm' ? 'Semua Status' : 'All Status'}</option>
									<option value="pending">{language === 'bm' ? 'Menunggu Gred' : 'Pending Grade'}</option>
									<option value="graded">{language === 'bm' ? 'Sudah Digred' : 'Graded'}</option>
									<option value="released">{language === 'bm' ? 'Telah Dilepaskan' : 'Released'}</option>
								</select>
							</div>
						</div>
						{filteredSubmissions.length !== submissions.length && (
							<p className="text-sm text-muted-foreground mt-2">
								{language === 'bm' 
									? `Menunjukkan ${filteredSubmissions.length} daripada ${submissions.length} penyerahan`
									: `Showing ${filteredSubmissions.length} of ${submissions.length} submissions`}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* Submissions List */}
			{filteredSubmissions.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground">
							{language === 'bm' 
								? 'Tiada penyerahan lagi untuk penilaian ini.'
								: 'No submissions yet for this assessment.'}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{filteredSubmissions.map((submission) => {
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
												{submission.score !== undefined && submission.totalPoints && (
													<div className="text-sm font-medium">
														{language === 'bm' ? 'Skor:' : 'Score:'} {submission.score} / {submission.totalPoints} 
														({Math.round((submission.score / submission.totalPoints) * 100)}%)
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
										{submission.answers && Object.keys(submission.answers).length > 0 && (
											<div>
												<p className="text-sm font-medium mb-2">
													{language === 'bm' ? 'Jawapan:' : 'Answers:'} {Object.keys(submission.answers).length} {language === 'bm' ? 'soalan' : 'questions'}
												</p>
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

