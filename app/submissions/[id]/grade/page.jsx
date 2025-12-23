'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Send, Loader2, Download, FileText, User, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function GradeSubmissionPage() {
	const params = useParams();
	const router = useRouter();
	const { language } = useLanguage();
	const submissionId = params.id;

	const [submission, setSubmission] = useState(null);
	const [student, setStudent] = useState(null);
	const [assignment, setAssignment] = useState(null);
	const [assessment, setAssessment] = useState(null);
	const [grade, setGrade] = useState('');
	const [feedback, setFeedback] = useState('');
	const [isReleased, setIsReleased] = useState(false);
	const [allowRegrading, setAllowRegrading] = useState(true);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [releasing, setReleasing] = useState(false);
	const [autoSaveStatus, setAutoSaveStatus] = useState('');
	const [userRole, setUserRole] = useState(null);
	const [error, setError] = useState('');

	// Auto-save timer
	useEffect(() => {
		if (!submission || !grade || !feedback) return;

		const autoSaveTimer = setTimeout(async () => {
			await autoSaveGrade();
		}, 2000); // Auto-save after 2 seconds of inactivity

		return () => clearTimeout(autoSaveTimer);
	}, [grade, feedback, submission]);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
					} else {
						loadSubmission();
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	async function loadSubmission() {
		setLoading(true);
		setError('');
		try {
			// Load submission
			const submissionDoc = await getDoc(doc(db, 'submission', submissionId));
			if (!submissionDoc.exists()) {
				setError('Submission not found');
				setLoading(false);
				return;
			}

			const submissionData = { id: submissionDoc.id, ...submissionDoc.data() };
			setSubmission(submissionData);
			setGrade(submissionData.grade?.toString() || '');
			setFeedback(submissionData.feedback || '');
			setIsReleased(submissionData.feedbackReleased || false);
			setAllowRegrading(submissionData.allowRegrading !== false);

			// Load student info
			if (submissionData.studentId) {
				const studentDoc = await getDoc(doc(db, 'user', submissionData.studentId));
				if (studentDoc.exists()) {
					setStudent({ id: studentDoc.id, ...studentDoc.data() });
				}
			}

			// Load assignment or assessment
			if (submissionData.assignmentId) {
				const assignmentDoc = await getDoc(doc(db, 'assignment', submissionData.assignmentId));
				if (assignmentDoc.exists()) {
					setAssignment({ id: assignmentDoc.id, ...assignmentDoc.data() });
				}
			}

			if (submissionData.assessmentId) {
				const assessmentDoc = await getDoc(doc(db, 'assessment', submissionData.assessmentId));
				if (assessmentDoc.exists()) {
					setAssessment({ id: assessmentDoc.id, ...assessmentDoc.data() });
				}
			}
		} catch (err) {
			console.error('Error loading submission:', err);
			setError('Failed to load submission: ' + (err.message || 'Unknown error'));
		} finally {
			setLoading(false);
		}
	}

	async function autoSaveGrade() {
		if (!submission || isReleased) return; // Don't auto-save if already released

		try {
			const updateData = {
				draftGrade: grade ? parseFloat(grade) : null,
				draftFeedback: feedback,
				lastSavedAt: serverTimestamp(),
			};

			await updateDoc(doc(db, 'submission', submissionId), updateData);
			setAutoSaveStatus('Saved');
			setTimeout(() => setAutoSaveStatus(''), 2000);
		} catch (err) {
			console.error('Error auto-saving:', err);
			setAutoSaveStatus('Save failed');
		}
	}

	async function handleSaveGrade() {
		if (!grade && !feedback) {
			alert(language === 'bm' 
				? 'Sila masukkan gred atau maklum balas' 
				: 'Please enter a grade or feedback');
			return;
		}

		setSaving(true);
		try {
			const updateData = {
				grade: grade ? parseFloat(grade) : null,
				feedback: feedback,
				gradedAt: serverTimestamp(),
				gradedBy: auth.currentUser.uid,
				lastSavedAt: serverTimestamp(),
			};

			await updateDoc(doc(db, 'submission', submissionId), updateData);
			setAutoSaveStatus(language === 'bm' ? 'Disimpan' : 'Saved');
			setTimeout(() => setAutoSaveStatus(''), 2000);
		} catch (err) {
			console.error('Error saving grade:', err);
			alert(language === 'bm' 
				? 'Gagal menyimpan gred: ' + (err.message || 'Ralat tidak diketahui')
				: 'Failed to save grade: ' + (err.message || 'Unknown error'));
		} finally {
			setSaving(false);
		}
	}

	async function handleReleaseFeedback() {
		if (!grade && !feedback) {
			alert(language === 'bm' 
				? 'Sila masukkan gred atau maklum balas sebelum melepaskan' 
				: 'Please enter a grade or feedback before releasing');
			return;
		}

		if (!confirm(language === 'bm' 
			? 'Adakah anda pasti mahu melepaskan maklum balas dan gred kepada pelajar? Tindakan ini tidak boleh dibatalkan.'
			: 'Are you sure you want to release feedback and grade to the student? This action cannot be undone.')) {
			return;
		}

		setReleasing(true);
		try {
			const updateData = {
				grade: grade ? parseFloat(grade) : null,
				feedback: feedback,
				feedbackReleased: true,
				releasedAt: serverTimestamp(),
				releasedBy: auth.currentUser.uid,
				gradedAt: serverTimestamp(),
				gradedBy: auth.currentUser.uid,
				allowRegrading: allowRegrading,
			};

			await updateDoc(doc(db, 'submission', submissionId), updateData);

			// Create notification for student
			await createNotification(submission.studentId, submission.assignmentId || submission.assessmentId);

			alert(language === 'bm' 
				? 'Maklum balas dan gred telah dilepaskan kepada pelajar'
				: 'Feedback and grade have been released to the student');
			
			router.push('/assignments');
		} catch (err) {
			console.error('Error releasing feedback:', err);
			alert(language === 'bm' 
				? 'Gagal melepaskan maklum balas: ' + (err.message || 'Ralat tidak diketahui')
				: 'Failed to release feedback: ' + (err.message || 'Unknown error'));
		} finally {
			setReleasing(false);
		}
	}

	async function createNotification(studentId, itemId) {
		try {
			const { collection, addDoc } = await import('firebase/firestore');
			const itemTitle = assignment?.title || assessment?.title || 'Assignment';
			
			await addDoc(collection(db, 'notification'), {
				userId: studentId,
				type: 'feedback_released',
				title: language === 'bm' 
					? `Maklum balas telah dilepaskan untuk ${itemTitle}`
					: `Feedback released for ${itemTitle}`,
				message: language === 'bm' 
					? `Guru anda telah melepaskan gred dan maklum balas untuk penyerahan anda.`
					: `Your teacher has released the grade and feedback for your submission.`,
				itemId: itemId,
				submissionId: submissionId,
				read: false,
				createdAt: serverTimestamp(),
			});
		} catch (err) {
			console.error('Error creating notification:', err);
			// Don't fail the release if notification fails
		}
	}

	function formatDate(timestamp) {
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
						{language === 'bm' ? 'Gred Penyerahan' : 'Grade Submission'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali' : 'Back'}
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
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Gred Penyerahan' : 'Grade Submission'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Akses ditolak.' : 'Access denied.'}
					</p>
				</div>
			</div>
		);
	}

	const itemTitle = assignment?.title || assessment?.title || 'Unknown';
	const maxGrade = assessment?.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 100;

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali ke Tugasan' : 'Back to Assignments'}
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">
					{language === 'bm' ? 'Gred Penyerahan' : 'Grade Submission'}
				</h1>
				<p className="text-body text-muted-foreground">
					{language === 'bm' 
						? 'Berikan maklum balas dan gred untuk penyerahan pelajar'
						: 'Provide feedback and grade for student submission'}
				</p>
			</div>

			{/* Submission Info */}
			<Card>
				<CardHeader>
					<CardTitle>{itemTitle}</CardTitle>
					<CardDescription>
						{language === 'bm' ? 'Maklumat Penyerahan' : 'Submission Information'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{student && (
						<div className="flex items-center gap-2">
							<User className="h-5 w-5 text-muted-foreground" />
							<span className="text-sm">
								<strong>{language === 'bm' ? 'Pelajar:' : 'Student:'}</strong> {student.name || student.email}
							</span>
						</div>
					)}
					{submission?.submittedAt && (
						<div className="flex items-center gap-2">
							<Calendar className="h-5 w-5 text-muted-foreground" />
							<span className="text-sm">
								<strong>{language === 'bm' ? 'Dihantar pada:' : 'Submitted on:'}</strong> {formatDate(submission.submittedAt)}
							</span>
						</div>
					)}
					{submission?.submittedAt && assignment?.deadline && (
						<div className="flex items-center gap-2">
							{(() => {
								const submitDate = submission.submittedAt.toDate ? submission.submittedAt.toDate() : new Date(submission.submittedAt);
								const deadlineDate = assignment.deadline.toDate ? assignment.deadline.toDate() : new Date(assignment.deadline);
								const isLate = submitDate > deadlineDate;
								return isLate ? (
									<>
										<AlertTriangle className="h-5 w-5 text-warning" />
										<span className="text-sm text-warning">
											<strong>{language === 'bm' ? 'Status:' : 'Status:'}</strong> {language === 'bm' ? 'Lewat' : 'Late Submission'}
										</span>
									</>
								) : (
									<>
										<CheckCircle2 className="h-5 w-5 text-success" />
										<span className="text-sm text-success">
											<strong>{language === 'bm' ? 'Status:' : 'Status:'}</strong> {language === 'bm' ? 'Tepat Masa' : 'On Time'}
										</span>
									</>
								);
							})()}
						</div>
					)}
					{isReleased && (
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-success" />
							<span className="text-sm text-success">
								<strong>{language === 'bm' ? 'Status:' : 'Status:'}</strong> {language === 'bm' ? 'Telah dilepaskan' : 'Released'}
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Submission Content */}
			{submission?.files && submission.files.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{language === 'bm' ? 'Fail yang Dihantar' : 'Submitted Files'}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{submission.files.map((file, idx) => (
								<div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
									<div className="flex items-center gap-2">
										<FileText className="h-5 w-5 text-muted-foreground" />
										<span className="text-sm">{file.name}</span>
									</div>
									<a href={file.url} target="_blank" rel="noopener noreferrer">
										<Button variant="outline" size="sm">
											<Download className="h-4 w-4 mr-2" />
											{language === 'bm' ? 'Muat Turun' : 'Download'}
										</Button>
									</a>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{submission?.answers && (
				<Card>
					<CardHeader>
						<CardTitle>{language === 'bm' ? 'Jawapan' : 'Answers'}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{Object.entries(submission.answers).map(([key, answer]) => (
								<div key={key} className="p-4 border rounded-lg">
									<p className="font-medium mb-2">{answer.question || `Question ${parseInt(key) + 1}`}</p>
									<p className="text-sm text-muted-foreground mb-1">
										{language === 'bm' ? 'Jawapan Pelajar:' : 'Student Answer:'} {answer.studentAnswer || 'N/A'}
									</p>
									{answer.correctAnswer && (
										<p className="text-sm text-muted-foreground">
											{language === 'bm' ? 'Jawapan Betul:' : 'Correct Answer:'} {answer.correctAnswer}
										</p>
									)}
									{answer.points !== undefined && (
										<p className="text-sm font-medium mt-2">
											{language === 'bm' ? 'Mata:' : 'Points:'} {answer.earned || 0} / {answer.points}
										</p>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Grading Form */}
			<Card>
				<CardHeader>
					<CardTitle>{language === 'bm' ? 'Gred dan Maklum Balas' : 'Grade and Feedback'}</CardTitle>
					<CardDescription>
						{language === 'bm' 
							? 'Masukkan gred dan maklum balas untuk pelajar. Kemajuan akan disimpan secara automatik.'
							: 'Enter grade and feedback for the student. Progress will be auto-saved.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div>
						<label htmlFor="grade" className="block text-sm font-medium mb-2">
							{language === 'bm' ? 'Gred' : 'Grade'} {assessment ? `(Max: ${maxGrade})` : '(0-100)'}
						</label>
						<Input
							id="grade"
							type="number"
							min="0"
							max={assessment ? maxGrade : 100}
							step="0.01"
							value={grade}
							onChange={(e) => setGrade(e.target.value)}
							placeholder={language === 'bm' ? 'Masukkan gred' : 'Enter grade'}
							disabled={isReleased && !allowRegrading}
							className="w-32"
						/>
						{assessment && submission?.totalPoints && (
							<p className="text-xs text-muted-foreground mt-1">
								{language === 'bm' ? 'Jumlah mata:' : 'Total points:'} {submission.totalPoints} / {maxGrade}
							</p>
						)}
					</div>

					<div>
						<label htmlFor="feedback" className="block text-sm font-medium mb-2">
							{language === 'bm' ? 'Maklum Balas' : 'Feedback'}
						</label>
						<RichTextEditor
							value={feedback}
							onChange={setFeedback}
							placeholder={language === 'bm' 
								? 'Masukkan maklum balas bertulis untuk pelajar...'
								: 'Enter written feedback for the student...'}
						/>
					</div>

					{!isReleased && (
						<div className="flex items-center gap-3">
							<input
								type="checkbox"
								id="allowRegrading"
								checked={allowRegrading}
								onChange={(e) => setAllowRegrading(e.target.checked)}
								className="w-4 h-4"
							/>
							<label htmlFor="allowRegrading" className="text-sm cursor-pointer">
								{language === 'bm' 
									? 'Benarkan penilaian semula selepas melepaskan gred'
									: 'Allow regrading after releasing grade'}
							</label>
						</div>
					)}

					{autoSaveStatus && (
						<p className="text-sm text-muted-foreground">
							{autoSaveStatus}
						</p>
					)}

					<div className="flex gap-4 pt-4 border-t">
						<Button
							onClick={handleSaveGrade}
							disabled={saving || isReleased}
							variant="outline"
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									{language === 'bm' ? 'Menyimpan...' : 'Saving...'}
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									{language === 'bm' ? 'Simpan' : 'Save'}
								</>
							)}
						</Button>
						<Button
							onClick={handleReleaseFeedback}
							disabled={releasing || (isReleased && !allowRegrading)}
						>
							{releasing ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									{language === 'bm' ? 'Melepaskan...' : 'Releasing...'}
								</>
							) : (
								<>
									<Send className="h-4 w-4 mr-2" />
									{isReleased 
										? (language === 'bm' ? 'Kemas Kini dan Lepaskan Semula' : 'Update and Release Again')
										: (language === 'bm' ? 'Lepaskan kepada Pelajar' : 'Release to Student')
									}
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

