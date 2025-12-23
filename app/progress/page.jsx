'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Clock, Award, FileText, ClipboardCheck, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BarChart, LineChart } from '@tremor/react';

export default function ProgressPage() {
	const { language } = useLanguage();
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [courseProgress, setCourseProgress] = useState([]);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role === 'student') {
						await loadProgress(user.uid);
					}
				}
			} else {
				setCurrentUserId(null);
				setUserRole(null);
			}
		});

		return () => unsubscribe();
	}, []);

	async function loadProgress(userId) {
		setLoading(true);
		try {
			if (!userId) return;

			// Get all enrollments for this student
			const enrollmentsQuery = query(
				collection(db, 'enrollment'),
				where('studentId', '==', userId)
			);
			const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
			const enrollments = enrollmentsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			if (enrollments.length === 0) {
				setCourseProgress([]);
				setLoading(false);
				return;
			}

			// Get all submissions for this student
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('studentId', '==', userId)
			);
			const submissionsSnapshot = await getDocs(submissionsQuery);
			const submissions = submissionsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Group submissions by course
			const submissionsByCourse = {};
			const assessmentIds = new Set();
			const assignmentIds = new Set();

			submissions.forEach(sub => {
				if (sub.assessmentId) {
					assessmentIds.add(sub.assessmentId);
				}
				if (sub.assignmentId) {
					assignmentIds.add(sub.assignmentId);
				}
			});

			// Load assessments and assignments to get course IDs
			const assessments = {};
			const assignments = {};

			for (const assessmentId of assessmentIds) {
				try {
					const assessmentDoc = await getDoc(doc(db, 'assessment', assessmentId));
					if (assessmentDoc.exists()) {
						const data = assessmentDoc.data();
						assessments[assessmentId] = data;
						if (data.courseId) {
							if (!submissionsByCourse[data.courseId]) {
								submissionsByCourse[data.courseId] = { assessments: [], assignments: [] };
							}
							const sub = submissions.find(s => s.assessmentId === assessmentId);
							if (sub) {
								submissionsByCourse[data.courseId].assessments.push({
									...sub,
									assessmentTitle: data.title,
									assessmentType: data.type,
								});
							}
						}
					}
				} catch (err) {
					console.error(`Error loading assessment ${assessmentId}:`, err);
				}
			}

			for (const assignmentId of assignmentIds) {
				try {
					const assignmentDoc = await getDoc(doc(db, 'assignment', assignmentId));
					if (assignmentDoc.exists()) {
						const data = assignmentDoc.data();
						assignments[assignmentId] = data;
						if (data.courseId) {
							if (!submissionsByCourse[data.courseId]) {
								submissionsByCourse[data.courseId] = { assessments: [], assignments: [] };
							}
							const sub = submissions.find(s => s.assignmentId === assignmentId);
							if (sub) {
								submissionsByCourse[data.courseId].assignments.push({
									...sub,
									assignmentTitle: data.title,
								});
							}
						}
					}
				} catch (err) {
					console.error(`Error loading assignment ${assignmentId}:`, err);
				}
			}

			// Load course details and calculate progress
			const progressData = [];
			for (const enrollment of enrollments) {
				try {
					if (!enrollment.courseId) {
						console.warn('Enrollment missing courseId:', enrollment.id);
						continue;
					}
					const courseDoc = await getDoc(doc(db, 'course', enrollment.courseId));
					if (!courseDoc.exists()) {
						console.warn('Course not found for enrollment:', enrollment.courseId);
						continue;
					}

					const courseData = courseDoc.data();
					const enrollmentProgress = enrollment.progress || {
						completedModules: [],
						completedLessons: [],
						overallProgress: 0,
					};

					// Count total lessons and modules
					let totalLessons = 0;
					let totalModules = 0;

					if (courseData.modules && Array.isArray(courseData.modules)) {
						totalModules = courseData.modules.length;
						for (const moduleId of courseData.modules) {
							try {
								const moduleDoc = await getDoc(doc(db, 'module', moduleId));
								if (moduleDoc.exists()) {
									const moduleData = moduleDoc.data();
									if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
										totalLessons += moduleData.lessons.length;
									}
								}
							} catch (err) {
								console.error(`Error loading module ${moduleId}:`, err);
							}
						}
					}

					const completedLessons = enrollmentProgress.completedLessons?.length || 0;
					const completedModules = enrollmentProgress.completedModules?.length || 0;
					const overallProgress = enrollmentProgress.overallProgress || 0;

					// Get submissions for this course
					const courseSubmissions = submissionsByCourse[enrollment.courseId] || {
						assessments: [],
						assignments: [],
					};

					// Calculate average assessment score
					let totalAssessmentScore = 0;
					let totalAssessmentPoints = 0;
					courseSubmissions.assessments.forEach(sub => {
						if (sub.score !== undefined && sub.totalPoints) {
							totalAssessmentScore += sub.score;
							totalAssessmentPoints += sub.totalPoints;
						}
					});
					const avgAssessmentScore = totalAssessmentPoints > 0 
						? Math.round((totalAssessmentScore / totalAssessmentPoints) * 100) 
						: null;

					progressData.push({
						courseId: enrollment.courseId,
						courseTitle: courseData.title,
						courseDescription: courseData.description,
						enrolledAt: enrollment.enrolledAt,
						overallProgress,
						completedLessons,
						totalLessons,
						completedModules,
						totalModules,
						assessments: courseSubmissions.assessments,
						assignments: courseSubmissions.assignments,
						avgAssessmentScore,
					});
				} catch (err) {
					console.error(`Error loading course ${enrollment.courseId}:`, err);
				}
			}

			// Sort by enrollment date (most recent first)
			progressData.sort((a, b) => {
				const aTime = a.enrolledAt?.toDate ? a.enrolledAt.toDate().getTime() : 0;
				const bTime = b.enrolledAt?.toDate ? b.enrolledAt.toDate().getTime() : 0;
				return bTime - aTime;
			});

			setCourseProgress(progressData);
		} catch (err) {
			console.error('Error loading progress:', err);
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
			day: 'numeric'
		});
	}

	function formatDateTime(timestamp) {
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
						{language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	if (userRole !== 'student') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' 
							? 'Halaman ini hanya tersedia untuk pelajar.' 
							: 'This page is only available for students.'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' 
							? 'Ikuti kemajuan pembelajaran anda merentas semua kursus yang didaftarkan'
							: 'Track your learning progress across all enrolled courses'}
					</p>
				</div>
				<Link href="/weak-areas">
					<Button variant="outline" size="sm">
						{language === 'bm' ? 'Bidang Lemah' : 'Weak Areas'}
					</Button>
				</Link>
			</div>

			{/* Summary Cards */}
			{courseProgress.length > 0 && (
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">
										{language === 'bm' ? 'Kursus yang Didaftarkan' : 'Enrolled Courses'}
									</p>
									<p className="text-2xl font-bold text-neutralDark">{courseProgress.length}</p>
								</div>
								<BookOpen className="h-8 w-8 text-primary" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">
										{language === 'bm' ? 'Pelajaran Selesai' : 'Completed Lessons'}
									</p>
									<p className="text-2xl font-bold text-neutralDark">
										{courseProgress.reduce((sum, course) => sum + course.completedLessons, 0)}
									</p>
								</div>
								<CheckCircle2 className="h-8 w-8 text-success" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">
										{language === 'bm' ? 'Penilaian Selesai' : 'Assessments Completed'}
									</p>
									<p className="text-2xl font-bold text-neutralDark">
										{courseProgress.reduce((sum, course) => sum + course.assessments.length, 0)}
									</p>
								</div>
								<ClipboardCheck className="h-8 w-8 text-info" />
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Course Progress List */}
			{courseProgress.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground">
							{language === 'bm' 
								? 'Anda belum mendaftar dalam sebarang kursus lagi.'
								: "You haven't enrolled in any courses yet."}
						</p>
						<Link href="/courses/explore" className="mt-4 inline-block">
							<Button>{language === 'bm' ? 'Terokai Kursus' : 'Explore Courses'}</Button>
						</Link>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-6">
					{courseProgress.map((course) => (
						<Card key={course.courseId} className="overflow-hidden">
							<CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-white border-b-2 border-primary/20">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<CardTitle className="text-h3 mb-2 text-neutralDark">{course.courseTitle}</CardTitle>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<div className="flex items-center gap-1.5">
												<Calendar className="h-4 w-4" />
												{language === 'bm' ? 'Didaftarkan:' : 'Enrolled:'} {formatDate(course.enrolledAt)}
											</div>
										</div>
									</div>
									<Link href={`/courses/${course.courseId}`}>
										<Button variant="outline" size="sm">
											{language === 'bm' ? 'Lihat Kursus' : 'View Course'}
										</Button>
									</Link>
								</div>
							</CardHeader>
							<CardContent className="space-y-6 pt-6">
								{/* Overall Progress */}
								<div>
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm font-medium text-neutralDark">
											{language === 'bm' ? 'Kemajuan Keseluruhan' : 'Overall Progress'}
										</span>
										<span className="text-sm font-bold text-primary">{course.overallProgress}%</span>
									</div>
									<div className="w-full bg-neutralLight rounded-full h-3">
										<div
											className="bg-primary rounded-full h-3 transition-all duration-300"
											style={{ width: `${course.overallProgress}%` }}
										/>
									</div>
								</div>

								{/* Progress Metrics */}
								<div className="grid grid-cols-2 gap-4">
									<div className="p-4 bg-neutralLight rounded-lg">
										<div className="flex items-center gap-2 mb-1">
											<BookOpen className="h-5 w-5 text-primary" />
											<span className="text-sm font-medium">
												{language === 'bm' ? 'Pelajaran' : 'Lessons'}
											</span>
										</div>
										<p className="text-2xl font-bold text-neutralDark">
											{course.completedLessons} / {course.totalLessons}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{course.totalLessons > 0 
												? Math.round((course.completedLessons / course.totalLessons) * 100) 
												: 0}% {language === 'bm' ? 'selesai' : 'completed'}
										</p>
									</div>
									<div className="p-4 bg-neutralLight rounded-lg">
										<div className="flex items-center gap-2 mb-1">
											<CheckCircle2 className="h-5 w-5 text-success" />
											<span className="text-sm font-medium">
												{language === 'bm' ? 'Modul' : 'Modules'}
											</span>
										</div>
										<p className="text-2xl font-bold text-neutralDark">
											{course.completedModules} / {course.totalModules}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{course.totalModules > 0 
												? Math.round((course.completedModules / course.totalModules) * 100) 
												: 0}% {language === 'bm' ? 'selesai' : 'completed'}
										</p>
									</div>
								</div>

								{/* Assessment Scores */}
								{course.assessments.length > 0 && (
									<div>
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-h4 font-semibold text-neutralDark flex items-center gap-2">
												<ClipboardCheck className="h-5 w-5 text-info" />
												{language === 'bm' ? 'Skor Penilaian' : 'Assessment Scores'}
											</h3>
											{course.avgAssessmentScore !== null && (
												<span className="text-sm font-medium text-info">
													{language === 'bm' ? 'Purata:' : 'Average:'} {course.avgAssessmentScore}%
												</span>
											)}
										</div>
										<div className="space-y-2">
											{course.assessments.map((submission, idx) => (
												<div
													key={idx}
													className="flex items-center justify-between p-3 border rounded-lg hover:bg-neutralLight transition-colors"
												>
													<div className="flex-1">
														<p className="font-medium text-neutralDark">{submission.assessmentTitle}</p>
														<p className="text-xs text-muted-foreground capitalize">
															{submission.assessmentType} • {language === 'bm' ? 'Dihantar:' : 'Submitted:'} {formatDateTime(submission.submittedAt)}
														</p>
													</div>
													<div className="flex items-center gap-3">
														{submission.feedbackReleased && (submission.grade !== undefined || submission.feedback) ? (
															<div className="text-right">
																{submission.score !== undefined && submission.totalPoints ? (
																	<>
																		<p className="font-bold text-primary">
																			{submission.score} / {submission.totalPoints}
																		</p>
																		<p className="text-xs text-muted-foreground">
																			{Math.round((submission.score / submission.totalPoints) * 100)}%
																		</p>
																	</>
																) : submission.grade !== undefined ? (
																	<p className="font-bold text-primary">
																		{submission.grade}%
																	</p>
																) : null}
																{submission.feedback && (
																	<details className="text-xs text-muted-foreground cursor-pointer mt-1">
																		<summary className="hover:text-primary">
																			{language === 'bm' ? 'Lihat maklum balas' : 'View feedback'}
																		</summary>
																		<div className="mt-2 p-2 bg-neutralLight rounded border" dangerouslySetInnerHTML={{ __html: submission.feedback }} />
																	</details>
																)}
															</div>
														) : submission.score !== undefined && submission.totalPoints ? (
															<div className="text-right">
																<p className="font-bold text-primary">
																	{submission.score} / {submission.totalPoints}
																</p>
																<p className="text-xs text-muted-foreground">
																	{Math.round((submission.score / submission.totalPoints) * 100)}%
																</p>
																{submission.feedback && !submission.feedbackReleased && (
																	<p className="text-xs text-muted-foreground mt-1">
																		{language === 'bm' ? 'Belum dilepaskan' : 'Not released'}
																	</p>
																)}
															</div>
														) : (
															<span className="text-sm text-muted-foreground">
																{language === 'bm' ? 'Menunggu' : 'Pending'}
															</span>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Assignment Grades */}
								{course.assignments.length > 0 && (
									<div>
										<h3 className="text-h4 font-semibold text-neutralDark flex items-center gap-2 mb-4">
											<FileText className="h-5 w-5 text-secondary" />
											{language === 'bm' ? 'Gred Tugasan' : 'Assignment Grades'}
										</h3>
										<div className="space-y-2">
											{course.assignments.map((submission, idx) => (
												<div
													key={idx}
													className="flex items-center justify-between p-3 border rounded-lg hover:bg-neutralLight transition-colors"
												>
													<div className="flex-1">
														<p className="font-medium text-neutralDark">{submission.assignmentTitle}</p>
														<p className="text-xs text-muted-foreground">
															{language === 'bm' ? 'Dihantar:' : 'Submitted:'} {formatDateTime(submission.submittedAt)}
														</p>
													</div>
													<div className="flex items-center gap-3">
														{submission.feedbackReleased && submission.grade !== undefined ? (
															<div className="text-right">
																<p className="font-bold text-secondary">
																	{submission.grade}%
																</p>
																{submission.feedback && (
																	<details className="text-xs text-muted-foreground cursor-pointer">
																		<summary className="hover:text-primary">
																			{language === 'bm' ? 'Lihat maklum balas' : 'View feedback'}
																		</summary>
																		<div className="mt-2 p-2 bg-neutralLight rounded border" dangerouslySetInnerHTML={{ __html: submission.feedback }} />
																	</details>
																)}
															</div>
														) : submission.grade !== undefined ? (
															<div className="text-right">
																<p className="font-bold text-secondary">
																	{submission.grade}%
																</p>
																<p className="text-xs text-muted-foreground">
																	{language === 'bm' ? 'Belum dilepaskan' : 'Not released'}
																</p>
															</div>
														) : (
															<span className="text-sm text-muted-foreground">
																{language === 'bm' ? 'Menunggu' : 'Pending'}
															</span>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Empty State for Assessments/Assignments */}
								{course.assessments.length === 0 && course.assignments.length === 0 && (
									<div className="text-center py-4 text-muted-foreground">
										<p className="text-sm">
											{language === 'bm' 
												? 'Tiada penilaian atau tugasan yang selesai lagi.'
												: 'No assessments or assignments completed yet.'}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

