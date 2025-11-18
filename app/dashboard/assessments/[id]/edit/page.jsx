'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AssessmentBuilder from '@/app/components/AssessmentBuilder';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditAssessmentPage({ params }) {
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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [userRole, setUserRole] = useState(null);
	const [courses, setCourses] = useState([]);
	const [loadingCourses, setLoadingCourses] = useState(true);
	const router = useRouter();
	const assessmentId = params.id;

	useEffect(() => {
		// Get user role and load assessment
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					
					// Only teachers and admins can edit assessments
					if (role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
						return;
					}

					// Load courses and assessment
					await loadCourses(user.uid, role);
					await loadAssessment();
				}
			} else {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [router, assessmentId]);

	async function loadCourses(userId, role) {
		try {
			setLoadingCourses(true);
			let q = collection(db, 'courses');
			
			// Teachers see only their courses, admins see all
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

	async function loadAssessment() {
		try {
			setLoading(true);
			const assessmentDoc = await getDoc(doc(db, 'assessments', assessmentId));
			
			if (!assessmentDoc.exists()) {
				setError('Assessment not found');
				return;
			}

			const data = assessmentDoc.data();
			setTitle(data.title || '');
			setDescription(data.description || '');
			setCourseId(data.courseId || '');
			setType(data.type || 'quiz');
			setQuestions(data.questions || []);
			setConfig(data.config || {
				attempts: 1,
				timer: null,
				startDate: null,
				endDate: null,
				showResults: true,
				shuffleQuestions: false,
			});
			setPublished(data.published || false);
		} catch (err) {
			console.error('Error loading assessment:', err);
			setError('Failed to load assessment');
		} finally {
			setLoading(false);
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

		// Validate each question
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
			setError('You must be signed in to edit an assessment');
			setSubmitting(false);
			return;
		}

		try {
			// Validate required fields
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
				updatedAt: serverTimestamp(),
			};

			// Update assessment in Firestore
			await updateDoc(doc(db, 'assessments', assessmentId), assessmentData);

			setSuccess(
				shouldPublish
					? `Assessment "${title}" updated and published successfully!`
					: `Assessment "${title}" updated successfully.`
			);

			// Redirect to assessments page
			setTimeout(() => {
				router.push('/dashboard/assessments');
			}, 1500);
		} catch (err) {
			console.error('Assessment update error:', err);
			setError(err.message || 'Failed to update assessment');
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading assessment...</p>
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
				<h1 className="text-h1 text-neutralDark">Edit Assessment</h1>
				<p className="text-body text-muted-foreground mt-2">
					Update your quiz or coding challenge
				</p>
			</div>

			{/* Main Form */}
			<form onSubmit={(e) => handleSubmit(e, published)} className="space-y-6">
				{/* Basic Info */}
				<Card>
					<CardContent className="pt-6 space-y-4">
						<div>
							<label className="text-caption font-medium text-neutralDark block mb-2">
								Assessment Title *
							</label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g., JavaScript Basics Quiz"
								required
							/>
						</div>

						<div>
							<label className="text-caption font-medium text-neutralDark block mb-2">
								Description
							</label>
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Brief description of this assessment"
							/>
						</div>

						<div>
							<label className="text-caption font-medium text-neutralDark block mb-2">
								Course *
							</label>
							<select
								value={courseId}
								onChange={(e) => setCourseId(e.target.value)}
								className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								required
								disabled={loadingCourses}
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
							<label className="text-caption font-medium text-neutralDark block mb-2">
								Assessment Type *
							</label>
							<select
								value={type}
								onChange={(e) => setType(e.target.value)}
								className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								required
							>
								<option value="quiz">Quiz</option>
								<option value="coding">Coding Challenge</option>
								<option value="assignment">Assignment</option>
							</select>
						</div>
					</CardContent>
				</Card>

				{/* Assessment Builder Component */}
				<AssessmentBuilder
					questions={questions}
					setQuestions={setQuestions}
					config={config}
					setConfig={setConfig}
				/>

				{/* Actions */}
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="published"
									checked={published}
									onChange={(e) => setPublished(e.target.checked)}
									className="h-4 w-4 rounded border-gray-300"
								/>
								<label htmlFor="published" className="text-body text-neutralDark cursor-pointer">
									Publish assessment (make visible to students)
								</label>
							</div>

							<div className="flex gap-3">
								<Button
									type="button"
									variant="outline"
									onClick={(e) => handleSubmit(e, false)}
									disabled={submitting}
								>
									<Save className="h-4 w-4 mr-2" />
									Save Changes
								</Button>
								<Button
									type="submit"
									disabled={submitting}
								>
									{submitting ? 'Updating...' : published ? 'Update & Publish' : 'Update'}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Messages */}
				{error && (
					<Card className="border-error bg-error/5">
						<CardContent className="pt-6">
							<p className="text-body text-error">{error}</p>
						</CardContent>
					</Card>
				)}

				{success && (
					<Card className="border-success bg-success/5">
						<CardContent className="pt-6">
							<p className="text-body text-success">{success}</p>
						</CardContent>
					</Card>
				)}
			</form>
		</div>
	);
}

