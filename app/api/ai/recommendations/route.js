// API endpoint for learning recommendations (US012-03)
// POST /api/ai/recommendations
// Analyzes student performance and provides personalized learning recommendations

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// Helper to get user info from cookies
async function getUserId() {
	const cookieStore = await cookies();
	const userId = cookieStore.get('userId')?.value;
	return userId;
}

// Sample recommendation generator (deterministic stub)
function generateRecommendations(performanceData, language = 'en') {
	const isBM = language === 'bm';
	const recommendations = [];
	
	const {
		enrolledCourses = [],
		completedLessons = [],
		assessmentScores = [],
		assignmentGrades = [],
		overallProgress = {},
		weakAreas = [],
		strongAreas = []
	} = performanceData;
	
	// Calculate average scores
	const avgAssessmentScore = assessmentScores.length > 0
		? assessmentScores.reduce((sum, s) => sum + (s.score || 0), 0) / assessmentScores.length
		: null;
	
	const avgAssignmentGrade = assignmentGrades.length > 0
		? assignmentGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / assignmentGrades.length
		: null;
	
	// Recommendation 1: Continue next lesson in course
	if (enrolledCourses.length > 0 && completedLessons.length > 0) {
		const nextCourse = enrolledCourses.find(c => {
			const courseProgress = overallProgress[c.id] || 0;
			return courseProgress < 100;
		});
		
		if (nextCourse) {
			recommendations.push({
				type: 'continue_lesson',
				priority: 'high',
				title: isBM ? 'Teruskan Pembelajaran' : 'Continue Learning',
				description: isBM 
					? `Anda telah membuat kemajuan yang baik dalam "${nextCourse.title}". Teruskan dengan pelajaran seterusnya untuk mengekalkan momentum pembelajaran anda.`
					: `You've made good progress in "${nextCourse.title}". Continue with the next lesson to maintain your learning momentum.`,
				action: {
					type: 'navigate',
					path: `/courses/${nextCourse.id}`,
					label: isBM ? 'Teruskan Kursus' : 'Continue Course'
				},
				reason: isBM 
					? 'Berdasarkan kemajuan anda yang konsisten'
					: 'Based on your consistent progress'
			});
		}
	}
	
	// Recommendation 2: Review weak areas
	if (weakAreas.length > 0) {
		const weakArea = weakAreas[0];
		recommendations.push({
			type: 'review_weak_area',
			priority: 'high',
			title: isBM ? 'Perkukuhkan Bidang Lemah' : 'Strengthen Weak Areas',
			description: isBM
				? `Anda menunjukkan kesukaran dalam "${weakArea.topic}". Kami mengesyorkan untuk mengulang kaji pelajaran berkaitan untuk meningkatkan pemahaman anda.`
				: `You're showing difficulty with "${weakArea.topic}". We recommend reviewing related lessons to improve your understanding.`,
			action: {
				type: 'navigate',
				path: weakArea.lessonPath || '/courses',
				label: isBM ? 'Kaji Semula' : 'Review'
			},
			reason: isBM
				? `Skor purata: ${weakArea.avgScore?.toFixed(0) || 'N/A'}%`
				: `Average score: ${weakArea.avgScore?.toFixed(0) || 'N/A'}%`
		});
	}
	
	// Recommendation 3: Take assessments if scores are low
	if (avgAssessmentScore !== null && avgAssessmentScore < 70) {
		recommendations.push({
			type: 'practice_assessment',
			priority: 'medium',
			title: isBM ? 'Amalkan dengan Penilaian' : 'Practice with Assessments',
			description: isBM
				? `Skor penilaian purata anda adalah ${avgAssessmentScore.toFixed(0)}%. Ambil lebih banyak penilaian untuk meningkatkan pemahaman dan keyakinan anda.`
				: `Your average assessment score is ${avgAssessmentScore.toFixed(0)}%. Take more assessments to improve your understanding and confidence.`,
			action: {
				type: 'navigate',
				path: '/assessments',
				label: isBM ? 'Lihat Penilaian' : 'View Assessments'
			},
			reason: isBM
				? 'Latihan tambahan akan membantu'
				: 'Additional practice will help'
		});
	}
	
	// Recommendation 4: Explore new courses if doing well
	if (avgAssessmentScore !== null && avgAssessmentScore >= 85 && enrolledCourses.length < 3) {
		recommendations.push({
			type: 'explore_courses',
			priority: 'low',
			title: isBM ? 'Terokai Kursus Baru' : 'Explore New Courses',
			description: isBM
				? `Anda menunjukkan prestasi yang cemerlang! Pertimbangkan untuk mendaftar dalam kursus baharu untuk mengembangkan pengetahuan anda.`
				: `You're performing excellently! Consider enrolling in new courses to expand your knowledge.`,
			action: {
				type: 'navigate',
				path: '/courses/explore',
				label: isBM ? 'Jelajah Kursus' : 'Explore Courses'
			},
			reason: isBM
				? 'Anda bersedia untuk cabaran baharu'
				: 'You\'re ready for new challenges'
		});
	}
	
	// Recommendation 5: Focus on incomplete modules
	if (enrolledCourses.length > 0) {
		const incompleteCourses = enrolledCourses.filter(c => {
			const progress = overallProgress[c.id] || 0;
			return progress > 0 && progress < 100;
		});
		
		if (incompleteCourses.length > 0) {
			const course = incompleteCourses[0];
			const progress = overallProgress[course.id] || 0;
			recommendations.push({
				type: 'complete_module',
				priority: 'medium',
				title: isBM ? 'Lengkapkan Modul' : 'Complete Module',
				description: isBM
					? `Kursus "${course.title}" adalah ${progress.toFixed(0)}% siap. Lengkapkan modul yang tinggal untuk menamatkan kursus ini.`
					: `Course "${course.title}" is ${progress.toFixed(0)}% complete. Finish the remaining modules to complete this course.`,
				action: {
					type: 'navigate',
					path: `/courses/${course.id}`,
					label: isBM ? 'Lengkapkan Kursus' : 'Complete Course'
				},
				reason: isBM
					? `${progress.toFixed(0)}% siap`
					: `${progress.toFixed(0)}% complete`
			});
		}
	}
	
	// Recommendation 6: Use AI help if struggling
	if (avgAssessmentScore !== null && avgAssessmentScore < 60) {
		recommendations.push({
			type: 'ai_help',
			priority: 'high',
			title: isBM ? 'Dapatkan Bantuan AI' : 'Get AI Help',
			description: isBM
				? `Gunakan bantuan AI kami untuk mendapatkan penjelasan konsep yang lebih jelas dan bantuan pengaturcaraan peribadi.`
				: `Use our AI help to get clearer concept explanations and personalized coding assistance.`,
			action: {
				type: 'navigate',
				path: '/ai/explain',
				label: isBM ? 'Bantuan AI' : 'AI Help'
			},
			reason: isBM
				? 'Bantuan peribadi untuk pembelajaran'
				: 'Personalized assistance for learning'
		});
	}
	
	// Sort by priority (high -> medium -> low)
	const priorityOrder = { high: 3, medium: 2, low: 1 };
	recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
	
	return recommendations.slice(0, 5); // Return top 5 recommendations
}

export async function POST(request) {
	try {
		const userId = await getUserId();
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const body = await request.json();
		const { language = 'en' } = body;
		
		// Fetch student's enrollments
		const enrollmentsQuery = query(
			collection(db, 'enrollment'),
			where('studentId', '==', userId)
		);
		const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
		const enrollments = [];
		
		for (const enrollmentDoc of enrollmentsSnapshot.docs) {
			const enrollmentData = enrollmentDoc.data();
			const courseDoc = await getDoc(doc(db, 'course', enrollmentData.courseId));
			if (courseDoc.exists()) {
				enrollments.push({
					id: enrollmentData.courseId,
					title: courseDoc.data().title,
					progress: enrollmentData.progress || {}
				});
			}
		}
		
		// Fetch completed lessons from enrollments
		const completedLessons = [];
		const overallProgress = {};
		
		for (const enrollment of enrollments) {
			const progress = enrollment.progress || {};
			const completed = progress.completedLessons || [];
			completedLessons.push(...completed);
			overallProgress[enrollment.id] = progress.overallProgress || 0;
		}
		
		// Fetch assessment submissions and scores
		const submissionsQuery = query(
			collection(db, 'submission'),
			where('studentId', '==', userId)
		);
		const submissionsSnapshot = await getDocs(submissionsQuery);
		const assessmentScores = [];
		const assignmentGrades = [];
		const weakAreas = [];
		const strongAreas = [];
		
		for (const submissionDoc of submissionsSnapshot.docs) {
			const submissionData = submissionDoc.data();
			
			// Check if it's an assessment submission
			if (submissionData.assessmentId) {
				const assessmentDoc = await getDoc(doc(db, 'assessment', submissionData.assessmentId));
				if (assessmentDoc.exists()) {
					const assessmentData = assessmentDoc.data();
					const score = submissionData.grade || 0;
					assessmentScores.push({
						assessmentId: submissionData.assessmentId,
						title: assessmentData.title,
						score: score,
						courseId: assessmentData.courseId
					});
					
					// Identify weak/strong areas based on scores
					if (score < 70) {
						weakAreas.push({
							topic: assessmentData.title,
							avgScore: score,
							lessonPath: assessmentData.courseId ? `/courses/${assessmentData.courseId}` : '/courses'
						});
					} else if (score >= 85) {
						strongAreas.push({
							topic: assessmentData.title,
							avgScore: score
						});
					}
				}
			}
			
			// Check if it's an assignment submission
			if (submissionData.assignmentId) {
				const grade = submissionData.grade || 0;
				assignmentGrades.push({
					assignmentId: submissionData.assignmentId,
					grade: grade
				});
			}
		}
		
		// Prepare performance data
		const performanceData = {
			enrolledCourses: enrollments,
			completedLessons,
			assessmentScores,
			assignmentGrades,
			overallProgress,
			weakAreas,
			strongAreas
		};
		
		// Generate recommendations
		const recommendations = generateRecommendations(performanceData, language);
		
		return NextResponse.json({
			recommendations,
			performanceSummary: {
				enrolledCoursesCount: enrollments.length,
				completedLessonsCount: completedLessons.length,
				averageAssessmentScore: assessmentScores.length > 0
					? assessmentScores.reduce((sum, s) => sum + s.score, 0) / assessmentScores.length
					: null,
				averageAssignmentGrade: assignmentGrades.length > 0
					? assignmentGrades.reduce((sum, g) => sum + g.grade, 0) / assignmentGrades.length
					: null
			}
		});
	} catch (err) {
		console.error('Error generating recommendations:', err);
		return NextResponse.json(
			{ error: 'Failed to generate recommendations', details: String(err) },
			{ status: 500 }
		);
	}
}

