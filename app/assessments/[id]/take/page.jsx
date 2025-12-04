'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import Link from 'next/link';

export default function TakeAssessmentPage() {
	const params = useParams();
	const router = useRouter();
	const assessmentId = params.id;
	const timerIntervalRef = useRef(null);

	const [assessment, setAssessment] = useState(null);
	const [answers, setAnswers] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [error, setError] = useState('');
	const [timeRemaining, setTimeRemaining] = useState(null);
	const [attempts, setAttempts] = useState([]);
	const [canAttempt, setCanAttempt] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				await loadData();
			} else {
				router.push('/login');
			}
		});

		return () => {
			if (timerIntervalRef.current) {
				clearInterval(timerIntervalRef.current);
			}
			unsubscribe();
		};
	}, [assessmentId, router]);

	useEffect(() => {
		if (assessment && assessment.config?.timer && timeRemaining !== null) {
			if (timeRemaining <= 0) {
				handleAutoSubmit();
				return;
			}

			timerIntervalRef.current = setInterval(() => {
				setTimeRemaining(prev => {
					if (prev <= 1) {
						handleAutoSubmit();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => {
				if (timerIntervalRef.current) {
					clearInterval(timerIntervalRef.current);
				}
			};
		}
	}, [assessment, timeRemaining]);

	async function loadData() {
		setLoading(true);
		try {
			// Load assessment
			const assessmentDoc = await getDoc(doc(db, 'assessment', assessmentId));
			if (!assessmentDoc.exists()) {
				setError('Assessment not found');
				setLoading(false);
				return;
			}

			const assessmentData = { id: assessmentDoc.id, ...assessmentDoc.data() };
			
			// Check if assessment is published
			if (!assessmentData.published) {
				setError('This assessment is not available');
				setLoading(false);
				return;
			}

			// Check if student is enrolled in the course
			if (currentUserId && assessmentData.courseId) {
				const enrollmentDoc = await getDoc(doc(db, 'enrollment', `${currentUserId}_${assessmentData.courseId}`));
				if (!enrollmentDoc.exists()) {
					setError('You must be enrolled in this course to take this assessment');
					setLoading(false);
					return;
				}
			}

			// Check date restrictions
			if (assessmentData.config) {
				const now = new Date();
				if (assessmentData.config.startDate) {
					const startDate = assessmentData.config.startDate.toDate 
						? assessmentData.config.startDate.toDate() 
						: new Date(assessmentData.config.startDate);
					if (now < startDate) {
						setError('This assessment is not available yet');
						setLoading(false);
						return;
					}
				}
				if (assessmentData.config.endDate) {
					const endDate = assessmentData.config.endDate.toDate 
						? assessmentData.config.endDate.toDate() 
						: new Date(assessmentData.config.endDate);
					if (now > endDate) {
						setError('This assessment has expired');
						setLoading(false);
						return;
					}
				}
			}

			// Check attempt limits
			if (currentUserId && assessmentData.config?.attempts) {
				const attemptsQuery = query(
					collection(db, 'submission'),
					where('assessmentId', '==', assessmentId),
					where('studentId', '==', currentUserId)
				);
				const attemptsSnapshot = await getDocs(attemptsQuery);
				const existingAttempts = attemptsSnapshot.docs.map(doc => doc.data());
				setAttempts(existingAttempts);

				if (existingAttempts.length >= assessmentData.config.attempts) {
					setCanAttempt(false);
					setError(`You have reached the maximum number of attempts (${assessmentData.config.attempts})`);
					setLoading(false);
					return;
				}
			}

			setAssessment(assessmentData);

			// Initialize timer if configured
			if (assessmentData.config?.timer) {
				const timerMinutes = parseInt(assessmentData.config.timer);
				setTimeRemaining(timerMinutes * 60); // Convert to seconds
			}

			// Initialize answers
			if (assessmentData.questions) {
				const initialAnswers = {};
				assessmentData.questions.forEach((q, idx) => {
					initialAnswers[idx] = q.type === 'mcq' ? null : '';
				});
				setAnswers(initialAnswers);
			}
		} catch (err) {
			console.error('Error loading data:', err);
			setError('Failed to load assessment');
		} finally {
			setLoading(false);
		}
	}

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function handleAnswerChange(questionIndex, value) {
		setAnswers(prev => ({
			...prev,
			[questionIndex]: value,
		}));
	}

	async function handleAutoSubmit() {
		if (timerIntervalRef.current) {
			clearInterval(timerIntervalRef.current);
		}
		alert('Time is up! Your assessment will be submitted automatically.');
		await handleSubmit(true);
	}

	async function handleSubmit(isAutoSubmit = false) {
		if (!isAutoSubmit) {
			// Validate all questions are answered
			if (assessment.questions) {
				for (let i = 0; i < assessment.questions.length; i++) {
					if (answers[i] === null || answers[i] === undefined || answers[i] === '') {
						if (!confirm('You have unanswered questions. Are you sure you want to submit?')) {
							return;
						}
						break;
					}
				}
			}
		}

		setSubmitting(true);
		setError('');

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to submit');
			}

			// Calculate score
			let score = 0;
			let totalPoints = 0;
			const gradedAnswers = {};

			if (assessment.questions) {
				assessment.questions.forEach((question, idx) => {
					totalPoints += question.points || 1;
					const studentAnswer = answers[idx];
					
					if (question.type === 'mcq') {
						if (studentAnswer === question.correctAnswer) {
							score += question.points || 1;
						}
					}
					
					gradedAnswers[idx] = {
						question: question.question,
						studentAnswer: studentAnswer,
						correctAnswer: question.correctAnswer,
						points: question.points || 1,
						earned: question.type === 'mcq' && studentAnswer === question.correctAnswer ? question.points || 1 : 0,
					};
				});
			}

			const submissionData = {
				assessmentId,
				studentId: auth.currentUser.uid,
				answers: gradedAnswers,
				score,
				totalPoints,
				status: 'submitted',
				submittedAt: serverTimestamp(),
				timeRemaining: timeRemaining,
				isAutoSubmit,
			};

			await addDoc(collection(db, 'submission'), submissionData);

			alert(`Assessment submitted successfully! Your score: ${score}/${totalPoints}`);
			router.push('/assessments');
		} catch (err) {
			console.error('Error submitting assessment:', err);
			setError('Failed to submit assessment: ' + (err.message || 'Unknown error'));
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Take Assessment</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (error && !assessment) {
		return (
			<div className="space-y-8">
				<Link href="/assessments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assessments
					</Button>
				</Link>
				<Card>
					<CardContent className="py-12 text-center">
						<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!canAttempt) {
		return (
			<div className="space-y-8">
				<Link href="/assessments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assessments
					</Button>
				</Link>
				<Card>
					<CardContent className="py-12 text-center">
						<AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
						<p className="text-body text-warning">{error}</p>
						{attempts.length > 0 && (
							<div className="mt-4">
								<p className="text-sm text-muted-foreground">
									You have {attempts.length} attempt(s) recorded.
								</p>
							</div>
						)}
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
					<Button variant="ghost" className="mb-4" title="Back to Assessments">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assessments
					</Button>
				</Link>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-h1 text-neutralDark mb-2">{assessment?.title}</h1>
						<p className="text-body text-muted-foreground">
							{assessment?.description && (
								<span dangerouslySetInnerHTML={{ __html: assessment.description }} />
							)}
						</p>
					</div>
					{timeRemaining !== null && (
						<div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
							<Clock className="h-5 w-5 text-primary" />
							<span className="text-h3 font-mono text-primary">
								{formatTime(timeRemaining)}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Questions */}
			{assessment?.questions && assessment.questions.length > 0 && (
				<div className="space-y-6">
					{assessment.questions.map((question, index) => (
						<Card key={index}>
							<CardHeader>
								<CardTitle className="text-lg">
									Question {index + 1} {question.points && `(${question.points} point${question.points !== 1 ? 's' : ''})`}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<p className="text-body font-medium">{question.question}</p>

								{question.type === 'mcq' ? (
									<div className="space-y-2">
										{question.options && question.options.map((option, optIndex) => (
											<label
												key={optIndex}
												className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutralLight transition-colors"
											>
												<input
													type="radio"
													name={`question_${index}`}
													value={optIndex}
													checked={answers[index] === optIndex}
													onChange={(e) => handleAnswerChange(index, parseInt(e.target.value))}
													className="w-5 h-5"
												/>
												<span className="flex-1">{option}</span>
											</label>
										))}
									</div>
								) : (
									<Input
										value={answers[index] || ''}
										onChange={(e) => handleAnswerChange(index, e.target.value)}
										placeholder="Enter your answer here..."
										className="w-full"
									/>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Submit Section */}
			<Card>
				<CardContent className="py-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-body text-muted-foreground">
								{assessment?.questions?.length || 0} question(s) total
							</p>
							{attempts.length > 0 && (
								<p className="text-sm text-muted-foreground mt-1">
									Attempt {attempts.length + 1} of {assessment?.config?.attempts || 'unlimited'}
								</p>
							)}
						</div>
						<Button
							onClick={() => handleSubmit(false)}
							disabled={submitting}
							className="min-w-[150px]"
							title="Submit your assessment"
						>
							{submitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Submitting...
								</>
							) : (
								<>
									<CheckCircle className="h-4 w-4 mr-2" />
									Submit Assessment
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			{error && (
				<Card className="border-destructive bg-destructive/5">
					<CardContent className="py-4">
						<p className="text-sm text-destructive">{error}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

