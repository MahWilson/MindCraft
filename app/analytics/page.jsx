'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
	TrendingUp, 
	TrendingDown, 
	Users, 
	AlertTriangle, 
	Download, 
	BookOpen,
	BarChart3,
	Activity,
	Target
} from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BarChart, LineChart, AreaChart } from '@tremor/react';

export default function AnalyticsPage() {
	const { language } = useLanguage();
	const [loading, setLoading] = useState(true);
	const [analyticsLoading, setAnalyticsLoading] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [selectedCourseId, setSelectedCourseId] = useState(null);
	const [courses, setCourses] = useState([]);
	const [analyticsData, setAnalyticsData] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				try {
					const userDoc = await getDoc(doc(db, 'user', user.uid));
					if (userDoc.exists()) {
						const role = userDoc.data().role;
						setUserRole(role);
						if (role === 'teacher') {
							await loadTeacherCourses(user.uid);
						} else {
							setLoading(false);
						}
					} else {
						setLoading(false);
					}
				} catch (err) {
					console.error('Error loading user data:', err);
					setLoading(false);
				}
			} else {
				setCurrentUserId(null);
				setUserRole(null);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (selectedCourseId && currentUserId && userRole === 'teacher') {
			loadAnalytics(selectedCourseId);
		}
	}, [selectedCourseId, currentUserId, userRole]);

	async function loadTeacherCourses(teacherId) {
		try {
			// Get all courses created by this teacher
			// Try with orderBy first, fallback if index doesn't exist
			let coursesSnapshot;
			try {
				const coursesQuery = query(
					collection(db, 'course'),
					where('createdBy', '==', teacherId),
					orderBy('createdAt', 'desc')
				);
				coursesSnapshot = await getDocs(coursesQuery);
			} catch (err) {
				// If orderBy fails (likely missing index), try without it
				if (err.code === 'failed-precondition' || err.message?.includes('index')) {
					console.warn('Firestore index may be missing, using fallback query');
					const fallbackQuery = query(
						collection(db, 'course'),
						where('createdBy', '==', teacherId)
					);
					coursesSnapshot = await getDocs(fallbackQuery);
				} else {
					throw err;
				}
			}

			const coursesList = coursesSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Sort client-side if orderBy wasn't used
			if (coursesList.length > 0 && coursesList[0].createdAt) {
				coursesList.sort((a, b) => {
					const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
					const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
					return bTime - aTime;
				});
			}

			setCourses(coursesList);
			if (coursesList.length > 0 && !selectedCourseId) {
				setSelectedCourseId(coursesList[0].id);
			}
		} catch (err) {
			console.error('Error loading courses:', err);
		} finally {
			setLoading(false);
		}
	}

	async function loadAnalytics(courseId) {
		if (!courseId) {
			setAnalyticsLoading(false);
			return;
		}
		setAnalyticsLoading(true);
		try {
			// Get all enrollments for this course
			const enrollmentsQuery = query(
				collection(db, 'enrollment'),
				where('courseId', '==', courseId)
			);
			const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
			const enrollments = enrollmentsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			if (enrollments.length === 0) {
				setAnalyticsData({
					enrollments: [],
					completionRates: [],
					scoreTrends: [],
					atRiskStudents: [],
					topicHeatmap: [],
					overallStats: {
						totalStudents: 0,
						avgCompletionRate: 0,
						avgScore: 0,
					},
					courseTitle: courseData.title,
				});
				setAnalyticsLoading(false);
				return;
			}

			// Get course details
			const courseDoc = await getDoc(doc(db, 'course', courseId));
			if (!courseDoc.exists()) {
				setAnalyticsLoading(false);
				return;
			}
			const courseData = courseDoc.data();

			// Get all modules and lessons for the course
			const modules = [];
			const moduleIds = courseData.modules || [];
			for (const moduleId of moduleIds) {
				try {
					const moduleDoc = await getDoc(doc(db, 'module', moduleId));
					if (moduleDoc.exists()) {
						const moduleData = moduleDoc.data();
						modules.push({
							id: moduleId,
							...moduleData,
						});
					}
				} catch (err) {
					console.error(`Error loading module ${moduleId}:`, err);
				}
			}

			// Get all assessments and assignments for this course
			const assessmentsQuery = query(
				collection(db, 'assessment'),
				where('courseId', '==', courseId)
			);
			const assignmentsQuery = query(
				collection(db, 'assignment'),
				where('courseId', '==', courseId)
			);

			const [assessmentsSnapshot, assignmentsSnapshot] = await Promise.all([
				getDocs(assessmentsQuery),
				getDocs(assignmentsQuery)
			]);

			const assessments = assessmentsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
			const assignments = assignmentsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));

			// Get all submissions
			const assessmentIds = assessments.map(a => a.id);
			const assignmentIds = assignments.map(a => a.id);
			const allSubmissions = [];

			// Get assessment submissions
			for (const assessmentId of assessmentIds) {
				const submissionsQuery = query(
					collection(db, 'submission'),
					where('assessmentId', '==', assessmentId)
				);
				const submissionsSnapshot = await getDocs(submissionsQuery);
				submissionsSnapshot.docs.forEach(doc => {
					allSubmissions.push({
						id: doc.id,
						...doc.data(),
						type: 'assessment',
					});
				});
			}

			// Get assignment submissions
			for (const assignmentId of assignmentIds) {
				const submissionsQuery = query(
					collection(db, 'submission'),
					where('assignmentId', '==', assignmentId)
				);
				const submissionsSnapshot = await getDocs(submissionsQuery);
				submissionsSnapshot.docs.forEach(doc => {
					allSubmissions.push({
						id: doc.id,
						...doc.data(),
						type: 'assignment',
					});
				});
			}

			// Process student data
			const studentData = {};
			const studentIds = new Set();

			enrollments.forEach(enrollment => {
				const studentId = enrollment.studentId;
				studentIds.add(studentId);
				if (!studentData[studentId]) {
					studentData[studentId] = {
						studentId,
						enrollment,
						submissions: [],
						completedLessons: enrollment.progress?.completedLessons?.length || 0,
						completedModules: enrollment.progress?.completedModules?.length || 0,
						overallProgress: enrollment.progress?.overallProgress || 0,
						totalLessons: 0,
						totalModules: modules.length,
						scores: [],
						lastActivity: enrollment.enrolledAt,
					};
				}
			});

			// Calculate total lessons
			let totalLessons = 0;
			for (const module of modules) {
				if (module.lessons && Array.isArray(module.lessons)) {
					totalLessons += module.lessons.length;
				}
			}

			// Process submissions
			allSubmissions.forEach(submission => {
				const studentId = submission.studentId;
				if (studentData[studentId]) {
					studentData[studentId].submissions.push(submission);
					if (submission.submittedAt && submission.submittedAt.toDate) {
						const submitDate = submission.submittedAt.toDate();
						const lastActivity = studentData[studentId].lastActivity?.toDate 
							? studentData[studentId].lastActivity.toDate() 
							: new Date(0);
						if (submitDate > lastActivity) {
							studentData[studentId].lastActivity = submission.submittedAt;
						}
					}
					if (submission.score !== undefined && submission.totalPoints) {
						const percentage = (submission.score / submission.totalPoints) * 100;
						studentData[studentId].scores.push(percentage);
					} else if (submission.grade !== undefined) {
						studentData[studentId].scores.push(submission.grade);
					}
				}
			});

			// Update total lessons for all students
			Object.values(studentData).forEach(student => {
				student.totalLessons = totalLessons;
			});

			// Get student names
			const studentNames = {};
			for (const studentId of studentIds) {
				try {
					const studentDoc = await getDoc(doc(db, 'user', studentId));
					if (studentDoc.exists()) {
						studentNames[studentId] = studentDoc.data().name || 'Unknown';
					}
				} catch (err) {
					console.error(`Error loading student ${studentId}:`, err);
				}
			}

			// Calculate completion rates over time (last 7 weeks)
			const completionRates = [];
			const now = new Date();
			for (let i = 6; i >= 0; i--) {
				const weekStart = new Date(now);
				weekStart.setDate(now.getDate() - (i * 7));
				weekStart.setHours(0, 0, 0, 0);
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 7);

				let completed = 0;
				let total = 0;
				Object.values(studentData).forEach(student => {
					total++;
					// Check if student completed any lessons this week
					const progress = student.overallProgress || 0;
					if (progress > 0) {
						completed++;
					}
				});

				const rate = total > 0 ? (completed / total) * 100 : 0;
				completionRates.push({
					week: `Week ${7 - i}`,
					date: weekStart.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' }),
					'Completion Rate': Math.round(rate),
				});
			}

			// Calculate average score trends (last 7 weeks)
			const scoreTrends = [];
			for (let i = 6; i >= 0; i--) {
				const weekStart = new Date(now);
				weekStart.setDate(now.getDate() - (i * 7));
				weekStart.setHours(0, 0, 0, 0);
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 7);

				const weekSubmissions = allSubmissions.filter(sub => {
					if (!sub.submittedAt) return false;
					const submitDate = sub.submittedAt.toDate ? sub.submittedAt.toDate() : new Date(sub.submittedAt);
					return submitDate >= weekStart && submitDate < weekEnd;
				});

				let totalScore = 0;
				let count = 0;
				weekSubmissions.forEach(sub => {
					if (sub.score !== undefined && sub.totalPoints) {
						totalScore += (sub.score / sub.totalPoints) * 100;
						count++;
					} else if (sub.grade !== undefined) {
						totalScore += sub.grade;
						count++;
					}
				});

				const avgScore = count > 0 ? totalScore / count : 0;
				scoreTrends.push({
					week: `Week ${7 - i}`,
					date: weekStart.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' }),
					'Average Score': Math.round(avgScore),
				});
			}

			// Identify at-risk students
			const studentsArray = Object.values(studentData).map(student => {
				const avgScore = student.scores.length > 0
					? student.scores.reduce((sum, score) => sum + score, 0) / student.scores.length
					: 0;
				const daysSinceActivity = student.lastActivity?.toDate
					? Math.floor((now - student.lastActivity.toDate()) / (1000 * 60 * 60 * 24))
					: 999;
				const completionRate = student.totalLessons > 0
					? (student.completedLessons / student.totalLessons) * 100
					: 0;

				return {
					...student,
					studentName: studentNames[student.studentId] || 'Unknown',
					avgScore,
					daysSinceActivity,
					completionRate,
					riskLevel: (
						avgScore < 50 || 
						completionRate < 30 || 
						daysSinceActivity > 14
					) ? 'high' : (
						avgScore < 70 || 
						completionRate < 50 || 
						daysSinceActivity > 7
					) ? 'medium' : 'low',
				};
			});

			const atRiskStudents = studentsArray
				.filter(s => s.riskLevel !== 'low')
				.sort((a, b) => {
					if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
					if (b.riskLevel === 'high' && a.riskLevel !== 'high') return 1;
					return a.avgScore - b.avgScore;
				});

			// Create topic heatmap (module-based)
			const topicHeatmap = modules.map(module => {
				let totalStudents = 0;
				let completedStudents = 0;
				let totalScore = 0;
				let scoreCount = 0;

				Object.values(studentData).forEach(student => {
					totalStudents++;
					if (student.completedModules >= modules.indexOf(module) + 1) {
						completedStudents++;
					}
					// Get scores for assessments/assignments related to this module
					student.submissions.forEach(sub => {
						// For simplicity, we'll use overall scores
						// In a real implementation, you'd link assessments to modules
						if (sub.score !== undefined && sub.totalPoints) {
							totalScore += (sub.score / sub.totalPoints) * 100;
							scoreCount++;
						} else if (sub.grade !== undefined) {
							totalScore += sub.grade;
							scoreCount++;
						}
					});
				});

				const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;
				const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
				const struggleLevel = completionRate < 50 || avgScore < 60 ? 'high' : 
					completionRate < 70 || avgScore < 75 ? 'medium' : 'low';

				return {
					topic: module.title || 'Untitled Module',
					completionRate: Math.round(completionRate),
					avgScore: Math.round(avgScore),
					struggleLevel,
					studentsCompleted: completedStudents,
					totalStudents,
				};
			});

			// Calculate overall stats
			const totalStudents = enrollments.length;
			const avgCompletionRate = studentsArray.length > 0
				? studentsArray.reduce((sum, s) => sum + s.completionRate, 0) / studentsArray.length
				: 0;
			const avgScore = studentsArray.length > 0 && studentsArray.some(s => s.scores.length > 0)
				? studentsArray
					.filter(s => s.scores.length > 0)
					.reduce((sum, s) => sum + s.avgScore, 0) / studentsArray.filter(s => s.scores.length > 0).length
				: 0;

			setAnalyticsData({
				enrollments,
				completionRates,
				scoreTrends,
				atRiskStudents,
				topicHeatmap,
				overallStats: {
					totalStudents,
					avgCompletionRate: Math.round(avgCompletionRate),
					avgScore: Math.round(avgScore),
				},
				courseTitle: courseData.title,
			});
		} catch (err) {
			console.error('Error loading analytics:', err);
			// Set empty data on error so UI can still render
			setAnalyticsData({
				enrollments: [],
				completionRates: [],
				scoreTrends: [],
				atRiskStudents: [],
				topicHeatmap: [],
				overallStats: {
					totalStudents: 0,
					avgCompletionRate: 0,
					avgScore: 0,
				},
				courseTitle: '',
			});
		} finally {
			setAnalyticsLoading(false);
		}
	}

	function handleExport() {
		if (!analyticsData) return;

		const exportData = {
			course: analyticsData.courseTitle,
			generatedAt: new Date().toISOString(),
			overallStats: analyticsData.overallStats,
			completionRates: analyticsData.completionRates,
			scoreTrends: analyticsData.scoreTrends,
			atRiskStudents: analyticsData.atRiskStudents.map(s => ({
				name: s.studentName,
				averageScore: Math.round(s.avgScore),
				completionRate: Math.round(s.completionRate),
				daysSinceActivity: s.daysSinceActivity,
				riskLevel: s.riskLevel,
			})),
			topicHeatmap: analyticsData.topicHeatmap,
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `class-performance-${selectedCourseId}-${Date.now()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	if (userRole !== 'teacher') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Analitik' : 'Analytics'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' 
							? 'Halaman ini hanya tersedia untuk guru.'
							: 'This page is only available for teachers.'}
					</p>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Prestasi Kelas' : 'Class Performance'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	if (courses.length === 0) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Prestasi Kelas' : 'Class Performance'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' 
							? 'Anda belum membuat sebarang kursus lagi.'
							: "You haven't created any courses yet."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Prestasi Kelas' : 'Class Performance'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' 
							? 'Lihat kemajuan dan prestasi pelajar dalam kursus anda'
							: 'View student progress and performance in your courses'}
					</p>
				</div>
				{analyticsData && (
					<Button onClick={handleExport} variant="outline" className="flex items-center justify-center gap-2">
						<Download className="h-4 w-4" />
						{language === 'bm' ? 'Eksport' : 'Export'}
					</Button>
				)}
			</div>

			{/* Course Selector */}
			<Card>
				<CardHeader>
					<CardTitle>{language === 'bm' ? 'Pilih Kursus' : 'Select Course'}</CardTitle>
				</CardHeader>
				<CardContent>
					<select
						value={selectedCourseId || ''}
						onChange={(e) => setSelectedCourseId(e.target.value)}
						className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
					>
						{courses.map(course => (
							<option key={course.id} value={course.id}>
								{course.title}
							</option>
						))}
					</select>
				</CardContent>
			</Card>

			{analyticsLoading && (
				<div className="text-center py-8">
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan data analitik...' : 'Loading analytics data...'}
					</p>
				</div>
			)}

			{analyticsData && !analyticsLoading && (
				<>
					{/* Overall Stats */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Jumlah Pelajar' : 'Total Students'}
										</p>
										<p className="text-2xl font-bold text-neutralDark">
											{analyticsData.overallStats.totalStudents}
										</p>
									</div>
									<Users className="h-8 w-8 text-primary" />
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Kadar Penyiapan Purata' : 'Average Completion Rate'}
										</p>
										<p className="text-2xl font-bold text-neutralDark">
											{analyticsData.overallStats.avgCompletionRate}%
										</p>
									</div>
									<Target className="h-8 w-8 text-success" />
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Skor Purata' : 'Average Score'}
										</p>
										<p className="text-2xl font-bold text-neutralDark">
											{analyticsData.overallStats.avgScore}%
										</p>
									</div>
									<BarChart3 className="h-8 w-8 text-info" />
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Completion Rate Trend */}
					<Card>
						<CardHeader>
							<CardTitle>
								{language === 'bm' ? 'Kadar Penyiapan Kelas' : 'Class Completion Rate'}
							</CardTitle>
							<CardDescription>
								{language === 'bm' 
									? 'Trend kadar penyiapan selama 7 minggu terakhir'
									: 'Completion rate trend over the last 7 weeks'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<AreaChart
								data={analyticsData.completionRates}
								index="week"
								categories={['Completion Rate']}
								colors={['blue']}
								valueFormatter={(value) => `${value}%`}
								className="h-80"
							/>
						</CardContent>
					</Card>

					{/* Average Score Trend */}
					<Card>
						<CardHeader>
							<CardTitle>
								{language === 'bm' ? 'Trend Skor Purata' : 'Average Score Trend'}
							</CardTitle>
							<CardDescription>
								{language === 'bm' 
									? 'Trend skor purata selama 7 minggu terakhir'
									: 'Average score trend over the last 7 weeks'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<LineChart
								data={analyticsData.scoreTrends}
								index="week"
								categories={['Average Score']}
								colors={['green']}
								valueFormatter={(value) => `${value}%`}
								className="h-80"
							/>
						</CardContent>
					</Card>

					{/* At-Risk Students */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<AlertTriangle className="h-5 w-5 text-warning" />
								{language === 'bm' ? 'Pelajar Berisiko' : 'At-Risk Students'}
							</CardTitle>
							<CardDescription>
								{language === 'bm' 
									? 'Pelajar yang memerlukan perhatian (skor rendah, aktiviti rendah)'
									: 'Students who need attention (low scores, low activity)'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{analyticsData.atRiskStudents.length === 0 ? (
								<p className="text-body text-muted-foreground text-center py-8">
									{language === 'bm' 
										? 'Tiada pelajar berisiko pada masa ini.'
										: 'No at-risk students at this time.'}
								</p>
							) : (
								<div className="space-y-4">
									{analyticsData.atRiskStudents.map((student, idx) => (
										<div
											key={idx}
											className={`p-4 border rounded-lg ${
												student.riskLevel === 'high' 
													? 'border-red-300 bg-red-50' 
													: 'border-yellow-300 bg-yellow-50'
											}`}
										>
											<div className="flex items-center justify-between mb-2">
												<h4 className="font-semibold text-neutralDark">{student.studentName}</h4>
												<span className={`px-2 py-1 rounded text-xs font-medium ${
													student.riskLevel === 'high'
														? 'bg-red-100 text-red-800'
														: 'bg-yellow-100 text-yellow-800'
												}`}>
													{student.riskLevel === 'high' 
														? (language === 'bm' ? 'Risiko Tinggi' : 'High Risk')
														: (language === 'bm' ? 'Risiko Sederhana' : 'Medium Risk')}
												</span>
											</div>
											<div className="grid grid-cols-3 gap-4 text-sm">
												<div>
													<p className="text-muted-foreground">
														{language === 'bm' ? 'Skor Purata' : 'Avg Score'}
													</p>
													<p className="font-medium">{Math.round(student.avgScore)}%</p>
												</div>
												<div>
													<p className="text-muted-foreground">
														{language === 'bm' ? 'Kadar Penyiapan' : 'Completion'}
													</p>
													<p className="font-medium">{Math.round(student.completionRate)}%</p>
												</div>
												<div>
													<p className="text-muted-foreground">
														{language === 'bm' ? 'Hari Tanpa Aktiviti' : 'Days Inactive'}
													</p>
													<p className="font-medium">{student.daysSinceActivity}</p>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Topic Heatmap */}
					<Card>
						<CardHeader>
							<CardTitle>
								{language === 'bm' ? 'Peta Haba Topik' : 'Topic Heatmap'}
							</CardTitle>
							<CardDescription>
								{language === 'bm' 
									? 'Topik yang pelajar bergelut (berdasarkan kadar penyiapan dan skor)'
									: 'Topics students struggle with (based on completion rate and scores)'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{analyticsData.topicHeatmap.length === 0 ? (
								<p className="text-body text-muted-foreground text-center py-8">
									{language === 'bm' 
										? 'Tiada data topik tersedia.'
										: 'No topic data available.'}
								</p>
							) : (
								<div className="space-y-4">
									{analyticsData.topicHeatmap.map((topic, idx) => (
										<div
											key={idx}
											className={`p-4 border rounded-lg ${
												topic.struggleLevel === 'high'
													? 'border-red-500 bg-red-50'
													: topic.struggleLevel === 'medium'
													? 'border-yellow-500 bg-yellow-50'
													: 'border-green-500 bg-green-50'
											}`}
										>
											<div className="flex items-center justify-between mb-3">
												<h4 className="font-semibold text-neutralDark">{topic.topic}</h4>
												<span className={`px-2 py-1 rounded text-xs font-medium ${
													topic.struggleLevel === 'high'
														? 'bg-red-100 text-red-800'
														: topic.struggleLevel === 'medium'
														? 'bg-yellow-100 text-yellow-800'
														: 'bg-green-100 text-green-800'
												}`}>
													{topic.struggleLevel === 'high'
														? (language === 'bm' ? 'Sukar' : 'Struggling')
														: topic.struggleLevel === 'medium'
														? (language === 'bm' ? 'Sederhana' : 'Moderate')
														: (language === 'bm' ? 'Baik' : 'Good')}
												</span>
											</div>
											<div className="grid grid-cols-3 gap-4 text-sm">
												<div>
													<p className="text-muted-foreground">
														{language === 'bm' ? 'Kadar Penyiapan' : 'Completion Rate'}
													</p>
													<p className="font-medium">{topic.completionRate}%</p>
												</div>
												<div>
													<p className="text-muted-foreground">
														{language === 'bm' ? 'Skor Purata' : 'Avg Score'}
													</p>
													<p className="font-medium">{topic.avgScore}%</p>
												</div>
												<div>
													<p className="text-muted-foreground">
														{language === 'bm' ? 'Pelajar Selesai' : 'Students Completed'}
													</p>
													<p className="font-medium">
														{topic.studentsCompleted} / {topic.totalStudents}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
