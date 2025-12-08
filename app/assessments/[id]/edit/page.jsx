'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Loader2, Sparkles, Plus, X, Trash2, Joystick, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

const gameBlockLibrary = [
	{ type: 'select_table', label: 'Select table' },
	{ type: 'select_columns', label: 'Select columns' },
	{ type: 'where_filter', label: 'Filter rows' },
	{ type: 'order_by', label: 'Sort rows' },
	{ type: 'limit', label: 'Limit rows' },
	{ type: 'join', label: 'Join tables' },
	{ type: 'group_by', label: 'Group rows' },
	{ type: 'having', label: 'Having filter' },
	{ type: 'agg_sum', label: 'SUM' },
	{ type: 'agg_avg', label: 'AVG' },
	{ type: 'agg_count', label: 'COUNT' },
	{ type: 'insert', label: 'INSERT row' },
	{ type: 'update', label: 'UPDATE row' },
	{ type: 'delete', label: 'DELETE row' },
	{ type: 'commit', label: 'COMMIT' },
	{ type: 'explain', label: 'EXPLAIN' },
	{ type: 'add_index', label: 'ADD INDEX' },
	{ type: 'drop_index', label: 'DROP INDEX' },
	{ type: 'create_table', label: 'CREATE TABLE' },
	{ type: 'add_column', label: 'ADD COLUMN' },
	{ type: 'primary_key', label: 'PRIMARY KEY' },
	{ type: 'foreign_key', label: 'FOREIGN KEY' },
];

const gameLevelTemplates = [
	{
		id: 'pick_filter',
		title: 'Pick & Filter',
		goal: 'Choose table/columns, add filter, sort, limit rows.',
		defaults: {
			tableA: 'students',
			tableB: '',
			columns: 'name, grade, country',
			notes: 'Show top 5 students with grade > 80 sorted by grade desc',
		},
	},
	{
		id: 'joins',
		title: 'Joins',
		goal: 'Join two tables on matching fields, then filter/sort.',
		defaults: {
			tableA: 'students',
			tableB: 'courses',
			columns: 'students.name, courses.title, enrollments.score',
			notes: 'Join students to courses on enrollments; list scores > 70',
		},
	},
	{
		id: 'totals',
		title: 'Totals',
		goal: 'Sum/avg/count grouped by a field, having, sort.',
		defaults: {
			tableA: 'orders',
			tableB: '',
			columns: 'customer_id, SUM(total) as total_spent',
			notes: 'Total spend per customer, only totals > 500',
		},
	},
	{
		id: 'crud',
		title: 'Add/Change/Delete',
		goal: 'Insert, update (with where), delete (with where), commit.',
		defaults: {
			tableA: 'students',
			tableB: '',
			columns: 'name, email, grade',
			notes: 'Insert a student, update grade with where, delete test rows',
		},
	},
	{
		id: 'index_check',
		title: 'Index check',
		goal: 'See indexes, add/remove, run explain to compare speed.',
		defaults: {
			tableA: 'users',
			tableB: '',
			columns: 'email, created_at',
			notes: 'Explain query before/after adding index on email',
		},
	},
	{
		id: 'schema_design',
		title: 'Design a table',
		goal: 'Create table, add columns, primary key, foreign key.',
		defaults: {
			tableA: 'grades',
			tableB: 'students',
			columns: 'id PK, student_id FK, course_id FK, score INT',
			notes: 'Create grades table linked to students and courses',
		},
	},
];

export default function EditAssessmentPage() {
	const params = useParams();
	const router = useRouter();
	const assessmentId = params.id;

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState('');
	const [courseTitle, setCourseTitle] = useState('');
	const [type, setType] = useState('quiz');
	const [questions, setQuestions] = useState([]);
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [error, setError] = useState('');
	const [generating, setGenerating] = useState(false);
	const [published, setPublished] = useState(false);
	const [config, setConfig] = useState({
		startDate: '',
		endDate: '',
		timer: '',
		attempts: 1,
	});
	const [gameLevelType, setGameLevelType] = useState(gameLevelTemplates[0].id);
	const [gameLevelConfig, setGameLevelConfig] = useState({
		tableA: gameLevelTemplates[0].defaults.tableA,
		tableB: gameLevelTemplates[0].defaults.tableB,
		columns: gameLevelTemplates[0].defaults.columns,
		notes: gameLevelTemplates[0].defaults.notes,
	});
	const [gameLevelBlocks, setGameLevelBlocks] = useState(gameLevelTemplates[0].defaults.blockSequence || []);

	function addBlockToSequence(type) {
		if (!type) return;
		const lib = gameBlockLibrary.find(b => b.type === type);
		const label = lib?.label || 'Custom block';
		setGameLevelBlocks(prev => [...prev, { type, label }]);
	}

	function removeBlockFromSequence(index) {
		setGameLevelBlocks(prev => prev.filter((_, i) => i !== index));
	}

	function moveBlock(index, direction) {
		setGameLevelBlocks(prev => {
			const arr = [...prev];
			const target = index + direction;
			if (target < 0 || target >= arr.length) return arr;
			[arr[index], arr[target]] = [arr[target], arr[index]];
			return arr;
		});
	}

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
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
		if ((userRole === 'teacher' || userRole === 'admin') && currentUserId) {
			loadData();
		}
	}, [assessmentId, userRole, currentUserId]);

	async function loadData() {
		setLoading(true);
		try {
			// Load courses
			const coursesQuery = query(collection(db, 'course'));
			const coursesSnapshot = await getDocs(coursesQuery);
			const loadedCourses = coursesSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
			setCourses(loadedCourses);

			// Load assessment
			const assessmentDoc = await getDoc(doc(db, 'assessment', assessmentId));
			if (!assessmentDoc.exists()) {
				setError('Assessment not found');
				setLoading(false);
				return;
			}

			const assessmentData = assessmentDoc.data();

			// Check permissions
			const currentUser = auth.currentUser;
			if (currentUser && assessmentData.createdBy !== currentUser.uid && userRole !== 'admin') {
				setError('You do not have permission to edit this assessment');
				setLoading(false);
				return;
			}

			setTitle(assessmentData.title || '');
			setDescription(assessmentData.description || '');
			setCourseId(assessmentData.courseId || '');
			setCourseTitle(assessmentData.courseTitle || '');
			setType(assessmentData.type || 'quiz');
			setPublished(assessmentData.published || false);
			if (assessmentData.gameLevel) {
				setGameLevelType(assessmentData.gameLevel.levelType || gameLevelTemplates[0].id);
				setGameLevelConfig({
					tableA: assessmentData.gameLevel.tableA || '',
					tableB: assessmentData.gameLevel.tableB || '',
					columns: assessmentData.gameLevel.columns || '',
					notes: assessmentData.gameLevel.notes || '',
				});
				setGameLevelBlocks(assessmentData.gameLevel.blockSequence || []);
			}
			
			// Load questions
			if (assessmentData.questions && Array.isArray(assessmentData.questions)) {
				setQuestions(assessmentData.questions.map((q, idx) => ({
					id: `question_${idx}_${Date.now()}`,
					type: q.type || 'mcq',
					question: q.question || '',
					options: q.options || ['', '', '', ''],
					correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
					points: q.points || 1,
				})));
			}

			// Load config
			if (assessmentData.config) {
				const configData = assessmentData.config;
				const startDate = configData.startDate 
					? (configData.startDate.toDate ? configData.startDate.toDate() : new Date(configData.startDate))
					: null;
				const endDate = configData.endDate 
					? (configData.endDate.toDate ? configData.endDate.toDate() : new Date(configData.endDate))
					: null;

				setConfig({
					startDate: startDate ? formatDateForInput(startDate) : '',
					endDate: endDate ? formatDateForInput(endDate) : '',
					timer: configData.timer || '',
					attempts: configData.attempts || 1,
				});
			}
		} catch (err) {
			console.error('Error loading data:', err);
			setError('Failed to load assessment');
		} finally {
			setLoading(false);
		}
	}

	function formatDateForInput(date) {
		const d = date instanceof Date ? date : new Date(date);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
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

		if (type !== 'gameLevel' && questions.length === 0) {
			alert('Please add at least one question');
			return;
		}

		if (type === 'gameLevel') {
			if (!gameLevelType) {
				alert('Pick a game level type');
				return;
			}
			if (gameLevelBlocks.length === 0) {
				alert('Add the required block sequence for this game level.');
				return;
			}
			if (gameLevelBlocks.some(b => !b.label?.trim())) {
				alert('Every block needs a label. Fill or remove empty ones.');
				return;
			}
		} else {
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
		}

		setSubmitting(true);

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to update assessments');
			}

			const assessmentData = {
				title: title.trim(),
				description: description.trim() || '',
				courseId,
				courseTitle,
				type,
				questions: type === 'gameLevel' ? [] : questions.map(q => ({
					type: q.type,
					question: q.question.trim(),
					options: q.type === 'mcq' ? q.options.map(opt => opt.trim()) : undefined,
					correctAnswer: q.type === 'mcq' ? q.correctAnswer : q.correctAnswer || '',
					points: q.points || 1,
				})),
				gameLevel: type === 'gameLevel' ? {
					levelType: gameLevelType,
					tableA: gameLevelConfig.tableA.trim(),
					tableB: gameLevelConfig.tableB.trim(),
					columns: gameLevelConfig.columns.trim(),
					notes: gameLevelConfig.notes.trim(),
					blockSequence: gameLevelBlocks.map(b => ({
						type: b.type,
						label: b.label.trim(),
					})),
				} : null,
				published,
				updatedAt: serverTimestamp(),
				config: {
					startDate: config.startDate ? new Date(config.startDate) : null,
					endDate: config.endDate ? new Date(config.endDate) : null,
					timer: config.timer ? parseInt(config.timer) : null,
					attempts: config.attempts ? parseInt(config.attempts) : null,
				},
			};

			await updateDoc(doc(db, 'assessment', assessmentId), assessmentData);

			router.push('/assessments');
		} catch (err) {
			console.error('Error updating assessment:', err);
			alert('Failed to update assessment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
			return;
		}

		setDeleting(true);

		try {
			await deleteDoc(doc(db, 'assessment', assessmentId));
			router.push('/assessments');
		} catch (err) {
			console.error('Error deleting assessment:', err);
			alert('Failed to delete assessment: ' + (err.message || 'Unknown error'));
			setDeleting(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Edit Assessment</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<Link href="/assessments">
					<Button variant="ghost" className="mb-4" title="Back to Assessments">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assessments
					</Button>
				</Link>
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Edit Assessment</h1>
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
				<h1 className="text-h1 text-neutralDark mb-2">Edit Assessment</h1>
				<p className="text-body text-muted-foreground">Update assessment details and questions</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
							<CardDescription>Update the assessment details</CardDescription>
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
									<option value="gameLevel">Gaming Level</option>
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

					{type === 'gameLevel' ? (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Joystick className="h-5 w-5" />
									Gaming Level Setup
								</CardTitle>
								<CardDescription>Pick a SQL-themed level type and name the tables/entities.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid md:grid-cols-2 gap-3">
									{gameLevelTemplates.map((tpl) => (
										<button
											type="button"
											key={tpl.id}
											onClick={() => {
												setGameLevelType(tpl.id);
												setGameLevelConfig(tpl.defaults);
												setGameLevelBlocks(tpl.defaults.blockSequence || []);
											}}
											className={`text-left border rounded p-3 space-y-1 transition ${
												gameLevelType === tpl.id ? 'border-primary bg-primary/5' : 'border-border bg-white'
											}`}
										>
											<p className="font-semibold text-body">{tpl.title}</p>
											<p className="text-caption text-muted-foreground">{tpl.goal}</p>
										</button>
									))}
								</div>
								<div className="grid md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<label className="text-sm font-medium">Main table name</label>
										<Input
											value={gameLevelConfig.tableA}
											onChange={(e) => setGameLevelConfig(prev => ({ ...prev, tableA: e.target.value }))}
											placeholder="students"
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium">Second table (if join)</label>
										<Input
											value={gameLevelConfig.tableB}
											onChange={(e) => setGameLevelConfig(prev => ({ ...prev, tableB: e.target.value }))}
											placeholder="courses"
										/>
									</div>
									<div className="space-y-2 md:col-span-2">
										<label className="text-sm font-medium">Columns / fields in play</label>
										<Input
											value={gameLevelConfig.columns}
											onChange={(e) => setGameLevelConfig(prev => ({ ...prev, columns: e.target.value }))}
											placeholder="name, email, grade"
										/>
									</div>
									<div className="space-y-2 md:col-span-2">
										<label className="text-sm font-medium">Goal / notes shown to students</label>
										<textarea
											className="w-full rounded border border-border px-3 py-2 text-sm"
											value={gameLevelConfig.notes}
											onChange={(e) => setGameLevelConfig(prev => ({ ...prev, notes: e.target.value }))}
											rows={3}
										/>
									</div>
								</div>

								<div className="space-y-3">
									<p className="text-sm font-medium">Required block sequence (order matters)</p>
									<div className="flex flex-wrap gap-2">
										{gameBlockLibrary.map(block => (
											<Button
												key={block.type}
												type="button"
												variant="outline"
												size="sm"
												onClick={() => addBlockToSequence(block.type)}
											>
												{block.label}
											</Button>
										))}
									</div>
									<div className="space-y-2">
										{gameLevelBlocks.length === 0 && (
											<p className="text-caption text-muted-foreground">No blocks added yet.</p>
										)}
										{gameLevelBlocks.map((blockItem, idx) => {
											const block = gameBlockLibrary.find(b => b.type === blockItem.type);
											return (
												<div key={`${blockItem.type}_${idx}`} className="flex items-center gap-2 border rounded px-3 py-2 bg-white">
													<input
														className="flex-1 border rounded px-2 py-1 text-sm"
														value={blockItem.label}
														onChange={(e) => setGameLevelBlocks(prev => prev.map((b, i) => i === idx ? { ...b, label: e.target.value } : b))}
														placeholder={block?.label || 'Block label'}
													/>
													<div className="flex items-center gap-1">
														<Button type="button" size="icon" variant="ghost" onClick={() => moveBlock(idx, -1)} title="Move up">
															<ArrowUp className="h-4 w-4" />
														</Button>
														<Button type="button" size="icon" variant="ghost" onClick={() => moveBlock(idx, 1)} title="Move down">
															<ArrowDown className="h-4 w-4" />
														</Button>
														<Button type="button" size="icon" variant="ghost" onClick={() => removeBlockFromSequence(idx)} title="Remove">
															<X className="h-4 w-4" />
														</Button>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>Questions</CardTitle>
										<CardDescription>Update questions for your assessment</CardDescription>
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
					)}

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
									Publish (visible to students)
								</label>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label htmlFor="startDate" className="block text-sm font-medium mb-2">
										Start Date
									</label>
									<Input
										id="startDate"
										type="datetime-local"
										value={config.startDate}
										onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
									/>
								</div>
								<div>
									<label htmlFor="endDate" className="block text-sm font-medium mb-2">
										End Date
									</label>
									<Input
										id="endDate"
										type="datetime-local"
										value={config.endDate}
										onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
									/>
								</div>
								<div>
									<label htmlFor="timer" className="block text-sm font-medium mb-2">
										Timer (minutes)
									</label>
									<Input
										id="timer"
										type="number"
										value={config.timer}
										onChange={(e) => setConfig({ ...config, timer: e.target.value })}
										placeholder="e.g., 60"
									/>
								</div>
								<div>
									<label htmlFor="attempts" className="block text-sm font-medium mb-2">
										Max Attempts
									</label>
									<Input
										id="attempts"
										type="number"
										value={config.attempts}
										onChange={(e) => setConfig({ ...config, attempts: parseInt(e.target.value) || 1 })}
										min="1"
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex gap-4 w-1/2 mx-auto justify-center">
						<Button
							type="submit"
							disabled={submitting}
							title="Save Changes"
						>
							{submitting ? (
								<>
									<Loader2 className="h-5 w-5 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-5 w-5 mr-2" />
									Save Changes
								</>
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={handleDelete}
							disabled={deleting}
							className="text-destructive hover:text-destructive"
							title="Delete Assessment"
						>
							{deleting ? (
								<>
									<Loader2 className="h-5 w-5 mr-2 animate-spin" />
									Deleting...
								</>
							) : (
								<>
									<Trash2 className="h-5 w-5 mr-2" />
									Delete
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

