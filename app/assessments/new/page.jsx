'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Loader2, Sparkles, Plus, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

export default function CreateAssessmentPage() {
	const router = useRouter();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState('');
	const [courseTitle, setCourseTitle] = useState('');
	const [type, setType] = useState('quiz');
	const [questions, setQuestions] = useState([]);
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [generating, setGenerating] = useState(false);
	const [published, setPublished] = useState(false);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	useEffect(() => {
		if (userRole === 'teacher' || userRole === 'admin') {
			loadCourses();
		}
	}, [userRole]);

	async function loadCourses() {
		setLoading(true);
		try {
			const coursesQuery = query(collection(db, 'courses'));
			const snapshot = await getDocs(coursesQuery);
			const loadedCourses = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
			setCourses(loadedCourses);
		} catch (err) {
			console.error('Error loading courses:', err);
		} finally {
			setLoading(false);
		}
	}

	function handleCourseChange(e) {
		const selectedCourseId = e.target.value;
		setCourseId(selectedCourseId);
		const selectedCourse = courses.find(c => c.id === selectedCourseId);
		setCourseTitle(selectedCourse ? selectedCourse.title : '');
	}

	function addQuestion() {
		const newQuestion = {
			id: Date.now().toString(),
			type: 'mcq',
			question: '',
			options: ['', '', '', ''],
			correctAnswer: 0,
			points: 1,
		};
		setQuestions([...questions, newQuestion]);
	}

	function updateQuestion(questionId, field, value) {
		setQuestions(questions.map(q => 
			q.id === questionId ? { ...q, [field]: value } : q
		));
	}

	function updateQuestionOption(questionId, optionIndex, value) {
		setQuestions(questions.map(q => {
			if (q.id === questionId) {
				const newOptions = [...q.options];
				newOptions[optionIndex] = value;
				return { ...q, options: newOptions };
			}
			return q;
		}));
	}

	function removeQuestion(questionId) {
		setQuestions(questions.filter(q => q.id !== questionId));
	}

	function addOption(questionId) {
		setQuestions(questions.map(q => {
			if (q.id === questionId) {
				return { ...q, options: [...q.options, ''] };
			}
			return q;
		}));
	}

	function removeOption(questionId, optionIndex) {
		setQuestions(questions.map(q => {
			if (q.id === questionId && q.options.length > 2) {
				const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
				return { 
					...q, 
					options: newOptions,
					correctAnswer: q.correctAnswer >= newOptions.length ? 0 : q.correctAnswer
				};
			}
			return q;
		}));
	}

	async function handleGenerateContent() {
		if (!courseId) {
			alert('Please select a course first');
			return;
		}

		setGenerating(true);
		try {
			const selectedCourse = courses.find(c => c.id === courseId);
			const courseTitle = selectedCourse?.title || '';
			const courseDescription = selectedCourse?.description || '';

			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'generate_assessment',
					options: {
						courseTitle,
						courseDescription,
						type,
						numQuestions: 5,
					},
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to generate content');
			}

			const data = await response.json();
			
			if (data.title) {
				setTitle(data.title);
			}
			if (data.description) {
				setDescription(data.description);
			}
			if (data.questions && Array.isArray(data.questions)) {
				setQuestions(data.questions.map((q, idx) => ({
					id: `generated_${Date.now()}_${idx}`,
					...q,
				})));
			}
		} catch (err) {
			console.error('Error generating assessment content:', err);
			alert('Failed to generate content: ' + (err.message || 'Unknown error'));
		} finally {
			setGenerating(false);
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();

		if (!title.trim()) {
			alert('Assessment title is required');
			return;
		}

		if (!courseId) {
			alert('Please select a course');
			return;
		}

		if (questions.length === 0) {
			alert('Please add at least one question');
			return;
		}

		// Validate questions
		for (const q of questions) {
			if (!q.question.trim()) {
				alert('All questions must have a question text');
				return;
			}
			if (q.type === 'mcq') {
				if (q.options.length < 2) {
					alert('MCQ questions must have at least 2 options');
					return;
				}
				if (q.options.some(opt => !opt.trim())) {
					alert('All MCQ options must be filled');
					return;
				}
			}
		}

		setSubmitting(true);

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to create assessments');
			}

			const assessmentData = {
				title: title.trim(),
				description: description.trim() || '',
				courseId,
				courseTitle,
				type,
				questions: questions.map(q => ({
					type: q.type,
					question: q.question.trim(),
					options: q.type === 'mcq' ? q.options.map(opt => opt.trim()) : undefined,
					correctAnswer: q.type === 'mcq' ? q.correctAnswer : q.correctAnswer || '',
					points: q.points || 1,
				})),
				published,
				createdBy: auth.currentUser.uid,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			await addDoc(collection(db, 'assessments'), assessmentData);

			router.push('/assessments');
		} catch (err) {
			console.error('Error creating assessment:', err);
			alert('Failed to create assessment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Create Assessment</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Create Assessment</h1>
					<p className="text-body text-muted-foreground">Access denied.</p>
				</div>
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
				<h1 className="text-h1 text-neutralDark mb-2">Create Assessment</h1>
				<p className="text-body text-muted-foreground">Create a new assessment with questions for your course</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
							<CardDescription>Enter the assessment details</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label htmlFor="title" className="block text-sm font-medium mb-2">
									Assessment Title <span className="text-destructive">*</span>
								</label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="e.g., Python Fundamentals Quiz"
									required
								/>
							</div>

							<div>
								<label htmlFor="course" className="block text-sm font-medium mb-2">
									Course <span className="text-destructive">*</span>
								</label>
								<select
									id="course"
									value={courseId}
									onChange={handleCourseChange}
									className="w-full px-3 py-2 border border-border rounded-md bg-white"
									required
								>
									<option value="">Select a course</option>
									{courses.map((course) => (
										<option key={course.id} value={course.id}>
											{course.title}
										</option>
									))}
								</select>
							</div>

							<div>
								<label htmlFor="type" className="block text-sm font-medium mb-2">
									Assessment Type <span className="text-destructive">*</span>
								</label>
								<select
									id="type"
									value={type}
									onChange={(e) => setType(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-md bg-white"
									required
								>
									<option value="quiz">Quiz</option>
									<option value="assignment">Assignment</option>
									<option value="coding">Coding Challenge</option>
								</select>
							</div>

							<div>
								<div className="flex items-center justify-between mb-2">
									<label htmlFor="description" className="block text-sm font-medium">
										Description
									</label>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleGenerateContent}
										disabled={generating || !courseId}
										className="flex items-center gap-2"
									>
										{generating ? (
											<>
												<Loader2 className="h-5 w-5 animate-spin" />
												Generating...
											</>
										) : (
											<>
												<Sparkles className="h-5 w-5" />
												Generate Content
											</>
										)}
									</Button>
								</div>
								<RichTextEditor
									value={description}
									onChange={setDescription}
									placeholder="Enter assessment description and instructions..."
								/>
								<p className="text-xs text-muted-foreground mt-1">
									Click "Generate Content" to create a sample assessment scaffold based on the selected course
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Questions */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Questions</CardTitle>
									<CardDescription>Add questions to your assessment</CardDescription>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addQuestion}
								>
									<Plus className="h-5 w-5 mr-2" />
									Add Question
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{questions.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<p>No questions added yet. Click "Add Question" to get started.</p>
								</div>
							) : (
								questions.map((question, index) => (
									<div key={question.id} className="border border-border rounded-lg p-4 space-y-4">
										<div className="flex items-start justify-between">
											<h4 className="font-medium text-lg">Question {index + 1}</h4>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => removeQuestion(question.id)}
												className="text-destructive hover:text-destructive"
											>
												<Trash2 className="h-5 w-5" />
											</Button>
										</div>

										<div>
											<label className="block text-sm font-medium mb-2">
												Question Type
											</label>
											<select
												value={question.type}
												onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
												className="w-full px-3 py-2 border border-border rounded-md bg-white"
											>
												<option value="mcq">Multiple Choice (MCQ)</option>
												<option value="text">Text-based Answer</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium mb-2">
												Question Text <span className="text-destructive">*</span>
											</label>
											<Input
												value={question.question}
												onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
												placeholder="Enter your question here..."
												required
											/>
										</div>

										{question.type === 'mcq' ? (
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<label className="block text-sm font-medium">Answer Options</label>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => addOption(question.id)}
													>
														<Plus className="h-5 w-5 mr-1" />
														Add Option
													</Button>
												</div>
												{question.options.map((option, optIndex) => (
													<div key={optIndex} className="flex items-center gap-2">
														<input
															type="radio"
															name={`correct_${question.id}`}
															checked={question.correctAnswer === optIndex}
															onChange={() => updateQuestion(question.id, 'correctAnswer', optIndex)}
															className="w-5 h-5"
														/>
														<Input
															value={option}
															onChange={(e) => updateQuestionOption(question.id, optIndex, e.target.value)}
															placeholder={`Option ${optIndex + 1}`}
															className="flex-1"
														/>
														{question.options.length > 2 && (
															<Button
																type="button"
																variant="ghost"
																size="sm"
																onClick={() => removeOption(question.id, optIndex)}
															>
																<X className="h-5 w-5" />
															</Button>
														)}
													</div>
												))}
												<p className="text-xs text-muted-foreground">
													Select the radio button next to the correct answer
												</p>
											</div>
										) : (
											<div>
												<label className="block text-sm font-medium mb-2">
													Correct Answer (for reference)
												</label>
												<Input
													value={question.correctAnswer || ''}
													onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
													placeholder="Enter the expected answer..."
												/>
											</div>
										)}

										<div>
											<label className="block text-sm font-medium mb-2">
												Points
											</label>
											<div className="flex gap-2">
												{[1, 2, 3, 4, 5].map((points) => (
													<button
														key={points}
														type="button"
														onClick={() => updateQuestion(question.id, 'points', points)}
														className={`px-4 py-2 rounded-md font-medium transition-all ${
															(question.points || 1) === points
																? 'bg-primary text-white shadow-sm'
																: 'bg-neutralLight text-neutralDark hover:bg-primary/10 border border-border'
														}`}
													>
														{points}
													</button>
												))}
											</div>
										</div>
									</div>
								))
							)}
						</CardContent>
					</Card>

					{/* Settings */}
					<Card>
						<CardHeader>
							<CardTitle>Settings</CardTitle>
							<CardDescription>Configure assessment settings</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-3">
								<input
									type="checkbox"
									id="published"
									checked={published}
									onChange={(e) => setPublished(e.target.checked)}
									className="w-5 h-5"
								/>
								<label htmlFor="published" className="text-sm font-medium cursor-pointer">
									Publish immediately (visible to students)
								</label>
							</div>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex gap-4 w-1/2 mx-auto justify-center">
						<Button
							type="submit"
							disabled={submitting}
							title="Create Assessment"
						>
							{submitting ? (
								<>
									<Loader2 className="h-5 w-5 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								<>
									<Save className="h-5 w-5 mr-2" />
									Create Assessment
								</>
							)}
						</Button>
						<Link href="/assessments">
							<Button variant="outline" type="button" title="Cancel">
								Cancel
							</Button>
						</Link>
					</div>
				</div>
			</form>
		</div>
	);
}

