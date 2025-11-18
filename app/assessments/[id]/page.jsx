'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function AssessmentAttemptPage({ params }) {
	const [assessment, setAssessment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [userRole, setUserRole] = useState(null);
	const [answers, setAnswers] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const router = useRouter();
	const assessmentId = params.id;

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					await loadAssessment(role);
				}
			} else {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [assessmentId, router]);

	async function loadAssessment(role) {
		try {
			setLoading(true);
			const response = await fetch(`/api/assessments/${assessmentId}`);
			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to load assessment');
			}

			const assessmentData = data.assessment;

			// Students can only view published assessments
			if (role === 'student' && !assessmentData.published) {
				setError('This assessment is not available yet');
				return;
			}

			setAssessment(assessmentData);
		} catch (err) {
			console.error('Error loading assessment:', err);
			setError(err.message || 'Failed to load assessment');
		} finally {
			setLoading(false);
		}
	}

	function handleAnswerChange(questionId, value) {
		setAnswers({
			...answers,
			[questionId]: value,
		});
	}

	async function handleSubmit(e) {
		e.preventDefault();
		
		// Validate all questions are answered
		const unansweredQuestions = assessment.questions.filter(
			(q) => !answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)
		);

		if (unansweredQuestions.length > 0) {
			alert(`Please answer all questions. ${unansweredQuestions.length} question(s) remaining.`);
			return;
		}

		setSubmitting(true);
		
		try {
			// Here you would submit to /api/submissions
			// For now, just simulate submission
			await new Promise((resolve) => setTimeout(resolve, 1000));
			setSubmitted(true);
		} catch (err) {
			console.error('Error submitting assessment:', err);
			alert('Failed to submit assessment. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading assessment...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-4xl mx-auto">
				<Card className="border-error bg-error/5">
					<CardContent className="pt-6">
						<div className="flex items-center gap-3 text-error">
							<AlertCircle className="h-6 w-6" />
							<div>
								<h2 className="text-h3 text-error mb-1">Error</h2>
								<p className="text-body">{error}</p>
							</div>
						</div>
						<Link href="/courses">
							<Button variant="outline" className="mt-6">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Courses
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (submitted) {
		return (
			<div className="max-w-4xl mx-auto">
				<Card className="border-success bg-success/5">
					<CardContent className="pt-6">
						<div className="text-center py-12">
							<CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
							<h2 className="text-h2 text-success mb-2">Assessment Submitted!</h2>
							<p className="text-body text-muted-foreground mb-6">
								Your answers have been recorded successfully.
							</p>
							<Link href="/courses">
								<Button>Back to Courses</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!assessment) {
		return null;
	}

	return (
		<div className="max-w-4xl mx-auto">
			{/* Header */}
			<div className="mb-8">
				<Link href="/courses">
					<Button variant="ghost" size="sm" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Courses
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">{assessment.title}</h1>
				{assessment.description && (
					<p className="text-body text-muted-foreground">{assessment.description}</p>
				)}
			</div>

			{/* Assessment Info */}
			<Card className="mb-6">
				<CardContent className="pt-6">
					<div className="flex flex-wrap gap-6 text-body">
						<div className="flex items-center gap-2">
							<span className="font-medium text-neutralDark">Questions:</span>
							<span className="text-muted-foreground">{assessment.questions.length}</span>
						</div>
						{assessment.config?.timer && (
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium text-neutralDark">Time Limit:</span>
								<span className="text-muted-foreground">{assessment.config.timer} minutes</span>
							</div>
						)}
						{assessment.config?.attempts && (
							<div className="flex items-center gap-2">
								<span className="font-medium text-neutralDark">Attempts:</span>
								<span className="text-muted-foreground">{assessment.config.attempts}</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Questions */}
			<form onSubmit={handleSubmit} className="space-y-6">
				{assessment.questions.map((question, index) => (
					<Card key={question.id}>
						<CardHeader>
							<CardTitle className="text-h3">
								Question {index + 1}
								{question.points && (
									<span className="text-body font-normal text-muted-foreground ml-2">
										({question.points} {question.points === 1 ? 'point' : 'points'})
									</span>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-body text-neutralDark whitespace-pre-wrap">{question.question}</p>

							{/* MCQ */}
							{question.type === 'mcq' && (
								<div className="space-y-2">
									{question.options.map((option, optionIndex) => (
										<label
											key={optionIndex}
											className="flex items-center gap-3 p-3 rounded-lg border border-input cursor-pointer hover:bg-accent transition-colors"
										>
											<input
												type="radio"
												name={`question-${question.id}`}
												value={optionIndex}
												checked={answers[question.id] === optionIndex}
												onChange={() => handleAnswerChange(question.id, optionIndex)}
												className="w-4 h-4"
												required
											/>
											<span className="text-body">{option}</span>
										</label>
									))}
								</div>
							)}

							{/* True/False */}
							{question.type === 'true-false' && (
								<div className="space-y-2">
									<label className="flex items-center gap-3 p-3 rounded-lg border border-input cursor-pointer hover:bg-accent transition-colors">
										<input
											type="radio"
											name={`question-${question.id}`}
											value="true"
											checked={answers[question.id] === 'true'}
											onChange={() => handleAnswerChange(question.id, 'true')}
											className="w-4 h-4"
											required
										/>
										<span className="text-body">True</span>
									</label>
									<label className="flex items-center gap-3 p-3 rounded-lg border border-input cursor-pointer hover:bg-accent transition-colors">
										<input
											type="radio"
											name={`question-${question.id}`}
											value="false"
											checked={answers[question.id] === 'false'}
											onChange={() => handleAnswerChange(question.id, 'false')}
											className="w-4 h-4"
											required
										/>
										<span className="text-body">False</span>
									</label>
								</div>
							)}

							{/* Short Text */}
							{question.type === 'short-text' && (
								<Input
									value={answers[question.id] || ''}
									onChange={(e) => handleAnswerChange(question.id, e.target.value)}
									placeholder="Enter your answer"
									required
								/>
							)}

							{/* Coding */}
							{question.type === 'coding' && (
								<div className="space-y-2">
									<div className="flex items-center justify-between mb-2">
										<span className="text-caption text-muted-foreground">
											Language: {question.language}
										</span>
									</div>
									<textarea
										value={answers[question.id] || question.starterCode || ''}
										onChange={(e) => handleAnswerChange(question.id, e.target.value)}
										rows={12}
										placeholder="Write your code here..."
										className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
										required
									/>
								</div>
							)}
						</CardContent>
					</Card>
				))}

				{/* Submit Button */}
				<Card>
					<CardContent className="pt-6">
						<Button type="submit" disabled={submitting} className="w-full" size="lg">
							{submitting ? 'Submitting...' : 'Submit Assessment'}
						</Button>
					</CardContent>
				</Card>
			</form>
		</div>
	);
}





