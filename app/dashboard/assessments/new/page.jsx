'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AssessmentBuilder from '@/app/components/AssessmentBuilder';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import Link from 'next/link';

export default function NewAssessmentPage() {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [courseId, setCourseId] = useState('');
	const [type, setType] = useState('quiz');
	const [questions, setQuestions] = useState([]);
	const [config, setConfig] = useState({
		attempts: 1,
		timer: null,
		startDate: null,
		endDate: null,
		showResults: true,
		shuffleQuestions: false,
	});
	const [published, setPublished] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [userRole, setUserRole] = useState(null);
	const [courses, setCourses] = useState([]);
	const [loadingCourses, setLoadingCourses] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					
					if (role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
						return;
					}

					await loadCourses(user.uid, role);
				}
			} else {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [router]);

	async function loadCourses(userId, role) {
		try {
			setLoadingCourses(true);
			let q = collection(db, 'courses');
			
			if (role === 'teacher') {
				q = query(q, where('createdBy', '==', userId));
			}

			const snapshot = await getDocs(q);
			const coursesList = [];
			snapshot.forEach((doc) => {
				coursesList.push({
					id: doc.id,
					...doc.data(),
				});
			});
			setCourses(coursesList);
		} catch (err) {
			console.error('Error loading courses:', err);
		} finally {
			setLoadingCourses(false);
		}
	}

	function validateForm() {
		if (!title.trim()) {
			setError('Assessment title is required');
			return false;
		}

		if (!courseId) {
			setError('Please select a course');
			return false;
		}

		if (questions.length === 0) {
			setError('Please add at least one question');
			return false;
		}

		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			if (!q.question || !q.question.trim()) {
				setError(`Question ${i + 1} is missing question text`);
				return false;
			}

			if (q.type === 'mcq') {
				const validOptions = q.options.filter(opt => opt.trim() !== '');
				if (validOptions.length < 2) {
					setError(`Question ${i + 1} must have at least 2 valid options`);
					return false;
				}
			}
		}

		return true;
	}

	async function handleSubmit(e, shouldPublish = false) {
		e.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		setSubmitting(true);
		setError('');
		setSuccess('');

		const user = auth.currentUser;
		if (!user) {
			setError('You must be signed in to create an assessment');
			setSubmitting(false);
			return;
		}

		try {
			if (!title.trim()) {
				throw new Error('Assessment title is required');
			}
			if (!courseId) {
				throw new Error('Please select a course');
			}
			if (!type || !['quiz', 'coding', 'assignment'].includes(type)) {
				throw new Error('Valid assessment type is required');
			}

			const assessmentData = {
				title: title.trim(),
				description: description.trim(),
				courseId,
				type,
				questions,
				config,
				published: shouldPublish,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			const docRef = await addDoc(collection(db, 'assessments'), assessmentData);
			
			const assessmentId = docRef.id;
			console.log('Assessment created with ID:', assessmentId);

			setSuccess(
				shouldPublish
					? `Assessment "${title}" published successfully!`
					: `Assessment "${title}" saved as draft.`
			);

			setTitle('');
			setDescription('');
			setCourseId('');
			setQuestions([]);
			setPublished(false);

			setTimeout(() => {
				router.push('/dashboard/assessments');
			}, 1500);
		} catch (err) {
			console.error('Assessment creation error:', err);
			setError(err.message || 'Failed to save assessment');
		} finally {
			setSubmitting(false);
		}
	}

	if (userRole !== 'teacher' && userRole !== 'admin') {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto">
			{/* Header */}
			<div className="mb-8">
				<Link href="/dashboard/assessments">
					<Button variant="ghost" size="sm" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assessments
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark">Create Assessment</h1>
				<p className="text-body text-muted-foreground mt-2">
					Build quizzes and coding challenges to evaluate student understanding
				</p>
			</div>

			{/* Main Form */}
			<form onSubmit={(e) => handleSubmit(e, published)} className="space-y-6">
				{/* Basic Information */}
				<Card>
					<CardContent className="pt-6 space-y-6">
						<h2 className="text-h2 text-neutralDark">Basic Information</h2>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">
								Assessment Title *
							</span>
							<Input
								required
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g., Module 1 Quiz, JavaScript Basics Test"
							/>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">
								Description
							</span>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
								placeholder="Brief description of the assessment"
							/>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">
								Course *
							</span>
							<select
								value={courseId}
								onChange={(e) => setCourseId(e.target.value)}
								required
								disabled={loadingCourses}
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="">Select a course</option>
								{courses.map((course) => (
									<option key={course.id} value={course.id}>
										{course.title}
									</option>
								))}
							</select>
						</label>

						<label className="block">
							<span className="block text-body font-medium text-neutralDark mb-2">
								Assessment Type *
							</span>
							<select
								value={type}
								onChange={(e) => setType(e.target.value)}
								required
								className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="quiz">Quiz</option>
								<option value="coding">Coding Challenge</option>
								<option value="assignment">Assignment</option>
							</select>
						</label>
					</CardContent>
				</Card>

				{/* Assessment Settings */}
				<Card>
					<CardContent className="pt-6 space-y-6">
						<h2 className="text-h2 text-neutralDark">Assessment Settings</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<label className="block">
								<span className="block text-body font-medium text-neutralDark mb-2">
									Number of Attempts
								</span>
								<Input
									type="number"
									min="1"
									max="10"
									value={config.attempts}
									onChange={(e) => setConfig({ ...config, attempts: parseInt(e.target.value) || 1 })}
								/>
							</label>

							<label className="block">
								<span className="block text-body font-medium text-neutralDark mb-2">
									Time Limit (minutes)
								</span>
								<Input
									type="number"
									min="0"
									value={config.timer || ''}
									onChange={(e) => setConfig({ ...config, timer: e.target.value ? parseInt(e.target.value) : null })}
									placeholder="Leave empty for no limit"
								/>
							</label>
						</div>

						<div className="space-y-3">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={config.showResults}
									onChange={(e) => setConfig({ ...config, showResults: e.target.checked })}
									className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
								/>
								<span className="text-body text-neutralDark">Show results after submission</span>
							</label>

							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={config.shuffleQuestions}
									onChange={(e) => setConfig({ ...config, shuffleQuestions: e.target.checked })}
									className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
								/>
								<span className="text-body text-neutralDark">Shuffle question order</span>
							</label>
						</div>
					</CardContent>
				</Card>

				{/* Questions */}
				<Card>
					<CardContent className="pt-6">
						<AssessmentBuilder questions={questions} onQuestionsChange={setQuestions} />
					</CardContent>
				</Card>

				{/* Publish Option */}
				<Card>
					<CardContent className="pt-6">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={published}
								onChange={(e) => setPublished(e.target.checked)}
								className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
							/>
							<div>
								<span className="text-body font-medium text-neutralDark block">Publish immediately</span>
								<span className="text-caption text-muted-foreground">
									Students will be able to see and attempt this assessment
								</span>
							</div>
						</label>
					</CardContent>
				</Card>

				{/* Action Buttons */}
				<div className="flex gap-4">
					<Button
						type="button"
						variant="outline"
						onClick={(e) => {
							setPublished(false);
							handleSubmit(e, false);
						}}
						disabled={submitting}
						className="flex-1"
						size="lg"
					>
						<Save className="h-4 w-4 mr-2" />
						{submitting && !published ? 'Saving...' : 'Save as Draft'}
					</Button>
					<Button
						type="submit"
						disabled={submitting}
						onClick={() => setPublished(true)}
						className="flex-1"
						size="lg"
					>
						<Upload className="h-4 w-4 mr-2" />
						{submitting && published ? 'Publishing...' : 'Publish Assessment'}
					</Button>
				</div>
			</form>

			{/* Error/Success Messages */}
			{error && (
				<Card className="mt-6 border-error bg-error/5">
					<CardContent className="pt-6">
						<p className="text-body text-error">{error}</p>
					</CardContent>
				</Card>
			)}
			{success && (
				<Card className="mt-6 border-success bg-success/5">
					<CardContent className="pt-6">
						<p className="text-body text-success">{success}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}





