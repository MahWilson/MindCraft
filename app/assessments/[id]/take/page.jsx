'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Clock, Play, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

function withColor(blocks) {
	const colorMap = {
		select_table: 'bg-sky-200',
		select_columns: 'bg-sky-200',
		where_filter: 'bg-amber-200',
		order_by: 'bg-purple-200',
		limit: 'bg-emerald-200',
		join: 'bg-blue-200',
		group_by: 'bg-indigo-200',
		having: 'bg-rose-200',
		agg_sum: 'bg-green-200',
		agg_avg: 'bg-green-200',
		agg_count: 'bg-green-200',
		insert: 'bg-orange-200',
		update: 'bg-orange-200',
		delete: 'bg-orange-200',
		commit: 'bg-gray-200',
		explain: 'bg-yellow-200',
		add_index: 'bg-yellow-100',
		drop_index: 'bg-yellow-100',
		create_table: 'bg-pink-100',
		add_column: 'bg-pink-100',
		primary_key: 'bg-pink-100',
		foreign_key: 'bg-pink-100',
		custom: 'bg-neutral-200',
	};
	return blocks.map(b => ({ ...b, color: colorMap[b.type] || 'bg-neutral-200' }));
}

function makeBlock(block) {
	return {
		id: crypto.randomUUID ? crypto.randomUUID() : `b_${Date.now()}_${Math.random()}`,
		type: block.type,
		label: block.label,
		color: block.color,
	};
}

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
	const [gameBlocks, setGameBlocks] = useState([]);
	const [gameMessage, setGameMessage] = useState('');
	const [gameResult, setGameResult] = useState(null);
	const [gamePalette, setGamePalette] = useState([]);

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
			if (assessmentData.type !== 'gameLevel' && assessmentData.questions) {
				const initialAnswers = {};
				assessmentData.questions.forEach((q, idx) => {
					initialAnswers[idx] = q.type === 'mcq' ? null : '';
				});
				setAnswers(initialAnswers);
			}
			if (assessmentData.type === 'gameLevel') {
				setGameBlocks([]);
				const seq = assessmentData.gameLevel?.blockSequence || [];
				const palette = withColor(seq);
				setGamePalette(palette);
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

	function handleGameDragStart(event, block) {
		event.dataTransfer.setData('text/plain', JSON.stringify(block));
	}

	function handleGameDrop(event) {
		event.preventDefault();
		const data = event.dataTransfer.getData('text/plain');
		if (!data) return;
		let block;
		try {
			block = JSON.parse(data);
		} catch (err) {
			console.error('Bad drag data', err);
			return;
		}
		setGameBlocks(prev => [...prev, makeBlock(block)]);
	}

	function handleGameDragOver(event) {
		event.preventDefault();
	}

	function removeGameBlock(id) {
		setGameBlocks(prev => prev.filter(b => b.id !== id));
	}

	function resetGameBlocks() {
		setGameBlocks([]);
		setGameResult(null);
		setGameMessage('');
	}

	function evaluateGameBlocks(levelMeta, blocks) {
		if (!blocks.length) {
			return { ok: false, detail: 'Add some blocks first.' };
		}

		const types = blocks.map(b => b.type);
		const required = levelMeta?.blockSequence || [];
		if (required.length === 0) {
			return { ok: false, detail: 'No expected sequence set by teacher.' };
		}

		const matchesLength = blocks.length === required.length;
		const matchesOrder = matchesLength && required.every((req, i) => {
			const student = blocks[i];
			const sameType = student.type === req.type;
			const sameLabel = (student.label || '').trim() === (req.label || '').trim();
			return sameType && sameLabel;
		});

		return {
			ok: matchesOrder,
			detail: matchesOrder ? 'Sequence matches exactly.' : 'Sequence/order is incorrect.',
		};
	}

	function runGameLevel() {
		if (assessment?.type !== 'gameLevel') return;
		const result = evaluateGameBlocks(assessment.gameLevel, gameBlocks);
		setGameResult(result);
		setGameMessage(result.ok ? 'Goal met! Submit to record.' : result.detail);
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
			if (assessment.type === 'gameLevel') {
				if (!gameResult?.ok) {
					alert(gameMessage || 'Finish the blocks to meet the goal first.');
					return;
				}
			} else if (assessment.questions) {
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

			let score = 0;
			let totalPoints = 0;
			const gradedAnswers = {};

			if (assessment.type === 'gameLevel') {
				score = 1;
				totalPoints = 1;
				gradedAnswers[0] = {
					question: assessment.gameLevel?.goal || 'Game level',
					studentAnswer: gameBlocks.map(b => b.type),
					correctAnswer: 'Meets goal',
					points: 1,
					earned: 1,
				};
			} else if (assessment.questions) {
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

			{/* Game Level */}
			{assessment?.type === 'gameLevel' && (
				<div className="grid gap-4 lg:grid-cols-[320px,1fr]">
					<Card>
						<CardHeader>
							<CardTitle className="text-h4">Blocks</CardTitle>
							<CardDescription>Drag to build the query logic.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							{gamePalette.length === 0 && (
								<p className="text-caption text-muted-foreground">No blocks defined by teacher.</p>
							)}
							{gamePalette.map(block => (
								<div
									key={block.type}
									draggable
									onDragStart={(e) => handleGameDragStart(e, block)}
									className={`cursor-grab rounded px-3 py-2 border text-sm ${block.color}`}
								>
									{block.label}
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-col gap-2">
							<CardTitle className="text-h4">Workspace</CardTitle>
							<p className="text-caption text-muted-foreground">
								Drop blocks here then run to check the goal.
							</p>
							<div className="flex gap-2">
								<Button size="sm" variant="secondary" onClick={runGameLevel}>
									<Play className="h-4 w-4 mr-2" />
									Run
								</Button>
								<Button size="sm" variant="outline" onClick={resetGameBlocks}>
									<RefreshCcw className="h-4 w-4 mr-2" />
									Clear
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div
								onDragOver={handleGameDragOver}
								onDrop={handleGameDrop}
								className="min-h-[220px] border rounded p-3 bg-muted/40 space-y-2"
							>
								{gameBlocks.length === 0 && (
									<p className="text-caption text-muted-foreground">Drag blocks here.</p>
								)}
								{gameBlocks.map(block => (
									<div
										key={block.id}
										className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2"
									>
										<p className="text-body font-medium">{block.label}</p>
										<button
											type="button"
											className="text-xs text-error"
											onClick={() => removeGameBlock(block.id)}
										>
											remove
										</button>
									</div>
								))}
							</div>
							<div className="mt-3 text-sm space-y-2">
								<p className="font-semibold">Goal</p>
								<p className="text-muted-foreground">
									{assessment.gameLevel?.notes || 'Build the SQL logic to match the goal.'}
								</p>
								<div className="flex flex-col md:flex-row gap-3">
									<div className="border rounded p-3 bg-white flex-1">
										<p className="font-semibold text-body">Table A</p>
										<p className="text-muted-foreground text-sm">{assessment.gameLevel?.tableA || 'tableA'}</p>
										<div className="mt-1 flex flex-wrap gap-1">
											{(assessment.gameLevel?.columns || '').split(',').map((col, idx) => (
												<span key={idx} className="text-caption px-2 py-1 rounded bg-muted text-neutralDark border">
													{col.trim()}
												</span>
											))}
										</div>
									</div>
									{assessment.gameLevel?.tableB && (
										<div className="border rounded p-3 bg-white flex-1">
											<p className="font-semibold text-body">Table B</p>
											<p className="text-muted-foreground text-sm">{assessment.gameLevel.tableB}</p>
										</div>
									)}
								</div>
							</div>
							{gameMessage && (
								<p className={`mt-2 text-sm ${gameResult?.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
									{gameMessage}
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{/* Questions */}
			{assessment?.type !== 'gameLevel' && assessment?.questions && assessment.questions.length > 0 && (
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

