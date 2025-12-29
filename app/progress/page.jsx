'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Clock, Award, FileText, ClipboardCheck, TrendingUp, TrendingDown, Calendar, Download, AlertCircle, Brain, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BarChart, LineChart } from '@tremor/react';
import ReportGenerator from '@/app/components/ReportGenerator';

export default function ProgressPage() {
	const { language } = useLanguage();
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [courseProgress, setCourseProgress] = useState([]);
	const [scoreTrends, setScoreTrends] = useState([]);
	const [badges, setBadges] = useState([]);
	const [milestones, setMilestones] = useState([]);
	const [aiInsights, setAiInsights] = useState([]);
	const [strongTopics, setStrongTopics] = useState([]);
	const [weakTopics, setWeakTopics] = useState([]);
	const [riskIndicator, setRiskIndicator] = useState(null);
	const [error, setError] = useState('');
	const [systemError, setSystemError] = useState(false);
	const [insufficientData, setInsufficientData] = useState(false);

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
		setError('');
		setSystemError(false);
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
				setScoreTrends([]);
				setBadges([]);
				setMilestones([]);
				setAiInsights([]);
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

			// Calculate score trends (last 6 weeks)
			const calculatedTrends = calculateScoreTrends(submissions);
			setScoreTrends(calculatedTrends);

			// Calculate badges and milestones
			calculateBadgesAndMilestones(progressData, submissions);

			// Load AI insights and identify strong/weak topics
			await loadAIInsights(userId);
			identifyStrongAndWeakTopics(submissions, progressData);

			// Evaluate learning risk (UC012: View Risk Indicator)
			// Pass calculated trends to evaluateLearningRisk so it can include trend data
			await evaluateLearningRisk(userId, submissions, progressData, calculatedTrends);
		} catch (err) {
			console.error('Error loading progress:', err);
			// Handle system errors (E1, A2)
			if (err.code === 'unavailable' || err.code === 'deadline-exceeded' || err.message?.includes('network')) {
				setSystemError(true);
				setError(language === 'bm' 
					? 'Tidak dapat memuatkan data kemajuan. Sila cuba lagi kemudian.'
					: 'Unable to load progress data. Please try again later.');
			} else {
				setError(language === 'bm' 
					? 'Ralat semasa memuatkan kemajuan: ' + (err.message || 'Ralat tidak diketahui')
					: 'Error loading progress: ' + (err.message || 'Unknown error'));
			}
		} finally {
			setLoading(false);
		}
	}

	function calculateScoreTrends(submissions) {
		const now = new Date();
		const trends = [];
		
		for (let i = 5; i >= 0; i--) {
			const weekStart = new Date(now);
			weekStart.setDate(now.getDate() - (i * 7));
			weekStart.setHours(0, 0, 0, 0);
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekStart.getDate() + 7);

			const weekSubmissions = submissions.filter(sub => {
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
			trends.push({
				week: `Week ${6 - i}`,
				date: weekStart.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { month: 'short', day: 'numeric' }),
				'Average Score': Math.round(avgScore),
			});
		}

		return trends; // Return trends instead of setting state
	}

	function calculateBadgesAndMilestones(progressData, submissions) {
		const earnedBadges = [];
		const achievedMilestones = [];

		// Badge: First Course Completed
		if (progressData.length > 0) {
			earnedBadges.push({
				id: 'first_course',
				name: language === 'bm' ? 'Kursus Pertama' : 'First Course',
				description: language === 'bm' ? 'Mendaftar dalam kursus pertama anda' : 'Enrolled in your first course',
				icon: '🎓',
				earnedAt: new Date(),
			});
		}

		// Badge: Perfect Score
		const perfectScores = submissions.filter(sub => {
			if (sub.score !== undefined && sub.totalPoints) {
				return sub.score === sub.totalPoints;
			}
			return sub.grade === 100;
		});
		if (perfectScores.length > 0) {
			earnedBadges.push({
				id: 'perfect_score',
				name: language === 'bm' ? 'Skor Sempurna' : 'Perfect Score',
				description: language === 'bm' ? 'Mendapat skor sempurna dalam penilaian' : 'Achieved a perfect score',
				icon: '⭐',
				earnedAt: perfectScores[0].submittedAt,
			});
		}

		// Badge: Consistent Learner
		const completedLessons = progressData.reduce((sum, course) => sum + course.completedLessons, 0);
		if (completedLessons >= 10) {
			earnedBadges.push({
				id: 'consistent_learner',
				name: language === 'bm' ? 'Pembelajar Konsisten' : 'Consistent Learner',
				description: language === 'bm' ? 'Menamatkan 10 atau lebih pelajaran' : 'Completed 10 or more lessons',
				icon: '📚',
				earnedAt: new Date(),
			});
		}

		// Milestone: 50% Progress
		const overallProgress = progressData.reduce((sum, course) => sum + course.overallProgress, 0) / progressData.length;
		if (overallProgress >= 50) {
			achievedMilestones.push({
				id: 'halfway',
				name: language === 'bm' ? 'Separuh Jalan' : 'Halfway There',
				description: language === 'bm' ? 'Mencapai 50% kemajuan keseluruhan' : 'Reached 50% overall progress',
				progress: overallProgress,
			});
		}

		// Milestone: Course Completion
		const completedCourses = progressData.filter(course => course.overallProgress >= 100);
		if (completedCourses.length > 0) {
			achievedMilestones.push({
				id: 'course_complete',
				name: language === 'bm' ? 'Kursus Selesai' : 'Course Completed',
				description: language === 'bm' 
					? `Menamatkan ${completedCourses.length} kursus`
					: `Completed ${completedCourses.length} course${completedCourses.length > 1 ? 's' : ''}`,
				progress: 100,
			});
		}

		setBadges(earnedBadges);
		setMilestones(achievedMilestones);
	}

	async function loadAIInsights(userId) {
		try {
			const response = await fetch('/api/ai/recommendations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ language }),
			});

			if (response.ok) {
				const data = await response.json();
				setAiInsights(data.recommendations || []);
			}
		} catch (err) {
			console.error('Error loading AI insights:', err);
			// Don't fail the whole page if AI insights fail
		}
	}

	async function evaluateLearningRisk(userId, submissions, progressData, scoreTrendsData = []) {
		try {
			// Risk assessment thresholds (same as teacher analytics)
			const riskConfig = {
				minAvgScore: 60,
				maxMissedDeadlines: 2,
				maxDaysInactive: 7,
			};

			// Check if we have enough data
			if (submissions.length === 0 && progressData.length === 0) {
				setInsufficientData(true);
				setRiskIndicator(null);
				return;
			}

			setInsufficientData(false);

			// Calculate average score
			let totalScore = 0;
			let scoreCount = 0;
			submissions.forEach(sub => {
				if (sub.score !== undefined && sub.totalPoints) {
					totalScore += (sub.score / sub.totalPoints) * 100;
					scoreCount++;
				} else if (sub.grade !== undefined) {
					totalScore += sub.grade;
					scoreCount++;
				}
			});
			const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

			// Calculate missed deadlines
			let missedDeadlines = 0;
			const now = new Date();
			for (const sub of submissions) {
				let deadline = null;
				if (sub.assessmentId) {
					try {
						const { doc, getDoc } = await import('firebase/firestore');
						const assessmentDoc = await getDoc(doc(db, 'assessment', sub.assessmentId));
						if (assessmentDoc.exists()) {
							const assessmentData = assessmentDoc.data();
							if (assessmentData.config?.endDate) {
								deadline = assessmentData.config.endDate.toDate 
									? assessmentData.config.endDate.toDate() 
									: new Date(assessmentData.config.endDate);
							}
						}
					} catch (err) {
						console.error('Error loading assessment for risk:', err);
					}
				} else if (sub.assignmentId) {
					try {
						const { doc, getDoc } = await import('firebase/firestore');
						const assignmentDoc = await getDoc(doc(db, 'assignment', sub.assignmentId));
						if (assignmentDoc.exists()) {
							const assignmentData = assignmentDoc.data();
							if (assignmentData.deadline) {
								deadline = assignmentData.deadline.toDate 
									? assignmentData.deadline.toDate() 
									: new Date(assignmentData.deadline);
							}
						}
					} catch (err) {
						console.error('Error loading assignment for risk:', err);
					}
				}

				if (deadline && deadline < now) {
					const submitDate = sub.submittedAt?.toDate 
						? sub.submittedAt.toDate() 
						: (sub.submittedAt ? new Date(sub.submittedAt) : null);
					if (!submitDate || submitDate > deadline) {
						missedDeadlines++;
					}
				}
			}

			// Calculate days since last activity
			let lastActivity = null;
			submissions.forEach(sub => {
				if (sub.submittedAt) {
					const submitDate = sub.submittedAt.toDate 
						? sub.submittedAt.toDate() 
						: new Date(sub.submittedAt);
					if (!lastActivity || submitDate > lastActivity) {
						lastActivity = submitDate;
					}
				}
			});
			const daysSinceActivity = lastActivity 
				? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))
				: 999;

			// Determine risk level
			const highScoreRisk = avgScore < (riskConfig.minAvgScore - 10);
			const mediumScoreRisk = avgScore < riskConfig.minAvgScore;
			const highDeadlineRisk = missedDeadlines > riskConfig.maxMissedDeadlines;
			const mediumDeadlineRisk = missedDeadlines > 0;
			const highEngagementRisk = daysSinceActivity > (riskConfig.maxDaysInactive * 2);
			const mediumEngagementRisk = daysSinceActivity > riskConfig.maxDaysInactive;

			let riskLevel = 'low';
			if (highScoreRisk || highDeadlineRisk || highEngagementRisk) {
				riskLevel = 'high';
			} else if (mediumScoreRisk || mediumDeadlineRisk || mediumEngagementRisk) {
				riskLevel = 'medium';
			}

			// Calculate overall completion rate
			let totalLessons = 0;
			let completedLessons = 0;
			progressData.forEach(course => {
				totalLessons += course.totalLessons || 0;
				completedLessons += course.completedLessons || 0;
			});
			const overallCompletionRate = totalLessons > 0 
				? (completedLessons / totalLessons) * 100 
				: 0;

			// Build risk factors
			const riskFactors = [];
			if (highScoreRisk || mediumScoreRisk) {
				riskFactors.push({
					type: 'low_scores',
					label: language === 'bm' 
						? `Skor purata rendah (${Math.round(avgScore)}%)`
						: `Low average score (${Math.round(avgScore)}%)`,
				});
			}
			if (overallCompletionRate < 50) {
				riskFactors.push({
					type: 'low_completion',
					label: language === 'bm' 
						? `Kadar penyiapan rendah (${Math.round(overallCompletionRate)}%)`
						: `Low completion rate (${Math.round(overallCompletionRate)}%)`,
				});
			}
			if (missedDeadlines > 0) {
				riskFactors.push({
					type: 'missed_deadlines',
					label: language === 'bm' 
						? `${missedDeadlines} tarikh akhir terlepas`
						: `${missedDeadlines} missed deadline${missedDeadlines > 1 ? 's' : ''}`,
				});
			}
			if (mediumEngagementRisk || highEngagementRisk) {
				riskFactors.push({
					type: 'low_activity',
					label: language === 'bm' 
						? `Aktiviti rendah (${daysSinceActivity} hari tidak aktif)`
						: `Low activity (inactive for ${daysSinceActivity} day${daysSinceActivity !== 1 ? 's' : ''})`,
				});
			}

			setRiskIndicator({
				riskLevel,
				avgScore: Math.round(avgScore),
				completionRate: Math.round(overallCompletionRate),
				missedDeadlines,
				daysSinceActivity,
				riskFactors,
				scoreTrend: scoreTrendsData.length > 0 ? scoreTrendsData : null, // Include score trend
			});

			// Send notification if risk level is medium or high (UC012: Notify At-Risk Student)
			if (riskLevel === 'medium' || riskLevel === 'high') {
				await sendRiskNotification(userId, riskLevel, riskFactors);
			}
		} catch (err) {
			console.error('Error evaluating learning risk:', err);
			// Don't fail the whole page if risk evaluation fails
		}
	}

	async function sendRiskNotification(userId, riskLevel, riskFactors) {
		try {
			// Check if notification already sent recently (avoid spam)
			const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
			const notificationsQuery = query(
				collection(db, 'notification'),
				where('userId', '==', userId),
				where('type', '==', 'learning_risk'),
				orderBy('createdAt', 'desc'),
				limit(1)
			);
			const recentNotifications = await getDocs(notificationsQuery);
			
			// Only send if no notification in last 24 hours
			let shouldSend = true;
			if (!recentNotifications.empty) {
				const lastNotif = recentNotifications.docs[0].data();
				const lastNotifDate = lastNotif.createdAt?.toDate 
					? lastNotif.createdAt.toDate() 
					: new Date(lastNotif.createdAt);
				const hoursSince = (new Date() - lastNotifDate) / (1000 * 60 * 60);
				if (hoursSince < 24) {
					shouldSend = false;
				}
			}

			if (shouldSend) {
				const { addDoc, serverTimestamp } = await import('firebase/firestore');
				const riskFactorsText = riskFactors.map(f => f.label).join(', ');
				await addDoc(collection(db, 'notification'), {
					userId: userId,
					type: 'learning_risk',
					title: language === 'bm' 
						? `Pemberitahuan Risiko Pembelajaran: ${riskLevel === 'high' ? 'Risiko Tinggi' : 'Risiko Sederhana'}`
						: `Learning Risk Alert: ${riskLevel === 'high' ? 'High Risk' : 'Medium Risk'}`,
					message: language === 'bm' 
						? `Prestasi pembelajaran anda menunjukkan tanda-tanda risiko. Faktor: ${riskFactorsText}. Sila semak halaman Kemajuan untuk maklumat lanjut.`
						: `Your learning performance shows risk indicators. Factors: ${riskFactorsText}. Please check your Progress page for more details.`,
					read: false,
					createdAt: serverTimestamp(),
				});
			}
		} catch (err) {
			console.error('Error sending risk notification:', err);
			// Don't fail if notification fails
		}
	}

	async function identifyStrongAndWeakTopics(submissions, progressData) {
		try {
			// Group submissions by topic/assessment/assignment
			const topicScores = new Map();

			for (const submission of submissions) {
				let topicName = '';
				let score = null;

				if (submission.assessmentId) {
					try {
						const { doc, getDoc } = await import('firebase/firestore');
						const assessmentDoc = await getDoc(doc(db, 'assessment', submission.assessmentId));
						if (assessmentDoc.exists()) {
							topicName = assessmentDoc.data().title || 'Assessment';
							if (submission.score !== undefined && submission.totalPoints) {
								score = (submission.score / submission.totalPoints) * 100;
							} else if (submission.grade !== undefined) {
								score = submission.grade;
							}
						}
					} catch (err) {
						console.error('Error loading assessment:', err);
					}
				} else if (submission.assignmentId) {
					try {
						const { doc, getDoc } = await import('firebase/firestore');
						const assignmentDoc = await getDoc(doc(db, 'assignment', submission.assignmentId));
						if (assignmentDoc.exists()) {
							topicName = assignmentDoc.data().title || 'Assignment';
							if (submission.grade !== undefined) {
								score = submission.grade;
							}
						}
					} catch (err) {
						console.error('Error loading assignment:', err);
					}
				}

				if (topicName && score !== null) {
					const existing = topicScores.get(topicName) || { scores: [], count: 0 };
					existing.scores.push(score);
					existing.count++;
					topicScores.set(topicName, existing);
				}
			}

			// Calculate averages and categorize
			const strong = [];
			const weak = [];

			topicScores.forEach((data, topic) => {
				const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
				if (avgScore >= 85) {
					strong.push({ topic, avgScore, count: data.count });
				} else if (avgScore < 70) {
					weak.push({ topic, avgScore, count: data.count });
				}
			});

			setStrongTopics(strong.sort((a, b) => b.avgScore - a.avgScore));
			setWeakTopics(weak.sort((a, b) => a.avgScore - b.avgScore));
		} catch (err) {
			console.error('Error identifying topics:', err);
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

	// Handle errors (A2, E1)
	if (error && !courseProgress.length) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Kemajuan Saya' : 'My Progress'}
					</h1>
				</div>
				<Card className="border-destructive bg-destructive/5">
					<CardContent className="py-6">
						<div className="flex items-center gap-3">
							<AlertCircle className="h-5 w-5 text-destructive" />
							<div>
								<p className="text-body text-destructive">{error}</p>
								{systemError && (
									<Button 
										onClick={() => window.location.reload()} 
										variant="outline" 
										size="sm" 
										className="mt-2"
									>
										{language === 'bm' ? 'Muat Semula' : 'Reload Page'}
									</Button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
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
				<div className="flex gap-2">
					<Link href="/weak-areas">
						<Button variant="outline" size="sm">
							{language === 'bm' ? 'Bidang Lemah' : 'Weak Areas'}
						</Button>
					</Link>
					{courseProgress.length > 0 && (
						<div className="relative">
							<ReportGenerator 
								data={{
									assessments: courseProgress.flatMap(c => c.assessments),
									assignments: courseProgress.flatMap(c => c.assignments),
									overallProgress: courseProgress.reduce((sum, c) => sum + c.overallProgress, 0) / courseProgress.length,
									completedLessons: courseProgress.reduce((sum, c) => sum + c.completedLessons, 0),
									completedModules: courseProgress.reduce((sum, c) => sum + c.completedModules, 0),
									scoreTrends: scoreTrends,
									badges: badges,
									milestones: milestones,
								}}
								type="student"
							/>
						</div>
					)}
				</div>
			</div>

			{/* Error Display */}
			{error && courseProgress.length > 0 && (
				<Card className="border-warning bg-warning/5">
					<CardContent className="py-4">
						<div className="flex items-center gap-2 text-warning">
							<AlertCircle className="h-4 w-4" />
							<p className="text-sm">{error}</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Learning Risk Indicator (UC012: View Risk Indicator) */}
			{insufficientData ? (
				<Card className="border-muted bg-muted/5">
					<CardContent className="py-6">
						<div className="flex items-center gap-3">
							<AlertCircle className="h-5 w-5 text-muted-foreground" />
							<p className="text-body text-muted-foreground">
								{language === 'bm' 
									? 'Data tidak mencukupi untuk menilai risiko pembelajaran.'
									: 'Insufficient data to assess learning risk.'}
							</p>
						</div>
					</CardContent>
				</Card>
			) : riskIndicator && riskIndicator.riskLevel !== 'low' ? (
				<Card className={`${
					riskIndicator.riskLevel === 'high' 
						? 'border-destructive bg-destructive/5' 
						: 'border-warning bg-warning/5'
				}`}>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertCircle className={`h-5 w-5 ${
								riskIndicator.riskLevel === 'high' ? 'text-destructive' : 'text-warning'
							}`} />
							{language === 'bm' 
								? `Penunjuk Risiko Pembelajaran: ${riskIndicator.riskLevel === 'high' ? 'Risiko Tinggi' : 'Risiko Sederhana'}`
								: `Learning Risk Indicator: ${riskIndicator.riskLevel === 'high' ? 'High Risk' : 'Medium Risk'}`}
						</CardTitle>
						<CardDescription>
							{language === 'bm' 
								? 'Prestasi pembelajaran anda menunjukkan tanda-tanda risiko. Sila semak faktor-faktor di bawah.'
								: 'Your learning performance shows risk indicators. Please review the factors below.'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{/* Contributing Indicators */}
						<div className="grid grid-cols-3 gap-4 mb-4">
							<div className="p-3 bg-white rounded border">
								<p className="text-xs text-muted-foreground mb-1">
									{language === 'bm' ? 'Kadar Penyiapan' : 'Completion Rate'}
								</p>
								<p className="text-lg font-bold text-neutralDark">
									{riskIndicator.completionRate}%
								</p>
							</div>
							<div className="p-3 bg-white rounded border">
								<p className="text-xs text-muted-foreground mb-1">
									{language === 'bm' ? 'Skor Purata' : 'Average Score'}
								</p>
								<p className="text-lg font-bold text-neutralDark">
									{riskIndicator.avgScore}%
								</p>
							</div>
							<div className="p-3 bg-white rounded border">
								<p className="text-xs text-muted-foreground mb-1">
									{language === 'bm' ? 'Hari Tidak Aktif' : 'Days Inactive'}
								</p>
								<p className="text-lg font-bold text-neutralDark">
									{riskIndicator.daysSinceActivity}
								</p>
							</div>
						</div>

						{/* Score Trend Indicator */}
						{riskIndicator.scoreTrend && riskIndicator.scoreTrend.length > 0 && (
							<div className="mb-4 p-3 bg-white rounded border">
								<p className="text-xs text-muted-foreground mb-2">
									{language === 'bm' ? 'Trend Skor Penilaian' : 'Assessment Score Trend'}
								</p>
								<div className="flex items-end gap-1 h-12">
									{riskIndicator.scoreTrend.slice(-6).map((point, idx) => {
										const value = point['Average Score'] || 0;
										const maxValue = Math.max(...riskIndicator.scoreTrend.map(p => p['Average Score'] || 0), 100);
										const height = (value / maxValue) * 100;
										return (
											<div key={idx} className="flex-1 flex flex-col items-center">
												<div 
													className={`w-full rounded-t ${
														value < 60 ? 'bg-error' : value < 70 ? 'bg-warning' : 'bg-success'
													}`}
													style={{ height: `${height}%` }}
												/>
												<p className="text-[10px] text-muted-foreground mt-1">{point.week || ''}</p>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* Risk Factors */}
						<div className="space-y-3 mb-4">
							<p className="text-sm font-medium text-neutralDark">
								{language === 'bm' ? 'Faktor Risiko:' : 'Contributing Risk Factors:'}
							</p>
							{riskIndicator.riskFactors.map((factor, idx) => (
								<div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border">
									<AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
									<p className="text-sm text-neutralDark">{factor.label}</p>
								</div>
							))}
						</div>

						{/* Explanation */}
						<div className="mt-4 pt-4 border-t">
							<p className="text-xs font-medium text-neutralDark mb-2">
								{language === 'bm' ? 'Penjelasan Tahap Risiko:' : 'Risk Level Explanation:'}
							</p>
							<p className="text-xs text-muted-foreground mb-3">
								{riskIndicator.riskLevel === 'high' 
									? (language === 'bm' 
										? 'Tahap risiko tinggi menunjukkan bahawa prestasi pembelajaran anda memerlukan perhatian segera. Faktor-faktor seperti skor rendah, kadar penyiapan yang rendah, atau aktiviti yang rendah menyumbang kepada penilaian ini.'
										: 'High risk level indicates that your learning performance requires immediate attention. Factors such as low scores, low completion rate, or low activity contribute to this assessment.')
									: (language === 'bm' 
										? 'Tahap risiko sederhana menunjukkan bahawa terdapat beberapa kawasan yang perlu diperbaiki dalam prestasi pembelajaran anda. Pertimbangkan untuk meningkatkan penglibatan dan menyelesaikan tugasan yang tertunggak.'
										: 'Medium risk level indicates that there are some areas that need improvement in your learning performance. Consider increasing engagement and completing overdue assignments.')
								}
							</p>
							<p className="text-xs font-medium text-neutralDark mb-2">
								{language === 'bm' ? 'Cadangan Peningkatan:' : 'Improvement Recommendations:'}
							</p>
							<p className="text-xs text-muted-foreground">
								{language === 'bm' 
									? 'Untuk meningkatkan prestasi anda, pertimbangkan untuk mengkaji semula topik yang lemah, menyelesaikan tugasan yang tertunggak, dan meningkatkan penglibatan dalam kursus. Lihat bahagian "Pandangan AI untuk Peningkatan" di bawah untuk cadangan yang lebih peribadi.'
									: 'To improve your performance, consider reviewing weak topics, completing overdue assignments, and increasing engagement in courses. See the "AI-Driven Improvement Insights" section below for more personalized recommendations.'}
							</p>
						</div>
					</CardContent>
				</Card>
			) : riskIndicator && riskIndicator.riskLevel === 'low' ? (
				<Card className="border-success/20 bg-success/5">
					<CardContent className="py-4">
						<div className="flex items-center gap-3">
							<CheckCircle2 className="h-5 w-5 text-success" />
							<p className="text-body text-success">
								{language === 'bm' 
									? 'Penunjuk Risiko Pembelajaran: Risiko Rendah - Prestasi anda berada pada tahap yang baik.'
									: 'Learning Risk Indicator: Low Risk - Your performance is at a good level.'}
							</p>
						</div>
					</CardContent>
				</Card>
			) : null}

			{/* AI-Driven Improvement Insights */}
			{aiInsights.length > 0 && (
				<Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-primary" />
							{language === 'bm' ? 'Pandangan AI untuk Peningkatan' : 'AI-Driven Improvement Insights'}
						</CardTitle>
						<CardDescription>
							{language === 'bm' 
								? 'Cadangan peribadi berdasarkan prestasi pembelajaran anda'
								: 'Personalized suggestions based on your learning performance'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{aiInsights.slice(0, 3).map((insight, idx) => (
								<div key={idx} className="p-3 bg-white rounded-lg border border-primary/10">
									<p className="font-medium text-sm text-neutralDark mb-1">{insight.title}</p>
									<p className="text-xs text-muted-foreground">{insight.description}</p>
									{insight.action && (
										<Link href={insight.action.path}>
											<Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">
												{insight.action.label} →
											</Button>
										</Link>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Badges and Milestones */}
			{(badges.length > 0 || milestones.length > 0) && (
				<div className="grid gap-4 md:grid-cols-2">
					{badges.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Award className="h-5 w-5 text-primary" />
									{language === 'bm' ? 'Lencana' : 'Badges'}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-3">
									{badges.map((badge) => (
										<div key={badge.id} className="flex items-center gap-2 p-3 bg-neutralLight rounded-lg border">
											<span className="text-2xl">{badge.icon}</span>
											<div>
												<p className="font-medium text-sm">{badge.name}</p>
												<p className="text-xs text-muted-foreground">{badge.description}</p>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
					{milestones.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="h-5 w-5 text-success" />
									{language === 'bm' ? 'Pencapaian' : 'Milestones'}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{milestones.map((milestone) => (
										<div key={milestone.id} className="p-3 bg-success/5 rounded-lg border border-success/20">
											<p className="font-medium text-sm text-neutralDark">{milestone.name}</p>
											<p className="text-xs text-muted-foreground">{milestone.description}</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{/* Score Trends */}
			{scoreTrends.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-info" />
							{language === 'bm' ? 'Trend Skor' : 'Score Trends'}
						</CardTitle>
						<CardDescription>
							{language === 'bm' 
								? 'Trend skor purata anda selama 6 minggu terakhir'
								: 'Your average score trend over the last 6 weeks'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<LineChart
							data={scoreTrends}
							index="week"
							categories={['Average Score']}
							colors={['blue']}
							valueFormatter={(value) => `${value}%`}
							className="h-64"
						/>
					</CardContent>
				</Card>
			)}

			{/* Strong and Weak Learning Topics */}
			{(strongTopics.length > 0 || weakTopics.length > 0) && (
				<div className="grid gap-4 md:grid-cols-2">
					{strongTopics.length > 0 && (
						<Card className="border-success/20 bg-success/5">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-success">
									<TrendingUp className="h-5 w-5" />
									{language === 'bm' ? 'Topik Kuat' : 'Strong Learning Topics'}
								</CardTitle>
								<CardDescription>
									{language === 'bm' 
										? 'Topik di mana anda menunjukkan prestasi yang baik'
										: 'Topics where you show strong performance'}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{strongTopics.slice(0, 5).map((item, idx) => (
										<div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-success/20">
											<span className="text-sm font-medium">{item.topic}</span>
											<span className="text-sm font-bold text-success">{Math.round(item.avgScore)}%</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
					{weakTopics.length > 0 && (
						<Card className="border-warning/20 bg-warning/5">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-warning">
									<TrendingDown className="h-5 w-5" />
									{language === 'bm' ? 'Topik Lemah' : 'Weak Learning Topics'}
								</CardTitle>
								<CardDescription>
									{language === 'bm' 
										? 'Topik yang memerlukan perhatian lebih'
										: 'Topics that need more attention'}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{weakTopics.slice(0, 5).map((item, idx) => (
										<div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-warning/20">
											<span className="text-sm font-medium">{item.topic}</span>
											<span className="text-sm font-bold text-warning">{Math.round(item.avgScore)}%</span>
										</div>
									))}
								</div>
								<Link href="/weak-areas" className="mt-3 inline-block">
									<Button variant="outline" size="sm" className="w-full">
										{language === 'bm' ? 'Lihat Semua Bidang Lemah' : 'View All Weak Areas'}
									</Button>
								</Link>
							</CardContent>
						</Card>
					)}
				</div>
			)}

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
								? 'Tiada data prestasi tersedia lagi.'
								: 'No performance data available yet.'}
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

