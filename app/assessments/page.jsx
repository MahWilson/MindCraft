'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClipboardCheck, FileText, Code, Clock, Calendar, Upload, ArrowRight, Edit2, Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Plus, File, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AssessmentsPage() {
	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [submissions, setSubmissions] = useState({}); // Map of assessmentId -> submission data
	const [uploadingFiles, setUploadingFiles] = useState({}); // Map of assessmentId -> array of files
	const [submitting, setSubmitting] = useState({}); // Map of assessmentId -> boolean
	const [expandedAssessment, setExpandedAssessment] = useState(null); // Track which assessment card is expanded for submission
	const [deleteConfirm, setDeleteConfirm] = useState(null); // { assessmentId, title } for delete confirmation
	const [submitConfirm, setSubmitConfirm] = useState(null); // { assessmentId, title } for submit confirmation
	const [submitSuccess, setSubmitSuccess] = useState(null); // { message, isUpdate } for success message
	const [submitError, setSubmitError] = useState(null); // { message } for error message
	const fileInputRefs = useRef({}); // Map of assessmentId -> file input ref
	const router = useRouter();
	const { language } = useLanguage();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					setUserRole(userDoc.data().role);
				}
			} else {
				setCurrentUserId(null);
				setUserRole(null);
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	useEffect(() => {
		if (userRole && currentUserId) {
			loadAssessments();
			if (userRole === 'student') {
				loadSubmissions();
			}
		}
	}, [userRole, currentUserId]);

	// Prevent body scroll when modals are open
	useEffect(() => {
		if (deleteConfirm || submitConfirm || submitSuccess || submitError) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [deleteConfirm, submitConfirm, submitSuccess, submitError]);

	// Auto-close success modal after 3 seconds
	useEffect(() => {
		if (submitSuccess) {
			const timer = setTimeout(() => {
				setSubmitSuccess(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [submitSuccess]);

	async function loadAssessments() {
		setLoading(true);
		try {
			let assessmentsQuery;

			if (userRole === 'student') {
				// First, get all published assessments
				// Note: We query without orderBy first to avoid index issues, then sort client-side
				assessmentsQuery = query(
					collection(db, 'assessment'),
					where('published', '==', true)
				);

				const snapshot = await getDocs(assessmentsQuery);
				const allAssessments = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
				})).sort((a, b) => {
					// Sort by createdAt if available, otherwise by id
					const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
					const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
					return bTime - aTime;
				});

				// Then, filter by enrollment - only show assessments for courses the student is enrolled in
				if (currentUserId) {
					const enrollmentsQuery = query(
						collection(db, 'enrollment'),
						where('studentId', '==', currentUserId)
					);
					const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
					const enrolledCourseIds = new Set(
						enrollmentsSnapshot.docs.map(doc => doc.data().courseId)
					);

					// Filter assessments to only those for enrolled courses
					const filteredAssessments = allAssessments.filter(assessment =>
						assessment.courseId && enrolledCourseIds.has(assessment.courseId)
					);

					setAssessments(filteredAssessments);
				} else {
					setAssessments([]);
				}
			} else {
				// Teachers and admins see all assessments
				assessmentsQuery = query(
					collection(db, 'assessment'),
					orderBy('createdAt', 'desc')
				);

				const snapshot = await getDocs(assessmentsQuery);
				const loadedAssessments = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
				}));

				setAssessments(loadedAssessments);
			}
		} catch (err) {
			console.error('Error loading assessments:', err);
		} finally {
			setLoading(false);
		}
	}

	async function loadSubmissions() {
		if (!currentUserId) return;

		try {
			const submissionsQuery = query(
				collection(db, 'submission'),
				where('studentId', '==', currentUserId)
			);
			const snapshot = await getDocs(submissionsQuery);

			const submissionsMap = {};
			snapshot.docs.forEach(doc => {
				const data = doc.data();
				submissionsMap[data.assessmentId] = {
					id: doc.id,
					...data,
				};
			});

			setSubmissions(submissionsMap);

			// Initialize uploaded files from existing submissions
			const filesMap = {};
			Object.keys(submissionsMap).forEach(assessmentId => {
				filesMap[assessmentId] = submissionsMap[assessmentId].files || [];
			});
			setUploadingFiles(filesMap);
		} catch (err) {
			console.error('Error loading submissions:', err);
		}
	}

	function getAssessmentIcon(type) {
		switch (type) {
			case 'quiz':
				return <ClipboardCheck className="h-5 w-5 text-primary" />;
			case 'assignment':
				return <FileText className="h-5 w-5 text-secondary" />;
			case 'coding':
				return <Code className="h-5 w-5 text-success" />;
			default:
				return <ClipboardCheck className="h-5 w-5" />;
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return language === 'bm' ? 'Tiada tarikh ditetapkan' : 'No date set';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function stripHtml(html) {
		if (!html) return '';
		const tmp = document.createElement('DIV');
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || '';
	}

	async function confirmDelete(assessmentId) {
		const assessment = assessments.find(a => a.id === assessmentId);
		setDeleteConfirm({
			assessmentId,
			title: assessment?.title || (language === 'bm' ? 'Penilaian' : 'Assessment')
		});
	}

	async function handleDelete(assessmentId) {
		try {
			await deleteDoc(doc(db, 'assessment', assessmentId));
			setAssessments(prev => prev.filter(a => a.id !== assessmentId));
			setDeleteConfirm(null);
		} catch (err) {
			console.error('Error deleting assessment:', err);
			const errorMessage = language === 'bm'
				? 'Gagal memadam penilaian: '
				: 'Failed to delete assessment: ';
			alert(errorMessage + (err.message || (language === 'bm' ? 'Ralat tidak diketahui' : 'Unknown error')));
		}
	}

	async function togglePublish(assessment) {
		try {
			await updateDoc(doc(db, 'assessment', assessment.id), {
				published: !assessment.published,
				updatedAt: new Date(),
			});
			loadAssessments();
		} catch (err) {
			console.error('Error updating assessment:', err);
			const errorMessage = language === 'bm'
				? 'Gagal mengemas kini penilaian: '
				: 'Failed to update assessment: ';
			alert(errorMessage + (err.message || (language === 'bm' ? 'Ralat tidak diketahui' : 'Unknown error')));
		}
	}

	function isDeadlinePassed(deadline) {
		if (!deadline) return false;
		const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
		return deadlineDate < new Date();
	}

	async function handleFileUpload(assessmentId, event) {
		const file = event.target.files[0];
		if (!file) return;

		// Validate file size (10MB limit)
		const MAX_FILE_SIZE = 10 * 1024 * 1024;
		if (file.size > MAX_FILE_SIZE) {
			alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
			if (fileInputRefs.current[assessmentId]) fileInputRefs.current[assessmentId].value = '';
			return;
		}

		// Validate file type
		const allowedMimeTypes = [
			'application/pdf',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/msword',
			'application/zip',
			'application/x-zip-compressed',
			'text/plain',
			'text/markdown',
			'text/x-python',
			'text/javascript',
			'text/x-java',
			'image/jpeg',
			'image/png',
		];

		const allowedExtensions = ['.pdf', '.docx', '.doc', '.zip', '.txt', '.md', '.py', '.js', '.java', '.jpg', '.jpeg', '.png'];
		const fileName = file.name.toLowerCase();
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

		const isValidMimeType = allowedMimeTypes.includes(file.type);
		const isValidExtension = allowedExtensions.includes(fileExtension);

		if (!isValidMimeType && !isValidExtension) {
			alert('File type not supported. Please upload PDF, DOCX, ZIP, text files, or images.');
			if (fileInputRefs.current[assessmentId]) fileInputRefs.current[assessmentId].value = '';
			return;
		}

		const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		setUploadingFiles(prev => ({
			...prev,
			[assessmentId]: [...(prev[assessmentId] || []), { id: fileId, name: file.name, size: file.size, uploading: true }]
		}));

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to upload files');
			}

			// Upload to Firebase Storage
			const filePath = `assignment-submissions/${assessmentId}/${fileId}_${file.name}`;
			const fileRef = ref(storage, filePath);

			await uploadBytes(fileRef, file);
			const downloadURL = await getDownloadURL(fileRef);

			const fileData = {
				id: fileId,
				name: file.name,
				url: downloadURL,
				type: file.type || 'application/octet-stream',
				size: file.size,
				uploadedAt: new Date().toISOString(),
			};

			setUploadingFiles(prev => ({
				...prev,
				[assessmentId]: (prev[assessmentId] || []).map(f => f.id === fileId ? fileData : f)
			}));
		} catch (err) {
			console.error('Error uploading file:', err);
			alert('Failed to upload file: ' + (err.message || 'Unknown error'));
			setUploadingFiles(prev => ({
				...prev,
				[assessmentId]: (prev[assessmentId] || []).filter(f => f.id !== fileId)
			}));
		} finally {
			if (fileInputRefs.current[assessmentId]) fileInputRefs.current[assessmentId].value = '';
		}
	}

	function removeFile(assessmentId, fileId) {
		setUploadingFiles(prev => ({
			...prev,
			[assessmentId]: (prev[assessmentId] || []).filter(f => f.id !== fileId)
		}));
	}

	function confirmSubmit(assessmentId) {
		const files = uploadingFiles[assessmentId] || [];
		if (files.length === 0) {
			setSubmitError({
				message: language === 'bm' ? 'Sila muat naik sekurang-kurangnya satu fail' : 'Please upload at least one file'
			});
			return;
		}

		const assessment = assessments.find(a => a.id === assessmentId);
		setSubmitConfirm({
			assessmentId,
			title: assessment?.title || (language === 'bm' ? 'Tugasan' : 'Assignment'),
			fileCount: files.length
		});
	}

	async function handleSubmit(assessmentId) {
		const files = uploadingFiles[assessmentId] || [];
		setSubmitting(prev => ({ ...prev, [assessmentId]: true }));

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to submit');
			}

			const submissionData = {
				assessmentId,
				studentId: auth.currentUser.uid,
				files: files.map(f => ({
					name: f.name,
					url: f.url,
					type: f.type,
					size: f.size,
				})),
				status: 'submitted',
				submittedAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			const existingSubmission = submissions[assessmentId];
			if (existingSubmission) {
				// Update existing submission
				await updateDoc(doc(db, 'submission', existingSubmission.id), submissionData);
				setSubmissions(prev => ({
					...prev,
					[assessmentId]: { ...existingSubmission, ...submissionData }
				}));
				setSubmitSuccess({
					message: language === 'bm' ? 'Tugasan berjaya dikemas kini!' : 'Assignment updated successfully!',
					isUpdate: true
				});
			} else {
				// Create new submission
				const docRef = await addDoc(collection(db, 'submission'), submissionData);
				setSubmissions(prev => ({
					...prev,
					[assessmentId]: { id: docRef.id, ...submissionData }
				}));
				setSubmitSuccess({
					message: language === 'bm' ? 'Tugasan berjaya dihantar!' : 'Assignment submitted successfully!',
					isUpdate: false
				});
			}

			// Clear uploaded files after successful submission
			setUploadingFiles(prev => ({
				...prev,
				[assessmentId]: []
			}));
			setExpandedAssessment(null);
			setSubmitConfirm(null);
		} catch (err) {
			console.error('Error submitting assignment:', err);
			setSubmitError({
				message: (language === 'bm' ? 'Gagal menghantar tugasan: ' : 'Failed to submit assignment: ') + (err.message || 'Unknown error')
			});
			setSubmitConfirm(null);
		} finally {
			setSubmitting(prev => ({ ...prev, [assessmentId]: false }));
		}
	}

	function formatFileSize(bytes) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Penilaian' : 'Assessments'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Penilaian' : 'Assessments'}
					</h1>
					<p className="text-body text-muted-foreground">
						{userRole === 'student'
							? (language === 'bm' ? 'Lihat dan hantar tugasan anda' : 'View and submit your assignments')
							: (language === 'bm' ? 'Urus penilaian dan lihat penghantaran' : 'Manage assessments and view submissions')}
					</p>
				</div>
				{userRole !== 'student' && (
					<Link href="/assessments/new">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							{language === 'bm' ? 'Cipta Penilaian' : 'Create Assessment'}
						</Button>
					</Link>
				)}
			</div>

			{/* Assessments List */}
			{assessments.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-body text-muted-foreground">
							{language === 'bm' ? 'Tiada penilaian tersedia lagi.' : 'No assessments available yet.'}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{assessments.map((assessment) => {
						const deadlinePassed = assessment.config?.endDate ? isDeadlinePassed(assessment.config.endDate) : false;

						return (
							<Card key={assessment.id} className="card-hover">
								<CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-white border-b-2 border-primary/20 pb-4">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-h3 mb-3 text-neutralDark font-semibold">{assessment.title}</CardTitle>
											<div className="flex flex-wrap gap-2">
												{assessment.published ? (
													<span className="text-xs bg-success/10 text-success px-2.5 py-1.5 rounded-md font-medium border border-success/20">
														{language === 'bm' ? 'Diterbitkan' : 'Published'}
													</span>
												) : (
													<span className="text-xs bg-warning/10 text-warning px-2.5 py-1.5 rounded-md font-medium border border-warning/20">
														{language === 'bm' ? 'Draf' : 'Draft'}
													</span>
												)}
												<span className="text-xs bg-info/10 text-info px-2.5 py-1.5 rounded-md font-medium border border-info/20 capitalize">
													{language === 'bm'
														? (assessment.type === 'quiz' ? 'kuiz' : assessment.type === 'assignment' ? 'tugasan' : assessment.type === 'coding' ? 'pengaturcaraan' : assessment.type || 'kuiz')
														: (assessment.type || 'quiz')}
												</span>
												{deadlinePassed && (
													<span className="text-xs bg-destructive/10 text-destructive px-2.5 py-1.5 rounded-md font-medium border border-destructive/20 flex items-center gap-1.5">
														<AlertCircle className="h-3.5 w-3.5" />
														{language === 'bm' ? 'Lewat' : 'Past Due'}
													</span>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{assessment.description && (
										<p className="text-body text-muted-foreground line-clamp-2">
											{stripHtml(assessment.description)}
										</p>
									)}

									{assessment.questions && (
										<p className="text-sm text-muted-foreground">
											{assessment.questions.length} {assessment.questions.length === 1
												? (language === 'bm' ? 'soalan' : 'question')
												: (language === 'bm' ? 'soalan' : 'questions')}
										</p>
									)}

									{assessment.config && (
										<div className="space-y-2 text-sm">
											{assessment.config.startDate && (
												<div className="flex items-center gap-2 text-muted-foreground">
													<Calendar className="h-5 w-5" />
													<span>
														{language === 'bm' ? 'Mula: ' : 'Starts: '}
														{formatDate(assessment.config.startDate)}
													</span>
												</div>
											)}
											{assessment.config.endDate && (
												<div className="flex items-center gap-2">
													<Clock className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
													<span className={deadlinePassed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
														{language === 'bm' ? 'Tarikh akhir: ' : 'Due: '}
														{formatDate(assessment.config.endDate)}
													</span>
												</div>
											)}
										</div>
									)}

									<div className="flex flex-wrap gap-2 pt-2 border-t">
										{userRole === 'student' ? (
											assessment.type === 'assignment' ? (
												<div className="w-full space-y-3">
													{submissions[assessment.id] && (
														<div className="p-2 bg-info/10 border border-info/20 rounded-lg">
															<p className="text-xs text-info flex items-center gap-2">
																<CheckCircle className="h-3.5 w-3.5" />
																{language === 'bm' ? 'Telah dihantar' : 'Already submitted'}
															</p>
														</div>
													)}
													{expandedAssessment === assessment.id ? (
														<div className="space-y-3">
															<input
																ref={el => fileInputRefs.current[assessment.id] = el}
																type="file"
																onChange={(e) => handleFileUpload(assessment.id, e)}
																className="hidden"
																accept=".pdf,.docx,.doc,.zip,.txt,.md,.py,.js,.java,.jpg,.jpeg,.png"
															/>
															<Button
																onClick={() => fileInputRefs.current[assessment.id]?.click()}
																variant="outline"
																size="sm"
																className="w-full"
																disabled={uploadingFiles[assessment.id]?.some(f => f.uploading)}
															>
																{uploadingFiles[assessment.id]?.some(f => f.uploading) ? (
																	<>
																		<Loader2 className="h-4 w-4 mr-2 animate-spin" />
																		{language === 'bm' ? 'Memuat naik...' : 'Uploading...'}
																	</>
																) : (
																	<>
																		<Upload className="h-4 w-4 mr-2" />
																		{language === 'bm' ? 'Pilih Fail' : 'Choose File'}
																	</>
																)}
															</Button>
															{(uploadingFiles[assessment.id] || []).length > 0 && (
																<div className="space-y-1.5">
																	{(uploadingFiles[assessment.id] || []).map((file) => (
																		<div
																			key={file.id}
																			className="flex items-center justify-between p-2 border rounded text-xs"
																		>
																			<div className="flex items-center gap-2 flex-1 min-w-0">
																				<File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
																				<span className="truncate">{file.name}</span>
																				{file.uploading && (
																					<Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
																				)}
																			</div>
																			<Button
																				variant="ghost"
																				size="sm"
																				onClick={() => removeFile(assessment.id, file.id)}
																				className="h-6 w-6 p-0 flex-shrink-0"
																				disabled={file.uploading}
																			>
																				<X className="h-3 w-3" />
																			</Button>
																		</div>
																	))}
																</div>
															)}
															<div className="flex gap-2">
																<Button
																	onClick={() => confirmSubmit(assessment.id)}
																	disabled={submitting[assessment.id] || (uploadingFiles[assessment.id] || []).length === 0 || (uploadingFiles[assessment.id] || []).some(f => f.uploading)}
																	size="sm"
																	className="flex-1"
																>
																	{submitting[assessment.id] ? (
																		<>
																			<Loader2 className="h-4 w-4 mr-2 animate-spin" />
																			{language === 'bm' ? 'Menghantar...' : 'Submitting...'}
																		</>
																	) : (
																		<>
																			<Upload className="h-4 w-4 mr-2" />
																			{language === 'bm' ? 'Hantar' : 'Submit'}
																		</>
																	)}
																</Button>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		setExpandedAssessment(null);
																		setUploadingFiles(prev => ({ ...prev, [assessment.id]: [] }));
																	}}
																>
																	{language === 'bm' ? 'Batal' : 'Cancel'}
																</Button>
															</div>
														</div>
													) : (
														<Button
															variant="default"
															className="w-full"
															onClick={() => {
																setExpandedAssessment(assessment.id);
																// Load existing files if submission exists
																if (submissions[assessment.id] && submissions[assessment.id].files) {
																	setUploadingFiles(prev => ({
																		...prev,
																		[assessment.id]: submissions[assessment.id].files
																	}));
																}
															}}
														>
															<Upload className="h-5 w-5 mr-2" />
															{language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}
														</Button>
													)}
												</div>
											) : (
												<div className="w-full space-y-3">
													{(() => {
														const submission = submissions[assessment.id];
														if (!submission || submission.score === undefined) return null;

														const percentage = submission.totalPoints > 0
															? (submission.score / submission.totalPoints) * 100
															: 0;
														const passingPercentage = assessment.config?.passingPercentage !== undefined ? assessment.config.passingPercentage : 40;
														const passed = percentage >= passingPercentage;

														return (
															<div className={`p-2 rounded-lg border-2 ${passed
																? 'bg-success/10 border-success/30'
																: 'bg-destructive/10 border-destructive/30'
																}`}>
																<div className="flex items-center justify-between">
																	<div className="flex items-center gap-2">
																		{passed ? (
																			<CheckCircle className="h-4 w-4 text-success" />
																		) : (
																			<XCircle className="h-4 w-4 text-destructive" />
																		)}
																		<span className={`text-sm font-semibold ${passed ? 'text-success' : 'text-destructive'
																			}`}>
																			{passed
																				? (language === 'bm' ? 'LULUS' : 'PASS')
																				: (language === 'bm' ? 'GAGAL' : 'FAIL')
																			}
																		</span>
																	</div>
																	<span className="text-sm text-muted-foreground">
																		{submission.score}/{submission.totalPoints} ({percentage.toFixed(1)}%)
																	</span>
																</div>
															</div>
														);
													})()}
													<Link
														href={`/assessments/${assessment.id}/take`}
														className="flex-1 min-w-[100px]"
													>
														<Button variant="default" className="w-full" title={language === 'bm' ? 'Ambil Penilaian' : 'Take Assessment'}>
															{language === 'bm' ? 'Ambil Penilaian' : 'Take Assessment'}
															<ArrowRight className="h-5 w-5 ml-2" />
														</Button>
													</Link>
												</div>
											)
										) : (
											<>
												<Link href={`/assessments/${assessment.id}/edit`} className="flex-1 min-w-[100px]">
													<Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10 hover:border-primary/40" size="sm" title={language === 'bm' ? 'Edit Penilaian' : 'Edit Assessment'}>
														<Edit2 className="h-5 w-5 mr-2 text-primary" />
														{language === 'bm' ? 'Edit' : 'Edit'}
													</Button>
												</Link>
												<Button
													variant="outline"
													size="sm"
													onClick={() => togglePublish(assessment)}
													title={assessment.published
														? (language === 'bm' ? 'Nyahterbit' : 'Unpublish')
														: (language === 'bm' ? 'Terbitkan' : 'Publish')}
													className={assessment.published
														? "border-warning/20 hover:bg-warning/10 hover:border-warning/40"
														: "border-success/20 hover:bg-success/10 hover:border-success/40"}
												>
													{assessment.published ? (
														<>
															<EyeOff className="h-5 w-5 mr-2 text-warning" />
															{language === 'bm' ? 'Nyahterbit' : 'Unpublish'}
														</>
													) : (
														<>
															<Eye className="h-5 w-5 mr-2 text-success" />
															{language === 'bm' ? 'Terbitkan' : 'Publish'}
														</>
													)}
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => confirmDelete(assessment.id)}
													title={language === 'bm' ? 'Padam Penilaian' : 'Delete Assessment'}
													className="border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 text-destructive hover:text-destructive"
												>
													<Trash2 className="h-5 w-5 mr-2 fill-destructive text-destructive" />
													{language === 'bm' ? 'Padam' : 'Delete'}
												</Button>
											</>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setDeleteConfirm(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setDeleteConfirm(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-destructive flex items-center gap-2">
								<AlertCircle className="h-6 w-6" />
								{language === 'bm' ? 'Sahkan Padam' : 'Confirm Delete'}
							</CardTitle>
							<CardDescription>
								{language === 'bm'
									? 'Adakah anda pasti mahu memadam penilaian ini? Tindakan ini tidak boleh dibatalkan.'
									: 'Are you sure you want to delete this assessment? This action cannot be undone.'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
								<p className="text-sm font-medium text-destructive">
									{language === 'bm' ? 'Penilaian:' : 'Assessment:'} {deleteConfirm.title}
								</p>
							</div>
							<div className="flex gap-3 justify-end">
								<Button
									variant="outline"
									onClick={() => setDeleteConfirm(null)}
								>
									{language === 'bm' ? 'Batal' : 'Cancel'}
								</Button>
								<Button
									variant="destructive"
									onClick={() => handleDelete(deleteConfirm.assessmentId)}
								>
									<Trash2 className="h-4 w-4 mr-2" />
									{language === 'bm' ? 'Padam' : 'Delete'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Submit Confirmation Modal */}
			{submitConfirm && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setSubmitConfirm(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setSubmitConfirm(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-primary flex items-center gap-2">
								<CheckCircle className="h-6 w-6" />
								{language === 'bm' ? 'Sahkan Hantar' : 'Confirm Submit'}
							</CardTitle>
							<CardDescription>
								{language === 'bm'
									? 'Adakah anda pasti mahu menghantar tugasan ini?'
									: 'Are you sure you want to submit this assignment?'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
								<p className="text-sm font-medium text-primary mb-2">
									{language === 'bm' ? 'Tugasan:' : 'Assignment:'} {submitConfirm.title}
								</p>
								<p className="text-xs text-muted-foreground">
									{language === 'bm'
										? `Anda akan menghantar ${submitConfirm.fileCount} ${submitConfirm.fileCount === 1 ? 'fail' : 'fail'}.`
										: `You will submit ${submitConfirm.fileCount} ${submitConfirm.fileCount === 1 ? 'file' : 'files'}.`}
								</p>
							</div>
							{submissions[submitConfirm.assessmentId] && (
								<div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
									<p className="text-xs text-warning flex items-center gap-2">
										<AlertCircle className="h-4 w-4" />
										{language === 'bm'
											? 'Anda telah menghantar tugasan ini sebelum ini. Menghantar semula akan menggantikan penghantaran sebelumnya.'
											: 'You have already submitted this assignment. Resubmitting will replace your previous submission.'}
									</p>
								</div>
							)}
							<div className="flex gap-3 justify-end">
								<Button
									variant="outline"
									onClick={() => setSubmitConfirm(null)}
								>
									{language === 'bm' ? 'Batal' : 'Cancel'}
								</Button>
								<Button
									onClick={() => handleSubmit(submitConfirm.assessmentId)}
									disabled={submitting[submitConfirm.assessmentId]}
								>
									{submitting[submitConfirm.assessmentId] ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											{language === 'bm' ? 'Menghantar...' : 'Submitting...'}
										</>
									) : (
										<>
											<Upload className="h-4 w-4 mr-2" />
											{language === 'bm' ? 'Hantar' : 'Submit'}
										</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Submit Success Modal */}
			{submitSuccess && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setSubmitSuccess(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setSubmitSuccess(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-success flex items-center gap-2">
								<CheckCircle className="h-6 w-6" />
								{language === 'bm' ? 'Berjaya!' : 'Success!'}
							</CardTitle>
							<CardDescription>
								{submitSuccess.message}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex justify-end">
								<Button
									onClick={() => setSubmitSuccess(null)}
									className="bg-success hover:opacity-90"
								>
									{language === 'bm' ? 'OK' : 'OK'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Submit Error Modal */}
			{submitError && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setSubmitError(null);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setSubmitError(null);
						}
					}}
					tabIndex={-1}
				>
					<Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
						<CardHeader>
							<CardTitle className="text-h3 text-destructive flex items-center gap-2">
								<AlertCircle className="h-6 w-6" />
								{language === 'bm' ? 'Ralat' : 'Error'}
							</CardTitle>
							<CardDescription>
								{submitError.message}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex justify-end">
								<Button
									variant="destructive"
									onClick={() => setSubmitError(null)}
								>
									{language === 'bm' ? 'OK' : 'OK'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}

