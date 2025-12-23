'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown, ArrowRight, Brain } from 'lucide-react';
import Link from 'next/link';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function WeakAreasPage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [weakAreas, setWeakAreas] = useState([]);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				setError('You must be signed in to view weak learning areas.');
				setLoading(false);
				return;
			}

			await loadWeakAreasForStudent(user.uid);
		});

		return () => unsubscribe();
	}, []);

	async function loadWeakAreasForStudent(studentId) {
		setLoading(true);
		setError('');

		try {
			// 1. Fetch all submissions for this student
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('studentId', '==', studentId)
			);
			const submissionsSnapshot = await getDocs(submissionsQuery);
			const submissions = submissionsSnapshot.docs.map(docSnap => ({
				id: docSnap.id,
				...docSnap.data(),
			}));

			if (submissions.length === 0) {
				setWeakAreas([]);
				return;
			}

			// 2. Group scores by topic (assessment or assignment title)
			const topicScores = new Map();

			for (const submission of submissions) {
				// Assessments
				if (submission.assessmentId) {
					try {
						const assessmentDoc = await getDoc(doc(db, 'assessment', submission.assessmentId));
						if (assessmentDoc.exists()) {
							const assessmentData = assessmentDoc.data();
							const title = assessmentData.title || 'Assessment';
							const courseId = assessmentData.courseId;

							let percentScore = null;
							if (typeof submission.score === 'number' && typeof submission.totalPoints === 'number' && submission.totalPoints > 0) {
								percentScore = (submission.score / submission.totalPoints) * 100;
							} else if (typeof submission.grade === 'number') {
								percentScore = submission.grade;
							}

							if (percentScore !== null) {
								const key = `assessment_${submission.assessmentId}`;
								const existing = topicScores.get(key) || {
									topic: title,
									sum: 0,
									count: 0,
									lessonPath: courseId ? `/courses/${courseId}` : '/courses',
								};
								existing.sum += percentScore;
								existing.count += 1;
								topicScores.set(key, existing);
							}
						}
					} catch (err) {
						console.error('Error loading assessment for weak areas:', err);
					}
				}

				// Assignments
				if (submission.assignmentId) {
					try {
						const assignmentDoc = await getDoc(doc(db, 'assignment', submission.assignmentId));
						if (assignmentDoc.exists()) {
							const assignmentData = assignmentDoc.data();
							const title = assignmentData.title || 'Assignment';
							const courseId = assignmentData.courseId;

							const percentScore =
								typeof submission.grade === 'number' ? submission.grade : null;

							if (percentScore !== null) {
								const key = `assignment_${submission.assignmentId}`;
								const existing = topicScores.get(key) || {
									topic: title,
									sum: 0,
									count: 0,
									lessonPath: courseId ? `/courses/${courseId}` : '/courses',
								};
								existing.sum += percentScore;
								existing.count += 1;
								topicScores.set(key, existing);
							}
						}
					} catch (err) {
						console.error('Error loading assignment for weak areas:', err);
					}
				}
			}

			// 3. Build weak area list (topics with average score < 70%)
			const weakAreaList = Array.from(topicScores.values())
				.map((entry) => ({
					topic: entry.topic,
					avgScore: entry.count > 0 ? entry.sum / entry.count : null,
					lessonPath: entry.lessonPath,
				}))
				.filter((area) => area.avgScore !== null && area.avgScore < 70)
				.sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0));

			setWeakAreas(weakAreaList);
		} catch (err) {
			console.error('Error loading weak areas:', err);
			setError('Failed to analyze your performance. Please try again later.');
		} finally {
			setLoading(false);
		}
	}

	function getSeverity(score) {
		if (typeof score !== 'number') return { label: 'Unknown', colorClass: 'text-muted-foreground' };
		if (score < 50) return { label: 'Severe Weakness', colorClass: 'text-destructive' };
		if (score < 70) return { label: 'Needs Improvement', colorClass: 'text-warning' };
		return { label: 'Stable', colorClass: 'text-success' };
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Weak Learning Areas</h1>
					<p className="text-body text-muted-foreground">Analyzing your assessments and assignments...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Weak Learning Areas</h1>
					<p className="text-body text-muted-foreground">
						We ran into a problem while trying to analyze your performance.
					</p>
				</div>
				<Card className="border-destructive bg-destructive/5">
					<CardContent className="py-6 flex items-center gap-3">
						<AlertCircle className="h-5 w-5 text-destructive" />
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Weak Learning Areas</h1>
					<p className="text-body text-muted-foreground">
						Insights into topics where your scores are lowest, based on your recent assessments and assignments.
					</p>
				</div>
				<Link href="/progress">
					<Button variant="outline" size="sm">
						View Overall Progress
					</Button>
				</Link>
			</div>

			{weakAreas.length === 0 ? (
				<Card className="border-success/30 bg-success/5">
					<CardContent className="py-8 flex items-center gap-3">
						<Brain className="h-6 w-6 text-success" />
						<div>
							<p className="text-body font-semibold text-neutralDark">
								No weak areas detected right now.
							</p>
							<p className="text-caption text-muted-foreground mt-1">
								Keep completing assessments and assignments. If any topics become challenging, they will appear here
								with targeted suggestions.
							</p>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{weakAreas.map((area, index) => {
						const score = typeof area.avgScore === 'number' ? area.avgScore : null;
						const severity = getSeverity(score ?? NaN);

						return (
							<Card key={index} className="card-hover">
								<CardHeader>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-3 flex-1">
											<div className="p-2 bg-error/10 rounded-lg">
												<TrendingDown className="h-5 w-5 text-error" />
											</div>
											<div className="flex-1">
												<CardTitle className="text-h3 mb-1">
													{area.topic || 'Unknown Topic'}
												</CardTitle>
												<CardDescription>
													This topic is showing lower scores compared to your other work. Reviewing it will help
													strengthen your foundation.
												</CardDescription>
											</div>
										</div>
										{score !== null && (
											<div className="text-right">
												<p className="text-sm font-semibold text-neutralDark">
													Average Score
												</p>
												<p className="text-2xl font-bold text-error">
													{score.toFixed(0)}%
												</p>
												<p className={`text-xs mt-1 ${severity.colorClass}`}>
													{severity.label}
												</p>
											</div>
										)}
									</div>
								</CardHeader>
								<CardContent className="flex items-center justify-between gap-4 pt-0">
									<p className="text-caption text-muted-foreground">
										Based on your past submissions where your score fell below 70% for this topic.
									</p>
									{area.lessonPath && (
										<Link href={area.lessonPath}>
											<Button size="sm" className="flex items-center gap-1">
												Review Related Content
												<ArrowRight className="h-4 w-4" />
											</Button>
										</Link>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}


